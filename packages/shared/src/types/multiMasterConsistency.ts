/**
 * Enterprise Cross-Region Active-Active Multi-Master Conflict Resolution & Global Distributed Consistency Engine Types
 * SocialForge Platform v6.0.0
 */

export type MultiMasterNodeStatus = 'in_sync' | 'converging' | 'isolated' | 'fenced';
export type ConflictResolutionStrategy =
  | 'lww_timestamp'
  | 'crdt_pn_counter'
  | 'crdt_or_set'
  | 'highest_priority_region'
  | 'manual_operator_triage';
export type VectorCausalState = 'ordered' | 'concurrent' | 'superseded';
export type ConvergenceStatus = 'resolved' | 'quarantined' | 'pending_quorum';

export interface MultiMasterNode {
  id: string;
  node_name: string;
  region: string;
  endpoint_url: string;
  sync_status: MultiMasterNodeStatus;
  write_capacity_qps: number;
  vector_clock_version: number;
  quorum_weight: number;
  is_fenced: boolean;
  last_sync_at: string;
  created_at: string;
}

export interface VectorClockState {
  id: string;
  entity_type: string;
  entity_id: string;
  region_clocks: Record<string, number>;
  causal_state: VectorCausalState;
  last_write_timestamp: string;
  last_updated_at: string;
}

export interface ConflictResolutionPolicy {
  id: string;
  policy_name: string;
  entity_type: string;
  resolution_strategy: ConflictResolutionStrategy;
  tie_breaker_region: string;
  auto_resolve: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DistributedConvergenceLog {
  id: string;
  conflict_id: string;
  entity_type: string;
  entity_id: string;
  conflicting_regions: string[];
  winning_region: string;
  strategy_applied: ConflictResolutionStrategy;
  resolution_latency_ms: number;
  convergence_status: ConvergenceStatus;
  details?: Record<string, any>;
  resolved_at: string;
}

export interface MultiMasterTelemetry {
  total_active_nodes: number;
  fenced_nodes: number;
  total_vector_clock_entities: number;
  conflicts_resolved_24h: number;
  avg_convergence_latency_ms: number;
  quorum_health_percent: number;
  mesh_consistency_state: 'strict_quorum' | 'eventual_convergence' | 'split_brain_risk';
}

export interface UpdateQuorumFencingRequest {
  is_fenced: boolean;
  reason?: string;
}

export interface UpdateQuorumFencingResult {
  success: boolean;
  node_id: string;
  node_name: string;
  is_fenced: boolean;
  quorum_weight: number;
  updated_at: string;
}

export interface UpdateResolutionPolicyRequest {
  resolution_strategy?: ConflictResolutionStrategy;
  tie_breaker_region?: string;
  auto_resolve?: boolean;
}

export interface UpdateResolutionPolicyResult {
  success: boolean;
  policy_id: string;
  policy_name: string;
  resolution_strategy: ConflictResolutionStrategy;
  tie_breaker_region: string;
  updated_at: string;
}

export interface SimulateConflictRaceRequest {
  entity_type: string;
  entity_id: string;
  region_a: string;
  payload_a: Record<string, any>;
  timestamp_a: string;
  region_b: string;
  payload_b: Record<string, any>;
  timestamp_b: string;
  strategy_override?: ConflictResolutionStrategy;
}

export interface SimulateConflictRaceResult {
  conflict_id: string;
  entity_type: string;
  entity_id: string;
  detected_causality: VectorCausalState;
  winning_region: string;
  winning_payload: Record<string, any>;
  strategy_applied: ConflictResolutionStrategy;
  convergence_latency_ms: number;
  quorum_nodes_agreed: number;
  resolution_summary: string;
  timestamp: string;
}
