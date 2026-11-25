export interface SuperadminTenantSummary {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  brandCount: number;
  userCount: number;
  activePlanId: string;
  planName: string;
  subscriptionStatus: string;
  mrrCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperadminTenantDetail {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  createdAt: string;
  brands: Array<{
    id: string;
    name: string;
    slug: string;
    industry?: string;
    timezone?: string;
  }>;
  members: Array<{
    id: string;
    userId: string;
    email: string;
    fullName?: string;
    role: string;
    joinedAt: string;
  }>;
  subscription: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    price: number;
    currency: string;
    billingInterval: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    provider?: string;
  } | null;
  usage: Record<string, { current: number; limit: number | null; percentage: number }>;
  entitlements: Array<{
    resource: string;
    limitValue: number | null;
    isEnabled: boolean;
    config?: any;
  }>;
  connectionsCount: number;
  automationsCount: number;
  postsPublishedCount: number;
}

export interface SuperadminProviderHealth {
  provider: 'meta' | 'x_twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'google_drive' | 'csv_sheet';
  name: string;
  status: 'healthy' | 'degraded' | 'rate_limited' | 'down';
  uptimePercent: number;
  activeConnectionsCount: number;
  errorsLast24h: number;
  rateLimitHitsLast24h: number;
  averageLatencyMs: number;
  lastIncidentAt?: string | null;
  message?: string;
}

export interface SuperadminConnectionHealth {
  id: string;
  tenantId: string;
  tenantName: string;
  brandId?: string | null;
  brandName?: string | null;
  provider: string;
  status: string;
  healthStatus: 'healthy' | 'warning' | 'expired' | 'error';
  accountName?: string | null;
  providerAccountId?: string | null;
  expiresAt?: string | null;
  lastHealthCheckAt?: string | null;
  lastError?: string | null;
  credentialRefMasked: string; // Sanitized, e.g. [VAULT_REF_AES256:****3a91]
  createdAt: string;
}

export interface SuperadminAutomationHealthItem {
  id: string;
  tenantId: string;
  tenantName: string;
  brandId: string;
  brandName: string;
  name: string;
  status: 'active' | 'paused' | 'error' | 'draft';
  triggerType: string;
  actionType: string;
  runsTotal: number;
  runsFailed: number;
  successRate: number;
  lastRunAt?: string | null;
  lastError?: string | null;
  isDurable: boolean;
}

export interface SuperadminAutomationFailureDetail {
  runId: string;
  automationId: string;
  automationName: string;
  tenantId: string;
  tenantName: string;
  brandId: string;
  brandName: string;
  stepName: string;
  lifecycleState: string;
  retryCount: number;
  maxRetries: number;
  errorMessage: string;
  startedAt: string;
  failedAt: string;
  inputPayloadSanitized: any;
}

export interface SuperadminQueueHealth {
  queueName: string;
  status: 'healthy' | 'backlogged' | 'stalled';
  queuedCount: number;
  processingCount: number;
  scheduledCount: number;
  failedCount: number;
  deadLetterCount: number;
  oldestAgeSeconds: number;
  workerConcurrency: number;
}

export interface SuperadminWorkerFailure {
  id: string;
  jobType: 'publishing' | 'video_render' | 'analytics_sync' | 'webhook_delivery';
  targetPlatform?: string | null;
  tenantId: string;
  tenantName: string;
  brandId?: string | null;
  brandName?: string | null;
  attemptCount: number;
  maxAttempts: number;
  lastError: string;
  scheduledAt?: string | null;
  nextRetryAt?: string | null;
  createdAt: string;
}

export interface SuperadminRateLimitIncident {
  id: string;
  provider: string;
  statusCode: number;
  errorCode?: string | null;
  errorMessage: string;
  affectedTenantId?: string | null;
  affectedTenantName?: string | null;
  affectedAccountId?: string | null;
  retryAfterSeconds?: number | null;
  resetCountdownSeconds?: number | null;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface SuperadminDlqItem {
  id: string;
  sourceType: 'publishing_job' | 'webhook_delivery' | 'automation_run';
  targetPlatformOrEvent: string;
  tenantId?: string | null;
  tenantName?: string | null;
  brandName?: string | null;
  failureReason: string;
  attemptCount: number;
  maxAttempts: number;
  eligibleForRetry: boolean;
  payloadSummary: any;
  deadLetteredAt: string;
}

export interface SuperadminAuditLogItem {
  id: string;
  superadminId: string;
  superadminEmail: string;
  action: string;
  targetTenantId?: string | null;
  targetTenantName?: string | null;
  targetResourceType?: string | null;
  targetResourceId?: string | null;
  reason?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export interface SuperadminImpersonationSession {
  sessionId: string;
  superadminEmail: string;
  targetTenantId: string;
  targetTenantName: string;
  reason: string;
  ticketReference: string;
  durationMinutes: number;
  sessionToken: string;
  expiresAt: string;
  createdAt: string;
}
