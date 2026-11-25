import { db } from '../../db/connection.js';
import crypto from 'crypto';
import { PlanGuard } from './planGuard.service.js';
import type {
  SuperadminBillingMetrics,
  SuperadminPlanDistribution,
  SuperadminRevenueHistoryPoint,
  SuperadminTenantSubscriptionRow,
  BillingAuditLog,
  SuperadminPlanDetail,
  EnterpriseCustomEntitlement,
  EntitlementAuditLogEntry,
  CustomerSubscriptionDetail,
  QuotaResource,
} from '@socialforge/shared';

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export class SuperadminBillingService {
  /**
   * Calculate high-level financial metrics and distributions across all tenants
   */
  public static async getMetrics(): Promise<SuperadminBillingMetrics> {
    // 1. Total tenants count
    const totalTenantsResult = await db('tenants').count('* as count').first();
    const totalTenants = Number(totalTenantsResult?.count || 0);

    // 2. Fetch all subscription plans for reference
    const plans = await db('subscription_plans').select('*');
    const planMap = new Map(plans.map((p) => [p.id, p]));

    // 3. Fetch all tenant subscriptions with plan data
    const subscriptions = await db('tenant_subscriptions')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .select(
        'tenant_subscriptions.id',
        'tenant_subscriptions.tenant_id',
        'tenant_subscriptions.plan_id',
        'tenant_subscriptions.status',
        'tenant_subscriptions.cancel_at_period_end',
        'tenant_subscriptions.updated_at',
        'subscription_plans.name as plan_name',
        'subscription_plans.price as plan_price',
        'subscription_plans.currency as plan_currency',
        'subscription_plans.billing_interval as plan_interval'
      );

    // 4. Calculate active subscriptions and MRR
    let mrrCents = 0;
    let activeSubscriptions = 0;
    const planCounts: Record<string, { count: number; mrrCents: number; planName: string }> = {};
    const statusCounts: Record<string, number> = {
      active: 0,
      trialing: 0,
      past_due: 0,
      paused: 0,
      cancelled: 0,
      expired: 0,
    };

    // Initialize all plans in distribution
    for (const plan of plans) {
      planCounts[plan.id] = { count: 0, mrrCents: 0, planName: plan.name };
    }

    for (const sub of subscriptions) {
      const status = sub.status || 'active';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const isSubActive = status === 'active' || status === 'past_due' || status === 'trialing';
      if (isSubActive) {
        const planPrice = Number(sub.plan_price || 0);
        let monthlyCents = 0;

        if (planPrice > 0) {
          activeSubscriptions++;
          if (sub.plan_interval === 'year') {
            monthlyCents = Math.round((planPrice / 12) * 100);
          } else {
            monthlyCents = Math.round(planPrice * 100);
          }
          mrrCents += monthlyCents;
        }

        const planId = sub.plan_id;
        if (!planCounts[planId]) {
          planCounts[planId] = {
            count: 0,
            mrrCents: 0,
            planName: sub.plan_name || planId,
          };
        }
        planCounts[planId].count++;
        planCounts[planId].mrrCents += monthlyCents;
      }
    }

    const arrCents = mrrCents * 12;

    // 5. Calculate Churn Rate (Cancellations in last 30 days vs total pool)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const churnRows = await db('tenant_subscriptions')
      .whereIn('status', ['cancelled', 'expired'])
      .andWhere('updated_at', '>=', thirtyDaysAgo)
      .count('* as count')
      .first();

    const churnCount = Number(churnRows?.count || 0);
    const totalPool = activeSubscriptions + churnCount;
    const churnRate = totalPool > 0 ? Number(((churnCount / totalPool) * 100).toFixed(1)) : 0.0;

    // 6. Paid conversion rate
    const paidConversionRate =
      totalTenants > 0 ? Number(((activeSubscriptions / totalTenants) * 100).toFixed(1)) : 0.0;

    // 7. ARPU (Average Revenue Per User)
    const arpuCents = activeSubscriptions > 0 ? Math.round(mrrCents / activeSubscriptions) : 0;

    // 8. LTV (Lifetime Value = ARPU / Churn Rate)
    let ltvCents = 0;
    if (churnRate > 0) {
      ltvCents = Math.round(arpuCents / (churnRate / 100));
    } else {
      // Default estimate based on 24 months retention
      ltvCents = arpuCents * 24;
    }

    // 9. Plan distribution
    const totalActivePlanSubs = Object.values(planCounts).reduce((acc, p) => acc + p.count, 0);
    const planDistribution: SuperadminPlanDistribution[] = Object.entries(planCounts)
      .map(([planId, data]) => ({
        planId,
        planName: data.planName,
        count: data.count,
        percentage:
          totalActivePlanSubs > 0 ? Number(((data.count / totalActivePlanSubs) * 100).toFixed(1)) : 0.0,
        mrrCents: data.mrrCents,
        mrrFormatted: formatCurrency(data.mrrCents),
      }))
      .sort((a, b) => b.mrrCents - a.mrrCents);

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    return {
      mrrCents,
      mrrFormatted: formatCurrency(mrrCents),
      arrCents,
      arrFormatted: formatCurrency(arrCents),
      activeSubscriptions,
      totalTenants,
      paidConversionRate,
      churnRate,
      arpuCents,
      arpuFormatted: formatCurrency(arpuCents),
      ltvCents,
      ltvFormatted: formatCurrency(ltvCents),
      planDistribution,
      statusDistribution,
    };
  }

  /**
   * Get 6-12 month revenue trend based on realized invoice collections
   */
  public static async getRevenueHistory(months: number = 6): Promise<SuperadminRevenueHistoryPoint[]> {
    // Generate array of past N months: YYYY-MM
    const monthKeys: string[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthKeys.push(key);
    }

    const rows = await db('billing_invoices')
      .where('status', 'paid')
      .andWhere(
        'paid_at',
        '>=',
        new Date(now.getFullYear(), now.getMonth() - months, 1)
      )
      .select(
        db.raw("DATE_FORMAT(paid_at, '%Y-%m') as month_key"),
        db.raw('SUM(amount_paid_cents) as total_cents'),
        db.raw('COUNT(id) as invoice_count')
      )
      .groupBy('month_key');

    const revenueByMonth = new Map<string, { totalCents: number; count: number }>();
    for (const r of rows) {
      revenueByMonth.set(r.month_key, {
        totalCents: Number(r.total_cents || 0),
        count: Number(r.invoice_count || 0),
      });
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthKeys.map((key) => {
      const [year, monthNum] = key.split('-').map(Number);
      const label = `${monthNames[monthNum - 1]} ${year}`;
      const data = revenueByMonth.get(key) || { totalCents: 0, count: 0 };

      return {
        month: key,
        monthLabel: label,
        revenueCents: data.totalCents,
        revenueFormatted: formatCurrency(data.totalCents),
        invoiceCount: data.count,
        paidCount: data.count,
      };
    });
  }

  /**
   * Paginated listing of all tenant subscriptions across the entire platform
   */
  public static async listTenantSubscriptions(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    planId?: string;
  }): Promise<{
    items: SuperadminTenantSubscriptionRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const offset = (page - 1) * limit;

    let query = db('tenants')
      .leftJoin('tenant_subscriptions', 'tenants.id', 'tenant_subscriptions.tenant_id')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id');

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => {
        q.where('tenants.name', 'like', term)
          .orWhere('tenants.slug', 'like', term);
      });
    }

    if (options.status) {
      query = query.where('tenant_subscriptions.status', options.status);
    }

    if (options.planId) {
      query = query.where('tenant_subscriptions.plan_id', options.planId);
    }

    // Total count
    const totalRow = await query.clone().count('tenants.id as total').first();
    const total = Number(totalRow?.total || 0);

    // Fetch items with owner info
    const rows = await query
      .select(
        'tenants.id as tenant_id',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug',
        'tenants.created_at as tenant_created_at',
        'tenant_subscriptions.id as subscription_id',
        'tenant_subscriptions.plan_id',
        'tenant_subscriptions.status as subscription_status',
        'tenant_subscriptions.provider',
        'tenant_subscriptions.current_period_start',
        'tenant_subscriptions.current_period_end',
        'tenant_subscriptions.cancel_at_period_end',
        'subscription_plans.name as plan_name',
        'subscription_plans.price as plan_price',
        'subscription_plans.currency as plan_currency',
        'subscription_plans.billing_interval as plan_interval'
      )
      .orderBy('tenants.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Fetch owners for these tenants
    const tenantIds = rows.map((r) => r.tenant_id);
    const owners = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .whereIn('tenant_users.tenant_id', tenantIds)
      .whereIn('tenant_users.role', ['owner', 'agency_owner', 'admin', 'agency_admin'])
      .select('tenant_users.tenant_id', 'users.email', 'users.full_name');

    const ownerMap = new Map<string, { email: string; fullName: string }>();
    for (const o of owners) {
      if (!ownerMap.has(o.tenant_id)) {
        ownerMap.set(o.tenant_id, { email: o.email, fullName: o.full_name });
      }
    }

    const items: SuperadminTenantSubscriptionRow[] = rows.map((r) => {
      const owner = ownerMap.get(r.tenant_id);
      return {
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantSlug: r.tenant_slug,
        subscriptionId: r.subscription_id || null,
        planId: r.plan_id || 'free_trial',
        planName: r.plan_name || 'Free Trial',
        price: Number(r.plan_price || 0),
        currency: r.plan_currency || 'usd',
        status: r.subscription_status || 'active',
        billingInterval: r.plan_interval || 'month',
        currentPeriodStart: r.current_period_start ? new Date(r.current_period_start).toISOString() : null,
        currentPeriodEnd: r.current_period_end ? new Date(r.current_period_end).toISOString() : null,
        cancelAtPeriodEnd: Boolean(r.cancel_at_period_end),
        provider: r.provider || 'system',
        ownerEmail: owner?.email || null,
        ownerName: owner?.fullName || null,
        createdAt: new Date(r.tenant_created_at).toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fetch global cross-tenant billing audit logs
   */
  public static async listGlobalAuditLogs(limit: number = 50): Promise<Array<BillingAuditLog & { tenantName?: string; tenantSlug?: string }>> {
    const logs = await db('billing_events')
      .leftJoin('tenants', 'billing_events.tenant_id', 'tenants.id')
      .select(
        'billing_events.*',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug'
      )
      .orderBy('billing_events.created_at', 'desc')
      .limit(Math.min(200, limit));

    return logs.map((l) => ({
      id: l.id,
      tenantId: l.tenant_id,
      tenantName: l.tenant_name || undefined,
      tenantSlug: l.tenant_slug || undefined,
      eventType: l.event_type,
      provider: l.provider,
      providerEventId: l.provider_event_id,
      payload: typeof l.payload === 'string' ? JSON.parse(l.payload) : (l.payload || {}),
      createdAt: l.created_at,
    }));
  }

  // =========================================================================
  // 1. Subscription Plan Management
  // =========================================================================

  public static async listPlans(): Promise<SuperadminPlanDetail[]> {
    const plans = await db('subscription_plans').select('*').orderBy('price', 'asc');
    const subscriberCounts = await db('tenant_subscriptions')
      .whereIn('status', ['active', 'past_due', 'trialing'])
      .groupBy('plan_id')
      .select('plan_id', db.raw('COUNT(id) as count'));

    const countMap = new Map(subscriberCounts.map((s: any) => [s.plan_id, Number(s.count || 0)]));

    return plans.map((p) => {
      const count = countMap.get(p.id) || 0;
      const priceNum = Number(p.price || 0);
      const monthlyCents = p.monthly_price_cents || Math.round(priceNum * 100);
      const monthlyRev = count * monthlyCents;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        description: p.description || null,
        price: priceNum,
        monthlyPriceCents: monthlyCents,
        annualPriceCents: p.annual_price_cents ? Number(p.annual_price_cents) : null,
        annualPrice: p.annual_price_cents ? Number(p.annual_price_cents) / 100 : null,
        currency: p.currency || 'usd',
        billingInterval: p.billing_interval || 'month',
        maxBrands: Number(p.max_brands ?? 1),
        maxUsers: Number(p.max_users ?? 2),
        maxSocialAccounts: Number(p.max_social_accounts ?? 3),
        maxPostsPerMonth: Number(p.max_posts_per_month ?? 100),
        maxAiContent: Number(p.max_ai_content ?? 100),
        maxAiImages: Number(p.max_ai_images ?? 25),
        maxAiVideos: Number(p.max_ai_videos ?? 5),
        maxActiveCampaigns: Number(p.max_active_campaigns ?? 5),
        maxScheduledPosts: Number(p.max_scheduled_posts ?? 50),
        storageBytesLimit: Number(p.storage_bytes_limit ?? 5368709120),
        aiTokensMonthly: Number(p.ai_tokens_monthly ?? 100000),
        videoRenderSecondsMonthly: Number(p.video_render_seconds_monthly ?? 300),
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || {}),
        isActive: Boolean(p.is_active ?? true),
        subscriberCount: count,
        monthlyRevenueCents: monthlyRev,
      };
    });
  }

  public static async updatePlan(
    planId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      monthlyPriceCents?: number;
      annualPriceCents?: number;
      billingInterval?: 'month' | 'year';
      maxBrands?: number;
      maxUsers?: number;
      maxSocialAccounts?: number;
      maxPostsPerMonth?: number;
      maxAiContent?: number;
      maxAiImages?: number;
      maxAiVideos?: number;
      maxActiveCampaigns?: number;
      maxScheduledPosts?: number;
      storageBytesLimit?: number;
      aiTokensMonthly?: number;
      videoRenderSecondsMonthly?: number;
      features?: Record<string, any>;
      isActive?: boolean;
    },
    adminUser: { id: string; email: string }
  ): Promise<any> {
    const existing = await db('subscription_plans').where({ id: planId }).first();
    if (!existing) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const updatePayload: Record<string, any> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (data.monthlyPriceCents !== undefined) updatePayload.monthly_price_cents = data.monthlyPriceCents;
    if (data.annualPriceCents !== undefined) updatePayload.annual_price_cents = data.annualPriceCents;
    if (data.billingInterval !== undefined) updatePayload.billing_interval = data.billingInterval;
    if (data.maxBrands !== undefined) updatePayload.max_brands = data.maxBrands;
    if (data.maxUsers !== undefined) updatePayload.max_users = data.maxUsers;
    if (data.maxSocialAccounts !== undefined) updatePayload.max_social_accounts = data.maxSocialAccounts;
    if (data.maxPostsPerMonth !== undefined) updatePayload.max_posts_per_month = data.maxPostsPerMonth;
    if (data.maxAiContent !== undefined) updatePayload.max_ai_content = data.maxAiContent;
    if (data.maxAiImages !== undefined) updatePayload.max_ai_images = data.maxAiImages;
    if (data.maxAiVideos !== undefined) updatePayload.max_ai_videos = data.maxAiVideos;
    if (data.maxActiveCampaigns !== undefined) updatePayload.max_active_campaigns = data.maxActiveCampaigns;
    if (data.maxScheduledPosts !== undefined) updatePayload.max_scheduled_posts = data.maxScheduledPosts;
    if (data.storageBytesLimit !== undefined) updatePayload.storage_bytes_limit = data.storageBytesLimit;
    if (data.aiTokensMonthly !== undefined) updatePayload.ai_tokens_monthly = data.aiTokensMonthly;
    if (data.videoRenderSecondsMonthly !== undefined) updatePayload.video_render_seconds_monthly = data.videoRenderSecondsMonthly;
    if (data.features !== undefined) updatePayload.features = JSON.stringify(data.features);
    if (data.isActive !== undefined) updatePayload.is_active = data.isActive ? 1 : 0;
    updatePayload.updated_at = new Date();

    await db('subscription_plans').where({ id: planId }).update(updatePayload);

    // Audit log
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: null,
      event_type: 'plan_updated_by_superadmin',
      provider: 'superadmin',
      provider_event_id: planId,
      payload: JSON.stringify({
        planId,
        previous: existing,
        updated: updatePayload,
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
      }),
      created_at: new Date(),
    });

    return await db('subscription_plans').where({ id: planId }).first();
  }

  // =========================================================================
  // 2. Customer Subscription & Detail Management
  // =========================================================================

  public static async getCustomerDetails(tenantId: string): Promise<CustomerSubscriptionDetail> {
    const tenant = await db('tenants').where({ id: tenantId }).first();
    if (!tenant) {
      throw new Error(`Customer workspace '${tenantId}' not found.`);
    }

    const owner = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('tenant_users.tenant_id', tenantId)
      .whereIn('tenant_users.role', ['owner', 'admin', 'agency_admin'])
      .select('users.email', 'users.full_name')
      .first();

    const sub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    const plan = sub ? await db('subscription_plans').where({ id: sub.plan_id }).first() : null;

    // Snapshot of effective limits & usage
    const snapshot = await PlanGuard.getSnapshot(tenantId);

    // Explicit overrides
    const overridesRows = await db('entitlements')
      .where({ tenant_id: tenantId })
      .orderBy('resource', 'asc');

    const now = new Date();
    const overrides: EnterpriseCustomEntitlement[] = overridesRows.map((o) => {
      const isExpired = o.expires_at ? now >= new Date(o.expires_at) : false;
      return {
        id: o.id,
        tenantId: o.tenant_id,
        brandId: o.brand_id,
        resource: o.resource,
        isEnabled: Boolean(o.is_enabled),
        limitValue: o.limit_value !== null ? Number(o.limit_value) : null,
        config: typeof o.config === 'string' ? JSON.parse(o.config) : o.config,
        reason: o.reason || null,
        updatedBy: o.updated_by || null,
        expiresAt: o.expires_at ? new Date(o.expires_at).toISOString() : null,
        isExpired,
        effectiveDate: new Date(o.created_at).toISOString(),
        createdAt: new Date(o.created_at).toISOString(),
        updatedAt: new Date(o.updated_at).toISOString(),
      };
    });

    const overrideMap = new Map(overrides.filter((o) => !o.isExpired).map((o) => [o.resource, o]));

    const effectiveLimits: Record<string, { current: number; limit: number; remaining: number; allowed: boolean; isOverride: boolean }> = {};
    for (const [key, res] of Object.entries(snapshot)) {
      effectiveLimits[key] = {
        current: res.current,
        limit: res.limit,
        remaining: res.remaining,
        allowed: res.allowed,
        isOverride: overrideMap.has(key as QuotaResource),
      };
    }

    // Audit logs for this tenant
    const auditLogsRows = await db('entitlement_audit_logs')
      .where({ tenant_id: tenantId })
      .orderBy('created_at', 'desc')
      .limit(50);

    const auditLogs: EntitlementAuditLogEntry[] = auditLogsRows.map((a) => ({
      id: a.id,
      tenantId: a.tenant_id,
      brandId: a.brand_id,
      resource: a.resource,
      action: a.action,
      previousIsEnabled: a.previous_is_enabled !== null ? Boolean(a.previous_is_enabled) : null,
      newIsEnabled: a.new_is_enabled !== null ? Boolean(a.new_is_enabled) : null,
      previousLimitValue: a.previous_limit_value !== null ? Number(a.previous_limit_value) : null,
      newLimitValue: a.new_limit_value !== null ? Number(a.new_limit_value) : null,
      previousConfig: typeof a.previous_config === 'string' ? JSON.parse(a.previous_config) : a.previous_config,
      newConfig: typeof a.new_config === 'string' ? JSON.parse(a.new_config) : a.new_config,
      reason: a.reason,
      effectiveDate: new Date(a.effective_date).toISOString(),
      expiresAt: a.expires_at ? new Date(a.expires_at).toISOString() : null,
      adminUserId: a.admin_user_id,
      adminEmail: a.admin_email,
      createdAt: new Date(a.created_at).toISOString(),
    }));

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        createdAt: new Date(tenant.created_at).toISOString(),
        ownerEmail: owner?.email || null,
        ownerName: owner?.full_name || null,
      },
      subscription: sub
        ? {
            id: sub.id,
            tenantId: sub.tenant_id,
            planId: sub.plan_id,
            status: sub.status,
            currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start) : new Date(),
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end) : new Date(),
            cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at) : undefined,
            trialStartAt: sub.trial_start_at ? new Date(sub.trial_start_at) : undefined,
            trialEndAt: sub.trial_end_at ? new Date(sub.trial_end_at) : undefined,
            provider: sub.provider || 'stripe',
            providerSubscriptionId: sub.provider_subscription_id,
            providerCustomerId: sub.provider_customer_id,
          }
        : null,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            slug: plan.slug || plan.id,
            price: Number(plan.price || 0),
            monthlyPriceCents: plan.monthly_price_cents || Math.round(Number(plan.price) * 100),
            annualPriceCents: plan.annual_price_cents ? Number(plan.annual_price_cents) : null,
            currency: plan.currency || 'usd',
            billingInterval: plan.billing_interval || 'month',
            maxBrands: Number(plan.max_brands ?? 1),
            maxUsers: Number(plan.max_users ?? 2),
            maxSocialAccounts: Number(plan.max_social_accounts ?? 3),
            maxPostsPerMonth: Number(plan.max_posts_per_month ?? 100),
            maxAiContent: Number(plan.max_ai_content ?? 100),
            maxAiImages: Number(plan.max_ai_images ?? 25),
            maxAiVideos: Number(plan.max_ai_videos ?? 5),
            maxActiveCampaigns: Number(plan.max_active_campaigns ?? 5),
            maxScheduledPosts: Number(plan.max_scheduled_posts ?? 50),
            storageBytesLimit: Number(plan.storage_bytes_limit ?? 5368709120),
            aiTokensMonthly: Number(plan.ai_tokens_monthly ?? 100000),
            videoRenderSecondsMonthly: Number(plan.video_render_seconds_monthly ?? 300),
            features: typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || {}),
            isActive: Boolean(plan.is_active ?? true),
          }
        : null,
      effectiveLimits,
      overrides,
      auditLogs,
    };
  }

  public static async assignCustomerPlan(
    tenantId: string,
    params: {
      planId: string;
      reason: string;
      immediate?: boolean;
      customPriceCents?: number;
    },
    adminUser: { id: string; email: string }
  ): Promise<any> {
    const { planId, reason, immediate = true, customPriceCents } = params;
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory administrative reason is required for audit compliance.');
    }

    const targetPlan = await db('subscription_plans').where({ id: planId }).first();
    if (!targetPlan) {
      throw new Error(`Target plan '${planId}' does not exist.`);
    }

    const existingSub = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    const oldPlanId = existingSub?.plan_id || null;

    const agreedPrice = customPriceCents !== undefined
      ? customPriceCents
      : (targetPlan.monthly_price_cents || Math.round(Number(targetPlan.price) * 100));

    const now = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (existingSub) {
      if (immediate) {
        await db('tenant_subscriptions')
          .where({ id: existingSub.id })
          .update({
            plan_id: planId,
            status: 'active',
            agreed_price_cents: agreedPrice,
            past_due_since: null,
            cancel_at_period_end: false,
            updated_at: now,
          });
      } else {
        // Scheduled at renewal
        let meta = typeof existingSub.provider_metadata === 'string'
          ? JSON.parse(existingSub.provider_metadata)
          : (existingSub.provider_metadata || {});
        meta.pendingDowngradePlanId = planId;
        meta.pendingDowngradePlanName = targetPlan.name;
        meta.pendingDowngradeAt = existingSub.current_period_end;

        await db('tenant_subscriptions')
          .where({ id: existingSub.id })
          .update({
            provider_metadata: JSON.stringify(meta),
            updated_at: now,
          });
      }
    } else {
      await db('tenant_subscriptions').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        plan_id: planId,
        status: 'active',
        provider: 'manual_superadmin',
        agreed_price_cents: agreedPrice,
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        created_at: now,
        updated_at: now,
      });
    }

    // Record in entitlement_audit_logs
    await db('entitlement_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: null,
      resource: 'plan_assignment',
      action: 'plan_assigned',
      previous_limit_value: null,
      new_limit_value: agreedPrice,
      previous_config: oldPlanId ? JSON.stringify({ planId: oldPlanId }) : null,
      new_config: JSON.stringify({ planId, immediate, agreedPrice }),
      reason,
      effective_date: now,
      expires_at: null,
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      created_at: now,
    });

    // Record billing event
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'plan_assigned_by_superadmin',
      provider: 'superadmin',
      payload: JSON.stringify({
        oldPlanId,
        newPlanId: planId,
        reason,
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
      }),
      created_at: now,
    });

    return await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
  }

  // =========================================================================
  // 3. Enterprise Custom Entitlements Management
  // =========================================================================

  public static async setCustomerEntitlement(
    tenantId: string,
    params: {
      resource: QuotaResource;
      isEnabled: boolean;
      limitValue: number | null;
      config?: Record<string, any>;
      reason: string;
      expiresAt?: string | null;
      brandId?: string | null;
    },
    adminUser: { id: string; email: string }
  ): Promise<any> {
    const { resource, isEnabled, limitValue, config, reason, expiresAt, brandId } = params;
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory audit justification reason is required for enterprise entitlement override.');
    }

    const now = new Date();
    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    // Check existing
    const existingQuery = db('entitlements')
      .where({ tenant_id: tenantId, resource: String(resource) });
    if (brandId) {
      existingQuery.where({ brand_id: brandId });
    } else {
      existingQuery.whereNull('brand_id');
    }
    const existing = await existingQuery.first();

    const action = existing ? 'override_updated' : 'override_created';

    const mergedConfig = {
      ...(config || {}),
      reason,
      updatedBy: adminUser.email,
      expires_at: expirationDate ? expirationDate.toISOString() : null,
    };

    if (existing) {
      await db('entitlements')
        .where({ id: existing.id })
        .update({
          is_enabled: isEnabled ? 1 : 0,
          limit_value: limitValue !== null ? limitValue : null,
          config: JSON.stringify(mergedConfig),
          expires_at: expirationDate,
          updated_by: adminUser.email,
          reason,
          updated_at: now,
        });
    } else {
      await db('entitlements').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId || null,
        plan_id: null,
        resource: String(resource),
        is_enabled: isEnabled ? 1 : 0,
        limit_value: limitValue !== null ? limitValue : null,
        config: JSON.stringify(mergedConfig),
        expires_at: expirationDate,
        updated_by: adminUser.email,
        reason,
        created_at: now,
        updated_at: now,
      });
    }

    // Insert audit log
    await db('entitlement_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId || null,
      resource: String(resource),
      action,
      previous_is_enabled: existing ? Boolean(existing.is_enabled) : null,
      new_is_enabled: isEnabled,
      previous_limit_value: existing?.limit_value !== null && existing?.limit_value !== undefined ? Number(existing.limit_value) : null,
      new_limit_value: limitValue !== null ? limitValue : null,
      previous_config: existing?.config ? (typeof existing.config === 'string' ? existing.config : JSON.stringify(existing.config)) : null,
      new_config: JSON.stringify(mergedConfig),
      reason,
      effective_date: now,
      expires_at: expirationDate,
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      created_at: now,
    });

    return await db('entitlements')
      .where({ tenant_id: tenantId, resource: String(resource) })
      .first();
  }

  public static async removeCustomerEntitlement(
    tenantId: string,
    resource: string,
    reason: string,
    adminUser: { id: string; email: string },
    brandId?: string | null
  ): Promise<{ success: boolean; message: string }> {
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory audit reason is required to remove custom entitlement override.');
    }

    const query = db('entitlements').where({ tenant_id: tenantId, resource });
    if (brandId) {
      query.where({ brand_id: brandId });
    } else {
      query.whereNull('brand_id');
    }

    const existing = await query.first();
    if (!existing) {
      return { success: true, message: `No active override found for resource '${resource}'.` };
    }

    const now = new Date();

    // Record audit before delete
    await db('entitlement_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId || null,
      resource,
      action: 'override_removed',
      previous_is_enabled: Boolean(existing.is_enabled),
      new_is_enabled: null,
      previous_limit_value: existing.limit_value !== null ? Number(existing.limit_value) : null,
      new_limit_value: null,
      previous_config: existing.config ? (typeof existing.config === 'string' ? existing.config : JSON.stringify(existing.config)) : null,
      new_config: null,
      reason,
      effective_date: now,
      expires_at: null,
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      created_at: now,
    });

    await query.del();

    return { success: true, message: `Custom override for '${resource}' safely removed. Workspace reverted to standard plan defaults.` };
  }

  public static async rollbackEntitlement(
    auditLogId: string,
    reason: string,
    adminUser: { id: string; email: string }
  ): Promise<any> {
    const audit = await db('entitlement_audit_logs').where({ id: auditLogId }).first();
    if (!audit) {
      throw new Error(`Audit log entry '${auditLogId}' not found.`);
    }

    const now = new Date();
    const tenantId = audit.tenant_id;
    const resource = audit.resource;
    const brandId = audit.brand_id;

    const rollbackReason = `[ROLLBACK] Reverted to state before audit #${auditLogId.slice(0, 8)}. Reason: ${reason}`;

    if (audit.previous_is_enabled === null && audit.previous_limit_value === null) {
      // Prior state was non-existent, so delete override
      const q = db('entitlements').where({ tenant_id: tenantId, resource });
      if (brandId) q.where({ brand_id: brandId });
      else q.whereNull('brand_id');
      await q.del();
    } else {
      // Prior state had values, restore them
      const prevConfig = audit.previous_config
        ? (typeof audit.previous_config === 'string' ? JSON.parse(audit.previous_config) : audit.previous_config)
        : null;

      await this.setCustomerEntitlement(
        tenantId,
        {
          resource: resource as QuotaResource,
          isEnabled: audit.previous_is_enabled !== null ? Boolean(audit.previous_is_enabled) : true,
          limitValue: audit.previous_limit_value !== null ? Number(audit.previous_limit_value) : null,
          config: prevConfig,
          reason: rollbackReason,
          brandId,
        },
        adminUser
      );
    }

    // Insert rollback audit
    await db('entitlement_audit_logs').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      brand_id: brandId || null,
      resource,
      action: 'rollback',
      previous_is_enabled: audit.new_is_enabled,
      new_is_enabled: audit.previous_is_enabled,
      previous_limit_value: audit.new_limit_value,
      new_limit_value: audit.previous_limit_value,
      previous_config: audit.new_config,
      new_config: audit.previous_config,
      reason: rollbackReason,
      effective_date: now,
      expires_at: null,
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      created_at: now,
    });

    return { success: true, message: `Successfully rolled back entitlement '${resource}' for tenant ${tenantId}.` };
  }

  // =========================================================================
  // 4. Override Governance & Audit Trail
  // =========================================================================

  public static async listEntitlementAuditLogs(options: {
    tenantId?: string;
    resource?: string;
    action?: string;
    adminEmail?: string;
    limit?: number;
    page?: number;
  }): Promise<{ items: EntitlementAuditLogEntry[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 30)));
    const offset = (page - 1) * limit;

    let query = db('entitlement_audit_logs')
      .leftJoin('tenants', 'entitlement_audit_logs.tenant_id', 'tenants.id')
      .select('entitlement_audit_logs.*', 'tenants.name as tenant_name', 'tenants.slug as tenant_slug');

    if (options.tenantId) {
      query = query.where('entitlement_audit_logs.tenant_id', options.tenantId);
    }
    if (options.resource) {
      query = query.where('entitlement_audit_logs.resource', options.resource);
    }
    if (options.action) {
      query = query.where('entitlement_audit_logs.action', options.action);
    }
    if (options.adminEmail) {
      query = query.where('entitlement_audit_logs.admin_email', 'like', `%${options.adminEmail}%`);
    }

    const totalRow = await query.clone().count('entitlement_audit_logs.id as count').first();
    const total = Number(totalRow?.count || 0);

    const rows = await query
      .orderBy('entitlement_audit_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items: EntitlementAuditLogEntry[] = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name || undefined,
      tenantSlug: r.tenant_slug || undefined,
      brandId: r.brand_id,
      resource: r.resource,
      action: r.action,
      previousIsEnabled: r.previous_is_enabled !== null ? Boolean(r.previous_is_enabled) : null,
      newIsEnabled: r.new_is_enabled !== null ? Boolean(r.new_is_enabled) : null,
      previousLimitValue: r.previous_limit_value !== null ? Number(r.previous_limit_value) : null,
      newLimitValue: r.new_limit_value !== null ? Number(r.new_limit_value) : null,
      previousConfig: typeof r.previous_config === 'string' ? JSON.parse(r.previous_config) : r.previous_config,
      newConfig: typeof r.new_config === 'string' ? JSON.parse(r.new_config) : r.new_config,
      reason: r.reason,
      effectiveDate: new Date(r.effective_date).toISOString(),
      expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      adminUserId: r.admin_user_id,
      adminEmail: r.admin_email,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 5. Platform-wide Invoices & Transactions Roster
   */
  public static async listInvoices(options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    tenantId?: string;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const offset = (page - 1) * limit;

    let query = db('billing_invoices')
      .leftJoin('tenants', 'billing_invoices.tenant_id', 'tenants.id')
      .select(
        'billing_invoices.*',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug'
      );

    if (options.tenantId) {
      query = query.where('billing_invoices.tenant_id', options.tenantId);
    }
    if (options.status) {
      query = query.where('billing_invoices.status', options.status);
    }
    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => {
        q.where('billing_invoices.invoice_number', 'like', term)
          .orWhere('tenants.name', 'like', term)
          .orWhere('billing_invoices.provider_invoice_id', 'like', term);
      });
    }

    const totalRow = await query.clone().count('billing_invoices.id as count').first();
    const total = Number(totalRow?.count || 0);

    const rows = await query
      .orderBy('billing_invoices.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name || 'Unknown Workspace',
      subscriptionId: r.subscription_id,
      invoiceNumber: r.invoice_number,
      amountDueCents: Number(r.amount_due_cents || 0),
      amountPaidCents: Number(r.amount_paid_cents || 0),
      amountDueFormatted: formatCurrency(Number(r.amount_due_cents || 0)),
      amountPaidFormatted: formatCurrency(Number(r.amount_paid_cents || 0)),
      currency: r.currency || 'usd',
      status: r.status,
      provider: r.provider,
      providerInvoiceId: r.provider_invoice_id,
      hostedInvoiceUrl: r.hosted_invoice_url,
      invoicePdfUrl: r.invoice_pdf_url,
      periodStart: r.period_start ? new Date(r.period_start).toISOString() : null,
      periodEnd: r.period_end ? new Date(r.period_end).toISOString() : null,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 6. Platform Usage Telemetry & Quota Monitoring
   */
  public static async getPlatformUsageOverview(options: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const offset = (page - 1) * limit;
    const currentPeriodMonth = new Date().toISOString().slice(0, 7);

    let query = db('tenants')
      .leftJoin('tenant_subscriptions', 'tenants.id', 'tenant_subscriptions.tenant_id')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .leftJoin('tenant_usage_counters', function () {
        this.on('tenants.id', '=', 'tenant_usage_counters.tenant_id')
          .andOn('tenant_usage_counters.period_month', '=', db.raw('?', [currentPeriodMonth]));
      })
      .select(
        'tenants.id as tenant_id',
        'tenants.name as tenant_name',
        'tenants.slug as tenant_slug',
        'tenant_subscriptions.status as subscription_status',
        'subscription_plans.name as plan_name',
        'subscription_plans.max_posts_per_month',
        'subscription_plans.max_ai_content',
        'subscription_plans.max_ai_images',
        'subscription_plans.storage_bytes_limit',
        'tenant_usage_counters.posts_created',
        'tenant_usage_counters.posts_published',
        'tenant_usage_counters.ai_content_generations',
        'tenant_usage_counters.ai_image_generations',
        'tenant_usage_counters.storage_bytes_used as media_storage_bytes'
      );

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => {
        q.where('tenants.name', 'like', term).orWhere('tenants.slug', 'like', term);
      });
    }

    let countQuery = db('tenants');
    if (options.search) {
      const term = `%${options.search}%`;
      countQuery = countQuery.where((q) => {
        q.where('name', 'like', term).orWhere('slug', 'like', term);
      });
    }
    const totalRow = await countQuery.count('id as count').first();
    const total = Number(totalRow?.count || 0);

    const rows = await query
      .orderBy('tenants.name', 'asc')
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      planName: r.plan_name || 'Free',
      subscriptionStatus: r.subscription_status || 'none',
      currentPeriodMonth,
      usage: {
        postsCreated: Number(r.posts_created || 0),
        postsPublished: Number(r.posts_published || 0),
        maxPosts: Number(r.max_posts_per_month || 100),
        postsPercent: Math.min(100, Math.round((Number(r.posts_created || 0) / Math.max(1, Number(r.max_posts_per_month || 100))) * 100)),
        aiContent: Number(r.ai_content_generations || 0),
        maxAiContent: Number(r.max_ai_content || 50),
        aiImages: Number(r.ai_image_generations || 0),
        maxAiImages: Number(r.max_ai_images || 10),
        storageBytes: Number(r.media_storage_bytes || 0),
        maxStorageBytes: Number(r.storage_bytes_limit || 1073741824),
      },
    }));

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 7. Investigate & Resolve Quota Disputes
   */
  public static async resolveQuotaDispute(
    params: {
      tenantId: string;
      resource: string;
      action: 'grant_bonus' | 'reset_counter' | 'custom_limit';
      bonusAmount?: number;
      newLimit?: number;
      reason: string;
    },
    adminUser: { id: string; email: string }
  ): Promise<{ success: boolean; message: string; details: any }> {
    const { tenantId, resource, action, bonusAmount = 0, newLimit, reason } = params;
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory administrative reason is required for dispute resolution audit.');
    }

    const currentPeriodMonth = new Date().toISOString().slice(0, 7);
    let details: any = {};

    if (action === 'grant_bonus' || action === 'custom_limit') {
      // Create entitlement override for custom capacity
      const overrideLimit = action === 'custom_limit' ? (newLimit || 1000) : null;
      const result = await this.setCustomerEntitlement(
        tenantId,
        {
          resource: resource as any,
          isEnabled: true,
          limitValue: overrideLimit,
          reason: `[Dispute Resolution] ${reason}`,
        },
        adminUser
      );
      details = result;
    } else if (action === 'reset_counter') {
      // Decrement or reset usage counter
      const updateData: Record<string, any> = { updated_at: new Date() };
      if (resource === 'posts' || resource === 'posts_created') {
        updateData.posts_created = Math.max(0, Number(bonusAmount || 0));
      } else if (resource === 'ai_content') {
        updateData.ai_content_generations = Math.max(0, Number(bonusAmount || 0));
      }

      await db('tenant_usage_counters')
        .where({ tenant_id: tenantId, period_month: currentPeriodMonth })
        .update(updateData);

      details = { periodMonth: currentPeriodMonth, ...updateData };
    }

    // Record dispute resolution audit
    await db('billing_events').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      event_type: 'quota_dispute_resolved',
      provider: 'superadmin',
      provider_event_id: tenantId,
      payload: JSON.stringify({
        resource,
        action,
        bonusAmount,
        newLimit,
        reason,
        adminUserId: adminUser.id,
        adminEmail: adminUser.email,
        resolvedAt: new Date(),
      }),
      created_at: new Date(),
    });

    return {
      success: true,
      message: `Quota dispute on '${resource}' resolved successfully via ${action}.`,
      details,
    };
  }
}
