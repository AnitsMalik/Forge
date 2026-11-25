export type DlpCategory =
  | 'credentials'
  | 'pii'
  | 'financial_pci'
  | 'health_hipaa'
  | 'custom';

export type DlpSeverity = 'info' | 'warning' | 'critical' | 'fatal';

export type DlpAction =
  | 'redact_inline'
  | 'quarantine_for_approval'
  | 'warn_and_log'
  | 'block_outright';

export type DlpQuarantineStatus =
  | 'pending_review'
  | 'approved_override'
  | 'rejected_dismissed'
  | 'auto_resolved'
  | 'none';

export type DlpTargetScope =
  | 'posts:publish'
  | 'ai:generation'
  | 'webhooks:dispatch'
  | 'exports:csv'
  | 'comments:reply';

export interface DlpPatternRule {
  name: string;
  pattern: string;
  flags?: string;
  description: string;
  exampleMatch?: string;
}

export interface DlpPolicy {
  id: string;
  tenant_id: string | null;
  name: string;
  description: string;
  category: DlpCategory;
  severity: DlpSeverity;
  action: DlpAction;
  match_patterns: DlpPatternRule[];
  target_scopes: DlpTargetScope[];
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DlpViolationItem {
  rule_name: string;
  category: DlpCategory;
  severity: DlpSeverity;
  snippet_masked: string;
  match_index: number;
}

export interface DlpIncident {
  id: string;
  tenant_id: string;
  policy_id: string;
  policy_name?: string;
  target_scope: string;
  entity_type: string;
  entity_id: string | null;
  severity: DlpSeverity;
  action_taken: 'redacted' | 'quarantined' | 'warned' | 'blocked';
  match_count: number;
  violation_details: {
    violations: DlpViolationItem[];
    detected_categories: DlpCategory[];
    original_length: number;
  };
  masked_content: string;
  quarantine_status: DlpQuarantineStatus;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DlpScanResult {
  allowed: boolean;
  action_taken: 'passed' | 'redacted' | 'quarantined' | 'warned' | 'blocked';
  original_content_length: number;
  redacted_content: string;
  incident_id?: string;
  violations: DlpViolationItem[];
  match_count: number;
  highest_severity: DlpSeverity | 'none';
}

export interface DlpOverviewMetrics {
  active_policies_count: number;
  total_policies_count: number;
  scans_24h_count: number;
  redacted_24h_count: number;
  blocked_24h_count: number;
  quarantined_pending_count: number;
  violation_rate_pct: number;
}
