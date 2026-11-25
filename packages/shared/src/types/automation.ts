export type AutomationTriggerType =
  | 'schedule'
  | 'webhook'
  | 'datasource_change'
  | 'social_event'
  | 'analytics_winner_detected'
  | 'manual';

export type AutomationStatus = 'active' | 'paused' | 'draft' | 'error';

export type AutomationRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_approval';

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'matches';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export type AutomationActionType =
  | 'generate_content'
  | 'create_post'
  | 'render_media'
  | 'approval_gate'
  | 'publish'
  | 'notify'
  | 'fetch_datasource'
  | 'normalize_product'
  | 'ai_product_understanding'
  | 'render_template'
  | 'policy_claim_check'
  | 'publish_meta'
  | 'schedule_post'
  | 'collect_analytics'
  | 'generate_ai_recommendation';

export interface AutomationStepConfig {
  id: string;
  type: AutomationActionType | 'condition';
  name?: string;
  config: Record<string, any>;
  nextStepId?: string;
}

export interface AutomationTriggerConfig {
  type: AutomationTriggerType;
  name?: string;
  sourceType?: string;
  cronExpression?: string;
  intervalMinutes?: number;
  sourceConnectionId?: string;
  resourceId?: string;
  webhookToken?: string;
  filterRules?: Record<string, any>;
  eventPattern?: string;
}

export interface Automation {
  id: string;
  tenantId: string;
  brandId: string;
  name: string;
  description?: string | null;
  status: AutomationStatus;
  triggerType: AutomationTriggerType;
  triggerConfig: AutomationTriggerConfig;
  conditions?: AutomationCondition[] | null;
  actions: AutomationStepConfig[];
  recipeId?: string | null;
  executionCount: number;
  lastRunAt?: Date | string | null;
  createdBy?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StepExecutionResult {
  step: number;
  stepId?: string;
  type: string;
  status: 'success' | 'failed' | 'skipped' | 'approval_requested';
  durationMs: number;
  output?: any;
  error?: string | null;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  tenantId: string;
  brandId: string;
  triggerEvent: any;
  status: AutomationRunStatus;
  stepResults: StepExecutionResult[];
  errorMessage?: string | null;
  durationMs?: number | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AutomationRecipe {
  id: string;
  title: string;
  description: string;
  category: 'social' | 'ecommerce' | 'productivity' | 'curation';
  icon: string;
  requiredConnectors: string[];
  defaultTrigger: AutomationTriggerConfig;
  defaultConditions?: AutomationCondition[];
  defaultActions: AutomationStepConfig[];
}

export interface AutomationHealthSummary {
  totalAutomations: number;
  activeCount: number;
  pausedCount: number;
  errorCount: number;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number; // percentage (0 - 100)
  avgDurationMs: number;
  recentErrors: Array<{
    runId: string;
    automationId: string;
    automationName: string;
    errorMessage: string;
    occurredAt: Date | string;
  }>;
}
