import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { hashPassword } from '../auth/passwordService.js';
import { SuperadminOpsService } from './superadminOps.service.js';
import type {
  ScimUserResource,
  ScimGroupResource,
  ScimListResponse,
  ScimPatchRequest,
  ScimApiToken,
  ScimSyncLog,
  ScimOverviewMetrics,
  CreateScimTokenInput,
  CreateScimTokenResponse,
  ScimSyncLogAction,
} from '@socialforge/shared';

export class ScimService {
  /**
   * Validate SCIM Bearer token from HTTP Authorization header
   */
  public static async authenticateBearerToken(rawToken: string, ipAddress?: string): Promise<ScimApiToken> {
    if (!rawToken || !rawToken.trim()) {
      throw new Error('SCIM Bearer token missing');
    }

    const cleanToken = rawToken.replace(/^Bearer\s+/i, '').trim();
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

    const tokenRow = await db('scim_api_tokens')
      .where({ token_hash: tokenHash, status: 'active' })
      .first();

    if (!tokenRow) {
      throw new Error('Invalid or revoked SCIM Bearer token');
    }

    if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
      throw new Error('SCIM Bearer token has expired');
    }

    // Update last_used_at asynchronously
    await db('scim_api_tokens')
      .where({ id: tokenRow.id })
      .update({ last_used_at: db.fn.now() })
      .catch((err) => console.error('Failed to update SCIM token last_used_at:', err));

    // Enforce SCIM 2.0 plan entitlement (Scale and Enterprise tiers only)
    if (tokenRow.tenant_id) {
      const { planGuardService } = await import('../billing/planGuard.service.js');
      const check = await planGuardService.check(tokenRow.tenant_id, 'scim_provisioning');
      if (!check.allowed) {
        const err: any = new Error(
          check.reason || 'SCIM 2.0 directory sync is not permitted on this plan. Scale or Enterprise plan required.'
        );
        err.statusCode = 403;
        throw err;
      }
    }

    return this.mapTokenRow(tokenRow);
  }

  /**
   * Log an incoming SCIM operation into scim_sync_logs
   */
  public static async logSyncEvent(params: {
    tenantId?: string | null;
    tokenId?: string | null;
    method: string;
    endpoint: string;
    scimResourceType?: string | null;
    scimResourceId?: string | null;
    action: ScimSyncLogAction;
    statusCode: number;
    ipAddress?: string | null;
    requestPayload?: any;
    errorDetail?: string | null;
  }): Promise<void> {
    try {
      await db('scim_sync_logs').insert({
        id: `scim-log-${crypto.randomUUID()}`,
        tenant_id: params.tenantId || null,
        token_id: params.tokenId || null,
        method: params.method.toUpperCase(),
        endpoint: params.endpoint,
        scim_resource_type: params.scimResourceType || null,
        scim_resource_id: params.scimResourceId || null,
        action: params.action,
        status_code: params.statusCode,
        ip_address: params.ipAddress || null,
        request_payload: params.requestPayload ? JSON.stringify(params.requestPayload) : null,
        error_detail: params.errorDetail || null,
        created_at: db.fn.now(),
      });
    } catch (err) {
      console.error('Failed to insert SCIM sync log:', err);
    }
  }

  /**
   * SCIM 2.0 Service Provider Configuration (RFC 7643 Section 5)
   */
  public static getServiceProviderConfig(baseUrl: string) {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://docs.socialforge.ai/api/scim/v2',
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 100 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          name: 'OAuth Bearer Token',
          description: 'Authentication scheme using the OAuth Bearer Token Standard (RFC 6750)',
          specUri: 'http://www.rfc-editor.org/info/rfc6750',
          documentationUri: 'https://docs.socialforge.ai/api/scim/v2/auth',
          type: 'oauthbearertoken',
          primary: true,
        },
      ],
      meta: {
        location: `${baseUrl}/ServiceProviderConfig`,
        resourceType: 'ServiceProviderConfig',
        created: '2026-01-01T00:00:00Z',
        lastModified: '2026-10-13T00:00:00Z',
        version: 'W/"1.0"',
      },
    };
  }

  /**
   * SCIM 2.0 Schemas List & Metadata (RFC 7643 Section 7)
   */
  public static getSchemas(baseUrl: string) {
    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 2,
      startIndex: 1,
      itemsPerPage: 2,
      Resources: [
        this.getUserSchema(baseUrl),
        this.getGroupSchema(baseUrl),
      ],
    };
  }

  public static getUserSchema(baseUrl: string) {
    return {
      id: 'urn:ietf:params:scim:schemas:core:2.0:User',
      name: 'User',
      description: 'Core User Schema for Workforce Identity Federation & Provisioning',
      attributes: [
        { name: 'userName', type: 'string', required: true, uniqueness: 'server' },
        { name: 'name', type: 'complex', required: false, subAttributes: [
          { name: 'formatted', type: 'string' },
          { name: 'familyName', type: 'string' },
          { name: 'givenName', type: 'string' },
        ]},
        { name: 'displayName', type: 'string', required: false },
        { name: 'emails', type: 'complex', multiValued: true, required: true },
        { name: 'active', type: 'boolean', required: false },
        { name: 'groups', type: 'complex', multiValued: true, mutability: 'readOnly' },
      ],
      meta: {
        resourceType: 'Schema',
        location: `${baseUrl}/Schemas/urn:ietf:params:scim:schemas:core:2.0:User`,
      },
    };
  }

  public static getGroupSchema(baseUrl: string) {
    return {
      id: 'urn:ietf:params:scim:schemas:core:2.0:Group',
      name: 'Group',
      description: 'Core Group Schema for Enterprise Roles and Access Control',
      attributes: [
        { name: 'displayName', type: 'string', required: true },
        { name: 'members', type: 'complex', multiValued: true, subAttributes: [
          { name: 'value', type: 'string' },
          { name: 'display', type: 'string' },
        ]},
      ],
      meta: {
        resourceType: 'Schema',
        location: `${baseUrl}/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group`,
      },
    };
  }

  /**
   * RFC 7644 GET /Users with filter & pagination
   */
  public static async getUsers(params: {
    filter?: string;
    startIndex?: number;
    count?: number;
    baseUrl: string;
    tokenTenantId?: string | null;
  }): Promise<ScimListResponse<ScimUserResource>> {
    const startIndex = Math.max(1, Number(params.startIndex) || 1);
    const count = Math.min(100, Math.max(1, Number(params.count) || 50));
    const offset = startIndex - 1;

    let query = db('users').select('users.*');

    if (params.tokenTenantId) {
      query = query
        .join('tenant_users', 'users.id', 'tenant_users.user_id')
        .where('tenant_users.tenant_id', params.tokenTenantId);
    }

    if (params.filter) {
      // Parse basic SCIM filter: e.g. userName eq "user@example.com" or emails[type eq "work"].value eq "user@example.com"
      const eqMatch = params.filter.match(/(?:userName|emails(?:\.value|\[type eq "work"\]\.value)?)\s+eq\s+["']([^"']+)["']/i);
      if (eqMatch) {
        const emailFilter = eqMatch[1].trim();
        query = query.where('users.email', emailFilter);
      } else {
        const activeMatch = params.filter.match(/active\s+eq\s+(true|false)/i);
        if (activeMatch) {
          const isActive = activeMatch[1].toLowerCase() === 'true';
          query = query.where('users.is_active', isActive ? 1 : 0);
        }
      }
    }

    // Count total results
    const totalResultsRes = await query.clone().clearSelect().count('* as total').first();
    const totalResults = Number(totalResultsRes?.total || 0);

    const users = await query
      .orderBy('users.created_at', 'desc')
      .offset(offset)
      .limit(count);

    const userResources: ScimUserResource[] = [];
    for (const u of users) {
      userResources.push(await this.formatUserResource(u, params.baseUrl));
    }

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults,
      startIndex,
      itemsPerPage: userResources.length,
      Resources: userResources,
    };
  }

  /**
   * RFC 7644 GET /Users/:id
   */
  public static async getUserById(id: string, baseUrl: string, tokenTenantId?: string | null): Promise<ScimUserResource | null> {
    let query = db('users').where('users.id', id).first();
    if (tokenTenantId) {
      query = db('users')
        .join('tenant_users', 'users.id', 'tenant_users.user_id')
        .where('users.id', id)
        .andWhere('tenant_users.tenant_id', tokenTenantId)
        .select('users.*')
        .first();
    }

    const user = await query;
    if (!user) return null;
    return this.formatUserResource(user, baseUrl);
  }

  /**
   * RFC 7644 POST /Users - Provision Workforce User
   */
  public static async createUser(
    payload: any,
    baseUrl: string,
    tokenTenantId?: string | null
  ): Promise<ScimUserResource> {
    const rawUserName = payload.userName || payload.emails?.[0]?.value;
    if (!rawUserName || typeof rawUserName !== 'string') {
      throw new Error('userName or primary email is required in SCIM user resource');
    }
    const email = rawUserName.toLowerCase().trim();

    // Check if user already exists
    const existing = await db('users').where({ email }).first();
    if (existing) {
      const err: any = new Error(`User with userName "${email}" already exists`);
      err.scimType = 'uniqueness';
      err.statusCode = 409;
      throw err;
    }

    // Resolve display name / full name
    const formattedName = payload.name?.formatted;
    const givenName = payload.name?.givenName || '';
    const familyName = payload.name?.familyName || '';
    const combinedName = `${givenName} ${familyName}`.trim();
    const fullName = formattedName || combinedName || payload.displayName || email.split('@')[0];

    const isActive = payload.active !== false;
    const userId = crypto.randomUUID();
    const randomTempPass = crypto.randomBytes(24).toString('base64');
    const passwordHash = await hashPassword(randomTempPass);

    await db('users').insert({
      id: userId,
      email,
      password_hash: passwordHash,
      full_name: fullName,
      avatar_url: null,
      is_active: isActive ? 1 : 0,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    // Map to tenant
    let targetTenantId = tokenTenantId;
    if (!targetTenantId) {
      // Find enterprise tenant or first tenant
      const defaultTenant = await db('tenants').first();
      targetTenantId = defaultTenant?.id || null;
    }

    if (targetTenantId) {
      await db('tenant_users').insert({
        id: crypto.randomUUID(),
        tenant_id: targetTenantId,
        user_id: userId,
        role: 'editor',
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      }).catch((e) => console.warn('Could not assign tenant_user on SCIM creation:', e));
    }

    const createdUser = await db('users').where({ id: userId }).first();
    return this.formatUserResource(createdUser, baseUrl);
  }

  /**
   * RFC 7644 PUT /Users/:id - Full update
   */
  public static async updateUser(
    id: string,
    payload: any,
    baseUrl: string,
    tokenTenantId?: string | null
  ): Promise<ScimUserResource> {
    const existing = await this.getUserById(id, baseUrl, tokenTenantId);
    if (!existing) {
      const err: any = new Error(`Resource ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    const updates: Record<string, any> = {
      updated_at: db.fn.now(),
    };

    if (payload.userName) {
      updates.email = payload.userName.toLowerCase().trim();
    }
    if (payload.name) {
      const formatted = payload.name.formatted;
      const combined = `${payload.name.givenName || ''} ${payload.name.familyName || ''}`.trim();
      updates.full_name = formatted || combined || updates.email || existing.userName;
    } else if (payload.displayName) {
      updates.full_name = payload.displayName;
    }
    if (typeof payload.active === 'boolean') {
      updates.is_active = payload.active ? 1 : 0;
    }

    await db('users').where({ id }).update(updates);
    const updated = await db('users').where({ id }).first();
    return this.formatUserResource(updated, baseUrl);
  }

  /**
   * RFC 7644 PATCH /Users/:id - Targeted update (e.g. active: false deprovisioning)
   */
  public static async patchUser(
    id: string,
    patchRequest: ScimPatchRequest,
    baseUrl: string,
    tokenTenantId?: string | null
  ): Promise<ScimUserResource> {
    const existing = await this.getUserById(id, baseUrl, tokenTenantId);
    if (!existing) {
      const err: any = new Error(`Resource ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    const updates: Record<string, any> = {
      updated_at: db.fn.now(),
    };

    const ops = patchRequest.Operations || [];
    for (const op of ops) {
      const operationType = (op.op || '').toLowerCase();
      const path = (op.path || '').toLowerCase();
      const val = op.value;

      if (operationType === 'replace' || operationType === 'add') {
        if (path === 'active' || path === 'is_active') {
          updates.is_active = (val === true || val === 'true' || val === 1) ? 1 : 0;
        } else if (path === 'name.formatted' || path === 'displayname') {
          if (typeof val === 'string') updates.full_name = val;
        } else if (path === 'username' || path === 'emails') {
          const emailVal = typeof val === 'string' ? val : (Array.isArray(val) ? val[0]?.value : val?.value);
          if (emailVal) updates.email = String(emailVal).toLowerCase().trim();
        } else if (!path && typeof val === 'object' && val !== null) {
          // Complex object value without path: { active: false, ... }
          if (typeof val.active !== 'undefined') {
            updates.is_active = (val.active === true || val.active === 'true' || val.active === 1) ? 1 : 0;
          }
          if (val.userName) {
            updates.email = String(val.userName).toLowerCase().trim();
          }
          if (val.displayName || val.name?.formatted) {
            updates.full_name = val.displayName || val.name?.formatted;
          }
        }
      } else if (operationType === 'remove') {
        if (path === 'active') {
          updates.is_active = 0;
        }
      }
    }

    await db('users').where({ id }).update(updates);
    const updated = await db('users').where({ id }).first();
    return this.formatUserResource(updated, baseUrl);
  }

  /**
   * RFC 7644 DELETE /Users/:id - User offboarding & deactivation
   */
  public static async deleteUser(id: string, tokenTenantId?: string | null): Promise<void> {
    const user = await db('users').where({ id }).first();
    if (!user) {
      const err: any = new Error(`Resource ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Soft deactivation in accordance with corporate audit compliance:
    // Sets is_active = 0 and terminates active sessions
    await db('users').where({ id }).update({
      is_active: 0,
      updated_at: db.fn.now(),
    });

    if (tokenTenantId) {
      await db('tenant_users')
        .where({ user_id: id, tenant_id: tokenTenantId })
        .delete()
        .catch((e) => console.warn('Could not remove tenant_users on SCIM delete:', e));
    }
  }

  /**
   * RFC 7644 GET /Groups
   */
  public static async getGroups(params: {
    startIndex?: number;
    count?: number;
    baseUrl: string;
    tokenTenantId?: string | null;
  }): Promise<ScimListResponse<ScimGroupResource>> {
    const standardGroups: Array<{ id: string; displayName: string }> = [
      { id: 'grp-superadmins', displayName: 'Superadmins' },
      { id: 'grp-enterprise-editors', displayName: 'Enterprise Editors' },
      { id: 'grp-content-creators', displayName: 'Content Creators' },
    ];

    const groupResources: ScimGroupResource[] = [];
    for (const g of standardGroups) {
      groupResources.push(await this.formatGroupResource(g.id, g.displayName, params.baseUrl, params.tokenTenantId));
    }

    return {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: groupResources.length,
      startIndex: 1,
      itemsPerPage: groupResources.length,
      Resources: groupResources,
    };
  }

  /**
   * RFC 7644 GET /Groups/:id
   */
  public static async getGroupById(id: string, baseUrl: string, tokenTenantId?: string | null): Promise<ScimGroupResource | null> {
    const knownGroups: Record<string, string> = {
      'grp-superadmins': 'Superadmins',
      'grp-enterprise-editors': 'Enterprise Editors',
      'grp-content-creators': 'Content Creators',
    };

    const displayName = knownGroups[id];
    if (!displayName) return null;
    return this.formatGroupResource(id, displayName, baseUrl, tokenTenantId);
  }

  // ============================================================================
  // SUPERADMIN MANAGEMENT & OPERATIONS APIS
  // ============================================================================

  /**
   * Superadmin SCIM Operational Overview
   */
  public static async getOverview(): Promise<ScimOverviewMetrics> {
    const activeTokensRes = await db('scim_api_tokens').where('status', 'active').count('* as count').first();
    const activeTokens = Number(activeTokensRes?.count || 0);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const syncEventsRes = await db('scim_sync_logs').where('created_at', '>=', oneDayAgo).count('* as count').first();
    const totalSyncEvents24h = Number(syncEventsRes?.count || 0);

    const activeUsersRes = await db('users').where('is_active', 1).count('* as count').first();
    const provisionedUsers = Number(activeUsersRes?.count || 0);

    const deactivatedUsersRes = await db('users').where('is_active', 0).count('* as count').first();
    const deactivatedUsers = Number(deactivatedUsersRes?.count || 0);

    const successEventsRes = await db('scim_sync_logs')
      .where('status_code', '<', 400)
      .where('created_at', '>=', oneDayAgo)
      .count('* as count')
      .first();
    const successCount = Number(successEventsRes?.count || 0);

    const successRatePercent = totalSyncEvents24h > 0
      ? Number(((successCount / totalSyncEvents24h) * 100).toFixed(1))
      : 100.0;

    return {
      activeTokens,
      totalSyncEvents24h,
      provisionedUsers,
      deactivatedUsers,
      successRatePercent,
    };
  }

  /**
   * List all SCIM API Bearer Tokens
   */
  public static async listTokens(): Promise<ScimApiToken[]> {
    const rows = await db('scim_api_tokens')
      .select('*')
      .orderBy('created_at', 'desc');

    return rows.map((r: any) => this.mapTokenRow(r));
  }

  /**
   * Generate a new SCIM API Bearer Token
   */
  public static async createToken(
    input: CreateScimTokenInput,
    superadminId: string,
    superadminEmail: string
  ): Promise<CreateScimTokenResponse> {
    if (!input || !input.name || !input.name.trim()) {
      throw new Error('Token name is required');
    }

    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawToken = `scim_live_${rawSecret}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = `scim_live_${rawSecret.slice(0, 6)}...`;

    const id = `scim-tok-${crypto.randomUUID()}`;
    let expiresAt: Date | null = null;
    if (input.expiresInDays && input.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
    }

    await db('scim_api_tokens').insert({
      id,
      tenant_id: input.tenantId || null,
      name: input.name.trim(),
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      last_used_at: null,
      expires_at: expiresAt,
      status: 'active',
      created_by: superadminEmail || 'superadmin',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    await SuperadminOpsService.logAudit({
      superadminId,
      superadminEmail,
      action: 'scim.token.create',
      targetTenantId: input.tenantId || null,
      targetResourceType: 'scim_api_tokens',
      targetResourceId: id,
      details: { name: input.name, tokenPrefix },
    });

    const tokenRow = await db('scim_api_tokens').where({ id }).first();

    return {
      token: this.mapTokenRow(tokenRow),
      rawToken,
    };
  }

  /**
   * Revoke a SCIM API Bearer Token
   */
  public static async revokeToken(
    id: string,
    superadminId: string,
    superadminEmail: string
  ): Promise<ScimApiToken> {
    const token = await db('scim_api_tokens').where({ id }).first();
    if (!token) {
      throw new Error(`SCIM token ${id} not found`);
    }

    await db('scim_api_tokens')
      .where({ id })
      .update({ status: 'revoked', updated_at: db.fn.now() });

    await SuperadminOpsService.logAudit({
      superadminId,
      superadminEmail,
      action: 'scim.token.revoke',
      targetTenantId: token.tenant_id,
      targetResourceType: 'scim_api_tokens',
      targetResourceId: id,
      details: { name: token.name },
    });

    const updated = await db('scim_api_tokens').where({ id }).first();
    return this.mapTokenRow(updated);
  }

  /**
   * Rotate a SCIM API Bearer Token
   */
  public static async rotateToken(
    id: string,
    superadminId: string,
    superadminEmail: string
  ): Promise<CreateScimTokenResponse> {
    const token = await db('scim_api_tokens').where({ id }).first();
    if (!token) {
      throw new Error(`SCIM token ${id} not found`);
    }

    const rawSecret = crypto.randomBytes(24).toString('hex');
    const rawToken = `scim_live_${rawSecret}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenPrefix = `scim_live_${rawSecret.slice(0, 6)}...`;

    await db('scim_api_tokens')
      .where({ id })
      .update({
        token_hash: tokenHash,
        token_prefix: tokenPrefix,
        status: 'active',
        updated_at: db.fn.now(),
      });

    await SuperadminOpsService.logAudit({
      superadminId,
      superadminEmail,
      action: 'scim.token.rotate',
      targetTenantId: token.tenant_id,
      targetResourceType: 'scim_api_tokens',
      targetResourceId: id,
      details: { name: token.name, newTokenPrefix: tokenPrefix },
    });

    const updated = await db('scim_api_tokens').where({ id }).first();

    return {
      token: this.mapTokenRow(updated),
      rawToken,
    };
  }

  /**
   * List recent SCIM directory sync logs
   */
  public static async listLogs(params: {
    limit?: number;
    offset?: number;
    action?: string;
  }): Promise<{ logs: ScimSyncLog[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const offset = Math.max(0, Number(params.offset) || 0);

    let query = db('scim_sync_logs')
      .leftJoin('scim_api_tokens', 'scim_sync_logs.token_id', 'scim_api_tokens.id')
      .select('scim_sync_logs.*', 'scim_api_tokens.name as token_name');

    if (params.action) {
      query = query.where('scim_sync_logs.action', params.action);
    }

    const countRes = await query.clone().clearSelect().count('* as total').first();
    const total = Number(countRes?.total || 0);

    const rows = await query
      .orderBy('scim_sync_logs.created_at', 'desc')
      .offset(offset)
      .limit(limit);

    return {
      logs: rows.map((r: any) => this.mapSyncLogRow(r)),
      total,
    };
  }

  // ============================================================================
  // INTERNAL HELPERS & MAPPERS
  // ============================================================================

  private static async formatUserResource(userRow: any, baseUrl: string): Promise<ScimUserResource> {
    const nameParts = (userRow.full_name || '').split(' ');
    const givenName = nameParts[0] || '';
    const familyName = nameParts.slice(1).join(' ') || '';

    // Check user's tenant memberships/roles
    const tenantMemberships = await db('tenant_users')
      .where({ user_id: userRow.id })
      .select('role', 'tenant_id');

    const groups = tenantMemberships.map((m: any) => ({
      value: `grp-${m.role}`,
      display: `${m.role.charAt(0).toUpperCase() + m.role.slice(1)} Group`,
      $ref: `${baseUrl}/Groups/grp-${m.role}`,
    }));

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: userRow.id,
      userName: userRow.email,
      name: {
        formatted: userRow.full_name,
        givenName,
        familyName,
      },
      displayName: userRow.full_name,
      emails: [
        {
          value: userRow.email,
          primary: true,
          type: 'work',
        },
      ],
      active: Boolean(userRow.is_active),
      groups: groups.length > 0 ? groups : undefined,
      meta: {
        resourceType: 'User',
        created: new Date(userRow.created_at).toISOString(),
        lastModified: new Date(userRow.updated_at || userRow.created_at).toISOString(),
        location: `${baseUrl}/Users/${userRow.id}`,
        version: `W/"${userRow.updated_at || userRow.created_at}"`,
      },
    };
  }

  private static async formatGroupResource(
    groupId: string,
    displayName: string,
    baseUrl: string,
    tokenTenantId?: string | null
  ): Promise<ScimGroupResource> {
    let usersQuery = db('users').select('users.id', 'users.full_name', 'users.email').limit(20);
    if (tokenTenantId) {
      usersQuery = usersQuery
        .join('tenant_users', 'users.id', 'tenant_users.user_id')
        .where('tenant_users.tenant_id', tokenTenantId);
    }
    const sampleUsers = await usersQuery;

    const members = sampleUsers.map((u: any) => ({
      value: u.id,
      display: u.full_name || u.email,
      $ref: `${baseUrl}/Users/${u.id}`,
    }));

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: groupId,
      displayName,
      members,
      meta: {
        resourceType: 'Group',
        created: '2026-01-01T00:00:00Z',
        lastModified: '2026-10-13T00:00:00Z',
        location: `${baseUrl}/Groups/${groupId}`,
      },
    };
  }

  private static mapTokenRow(row: any): ScimApiToken {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      tokenPrefix: row.token_prefix,
      tokenHash: row.token_hash,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private static mapSyncLogRow(row: any): ScimSyncLog {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tokenId: row.token_id,
      tokenName: row.token_name || undefined,
      method: row.method,
      endpoint: row.endpoint,
      scimResourceType: row.scim_resource_type,
      scimResourceId: row.scim_resource_id,
      action: row.action,
      statusCode: row.status_code,
      ipAddress: row.ip_address,
      requestPayload: row.request_payload,
      errorDetail: row.error_detail,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
