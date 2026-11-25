export type SiemDestinationType =
  | 'splunk_hec'
  | 'datadog_logs'
  | 'syslog_rfc5424'
  | 'elastic_ecs'
  | 'generic_webhook';

export type SiemPayloadFormat =
  | 'json_ecs'
  | 'cef'
  | 'splunk_event'
  | 'rfc5424_syslog'
  | 'datadog_json';

export type SiemStreamStatus = 'active' | 'paused' | 'degraded' | 'failed';

export type SiemEventCategory =
  | 'audit'
  | 'auth'
  | 'compliance'
  | 'security'
  | 'publishing'
  | 'system';

export type SiemSeverity = 'info' | 'notice' | 'warning' | 'error' | 'critical';

export interface SiemDestinationConfig {
  id: string;
  tenantId?: string | null;
  name: string;
  destinationType: SiemDestinationType;
  payloadFormat: SiemPayloadFormat;
  endpointUrl: string;
  apiKeyMasked: string;
  secretPrefix?: string;
  categories: SiemEventCategory[];
  minSeverity: SiemSeverity;
  batchSize: number;
  rateLimitPerMin: number;
  status: SiemStreamStatus;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastErrorMessage?: string | null;
  totalEventsDelivered: number;
  totalEventsFailed: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiemDestinationInput {
  tenantId?: string | null;
  name: string;
  destinationType: SiemDestinationType;
  payloadFormat: SiemPayloadFormat;
  endpointUrl: string;
  authSecret: string;
  categories?: SiemEventCategory[];
  minSeverity?: SiemSeverity;
  batchSize?: number;
  rateLimitPerMin?: number;
}

export interface UpdateSiemDestinationInput {
  name?: string;
  destinationType?: SiemDestinationType;
  payloadFormat?: SiemPayloadFormat;
  endpointUrl?: string;
  authSecret?: string;
  categories?: SiemEventCategory[];
  minSeverity?: SiemSeverity;
  batchSize?: number;
  rateLimitPerMin?: number;
  status?: SiemStreamStatus;
}

export interface SiemDeliveryBatchLog {
  id: string;
  destinationId: string;
  eventsCount: number;
  statusCode: number;
  latencyMs: number;
  status: 'delivered' | 'failed' | 'retrying';
  errorMessage?: string | null;
  digestSha256: string;
  createdAt: string;
}

export interface SiemOverviewMetrics {
  activeStreams: number;
  totalEventsDelivered24h: number;
  avgLatencyMs: number;
  deliverySlaPercent: number;
  failingStreams: number;
}

export interface TestSiemProbeInput {
  category?: SiemEventCategory;
  severity?: SiemSeverity;
  action?: string;
  message?: string;
}

export interface TestSiemProbeResult {
  destinationId: string;
  success: boolean;
  statusCode: number;
  latencyMs: number;
  formattedPayloadSample: string;
  digestSha256: string;
  error?: string;
}
