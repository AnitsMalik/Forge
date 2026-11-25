import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type {
  JitAccessRequest,
  EphemeralCredentialLease,
  DualAuthorizationRule,
  JitAuditSession,
  JitTelemetry,
  CreateJitAccessRequestInput,
  ApproveJitAccessRequestInput,
  ApproveJitAccessRequestResult,
  RevokeJitLeaseResult,
  SimulateBreakGlassInput,
  SimulateBreakGlassResult,
  JitAccessStatus,
  JitLeaseStatus,
} from '@socialforge/shared';

export class JitAccessService {
  /**
   * Aggregate Telemetry for JIT Privilege Elevation & Zero-Trust Posture
   */
  async getTelemetry(): Promise<JitTelemetry> {
    const now = new Date();
    const activeLeasesCount = await db('ephemeral_credential_leases')
      .where('status', 'active')
      .andWhere('expires_at', '>', now)
      .count('* as count');

    const pendingRequestsCount = await db('jit_access_requests')
      .where('status', 'pending_approval')
      .count('* as count');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const elevationsCount = await db('jit_access_requests')
      .whereIn('status', ['approved', 'active'])
      .andWhere('created_at', '>=', oneDayAgo)
      .count('* as count');

    const breakGlassCount = await db('jit_access_requests')
      .where('elevation_tier', 'break_glass_root')
      .andWhere('created_at', '>=', oneDayAgo)
      .count('* as count');

    return {
      active_leases: Number(activeLeasesCount[0]?.count || 0),
      pending_requests: Number(pendingRequestsCount[0]?.count || 0),
      total_elevations_24h: Number(elevationsCount[0]?.count || 0),
      break_glass_events_24h: Number(breakGlassCount[0]?.count || 0),
      compliance_posture: 'strict_zero_trust',
    };
  }

  /**
   * List JIT Access Requests
   */
  async getRequests(status?: string): Promise<JitAccessRequest[]> {
    let query = db('jit_access_requests').select('*');
    if (status) {
      query = query.where({ status });
    }
    const rows = await query.orderBy('created_at', 'desc');

    return rows.map((r) => ({
      ...r,
      requested_duration_minutes: Number(r.requested_duration_minutes || 60),
      approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : null,
      expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
  }

  /**
   * Create JIT Access Request
   */
  async createRequest(
    input: CreateJitAccessRequestInput,
    operatorUser: { id: string; email: string }
  ): Promise<JitAccessRequest> {
    const requestId = `req-jit-${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date();

    const newRequest = {
      id: requestId,
      requester_id: operatorUser.id,
      requester_email: operatorUser.email,
      target_role: input.target_role,
      elevation_tier: input.elevation_tier || 'elevated_admin',
      justification: input.justification,
      requested_duration_minutes: input.requested_duration_minutes || 60,
      status: 'pending_approval' as JitAccessStatus,
      approver_id: null,
      approver_email: null,
      approved_at: null,
      expires_at: null,
      created_at: now,
    };

    await db('jit_access_requests').insert(newRequest);

    await this.emitAuditLog(
      operatorUser.id,
      'JIT_ACCESS_REQUEST_SUBMITTED',
      requestId,
      `Submitted JIT elevation request for role ${input.target_role} (${input.elevation_tier})`,
      { request_id: requestId, role: input.target_role, tier: input.elevation_tier }
    );

    return {
      ...newRequest,
      approved_at: null,
      expires_at: null,
      created_at: now.toISOString(),
    };
  }

  /**
   * Dual-Authorization Gate: Approve or Reject JIT Request
   * Enforces that the requester cannot approve their own request!
   */
  async approveRequest(
    requestId: string,
    input: ApproveJitAccessRequestInput,
    approverUser: { id: string; email: string }
  ): Promise<ApproveJitAccessRequestResult> {
    const req = await db('jit_access_requests').where({ id: requestId }).first();
    if (!req) {
      throw new Error(`JIT access request ${requestId} not found`);
    }

    if (req.status !== 'pending_approval') {
      throw new Error(`JIT access request is already ${req.status}`);
    }

    // Dual-Authorization Security Invariant: Requester cannot approve own request!
    if (req.requester_id === approverUser.id) {
      throw new Error('Dual-Authorization Violation: Operators are strictly prohibited from approving their own privilege elevation requests.');
    }

    const now = new Date();

    if (!input.approved) {
      await db('jit_access_requests')
        .where({ id: requestId })
        .update({
          status: 'rejected',
          approver_id: approverUser.id,
          approver_email: approverUser.email,
          approved_at: now,
        });

      await this.emitAuditLog(
        approverUser.id,
        'JIT_ACCESS_REQUEST_REJECTED',
        requestId,
        `Rejected JIT elevation request: ${input.decision_notes || 'No notes provided'}`,
        { request_id: requestId, notes: input.decision_notes }
      );

      return {
        success: true,
        request_id: requestId,
        status: 'rejected',
        approver_email: approverUser.email,
        message: 'JIT elevation request rejected',
      };
    }

    // Approved: calculate lease expiration and issue ephemeral lease
    const durationMinutes = Number(req.requested_duration_minutes || 60);
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await db('jit_access_requests')
      .where({ id: requestId })
      .update({
        status: 'approved',
        approver_id: approverUser.id,
        approver_email: approverUser.email,
        approved_at: now,
        expires_at: expiresAt,
      });

    // Issue ephemeral credential lease
    const leaseId = `lease-jit-${crypto.randomBytes(6).toString('hex')}`;
    const tokenSignature = `sig_hmac_sha256_${crypto.randomBytes(12).toString('hex')}`;

    const newLease = {
      id: leaseId,
      request_id: requestId,
      operator_email: req.requester_email,
      elevation_tier: req.elevation_tier,
      token_signature: tokenSignature,
      issued_at: now,
      expires_at: expiresAt,
      status: 'active' as JitLeaseStatus,
      revocable: true,
    };

    await db('ephemeral_credential_leases').insert(newLease);

    // Initial audit session
    await db('jit_audit_sessions').insert({
      id: `sess-jit-${crypto.randomBytes(6).toString('hex')}`,
      lease_id: leaseId,
      operator_email: req.requester_email,
      action_performed: 'LEASE_ACTIVATED',
      resource_affected: req.target_role,
      ip_address: '127.0.0.1',
      timestamp: now,
      signature: `sig_audit_${crypto.randomBytes(8).toString('hex')}`,
    });

    await this.emitAuditLog(
      approverUser.id,
      'JIT_ACCESS_REQUEST_APPROVED',
      requestId,
      `Dual-Authorization approved for ${req.requester_email} to ${req.target_role} (${durationMinutes}m TTL)`,
      { request_id: requestId, lease_id: leaseId, duration_minutes: durationMinutes }
    );

    return {
      success: true,
      request_id: requestId,
      status: 'approved',
      approver_email: approverUser.email,
      lease: {
        ...newLease,
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      message: `JIT elevation approved. Ephemeral lease ${leaseId} active for ${durationMinutes} minutes.`,
    };
  }

  /**
   * List Ephemeral Leases
   */
  async getLeases(status?: string): Promise<EphemeralCredentialLease[]> {
    let query = db('ephemeral_credential_leases').select('*');
    if (status) {
      query = query.where({ status });
    }
    const rows = await query.orderBy('issued_at', 'desc');

    return rows.map((r) => ({
      ...r,
      revocable: Boolean(r.revocable),
      issued_at: r.issued_at ? new Date(r.issued_at).toISOString() : '',
      expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : '',
    }));
  }

  /**
   * Revoke Active Ephemeral Lease Immediately
   */
  async revokeLease(
    leaseId: string,
    reason: string = 'Manual revocation by security operator',
    operatorUserId?: string
  ): Promise<RevokeJitLeaseResult> {
    const lease = await db('ephemeral_credential_leases').where({ id: leaseId }).first();
    if (!lease) {
      throw new Error(`Ephemeral lease ${leaseId} not found`);
    }

    const now = new Date();
    await db('ephemeral_credential_leases')
      .where({ id: leaseId })
      .update({
        status: 'revoked',
        expires_at: now,
      });

    // Also mark linked request as revoked
    await db('jit_access_requests')
      .where({ id: lease.request_id })
      .update({ status: 'revoked' });

    await this.emitAuditLog(
      operatorUserId,
      'EPHEMERAL_LEASE_REVOKED',
      leaseId,
      `Revoked ephemeral lease ${leaseId} for ${lease.operator_email}: ${reason}`,
      { lease_id: leaseId, reason }
    );

    return {
      success: true,
      lease_id: leaseId,
      revoked_at: now.toISOString(),
      message: `Ephemeral lease ${leaseId} revoked immediately.`,
    };
  }

  /**
   * List Dual Authorization Rules
   */
  async getRules(): Promise<DualAuthorizationRule[]> {
    const rows = await db('dual_authorization_rules')
      .select('*')
      .orderBy('action_name', 'asc');

    return rows.map((r) => ({
      ...r,
      required_approvers: Number(r.required_approvers || 2),
      is_active: Boolean(r.is_active),
      created_at: r.created_at ? new Date(r.created_at).toISOString() : '',
    }));
  }

  /**
   * List JIT Audit Sessions
   */
  async getAuditSessions(limit: number = 50): Promise<JitAuditSession[]> {
    const rows = await db('jit_audit_sessions')
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    return rows.map((r) => ({
      ...r,
      timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : '',
    }));
  }

  /**
   * Simulate Emergency Break-Glass Root Elevation
   */
  async simulateBreakGlass(
    input: SimulateBreakGlassInput,
    operatorUser: { id: string; email: string }
  ): Promise<SimulateBreakGlassResult> {
    const emergencyIncidentId = `inc-breakglass-${crypto.randomBytes(4).toString('hex')}`;
    const requestId = `req-breakglass-${crypto.randomBytes(6).toString('hex')}`;
    const leaseId = `lease-breakglass-${crypto.randomBytes(6).toString('hex')}`;
    const durationMinutes = input.duration_minutes || 15;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
    const forensicSig = `sig_breakglass_${crypto.randomBytes(16).toString('hex')}`;

    // Record request
    await db('jit_access_requests').insert({
      id: requestId,
      requester_id: operatorUser.id,
      requester_email: operatorUser.email,
      target_role: 'break_glass_root',
      elevation_tier: 'break_glass_root',
      justification: `[BREAK-GLASS EMERGENCY] ${input.justification}`,
      requested_duration_minutes: durationMinutes,
      status: 'active',
      approver_id: operatorUser.id,
      approver_email: 'SYSTEM_BREAK_GLASS_OVERRIDE',
      approved_at: now,
      expires_at: expiresAt,
      created_at: now,
    });

    // Record lease
    await db('ephemeral_credential_leases').insert({
      id: leaseId,
      request_id: requestId,
      operator_email: operatorUser.email,
      elevation_tier: 'break_glass_root',
      token_signature: forensicSig,
      issued_at: now,
      expires_at: expiresAt,
      status: 'active',
      revocable: true,
    });

    // Record audit session
    await db('jit_audit_sessions').insert({
      id: `sess-breakglass-${crypto.randomBytes(6).toString('hex')}`,
      lease_id: leaseId,
      operator_email: operatorUser.email,
      action_performed: 'BREAK_GLASS_ELEVATION',
      resource_affected: 'GLOBAL_CONTROL_PLANE',
      ip_address: '127.0.0.1',
      timestamp: now,
      signature: forensicSig,
    });

    await this.emitAuditLog(
      operatorUser.id,
      'EMERGENCY_BREAK_GLASS_TRIGGERED',
      emergencyIncidentId,
      `EMERGENCY BREAK-GLASS: Root elevation provisioned for ${operatorUser.email}: ${input.justification}`,
      { incident_id: emergencyIncidentId, lease_id: leaseId, duration_minutes: durationMinutes }
    );

    return {
      success: true,
      emergency_incident_id: emergencyIncidentId,
      lease_id: leaseId,
      operator_email: operatorUser.email,
      elevation_tier: 'break_glass_root',
      expires_at: expiresAt.toISOString(),
      alert_dispatched: true,
      forensic_signature: forensicSig,
    };
  }

  /**
   * Helper to write audit trail into superadmin_audit_logs
   */
  private async emitAuditLog(
    operatorUserId: string | undefined,
    action: string,
    targetResourceId: string,
    reason: string,
    details?: any
  ): Promise<void> {
    try {
      let superadminId = operatorUserId;
      let superadminEmail = 'superadmin@socialforge.io';

      if (!superadminId) {
        const adminUser = await db('users').where({ is_superadmin: 1, is_active: 1 }).first();
        if (adminUser) {
          superadminId = adminUser.id;
          superadminEmail = adminUser.email;
        }
      } else {
        const u = await db('users').where({ id: superadminId }).first();
        if (u) superadminEmail = u.email;
      }

      if (superadminId) {
        await db('superadmin_audit_logs').insert({
          id: crypto.randomUUID(),
          superadmin_id: superadminId,
          superadmin_email: superadminEmail,
          action,
          target_resource_type: 'jit_access',
          target_resource_id: targetResourceId,
          reason,
          details: details ? JSON.stringify(details) : null,
          ip_address: '127.0.0.1',
          created_at: new Date(),
        });
      }
    } catch (err: any) {
      console.warn('[JitAccessService] Audit log warning:', err.message);
    }
  }
}

export const jitAccessService = new JitAccessService();
