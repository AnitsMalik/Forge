export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface AutonomyLevelInfo {
  level: AutonomyLevel;
  name: string;
  description: string;
  allowsInternalArtifacts: boolean;
  allowsExternalWithoutApproval: boolean;
  requiresApprovalForExternal: boolean;
  isDefault: boolean;
}

export const AUTONOMY_LEVELS: Record<AutonomyLevel, AutonomyLevelInfo> = {
  L0: {
    level: 'L0',
    name: 'Suggest Only',
    description: 'AI generates read-only strategic recommendations. Cannot create persistent drafts or trigger mutations.',
    allowsInternalArtifacts: false,
    allowsExternalWithoutApproval: false,
    requiresApprovalForExternal: true,
    isDefault: false,
  },
  L1: {
    level: 'L1',
    name: 'Create Internal Artifacts',
    description: 'AI synthesizes draft posts, templates, images, and plans. Cannot execute external network operations.',
    allowsInternalArtifacts: true,
    allowsExternalWithoutApproval: false,
    requiresApprovalForExternal: true,
    isDefault: false,
  },
  L2: {
    level: 'L2',
    name: 'External Action Requires Approval (Default)',
    description: 'AI drafts content and schedules campaigns; every external publication strictly requires human approval.',
    allowsInternalArtifacts: true,
    allowsExternalWithoutApproval: false,
    requiresApprovalForExternal: true,
    isDefault: true,
  },
  L3: {
    level: 'L3',
    name: 'Bounded Automation',
    description: 'Internal pipelines run autonomously; external publishing requires approval unless explicit pre-authorized bounded policy applies.',
    allowsInternalArtifacts: true,
    allowsExternalWithoutApproval: false,
    requiresApprovalForExternal: true,
    isDefault: false,
  },
  L4: {
    level: 'L4',
    name: 'Budget / Usage Controlled Autonomy',
    description: 'Autonomous actions permitted while within strictly defined monthly budget and usage quotas.',
    allowsInternalArtifacts: true,
    allowsExternalWithoutApproval: true,
    requiresApprovalForExternal: false,
    isDefault: false,
  },
  L5: {
    level: 'L5',
    name: 'Autonomous Only Within Explicit Policy',
    description: 'Full autonomy strictly bounded by explicit allowlist policy, zero claims violations, healthy connections, and rate-limits.',
    allowsInternalArtifacts: true,
    allowsExternalWithoutApproval: true,
    requiresApprovalForExternal: false,
    isDefault: false,
  },
};

export interface BrandGovernanceSettings {
  id: string;
  tenantId: string;
  brandId: string;
  autonomyLevel: AutonomyLevel;
  maxAutonomyLevel: AutonomyLevel;
  requireApprovalForAllExternal: boolean;
  emergencyPaused: boolean;
  pausedAt?: string | null;
  pausedBy?: string | null;
  pauseReason?: string | null;
  monthlyBudgetLimit: number;
  currentMonthSpend: number;
  allowedDomains: string[];
  bannedWords: string[];
  mandatoryDisclaimers: string[];
  policyRules?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvaluationRequest {
  tenantId: string;
  brandId: string;
  userId?: string;
  action: string; // e.g. 'external_publish', 'create_draft', 'generate_content', 'bulk_approve'
  channel?: string; // 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'
  content?: {
    text?: string;
    price?: string | number;
    discount?: string | number;
    url?: string;
    hashtags?: string[];
    isSponsored?: boolean;
  };
  estimatedCost?: number;
}

export interface PolicyViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  autonomyLevel: AutonomyLevel;
  approvalRequired: boolean;
  violations: PolicyViolation[];
  checksPassed: string[];
  systemPaused: boolean;
  details: Record<string, any>;
}

export interface ApprovalRequestItem {
  id: string;
  tenantId: string;
  brandId: string;
  brandName?: string;
  entityType: 'post' | 'campaign' | 'template' | 'automation';
  entityId: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested' | 'expired';
  requestedBy: string;
  initiatorName?: string;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  expiresAt: string;
  magicToken: string;
  magicTokenExpiresAt: string;
  editHistory?: any[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Hydrated entity summary for rich Approval UI
  postSummary?: {
    caption?: string;
    platforms?: string[];
    scheduledFor?: string;
    mediaUrls?: string[];
    source?: string;
    templateName?: string;
    templateVersion?: string;
    cta?: string;
    link?: string;
    claimsValidation?: {
      status: 'passed' | 'warning' | 'violation';
      details: string;
    };
    policyResult?: {
      status: 'passed' | 'violation';
      autonomyLevel: AutonomyLevel;
      summary: string;
      checksPassed: string[];
    };
    automationName?: string;
  };
}

export interface GovernanceAuditLog {
  id: string;
  tenantId: string;
  brandId?: string | null;
  userId?: string | null;
  eventType:
    | 'autonomy_change'
    | 'policy_decision'
    | 'approval_request'
    | 'approval_decision'
    | 'approval_event'
    | 'human_override'
    | 'external_action'
    | 'tool_call'
    | 'ai_run';
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  status: 'allowed' | 'rejected' | 'approved' | 'expired' | 'paused' | 'resumed' | 'executed' | 'flagged';
  actorRole?: string | null;
  policyResults?: any;
  toolCall?: any;
  details?: any;
  reason?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface UpdateGovernanceSettingsRequest {
  autonomyLevel?: AutonomyLevel;
  requireApprovalForAllExternal?: boolean;
  monthlyBudgetLimit?: number;
  allowedDomains?: string[];
  bannedWords?: string[];
  mandatoryDisclaimers?: string[];
  policyRules?: Record<string, any>;
}

export interface HumanOverrideRequest {
  scope: 'global' | 'tenant' | 'brand';
  action: 'pause' | 'resume';
  brandId?: string;
  reason: string;
}
