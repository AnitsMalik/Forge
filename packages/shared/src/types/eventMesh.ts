/**
 * Enterprise Global Event Mesh, Distributed Dead-Letter Replay & Exactly-Once Webhook Processing Pipeline Types
 * SocialForge Platform v5.7.0
 */

export type EventMeshSchemaValidation = 'strict' | 'relaxed' | 'disabled';
export type EventMeshTopicStatus = 'active' | 'degraded' | 'maintenance';
export type EventMeshCircuitBreakerStatus = 'closed' | 'open' | 'half_open';
export type EventMeshDlqStatus = 'quarantined' | 'replaying' | 'resolved' | 'discarded';
export type EventMeshIdempotencyStatus = 'in_flight' | 'committed' | 'failed';

export interface EventMeshTopic {
  id: string;
  topic_name: string;
  partition_count: number;
  retention_hours: number;
  schema_validation: EventMeshSchemaValidation;
  status: EventMeshTopicStatus;
  total_published: number;
  throughput_per_sec: number;
  created_at: string;
  updated_at: string;
}

export interface EventMeshSubscription {
  id: string;
  topic_id: string;
  topic_name: string;
  subscriber_name: string;
  endpoint_url: string;
  delivery_mode: 'push' | 'pull';
  circuit_breaker_status: EventMeshCircuitBreakerStatus;
  max_retries: number;
  concurrency_limit: number;
  ack_timeout_ms: number;
  delivered_count: number;
  failure_count: number;
  dlq_count: number;
  last_delivery_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventMeshDlqMessage {
  id: string;
  subscription_id: string;
  topic_name: string;
  subscriber_name: string;
  event_id: string;
  idempotency_key: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  failure_reason: string;
  retry_count: number;
  status: EventMeshDlqStatus;
  last_error: string;
  first_failed_at: string;
  last_retried_at: string | null;
  resolved_at: string | null;
}

export interface EventMeshIdempotencyRecord {
  id: string;
  idempotency_key: string;
  topic_name: string;
  event_id: string;
  consumer_id: string;
  status: EventMeshIdempotencyStatus;
  response_digest: string | null;
  expires_at: string;
  created_at: string;
}

export interface EventMeshTelemetry {
  total_topics: number;
  total_subscriptions: number;
  total_published_24h: number;
  total_delivered_24h: number;
  total_dlq_quarantined: number;
  idempotency_hit_rate: number;
  p99_delivery_latency_ms: number;
  circuit_breakers_tripped: number;
  status: 'optimal' | 'degraded' | 'critical';
}

export interface ReplayDlqRequest {
  dlq_ids: string[];
  target_endpoint?: string;
  reset_circuit_breaker?: boolean;
}

export interface ReplayDlqResult {
  replayed_count: number;
  resolved_count: number;
  failed_count: number;
  details: Array<{
    id: string;
    status: 'resolved' | 'quarantined';
    message?: string;
  }>;
}

export interface DiscardDlqRequest {
  dlq_ids: string[];
  reason: string;
}

export interface SimulateEventMeshRequest {
  topic_name: string;
  payload: Record<string, any>;
  idempotency_key?: string;
  fail_target_subscription?: boolean;
}

export interface SimulateEventMeshResult {
  event_id: string;
  idempotency_key: string;
  published: boolean;
  duplicate_detected: boolean;
  deliveries: Array<{
    subscription_name: string;
    status: 'success' | 'dlq_routed';
    latency_ms: number;
    error?: string;
  }>;
}
