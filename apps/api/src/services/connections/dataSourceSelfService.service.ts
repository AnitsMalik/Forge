import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { connectionService } from './connection.service.js';
import { resourceDiscoveryService } from './resourceDiscovery.service.js';
import { ConnectorRegistry } from '../../connectors/index.js';
import { triggerService } from '../automation/trigger.service.js';
import type { DiscoveredResource } from '@socialforge/shared';

export interface DataSourceOAuthStartParams {
  tenantId: string;
  brandId?: string | null;
  userId?: string;
  provider: 'google-drive' | 'google-sheets' | string;
  redirectUri?: string;
  scopes?: string[];
}

export interface DataSourceCallbackParams {
  code: string;
  state: string;
  redirectUri?: string;
}

export interface DataSourceSyncParams {
  tenantId: string;
  connectionId: string;
  resourceId?: string;
  changePayload?: any;
}

export class DataSourceSelfService {
  private secretKey: string;

  constructor() {
    this.secretKey = config.encryptionMasterKey || config.jwtSecret || 'socialforge_secret_key_default_32_bytes_long';
  }

  /**
   * Generates a tamper-proof, HMAC-SHA256 signed OAuth state token.
   */
  public generateState(
    tenantId: string,
    brandId?: string | null,
    userId?: string,
    provider?: string
  ): string {
    const payload = {
      tenantId,
      brandId: brandId || null,
      userId: userId || null,
      provider: provider || 'google-drive',
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64url');

    return `${data}.${signature}`;
  }

  /**
   * Validates state signature and returns decoded context.
   */
  public validateState(stateString: string): {
    valid: boolean;
    tenantId?: string;
    brandId?: string | null;
    userId?: string;
    provider?: string;
    error?: string;
  } {
    if (!stateString || typeof stateString !== 'string') {
      return { valid: false, error: 'State parameter is missing.' };
    }

    const parts = stateString.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed state token format.' };
    }

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64url');

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return { valid: false, error: 'Invalid HMAC state signature (CSRF / tampering detected).' };
    }

    try {
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      const maxAgeMs = 15 * 60 * 1000; // 15 mins
      if (Date.now() - payload.timestamp > maxAgeMs) {
        return { valid: false, error: 'OAuth authorization session expired. Please retry.' };
      }

      return {
        valid: true,
        tenantId: payload.tenantId,
        brandId: payload.brandId,
        userId: payload.userId,
        provider: payload.provider,
      };
    } catch {
      return { valid: false, error: 'Failed to decode state JSON payload.' };
    }
  }

  /**
   * Generates authorization URL for Google Drive or Google Sheets.
   */
  public async getAuthorizationUrl(
    params: DataSourceOAuthStartParams
  ): Promise<{ authorizationUrl: string; state: string; provider: string }> {
    const { tenantId, brandId, userId, provider } = params;

    if (brandId) {
      await connectionService.verifyBrandOwnership(tenantId, brandId);
    }

    const connector = ConnectorRegistry.get(provider);
    if (!connector) {
      throw new Error(`Data source connector for '${provider}' is not registered in Connect Hub.`);
    }

    const state = this.generateState(tenantId, brandId, userId, provider);
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    const redirectUri = params.redirectUri || `${apiBaseUrl}/connections/callback`;

    const authResult = await connector.getAuthorizationUrl({
      tenantId,
      brandId: brandId || undefined,
      redirectUri,
      scopes: params.scopes,
      state,
      extraParams: { provider },
    });

    return {
      authorizationUrl: authResult.url,
      state,
      provider,
    };
  }

  /**
   * Handles OAuth callback: exchanges code, envelopes credentials into vault,
   * creates social_connections row, and discovers initial resources.
   */
  public async handleCallback(params: DataSourceCallbackParams): Promise<{
    success: boolean;
    connectionId: string;
    tenantId: string;
    brandId: string | null;
    provider: string;
    accountName: string;
    resources: DiscoveredResource[];
  }> {
    const { code, state, redirectUri } = params;
    const stateVal = this.validateState(state);
    if (!stateVal.valid || !stateVal.tenantId) {
      throw new Error(stateVal.error || 'Invalid or expired OAuth state.');
    }

    const { tenantId, brandId, provider = 'google-drive' } = stateVal;

    const connector = ConnectorRegistry.get(provider);
    if (!connector) {
      throw new Error(`Connector for '${provider}' is not registered.`);
    }

    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    const callbackResult = await connector.handleCallback({
      code,
      state,
      redirectUri: redirectUri || `${apiBaseUrl}/connections/callback`,
      tenantId,
      brandId: brandId || undefined,
    });

    // Create connection record with encrypted vault credentials
    const connection = await connectionService.createConnection({
      tenantId,
      brandId: brandId || null,
      provider,
      providerAccountId: callbackResult.providerAccountId,
      accountName: callbackResult.accountName,
      scopes: callbackResult.scopes,
      credentials: callbackResult.credentials,
      providerAccountMetadata: callbackResult.accountMetadata,
      expiresInSeconds: callbackResult.expiresInSeconds,
    });

    // Immediately discover external resources (folders or spreadsheets)
    const resources = await resourceDiscoveryService.discoverAndPersistResources(
      tenantId,
      connection.id
    );

    return {
      success: true,
      connectionId: connection.id,
      tenantId,
      brandId: brandId || null,
      provider,
      accountName: callbackResult.accountName,
      resources,
    };
  }

  /**
   * Synchronizes data source and triggers active automations listening for datasource changes.
   */
  public async syncDatasourceAndTrigger(params: DataSourceSyncParams): Promise<{
    success: boolean;
    connectionId: string;
    provider: string;
    syncedAt: string;
    resourcesCount: number;
    triggeredAutomationsCount: number;
    automationRuns: any[];
  }> {
    const { tenantId, connectionId, resourceId, changePayload } = params;

    const conn = await connectionService.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error(`Connection ${connectionId} not found for workspace.`);
    }

    if (conn.status === 'DISCONNECTED') {
      throw new Error(`Cannot synchronize disconnected connection ${connectionId}. Reconnect first.`);
    }

    // Refresh resources
    const resources = await resourceDiscoveryService.discoverAndPersistResources(tenantId, connectionId);

    // Update sync timestamp
    const now = new Date();
    await db('social_connections')
      .where({ id: connectionId, tenant_id: tenantId })
      .update({
        last_health_check_at: now,
        status: 'CONNECTED',
        last_error: null,
        updated_at: now,
      });

    // Execute automation triggers
    const triggerResults = await triggerService.handleDatasourceChange(
      tenantId,
      connectionId,
      resourceId,
      changePayload || {
        source: conn.provider,
        connectionId,
        resourceId,
        timestamp: now.toISOString(),
      }
    );

    await connectionService.logEvent({
      connectionId,
      tenantId,
      brandId: conn.brand_id,
      eventType: 'resources_discovered',
      status: 'success',
      details: {
        provider: conn.provider,
        resourceCount: resources.length,
        triggeredAutomations: triggerResults.length,
      },
    });

    return {
      success: true,
      connectionId,
      provider: conn.provider,
      syncedAt: now.toISOString(),
      resourcesCount: resources.length,
      triggeredAutomationsCount: triggerResults.length,
      automationRuns: triggerResults,
    };
  }
}

export const dataSourceSelfService = new DataSourceSelfService();
