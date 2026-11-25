export type ChaosSubsystem =
  | 'api_gateway'
  | 'database_mesh'
  | 'redis_cache'
  | 'social_webhook'
  | 'ai_orchestrator'
  | 'external_provider';

export type ChaosFaultType =
  | 'latency_spike'
  | 'packet_loss'
  | 'service_unavailable_503'
  | 'database_partition'
  | 'cache_eviction'
  | 'token_exhaustion'
  | 'auth_rejection_401';

export type ChaosExperimentStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'halted_by_tripwire'
  | 'completed'
  | 'cancelled';

export interface ChaosTripwireThresholds {
  max_error_rate_percent: number;
  max_p99_latency_ms: number;
  auto_rollback: boolean;
}

export interface ChaosExperiment {
  id: string;
  name: string;
  target_subsystem: ChaosSubsystem;
  fault_type: ChaosFaultType;
  blast_radius_percent: number;
  target_tenant_id: string | null;
  fault_config: Record<string, any>;
  duration_seconds: number;
  status: ChaosExperimentStatus;
  tripwire_thresholds: ChaosTripwireThresholds;
  resilience_score: number | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ChaosFaultExecution {
  id: string;
  experiment_id: string;
  subsystem: ChaosSubsystem;
  fault_type: ChaosFaultType;
  affected_requests_count: number;
  injected_latency_ms_avg: number;
  tripped_threshold: string | null;
  emergency_aborted: boolean;
  recovery_time_seconds: number;
  execution_logs: Array<{ timestamp: string; level: string; message: string }>;
  created_at: string | Date;
}

export interface ChaosTripwireEvent {
  id: string;
  experiment_id: string;
  metric_name: string;
  observed_value: number;
  threshold_value: number;
  action_taken: 'emergency_aborted' | 'alert_dispatched' | 'traffic_rerouted';
  created_at: string | Date;
}

export interface ChaosResilienceTelemetry {
  totalExperiments: number;
  activeExperiments: number;
  averageResilienceScore: number;
  tripwiresTriggeredCount: number;
  subsystemHealthScores: Record<string, number>;
  recentExecutions: ChaosFaultExecution[];
}

export interface CreateChaosExperimentDto {
  name: string;
  target_subsystem: ChaosSubsystem;
  fault_type: ChaosFaultType;
  blast_radius_percent: number;
  target_tenant_id?: string | null;
  fault_config?: Record<string, any>;
  duration_seconds: number;
  tripwire_thresholds?: Partial<ChaosTripwireThresholds>;
}

export interface UpdateChaosExperimentDto {
  name?: string;
  blast_radius_percent?: number;
  duration_seconds?: number;
  fault_config?: Record<string, any>;
  tripwire_thresholds?: Partial<ChaosTripwireThresholds>;
  status?: ChaosExperimentStatus;
}

export interface RunChaosSimulationDto {
  target_subsystem: ChaosSubsystem;
  fault_type: ChaosFaultType;
  blast_radius_percent: number;
  simulated_traffic_load_rps: number;
}

export interface ChaosSimulationResult {
  simulated: boolean;
  subsystem: ChaosSubsystem;
  fault_type: ChaosFaultType;
  simulatedRequestsCount: number;
  simulatedFailedCount: number;
  simulatedErrorRatePercent: number;
  projectedP99LatencyMs: number;
  tripwireTriggered: boolean;
  tripwireReason: string | null;
  projectedResilienceScore: number;
  recommendations: string[];
}
