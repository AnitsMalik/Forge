import { db } from '../db/connection.js';
import { UsageTrackerService } from './usageTracker.service.js';
import type {
  SubscriptionPlanId,
  SubscriptionStatus,
  EntitlementCheckResult,
} from '@socialforge/shared';

interface ResolvedSubscription {
  subscriptionId: string | null;
  tenantId: string;
  planId: SubscriptionPlanId;
  planName: string;
  status: SubscriptionStatus;
  maxBrands: number;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  maxUsers: number;
  maxAiContent: number;
  maxAiImages: number;
  maxAiVideos: number;
  maxActiveCampaigns: number;
  maxScheduledPosts: number;
  aiTokensMonthly: number;
  videoRenderSecondsMonthly: number;
  storageBytesLimit: number;
  features: Record<string, boolean>;
  currentPeriodEnd: Date;
  trialEndAt?: Date | null;
  pastDueSince?: Date | null;
}

export class EntitlementService {
  /**
   * Authoritatively resolves: tenant → subscription → plan → entitlement
   */
  public static async getResolvedSubscription(tenantId: string): Promise<ResolvedSubscription> {
    const row = await db('tenant_subscriptions')
      .join('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.tenant_id', tenantId)
      .select(
        'tenant_subscriptions.id as subscriptionId',
        'tenant_subscriptions.tenant_id as tenantId',
        'tenant_subscriptions.plan_id as planId',
        'tenant_subscriptions.status as status',
        'tenant_subscriptions.current_period_end as currentPeriodEnd',
        'tenant_subscriptions.trial_end_at as trialEndAt',
        'tenant_subscriptions.past_due_since as pastDueSince',
        'subscription_plans.name as planName',
        'subscription_plans.max_brands as maxBrands',
        'subscription_plans.max_social_accounts as maxSocialAccounts',
        'subscription_plans.max_posts_per_month as maxPostsPerMonth',
        'subscription_plans.max_users as maxUsers',
        'subscription_plans.max_ai_content as maxAiContent',
        'subscription_plans.max_ai_images as maxAiImages',
        'subscription_plans.max_ai_videos as maxAiVideos',
        'subscription_plans.max_active_campaigns as maxActiveCampaigns',
        'subscription_plans.max_scheduled_posts as maxScheduledPosts',
        'subscription_plans.ai_tokens_monthly as aiTokensMonthly',
        'subscription_plans.video_render_seconds_monthly as videoRenderSecondsMonthly',
        'subscription_plans.storage_bytes_limit as storageBytesLimit',
        'subscription_plans.features'
      )
      .first();

    if (row) {
      let effectiveStatus = row.status as SubscriptionStatus;
      const now = new Date();

      // Check for period expiration
      if (effectiveStatus === 'trialing' && row.trialEndAt && new Date(row.trialEndAt) < now) {
        effectiveStatus = 'expired';
      } else if (effectiveStatus === 'active' && new Date(row.currentPeriodEnd) < now) {
        effectiveStatus = 'expired';
      }

      return {
        subscriptionId: row.subscriptionId,
        tenantId: row.tenantId,
        planId: row.planId,
        planName: row.planName,
        status: effectiveStatus,
        maxBrands: row.maxBrands,
        maxSocialAccounts: row.maxSocialAccounts,
        maxPostsPerMonth: row.maxPostsPerMonth,
        maxUsers: row.maxUsers,
        maxAiContent: Number(row.maxAiContent ?? 100),
        maxAiImages: Number(row.maxAiImages ?? 25),
        maxAiVideos: Number(row.maxAiVideos ?? 5),
        maxActiveCampaigns: Number(row.maxActiveCampaigns ?? 5),
        maxScheduledPosts: Number(row.maxScheduledPosts ?? 50),
        aiTokensMonthly: row.aiTokensMonthly,
        videoRenderSecondsMonthly: row.videoRenderSecondsMonthly,
        storageBytesLimit: Number(row.storageBytesLimit || 10737418240),
        features: typeof row.features === 'string' ? JSON.parse(row.features) : (row.features || {}),
        currentPeriodEnd: new Date(row.currentPeriodEnd),
        trialEndAt: row.trialEndAt ? new Date(row.trialEndAt) : null,
        pastDueSince: row.pastDueSince ? new Date(row.pastDueSince) : null,
      };
    }

    // Default fallback to free trial plan
    const freePlan = await db('subscription_plans').where({ id: 'free_trial' }).first();
    const fallbackEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return {
      subscriptionId: null,
      tenantId,
      planId: 'free_trial',
      planName: freePlan?.name || 'Free Trial',
      status: 'trialing',
      maxBrands: freePlan?.max_brands ?? 1,
      maxSocialAccounts: freePlan?.max_social_accounts ?? 2,
      maxPostsPerMonth: freePlan?.max_posts_per_month ?? 20,
      maxUsers: freePlan?.max_users ?? 1,
      maxAiContent: freePlan?.max_ai_content ?? 25,
      maxAiImages: freePlan?.max_ai_images ?? 5,
      maxAiVideos: freePlan?.max_ai_videos ?? 1,
      maxActiveCampaigns: freePlan?.max_active_campaigns ?? 1,
      maxScheduledPosts: freePlan?.max_scheduled_posts ?? 10,
      aiTokensMonthly: freePlan?.ai_tokens_monthly ?? 25000,
      videoRenderSecondsMonthly: freePlan?.video_render_seconds_monthly ?? 60,
      storageBytesLimit: Number(freePlan?.storage_bytes_limit || 1073741824),
      features: typeof freePlan?.features === 'string' ? JSON.parse(freePlan.features) : (freePlan?.features || {}),
      currentPeriodEnd: fallbackEnd,
      trialEndAt: fallbackEnd,
      pastDueSince: null,
    };
  }

  /**
   * Helper to check subscription status gate
   * Implements 3-7 day past_due grace policy (5 days)
   */
  private static checkStatusGate(sub: ResolvedSubscription): {
    allowed: boolean;
    reason?: string;
    isGracePeriod?: boolean;
    gracePeriodEndsAt?: Date | null;
  } {
    switch (sub.status) {
      case 'active':
      case 'trialing':
        return { allowed: true };

      case 'past_due': {
        const GRACE_PERIOD_DAYS = 5; // Configured within 3-7 day requirement

        if (sub.pastDueSince) {
          const pastDueTime = new Date(sub.pastDueSince).getTime();
          const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
          const gracePeriodEndsAt = new Date(pastDueTime + gracePeriodMs);
          const inGracePeriod = Date.now() < gracePeriodEndsAt.getTime();

          if (inGracePeriod) {
            const daysRemaining = Math.max(1, Math.ceil((gracePeriodEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
            return {
              allowed: true,
              isGracePeriod: true,
              gracePeriodEndsAt,
              reason: `Subscription payment is past due. Operating under a ${daysRemaining}-day grace period (until ${gracePeriodEndsAt.toLocaleDateString()}). Please update payment method.`,
            };
          }

          return {
            allowed: false,
            isGracePeriod: false,
            gracePeriodEndsAt,
            reason: `Subscription for ${sub.planName} is past due and the ${GRACE_PERIOD_DAYS}-day grace period has expired. Please update payment method to restore full access.`,
          };
        }

        // Default strict block if no grace timestamp is active
        return {
          allowed: false,
          reason: `Subscription for ${sub.planName} is past due. Please update payment method to restore full access.`,
        };
      }

      case 'paused':
        return {
          allowed: false,
          reason: `Subscription is paused. Please resume your subscription to continue.`,
        };

      case 'cancelled':
        return {
          allowed: false,
          reason: `Subscription has been cancelled. Please reactivate your subscription to access this feature.`,
        };

      case 'expired':
        return {
          allowed: false,
          reason: `Subscription has expired. Please upgrade or renew your plan to continue.`,
        };

      default:
        return { allowed: false, reason: `Invalid subscription status: ${sub.status}` };
    }
  }

  /**
   * 1. canCreateBrand()
   */
  public static async canCreateBrand(tenantId: string): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const row = await db('brands')
      .where({ tenant_id: tenantId })
      .count('id as count')
      .first();
    const current = Number(row?.count || 0);
    const limit = sub.maxBrands;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    const allowed = current < limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Your ${sub.planName} plan brand limit has been reached (${current}/${limit}). Please upgrade your plan to add more brands.`,
    };
  }

  /**
   * 2. canConnectSocialAccount()
   */
  public static async canConnectSocialAccount(tenantId: string): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const row = await db('social_accounts')
      .where({ tenant_id: tenantId })
      .count('id as count')
      .first();
    const current = Number(row?.count || 0);
    const limit = sub.maxSocialAccounts;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    const allowed = current < limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Your ${sub.planName} plan limit for connected social accounts has been reached (${current}/${limit}). Please upgrade to add more channels.`,
    };
  }

  /**
   * 3. canCreateUser()
   */
  public static async canCreateUser(tenantId: string): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const [activeUsersRow, pendingInvitesRow] = await Promise.all([
      db('tenant_users')
        .where({ tenant_id: tenantId })
        .count('user_id as count')
        .first(),
      db('workspace_invites')
        .where({ tenant_id: tenantId, status: 'pending' })
        .where('expires_at', '>', new Date())
        .count('id as count')
        .first(),
    ]);
    const current = Number(activeUsersRow?.count || 0) + Number(pendingInvitesRow?.count || 0);
    const limit = sub.maxUsers;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    const allowed = current < limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Your ${sub.planName} workspace user limit has been reached (${current}/${limit}). Please upgrade to invite additional team members.`,
    };
  }

  /**
   * 4. canPublish()
   */
  public static async canPublish(tenantId: string, requestedAmount = 1): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    const row = await db('tenant_usage_counters')
      .where({ tenant_id: tenantId, period_month: periodMonth })
      .select('posts_published', 'posts_created')
      .first();
    const current = Number(row?.posts_published || row?.posts_created || 0);
    const limit = sub.maxPostsPerMonth;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        isGracePeriod: false,
        gracePeriodEndsAt: gate.gracePeriodEndsAt,
        reason: gate.reason,
      };
    }

    const allowed = current + requestedAmount <= limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      isGracePeriod: gate.isGracePeriod,
      gracePeriodEndsAt: gate.gracePeriodEndsAt,
      reason: allowed
        ? (gate.isGracePeriod ? gate.reason : undefined)
        : `Monthly publication quota of ${limit} posts on ${sub.planName} has been reached. Please upgrade to continue publishing.`,
    };
  }

  /**
   * 5. canSchedule()
   */
  public static async canSchedule(tenantId: string, requestedAmount = 1): Promise<EntitlementCheckResult> {
    return this.canPublish(tenantId, requestedAmount);
  }

  /**
   * 6. canRenderVideo()
   */
  public static async canRenderVideo(
    tenantId: string,
    requestedDurationSeconds = 60
  ): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    const row = await db('tenant_usage_counters')
      .where({ tenant_id: tenantId, period_month: periodMonth })
      .select('video_render_seconds')
      .first();
    const current = Number(row?.video_render_seconds || 0);
    const limit = sub.videoRenderSecondsMonthly;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    // Check feature flag
    if (!sub.features.ffmpeg_video) {
      return {
        allowed: false,
        current,
        limit: 0,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: `Video rendering is not enabled on your current ${sub.planName} plan. Please upgrade to Growth or Agency Scale.`,
      };
    }

    const allowed = current + requestedDurationSeconds <= limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Monthly video rendering limit of ${limit} seconds on ${sub.planName} has been reached (${current}s rendered).`,
    };
  }

  /**
   * 7. canUseAI()
   */
  public static async canUseAI(
    tenantId: string,
    estimatedTokens = 1000
  ): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    const row = await db('tenant_usage_counters')
      .where({ tenant_id: tenantId, period_month: periodMonth })
      .select('ai_tokens_consumed')
      .first();
    const current = Number(row?.ai_tokens_consumed || 0);
    const limit = sub.aiTokensMonthly;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    if (sub.features.ai_brain === false) {
      return {
        allowed: false,
        current,
        limit: 0,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: `AI Brand Brain is not enabled on your ${sub.planName} plan.`,
      };
    }

    const allowed = current + estimatedTokens <= limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Monthly AI token budget of ${limit.toLocaleString()} tokens on ${sub.planName} has been exhausted (${current.toLocaleString()} used).`,
    };
  }

  /**
   * 8. canUseAdvancedAnalytics()
   */
  public static async canUseAdvancedAnalytics(tenantId: string): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const hasFeature = Boolean(sub.features.advanced_analytics);

    if (!gate.allowed) {
      return {
        allowed: false,
        current: 0,
        limit: hasFeature ? 1 : 0,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    return {
      allowed: hasFeature,
      current: hasFeature ? 1 : 0,
      limit: hasFeature ? 1 : 0,
      remaining: hasFeature ? 1 : 0,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: hasFeature
        ? undefined
        : `Advanced Analytics is not included in ${sub.planName}. Please upgrade to Starter, Growth, or Agency Scale.`,
    };
  }

  /**
   * 9. canUseAds()
   */
  public static async canUseAds(tenantId: string): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const hasFeature = Boolean(sub.features.ads_management || sub.features.ads);

    if (!gate.allowed) {
      return {
        allowed: false,
        current: 0,
        limit: hasFeature ? 1 : 0,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    return {
      allowed: hasFeature,
      current: hasFeature ? 1 : 0,
      limit: hasFeature ? 1 : 0,
      remaining: hasFeature ? 1 : 0,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: hasFeature
        ? undefined
        : `Paid Social Ad Orchestration is not included in your ${sub.planName} plan. Please contact sales to enable ad campaigns.`,
    };
  }

  /**
   * 10. canUploadStorage()
   */
  public static async canUploadStorage(
    tenantId: string,
    requestedBytes: number = 0
  ): Promise<EntitlementCheckResult> {
    const sub = await this.getResolvedSubscription(tenantId);
    const gate = this.checkStatusGate(sub);

    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    const [row, mediaAssetsSize] = await Promise.all([
      db('tenant_usage_counters')
        .where({ tenant_id: tenantId, period_month: periodMonth })
        .select('storage_bytes_used')
        .first(),
      db('media_assets')
        .where({ tenant_id: tenantId })
        .sum('file_size_bytes as totalBytes')
        .first(),
    ]);

    const counterBytes = Number(row?.storage_bytes_used || 0);
    const mediaBytes = Number(mediaAssetsSize?.totalBytes || 0);
    const current = Math.max(counterBytes, mediaBytes);
    const limit = sub.storageBytesLimit;
    const remaining = Math.max(0, limit - current);

    if (!gate.allowed) {
      return {
        allowed: false,
        current,
        limit,
        remaining: 0,
        status: sub.status,
        planId: sub.planId,
        planName: sub.planName,
        reason: gate.reason,
      };
    }

    const allowed = current + requestedBytes <= limit;
    return {
      allowed,
      current,
      limit,
      remaining,
      status: sub.status,
      planId: sub.planId,
      planName: sub.planName,
      reason: allowed
        ? undefined
        : `Your ${sub.planName} plan limit of ${(limit / (1024 * 1024 * 1024)).toFixed(1)} GB media storage has been reached (${(current / (1024 * 1024 * 1024)).toFixed(2)} GB used). Upgrade to continue.`,
    };
  }

  /**
   * Comprehensive Entitlement Snapshot for frontend views
   */
  public static async getTenantEntitlements(tenantId: string): Promise<{
    subscription: {
      planId: string;
      planName: string;
      status: SubscriptionStatus;
      currentPeriodEnd: Date;
    };
    entitlements: {
      canCreateBrand: EntitlementCheckResult;
      canConnectSocialAccount: EntitlementCheckResult;
      canCreateUser: EntitlementCheckResult;
      canPublish: EntitlementCheckResult;
      canSchedule: EntitlementCheckResult;
      canRenderVideo: EntitlementCheckResult;
      canUseAI: EntitlementCheckResult;
      canUseAdvancedAnalytics: EntitlementCheckResult;
      canUseAds: EntitlementCheckResult;
      canUploadStorage: EntitlementCheckResult;
    };
  }> {
    const sub = await this.getResolvedSubscription(tenantId);
    const [
      createBrand,
      connectAccount,
      createUser,
      publish,
      schedule,
      renderVideo,
      useAI,
      advancedAnalytics,
      useAds,
      uploadStorage,
    ] = await Promise.all([
      this.canCreateBrand(tenantId),
      this.canConnectSocialAccount(tenantId),
      this.canCreateUser(tenantId),
      this.canPublish(tenantId),
      this.canSchedule(tenantId),
      this.canRenderVideo(tenantId),
      this.canUseAI(tenantId),
      this.canUseAdvancedAnalytics(tenantId),
      this.canUseAds(tenantId),
      this.canUploadStorage(tenantId),
    ]);

    return {
      subscription: {
        planId: sub.planId,
        planName: sub.planName,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      entitlements: {
        canCreateBrand: createBrand,
        canConnectSocialAccount: connectAccount,
        canCreateUser: createUser,
        canPublish: publish,
        canSchedule: schedule,
        canRenderVideo: renderVideo,
        canUseAI: useAI,
        canUseAdvancedAnalytics: advancedAnalytics,
        canUseAds: useAds,
        canUploadStorage: uploadStorage,
      },
    };
  }
}
