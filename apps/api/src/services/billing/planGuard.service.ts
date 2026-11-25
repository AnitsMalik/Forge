import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { EntitlementService } from '../entitlement.service.js';
import { UsageTrackerService } from '../usageTracker.service.js';
import type {
  QuotaResource,
  PlanGuardCheckResult,
  SubscriptionPlanId,
  SubscriptionStatus,
  PlanUpgradeOption,
} from '@socialforge/shared';

export class PlanGuardError extends Error {
  public readonly code = 'QUOTA_EXCEEDED';
  public readonly statusCode = 403;
  public readonly checkResult: PlanGuardCheckResult;
  public readonly currentUsage: number;
  public readonly allowedUsage: number;
  public readonly remainingQuota: number;
  public readonly feature: string;
  public readonly featureLabel: string;
  public readonly billingPeriod: string;
  public readonly renewalDate: string | Date | null;
  public readonly explanation: string;
  public readonly upgradeOption: PlanUpgradeOption;

  constructor(checkResult: PlanGuardCheckResult) {
    const featureLabel = checkResult.featureLabel || PlanGuardService.getFeatureLabel(checkResult.resource);
    const billingPeriod = checkResult.billingPeriod || UsageTrackerService.getCurrentPeriodMonth();
    const renewalDate = checkResult.renewalDate || (checkResult as any).currentPeriodEnd || null;
    const explanation =
      checkResult.explanation ||
      checkResult.reason ||
      `You have reached your limit of ${checkResult.limit} for ${featureLabel} on your ${checkResult.planName} plan for billing period ${billingPeriod}.`;
    const upgradeOption =
      checkResult.upgradeOption || PlanGuardService.resolveUpgradeOption(checkResult.planId, checkResult.resource);

    super(explanation);
    this.name = 'PlanGuardError';
    this.checkResult = {
      ...checkResult,
      featureLabel,
      billingPeriod,
      renewalDate,
      explanation,
      upgradeOption,
    };
    this.currentUsage = checkResult.current;
    this.allowedUsage = checkResult.limit;
    this.remainingQuota = checkResult.remaining;
    this.feature = String(checkResult.resource);
    this.featureLabel = featureLabel;
    this.billingPeriod = billingPeriod;
    this.renewalDate = renewalDate;
    this.explanation = explanation;
    this.upgradeOption = upgradeOption;
    Object.setPrototypeOf(this, PlanGuardError.prototype);
  }

  public toJSON() {
    return {
      code: this.code,
      message: this.message,
      currentUsage: this.currentUsage,
      allowedUsage: this.allowedUsage,
      remainingQuota: this.remainingQuota,
      feature: this.feature,
      featureLabel: this.featureLabel,
      billingPeriod: this.billingPeriod,
      renewalDate: this.renewalDate,
      plan: {
        id: this.checkResult.planId,
        name: this.checkResult.planName,
      },
      subscriptionStatus: this.checkResult.status,
      explanation: this.explanation,
      upgrade: this.upgradeOption,
    };
  }
}

export class PlanGuardService {
  /**
   * Translates resource keys into clean human-readable labels
   */
  public static getFeatureLabel(resource: QuotaResource | string): string {
    const labels: Record<string, string> = {
      brands: 'Brands',
      seats: 'Team Members',
      users: 'Team Members',
      social_accounts: 'Connected Social Accounts',
      active_automations: 'Active Automations',
      ai_credits: 'AI Tokens',
      video_minutes: 'Video Rendering (Seconds)',
      storage: 'Media Storage',
      posts: 'Published Posts',
      posts_created: 'Posts Created',
      posts_published: 'Posts Published',
      scheduled_posts: 'Scheduled Posts',
      ai_content: 'AI Content Generations',
      ai_content_generations: 'AI Content Generations',
      ai_images: 'AI Image Generations',
      ai_image_generations: 'AI Image Generations',
      ai_videos: 'AI Video Generations',
      ai_video_generations: 'AI Video Generations',
      active_campaigns: 'Active Campaigns',
      analytics_retention: 'Analytics Data Retention',
      premium_connectors: 'Premium Connectors',
      autonomy_level: 'AI Autonomy Level',
      agency_workspaces: 'Agency Workspaces',
      client_approvals: 'Client Approvals',
      whatsapp: 'WhatsApp Marketing',
      scim_provisioning: 'SCIM 2.0 Provisioning',
      api_access: 'Developer REST API',
      custom_branding: 'Custom Branding',
      multi_brand_brain: 'Multi-Brand Brain Graph',
    };
    return labels[String(resource)] || String(resource);
  }

  /**
   * Resolves the recommended plan and upgrade option for an exceeded entitlement
   */
  public static resolveUpgradeOption(
    planId: SubscriptionPlanId | string,
    resource: QuotaResource | string
  ): PlanUpgradeOption {
    const norm = String(planId || 'free').toLowerCase();
    const featureLabel = this.getFeatureLabel(resource);

    if (norm === 'business' || norm === 'agency') {
      return {
        required: true,
        recommendedPlan: 'enterprise',
        recommendedPlanName: 'Enterprise Plan',
        upgradeUrl: '/billing?plan=enterprise',
        message: `Upgrade to Enterprise Plan for unlimited ${featureLabel}, dedicated infrastructure, and 24/7 SLA support.`,
      };
    }

    if (norm === 'professional' || norm === 'growth') {
      return {
        required: true,
        recommendedPlan: 'business',
        recommendedPlanName: 'Business Plan',
        upgradeUrl: '/billing?plan=business',
        message: `Upgrade to Business Plan to increase your ${featureLabel} quota by 4x and unlock multi-brand management.`,
      };
    }

    return {
      required: true,
      recommendedPlan: 'professional',
      recommendedPlanName: 'Professional Plan',
      upgradeUrl: '/billing?plan=professional',
      message: `Upgrade to Professional Plan to unlock 250 AI images, 50 video reels, and 15 social accounts.`,
    };
  }

  /**
   * Evaluates entitlement for a tenant across any of the 12 metered resources.
   * Returns authoritative check result without throwing.
   */
  public async check(
    tenantId: string,
    resource: QuotaResource,
    requestedAmount = 1,
    context?: Record<string, any>
  ): Promise<PlanGuardCheckResult> {
    const sub = await EntitlementService.getResolvedSubscription(tenantId);
    const gate = (EntitlementService as any).checkStatusGate(sub);

    const planFeatures: Record<string, any> = sub.features || {};
    const billingPeriod = UsageTrackerService.getCurrentPeriodMonth();
    const featureLabel = PlanGuardService.getFeatureLabel(resource);
    const upgradeOption = PlanGuardService.resolveUpgradeOption(sub.planId, resource);

    const renewalDate = (sub as any).nextBillingDate || sub.currentPeriodEnd || null;

    // Base result template
    const baseResult: PlanGuardCheckResult = {
      allowed: true,
      resource,
      current: 0,
      limit: 0,
      remaining: 0,
      planId: sub.planId,
      planName: sub.planName,
      status: sub.status,
      isGracePeriod: gate.isGracePeriod,
      gracePeriodEndsAt: gate.gracePeriodEndsAt,
      upgradeRequired: false,
      billingPeriod,
      renewalDate,
      featureLabel,
      upgradeOption,
    };

    // If subscription status blocks operations (e.g. expired, cancelled, past grace period)
    if (!gate.allowed) {
      const reason = gate.reason || `Subscription status '${sub.status}' does not permit operations.`;
      return {
        ...baseResult,
        allowed: false,
        reason,
        explanation: reason,
        upgradeRequired: true,
      };
    }

    // Canonicalize resource name
    const canonical = this.canonicalizeResource(resource);

    // Check for explicit tenant or brand-scoped entitlement overrides
    let explicitLimit: number | null = null;
    let explicitEnabled: boolean | null = null;
    try {
      const entQuery = db('entitlements')
        .where({ tenant_id: tenantId, resource: canonical });

      if (context?.brandId) {
        entQuery.where(function () {
          this.where('brand_id', context.brandId).orWhereNull('brand_id');
        }).orderByRaw('brand_id IS NULL ASC'); // brand-specific override takes precedence
      } else {
        entQuery.whereNull('brand_id');
      }

      entQuery.where(function () {
        this.whereNull('plan_id').orWhere('plan_id', sub.planId);
      });

      const explicitEnt = await entQuery.first();
      if (explicitEnt) {
        let isExpired = false;
        if (explicitEnt.expires_at) {
          isExpired = new Date() >= new Date(explicitEnt.expires_at);
        }
        if (!isExpired && explicitEnt.config) {
          try {
            const parsedConfig = typeof explicitEnt.config === 'string' ? JSON.parse(explicitEnt.config) : explicitEnt.config;
            if (parsedConfig?.expires_at) {
              isExpired = new Date() >= new Date(parsedConfig.expires_at);
            }
          } catch {
            // ignore
          }
        }

        if (!isExpired) {
          if (explicitEnt.is_enabled === 0 || explicitEnt.is_enabled === false) {
            explicitEnabled = false;
          } else if (explicitEnt.is_enabled === 1 || explicitEnt.is_enabled === true) {
            explicitEnabled = true;
          }
          if (explicitEnt.limit_value !== null && explicitEnt.limit_value !== undefined) {
            explicitLimit = Number(explicitEnt.limit_value);
          }
        }
      }
    } catch {
      // Safe fallback if table query fails
    }

    switch (canonical) {
      case 'brands': {
        const row = await db('brands')
          .where({ tenant_id: tenantId })
          .count('id as count')
          .first();
        const current = Number(row?.count || 0);
        const limit = explicitLimit !== null ? explicitLimit : sub.maxBrands;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Brand limit of ${limit} reached on ${sub.planName} plan (${current} active). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'seats': {
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
        const limit = explicitLimit !== null ? explicitLimit : sub.maxUsers;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Team seat limit of ${limit} reached on ${sub.planName} plan (${current} members). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'social_accounts': {
        const socialRow = await db('social_accounts')
          .where({ tenant_id: tenantId })
          .count('id as count')
          .first();
        const metaRow = await db('meta_connections')
          .where({ tenant_id: tenantId })
          .whereIn('status', ['connected', 'healthy'])
          .count('id as count')
          .first();

        const current = Math.max(Number(socialRow?.count || 0), Number(metaRow?.count || 0));
        const limit = explicitLimit !== null ? explicitLimit : sub.maxSocialAccounts;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Social account connection limit of ${limit} reached on ${sub.planName} plan (${current} connected). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'active_automations': {
        const row = await db('automations')
          .where({ tenant_id: tenantId, status: 'active' })
          .count('id as count')
          .first();
        const current = Number(row?.count || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number(planFeatures.max_active_automations ?? 3);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Active automation limit of ${limit} reached on ${sub.planName} plan (${current} active). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'ai_credits': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('ai_tokens_consumed')
          .first();
        const current = Number(row?.ai_tokens_consumed || 0);
        const limit = explicitLimit !== null ? explicitLimit : sub.aiTokensMonthly;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly AI token budget of ${limit.toLocaleString()} on ${sub.planName} plan exhausted (${current.toLocaleString()} used).`,
          upgradeRequired: !allowed,
        };
      }

      case 'video_minutes': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('video_render_seconds')
          .first();
        const current = Number(row?.video_render_seconds || 0);
        const limit = explicitLimit !== null ? explicitLimit : sub.videoRenderSecondsMonthly;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly video rendering limit of ${limit}s on ${sub.planName} plan reached (${current}s rendered). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'storage': {
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
        const limit = explicitLimit !== null ? explicitLimit : sub.storageBytesLimit;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Storage limit of ${(limit / 1073741824).toFixed(1)} GB on ${sub.planName} plan reached. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'posts': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('tenant_usage_counters')
          .where({ tenant_id: tenantId, period_month: periodMonth })
          .select('posts_published', 'posts_created')
          .first();
        const current = Number(row?.posts_published || row?.posts_created || 0);
        const limit = explicitLimit !== null ? explicitLimit : sub.maxPostsPerMonth;
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly post publication quota of ${limit} on ${sub.planName} plan reached (${current} published). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'analytics_retention': {
        const maxDaysAllowed = explicitLimit !== null ? explicitLimit : Number(planFeatures.analytics_retention_days ?? 30);
        const requestedDays = requestedAmount || (context?.days as number) || 30;
        const allowed = requestedDays <= maxDaysAllowed;

        return {
          ...baseResult,
          current: requestedDays,
          limit: maxDaysAllowed,
          remaining: Math.max(0, maxDaysAllowed - requestedDays),
          allowed,
          reason: allowed
            ? undefined
            : `Historical analytics retention of ${requestedDays} days exceeds your ${sub.planName} plan limit of ${maxDaysAllowed} days. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'premium_connectors': {
        const hasPremium = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.premium_connectors);
        const rawConnector = context?.connectorType || 'google_sheets';
        const connectorType = String(rawConnector).toLowerCase().replace(/-/g, '_');
        const isPremiumConnector = ['google_sheets', 'excel', 'enterprise_erp', 'salesforce'].includes(connectorType);

        const allowed = !isPremiumConnector || hasPremium;

        return {
          ...baseResult,
          current: hasPremium ? 1 : 0,
          limit: hasPremium ? 1 : 0,
          remaining: hasPremium ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Premium data connector '${connectorType}' is not included in ${sub.planName}. Please upgrade to Growth, Agency, or Scale.`,
          upgradeRequired: !allowed,
        };
      }

      case 'autonomy_level': {
        const allowedMaxLevel = planFeatures.max_autonomy_level || (
          sub.planId === 'free_trial' || sub.planId === 'trial' || sub.planId === 'starter' ? 'L2' :
          sub.planId === 'growth' ? 'L3' :
          sub.planId === 'agency' ? 'L4' : 'L5'
        );

        const targetLevel = (context?.level as string) || 'L2';
        const LEVEL_RANKS: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };
        const targetRank = LEVEL_RANKS[targetLevel] ?? 2;
        const maxRank = explicitLimit !== null ? explicitLimit : (LEVEL_RANKS[allowedMaxLevel] ?? 2);

        const allowed = targetRank <= maxRank;

        return {
          ...baseResult,
          current: targetRank,
          limit: maxRank,
          remaining: Math.max(0, maxRank - targetRank),
          allowed,
          reason: allowed
            ? undefined
            : `Autonomy level ${targetLevel} exceeds maximum allowed level (${allowedMaxLevel}) for ${sub.planName} plan. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'agency_workspaces': {
        const hasAgencyWorkspaces = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.agency_workspaces);
        const allowed = hasAgencyWorkspaces;

        return {
          ...baseResult,
          current: hasAgencyWorkspaces ? 1 : 0,
          limit: hasAgencyWorkspaces ? 1 : 0,
          remaining: hasAgencyWorkspaces ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Multi-tenant agency workspaces are exclusive to Agency Pro and Scale plans. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'client_approvals': {
        const hasClientApprovals = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.client_approvals);
        const allowed = hasClientApprovals;

        return {
          ...baseResult,
          current: hasClientApprovals ? 1 : 0,
          limit: hasClientApprovals ? 1 : 0,
          remaining: hasClientApprovals ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Client approval magic links require Growth, Agency Pro, or Scale plan. Please upgrade to unlock client approvals.`,
          upgradeRequired: !allowed,
        };
      }

      case 'whatsapp': {
        const hasWhatsapp = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.whatsapp_enabled);
        const allowed = hasWhatsapp;

        return {
          ...baseResult,
          current: hasWhatsapp ? 1 : 0,
          limit: hasWhatsapp ? 1 : 0,
          remaining: hasWhatsapp ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `WhatsApp marketing requires Growth, Agency Pro, or Scale plan. Please upgrade to unlock WhatsApp integration.`,
          upgradeRequired: !allowed,
        };
      }

      case 'scim_provisioning': {
        const hasScim = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.scim_provisioning);
        const allowed = hasScim;

        return {
          ...baseResult,
          current: hasScim ? 1 : 0,
          limit: hasScim ? 1 : 0,
          remaining: hasScim ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Automated SCIM 2.0 user directory provisioning requires Scale or Enterprise plan. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'api_access': {
        const hasApi = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.api_access);
        const allowed = hasApi;

        return {
          ...baseResult,
          current: hasApi ? 1 : 0,
          limit: hasApi ? 1 : 0,
          remaining: hasApi ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Developer REST API & webhook dispatchers are exclusive to Agency Pro and Scale plans. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'custom_branding': {
        const hasBranding = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.custom_branding);
        const allowed = hasBranding;

        return {
          ...baseResult,
          current: hasBranding ? 1 : 0,
          limit: hasBranding ? 1 : 0,
          remaining: hasBranding ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Custom branding and white-label portals require Agency Pro or Scale plan. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'multi_brand_brain': {
        const hasMultiBrain = explicitEnabled !== null ? explicitEnabled : Boolean(planFeatures.multi_brand_brain);
        const allowed = hasMultiBrain;

        return {
          ...baseResult,
          current: hasMultiBrain ? 1 : 0,
          limit: hasMultiBrain ? 1 : 0,
          remaining: hasMultiBrain ? 1 : 0,
          allowed,
          reason: allowed
            ? undefined
            : `Cross-brand Brand Brain neural graph requires Agency Pro or Scale plan. Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'ai_content': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('usage_counters')
          .where({ tenant_id: tenantId, metric: 'ai_content', period: periodMonth })
          .sum('current_usage as total')
          .first();
        const current = Number(row?.total || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number((sub as any).maxAiContent ?? 100);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly AI content generation limit of ${limit} reached on ${sub.planName} plan (${current} generated). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'ai_images': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('usage_counters')
          .where({ tenant_id: tenantId, metric: 'ai_images', period: periodMonth })
          .sum('current_usage as total')
          .first();
        const current = Number(row?.total || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number((sub as any).maxAiImages ?? 25);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly AI image generation limit of ${limit} reached on ${sub.planName} plan (${current} generated). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'ai_videos': {
        const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
        const row = await db('usage_counters')
          .where({ tenant_id: tenantId, metric: 'ai_videos', period: periodMonth })
          .sum('current_usage as total')
          .first();
        const current = Number(row?.total || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number((sub as any).maxAiVideos ?? 5);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Monthly AI video generation limit of ${limit} reached on ${sub.planName} plan (${current} generated). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'active_campaigns': {
        const row = await db('campaigns')
          .join('brands', 'campaigns.brand_id', 'brands.id')
          .where('brands.tenant_id', tenantId)
          .where('campaigns.status', 'active')
          .count('campaigns.id as count')
          .first();
        const current = Number(row?.count || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number((sub as any).maxActiveCampaigns ?? 5);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Active campaign limit of ${limit} reached on ${sub.planName} plan (${current} active). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      case 'scheduled_posts': {
        const row = await db('posts')
          .where({ tenant_id: tenantId, status: 'scheduled' })
          .count('id as count')
          .first();
        const current = Number(row?.count || 0);
        const limit = explicitLimit !== null ? explicitLimit : Number((sub as any).maxScheduledPosts ?? 50);
        const remaining = Math.max(0, limit - current);
        const allowed = current + requestedAmount <= limit;

        return {
          ...baseResult,
          current,
          limit,
          remaining,
          allowed,
          reason: allowed
            ? (gate.isGracePeriod ? gate.reason : undefined)
            : `Scheduled post queue limit of ${limit} reached on ${sub.planName} plan (${current} scheduled). Upgrade required.`,
          upgradeRequired: !allowed,
        };
      }

      default:
        return baseResult;
    }
  }

  /**
   * Enforces entitlement and throws PlanGuardError if rejected.
   */
  public async enforce(
    tenantId: string,
    resource: QuotaResource,
    requestedAmount = 1,
    context?: Record<string, any>
  ): Promise<PlanGuardCheckResult> {
    const result = await this.check(tenantId, resource, requestedAmount, context);
    if (!result.allowed) {
      throw new PlanGuardError(result);
    }
    return result;
  }

  /**
   * Atomically records usage with idempotent duplicate detection.
   * If the idempotencyKey has already been used for this tenant, returns without charging quota.
   */
  public async incrementUsageIdempotent(params: {
    tenantId: string;
    resource: QuotaResource;
    amount: number;
    idempotencyKey: string;
    metadata?: Record<string, any>;
  }): Promise<{ alreadyRecorded: boolean; currentTotal: number }> {
    const { tenantId, resource, amount, idempotencyKey, metadata } = params;

    // Check if key already recorded
    const existing = await db('idempotent_usage_records')
      .where({ tenant_id: tenantId, idempotency_key: idempotencyKey })
      .first();

    if (existing) {
      return { alreadyRecorded: true, currentTotal: Number(existing.amount) };
    }

    // Insert record with unique guard
    try {
      await db('idempotent_usage_records').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        resource: String(resource),
        amount,
        idempotency_key: idempotencyKey,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date(),
      });
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY' || err.message?.includes('duplicate') || err.message?.includes('Duplicate')) {
        return { alreadyRecorded: true, currentTotal: amount };
      }
      throw err;
    }

    // First-time increment on tenant_usage_counters and usage_counters
    const canonical = this.canonicalizeResource(resource);
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();

    if (canonical === 'posts') {
      await UsageTrackerService.recordUsage(tenantId, 'posts_published', amount);
    } else if (canonical === 'ai_credits') {
      await UsageTrackerService.recordUsage(tenantId, 'ai_tokens_consumed', amount);
    } else if (canonical === 'video_minutes') {
      await UsageTrackerService.recordUsage(tenantId, 'video_render_seconds', amount);
    } else if (canonical === 'storage') {
      await UsageTrackerService.recordUsage(tenantId, 'storage_bytes_used', amount);
    } else if (canonical === 'ai_content' || canonical === 'ai_images' || canonical === 'ai_videos') {
      try {
        const cId = crypto.randomUUID();
        const now = new Date();
        await db.raw(
          `
          INSERT INTO usage_counters (id, tenant_id, brand_id, metric, period, current_usage, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            current_usage = current_usage + VALUES(current_usage),
            updated_at = VALUES(updated_at)
          `,
          [cId, tenantId, metadata?.brandId || null, canonical, periodMonth, amount, now, now]
        );
      } catch {
        // Safe fallback
      }
    }

    // If brandId is provided, also record brand-scoped usage in usage_counters
    if (metadata?.brandId) {
      try {
        const metricMap: Record<string, string> = {
          posts: 'posts',
          ai_credits: 'ai_credits',
          video_minutes: 'video_minutes',
          storage: 'storage',
        };
        const mName = metricMap[canonical] || canonical;
        const cId = crypto.randomUUID();
        const now = new Date();
        await db.raw(
          `
          INSERT INTO usage_counters (id, tenant_id, brand_id, metric, period, current_usage, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            current_usage = current_usage + VALUES(current_usage),
            updated_at = VALUES(updated_at)
          `,
          [cId, tenantId, metadata.brandId, mName, periodMonth, amount, now, now]
        );
      } catch {
        // Safe fallback
      }
    }


    // Fetch updated total
    const updatedCounters = await db('tenant_usage_counters')
      .where({ tenant_id: tenantId, period_month: periodMonth })
      .first();

    let currentTotal = amount;
    if (canonical === 'posts') {
      currentTotal = Number(updatedCounters?.posts_published || updatedCounters?.posts_created || amount);
    } else if (canonical === 'ai_credits') {
      currentTotal = Number(updatedCounters?.ai_tokens_consumed || amount);
    } else if (canonical === 'video_minutes') {
      currentTotal = Number(updatedCounters?.video_render_seconds || amount);
    }

    return { alreadyRecorded: false, currentTotal };
  }

  /**
   * Retrieves full 12-dimension entitlement snapshot for a workspace.
   */
  public async getSnapshot(tenantId: string): Promise<Record<string, PlanGuardCheckResult>> {
    const resources: QuotaResource[] = [
      'brands',
      'seats',
      'social_accounts',
      'active_automations',
      'ai_credits',
      'video_minutes',
      'storage',
      'posts',
      'ai_content',
      'ai_images',
      'ai_videos',
      'active_campaigns',
      'scheduled_posts',
      'analytics_retention',
      'premium_connectors',
      'autonomy_level',
      'agency_workspaces',
      'client_approvals',
      'whatsapp',
      'scim_provisioning',
      'api_access',
      'custom_branding',
      'multi_brand_brain',
    ];

    const results: Record<string, PlanGuardCheckResult> = {};
    for (const r of resources) {
      results[r] = await this.check(tenantId, r);
    }
    return results;
  }

  private canonicalizeResource(resource: QuotaResource): string {
    switch (resource as string) {
      case 'max_brands':
      case 'brands':
        return 'brands';
      case 'max_users':
      case 'seats':
      case 'users':
        return 'seats';
      case 'max_social_accounts':
      case 'social_accounts':
        return 'social_accounts';
      case 'active_automations':
        return 'active_automations';
      case 'ai_tokens_monthly':
      case 'ai_credits':
      case 'ai_tokens':
        return 'ai_credits';
      case 'video_render_seconds_monthly':
      case 'video_minutes':
      case 'video_seconds':
        return 'video_minutes';
      case 'storage_bytes_limit':
      case 'storage':
        return 'storage';
      case 'max_posts_per_month':
      case 'posts':
        return 'posts';
      case 'max_ai_content':
      case 'ai_content':
        return 'ai_content';
      case 'max_ai_images':
      case 'ai_images':
        return 'ai_images';
      case 'max_ai_videos':
      case 'ai_videos':
        return 'ai_videos';
      case 'max_active_campaigns':
      case 'active_campaigns':
      case 'campaigns':
        return 'active_campaigns';
      case 'max_scheduled_posts':
      case 'scheduled_posts':
        return 'scheduled_posts';
      case 'analytics_retention':
        return 'analytics_retention';
      case 'premium_connectors':
        return 'premium_connectors';
      case 'autonomy_level':
        return 'autonomy_level';
      case 'agency_workspaces':
        return 'agency_workspaces';
      case 'client_approvals':
        return 'client_approvals';
      case 'whatsapp':
        return 'whatsapp';
      case 'scim_provisioning':
        return 'scim_provisioning';
      case 'api_access':
        return 'api_access';
      case 'custom_branding':
        return 'custom_branding';
      case 'multi_brand_brain':
        return 'multi_brand_brain';
      default:
        return String(resource);
    }
  }
}

export const planGuardService = new PlanGuardService();
export const PlanGuard = planGuardService;
