import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { credentialVaultService } from './credentialVault.service.js';
import { ConnectorRegistry } from '../../connectors/core/ConnectorRegistry.js';
import type {
  SocialConnection,
  ConnectionStatus,
  ConnectionLifecycleEvent,
  StoredCredentials,
  MultiAccountDetails,
} from '@socialforge/shared';

export const VALID_CONNECTION_STATUSES: ConnectionStatus[] = [
  'CONNECTED',
  'CHECKING',
  'NEEDS_ATTENTION',
  'REAUTH_REQUIRED',
  'PERMISSION_MISSING',
  'RATE_LIMITED',
  'DISCONNECTED',
];

export interface CreateConnectionParams {
  tenantId: string;
  brandId?: string | null;
  provider: string;
  providerAccountId?: string;
  accountName?: string;
  scopes?: string[];
  credentials?: StoredCredentials;
  providerAccountMetadata?: Record<string, unknown>;
  expiresInSeconds?: number;
}

export interface UpdateConnectionParams {
  brandId?: string | null;
  accountName?: string;
  scopes?: string[];
  providerAccountMetadata?: Record<string, unknown>;
  status?: ConnectionStatus;
}

export interface ListConnectionsOptions {
  brandId?: string | null;
  provider?: string;
  status?: ConnectionStatus | string;
  limit?: number;
  offset?: number;
}

export class ConnectionService {
  /**
   * Normalizes any raw/legacy status string into authoritative ConnectionStatus.
   */
  public normalizeStatus(rawStatus?: string | null): ConnectionStatus {
    if (!rawStatus) return 'CONNECTED';
    const upper = rawStatus.toUpperCase() as ConnectionStatus;
    if (VALID_CONNECTION_STATUSES.includes(upper)) {
      return upper;
    }

    // Map legacy lowercase statuses
    switch (rawStatus.toLowerCase()) {
      case 'healthy':
      case 'connected':
        return 'CONNECTED';
      case 'checking':
        return 'CHECKING';
      case 'degraded':
      case 'action_required':
        return 'NEEDS_ATTENTION';
      case 'expired':
      case 'revoked':
        return 'REAUTH_REQUIRED';
      case 'rate_limited':
        return 'RATE_LIMITED';
      case 'unreachable':
      case 'error':
        return 'NEEDS_ATTENTION';
      case 'disconnected':
        return 'DISCONNECTED';
      default:
        return 'CONNECTED';
    }
  }

  /**
   * Verifies that the requested brand exists and belongs to tenantId.
   */
  public async verifyBrandOwnership(tenantId: string, brandId?: string | null): Promise<void> {
    if (!brandId) return;

    const brand = await db('brands')
      .where({ id: brandId, tenant_id: tenantId })
      .first();

    if (!brand) {
      throw new Error(`Brand ${brandId} not found or does not belong to the current workspace.`);
    }
  }

  /**
   * Records a lifecycle audit event into connection_events table.
   * Strips any raw credentials or secrets from details payload.
   */
  public async logEvent(params: {
    connectionId: string;
    tenantId: string;
    brandId?: string | null;
    eventType: ConnectionLifecycleEvent['event_type'];
    status: 'success' | 'failure' | 'warning' | string;
    details?: Record<string, unknown> | string | null;
  }): Promise<void> {
    try {
      // Sanitize details to guarantee zero credential leakage
      let sanitizedDetails: any = null;
      if (params.details) {
        if (typeof params.details === 'object') {
          const copy = { ...params.details };
          delete copy.accessToken;
          delete copy.refreshToken;
          delete copy.clientSecret;
          delete copy.apiKey;
          delete copy.apiSecret;
          delete copy.password;
          sanitizedDetails = JSON.stringify(copy);
        } else {
          sanitizedDetails = String(params.details).slice(0, 1000);
        }
      }

      await db('connection_events').insert({
        id: crypto.randomUUID(),
        connection_id: params.connectionId,
        tenant_id: params.tenantId,
        brand_id: params.brandId || null,
        event_type: params.eventType,
        status: params.status,
        details: sanitizedDetails,
        created_at: new Date(),
      });
    } catch (err) {
      console.warn('[ConnectionService] Failed to record connection lifecycle event:', err);
    }
  }

  /**
   * Lists connections strictly scoped to tenantId.
   */
  public async listConnections(
    tenantId: string,
    options: ListConnectionsOptions = {}
  ): Promise<SocialConnection[]> {
    if (!tenantId) {
      throw new Error('Tenant context is required to list connections.');
    }

    let query = db('social_connections')
      .where({ tenant_id: tenantId });

    if (options.brandId) {
      query = query.andWhere({ brand_id: options.brandId });
    }
    if (options.provider) {
      query = query.andWhere({ provider: options.provider });
    }
    if (options.status) {
      query = query.andWhere(function () {
        this.where({ status: options.status })
          .orWhere({ status: options.status?.toLowerCase() });
      });
    }

    const rows = await query
      .orderBy('created_at', 'desc')
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    return rows.map((r) => this.formatConnection(r));
  }

  /**
   * Retrieves single connection by ID with strict tenant ownership check.
   */
  public async getConnectionById(
    tenantId: string,
    connectionId: string
  ): Promise<SocialConnection | null> {
    if (!tenantId || !connectionId) return null;

    const row = await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .first();

    if (!row) return null;
    return this.formatConnection(row);
  }

  /**
   * Creates a new connection, encrypting credentials in the vault.
   */
  public async createConnection(params: CreateConnectionParams): Promise<SocialConnection> {
    const {
      tenantId,
      brandId,
      provider,
      providerAccountId,
      accountName,
      scopes,
      credentials,
      providerAccountMetadata,
      expiresInSeconds,
    } = params;

    if (!tenantId) throw new Error('tenantId is required.');
    if (!provider) throw new Error('provider is required.');

    // 1. Enforce brand ownership
    if (brandId) {
      await this.verifyBrandOwnership(tenantId, brandId);
    }

    const targetAccountId = providerAccountId || credentials?.accountId;

    // Deduplication check: Detect if this exact account is already connected for this tenant/brand
    let existingConnection: any = null;
    if (targetAccountId) {
      existingConnection = await db('social_connections')
        .where({
          tenant_id: tenantId,
          provider: provider.toLowerCase(),
          provider_account_id: targetAccountId,
        })
        .andWhere(function () {
          if (brandId) {
            this.where({ brand_id: brandId }).orWhereNull('brand_id');
          }
        })
        .first();
    }

    const connectionId = existingConnection ? existingConnection.id : crypto.randomUUID();
    const now = new Date();
    const expiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : credentials?.expiresAt
      ? new Date(credentials.expiresAt)
      : null;

    const resolvedStatus: ConnectionStatus = 'CONNECTED';
    const accountMeta = providerAccountMetadata || {};

    const record = {
      tenant_id: tenantId,
      brand_id: brandId || null,
      provider: provider.toLowerCase(),
      status: resolvedStatus,
      provider_account_metadata: JSON.stringify(accountMeta),
      scopes: scopes ? JSON.stringify(scopes) : null,
      expires_at: expiresAt,
      last_health_check_at: now,
      last_error: null,
      provider_account_id: targetAccountId || `acc_${provider}_${connectionId.slice(0, 8)}`,
      account_name: accountName || credentials?.accountName || `${provider} Account`,
      health_status: 'healthy',
      token_expires_at: expiresAt,
      last_synced_at: now,
      metadata: JSON.stringify(accountMeta),
      updated_at: now,
    };

    if (existingConnection) {
      await db('social_connections')
        .where({ id: connectionId })
        .update(record);
    } else {
      await db('social_connections').insert({
        id: connectionId,
        ...record,
        credential_reference: null as string | null,
        created_at: now,
      });
    }

    if (credentials) {
      const credentialReference = await credentialVaultService.storeCredentials(
        tenantId,
        connectionId,
        credentials
      );
      await db('social_connections').where({ id: connectionId }).update({
        credential_reference: credentialReference,
        updated_at: new Date(),
      });
    }

    // Audit log (distinguish initial connection vs re-authentication/refresh)
    await this.logEvent({
      connectionId,
      tenantId,
      brandId,
      eventType: existingConnection ? 'token_refreshed' : 'auth_success',
      status: 'success',
      details: {
        provider,
        accountName: record.account_name,
        deduplicated: Boolean(existingConnection),
        scopes: scopes || [],
      },
    });

    const created = await this.getConnectionById(tenantId, connectionId);
    await this.syncToSocialAccount(tenantId, connectionId).catch(() => {});
    return created!;
    return created!;
  }

  /**
   * Transitions connection state with validation and audit logging.
   */
  public async transitionStatus(
    tenantId: string,
    connectionId: string,
    newStatus: ConnectionStatus,
    errorOrDetails?: string | Record<string, unknown> | null
  ): Promise<SocialConnection> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for current tenant.');
    }

    const normalized = this.normalizeStatus(newStatus);
    const updates: Record<string, any> = {
      status: normalized,
      updated_at: new Date(),
    };

    if (errorOrDetails) {
      updates.last_error = typeof errorOrDetails === 'object'
        ? JSON.stringify(errorOrDetails)
        : String(errorOrDetails);
    } else if (normalized === 'CONNECTED') {
      updates.last_error = null;
    }

    await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .update(updates);

    await this.logEvent({
      connectionId,
      tenantId,
      brandId: conn.brand_id,
      eventType: 'status_changed',
      status: normalized === 'CONNECTED' ? 'success' : 'warning',
      details: {
        previousStatus: conn.status,
        newStatus: normalized,
        error: updates.last_error,
      },
    });

    const updated = await this.getConnectionById(tenantId, connectionId);
    await this.syncToSocialAccount(tenantId, connectionId).catch(() => {});
    return updated!;
  }

  /**
   * Reconnect operation: prepares re-authorization URL or refreshes credentials.
   */
  public async reconnectConnection(
    tenantId: string,
    connectionId: string,
    redirectUri?: string
  ): Promise<{ reconnected: boolean; authorizationUrl?: string; status: ConnectionStatus }> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for tenant.');
    }

    const connector = ConnectorRegistry.get(conn.provider);

    // Direct token refresh attempt if credentials exist
    if (conn.credential_reference && connector) {
      try {
        const credentials = await credentialVaultService.getCredentials(tenantId, conn.credential_reference);
        const refreshed = await connector.refreshCredential({
          tenantId,
          connectionId,
          currentCredentials: credentials,
        });

        if (refreshed.success && refreshed.credentials) {
          await credentialVaultService.updateCredentials(tenantId, conn.credential_reference, refreshed.credentials);
          const active = await this.transitionStatus(tenantId, connectionId, 'CONNECTED', null);
          return { reconnected: true, status: active.status };
        }
      } catch (err: any) {
        console.warn('[ConnectionService] Refresh failed during reconnect:', err.message);
      }
    }

    // If connector supports OAuth URL generation, generate fresh authorization URL:
    if (connector) {
      const authResult = await connector.getAuthorizationUrl({
        tenantId,
        brandId: conn.brand_id,
        redirectUri: redirectUri || 'http://localhost:5173/connections/callback',
        scopes: conn.scopes || undefined,
        extraParams: { connectionId },
      });

      await this.transitionStatus(tenantId, connectionId, 'CHECKING', 'Reconnection in progress');

      await this.logEvent({
        connectionId,
        tenantId,
        brandId: conn.brand_id,
        eventType: 'auth_initiated',
        status: 'success',
        details: { action: 'reconnect_initiated' },
      });

      return {
        reconnected: false,
        authorizationUrl: authResult.url,
        status: 'CHECKING',
      };
    }

    const updated = await this.transitionStatus(tenantId, connectionId, 'REAUTH_REQUIRED', 'Re-authentication required.');
    return { reconnected: false, status: updated.status };
  }

  /**
   * Disconnect operation: marks DISCONNECTED, calls connector disconnect hook, and logs audit.
   */
  public async disconnectConnection(
    tenantId: string,
    connectionId: string
  ): Promise<{ disconnected: boolean; status: ConnectionStatus }> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for tenant.');
    }

    const connector = ConnectorRegistry.get(conn.provider);
    if (connector && conn.credential_reference) {
      try {
        const credentials = await credentialVaultService.getCredentials(tenantId, conn.credential_reference);
        await connector.disconnect({ tenantId, connectionId, credentials });
      } catch (err: any) {
        console.warn('[ConnectionService] Connector disconnect hook warning:', err.message);
      }
    }

    await this.transitionStatus(tenantId, connectionId, 'DISCONNECTED', 'Manually disconnected by user');

    await this.logEvent({
      connectionId,
      tenantId,
      brandId: conn.brand_id,
      eventType: 'disconnected',
      status: 'success',
      details: { action: 'user_disconnect' },
    });

    return { disconnected: true, status: 'DISCONNECTED' };
  }

  /**
   * Updates connection configuration (brand assignment, name, scopes).
   */
  public async updateConnection(
    tenantId: string,
    connectionId: string,
    params: UpdateConnectionParams
  ): Promise<SocialConnection> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for tenant.');
    }

    if (params.brandId !== undefined && params.brandId !== null) {
      await this.verifyBrandOwnership(tenantId, params.brandId);
    }

    const updates: Record<string, any> = { updated_at: new Date() };

    if (params.brandId !== undefined) updates.brand_id = params.brandId;
    if (params.accountName !== undefined) updates.account_name = params.accountName;
    if (params.scopes !== undefined) updates.scopes = JSON.stringify(params.scopes);
    if (params.providerAccountMetadata !== undefined) {
      updates.provider_account_metadata = JSON.stringify(params.providerAccountMetadata);
      updates.metadata = JSON.stringify(params.providerAccountMetadata);
    }
    if (params.status !== undefined) {
      updates.status = this.normalizeStatus(params.status);
    }

    await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .update(updates);

    const updated = await this.getConnectionById(tenantId, connectionId);
    await this.syncToSocialAccount(tenantId, connectionId).catch(() => {});
    return updated!;
  }

  /**
   * Deletes connection, securely cascading credentials and audit records.
   */
  public async deleteConnection(tenantId: string, connectionId: string): Promise<void> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for tenant.');
    }

    await this.removeOrDeactivateSocialAccount(tenantId, connectionId, true).catch(() => {});

    if (conn.credential_reference) {
      await credentialVaultService.deleteCredentials(tenantId, conn.credential_reference);
    }

    // Delete discovered resources
    await db('connector_resources').where({ connection_id: connectionId }).delete().catch(() => {});

    // Delete connection record (connection_events and credentials cascade via foreign keys)
    await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .delete();
  }

  /**
   * Synchronizes connection state with social_accounts table for publishing workflows.
   */
  public async syncToSocialAccount(tenantId: string, connectionId: string): Promise<void> {
    const conn = await this.getConnectionById(tenantId, connectionId);
    if (!conn || !conn.brand_id) return;

    const p = conn.provider.toLowerCase();
    const SOCIAL_MAP: Record<string, string> = {
      facebook: 'facebook',
      instagram: 'instagram',
      linkedin: 'linkedin',
      x_twitter: 'x_twitter',
      twitter: 'x_twitter',
      tiktok: 'tiktok',
      youtube: 'youtube',
      youtube_shorts: 'youtube_shorts',
      pinterest: 'pinterest',
      threads: 'threads',
    };

    const platform = SOCIAL_MAP[p];
    if (!platform) return; // Non-social providers (drive, sheets, etc.) are ignored

    const isActive = conn.status === 'CONNECTED';
    const metadata: any = conn.provider_account_metadata || {};
    const accountId = conn.provider_account_id || metadata.accountId || `acc_${platform}_${conn.id.slice(0, 8)}`;
    const handle = metadata.handle || `@${(conn.account_name || 'account').toLowerCase().replace(/\s+/g, '_')}`;
    const avatarUrl = metadata.avatarUrl || metadata.pictureUrl || metadata.profilePictureUrl;

    let encryptedToken = 'encrypted_vault_placeholder';
    if (conn.credential_reference) {
      try {
        const credRecord = await db('connection_credentials')
          .where({ id: conn.credential_reference, tenant_id: tenantId })
          .first();
        if (credRecord?.encrypted_data) {
          encryptedToken = `${credRecord.iv}:${credRecord.auth_tag}:${credRecord.encrypted_data}`;
        }
      } catch {}
    }

    const now = new Date();
    const accMeta = {
      ...metadata,
      handle,
      avatarUrl,
      connectionId: conn.id,
      isSandbox: metadata.isSandbox || false,
      profileUrl: metadata.profileUrl || `https://${platform}.com`,
    };

    const existing = await db('social_accounts')
      .where({ brand_id: conn.brand_id, platform, account_id: accountId })
      .first();

    if (existing) {
      await db('social_accounts')
        .where({ id: existing.id })
        .update({
          account_name: conn.account_name,
          access_token_encrypted: encryptedToken,
          token_expires_at: conn.expires_at || null,
          is_active: isActive ? 1 : 0,
          metadata: JSON.stringify(accMeta),
          updated_at: now,
        });
    } else if (isActive) {
      await db('social_accounts').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: conn.brand_id,
        platform,
        account_name: conn.account_name,
        account_id: accountId,
        access_token_encrypted: encryptedToken,
        token_expires_at: conn.expires_at || null,
        is_active: 1,
        metadata: JSON.stringify(accMeta),
        created_at: now,
        updated_at: now,
      });
    }
  }

  /**
   * Cleans up or deactivates social_accounts entry when a connection is deleted or disconnected.
   */
  public async removeOrDeactivateSocialAccount(tenantId: string, connectionId: string, deletePermanently = false): Promise<void> {
    const conn = await db('social_connections').where({ id: connectionId, tenant_id: tenantId }).first();
    if (!conn || !conn.brand_id) return;

    const p = conn.provider.toLowerCase();
    const platform = p === 'twitter' ? 'x_twitter' : p;

    if (deletePermanently) {
      await db('social_accounts')
        .where({ brand_id: conn.brand_id, platform })
        .andWhere(function () {
          this.where({ account_id: conn.provider_account_id }).orWhere('account_name', conn.account_name);
        })
        .delete()
        .catch(() => {});
    } else {
      await db('social_accounts')
        .where({ brand_id: conn.brand_id, platform })
        .andWhere(function () {
          this.where({ account_id: conn.provider_account_id }).orWhere('account_name', conn.account_name);
        })
        .update({ is_active: 0, updated_at: new Date() })
        .catch(() => {});
    }
  }

  /**
   * Normalizes DB row into SocialConnection contract with parsed JSON and ISO dates.
   */
  private formatConnection(row: any): SocialConnection {
    let parsedMetadata: any = null;
    try {
      const rawMeta = row.provider_account_metadata || row.metadata;
      parsedMetadata = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta || null;
    } catch {
      parsedMetadata = null;
    }

    let parsedScopes: string[] | null = null;
    try {
      parsedScopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes || null;
    } catch {
      parsedScopes = null;
    }

    let parsedLastError: any = row.last_error;
    try {
      if (typeof row.last_error === 'string' && (row.last_error.startsWith('{') || row.last_error.startsWith('['))) {
        parsedLastError = JSON.parse(row.last_error);
      }
    } catch {}

    const status = this.normalizeStatus(row.status);
    const p = (row.provider || '').toLowerCase();

    const profileImage =
      parsedMetadata?.avatarUrl ||
      parsedMetadata?.profile_picture ||
      parsedMetadata?.picture ||
      parsedMetadata?.photoUrl ||
      null;

    const accountType =
      parsedMetadata?.accountType ||
      (p === 'facebook'
        ? 'Facebook Page'
        : p === 'instagram'
        ? 'Instagram Business Account'
        : p === 'linkedin'
        ? 'LinkedIn Organization Page'
        : p === 'x_twitter'
        ? 'X Creator Account'
        : p === 'youtube' || p === 'youtube_shorts'
        ? 'YouTube Channel'
        : p === 'tiktok'
        ? 'TikTok Creator Account'
        : p === 'pinterest'
        ? 'Pinterest Business Profile'
        : `${row.provider} Account`);

    let tokenHealth = 'Active & Valid';
    if (status === 'REAUTH_REQUIRED') {
      tokenHealth = 'Re-authorization Required';
    } else if (p === 'facebook' || p === 'instagram') {
      tokenHealth = 'Permanent Page Token (No expiration)';
    } else if (row.expires_at) {
      const msLeft = new Date(row.expires_at).getTime() - Date.now();
      const daysLeft = Math.round(msLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.round(msLeft / (1000 * 60 * 60));
      if (msLeft <= 0) {
        tokenHealth = 'Expired (Pending refresh/re-auth)';
      } else if (daysLeft > 0) {
        tokenHealth = `Healthy (Valid for ${daysLeft} days)`;
      } else {
        tokenHealth = `Expiring Soon (Valid for ${hoursLeft} hours)`;
      }
    }

    const availablePermissions: string[] = parsedScopes || (parsedMetadata?.scopes as string[]) || [];

    const multiAccountDetails: MultiAccountDetails = {
      connectionId: row.id,
      accountName: row.account_name || `${row.provider} Account`,
      profileImage,
      platform: row.provider,
      accountType,
      connectionStatus: status,
      channelHealthState: row.health_status,
      lastSuccessfulSync: row.last_health_check_at || row.last_synced_at || row.updated_at,
      tokenHealth,
      availablePublishingPermissions: availablePermissions,
      canDisconnect: true,
      canReconnect: true,
      reconnectUrl: `/connections/${row.id}/reconnect`,
      isPublishingEligible: status === 'CONNECTED' && row.health_status !== 'Reauthorization Required',
    };

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      brand_id: row.brand_id || null,
      provider: row.provider,
      status,
      provider_account_metadata: parsedMetadata,
      scopes: parsedScopes,
      credential_reference: row.credential_reference || null,
      expires_at: row.expires_at || row.token_expires_at || null,
      last_health_check_at: row.last_health_check_at || row.last_synced_at || null,
      last_error: parsedLastError,
      account_name: row.account_name || `${row.provider} Account`,
      provider_account_id: row.provider_account_id || row.id,
      health_status: row.health_status || (status === 'CONNECTED' ? 'healthy' : 'degraded'),
      token_expires_at: row.expires_at || row.token_expires_at || null,
      last_synced_at: row.last_health_check_at || row.last_synced_at || null,
      metadata: parsedMetadata,
      profile_image: profileImage,
      account_type: accountType,
      token_health: tokenHealth,
      available_permissions: availablePermissions,
      multi_account_details: multiAccountDetails,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const connectionService = new ConnectionService();
