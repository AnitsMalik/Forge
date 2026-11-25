export type AutomationLifecycleState =
  | 'DETECTED'
  | 'INGESTING'
  | 'VALIDATING'
  | 'UNDERSTANDING'
  | 'GENERATING'
  | 'DESIGNING'
  | 'POLICY_CHECK'
  | 'APPROVAL_REQUIRED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'VERIFICATION'
  | 'ANALYTICS_PENDING'
  | 'LEARNING';

export type AutomationFailureState =
  | 'VALIDATION_FAILED'
  | 'AI_FAILED'
  | 'DESIGN_FAILED'
  | 'AUTH_EXPIRED'
  | 'PERMISSION_MISSING'
  | 'RATE_LIMITED'
  | 'PUBLISH_FAILED'
  | 'APPROVAL_EXPIRED';

export type AutomationOperationalState =
  | 'PAUSED'
  | 'CANCELLED';

export type AutomationRunState =
  | AutomationLifecycleState
  | AutomationFailureState
  | AutomationOperationalState
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'awaiting_approval'
  | 'retrying';

export const AUTOMATION_LIFECYCLE_ORDER: AutomationLifecycleState[] = [
  'DETECTED',
  'INGESTING',
  'VALIDATING',
  'UNDERSTANDING',
  'GENERATING',
  'DESIGNING',
  'POLICY_CHECK',
  'APPROVAL_REQUIRED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHING',
  'PUBLISHED',
  'VERIFICATION',
  'ANALYTICS_PENDING',
  'LEARNING',
];

export type SupportedTriggerType =
  | 'drive.file_changed'
  | 'drive.file_created'
  | 'sheets.row_added'
  | 'sheets.row_updated'
  | 'excel.import_completed'
  | 'csv.import_completed'
  | 'commerce.product_created'
  | 'commerce.product_updated'
  | 'crm.event'
  | 'crm.offer_created'
  | 'schedule.cron'
  | 'schedule.interval'
  | 'campaign.milestone_reached'
  | 'analytics.winner_detected'
  | 'analytics.fatigue_detected'
  | 'manual.run_now'
  | 'connector.webhook'
  | 'connector.event';

export interface DurableRunContext {
  sourceConnectionId?: string;
  sourceRecordId?: string;
  sourceVersion?: string;
  actionType?: string;
  templateId?: string;
  templateVersion?: number;
  postId?: string;
  marketingObjectId?: string;
  remotePostId?: string;
  approvalId?: string;
  preApproved?: boolean;
  resumed?: boolean;
  stepOutputs?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface StepRunLog {
  id: string;
  runId: string;
  automationId: string;
  tenantId: string;
  brandId: string;
  stepIndex: number;
  stepName: string;
  lifecyclePhase: AutomationLifecycleState | AutomationFailureState;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  inputPayload?: any;
  outputPayload?: any;
  errorMessage?: string;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface DlqRecord {
  id: string;
  runId?: string;
  automationId?: string;
  tenantId: string;
  brandId: string;
  failureState: AutomationFailureState;
  errorMessage?: string;
  errorStack?: string;
  retryCount: number;
  idempotencyKey?: string;
  triggerEvent?: any;
  runContext?: any;
  status: 'dead_letter' | 'replayed' | 'discarded';
  replayedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationMetrics {
  totalAutomations: number;
  activeCount: number;
  pausedCount: number;
  errorCount: number;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  awaitingApprovalRuns: number;
  retryingRuns: number;
  successRate: number;
  failureRate: number;
  retryCount: number;
  dlqDepth: number;
  avgDurationMs: number;
  queueLagMs: number;
  recentErrors: Array<{
    runId: string;
    automationId: string;
    automationName: string;
    errorMessage: string;
    occurredAt: Date | string;
  }>;
}
