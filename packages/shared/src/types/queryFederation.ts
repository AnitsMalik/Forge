/**
 * Enterprise Real-Time Query Federation, Distributed Read Replicas & CQRS Materialized Views Engine Types
 * SocialForge Platform v5.9.0
 */

export type FederationSourceType = 'mysql_primary' | 'mysql_replica' | 'clickhouse_olap' | 'redis_cache';
export type FederationSourceStatus = 'online' | 'degraded' | 'offline';
export type ReplicaRole = 'read_only' | 'standby_failover';
export type CqrsTargetEntity = 'posts_analytics_rollup' | 'campaign_roi_summary' | 'tenant_spend_daily';
export type CqrsRefreshMode = 'incremental' | 'full';
export type CqrsViewStatus = 'active' | 'refreshing' | 'stale';
export type CqrsRefreshStatus = 'success' | 'failed';
export type FederationBenchmarkQueryType = 'analytical_aggregate' | 'point_lookup' | 'timeseries_range';
export type FederationRoutingStrategy = 'least_lag' | 'round_robin' | 'direct_olap';

export interface QueryFederationSource {
  id: string;
  source_name: string;
  source_type: FederationSourceType;
  connection_uri: string;
  read_weight: number;
  replication_lag_ms: number;
  max_qps: number;
  status: FederationSourceStatus;
  created_at: string;
  updated_at: string;
}

export interface ReadReplicaCluster {
  id: string;
  cluster_name: string;
  region: string;
  host: string;
  port: number;
  replica_role: ReplicaRole;
  current_lag_ms: number;
  healthy: boolean;
  total_queries_served: number;
  last_heartbeat_at: string;
}

export interface CqrsMaterializedView {
  id: string;
  view_name: string;
  target_entity: CqrsTargetEntity;
  source_tables: string[];
  refresh_mode: CqrsRefreshMode;
  refresh_cron: string;
  last_refreshed_at: string | null;
  row_count: number;
  refresh_duration_ms: number;
  status: CqrsViewStatus;
}

export interface MaterializedViewRefreshLog {
  id: string;
  view_id: string;
  view_name: string;
  refresh_mode: CqrsRefreshMode;
  rows_updated: number;
  duration_ms: number;
  status: CqrsRefreshStatus;
  executed_at: string;
}

export interface QueryFederationTelemetry {
  total_federation_sources: number;
  total_read_replicas: number;
  active_materialized_views: number;
  avg_replication_lag_ms: number;
  read_write_split_ratio: string;
  cqrs_cache_hit_rate: number;
  status: 'optimal' | 'degraded';
}

export interface RefreshMaterializedViewRequest {
  refresh_mode?: CqrsRefreshMode;
}

export interface RefreshMaterializedViewResult {
  success: boolean;
  view_id: string;
  view_name: string;
  rows_updated: number;
  duration_ms: number;
  refresh_mode: CqrsRefreshMode;
  refreshed_at: string;
}

export interface BenchmarkFederatedQueryRequest {
  query_type: FederationBenchmarkQueryType;
  target_table: string;
  routing_strategy?: FederationRoutingStrategy;
}

export interface BenchmarkFederatedQueryResult {
  routed_source_id: string;
  routed_source_name: string;
  source_type: FederationSourceType;
  latency_ms: number;
  execution_plan: string;
  rows_scanned: number;
  cached: boolean;
  timestamp: string;
}

export interface UpdateReplicaWeightRequest {
  read_weight: number;
}

export interface UpdateReplicaWeightResult {
  success: boolean;
  source_id: string;
  source_name: string;
  previous_weight: number;
  new_weight: number;
  updated_at: string;
}

export interface FailoverReplicaRequest {
  replica_id: string;
  reason?: string;
}

export interface FailoverReplicaResult {
  success: boolean;
  promoted_replica_id: string;
  cluster_name: string;
  previous_role: ReplicaRole;
  new_role: string;
  failover_latency_ms: number;
  timestamp: string;
}
