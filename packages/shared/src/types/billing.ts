export type SubscriptionPlanId =
  | 'free'
  | 'starter'
  | 'professional'
  | 'business'
  | 'enterprise'
  | 'free_trial'
  | 'trial'
  | 'growth'
  | 'agency'
  | 'scale'
  | 'agency_scale'
  | 'legacy_agency_grandfathered';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'cancelled'
  | 'expired';

export type BillingInterval = 'month' | 'year';

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  monthlyPriceCents: number;
  annualPriceCents?: number | null;
  annualPrice?: number | null;
  currency: string;
  billingInterval: BillingInterval;
  maxBrands: number;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  maxUsers: number;
  maxAiContent?: number;
  maxAiImages?: number;
  maxAiVideos?: number;
  maxActiveCampaigns?: number;
  maxScheduledPosts?: number;
  aiTokensMonthly: number;
  videoRenderSecondsMonthly: number;
  storageBytesLimit: number;
  features?: Record<string, any>;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  provider: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  trialStartAt?: Date | string | null;
  trialEndAt?: Date | string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date | string | null;
  endedAt?: Date | string | null;
  pastDueSince?: Date | string | null;
  nextBillingDate?: Date | string | null;
  billingPeriod?: {
    start: Date | string;
    end: Date | string;
  };
  planName?: string;
  price?: number;
  pendingDowngradePlanId?: string | null;
  pendingDowngradePlanName?: string | null;
  pendingDowngradeAt?: Date | string | null;
  currency?: string;
  billingInterval?: string;
  maxBrands?: number;
  maxSocialAccounts?: number;
  maxPostsPerMonth?: number;
  features?: Record<string, boolean>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface BillingAuditLog {
  id: string;
  tenantId?: string | null;
  eventType: string;
  provider: string;
  providerEventId?: string | null;
  payload?: Record<string, any> | null;
  createdAt: Date | string;
}

export interface TenantUsageCounters {
  tenantId: string;
  periodMonth: string; // YYYY-MM
  postsPublished?: number;
  postsCreated: number;
  videoRenderSeconds: number;
  aiTokensConsumed: number;
  storageBytesUsed: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TenantMetricUsage {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  unit?: string;
  period?: string;
}

export interface TenantUsageResponse {
  period: string;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  postsPublished: TenantMetricUsage;
  aiUsage: TenantMetricUsage;
  videoRendering: TenantMetricUsage;
  storage: TenantMetricUsage;
  users: TenantMetricUsage;
  brands: TenantMetricUsage;
  socialAccounts: TenantMetricUsage;
  automations?: TenantMetricUsage;
  metrics: {
    postsPublished: TenantMetricUsage;
    aiUsage: TenantMetricUsage;
    videoRendering: TenantMetricUsage;
    storage: TenantMetricUsage;
    users: TenantMetricUsage;
    brands: TenantMetricUsage;
    socialAccounts: TenantMetricUsage;
    automations?: TenantMetricUsage;
  };
  plan: {
    id: SubscriptionPlanId;
    name: string;
    slug: string;
  };
}

export interface BillingEvent {
  id: string;
  tenantId?: string | null;
  eventType: string;
  provider: string;
  providerEventId?: string | null;
  payload?: Record<string, any> | null;
  createdAt: Date | string;
}

export interface BillingInvoice {
  id: string;
  tenantId: string;
  subscriptionId?: string | null;
  invoiceNumber: string;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  status: InvoiceStatus;
  provider: string;
  providerInvoiceId?: string | null;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  periodStart?: Date | string | null;
  periodEnd?: Date | string | null;
  paidAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type QuotaResource =
  | 'max_brands'
  | 'brands'
  | 'max_social_accounts'
  | 'social_accounts'
  | 'max_posts_per_month'
  | 'posts'
  | 'max_users'
  | 'seats'
  | 'users'
  | 'ai_tokens_monthly'
  | 'ai_credits'
  | 'ai_tokens'
  | 'max_ai_content'
  | 'ai_content'
  | 'max_ai_images'
  | 'ai_images'
  | 'max_ai_videos'
  | 'ai_videos'
  | 'video_render_seconds_monthly'
  | 'video_minutes'
  | 'video_seconds'
  | 'storage_bytes_limit'
  | 'storage'
  | 'active_automations'
  | 'max_active_campaigns'
  | 'active_campaigns'
  | 'campaigns'
  | 'max_scheduled_posts'
  | 'scheduled_posts'
  | 'analytics_retention'
  | 'premium_connectors'
  | 'autonomy_level'
  | 'agency_workspaces'
  | 'client_approvals'
  | 'whatsapp'
  | 'scim_provisioning'
  | 'api_access'
  | 'custom_branding'
  | 'multi_brand_brain';

export interface PlanUpgradeOption {
  required: boolean;
  recommendedPlan: string;
  recommendedPlanName: string;
  upgradeUrl: string;
  message: string;
}

export interface PlanGuardCheckResult {
  allowed: boolean;
  resource: QuotaResource;
  current: number;
  limit: number;
  remaining: number;
  planId: SubscriptionPlanId;
  planName: string;
  status: SubscriptionStatus;
  reason?: string;
  isGracePeriod?: boolean;
  gracePeriodEndsAt?: Date | string | null;
  upgradeRequired?: boolean;
  billingPeriod?: string;
  featureLabel?: string;
  explanation?: string;
  upgradeOption?: PlanUpgradeOption;
  renewalDate?: Date | string | null;
}

export interface QuotaCheckResult {
  allowed: boolean;
  resource: QuotaResource;
  currentUsage: number;
  limit: number;
  remaining: number;
  planId: SubscriptionPlanId;
  planName: string;
  message?: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  status: SubscriptionStatus;
  planId: SubscriptionPlanId;
  planName: string;
  reason?: string;
  isGracePeriod?: boolean;
  gracePeriodEndsAt?: Date | string | null;
}

export interface SuperadminPlanDistribution {
  planId: string;
  planName: string;
  count: number;
  percentage: number;
  mrrCents: number;
  mrrFormatted: string;
}

export interface SuperadminBillingMetrics {
  mrrCents: number;
  mrrFormatted: string;
  arrCents: number;
  arrFormatted: string;
  activeSubscriptions: number;
  totalTenants: number;
  paidConversionRate: number;
  churnRate: number;
  arpuCents: number;
  arpuFormatted: string;
  ltvCents: number;
  ltvFormatted: string;
  planDistribution: SuperadminPlanDistribution[];
  statusDistribution: Array<{ status: string; count: number }>;
}

export interface SuperadminRevenueHistoryPoint {
  month: string;
  monthLabel: string;
  revenueCents: number;
  revenueFormatted: string;
  invoiceCount: number;
  paidCount: number;
}

export interface SuperadminTenantSubscriptionRow {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  subscriptionId?: string | null;
  planId: string;
  planName: string;
  price: number;
  currency: string;
  status: string;
  billingInterval: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  createdAt: string;
}

export type WebhookDeliveryStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'dead_letter'
  | 'discarded';

export interface BillingWebhookDelivery {
  id: string;
  provider: string;
  providerEventId?: string | null;
  eventType: string;
  tenantId?: string | null;
  tenantName?: string | null;
  payload: Record<string, any> | string;
  signature?: string | null;
  status: WebhookDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date | string | null;
  lastAttemptAt?: Date | string | null;
  lastError?: string | null;
  processingTimeMs?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WebhookDlqStats {
  total: number;
  processed: number;
  pending: number;
  failed: number;
  deadLetter: number;
  totalRetries: number;
  successRate: number;
}

export type BillingEmailTemplateType =
  | 'payment_receipt'
  | 'payment_failed'
  | 'grace_period_warning'
  | 'account_suspended'
  | 'subscription_canceled'
  | 'subscription_changed'
  | 'usage_threshold_alert'
  | 'renewal_reminder'
  | 'payment_refunded'
  | 'chargeback_alert';

export interface BillingEmailLog {
  id: string;
  tenantId: string;
  recipientEmail: string;
  recipientName?: string | null;
  template: BillingEmailTemplateType;
  subject: string;
  htmlBody: string;
  textBody: string;
  status: 'sent' | 'failed' | 'simulated';
  metadata?: Record<string, any> | null;
  errorMessage?: string | null;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}

export type UsageAlertThreshold = 80 | 90 | 100;

export interface TenantUsageAlert {
  id: string;
  tenantId: string;
  periodMonth: string;
  resource: QuotaResource;
  resourceLabel: string;
  thresholdPercent: UsageAlertThreshold;
  currentUsage: number;
  quotaLimit: number;
  percentUsed: number;
  inAppNotificationId?: string | null;
  emailLogId?: string | null;
  createdAt: Date | string;
}

export interface UsageAlertEvaluationResult {
  triggered: boolean;
  threshold?: UsageAlertThreshold;
  resource?: QuotaResource;
  currentUsage?: number;
  quotaLimit?: number;
  percentUsed?: number;
  alreadyAlerted?: boolean;
  inAppNotificationCreated?: boolean;
  emailAlertSent?: boolean;
}

export interface EntitlementRecord {
  id: string;
  tenantId: string;
  brandId?: string | null;
  planId?: SubscriptionPlanId | string | null;
  resource: string;
  isEnabled: boolean;
  limitValue?: number | null;
  config?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UsageCounterRecord {
  id: string;
  tenantId: string;
  brandId?: string | null;
  metric: string;
  period: string;
  currentUsage: number;
  limitValue?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SuperadminPlanDetail extends SubscriptionPlan {
  subscriberCount: number;
  monthlyRevenueCents: number;
}

export interface EnterpriseCustomEntitlement {
  id: string;
  tenantId: string;
  brandId?: string | null;
  resource: QuotaResource;
  isEnabled: boolean;
  limitValue: number | null;
  config?: Record<string, any> | null;
  reason?: string | null;
  updatedBy?: string | null;
  expiresAt?: string | null;
  isExpired?: boolean;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntitlementAuditLogEntry {
  id: string;
  tenantId: string;
  tenantName?: string;
  tenantSlug?: string;
  brandId?: string | null;
  resource: string;
  action: 'override_created' | 'override_updated' | 'override_removed' | 'plan_assigned' | 'override_expired' | 'rollback';
  previousIsEnabled?: boolean | null;
  newIsEnabled?: boolean | null;
  previousLimitValue?: number | null;
  newLimitValue?: number | null;
  previousConfig?: Record<string, any> | null;
  newConfig?: Record<string, any> | null;
  reason: string;
  effectiveDate: string;
  expiresAt?: string | null;
  adminUserId: string;
  adminEmail: string;
  createdAt: string;
}

export interface CustomerSubscriptionDetail {
  tenant: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    ownerEmail?: string | null;
    ownerName?: string | null;
  };
  subscription: TenantSubscription | null;
  plan: SubscriptionPlan | null;
  effectiveLimits: Record<string, { current: number; limit: number; remaining: number; allowed: boolean; isOverride: boolean }>;
  overrides: EnterpriseCustomEntitlement[];
  auditLogs: EntitlementAuditLogEntry[];
}




