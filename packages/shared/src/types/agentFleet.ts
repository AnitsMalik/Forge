/**
 * Real-Time AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows Types
 * SocialForge Platform v4.7.0
 */

export type AgentFleetRole =
  | 'trend_hunter'
  | 'content_architect'
  | 'visual_director'
  | 'compliance_auditor'
  | 'growth_strategist'
  | 'orchestrator_executive'
  | 'custom_agent';

export type AgentFleetStatus =
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'critiquing'
  | 'blocked'
  | 'completed'
  | 'failed';

export type AgentWorkflowStatus =
  | 'active'
  | 'paused'
  | 'draft'
  | 'archived';

export type ExecutionRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'critique_revision'
  | 'failed'
  | 'aborted';

export type ExecutionStepStatus =
  | 'pending'
  | 'running'
  | 'approved'
  | 'revision_requested'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface AgentFleetDefinition {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  role: AgentFleetRole;
  description: string | null;
  systemPrompt: string;
  modelName: string;
  temperature: number;
  maxTokensPerTurn: number;
  toolPermissions: string[];
  status: AgentFleetStatus;
  concurrencyLimit: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDagNode {
  id: string;
  agentRole: AgentFleetRole;
  stepName: string;
  promptTemplate: string;
  dependencies: string[]; // Node IDs that must complete first
  requiresCritique?: boolean;
  critiqueAgentRole?: AgentFleetRole;
}

export interface WorkflowDagConfig {
  entryNodes: string[];
  nodes: WorkflowDagNode[];
  outputFormat?: 'campaign_bundle' | 'post_matrix' | 'analytics_report' | 'custom_json';
}

export interface AgentFleetWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  triggerType: 'manual' | 'scheduled' | 'webhook' | 'event_driven';
  status: AgentWorkflowStatus;
  dagConfig: WorkflowDagConfig;
  maxBudgetTokens: number;
  timeoutSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  triggerEvent: string;
  status: ExecutionRunStatus;
  totalTokensUsed: number;
  executionCostUsd: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  finalOutput: Record<string, any> | null;
  createdAt: string;
}

export interface AgentExecutionStep {
  id: string;
  executionId: string;
  agentId: string;
  agentRole: AgentFleetRole;
  stepName: string;
  stepIndex: number;
  inputContext: Record<string, any> | null;
  outputContext: Record<string, any> | null;
  critiqueFeedback: Record<string, any> | null;
  status: ExecutionStepStatus;
  tokensUsed: number;
  latencyMs: number;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentFleetTelemetry {
  totalAgents: number;
  activeAgents: number;
  systemAgents: number;
  totalWorkflows: number;
  activeWorkflows: number;
  runningExecutions: number;
  totalExecutions24h: number;
  totalTokens24h: number;
  avgLatencyMs: number;
  fleetSuccessRate: number;
}

export interface CreateAgentDefinitionDto {
  name: string;
  slug?: string;
  role: AgentFleetRole;
  description?: string;
  systemPrompt: string;
  modelName?: string;
  temperature?: number;
  maxTokensPerTurn?: number;
  toolPermissions?: string[];
  concurrencyLimit?: number;
  tenantId?: string | null;
}

export interface UpdateAgentDefinitionDto {
  name?: string;
  description?: string;
  systemPrompt?: string;
  modelName?: string;
  temperature?: number;
  maxTokensPerTurn?: number;
  toolPermissions?: string[];
  status?: AgentFleetStatus;
  concurrencyLimit?: number;
}

export interface CreateWorkflowDto {
  tenantId: string;
  name: string;
  description?: string;
  triggerType?: 'manual' | 'scheduled' | 'webhook' | 'event_driven';
  dagConfig: WorkflowDagConfig;
  maxBudgetTokens?: number;
  timeoutSeconds?: number;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  status?: AgentWorkflowStatus;
  dagConfig?: WorkflowDagConfig;
  maxBudgetTokens?: number;
  timeoutSeconds?: number;
}

export interface DispatchWorkflowRunDto {
  workflowId: string;
  inputParams?: Record<string, any>;
  triggerEvent?: string;
}

export interface CritiqueStepDto {
  approved: boolean;
  critiqueComments: string;
  suggestedRevisions?: Record<string, any>;
}
