import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { UsageTrackerService } from '../usageTracker.service.js';
import { BillingEmailService } from './billingEmail.service.js';
import type { SubscriptionPlanId, SubscriptionStatus } from '@socialforge/shared';

export interface DiscrepancyResolution {
  type: string;
  description: string;
  previousValue: any;
  resolvedValue: any;
}

export interface TenantReconciliationReport {
  tenantId: string;
  tenantName: string;
  currentPlanId: string;
  subscriptionStatus: string;
  discrepanciesFound: number;
  resolutions: DiscrepancyResolution[];
  inSync: boolean;
  reconciledAt: Date;
}

export interface PlatformReconciliationSummary {
  totalTenantsChecked: number;
  inSyncCount: number;
  discrepantCount: number;
  totalResolutions: number;
  reports: TenantReconciliationReport[];
  reconciledAt: Date;
}

export class PaymentReconciliationService {
  /**
   * Reconciles a single tenant's subscription, invoices, usage counters, and metadata
   */
  public static async reconcileTenant(tenantId: string): Promise<TenantReconciliationReport> {
    const tenant = await db('tenants').where({ id: tenantId }).first();
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    const now = new Date();
    const resolutions: DiscrepancyResolution[] = [];

    if (!sub) {
      // Auto-provision default free trial subscription if missing entirely
      const newSubId = crypto.randomUUID();
      const periodEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await db('tenant_subscriptions').insert({
        id: newSubId,
        tenant_id: tenantId,
        plan_id: 'free',
        status: 'active',
        provider: 'stripe',
        current_period_start: now,
        current_period_end: periodEnd,
        agreed_price_cents: 0,
        cancel_at_period_end: false,
        created_at: now,
        updated_at: now,
      });

      resolutions.push({
        type: 'MISSING_SUBSCRIPTION_PROVISIONED',
        description: 'Provisioned default active Free tier for tenant with missing subscription row.',
        previousValue: null,
        resolvedValue: 'free:active',
      });
    }

    const currentSub = (await db('tenant_subscriptions').where({ tenant_id: tenantId }).first())!;

    // 1. Sync tenant's subscription_tier column in tenants table
    if (tenant.subscription_tier !== currentSub.plan_id) {
      await db('tenants').where({ id: tenantId }).update({
        subscription_tier: currentSub.plan_id,
        updated_at: now,
      });
      resolutions.push({
        type: 'TENANT_TIER_DESYNC',
        description: 'Synchronized tenants.subscription_tier with authoritative tenant_subscriptions.plan_id.',
        previousValue: tenant.subscription_tier,
        resolvedValue: currentSub.plan_id,
      });
    }

    // 2. Reconcile Subscription Status vs Latest Invoices
    const latestInvoice = await db('billing_invoices')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .first();

    if (latestInvoice) {
      const isInvoicePaid = latestInvoice.status === 'paid';
      const isInvoicePeriodActive = latestInvoice.period_end ? new Date(latestInvoice.period_end) >= now : true;

      // Discrepancy: Subscription is marked past_due or canceled, but latest invoice is fully paid and covers current date
      if ((currentSub.status === 'past_due' || currentSub.past_due_since) && isInvoicePaid && isInvoicePeriodActive) {
        await db('tenant_subscriptions')
          .where({ id: currentSub.id })
          .update({
            status: 'active',
            past_due_since: null,
            updated_at: now,
          });
        resolutions.push({
          type: 'PAST_DUE_RESTORED_TO_ACTIVE',
          description: `Restored subscription status to 'active' because latest invoice ${latestInvoice.invoice_number} is paid in full.`,
          previousValue: currentSub.status,
          resolvedValue: 'active',
        });
      }

      // Discrepancy: Subscription marked active, but latest invoice failed over 5 days ago (grace period expired)
      const GRACE_PERIOD_MS = 5 * 24 * 60 * 60 * 1000;
      if (
        currentSub.status === 'active' &&
        latestInvoice.status === 'open' &&
        latestInvoice.created_at &&
        now.getTime() - new Date(latestInvoice.created_at).getTime() > GRACE_PERIOD_MS
      ) {
        await db('tenant_subscriptions')
          .where({ id: currentSub.id })
          .update({
            status: 'past_due',
            past_due_since: latestInvoice.created_at,
            updated_at: now,
          });
        resolutions.push({
          type: 'EXPIRED_GRACE_ENTERED_PAST_DUE',
          description: `Updated subscription status to 'past_due' as unpaid invoice ${latestInvoice.invoice_number} exceeded 5-day grace period.`,
          previousValue: 'active',
          resolvedValue: 'past_due',
        });
      }
    }

    // 3. Reconcile Scheduled Downgrade
    let metadata: Record<string, any> = {};
    if (currentSub.provider_metadata) {
      try {
        metadata = typeof currentSub.provider_metadata === 'string'
          ? JSON.parse(currentSub.provider_metadata)
          : currentSub.provider_metadata;
      } catch {}
    }

    if (metadata.pendingDowngradePlanId) {
      const downgradeAt = metadata.pendingDowngradeAt ? new Date(metadata.pendingDowngradeAt) : null;
      const isDue = !downgradeAt || now >= downgradeAt || now >= new Date(currentSub.current_period_end);

      if (isDue) {
        const targetPlan = await db('subscription_plans').where({ id: metadata.pendingDowngradePlanId }).first();
        if (targetPlan) {
          const appliedPlanId = metadata.pendingDowngradePlanId;
          const oldPlanId = currentSub.plan_id;
          delete metadata.pendingDowngradePlanId;
          delete metadata.pendingDowngradePlanName;
          delete metadata.pendingDowngradeAt;

          await db('tenant_subscriptions')
            .where({ id: currentSub.id })
            .update({
              plan_id: appliedPlanId,
              agreed_price_cents: targetPlan.monthly_price_cents || Math.round(Number(targetPlan.price) * 100),
              provider_metadata: JSON.stringify(metadata),
              updated_at: now,
            });

          await db('tenants').where({ id: tenantId }).update({
            subscription_tier: appliedPlanId,
            updated_at: now,
          });

          resolutions.push({
            type: 'SCHEDULED_DOWNGRADE_EXECUTED',
            description: `Executed scheduled downgrade from '${oldPlanId}' to '${appliedPlanId}' whose period end arrived.`,
            previousValue: oldPlanId,
            resolvedValue: appliedPlanId,
          });
        }
      }
    }

    // 4. Reconcile Usage Counters for Current Month
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth(now);
    const counterRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantId, period_month: periodMonth })
      .first();

    if (!counterRow) {
      await db('tenant_usage_counters').insert({
        tenant_id: tenantId,
        period_month: periodMonth,
        posts_published: 0,
        posts_created: 0,
        video_render_seconds: 0,
        ai_tokens_consumed: 0,
        storage_bytes_used: 0,
        created_at: now,
        updated_at: now,
      });
      resolutions.push({
        type: 'MISSING_USAGE_COUNTER_INITIALIZED',
        description: `Initialized missing monthly usage counter row for period ${periodMonth}.`,
        previousValue: null,
        resolvedValue: periodMonth,
      });
    }

    // 5. Audit Logging
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'payment_reconciliation_completed',
      provider: 'stripe',
      provider_event_id: `rec_${Date.now()}`,
      payload: JSON.stringify({
        discrepanciesFound: resolutions.length,
        resolutions,
        reconciledAt: now,
      }),
      created_at: now,
    });

    const refreshedSub = (await db('tenant_subscriptions').where({ tenant_id: tenantId }).first()) || currentSub;

    return {
      tenantId,
      tenantName: tenant.name,
      currentPlanId: refreshedSub.plan_id,
      subscriptionStatus: refreshedSub.status,
      discrepanciesFound: resolutions.length,
      resolutions,
      inSync: resolutions.length === 0,
      reconciledAt: now,
    };
  }

  /**
   * Reconciles all tenants platform-wide
   */
  public static async reconcileAllTenants(): Promise<PlatformReconciliationSummary> {
    const tenants = await db('tenants').select('id', 'name');
    const reports: TenantReconciliationReport[] = [];
    let inSyncCount = 0;
    let discrepantCount = 0;
    let totalResolutions = 0;

    for (const t of tenants) {
      try {
        const report = await this.reconcileTenant(t.id);
        reports.push(report);
        if (report.inSync) {
          inSyncCount++;
        } else {
          discrepantCount++;
          totalResolutions += report.discrepanciesFound;
        }
      } catch (err) {
        console.error(`[PaymentReconciliationService] Error reconciling tenant ${t.id}:`, err);
      }
    }

    return {
      totalTenantsChecked: tenants.length,
      inSyncCount,
      discrepantCount,
      totalResolutions,
      reports,
      reconciledAt: new Date(),
    };
  }
}
