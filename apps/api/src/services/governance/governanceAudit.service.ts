import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { GovernanceAuditLog } from '@socialforge/shared';

export class GovernanceAuditService {
  /**
   * Logs a governance event into governance_audit_logs.
   * Strips all credentials, tokens, and secrets from logged payloads.
   */
  public async logEvent(params: {
    tenantId: string;
    brandId?: string | null;
    userId?: string | null;
    eventType: GovernanceAuditLog['eventType'];
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    status: GovernanceAuditLog['status'];
    actorRole?: string | null;
    policyResults?: any;
    toolCall?: any;
    details?: any;
    reason?: string | null;
    ipAddress?: string | null;
  }): Promise<GovernanceAuditLog> {
    const id = crypto.randomUUID();
    const sanitizedPolicyResults = this.sanitizePayload(params.policyResults);
    const sanitizedToolCall = this.sanitizePayload(params.toolCall);
    const sanitizedDetails = this.sanitizePayload(params.details);

    let validUserId: string | null = params.userId || null;
    if (validUserId) {
      const userExists = await db('users').where({ id: validUserId }).first();
      if (!userExists) {
        validUserId = null;
      }
    }

    const record = {
      id,
      tenant_id: params.tenantId,
      brand_id: params.brandId || null,
      user_id: validUserId,
      event_type: params.eventType,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      status: params.status,
      actor_role: params.actorRole || null,
      policy_results: sanitizedPolicyResults ? JSON.stringify(sanitizedPolicyResults) : null,
      tool_call: sanitizedToolCall ? JSON.stringify(sanitizedToolCall) : null,
      details: sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
      reason: params.reason || null,
      ip_address: params.ipAddress || null,
      created_at: new Date(),
    };

    await db('governance_audit_logs').insert(record);

    return {
      id,
      tenantId: params.tenantId,
      brandId: params.brandId || null,
      userId: params.userId || null,
      eventType: params.eventType,
      action: params.action,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      status: params.status,
      actorRole: params.actorRole || null,
      policyResults: sanitizedPolicyResults,
      toolCall: sanitizedToolCall,
      details: sanitizedDetails,
      reason: params.reason || null,
      ipAddress: params.ipAddress || null,
      createdAt: record.created_at.toISOString(),
    };
  }

  /**
   * Retrieves audit logs for a tenant and optional brand.
   */
  public async getAuditLogs(
    tenantId: string,
    filters?: {
      brandId?: string;
      eventType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<GovernanceAuditLog[]> {
    let query = db('governance_audit_logs').where({ tenant_id: tenantId });

    if (filters?.brandId) {
      query = query.andWhere({ brand_id: filters.brandId });
    }
    if (filters?.eventType) {
      query = query.andWhere({ event_type: filters.eventType });
    }
    if (filters?.status) {
      query = query.andWhere({ status: filters.status });
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      userId: r.user_id,
      eventType: r.event_type,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      status: r.status,
      actorRole: r.actor_role,
      policyResults: typeof r.policy_results === 'string' ? JSON.parse(r.policy_results) : r.policy_results,
      toolCall: typeof r.tool_call === 'string' ? JSON.parse(r.tool_call) : r.tool_call,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details,
      reason: r.reason,
      ipAddress: r.ip_address,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  /**
   * Recursively redacts sensitive fields like access tokens, client secrets, passwords.
   */
  private sanitizePayload(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizePayload(item));
    }

    const sanitized: Record<string, any> = {};
    const SENSITIVE_KEYS = [
      'token',
      'access_token',
      'user_access_token',
      'page_access_token',
      'refresh_token',
      'client_secret',
      'secret',
      'password',
      'password_hash',
      'authorization',
      'auth_tag',
      'encrypted_access_token',
    ];

    for (const [key, val] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED_BY_GOVERNANCE_AUDIT]';
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizePayload(val);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }
}

export const governanceAuditService = new GovernanceAuditService();
