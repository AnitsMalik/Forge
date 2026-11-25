/**
 * Enterprise Zero-Trust Ephemeral Access Grants, Just-In-Time (JIT) Privilege Elevation & Dual-Authorization Control Plane Types
 * SocialForge Platform v6.1.0
 */

export type JitAccessStatus = 'pending_approval' | 'approved' | 'active' | 'revoked' | 'expired' | 'rejected';
export type JitElevationTier = 'standard_ops' | 'elevated_admin' | 'break_glass_root';
export type DualAuthRuleStatus = 'active' | 'disabled';
export type JitLeaseStatus = 'active' | 'revoked' | 'expired';

export interface JitAccessRequest {
  id: string;
  requester_id: string;
  requester_email: string;
  target_role: string;
  elevation_tier: JitElevationTier;
  justification: string;
  requested_duration_minutes: number;
  status: JitAccessStatus;
  approver_id: string | null;
  approver_email: string | null;
  approved_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface EphemeralCredentialLease {
  id: string;
  request_id: string;
  operator_email: string;
  elevation_tier: JitElevationTier;
  token_signature: string;
  issued_at: string;
  expires_at: string;
  status: JitLeaseStatus;
  revocable: boolean;
}

export interface DualAuthorizationRule {
  id: string;
  action_name: string;
  description: string;
  target_resource_type: string;
  required_approvers: number;
  is_active: boolean;
  created_at: string;
}

export interface JitAuditSession {
  id: string;
  lease_id: string;
  operator_email: string;
  action_performed: string;
  resource_affected: string;
  ip_address: string;
  timestamp: string;
  signature: string;
}

export interface JitTelemetry {
  active_leases: number;
  pending_requests: number;
  total_elevations_24h: number;
  break_glass_events_24h: number;
  compliance_posture: 'strict_zero_trust' | 'degraded';
}

export interface CreateJitAccessRequestInput {
  target_role: string;
  elevation_tier: JitElevationTier;
  justification: string;
  requested_duration_minutes: number;
}

export interface ApproveJitAccessRequestInput {
  approved: boolean;
  decision_notes?: string;
}

export interface ApproveJitAccessRequestResult {
  success: boolean;
  request_id: string;
  status: JitAccessStatus;
  approver_email: string;
  lease?: EphemeralCredentialLease;
  message: string;
}

export interface RevokeJitLeaseResult {
  success: boolean;
  lease_id: string;
  revoked_at: string;
  message: string;
}

export interface SimulateBreakGlassInput {
  justification: string;
  duration_minutes?: number;
}

export interface SimulateBreakGlassResult {
  success: boolean;
  emergency_incident_id: string;
  lease_id: string;
  operator_email: string;
  elevation_tier: JitElevationTier;
  expires_at: string;
  alert_dispatched: boolean;
  forensic_signature: string;
}
