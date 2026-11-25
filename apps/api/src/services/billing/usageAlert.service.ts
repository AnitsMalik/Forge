import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { BillingEmailService } from './billingEmail.service.js';
import { UsageTrackerService } from '../usageTracker.service.js';
import type {
  QuotaResource,
  UsageAlertThreshold,
  TenantUsageAlert,
  UsageAlertEvaluationResult,
  BillingNotificationType,
} from '@socialforge/shared';

export interface ResourceMeta {
  label: string;
  unit: string;
}

export const RESOURCE_METADATA: Partial<Record<QuotaResource, ResourceMeta>> = {
  max_posts_per_month: { label: 'Monthly Posts', unit: 'posts' },
  ai_tokens_monthly: { label: 'AI Tokens', unit: 'tokens' },
  video_render_seconds_monthly: { label: 'Video Render Seconds', unit: 'seconds' },
  storage_bytes_limit: { label: 'Storage Limit', unit: 'bytes' },
  max_brands: { label: 'Brand Workspaces', unit: 'brands' },
  max_social_accounts: { label: 'Connected Social Accounts', unit: 'accounts' },
  max_users: { label: 'Team Seats', unit: 'members' },
  posts: { label: 'Monthly Posts', unit: 'posts' },
  ai_credits: { label: 'AI Tokens', unit: 'tokens' },
  video_minutes: { label: 'Video Render Seconds', unit: 'seconds' },
  storage: { label: 'Storage Limit', unit: 'bytes' },
  brands: { label: 'Brand Workspaces', unit: 'brands' },
  social_accounts: { label: 'Connected Social Accounts', unit: 'accounts' },
  seats: { label: 'Team Seats', unit: 'members' },
  users: { label: 'Team Seats', unit: 'members' },
  active_automations: { label: 'Active Automations', unit: 'automations' },
  analytics_retention: { label: 'Analytics Retention', unit: 'days' },
  premium_connectors: { label: 'Premium Connectors', unit: 'connectors' },
  autonomy_level: { label: 'Autonomy Level', unit: 'level' },
  agency_workspaces: { label: 'Agency Workspaces', unit: 'workspaces' },
};

export class UsageAlertService {
  private static tableEnsured = false;

  /**
   * Dynamically and idempotently ensures tenant_usage_alerts table exists.
   * Preserves the 17-migration constraint for Docker setup.
   */
  public static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    const hasTable = await db.schema.hasTable('tenant_usage_alerts');
    if (!hasTable) {
      await db.schema.createTable('tenant_usage_alerts', (table) => {
        table.uuid('id').primary();
        table.uuid('tenant_id').notNullable();
        table.string('period_month', 7).notNullable();
        table.string('resource', 50).notNullable();
        table.string('resource_label', 100).notNullable();
        table.integer('threshold_percent').notNullable();
        table.bigInteger('current_usage').notNullable();
        table.bigInteger('quota_limit').notNullable();
        table.decimal('percent_used', 6, 2).notNullable();
        table.uuid('in_app_notification_id').nullable();
        table.uuid('email_log_id').nullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());

        table.unique(['tenant_id', 'period_month', 'resource', 'threshold_percent'], 'uniq_tenant_alert_threshold');
        table.index(['tenant_id', 'period_month'], 'idx_usage_alerts_tenant_period');
        table.index(['created_at'], 'idx_usage_alerts_created');
      });
    }
    this.tableEnsured = true;
  }

  /**
   * Helper to retrieve all workspace owners and admins.
   */
  public static async getTenantBillingRecipients(tenantId: string): Promise<Array<{ id: string; email: string; fullName: string }>> {
    const members = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
      .select('users.id', 'users.email', 'users.full_name as fullName');

    if (members.length > 0) {
      return members;
    }

    // Fallback: check any user belonging to this tenant
    const fallback = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .select('users.id', 'users.email', 'users.full_name as fullName')
      .first();

    if (fallback) {
      return [fallback];
    }

    // Default fallback
    return [{ id: 'system', email: 'billing@socialforge.io', fullName: 'Workspace Admin' }];
  }

  /**
   * Format metric value for human-readable display in notifications.
   */
  public static formatMetric(resource: QuotaResource, value: number): string {
    if (resource === 'storage_bytes_limit') {
      if (value >= 1073741824) return `${(value / 1073741824).toFixed(1)} GB`;
      return `${(value / 1048576).toFixed(1)} MB`;
    }
    return Number(value).toLocaleString();
  }

  /**
   * Evaluates thresholds (80%, 90%, 100%) for a given resource and tenant.
   * If any threshold is crossed and not yet alerted in the current billing period,
   * generates in-app notifications and branded emails idempotently.
   */
  public static async evaluateUsageThresholds(
    tenantId: string,
    resource: QuotaResource,
    currentUsage: number,
    quotaLimit: number,
    planName?: string
  ): Promise<UsageAlertEvaluationResult[]> {
    await this.ensureTable();

    if (quotaLimit <= 0) {
      return [];
    }

    const percentUsed = Number(((currentUsage / quotaLimit) * 100).toFixed(2));
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    const meta = RESOURCE_METADATA[resource] || { label: resource, unit: 'units' };
    const thresholds: UsageAlertThreshold[] = [80, 90, 100];
    const results: UsageAlertEvaluationResult[] = [];

    // Resolve plan name if not provided
    let resolvedPlanName = planName;
    if (!resolvedPlanName) {
      try {
        const plan = await UsageTrackerService.getTenantPlan(tenantId);
        resolvedPlanName = plan.name;
      } catch {
        resolvedPlanName = 'Active Plan';
      }
    }

    for (const threshold of thresholds) {
      if (percentUsed >= threshold) {
        // Check if an alert was already triggered for this tenant, period, resource, and threshold
        const existingAlert = await db('tenant_usage_alerts')
          .where({
            tenant_id: tenantId,
            period_month: periodMonth,
            resource,
            threshold_percent: threshold,
          })
          .first();

        if (existingAlert) {
          results.push({
            triggered: false,
            threshold,
            resource,
            currentUsage,
            quotaLimit,
            percentUsed,
            alreadyAlerted: true,
          });
          continue;
        }

        // Trigger new alert!
        const alertId = crypto.randomUUID();
        const notificationId = crypto.randomUUID();
        let inAppCreated = false;
        let emailSent = false;
        let emailLogId: string | null = null;

        const formattedUsage = this.formatMetric(resource, currentUsage);
        const formattedLimit = this.formatMetric(resource, quotaLimit);

        // 1. Create In-App Notification in billing_notifications
        let notificationType: BillingNotificationType = 'usage_limit_warning';
        let severity: 'info' | 'warning' | 'critical' | 'success' = 'warning';
        let notifTitle = '';
        let notifMessage = '';

        if (threshold === 100) {
          notificationType = 'usage_limit_exceeded';
          severity = 'critical';
          notifTitle = `Quota Limit Exceeded: ${meta.label}`;
          notifMessage = `Your workspace has consumed 100% of your ${meta.label} allowance (${formattedUsage} of ${formattedLimit}). Additional usage may be restricted until your plan is upgraded or quota resets.`;
        } else if (threshold === 90) {
          notificationType = 'usage_limit_critical';
          severity = 'warning';
          notifTitle = `Critical Quota Alert: ${meta.label} at 90%`;
          notifMessage = `Your workspace has reached ${percentUsed.toFixed(0)}% of your monthly ${meta.label} quota (${formattedUsage} of ${formattedLimit}). Upgrade now to prevent interruption.`;
        } else {
          notificationType = 'usage_limit_warning';
          severity = 'warning';
          notifTitle = `80% Quota Warning: ${meta.label}`;
          notifMessage = `Your workspace has used ${percentUsed.toFixed(0)}% of your monthly ${meta.label} allowance (${formattedUsage} of ${formattedLimit}).`;
        }

        try {
          await db('billing_notifications').insert({
            id: notificationId,
            tenant_id: tenantId,
            user_id: null,
            type: notificationType,
            title: notifTitle,
            message: notifMessage,
            severity,
            action_url: '/settings/billing',
            action_label: 'Upgrade Plan',
            is_read: false,
            is_dismissed: false,
            created_at: new Date(),
            expires_at: null,
          });
          inAppCreated = true;
        } catch (err: any) {
          console.error(`[UsageAlertService] Error creating billing notification:`, err?.message);
        }

        // 2. Dispatch Branded Email to Tenant Owners/Admins
        try {
          const recipients = await this.getTenantBillingRecipients(tenantId);
          const primaryRecipient = recipients[0];

          if (primaryRecipient?.email) {
            const emailLog = await BillingEmailService.sendUsageThresholdAlert({
              tenantId,
              recipientEmail: primaryRecipient.email,
              recipientName: primaryRecipient.fullName,
              resource,
              resourceLabel: meta.label,
              thresholdPercent: threshold,
              currentUsage,
              quotaLimit,
              percentUsed,
              planName: resolvedPlanName,
            });
            emailLogId = emailLog.id;
            emailSent = true;
          }
        } catch (err: any) {
          console.error(`[UsageAlertService] Error sending usage threshold email:`, err?.message);
        }

        // 3. Record in tenant_usage_alerts table (Idempotent Guard)
        try {
          await db('tenant_usage_alerts').insert({
            id: alertId,
            tenant_id: tenantId,
            period_month: periodMonth,
            resource,
            resource_label: meta.label,
            threshold_percent: threshold,
            current_usage: currentUsage,
            quota_limit: quotaLimit,
            percent_used: percentUsed,
            in_app_notification_id: inAppCreated ? notificationId : null,
            email_log_id: emailLogId,
            created_at: new Date(),
          });
        } catch (err: any) {
          // If a race condition caused duplicate insert, ignore
          console.warn(`[UsageAlertService] Alert record insert conflict or error:`, err?.message);
        }

        results.push({
          triggered: true,
          threshold,
          resource,
          currentUsage,
          quotaLimit,
          percentUsed,
          alreadyAlerted: false,
          inAppNotificationCreated: inAppCreated,
          emailAlertSent: emailSent,
        });
      }
    }

    return results;
  }

  /**
   * Scans and evaluates all 7 resource dimensions for a tenant.
   */
  public static async evaluateAllTenantQuotas(tenantId: string): Promise<UsageAlertEvaluationResult[]> {
    const detailed = await UsageTrackerService.getDetailedTenantUsage(tenantId);
    const planName = detailed.plan.name;
    const allResults: UsageAlertEvaluationResult[] = [];

    const checks: Array<{ resource: QuotaResource; used: number; limit: number }> = [
      { resource: 'max_posts_per_month', used: detailed.postsPublished.used, limit: detailed.postsPublished.limit },
      { resource: 'ai_tokens_monthly', used: detailed.aiUsage.used, limit: detailed.aiUsage.limit },
      { resource: 'video_render_seconds_monthly', used: detailed.videoRendering.used, limit: detailed.videoRendering.limit },
      { resource: 'storage_bytes_limit', used: detailed.storage.used, limit: detailed.storage.limit },
      { resource: 'max_brands', used: detailed.brands.used, limit: detailed.brands.limit },
      { resource: 'max_social_accounts', used: detailed.socialAccounts.used, limit: detailed.socialAccounts.limit },
      { resource: 'max_users', used: detailed.users.used, limit: detailed.users.limit },
    ];

    for (const check of checks) {
      if (check.limit > 0) {
        const results = await this.evaluateUsageThresholds(
          tenantId,
          check.resource,
          check.used,
          check.limit,
          planName
        );
        allResults.push(...results);
      }
    }

    return allResults;
  }

  /**
   * Returns historical and current alerts for a specific tenant.
   * Strict tenant isolation enforced.
   */
  public static async listTenantAlerts(
    tenantId: string,
    params?: { limit?: number; page?: number; periodMonth?: string; resource?: string }
  ): Promise<{ items: TenantUsageAlert[]; total: number; page: number; limit: number; totalPages: number }> {
    await this.ensureTable();

    const limit = Math.min(Math.max(Number(params?.limit || 20), 1), 100);
    const page = Math.max(Number(params?.page || 1), 1);
    const offset = (page - 1) * limit;

    let query = db('tenant_usage_alerts').where('tenant_id', tenantId);

    if (params?.periodMonth) {
      query = query.andWhere('period_month', params.periodMonth);
    }
    if (params?.resource) {
      query = query.andWhere('resource', params.resource);
    }

    const countResult: any = await query.clone().clearSelect().count('id as count');
    const total = Number(countResult[0]?.count || countResult[0]?.['count(*)'] || 0);

    const rows = await query
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items: TenantUsageAlert[] = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      periodMonth: r.period_month,
      resource: r.resource as QuotaResource,
      resourceLabel: r.resource_label,
      thresholdPercent: Number(r.threshold_percent) as UsageAlertThreshold,
      currentUsage: Number(r.current_usage),
      quotaLimit: Number(r.quota_limit),
      percentUsed: Number(r.percent_used),
      inAppNotificationId: r.in_app_notification_id,
      emailLogId: r.email_log_id,
      createdAt: r.created_at,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns platform-wide alerts for Superadmins across all tenants.
   */
  public static async listAllAlerts(params?: {
    limit?: number;
    page?: number;
    tenantId?: string;
    periodMonth?: string;
    resource?: string;
    threshold?: number;
  }): Promise<{
    items: Array<TenantUsageAlert & { tenantName?: string; tenantSlug?: string }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.ensureTable();

    const limit = Math.min(Math.max(Number(params?.limit || 20), 1), 100);
    const page = Math.max(Number(params?.page || 1), 1);
    const offset = (page - 1) * limit;

    let query = db('tenant_usage_alerts')
      .leftJoin('tenants', 'tenant_usage_alerts.tenant_id', 'tenants.id');

    if (params?.tenantId) {
      query = query.andWhere('tenant_usage_alerts.tenant_id', params.tenantId);
    }
    if (params?.periodMonth) {
      query = query.andWhere('tenant_usage_alerts.period_month', params.periodMonth);
    }
    if (params?.resource) {
      query = query.andWhere('tenant_usage_alerts.resource', params.resource);
    }
    if (params?.threshold) {
      query = query.andWhere('tenant_usage_alerts.threshold_percent', params.threshold);
    }

    const countResult: any = await query.clone().clearSelect().count('tenant_usage_alerts.id as count');
    const total = Number(countResult[0]?.count || countResult[0]?.['count(*)'] || 0);

    const rows = await query
      .clone()
      .select(
        'tenant_usage_alerts.*',
        'tenants.name as tenantName',
        'tenants.slug as tenantSlug'
      )
      .orderBy('tenant_usage_alerts.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items = rows.map((r: any) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenantName,
      tenantSlug: r.tenantSlug,
      periodMonth: r.period_month,
      resource: r.resource as QuotaResource,
      resourceLabel: r.resource_label,
      thresholdPercent: Number(r.threshold_percent) as UsageAlertThreshold,
      currentUsage: Number(r.current_usage),
      quotaLimit: Number(r.quota_limit),
      percentUsed: Number(r.percent_used),
      inAppNotificationId: r.in_app_notification_id,
      emailLogId: r.email_log_id,
      createdAt: r.created_at,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
