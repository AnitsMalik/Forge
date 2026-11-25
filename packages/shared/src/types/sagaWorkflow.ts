/**
 * Enterprise Distributed Workflow Engine, State Machine Orchestration & Long-Running Saga Coordinator Types
 * SocialForge Platform v6.7.0
 */

export type SagaWorkflowStatus = 'active' | 'completed' | 'compensating' | 'compensated' | 'failed' | 'paused';
export type SagaStepStatus = 'pending' | 'executing' | 'succeeded' | 'compensating' | 'compensated' | 'failed' | 'skipped';
export type SagaFailureStrategy = 'backward_compensation' | 'retry_with_backoff' | 'human_escalation';
export type CompensationActionStatus = 'pending' | 'executing' | 'compensated' | 'failed';

export interface SagaWorkflowStepConfig {
  step_index: number;
  step_name: string;
  action_service: string;
  action_endpoint: string;
  compensation_endpoint: string;
  timeout_seconds: number;
  retry_attempts: number;
}

export interface SagaWorkflowDefinition {
  id: string;
  workflow_name: string;
  workflow_type: string;
  description: string;
  total_steps_count: number;
  failure_strategy: SagaFailureStrategy;
  steps_configuration: SagaWorkflowStepConfig[];
  is_active: boolean;
  created_at: string;
}

export interface StateMachineInstance {
  id: string;
  workflow_definition_id: string;
  target_tenant_id: string;
  correlation_id: string;
  current_step_index: number;
  status: SagaWorkflowStatus;
  input_payload: Record<string, any>;
  state_payload: Record<string, any>;
  error_details: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface WorkflowStepExecution {
  id: string;
  instance_id: string;
  step_index: number;
  step_name: string;
  status: SagaStepStatus;
  attempt_count: number;
  duration_ms: number;
  input_payload: Record<string, any>;
  output_payload: Record<string, any>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface SagaCompensatingTransaction {
  id: string;
  instance_id: string;
  step_index: number;
  step_name: string;
  compensation_action: string;
  status: CompensationActionStatus;
  reason: string;
  executed_at: string;
}

export interface SagaWorkflowTelemetry {
  total_workflow_definitions: number;
  active_state_machine_instances: number;
  total_succeeded_instances_24h: number;
  total_compensated_sagas_24h: number;
  avg_workflow_duration_ms: number;
  saga_recovery_success_rate: number;
}

export interface CreateWorkflowDefinitionInput {
  workflow_name: string;
  workflow_type: string;
  description: string;
  failure_strategy?: SagaFailureStrategy;
  steps_configuration: SagaWorkflowStepConfig[];
}

export interface TriggerWorkflowInstanceInput {
  workflow_definition_id: string;
  target_tenant_id: string;
  correlation_id?: string;
  input_payload?: Record<string, any>;
}

export interface TriggerCompensationInput {
  instance_id: string;
  reason: string;
}

export interface ResumeWorkflowInstanceInput {
  instance_id: string;
  resume_step_index?: number;
}

export interface StateMachineInstanceDetailResult {
  instance: StateMachineInstance;
  definition: SagaWorkflowDefinition | null;
  step_executions: WorkflowStepExecution[];
  compensations: SagaCompensatingTransaction[];
}
