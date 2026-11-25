import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { UsageTrackerService } from '../usageTracker.service.js';
import { EntitlementService } from '../entitlement.service.js';
import { PlanGuardService, PlanGuardError } from './planGuard.service.js';
import { UsageAlertService } from './usageAlert.service.js';
import type { SubscriptionPlan, SubscriptionPlanId, PlanUpgradeOption } from '@socialforge/shared';

export interface AtomicQuotaReservation {
  allowed: boolean;
  reservationId: string;
  tenantId: string;
  metric: EntitlementMetric;
  amount: number;
  currentUsage: number;
  limit: number;
  remaining: number;
  billingPeriod: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  rollback: () => Promise<void>;
}

// -----------------------------------------------------------------------------
// Module & Metric Definitions
// -----------------------------------------------------------------------------

export type SocialForgeModule =
  | 'content_studio'
  | 'video_reels_studio'
  | 'creative_design_studio'
  | 'campaign_command_center'
  | 'media_library'
  | 'connect_hub'
  | 'calendar_publishing_queue'
  | 'team_management'
  | 'analytics_reporting';

export type EntitlementMetric =
  | 'posts_created'
  | 'posts_published'
  | 'scheduled_posts'
  | 'ai_content_generations'
  | 'ai_image_generations'
  | 'ai_video_generations'
  | 'media_storage_bytes'
  | 'connected_social_accounts'
  | 'active_campaigns'
  | 'team_members';

export interface QuotaOperationDefinition {
  operationId: string;
  module: SocialForgeModule;
  metric: EntitlementMetric;
  unit: string;
  description: string;
  isMonthlyMetered: boolean;
  defaultChargeOnAttempt: boolean;
}

export const QUOTA_OPERATIONS: Record<string, QuotaOperationDefinition> = {
  // 1. Content Studio
  'content_studio.create_post': {
    operationId: 'content_studio.create_post',
    module: 'content_studio',
    metric: 'posts_created',
    unit: 'posts',
    description: 'Creating or drafting a new social post in Content Studio',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },
  'content_studio.ai_generate': {
    operationId: 'content_studio.ai_generate',
    module: 'content_studio',
    metric: 'ai_content_generations',
    unit: 'generations',
    description: 'Generating AI copywriting, captions, hooks, or content transforms',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },

  // 2. Video & Reels Studio
  'video_studio.render_video': {
    operationId: 'video_studio.render_video',
    module: 'video_reels_studio',
    metric: 'ai_video_generations',
    unit: 'videos',
    description: 'Rendering an AI short, reel, or video render pipeline asset',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },

  // 3. Canva & Creative Design Studio
  'design_studio.generate_image': {
    operationId: 'design_studio.generate_image',
    module: 'creative_design_studio',
    metric: 'ai_image_generations',
    unit: 'images',
    description: 'Generating an AI image, visual graphic, or design composition',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },

  // 4. Campaign Command Center
  'campaigns.create_campaign': {
    operationId: 'campaigns.create_campaign',
    module: 'campaign_command_center',
    metric: 'active_campaigns',
    unit: 'campaigns',
    description: 'Creating an active marketing campaign, sequence, or broadcast',
    isMonthlyMetered: false, // concurrency/active pool limit
    defaultChargeOnAttempt: false,
  },

  // 5. Media Library
  'media.upload_asset': {
    operationId: 'media.upload_asset',
    module: 'media_library',
    metric: 'media_storage_bytes',
    unit: 'bytes',
    description: 'Uploading images, videos, audio, or brand assets to media storage',
    isMonthlyMetered: false, // volume/capacity limit
    defaultChargeOnAttempt: false,
  },

  // 6. Connect Hub
  'connect_hub.link_account': {
    operationId: 'connect_hub.link_account',
    module: 'connect_hub',
    metric: 'connected_social_accounts',
    unit: 'accounts',
    description: 'Connecting a social channel (Facebook, Instagram, TikTok, LinkedIn, YouTube)',
    isMonthlyMetered: false, // channel pool limit
    defaultChargeOnAttempt: false,
  },

  // 7. Calendar & Publishing Queue
  'calendar.schedule_post': {
    operationId: 'calendar.schedule_post',
    module: 'calendar_publishing_queue',
    metric: 'scheduled_posts',
    unit: 'posts',
    description: 'Scheduling a post in the calendar or automated publishing queue',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },
  'calendar.publish_post': {
    operationId: 'calendar.publish_post',
    module: 'calendar_publishing_queue',
    metric: 'posts_published',
    unit: 'posts',
    description: 'Successfully broadcasting a post live to connected social platforms',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },

  // 8. Team Management
  'team.add_member': {
    operationId: 'team.add_member',
    module: 'team_management',
    metric: 'team_members',
    unit: 'seats',
    description: 'Inviting or assigning a team member or client reviewer seat',
    isMonthlyMetered: false, // user seats limit
    defaultChargeOnAttempt: false,
  },

  // 9. Analytics & Reporting
  'analytics.export_report': {
    operationId: 'analytics.export_report',
    module: 'analytics_reporting',
    metric: 'posts_published',
    unit: 'reports',
    description: 'Accessing enterprise analytics, cross-platform heatmaps & PDF exports',
    isMonthlyMetered: true,
    defaultChargeOnAttempt: false,
  },
};

// -----------------------------------------------------------------------------
// Usage Breakdown Interfaces
// -----------------------------------------------------------------------------

export interface MetricUsageDetails {
  metric: EntitlementMetric;
  label: string;
  module: SocialForgeModule;
  currentUsage: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  unit: string;
  isMonthlyMetered: boolean;
  isExceeded: boolean;
}

export interface ModuleControlStatus {
  module: SocialForgeModule;
  label: string;
  isEntitled: boolean;
  metrics: EntitlementMetric[];
  status: 'active' | 'capped' | 'upgrade_required';
  reason?: string;
}

export interface CentralizedUsageBreakdown {
  tenantId: string;
  planId: string;
  planName: string;
  billingInterval: string;
  periodMonth: string;
  metrics: Record<EntitlementMetric, MetricUsageDetails>;
  modules: Record<SocialForgeModule, ModuleControlStatus>;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// Centralized Subscription Usage Engine
// -----------------------------------------------------------------------------

export class SubscriptionUsageEngine {
  /**
   * Returns current billing period in YYYY-MM UTC
   */
  public static getCurrentPeriodMonth(date: Date = new Date()): string {
    return UsageTrackerService.getCurrentPeriodMonth(date);
  }

  /**
   * Retrieve active subscription plan for a tenant
   */
  public static async getTenantPlan(tenantId: string): Promise<SubscriptionPlan> {
    return UsageTrackerService.getTenantPlan(tenantId);
  }

  /**
   * Resolves the configured entitlement limit for any given metric
   */
  public static getMetricLimit(plan: SubscriptionPlan, metric: EntitlementMetric): number {
    const features: Record<string, any> = (plan as any).features || {};
    const rawPosts = Number(plan.maxPostsPerMonth || (plan as any).max_posts_per_month || 100);

    switch (metric) {
      case 'posts_published':
        return rawPosts;

      case 'posts_created':
        return features.max_posts_created || rawPosts;

      case 'scheduled_posts':
        return features.max_scheduled_posts || (plan as any).maxScheduledPosts || (plan as any).max_scheduled_posts || rawPosts;

      case 'ai_content_generations':
        if (features.ai_content_generations_monthly) return Number(features.ai_content_generations_monthly);
        if ((plan as any).maxAiContent || (plan as any).max_ai_content) return Number((plan as any).maxAiContent || (plan as any).max_ai_content);
        return Math.max(25, Math.round(((plan.aiTokensMonthly || (plan as any).ai_tokens_monthly) || 50000) / 500));

      case 'ai_image_generations':
        if (features.ai_image_generations_monthly) return Number(features.ai_image_generations_monthly);
        if ((plan as any).maxAiImages || (plan as any).max_ai_images) return Number((plan as any).maxAiImages || (plan as any).max_ai_images);
        // Tier defaults: Free: 10, Starter: 50, Professional: 250, Business: 1000, Enterprise: 5000
        if (plan.id === 'free' || plan.id === 'free_trial' || plan.id === 'trial') return 10;
        if (plan.id === 'starter') return 50;
        if (plan.id === 'professional' || plan.id === 'growth') return 250;
        if (plan.id === 'business' || plan.id === 'agency') return 1000;
        return 5000;

      case 'ai_video_generations':
        if (features.ai_video_generations_monthly) return Number(features.ai_video_generations_monthly);
        if ((plan as any).maxAiVideos || (plan as any).max_ai_videos) return Number((plan as any).maxAiVideos || (plan as any).max_ai_videos);
        // Tier defaults: Free: 2, Starter: 10, Professional: 50, Business: 200, Enterprise: 1000
        if (plan.id === 'free' || plan.id === 'free_trial' || plan.id === 'trial') return 2;
        if (plan.id === 'starter') return 10;
        if (plan.id === 'professional' || plan.id === 'growth') return 50;
        if (plan.id === 'business' || plan.id === 'agency') return 200;
        return 1000;

      case 'media_storage_bytes':
        return Number((plan as any).storageBytesLimit || (plan as any).storage_bytes_limit || 10737418240);

      case 'connected_social_accounts':
        return Number(plan.maxSocialAccounts || (plan as any).max_social_accounts || 5);

      case 'active_campaigns':
        if ((plan as any).maxActiveCampaigns || (plan as any).max_active_campaigns) return Number((plan as any).maxActiveCampaigns || (plan as any).max_active_campaigns);
        return Number(features.max_active_automations || features.max_active_campaigns || 10);

      case 'team_members':
        return Number(plan.maxUsers || (plan as any).max_users || 5);

      default:
        return 100;
    }
  }

  /**
   * Resolves the authoritative entitlement limit for a tenant and metric,
   * factoring in base plan limits, capacity add-on packs, and explicit entitlement overrides.
   */
  public static async resolveTenantMetricLimit(
    tenantId: string,
    plan: SubscriptionPlan,
    metric: EntitlementMetric,
    trx?: any
  ): Promise<number> {
    const baseLimit = this.getMetricLimit(plan, metric);
    const dbClient = trx || db;

    try {
      const canonicalMap: Record<EntitlementMetric, string> = {
        posts_published: 'posts',
        posts_created: 'posts',
        scheduled_posts: 'posts',
        ai_content_generations: 'ai_content',
        ai_image_generations: 'ai_images',
        ai_video_generations: 'video_render',
        media_storage_bytes: 'storage',
        connected_social_accounts: 'social_accounts',
        active_campaigns: 'campaigns',
        team_members: 'users',
      };

      const canonical = canonicalMap[metric] || metric;
      const ent = await dbClient('entitlements')
        .where({ tenant_id: tenantId, resource: canonical })
        .where(function (this: any) {
          this.whereNull('plan_id').orWhere('plan_id', plan.id);
        })
        .whereNull('brand_id')
        .first();

      if (ent && ent.limit_value !== null && ent.limit_value !== undefined && Number(ent.limit_value) > 0) {
        return Math.max(baseLimit, Number(ent.limit_value));
      }
    } catch {
      // Safe fallback
    }

    return baseLimit;
  }

  /**
   * Returns human-readable label for a metric
   */
  public static getMetricLabel(metric: EntitlementMetric | string): string {
    const labels: Record<string, string> = {
      posts_created: 'Posts Created',
      posts_published: 'Posts Published',
      scheduled_posts: 'Scheduled Posts',
      ai_content_generations: 'AI Content Generations',
      ai_image_generations: 'AI Image Generations',
      ai_video_generations: 'AI Video Generations',
      media_storage_bytes: 'Media Storage Bytes',
      connected_social_accounts: 'Connected Social Accounts',
      active_campaigns: 'Active Campaigns',
      team_members: 'Team Members',
    };
    return labels[String(metric)] || String(metric);
  }

  /**
   * Maps entitlement metric to database column on tenant_usage_counters
   */
  public static getColumnForMetric(metric: EntitlementMetric): string | null {
    const columnMap: Partial<Record<EntitlementMetric, string>> = {
      posts_created: 'posts_created',
      posts_published: 'posts_published',
      scheduled_posts: 'scheduled_posts',
      ai_content_generations: 'ai_content_generations',
      ai_image_generations: 'ai_image_generations',
      ai_video_generations: 'ai_video_generations',
      media_storage_bytes: 'storage_bytes_used',
      active_campaigns: 'active_campaigns',
    };
    return columnMap[metric] || null;
  }

  /**
   * Evaluates current usage while holding row-level lock within a transaction
   */
  public static async getLockedUsage(
    trx: any,
    tenantId: string,
    metric: EntitlementMetric,
    lockedRow: any,
    periodMonth: string
  ): Promise<number> {
    switch (metric) {
      case 'connected_social_accounts': {
        const row = await trx('social_accounts').where({ tenant_id: tenantId }).count('id as cnt').first();
        return Number(row?.cnt || 0);
      }

      case 'team_members': {
        const row = await trx('tenant_users').where({ tenant_id: tenantId }).count('user_id as cnt').first();
        return Number(row?.cnt || 0);
      }

      case 'active_campaigns': {
        const campRow = await trx('campaigns')
          .where({ tenant_id: tenantId, status: 'active' })
          .count('id as cnt')
          .first()
          .catch(() => null);
        if (campRow) return Number(campRow.cnt || 0);
        return Number(lockedRow?.active_campaigns || 0);
      }

      case 'media_storage_bytes': {
        const dbSum = await trx('media_assets')
          .where({ tenant_id: tenantId })
          .sum('file_size_bytes as total')
          .first()
          .catch(() => null);
        return Math.max(Number(lockedRow?.storage_bytes_used || 0), Number(dbSum?.total || 0));
      }

      case 'posts_created':
        return Number(lockedRow?.posts_created || 0);
      case 'posts_published':
        return Number(lockedRow?.posts_published || 0);
      case 'scheduled_posts':
        return Number(lockedRow?.scheduled_posts || 0);
      case 'ai_content_generations':
        return Number(lockedRow?.ai_content_generations || 0);
      case 'ai_image_generations':
        return Number(lockedRow?.ai_image_generations || 0);
      case 'ai_video_generations':
        return Number(lockedRow?.ai_video_generations || 0);
      default:
        return 0;
    }
  }

  /**
   * Pre-flight entitlement assertion enforcing the 8-point verification checklist:
   * 1. Authenticated customer
   * 2. Active subscription
   * 3. Current plan
   * 4. Feature entitlement
   * 5. Current usage
   * 6. Maximum allowed usage
   * 7. Remaining quota
   * 8. Current billing period
   *
   * Throws PlanGuardError with structured error details if rejected.
   */
  public static async assertEntitled(
    tenantId: string,
    metric: EntitlementMetric,
    requestedAmount = 1,
    context?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    billingPeriod: string;
    plan: { id: string; name: string };
    subscriptionStatus: string;
  }> {
    const period = this.getCurrentPeriodMonth();

    // 1. Authenticated customer
    if (!tenantId) {
      throw new Error('Tenant context required for entitlement verification.');
    }

    // 2. Active subscription
    const sub = await EntitlementService.getResolvedSubscription(tenantId);
    const gate = (EntitlementService as any).checkStatusGate(sub);

    if (!gate.allowed) {
      const upgradeOption = PlanGuardService.resolveUpgradeOption(sub.planId, metric as any);
      const featureLabel = this.getMetricLabel(metric);
      const reason = gate.reason || `Subscription status '${sub.status}' does not permit operations.`;

      throw new PlanGuardError({
        allowed: false,
        resource: metric as any,
        current: 0,
        limit: 0,
        remaining: 0,
        planId: sub.planId,
        planName: sub.planName,
        status: sub.status,
        billingPeriod: period,
        featureLabel,
        explanation: reason,
        upgradeOption,
        upgradeRequired: true,
        reason,
      });
    }

    // 3. Current plan & 4. Feature entitlement
    const plan = await this.getTenantPlan(tenantId);
    const limit = await this.resolveTenantMetricLimit(tenantId, plan, metric);

    // 5. Current usage
    const currentUsage = await this.getCurrentUsage(tenantId, metric, period);

    // 6. Maximum allowed usage & 7. Remaining quota
    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + requestedAmount <= limit;

    if (!allowed) {
      const featureLabel = this.getMetricLabel(metric);
      const upgradeOption = PlanGuardService.resolveUpgradeOption(plan.id, metric as any);
      const explanation = `You have reached your limit of ${limit} for ${featureLabel} (${currentUsage} consumed) on your ${plan.name} plan for billing period ${period}.`;

      throw new PlanGuardError({
        allowed: false,
        resource: metric as any,
        current: currentUsage,
        limit,
        remaining,
        planId: plan.id,
        planName: plan.name,
        status: sub.status,
        billingPeriod: period,
        featureLabel,
        explanation,
        upgradeOption,
        upgradeRequired: true,
        reason: explanation,
      });
    }

    return {
      allowed: true,
      currentUsage,
      limit,
      remaining,
      billingPeriod: period,
      plan: { id: plan.id, name: plan.name },
      subscriptionStatus: sub.status,
    };
  }

  /**
   * Concurrency-safe atomic quota reservation with database row-level locking (SELECT ... FOR UPDATE).
   * Prevents concurrent requests from exceeding plan limits at the database transaction layer.
   */
  public static async reserveQuotaAtomic(
    tenantId: string,
    metric: EntitlementMetric,
    requestedAmount = 1,
    options?: {
      chargeOnAttempt?: boolean;
      context?: Record<string, any>;
    }
  ): Promise<AtomicQuotaReservation> {
    const period = this.getCurrentPeriodMonth();

    return await db.transaction(async (trx) => {
      // 1. Authenticated customer validation
      if (!tenantId) {
        throw new Error('Tenant context required for entitlement verification.');
      }

      // 2. Active subscription validation
      const sub = await EntitlementService.getResolvedSubscription(tenantId);
      const gate = (EntitlementService as any).checkStatusGate(sub);

      if (!gate.allowed) {
        const upgradeOption = PlanGuardService.resolveUpgradeOption(sub.planId, metric as any);
        const featureLabel = this.getMetricLabel(metric);
        const reason = gate.reason || `Subscription status '${sub.status}' does not permit operations.`;
        throw new PlanGuardError({
          allowed: false,
          resource: metric as any,
          current: 0,
          limit: 0,
          remaining: 0,
          planId: sub.planId,
          planName: sub.planName,
          status: sub.status,
          billingPeriod: period,
          featureLabel,
          explanation: reason,
          upgradeOption,
          upgradeRequired: true,
          reason,
        });
      }

      // 3. Current plan and entitlement limit
      const plan = await this.getTenantPlan(tenantId);
      const limit = await this.resolveTenantMetricLimit(tenantId, plan, metric, trx);

      // 4. Ensure row exists in tenant_usage_counters
      await trx.raw(
        `
        INSERT INTO tenant_usage_counters (tenant_id, period_month, created_at, updated_at)
        VALUES (?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE updated_at = NOW()
        `,
        [tenantId, period]
      );

      // 5. Exclusive row-level lock (FOR UPDATE)
      const lockedRow = await trx('tenant_usage_counters')
        .where({ tenant_id: tenantId, period_month: period })
        .forUpdate()
        .first();

      // 6. Current usage evaluation under lock
      const currentUsage = await this.getLockedUsage(trx, tenantId, metric, lockedRow, period);
      const remaining = Math.max(0, limit - currentUsage);

      // 7. Limit check
      if (currentUsage + requestedAmount > limit) {
        const featureLabel = this.getMetricLabel(metric);
        const upgradeOption = PlanGuardService.resolveUpgradeOption(plan.id, metric as any);
        const explanation = `You have reached your limit of ${limit} for ${featureLabel} (${currentUsage} consumed) on your ${plan.name} plan for billing period ${period}.`;

        throw new PlanGuardError({
          allowed: false,
          resource: metric as any,
          current: currentUsage,
          limit,
          remaining,
          planId: plan.id,
          planName: plan.name,
          status: sub.status,
          billingPeriod: period,
          featureLabel,
          explanation,
          upgradeOption,
          upgradeRequired: true,
          reason: explanation,
        });
      }

      // 8. Atomic increment while holding lock
      const col = this.getColumnForMetric(metric);
      if (col) {
        await trx('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: period })
          .increment(col, requestedAmount);
      }

      const reservationId = crypto.randomUUID();

      return {
        allowed: true,
        reservationId,
        tenantId,
        metric,
        amount: requestedAmount,
        currentUsage: currentUsage + requestedAmount,
        limit,
        remaining: Math.max(0, limit - (currentUsage + requestedAmount)),
        billingPeriod: period,
        planId: plan.id,
        planName: plan.name,
        subscriptionStatus: sub.status,
        rollback: async () => {
          await this.releaseQuotaAtomic(tenantId, metric, requestedAmount);
        },
      };
    });
  }

  /**
   * Safely releases/decrements reserved quota upon operation failure
   */
  public static async releaseQuotaAtomic(
    tenantId: string,
    metric: EntitlementMetric,
    amount = 1
  ): Promise<void> {
    if (amount <= 0) return;
    const period = this.getCurrentPeriodMonth();
    const col = this.getColumnForMetric(metric);
    if (col) {
      await db.raw(
        `
        UPDATE tenant_usage_counters
        SET ${col} = GREATEST(0, CAST(${col} AS SIGNED) - ?),
            updated_at = NOW()
        WHERE tenant_id = ? AND period_month = ?
        `,
        [amount, tenantId, period]
      );
    }
  }

  /**
   * Reads current usage for a specific entitlement counter
   */
  public static async getCurrentUsage(
    tenantId: string,
    metric: EntitlementMetric,
    periodMonth?: string
  ): Promise<number> {
    const period = periodMonth || this.getCurrentPeriodMonth();

    switch (metric) {
      case 'connected_social_accounts': {
        const row = await db('social_accounts').where({ tenant_id: tenantId }).count('id as cnt').first();
        return Number(row?.cnt || 0);
      }

      case 'team_members': {
        const row = await db('tenant_users').where({ tenant_id: tenantId }).count('user_id as cnt').first();
        return Number(row?.cnt || 0);
      }

      case 'active_campaigns': {
        const campRow = await db('campaigns')
          .where({ tenant_id: tenantId, status: 'active' })
          .count('id as cnt')
          .first()
          .catch(() => null);

        if (campRow) return Number(campRow.cnt || 0);

        const waRow = await db('whatsapp_campaigns')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['DRAFT', 'SENDING'])
          .count('id as cnt')
          .first()
          .catch(() => null);

        const counterRow = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: period })
          .select('active_campaigns')
          .first();

        return Math.max(Number(waRow?.cnt || 0), Number(counterRow?.active_campaigns || 0));
      }

      case 'media_storage_bytes': {
        const [row, dbSum] = await Promise.all([
          db('tenant_usage_counters')
            .where({ tenant_id: tenantId, period_month: period })
            .select('storage_bytes_used')
            .first(),
          db('media_assets')
            .where({ tenant_id: tenantId })
            .sum('file_size_bytes as total')
            .first()
            .catch(() => null),
        ]);
        return Math.max(Number(row?.storage_bytes_used || 0), Number(dbSum?.total || 0));
      }

      default: {
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: period })
          .first();

        if (!row) return 0;

        switch (metric) {
          case 'posts_created':
            return Number(row.posts_created || 0);
          case 'posts_published':
            return Number(row.posts_published || 0);
          case 'scheduled_posts':
            return Number(row.scheduled_posts || 0);
          case 'ai_content_generations':
            return Number(row.ai_content_generations || 0);
          case 'ai_image_generations':
            return Number(row.ai_image_generations || 0);
          case 'ai_video_generations':
            return Number(row.ai_video_generations || 0);
          default:
            return 0;
        }
      }
    }
  }

  /**
   * Atomically records usage against a specific entitlement counter
   */
  public static async recordUsage(
    tenantId: string,
    metric: EntitlementMetric,
    amount = 1,
    trx?: any
  ): Promise<void> {
    if (amount <= 0) return;
    const periodMonth = this.getCurrentPeriodMonth();
    const now = new Date();
    const runner = trx || db;

    // Separate columns mapping
    const columnMap: Partial<Record<EntitlementMetric, string>> = {
      posts_created: 'posts_created',
      posts_published: 'posts_published',
      scheduled_posts: 'scheduled_posts',
      ai_content_generations: 'ai_content_generations',
      ai_image_generations: 'ai_image_generations',
      ai_video_generations: 'ai_video_generations',
      media_storage_bytes: 'storage_bytes_used',
      active_campaigns: 'active_campaigns',
    };

    const col = columnMap[metric];
    if (col) {
      await runner.raw(
        `
        INSERT INTO tenant_usage_counters (tenant_id, period_month, ${col}, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          ${col} = ${col} + VALUES(${col}),
          updated_at = VALUES(updated_at)
        `,
        [tenantId, periodMonth, amount, now, now]
      );
    }

    // Secondary sync for threshold alerts
    if (metric === 'posts_published' || metric === 'posts_created') {
      await UsageTrackerService.recordUsage(tenantId, 'posts_published', amount, trx).catch(() => null);
    } else if (metric === 'media_storage_bytes') {
      await UsageTrackerService.recordUsage(tenantId, 'storage_bytes_used', amount, trx).catch(() => null);
    }
  }

  /**
   * Atomically decrements usage (e.g. when media asset deleted or member removed)
   */
  public static async decrementUsage(
    tenantId: string,
    metric: EntitlementMetric,
    amount = 1
  ): Promise<void> {
    if (amount <= 0) return;
    const periodMonth = this.getCurrentPeriodMonth();

    const columnMap: Partial<Record<EntitlementMetric, string>> = {
      posts_created: 'posts_created',
      posts_published: 'posts_published',
      scheduled_posts: 'scheduled_posts',
      ai_content_generations: 'ai_content_generations',
      ai_image_generations: 'ai_image_generations',
      ai_video_generations: 'ai_video_generations',
      media_storage_bytes: 'storage_bytes_used',
      active_campaigns: 'active_campaigns',
    };

    const col = columnMap[metric];
    if (col) {
      await db.raw(
        `
        UPDATE tenant_usage_counters
        SET ${col} = GREATEST(0, CAST(${col} AS SIGNED) - ?),
            updated_at = NOW()
        WHERE tenant_id = ? AND period_month = ?
        `,
        [amount, tenantId, periodMonth]
      );
    }
  }

  /**
   * Resets period usage counters upon billing cycle renewal
   */
  public static async resetPeriodUsage(tenantId: string, periodMonth?: string): Promise<void> {
    const period = periodMonth || this.getCurrentPeriodMonth();
    await db.raw(
      `
      INSERT INTO tenant_usage_counters (
        tenant_id, period_month, posts_published, posts_created, scheduled_posts,
        ai_content_generations, ai_image_generations, ai_video_generations,
        video_render_seconds, ai_tokens_consumed, storage_bytes_used, active_campaigns,
        created_at, updated_at
      )
      VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        posts_published = 0,
        posts_created = 0,
        scheduled_posts = 0,
        ai_content_generations = 0,
        ai_image_generations = 0,
        ai_video_generations = 0,
        video_render_seconds = 0,
        ai_tokens_consumed = 0,
        updated_at = NOW()
      `,
      [tenantId, period]
    );
  }

  /**
   * Core Quota Metering Wrapper.
   * Requirement:
   * "Clearly define which operations consume quota.
   * Do not count failed operations as successful consumption unless the configured billing policy explicitly charges for attempts."
   */
  public static async meterOperation<T>(
    tenantId: string,
    operationId: string,
    amount: number,
    operation: () => Promise<T>,
    options?: {
      chargeOnAttempt?: boolean;
      context?: Record<string, any>;
    }
  ): Promise<{ result: T; metered: boolean; metric: EntitlementMetric; amount: number; remaining: number }> {
    const opDef = QUOTA_OPERATIONS[operationId];
    if (!opDef) {
      throw new Error(`Unknown quota operation: '${operationId}'`);
    }

    const metric = opDef.metric;
    const shouldChargeOnAttempt = options?.chargeOnAttempt ?? opDef.defaultChargeOnAttempt;

    // Concurrency-safe atomic reservation with row-level lock
    const reservation = await this.reserveQuotaAtomic(tenantId, metric, amount, options);

    if (shouldChargeOnAttempt) {
      // Policy charges for attempts: reservation remains consumed even on failure
      const result = await operation();
      return { result, metered: true, metric, amount, remaining: reservation.remaining };
    }

    // Default policy: ONLY meter on successful execution.
    // If operation fails, immediately rollback/decrement reservation.
    try {
      const result = await operation();
      return { result, metered: true, metric, amount, remaining: reservation.remaining };
    } catch (operationError: any) {
      await reservation.rollback().catch((rbErr) => {
        console.error('[SubscriptionUsageEngine] Error rolling back quota reservation:', rbErr);
      });
      console.warn(
        `[SubscriptionUsageEngine] Operation '${operationId}' failed for tenant ${tenantId}. Usage was NOT metered (${metric}: 0 consumed). Error: ${operationError.message}`
      );
      throw operationError;
    }
  }

  /**
   * Retrieves comprehensive, tenant-scoped usage breakdown across all 10 counters and 9 modules
   */
  public static async getDetailedUsage(tenantId: string): Promise<CentralizedUsageBreakdown> {
    const plan = await this.getTenantPlan(tenantId);
    const periodMonth = this.getCurrentPeriodMonth();

    const metricsKeys: EntitlementMetric[] = [
      'posts_created',
      'posts_published',
      'scheduled_posts',
      'ai_content_generations',
      'ai_image_generations',
      'ai_video_generations',
      'media_storage_bytes',
      'connected_social_accounts',
      'active_campaigns',
      'team_members',
    ];

    const metricLabels: Record<EntitlementMetric, { label: string; unit: string; module: SocialForgeModule; isMonthly: boolean }> = {
      posts_created: { label: 'Posts Created', unit: 'posts', module: 'content_studio', isMonthly: true },
      posts_published: { label: 'Posts Published', unit: 'posts', module: 'calendar_publishing_queue', isMonthly: true },
      scheduled_posts: { label: 'Scheduled Posts', unit: 'posts', module: 'calendar_publishing_queue', isMonthly: true },
      ai_content_generations: { label: 'AI Content Generations', unit: 'generations', module: 'content_studio', isMonthly: true },
      ai_image_generations: { label: 'AI Image Generations', unit: 'images', module: 'creative_design_studio', isMonthly: true },
      ai_video_generations: { label: 'AI Video Generations', unit: 'videos', module: 'video_reels_studio', isMonthly: true },
      media_storage_bytes: { label: 'Media Storage', unit: 'bytes', module: 'media_library', isMonthly: false },
      connected_social_accounts: { label: 'Connected Social Accounts', unit: 'accounts', module: 'connect_hub', isMonthly: false },
      active_campaigns: { label: 'Active Campaigns', unit: 'campaigns', module: 'campaign_command_center', isMonthly: false },
      team_members: { label: 'Team Members', unit: 'seats', module: 'team_management', isMonthly: false },
    };

    const metrics: Partial<Record<EntitlementMetric, MetricUsageDetails>> = {};

    for (const key of metricsKeys) {
      const info = metricLabels[key];
      const limit = await this.resolveTenantMetricLimit(tenantId, plan, key);
      const currentUsage = await this.getCurrentUsage(tenantId, key, periodMonth);
      const remaining = Math.max(0, limit - currentUsage);
      const percentUsed = limit > 0 ? Math.min(100, (currentUsage / limit) * 100) : 0;

      metrics[key] = {
        metric: key,
        label: info.label,
        module: info.module,
        currentUsage,
        limit,
        remaining,
        percentUsed: Math.round(percentUsed * 10) / 10,
        unit: info.unit,
        isMonthlyMetered: info.isMonthly,
        isExceeded: currentUsage >= limit,
      };
    }

    // Module Control Status across all 9 SocialForge modules
    const modules: Record<SocialForgeModule, ModuleControlStatus> = {
      content_studio: {
        module: 'content_studio',
        label: 'Content Studio',
        isEntitled: true,
        metrics: ['posts_created', 'ai_content_generations'],
        status: metrics.posts_created?.isExceeded || metrics.ai_content_generations?.isExceeded ? 'capped' : 'active',
      },
      video_reels_studio: {
        module: 'video_reels_studio',
        label: 'Video & Reels Studio',
        isEntitled: true,
        metrics: ['ai_video_generations'],
        status: metrics.ai_video_generations?.isExceeded ? 'capped' : 'active',
      },
      creative_design_studio: {
        module: 'creative_design_studio',
        label: 'Canva & Creative Design Studio',
        isEntitled: true,
        metrics: ['ai_image_generations'],
        status: metrics.ai_image_generations?.isExceeded ? 'capped' : 'active',
      },
      campaign_command_center: {
        module: 'campaign_command_center',
        label: 'Campaign Command Center',
        isEntitled: true,
        metrics: ['active_campaigns'],
        status: metrics.active_campaigns?.isExceeded ? 'capped' : 'active',
      },
      media_library: {
        module: 'media_library',
        label: 'Media Library',
        isEntitled: true,
        metrics: ['media_storage_bytes'],
        status: metrics.media_storage_bytes?.isExceeded ? 'capped' : 'active',
      },
      connect_hub: {
        module: 'connect_hub',
        label: 'Connect Hub',
        isEntitled: true,
        metrics: ['connected_social_accounts'],
        status: metrics.connected_social_accounts?.isExceeded ? 'capped' : 'active',
      },
      calendar_publishing_queue: {
        module: 'calendar_publishing_queue',
        label: 'Calendar & Publishing Queue',
        isEntitled: true,
        metrics: ['posts_published', 'scheduled_posts'],
        status: metrics.posts_published?.isExceeded || metrics.scheduled_posts?.isExceeded ? 'capped' : 'active',
      },
      team_management: {
        module: 'team_management',
        label: 'Team Management',
        isEntitled: true,
        metrics: ['team_members'],
        status: metrics.team_members?.isExceeded ? 'capped' : 'active',
      },
      analytics_reporting: {
        module: 'analytics_reporting',
        label: 'Analytics & Reporting',
        isEntitled: Boolean((plan as any).features?.advanced_analytics ?? true),
        metrics: ['posts_published'],
        status: (plan as any).features?.advanced_analytics === false ? 'upgrade_required' : 'active',
        reason: (plan as any).features?.advanced_analytics === false ? 'Upgrade to Professional or higher for advanced analytics.' : undefined,
      },
    };

    return {
      tenantId,
      planId: plan.id,
      planName: plan.name,
      billingInterval: plan.billingInterval || 'month',
      periodMonth,
      metrics: metrics as Record<EntitlementMetric, MetricUsageDetails>,
      modules,
      updatedAt: new Date().toISOString(),
    };
  }
}
