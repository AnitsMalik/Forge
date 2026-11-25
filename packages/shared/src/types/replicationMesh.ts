export type ReplicationNodeRole =
  | 'leader_primary'
  | 'hot_standby'
  | 'read_replica'
  | 'witness_arbiter';

export type ReplicationNodeStatus =
  | 'healthy'
  | 'degraded'
  | 'failing'
  | 'offline'
  | 'recovering';

export type FailoverTriggerSource =
  | 'automated_health_monitor'
  | 'manual_superadmin_override'
  | 'split_brain_detector';

export type FailoverOutcome =
  | 'promoted'
  | 'aborted'
  | 'split_brain_detected'
  | 'quorum_failed';

export type QuorumHealthStatus =
  | 'quorate'
  | 'degraded_quorum'
  | 'lost_quorum';

export interface ReplicationNode {
  id: string;
  region_code: string;
  node_name: string;
  role: ReplicationNodeRole;
  status: ReplicationNodeStatus;
  replication_lag_ms: number;
  applied_gtid_set: string;
  retrieved_gtid_set: string;
  ip_address: string;
  port: number;
  is_write_eligible: boolean;
  heartbeat_interval_sec: number;
  last_heartbeat_at: string | Date;
  metadata?: Record<string, any>;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ReplicationHeartbeatEvent {
  id: string;
  node_id: string;
  region_code: string;
  lag_ms: number;
  commit_throughput_tps: number;
  cpu_utilization_percent: number;
  network_rtt_ms: number;
  status: ReplicationNodeStatus;
  created_at: string | Date;
}

export interface FailoverQuorumEvent {
  id: string;
  incident_id: string;
  triggered_by: FailoverTriggerSource;
  previous_leader_id: string | null;
  promoted_leader_id: string;
  quorum_votes_for: number;
  quorum_votes_against: number;
  quorum_nodes_total: number;
  outcome: FailoverOutcome;
  split_brain_mitigated: boolean;
  fencing_token: number;
  details?: Record<string, any>;
  created_at: string | Date;
}

export interface MeshTopologyTelemetry {
  totalNodes: number;
  healthyNodes: number;
  leaderNode: ReplicationNode | null;
  averageLagMs: number;
  maxLagMs: number;
  quorumStatus: QuorumHealthStatus;
  activeRegionCount: number;
  recentFailovers: FailoverQuorumEvent[];
  crossRegionRTTMs: Record<string, number>;
}

export interface CreateReplicationNodeInput {
  region_code: string;
  node_name: string;
  role: ReplicationNodeRole;
  ip_address: string;
  port?: number;
  is_write_eligible?: boolean;
  heartbeat_interval_sec?: number;
  applied_gtid_set?: string;
  retrieved_gtid_set?: string;
  metadata?: Record<string, any>;
}

export interface UpdateReplicationNodeInput {
  status?: ReplicationNodeStatus;
  role?: ReplicationNodeRole;
  replication_lag_ms?: number;
  is_write_eligible?: boolean;
  applied_gtid_set?: string;
  retrieved_gtid_set?: string;
  metadata?: Record<string, any>;
}

export interface FailoverExecutionRequest {
  promoted_node_id: string;
  force?: boolean;
  reason: string;
}

export interface FailoverSimulationResult {
  eligible: boolean;
  currentLeader: ReplicationNode | null;
  candidateNode: ReplicationNode | null;
  replicationLagMs: number;
  estimatedDataLossSeconds: number;
  quorumVotesEstimated: {
    for: number;
    against: number;
    total: number;
    quorate: boolean;
  };
  fencingTokenAllocated: number;
  verdict: 'SAFE_FOR_FAILOVER' | 'ELEVATED_RISK_LAG' | 'QUORUM_UNAVAILABLE' | 'SPLIT_BRAIN_RISK';
  warnings: string[];
}
