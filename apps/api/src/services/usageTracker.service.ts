import { db } from '../db/connection.js';
import { UsageAlertService } from './billing/usageAlert.service.js';
import type {
  SubscriptionPlan,
  SubscriptionPlanId,
  TenantUsageCounters,
  QuotaResource,
  QuotaCheckResult,
  TenantMetricUsage,
  TenantUsageResponse,
} from '@socialforge/shared';

export class UsageTrackerService {
  /**
   * Current period format YYYY-MM based on UTC.
   */
  public static getCurrentPeriodMonth(date: Date = new Date()): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Retrieves the active plan and subscription details for a tenant.
   */
  public static async getTenantPlan(tenantId: string): Promise<SubscriptionPlan> {
    const sub = await db('tenant_subscriptions')
      .join('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.tenant_id', tenantId)
      .select(
        'subscription_plans.id',
        'subscription_plans.name',
        'subscription_plans.slug',
        'subscription_plans.description',
        'subscription_plans.price',
        'subscription_plans.monthly_price_cents as monthlyPriceCents',
        'subscription_plans.currency',
        'subscription_plans.billing_interval as billingInterval',
        'subscription_plans.max_brands as maxBrands',
        'subscription_plans.max_social_accounts as maxSocialAccounts',
        'subscription_plans.max_posts_per_month as maxPostsPerMonth',
        'subscription_plans.max_users as maxUsers',
        'subscription_plans.ai_tokens_monthly as aiTokensMonthly',
        'subscription_plans.video_render_seconds_monthly as videoRenderSecondsMonthly',
        'subscription_plans.storage_bytes_limit as storageBytesLimit',
        'subscription_plans.features',
        'subscription_plans.is_active as isActive'
      )
      .first();

    if (sub) {
      return {
        ...sub,
        price: Number(sub.price || 0),
        storageBytesLimit: Number(sub.storageBytesLimit || 10737418240),
        isActive: Boolean(sub.isActive),
        features: typeof sub.features === 'string' ? JSON.parse(sub.features) : sub.features,
      };
    }

    // Default fallback to free trial
    const freePlan = await db('subscription_plans').where({ id: 'free_trial' }).first();
    if (freePlan) {
      return {
        id: freePlan.id as SubscriptionPlanId,
        name: freePlan.name,
        slug: freePlan.slug || 'free-trial',
        description: freePlan.description,
        price: Number(freePlan.price || 0),
        monthlyPriceCents: freePlan.monthly_price_cents,
        currency: freePlan.currency || 'usd',
        billingInterval: freePlan.billing_interval || 'month',
        maxBrands: freePlan.max_brands,
        maxSocialAccounts: freePlan.max_social_accounts,
        maxPostsPerMonth: freePlan.max_posts_per_month,
        maxUsers: freePlan.max_users,
        aiTokensMonthly: freePlan.ai_tokens_monthly,
        videoRenderSecondsMonthly: freePlan.video_render_seconds_monthly,
        storageBytesLimit: Number(freePlan.storage_bytes_limit || 1073741824),
        features: typeof freePlan.features === 'string' ? JSON.parse(freePlan.features) : freePlan.features,
        isActive: Boolean(freePlan.is_active ?? true),
      };
    }

    // Hardcoded safety fallback
    return {
      id: 'free_trial',
      name: 'Free Trial',
      slug: 'free-trial',
      price: 0,
      monthlyPriceCents: 0,
      currency: 'usd',
      billingInterval: 'month',
      maxBrands: 1,
      maxSocialAccounts: 2,
      maxPostsPerMonth: 20,
      maxUsers: 1,
      aiTokensMonthly: 25000,
      videoRenderSecondsMonthly: 60,
      storageBytesLimit: 1073741824,
      isActive: true,
    };
  }

  /**
   * Evaluates if a tenant is within quota for a specified resource.
   */
  public static async checkLimit(
    tenantId: string,
    resource: QuotaResource,
    requestedAmount: number = 1
  ): Promise<QuotaCheckResult> {
    const plan = await this.getTenantPlan(tenantId);
    const periodMonth = this.getCurrentPeriodMonth();

    let currentUsage = 0;
    let limit = 0;

    switch (resource) {
      case 'max_brands': {
        const row = await db('brands')
          .where({ tenant_id: tenantId })
          .count('id as count')
          .first();
        currentUsage = Number(row?.count || 0);
        limit = plan.maxBrands;
        break;
      }

      case 'max_social_accounts': {
        const row = await db('social_accounts')
          .where({ tenant_id: tenantId })
          .count('id as count')
          .first();
        currentUsage = Number(row?.count || 0);
        limit = plan.maxSocialAccounts;
        break;
      }

      case 'max_users': {
        const row = await db('tenant_users')
          .where({ tenant_id: tenantId })
          .count('user_id as count')
          .first();
        currentUsage = Number(row?.count || 0);
        limit = plan.maxUsers;
        break;
      }

      case 'max_posts_per_month': {
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('posts_published', 'posts_created')
          .first();
        currentUsage = Number(row?.posts_published || row?.posts_created || 0);
        limit = plan.maxPostsPerMonth;
        break;
      }

      case 'video_render_seconds_monthly': {
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('video_render_seconds')
          .first();
        currentUsage = Number(row?.video_render_seconds || 0);
        limit = plan.videoRenderSecondsMonthly;
        break;
      }

      case 'ai_tokens_monthly': {
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('ai_tokens_consumed')
          .first();
        currentUsage = Number(row?.ai_tokens_consumed || 0);
        limit = plan.aiTokensMonthly;
        break;
      }

      case 'storage_bytes_limit': {
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('storage_bytes_used')
          .first();
        currentUsage = Number(row?.storage_bytes_used || 0);
        limit = plan.storageBytesLimit;
        break;
      }
    }

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = currentUsage + requestedAmount <= limit;

    return {
      allowed,
      resource,
      currentUsage,
      limit,
      remaining,
      planId: plan.id,
      planName: plan.name,
      message: allowed
        ? undefined
        : `Your ${plan.name} plan limit for ${resource} has been reached (${currentUsage}/${limit}). Please upgrade your subscription to continue.`,
    };
  }

  /**
   * Atomically records usage against monthly counter.
   * Supports transactional executions for publishing atomicity.
   */
  public static async recordUsage(
    tenantId: string,
    counter: 'posts_published' | 'posts_created' | 'video_render_seconds' | 'ai_tokens_consumed' | 'storage_bytes_used',
    amount: number = 1,
    trx?: any
  ): Promise<void> {
    if (amount <= 0) return;
    const periodMonth = this.getCurrentPeriodMonth();
    const now = new Date();
    const queryRunner = trx || db;

    await queryRunner.raw(
      `
      INSERT INTO tenant_usage_counters (tenant_id, period_month, ${counter}, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        ${counter} = ${counter} + VALUES(${counter}),
        updated_at = VALUES(updated_at)
      `,
      [tenantId, periodMonth, amount, now, now]
    );

    // Synchronize to universal usage_counters table
    const metricMap: Record<string, string> = {
      posts_published: 'posts',
      posts_created: 'posts',
      video_render_seconds: 'video_minutes',
      ai_tokens_consumed: 'ai_credits',
      storage_bytes_used: 'storage',
    };
    const metricName = metricMap[counter] || 'posts';

    try {
      const counterId = crypto.randomUUID();
      await queryRunner.raw(
        `
        INSERT INTO usage_counters (id, tenant_id, brand_id, metric, period, current_usage, created_at, updated_at)
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          current_usage = current_usage + VALUES(current_usage),
          updated_at = VALUES(updated_at)
        `,
        [counterId, tenantId, metricName, periodMonth, amount, now, now]
      );
    } catch {
      // Safe fallback if usage_counters table is not yet present
    }

    // Asynchronously evaluate multi-tier usage alert thresholds (80%, 90%, 100%)
    const resourceMap: Record<string, QuotaResource> = {
      posts_published: 'max_posts_per_month',
      posts_created: 'max_posts_per_month',
      video_render_seconds: 'video_render_seconds_monthly',
      ai_tokens_consumed: 'ai_tokens_monthly',
      storage_bytes_used: 'storage_bytes_limit',
    };

    const quotaResource = resourceMap[counter];
    if (quotaResource) {
      setImmediate(async () => {
        try {
          const plan = await this.getTenantPlan(tenantId);
          let limit = 0;
          if (quotaResource === 'max_posts_per_month') limit = plan.maxPostsPerMonth;
          else if (quotaResource === 'video_render_seconds_monthly') limit = plan.videoRenderSecondsMonthly;
          else if (quotaResource === 'ai_tokens_monthly') limit = plan.aiTokensMonthly;
          else if (quotaResource === 'storage_bytes_limit') limit = plan.storageBytesLimit;

          if (limit > 0) {
            const row = await db('tenant_usage_counters')
              .where({ tenant_id: tenantId, period_month: periodMonth })
              .first();
            let current = 0;
            if (counter === 'posts_published' || counter === 'posts_created') {
              current = Number(row?.posts_published || row?.posts_created || 0);
            } else if (counter === 'video_render_seconds') {
              current = Number(row?.video_render_seconds || 0);
            } else if (counter === 'ai_tokens_consumed') {
              current = Number(row?.ai_tokens_consumed || 0);
            } else if (counter === 'storage_bytes_used') {
              current = Number(row?.storage_bytes_used || 0);
            }

            await UsageAlertService.evaluateUsageThresholds(tenantId, quotaResource, current, limit, plan.name);
          }
        } catch (err: any) {
          console.error(`[UsageTrackerService] Error in post-record threshold check:`, err?.message);
        }
      });
    }
  }

  /**
   * Atomically decrements usage against monthly counter.
   * Ensures counter does not drop below 0.
   */
  public static async decrementUsage(
    tenantId: string,
    counter: 'posts_published' | 'posts_created' | 'video_render_seconds' | 'ai_tokens_consumed' | 'storage_bytes_used',
    amount: number = 1
  ): Promise<void> {
    if (amount <= 0) return;
    const periodMonth = this.getCurrentPeriodMonth();
    await db.raw(
      `
      UPDATE tenant_usage_counters
      SET ${counter} = GREATEST(0, CAST(${counter} AS SIGNED) - ?),
          updated_at = NOW()
      WHERE tenant_id = ? AND period_month = ?
      `,
      [amount, tenantId, periodMonth]
    );
  }

  /**
   * Returns comprehensive, tenant-scoped usage across all 7 tracked dimensions:
   * 1. Posts published (real production only)
   * 2. AI usage (tokens)
   * 3. Video rendering (seconds)
   * 4. Storage (bytes)
   * 5. Users (seats)
   * 6. Brands
   * 7. Social Accounts
   */
  public static async getDetailedTenantUsage(tenantId: string): Promise<TenantUsageResponse> {
    const plan = await this.getTenantPlan(tenantId);
    const period = this.getCurrentPeriodMonth();

    const [brandsCount, accountsCount, usersCount, automationsCount, usageRow, mediaAssetsSize] = await Promise.all([
      db('brands').where({ tenant_id: tenantId }).count('id as count').first(),
      db('social_accounts').where({ tenant_id: tenantId }).count('id as count').first(),
      db('tenant_users').where({ tenant_id: tenantId }).count('user_id as count').first(),
      db('automations').where({ tenant_id: tenantId, status: 'active' }).count('id as count').first().catch(() => ({ count: 0 })),
      db('tenant_usage_counters').where({ tenant_id: tenantId, period_month: period }).first(),
      db('media_assets').where({ tenant_id: tenantId }).sum('file_size_bytes as totalBytes').first(),
    ]);

    const calcMetric = (used: number, limit: number, unit?: string, periodStr?: string): TenantMetricUsage => {
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? Number(((used / limit) * 100).toFixed(2)) : 0;
      return {
        used,
        limit,
        remaining,
        percentage,
        ...(unit ? { unit } : {}),
        ...(periodStr ? { period: periodStr } : {}),
      };
    };

    const postsPublishedUsed = Number(usageRow?.posts_published || usageRow?.posts_created || 0);
    const aiUsed = Number(usageRow?.ai_tokens_consumed ?? 0);
    const videoUsed = Number(usageRow?.video_render_seconds ?? 0);
    const mediaBytes = Number(mediaAssetsSize?.totalBytes || 0);
    const counterBytes = Number(usageRow?.storage_bytes_used || 0);
    const storageUsed = Math.max(mediaBytes, counterBytes);
    const usersUsed = Number(usersCount?.count || 0);
    const brandsUsed = Number(brandsCount?.count || 0);
    const socialAccountsUsed = Number(accountsCount?.count || 0);
    const automationsUsed = Number(automationsCount?.count || 0);

    const planFeatures = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {});
    const automationsLimit = Number(planFeatures.max_active_automations ?? (
      plan.id === 'scale' ? 200 : plan.id === 'agency' ? 50 : plan.id === 'growth' ? 10 : 3
    ));

    const postsPublishedMetric = calcMetric(postsPublishedUsed, plan.maxPostsPerMonth, 'posts', period);
    const aiUsageMetric = calcMetric(aiUsed, plan.aiTokensMonthly, 'tokens', period);
    const videoRenderingMetric = calcMetric(videoUsed, plan.videoRenderSecondsMonthly, 'seconds', period);
    const storageMetric = calcMetric(storageUsed, plan.storageBytesLimit, 'bytes');
    const usersMetric = calcMetric(usersUsed, plan.maxUsers, 'seats');
    const brandsMetric = calcMetric(brandsUsed, plan.maxBrands, 'brands');
    const socialAccountsMetric = calcMetric(socialAccountsUsed, plan.maxSocialAccounts, 'accounts');
    const automationsMetric = calcMetric(automationsUsed, automationsLimit, 'automations');

    const metrics = {
      postsPublished: postsPublishedMetric,
      aiUsage: aiUsageMetric,
      videoRendering: videoRenderingMetric,
      storage: storageMetric,
      users: usersMetric,
      brands: brandsMetric,
      socialAccounts: socialAccountsMetric,
      automations: automationsMetric,
    };

    return {
      period,
      used: postsPublishedMetric.used,
      limit: postsPublishedMetric.limit,
      remaining: postsPublishedMetric.remaining,
      percentage: postsPublishedMetric.percentage,
      postsPublished: postsPublishedMetric,
      aiUsage: aiUsageMetric,
      videoRendering: videoRenderingMetric,
      storage: storageMetric,
      users: usersMetric,
      brands: brandsMetric,
      socialAccounts: socialAccountsMetric,
      automations: automationsMetric,
      metrics,
      plan: {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
      },
    };
  }

  /**
   * Aggregates complete subscription, quota, and usage overview for dashboard views.
   */
  public static async getTenantQuotaSummary(tenantId: string): Promise<{
    plan: SubscriptionPlan;
    periodMonth: string;
    usage: {
      brands: { current: number; limit: number; remaining: number };
      socialAccounts: { current: number; limit: number; remaining: number };
      users: { current: number; limit: number; remaining: number };
      monthlyPosts: { current: number; limit: number; remaining: number };
      monthlyVideoSeconds: { current: number; limit: number; remaining: number };
      monthlyAiTokens: { current: number; limit: number; remaining: number };
    };
  }> {
    const plan = await this.getTenantPlan(tenantId);
    const periodMonth = this.getCurrentPeriodMonth();

    const [brandsCount, accountsCount, usersCount, usageRow] = await Promise.all([
      db('brands').where({ tenant_id: tenantId }).count('id as count').first(),
      db('social_accounts').where({ tenant_id: tenantId }).count('id as count').first(),
      db('tenant_users').where({ tenant_id: tenantId }).count('user_id as count').first(),
      db('tenant_usage_counters').where({ tenant_id: tenantId, period_month: periodMonth }).first(),
    ]);

    const currentBrands = Number(brandsCount?.count || 0);
    const currentAccounts = Number(accountsCount?.count || 0);
    const currentUsers = Number(usersCount?.count || 0);
    const currentPosts = Number(usageRow?.posts_published || usageRow?.posts_created || 0);
    const currentVideo = Number(usageRow?.video_render_seconds || 0);
    const currentTokens = Number(usageRow?.ai_tokens_consumed || 0);

    return {
      plan,
      periodMonth,
      usage: {
        brands: {
          current: currentBrands,
          limit: plan.maxBrands,
          remaining: Math.max(0, plan.maxBrands - currentBrands),
        },
        socialAccounts: {
          current: currentAccounts,
          limit: plan.maxSocialAccounts,
          remaining: Math.max(0, plan.maxSocialAccounts - currentAccounts),
        },
        users: {
          current: currentUsers,
          limit: plan.maxUsers,
          remaining: Math.max(0, plan.maxUsers - currentUsers),
        },
        monthlyPosts: {
          current: currentPosts,
          limit: plan.maxPostsPerMonth,
          remaining: Math.max(0, plan.maxPostsPerMonth - currentPosts),
        },
        monthlyVideoSeconds: {
          current: currentVideo,
          limit: plan.videoRenderSecondsMonthly,
          remaining: Math.max(0, plan.videoRenderSecondsMonthly - currentVideo),
        },
        monthlyAiTokens: {
          current: currentTokens,
          limit: plan.aiTokensMonthly,
          remaining: Math.max(0, plan.aiTokensMonthly - currentTokens),
        },
      },
    };
  }
}
