export type AgentRole =
  | 'growth_manager'
  | 'audience_agent'
  | 'strategy_agent'
  | 'content_agent'
  | 'analytics_agent'
  | 'optimization_agent'
  | 'experiment_agent';

export interface AgentPolicy {
  bannedTopics: string[];
  maxDailyPosts: number;
  requireApprovalBeforePublish: boolean;
  minConfidenceScore: number;
}

export interface AgentRun {
  id: string;
  tenantId: string;
  brandId?: string;
  agentRole: AgentRole;
  status: 'planning' | 'executing' | 'completed' | 'failed';
  inputSummary: string;
  actionsProposed?: Array<{
    type: string;
    description: string;
    payload: Record<string, unknown>;
  }>;
  plan?: string[];
  toolCalls?: Array<{
    tool: string;
    result?: any;
    durationMs?: number;
    error?: string;
  }>;
  results?: Record<string, any>;
  tokensConsumed: number;
  durationMs?: number;
  startedAt: Date;
  completedAt?: Date | null;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MemoryType =
  | 'short_term'
  | 'episodic'
  | 'brand_guidelines'
  | 'engagement_pattern'
  | 'preference';

export interface AgentMemoryItem {
  id: string;
  tenantId: string;
  brandId?: string;
  memoryType: MemoryType;
  key: string;
  value: any;
  confidence: number;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSettings {
  id?: string;
  tenantId: string;
  brandId?: string;
  model: string;
  temperature: number;
  autonomousMode: 'semi' | 'full';
  requireApprovalBeforePublish: boolean;
  maxWeeklyAutoPosts: number;
  strictnessLevel: number;
  bannedTopics: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentToolContext {
  tenantId: string;
  brandId?: string;
  userId?: string;
  runId?: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  category: 'analytics' | 'content' | 'brand' | 'audience' | 'publishing' | 'datasource';
  parameters?: Record<string, any>;
  execute: (params: any, context: AgentToolContext) => Promise<any>;
}

export interface AgentGoalRequest {
  prompt: string;
  agentType?: AgentRole;
  brandId?: string;
  autonomousMode?: 'semi' | 'full';
  context?: Record<string, any>;
}

export interface AgentGoalResponse {
  status: 'completed' | 'failed' | 'approval_required';
  runId: string;
  agentType: AgentRole;
  prompt: string;
  plan: string[];
  toolCalls: Array<{ tool: string; result?: any; durationMs?: number; error?: string }>;
  results: Record<string, any>;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}
