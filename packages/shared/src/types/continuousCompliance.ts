/**
 * Enterprise Continuous Compliance, SOC2/HIPAA/GDPR Automated Evidence Locker & Security Posture Mesh Types
 * SocialForge Platform v5.6.0
 */

export type ComplianceFrameworkType =
  | 'soc2_type2'
  | 'hipaa'
  | 'gdpr'
  | 'iso27001'
  | 'fedramp';

export type ControlStatus =
  | 'compliant'
  | 'warning'
  | 'non_compliant'
  | 'collecting';

export type EvidenceCollectorType =
  | 'access_control'
  | 'encryption_at_rest'
  | 'worm_tamper_proof'
  | 'dlp_guardrails'
  | 'incident_response'
  | 'secret_rotation';

export interface ComplianceControl {
  id: string;
  control_code: string;
  framework: ComplianceFrameworkType;
  title: string;
  description: string;
  collector_type: EvidenceCollectorType;
  status: ControlStatus;
  automated_check: boolean;
  last_evaluated_at: string | null;
  evidence_count: number;
  pass_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ComplianceEvidence {
  id: string;
  control_id: string;
  control_code: string;
  collector_type: EvidenceCollectorType;
  evidence_title: string;
  evidence_payload_hash: string; // SHA-256
  evidence_data: Record<string, any>;
  evaluation_status: 'passed' | 'failed' | 'needs_review';
  collected_at: string;
}

export interface AuditorPortalSession {
  id: string;
  auditor_email: string;
  auditor_firm: string;
  access_token: string;
  framework_scope: ComplianceFrameworkType[];
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export interface ContinuousComplianceTelemetry {
  overallComplianceScore: number;
  totalControls: number;
  compliantControlsCount: number;
  warningControlsCount: number;
  nonCompliantControlsCount: number;
  automatedEvidenceItemsCount: number;
  activeAuditorSessionsCount: number;
  frameworkScores: Record<ComplianceFrameworkType, number>;
  recentEvidenceFeed: ComplianceEvidence[];
}

export interface SimulateComplianceAuditRequest {
  target_framework: ComplianceFrameworkType;
  strict_mode?: boolean;
}

export interface SimulateComplianceAuditResult {
  simulated: boolean;
  framework: ComplianceFrameworkType;
  overallScore: number;
  readinessStatus: 'audit_ready' | 'remediation_required' | 'critical_gaps';
  passedControlsCount: number;
  failedControlsCount: number;
  flaggedGaps: string[];
  auditorRecommendations: string[];
  evaluatedAt: string;
}
