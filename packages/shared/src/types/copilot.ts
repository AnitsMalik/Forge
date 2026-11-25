export interface CopilotIntent {
  triggerName: string;
  triggerType: string;
  triggerSource: string;
  templateName: string;
  templateId?: string;
  channels: string[];
  schedule: string;
  cronExpression?: string;
  approvalRequired: boolean;
  statusCondition: string;
}

export interface CopilotValidationReport {
  connectorsValid: boolean;
  templateValid: boolean;
  policyValid: boolean;
  quotaValid: boolean;
  permissionsValid: boolean;
  connectedChannels: string[];
  missingConnectors: string[];
  resolvedTemplateId: string;
  quotaRemaining: number;
  estimatedMonthlyRuns: number;
  issues: string[];
  warnings: string[];
}

export interface CopilotToolCallAudit {
  toolName: string;
  timestamp: string;
  input: any;
  result: any;
  durationMs: number;
}

export interface CopilotStructuredPlan {
  name: string;
  description: string;
  trigger: {
    type: string;
    sourceType?: string;
    intervalMinutes?: number;
    cronExpression?: string;
  };
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    id: string;
    type: string;
    name: string;
    config: Record<string, any>;
  }>;
  approvalPolicy: {
    required: boolean;
    method: 'magic_link' | 'in_app';
  };
  scheduleConfig: {
    humanReadable: string;
    cronExpression?: string;
  };
}

export type CopilotPlanStatus = 'draft' | 'validated' | 'tested' | 'activated' | 'cancelled';

export interface CopilotAutomationPlan {
  id: string;
  tenantId: string;
  brandId: string;
  userId: string;
  prompt: string;
  extractedIntent: CopilotIntent;
  structuredPlan: CopilotStructuredPlan;
  validationReport: CopilotValidationReport;
  status: CopilotPlanStatus;
  automationId?: string | null;
  toolCalls: CopilotToolCallAudit[];
  testResults?: any | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateCopilotPlanRequest {
  prompt: string;
  brandId?: string;
}

export interface EditCopilotPlanRequest {
  structuredPlan?: Partial<CopilotStructuredPlan>;
  extractedIntent?: Partial<CopilotIntent>;
}
