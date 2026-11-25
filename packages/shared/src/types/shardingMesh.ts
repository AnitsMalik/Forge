/**
 * Enterprise Cross-Region Active-Active Sharding, Distributed Transaction Coordinator & Autonomous Data Rebalancing Mesh Types
 * SocialForge Platform v6.8.0
 */

export type ShardStatus = 'online' | 'rebalancing' | 'draining' | 'offline';
export type DistributedTxStatus = 'preparing' | 'prepared' | 'committing' | 'committed' | 'aborting' | 'aborted';
export type RebalanceMigrationStatus = 'in_progress' | 'completed' | 'failed';

export interface DatabaseShard {
  id: string;
  shard_name: string;
  region: string;
  host_endpoint: string;
  status: ShardStatus;
  allocated_vnodes: number;
  total_keys_count: number;
  storage_size_bytes: number;
  created_at: string;
}

export interface ShardRoutingRange {
  id: string;
  shard_id: string;
  hash_range_start: number;
  hash_range_end: number;
  vnode_id: string;
  is_active: boolean;
  created_at: string;
}

export interface DistributedTransactionParticipant {
  shard_id: string;
  shard_name: string;
  region: string;
  vote: 'prepared' | 'aborted';
  latency_ms: number;
}

export interface DistributedTransaction {
  id: string;
  coordinator_node_id: string;
  target_tenant_id: string;
  status: DistributedTxStatus;
  participating_shards: DistributedTransactionParticipant[];
  payload: Record<string, any>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ShardRebalanceMigration {
  id: string;
  source_shard_id: string;
  target_shard_id: string;
  vnode_id: string;
  keys_migrated: number;
  total_keys: number;
  progress_percent: number;
  status: RebalanceMigrationStatus;
  started_at: string;
  completed_at: string | null;
}

export interface ShardingMeshTelemetry {
  total_shards: number;
  online_shards: number;
  total_vnodes: number;
  active_distributed_transactions: number;
  avg_2pc_latency_ms: number;
  cross_region_replication_lag_ms: number;
}

export interface KeyRouteResult {
  key: string;
  hash_code: number;
  vnode_id: string;
  shard_id: string;
  shard_name: string;
  region: string;
  host_endpoint: string;
}

export interface RegisterShardInput {
  shard_name: string;
  region: string;
  host_endpoint: string;
  vnodes_count?: number;
}

export interface CoordinateTransactionInput {
  target_tenant_id: string;
  payload: Record<string, any>;
  simulate_participant_failure?: boolean;
}

export interface TriggerRebalanceInput {
  source_shard_id: string;
  target_shard_id: string;
  vnode_id: string;
  total_keys?: number;
}
