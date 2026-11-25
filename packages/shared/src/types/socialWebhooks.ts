export type SocialWebhookProvider = 'meta' | 'instagram' | 'tiktok' | 'x' | 'stripe' | 'custom';

export type SocialWebhookEventStatus =
  | 'received'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'dead_letter'
  | 'discarded';

export interface SocialWebhookEvent {
  id: string;
  provider: SocialWebhookProvider;
  providerEventId: string | null;
  eventType: string;
  tenantId: string | null;
  tenantName?: string | null;
  brandId: string | null;
  brandName?: string | null;
  connectionId: string | null;
  payload: Record<string, any>;
  headers?: Record<string, string> | null;
  signature: string | null;
  signatureVerified: boolean;
  status: SocialWebhookEventStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  processingTimeMs: number | null;
  idempotencyKey: string;
  replayedBySuperadmin: boolean;
  replayedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialWebhookConfig {
  id: string;
  tenantId: string | null;
  brandId: string | null;
  provider: SocialWebhookProvider;
  endpointUrl: string;
  secretToken?: string | null; // Masked in responses
  verifyToken?: string | null;
  isActive: boolean;
  autoRetryEnabled: boolean;
  maxRetries: number;
  subscribedEvents: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialWebhookReplayLog {
  id: string;
  eventId: string;
  adminUserId: string;
  adminEmail: string;
  supportTicket?: string | null;
  reason: string;
  replayStatus: 'success' | 'failure';
  responsePayload?: Record<string, any> | null;
  executionMs: number;
  createdAt: string;
}

export interface SocialWebhookStats {
  totalEvents24h: number;
  processedCount: number;
  failedCount: number;
  deadLetterCount: number;
  replayedCount: number;
  avgProcessingTimeMs: number;
  providerBreakdown: Record<string, number>;
}

export interface ReplayWebhookRequest {
  reason: string;
  ticketReference?: string;
  confirmation: boolean;
}

export interface ReplayBatchRequest {
  provider?: SocialWebhookProvider | 'all';
  status?: 'failed' | 'dead_letter' | 'all';
  limit?: number;
  reason: string;
  ticketReference?: string;
  confirmation: boolean;
}

export interface SimulateWebhookRequest {
  provider: SocialWebhookProvider;
  eventType: string;
  tenantId?: string;
  brandId?: string;
  payload: Record<string, any>;
  simulateFailure?: boolean;
}
