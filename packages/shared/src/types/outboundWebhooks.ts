export type OutboundWebhookEventType =
  | 'post.published'
  | 'post.failed'
  | 'approval.requested'
  | 'incident.alert'
  | 'backup.completed'
  | 'billing.invoice_paid'
  | 'custom.event';

export type OutboundWebhookEndpointStatus = 'active' | 'paused' | 'failed_disabled';

export type OutboundWebhookDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

export interface OutboundWebhookEndpoint {
  id: string;
  tenantId?: string | null;
  name: string;
  url: string;
  secretMasked: string;
  events: OutboundWebhookEventType[];
  status: OutboundWebhookEndpointStatus;
  failureCount: number;
  lastDeliveryAt?: string | null;
  lastStatusCode?: number | null;
  metadata?: Record<string, any> | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundWebhookDelivery {
  id: string;
  endpointId: string;
  endpointName?: string;
  endpointUrl?: string;
  tenantId?: string | null;
  eventType: OutboundWebhookEventType;
  payload: Record<string, any>;
  signature: string;
  status: OutboundWebhookDeliveryStatus;
  statusCode?: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: string | null;
  requestDurationMs?: number | null;
  responseBody?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutboundEndpointInput {
  tenantId?: string | null;
  name: string;
  url: string;
  events: OutboundWebhookEventType[];
  metadata?: Record<string, any>;
}

export interface RotateOutboundSecretResult {
  endpointId: string;
  secretMasked: string;
  rawSecret: string; // returned ONLY on creation or explicit rotation for the client to copy
  rotatedAt: string;
}

export interface TestDispatchInput {
  endpointId: string;
  eventType?: OutboundWebhookEventType;
  customPayload?: Record<string, any>;
}

export interface TestDispatchResult {
  deliveryId: string;
  endpointId: string;
  url: string;
  statusCode: number;
  status: OutboundWebhookDeliveryStatus;
  signature: string;
  durationMs: number;
  responseBody?: string | null;
  errorMessage?: string | null;
}

export interface OutboundWebhookOverview {
  totalEndpoints: number;
  activeEndpoints: number;
  pausedEndpoints: number;
  totalDeliveries: number;
  deliveredCount: number;
  failedCount: number;
  retryingCount: number;
  successRatePercent: number;
  endpoints: OutboundWebhookEndpoint[];
  recentDeliveries: OutboundWebhookDelivery[];
}
