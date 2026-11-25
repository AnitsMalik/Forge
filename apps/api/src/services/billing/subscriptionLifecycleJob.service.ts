import { db } from '../../db/connection.js';
import crypto from 'crypto';
import { BillingEmailService } from './billingEmail.service.js';
import { DunningService } from './dunning.service.js';
import { SubscriptionUsageEngine } from './subscriptionUsageEngine.service.js';

export interface LifecycleJobRunSummary {
  remindersSent: number;
  expirationsProcessed: number;
  cancellationsFinalized: number;
  quotaResetsAtBoundary: number;
  dunningCycleResult: any;
  executedAt: string;
}

export class SubscriptionLifecycleJobService {
  private static schedulerTimer: NodeJS.Timeout | null = null;

  /**
   * 1. Send Renewal Reminders Before Expiration (e.g., 7 days or 3 days ahead)
   */
  public static async processUpcomingRenewalReminders(daysAhead: number = 7): Promise<{
    evaluated: number;
    remindersSent: number;
  }> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Fetch active subscriptions expiring within the window that have auto-renew on
    const expiringSubs = await db('tenant_subscriptions')
      .join('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.status', 'active')
      .andWhere('tenant_subscriptions.cancel_at_period_end', false)
      .andWhere('tenant_subscriptions.current_period_end', '>', now)
      .andWhere('tenant_subscriptions.current_period_end', '<=', thresholdDate)
      .select(
        'tenant_subscriptions.*',
        'subscription_plans.name as plan_name',
        'subscription_plans.price as plan_price'
      );

    let remindersSent = 0;

    for (const sub of expiringSubs) {
      const periodEndStr = new Date(sub.current_period_end).toISOString().slice(0, 10);
      let metadata: Record<string, any> = {};
      try {
        metadata = typeof sub.provider_metadata === 'string'
          ? JSON.parse(sub.provider_metadata)
          : (sub.provider_metadata || {});
      } catch {
        metadata = {};
      }

      // Check if reminder was already dispatched for this specific renewal period
      if (metadata.lastRenewalReminderPeriodEnd === periodEndStr) {
        continue;
      }

      // Lookup tenant workspace owner
      const owner = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', sub.tenant_id)
        .whereIn('tenant_users.role', ['owner', 'admin'])
        .select('users.email', 'users.full_name')
        .first();

      const recipientEmail = owner?.email || 'billing@socialforge.io';
      const recipientName = owner?.full_name || 'Valued Partner';
      const amountDueCents = sub.agreed_price_cents || Math.round(Number(sub.plan_price || 0) * 100);

      const msRemaining = new Date(sub.current_period_end).getTime() - now.getTime();
      const daysUntil = Math.max(1, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

      try {
        await BillingEmailService.sendRenewalReminder({
          tenantId: sub.tenant_id,
          recipientEmail,
          recipientName,
          planName: sub.plan_name,
          renewalDate: sub.current_period_end,
          amountDueCents,
          currency: 'usd',
          daysUntilRenewal: daysUntil,
        });

        // In-app billing notification
        await db('billing_notifications').insert({
          id: crypto.randomUUID(),
          tenant_id: sub.tenant_id,
          type: 'renewal_reminder',
          severity: 'info',
          title: 'Upcoming Subscription Renewal',
          message: `Your ${sub.plan_name} subscription will renew on ${new Date(sub.current_period_end).toLocaleDateString()}.`,
          action_url: '/settings/billing',
          action_label: 'View Subscription',
          created_at: new Date(),
        });

        // Mark as sent in subscription metadata to avoid duplicate reminders
        metadata.lastRenewalReminderPeriodEnd = periodEndStr;
        metadata.lastRenewalReminderSentAt = new Date().toISOString();

        await db('tenant_subscriptions')
          .where({ id: sub.id })
          .update({
            provider_metadata: JSON.stringify(metadata),
            updated_at: new Date(),
          });

        remindersSent++;
        console.log(`[SubscriptionLifecycleJob] Sent renewal reminder for tenant ${sub.tenant_id} (${sub.plan_name})`);
      } catch (err) {
        console.error(`[SubscriptionLifecycleJob] Failed to send renewal reminder for tenant ${sub.tenant_id}:`, err);
      }
    }

    return { evaluated: expiringSubs.length, remindersSent };
  }

  /**
   * 2. Finalize Scheduled Cancellations and Expirations
   * When cancel_at_period_end is true and current_period_end has passed, expire the subscription.
   * Upholds the ZERO CUSTOMER DATA DELETION GUARANTEE.
   */
  public static async processScheduledCancellations(): Promise<{
    evaluated: number;
    cancellationsFinalized: number;
  }> {
    const now = new Date();

    const pendingCancellations = await db('tenant_subscriptions')
      .join('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.cancel_at_period_end', true)
      .andWhere('tenant_subscriptions.current_period_end', '<=', now)
      .whereIn('tenant_subscriptions.status', ['active', 'past_due'])
      .select('tenant_subscriptions.*', 'subscription_plans.name as plan_name');

    let cancellationsFinalized = 0;

    for (const sub of pendingCancellations) {
      // Transition subscription to canceled/expired
      await db('tenant_subscriptions')
        .where({ id: sub.id })
        .update({
          status: 'cancelled',
          ended_at: now,
          cancel_at_period_end: false,
          updated_at: now,
        });

      // Send cancellation notice
      const owner = await db('tenant_users')
        .join('users', 'tenant_users.user_id', 'users.id')
        .where('tenant_users.tenant_id', sub.tenant_id)
        .whereIn('tenant_users.role', ['owner', 'admin'])
        .select('users.email', 'users.full_name')
        .first();

      const recipientEmail = owner?.email || 'billing@socialforge.io';
      const recipientName = owner?.full_name || 'Valued Partner';

      try {
        await BillingEmailService.sendSubscriptionCanceledNotice({
          tenantId: sub.tenant_id,
          recipientEmail,
          recipientName,
          planName: sub.plan_name,
          effectiveEndDate: now,
          cancelAtPeriodEnd: false,
        });
      } catch (err) {
        console.error(`[SubscriptionLifecycleJob] Error sending cancellation notice for tenant ${sub.tenant_id}:`, err);
      }

      // Record audit event
      await db('billing_events').insert({
        id: crypto.randomUUID(),
        tenant_id: sub.tenant_id,
        event_type: 'subscription_period_end_canceled',
        provider: 'system',
        provider_event_id: sub.id,
        payload: JSON.stringify({
          planId: sub.plan_id,
          endedAt: now,
          preservedDataGuarantee: true,
        }),
        created_at: now,
      });

      cancellationsFinalized++;
      console.log(`[SubscriptionLifecycleJob] Finalized scheduled cancellation for tenant ${sub.tenant_id}; customer data preserved.`);
    }

    return { evaluated: pendingCancellations.length, cancellationsFinalized };
  }

  /**
   * 3. Reset Monthly Quotas ONLY at the Billing-Period Boundary
   * 
   * Strict invariants:
   * - Quotas are NEVER reset on user login, logout, or dashboard reload.
   * - Usage is strictly keyed by period_month (YYYY-MM).
   * - When a billing cycle advances to a new calendar/billing month, a new counter row
   *   is created with 0 initial usage, leaving previous historical periods preserved.
   */
  public static async processBoundaryQuotaResets(): Promise<{
    evaluated: number;
    initializedNewPeriods: number;
  }> {
    const now = new Date();
    const currentPeriodMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'

    const activeSubs = await db('tenant_subscriptions')
      .whereIn('status', ['active', 'trialing', 'past_due'])
      .select('tenant_id', 'plan_id', 'current_period_start', 'current_period_end');

    let initializedNewPeriods = 0;

    for (const sub of activeSubs) {
      // Check if a usage row already exists for this tenant in the current period month
      const existingCounter = await db('tenant_usage_counters')
        .where({ tenant_id: sub.tenant_id, period_month: currentPeriodMonth })
        .first();

      if (!existingCounter) {
        // Initialize clean row for the new boundary month without altering any previous months
        await db('tenant_usage_counters').insert({
          id: crypto.randomUUID(),
          tenant_id: sub.tenant_id,
          period_month: currentPeriodMonth,
          posts_created: 0,
          posts_published: 0,
          scheduled_posts: 0,
          ai_content_generations: 0,
          ai_image_generations: 0,
          ai_video_generations: 0,
          media_storage_bytes: 0,
          connected_social_accounts: 0,
          active_campaigns: 0,
          team_members: 0,
          created_at: now,
          updated_at: now,
        });

        initializedNewPeriods++;
        console.log(`[SubscriptionLifecycleJob] Initialized new monthly quota boundary for tenant ${sub.tenant_id} (month: ${currentPeriodMonth})`);
      }
    }

    return { evaluated: activeSubs.length, initializedNewPeriods };
  }

  /**
   * 4. Execute Full Lifecycle Jobs Suite
   */
  public static async runAllLifecycleJobs(): Promise<LifecycleJobRunSummary> {
    console.log('[SubscriptionLifecycleJob] Starting automated subscription lifecycle execution...');

    // 1. Send Renewal Reminders (7 days ahead)
    const reminders = await this.processUpcomingRenewalReminders(7);

    // 2. Finalize Scheduled Cancellations
    const cancellations = await this.processScheduledCancellations();

    // 3. Reset Monthly Quotas at Billing-Period Boundary
    const quotaResets = await this.processBoundaryQuotaResets();

    // 4. Process Dunning & Grace Period Cycle
    const dunning = await DunningService.processDunningCycle();

    const summary: LifecycleJobRunSummary = {
      remindersSent: reminders.remindersSent,
      expirationsProcessed: dunning.stage3Suspensions,
      cancellationsFinalized: cancellations.cancellationsFinalized,
      quotaResetsAtBoundary: quotaResets.initializedNewPeriods,
      dunningCycleResult: dunning,
      executedAt: new Date().toISOString(),
    };

    console.log('[SubscriptionLifecycleJob] Lifecycle run completed:', summary);
    return summary;
  }

  /**
   * 5. Start Background Lifecycle Daemon
   */
  public static startScheduler(intervalMinutes: number = 60): void {
    if (this.schedulerTimer) return;

    console.log(`[SubscriptionLifecycleJob] Starting background lifecycle scheduler (interval: ${intervalMinutes}m)`);
    this.schedulerTimer = setInterval(async () => {
      try {
        await this.runAllLifecycleJobs();
      } catch (err) {
        console.error('[SubscriptionLifecycleJob] Unhandled error during scheduled cycle:', err);
      }
    }, intervalMinutes * 60 * 1000).unref();
  }

  /**
   * 6. Stop Background Lifecycle Daemon
   */
  public static stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
      console.log('[SubscriptionLifecycleJob] Background lifecycle scheduler stopped.');
    }
  }
}
