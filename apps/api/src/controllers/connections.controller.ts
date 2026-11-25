import type { Request, Response, NextFunction } from 'express';
import { connectionService } from '../services/connections/connection.service.js';
import { credentialVaultService } from '../services/connections/credentialVault.service.js';
import { connectionHealthService } from '../services/connections/connectionHealth.service.js';
import { channelHealthMonitorService } from '../services/connections/channelHealthMonitor.service.js';
import { resourceDiscoveryService } from '../services/connections/resourceDiscovery.service.js';
import { metaSelfService } from '../services/connections/metaSelfService.service.js';
import { dataSourceSelfService } from '../services/connections/dataSourceSelfService.service.js';
import { OAuthStateService } from '../services/connections/oauthState.service.js';
import { metaOAuthService } from '../services/meta/metaOAuth.js';
import { ConnectorRegistry } from '../connectors/index.js';
import { config } from '../config/index.js';
import { db } from '../db/connection.js';
import { planGuardService } from '../services/billing/planGuard.service.js';
import { PlatformVerifierService } from '../services/connections/platformVerifier.service.js';

export class ConnectionsController {
  /**
   * GET /api/v1/connections
   * Lists connections for the authenticated tenant with optional brand or status filters.
   */
  public static async listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required.' } });
        return;
      }

      const { brandId, provider, status, limit, offset } = req.query;

      const connections = await connectionService.listConnections(tenantId, {
        brandId: (brandId as string) || (req.params.brandId as string),
        provider: provider as string,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      res.status(200).json({
        success: true,
        data: connections,
        meta: { total: connections.length },
      });
    } catch (err: any) {
      console.error('[ConnectionsController.listConnections] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to list connections' } });
    }
  }

  /**
   * GET /api/v1/connections/providers
   * Returns list of supported third-party providers, categories, and authentication types.
   */
  public static async listProviders(req: Request, res: Response): Promise<void> {
    const descriptors = ConnectorRegistry.getDescriptors();
    res.status(200).json({
      success: true,
      data: descriptors,
    });
  }

  /**
   * GET /api/v1/connections/health
   * Returns aggregated health summary for the tenant across all connections.
   */
  public static async getTenantHealthSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required.' } });
        return;
      }

      const brandId = (req.query.brandId as string) || (req.params.brandId as string);
      const summary = await connectionHealthService.getHealthSummary(tenantId, brandId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  /**
   * GET /api/v1/connections/:id
   * Retrieves single connection by ID with masked credentials and metadata.
   */
  public static async getConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const connection = await connectionService.getConnectionById(tenantId, id);
      if (!connection) {
        res.status(404).json({ success: false, error: { code: 'CONNECTION_NOT_FOUND', message: 'Connection not found.' } });
        return;
      }

      res.status(200).json({
        success: true,
        data: connection,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/authorize
   * Generates authorization URL for a connector without exposing client secrets.
   */
  public static async getAuthorizationUrl(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { provider, brandId, redirectUri, scopes } = req.body;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }
      if (!provider) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider is required.' } });
        return;
      }

      if (['google-drive', 'google-sheets'].includes(provider.toLowerCase())) {
        const dsResult = await dataSourceSelfService.getAuthorizationUrl({
          tenantId,
          brandId,
          userId: req.user?.userId,
          provider: provider.toLowerCase(),
          redirectUri,
          scopes,
        });

        res.status(200).json({
          success: true,
          data: {
            ...dsResult,
            url: dsResult.authorizationUrl,
          },
        });
        return;
      }

      const connector = ConnectorRegistry.get(provider);
      if (!connector) {
        res.status(404).json({ success: false, error: { code: 'PROVIDER_NOT_SUPPORTED', message: `No connector registered for provider: ${provider}` } });
        return;
      }

      if (brandId) {
        await connectionService.verifyBrandOwnership(tenantId, brandId);
      }

      const state = OAuthStateService.generateState(tenantId, brandId || '', provider, req.user?.userId);

      const result = await connector.getAuthorizationUrl({
        tenantId,
        brandId,
        redirectUri: redirectUri || `${req.protocol}://${req.get('host')}/api/v1/connections/callback`,
        scopes,
        state,
        extraParams: { userId: req.user?.userId, reprompt: req.body?.reprompt === true || req.query?.reprompt === 'true' },
      });

      res.status(200).json({
        success: true,
        data: {
          ...result,
          authorizationUrl: (result as any).url || (result as any).authorizationUrl,
          url: (result as any).url || (result as any).authorizationUrl,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'AUTHORIZATION_FAILED', message: err.message } });
    }
  }

  /**
   * GET /api/v1/connections/callback
   * Top-level browser OAuth callback handler for Meta, Google, LinkedIn, X, TikTok, Pinterest, etc.
   */
  public static async handleOAuthCallbackGet(req: Request, res: Response): Promise<void> {
    const webBaseUrl = config.nodeEnv === 'production' ? '' : 'http://localhost:5173';
    try {
      const { code, state, error, error_description } = req.query as Record<string, string>;

      if (error) {
        res.redirect(`${webBaseUrl}/connections?status=error&error_message=${encodeURIComponent(error_description || error)}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${webBaseUrl}/connections?status=error&error_message=${encodeURIComponent('Missing code or state parameter in callback')}`);
        return;
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/v1/connections/callback`;

      // 1. Decode & validate state with unified OAuthStateService
      const unifiedValidation = OAuthStateService.validateState(state);
      let provider = unifiedValidation.valid && unifiedValidation.state ? unifiedValidation.state.provider : null;
      let tenantId = unifiedValidation.valid && unifiedValidation.state ? unifiedValidation.state.tenantId : null;
      let brandId = unifiedValidation.valid && unifiedValidation.state ? unifiedValidation.state.brandId : null;

      // Fallback A: Google Drive / Sheets custom state
      if (!provider) {
        const dsState = dataSourceSelfService.validateState(state);
        if (dsState.valid && dsState.provider) {
          provider = dsState.provider;
          tenantId = dsState.tenantId || null;
          brandId = dsState.brandId || null;
        }
      }

      // Fallback B: Meta OAuth custom state
      if (!provider) {
        const metaState = metaOAuthService.validateState(state);
        if (metaState.valid) {
          provider = 'facebook';
          tenantId = metaState.tenantId || null;
          brandId = metaState.brandId || null;
        }
      }

      // Route 1: Google Drive or Google Sheets
      if (provider && ['google-drive', 'google-sheets'].includes(provider)) {
        const dsResult = await dataSourceSelfService.handleCallback({
          code,
          state,
          redirectUri,
        });
        res.redirect(`${webBaseUrl}/connections?status=connected&provider=${dsResult.provider}&connectionId=${dsResult.connectionId}`);
        return;
      }

      // Route 2: Meta (Facebook & Instagram)
      if (provider && ['facebook', 'instagram', 'meta'].includes(provider)) {
        const result = await metaSelfService.handleCallback({
          code,
          state,
          redirectUri,
        });

        const primaryPage = result.pages[0];
        const pageName = primaryPage?.name || 'Facebook Page';
        const igName = primaryPage?.instagramAccount?.username;
        const redirectParams = new URLSearchParams({
          status: 'connected',
          provider: 'facebook',
          accountName: pageName,
          connectionId: result.connectionId,
        });
        if (igName) {
          redirectParams.append('igName', igName);
        }
        res.redirect(`${webBaseUrl}/connections?${redirectParams.toString()}`);
        return;
      }

      // Route 3: Generic Social Connectors (LinkedIn, X / Twitter, YouTube, TikTok, Pinterest, etc.)
      const connector = ConnectorRegistry.get(provider || '');
      if (connector && tenantId) {
        const callbackResult = await connector.handleCallback({
          code,
          state,
          redirectUri,
          tenantId,
          brandId: brandId || undefined,
        });

        const connection = await connectionService.createConnection({
          tenantId,
          brandId: brandId || undefined,
          provider: provider!,
          providerAccountId: callbackResult.providerAccountId,
          accountName: callbackResult.accountName,
          scopes: callbackResult.scopes,
          credentials: callbackResult.credentials,
          providerAccountMetadata: callbackResult.accountMetadata,
          expiresInSeconds: callbackResult.expiresInSeconds,
        });

        await resourceDiscoveryService.discoverAndPersistResources(tenantId, connection.id).catch(() => {});

        res.redirect(
          `${webBaseUrl}/connections?status=connected&provider=${provider}&accountName=${encodeURIComponent(
            callbackResult.accountName
          )}&connectionId=${connection.id}`
        );
        return;
      }

      throw new Error(`Unrecognized OAuth callback provider: ${provider || 'unknown'}`);
    } catch (err: any) {
      res.redirect(`${webBaseUrl}/connections?status=error&error_message=${encodeURIComponent(err.userMessage || err.message)}`);
    }
  }

  /**
   * POST /api/v1/connections/callback
   * Handles OAuth callback JSON payload, completes token exchange, stores encrypted credentials in vault.
   */
  public static async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId || req.body.tenantId;
      const { provider, code, state, redirectUri, brandId } = req.body;

      if (!tenantId && !state) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context or valid state required.' } });
        return;
      }
      if (!provider || !code) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider and code are required.' } });
        return;
      }

      // Meta Self-Service Flow
      if (['facebook', 'instagram', 'meta'].includes(provider.toLowerCase())) {
        const metaResult = await metaSelfService.handleCallback({
          code,
          state: state || '',
          redirectUri: redirectUri || `${req.protocol}://${req.get('host')}/api/v1/connections/callback`,
        });

        res.status(200).json({
          success: true,
          data: {
            connectionId: metaResult.connectionId,
            tenantId: metaResult.tenantId,
            brandId: metaResult.brandId,
            pages: metaResult.pages,
          },
        });
        return;
      }

      // Google Drive / Google Sheets Self-Service Flow
      if (['google-drive', 'google-sheets'].includes(provider.toLowerCase())) {
        const dsResult = await dataSourceSelfService.handleCallback({
          code,
          state: state || '',
          redirectUri: redirectUri || `${req.protocol}://${req.get('host')}/api/v1/connections/callback`,
        });

        res.status(200).json({
          success: true,
          data: dsResult,
        });
        return;
      }

      const connector = ConnectorRegistry.get(provider);
      if (!connector) {
        res.status(404).json({ success: false, error: { code: 'PROVIDER_NOT_SUPPORTED', message: `Provider ${provider} is not registered.` } });
        return;
      }

      const callbackResult = await connector.handleCallback({
        code,
        state: state || '',
        redirectUri: redirectUri || `${req.protocol}://${req.get('host')}/api/v1/connections/callback`,
        tenantId,
        brandId,
      });

      // Securely create connection and store credentials in vault
      const connection = await connectionService.createConnection({
        tenantId,
        brandId,
        provider,
        providerAccountId: callbackResult.providerAccountId,
        accountName: callbackResult.accountName,
        scopes: callbackResult.scopes,
        credentials: callbackResult.credentials,
        providerAccountMetadata: callbackResult.accountMetadata,
        expiresInSeconds: callbackResult.expiresInSeconds,
      });

      // Automatically trigger resource discovery
      await resourceDiscoveryService.discoverAndPersistResources(tenantId, connection.id).catch(() => {});

      res.status(201).json({
        success: true,
        data: connection,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'CALLBACK_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/select-resources
   * POST /api/v1/connections/select-resources
   * Steps 13-20: User selects Facebook Page and Instagram Account.
   * Runs 4-stage validation pipeline:
   * 1. Access 2. Permissions 3. Publishing 4. Analytics
   * Marks connection HEALTHY (CONNECTED) only upon passing all checks.
   */
  public static async selectResources(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId || req.body.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required.' } });
        return;
      }

      const connectionId = req.params.id || req.body.connectionId;
      const { pageId, instagramAccountId, brandId } = req.body;

      if (!connectionId || !pageId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'connectionId and pageId are required.' } });
        return;
      }

      const resolvedBrandId = brandId || (req.params.brandId as string);
      if (!resolvedBrandId) {
        // Find brand from connection
        const conn = await connectionService.getConnectionById(tenantId, connectionId);
        if (!conn || !conn.brand_id) {
          res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'brandId is required.' } });
          return;
        }
      }

      const connRecord = await connectionService.getConnectionById(tenantId, connectionId);
      const targetBrandId = resolvedBrandId || connRecord?.brand_id;

      const result = await metaSelfService.selectResourcesAndValidate({
        tenantId,
        brandId: targetBrandId!,
        connectionId,
        pageId,
        instagramAccountId,
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      const status = err.httpStatus || 400;
      res.status(status).json({
        success: false,
        error: {
          code: err.code || 'RESOURCE_SELECTION_FAILED',
          message: err.userMessage || err.message,
        },
      });
    }
  }

  /**
   * GET /api/v1/connections/meta/discovered-pages
   * Lists discovered Facebook Pages for tenant, with current connection status and associated brands.
   */
  public static async getDiscoveredMetaPages(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required.' } });
        return;
      }

      const connectionId = req.query.connectionId as string | undefined;
      const result = await metaSelfService.getDiscoveredPagesForTenant(tenantId, connectionId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[ConnectionsController.getDiscoveredMetaPages] Error:', err);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/meta/batch-pages
   * Connects multiple Facebook Business Pages mapped to specific Brands.
   */
  public static async batchSelectMetaPages(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Tenant context required.' } });
        return;
      }

      const { connectionId, pageSelections } = req.body;
      if (!Array.isArray(pageSelections) || pageSelections.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'pageSelections must be a non-empty array of page mappings.' },
        });
        return;
      }

      const result = await metaSelfService.selectMultiplePagesAndValidate({
        tenantId,
        connectionId,
        pageSelections,
        userId: req.user?.userId,
      });

      res.status(200).json({
        success: result.success,
        data: result,
      });
    } catch (err: any) {
      console.error('[ConnectionsController.batchSelectMetaPages] Error:', err);
      res.status(500).json({ success: false, error: { code: 'BATCH_SELECT_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/verify
   * Verifies credentials against official platform API without persisting.
   */
  public static async verifyCredentials(req: Request, res: Response): Promise<void> {
    try {
      const { provider, credentials, metadata } = req.body;
      if (!provider) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider is required.' } });
        return;
      }

      const result = await PlatformVerifierService.verifyCredentials(provider, credentials || {}, metadata || {});
      if (!result.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: result.errorCode || 'VERIFICATION_FAILED',
            message: result.error || 'Failed to verify credentials with platform API.',
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections
   * Creates or registers a connection programmatically.
   * Performs authoritative credential verification against the platform API before saving.
   */
  public static async createConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      let {
        brandId,
        provider,
        providerAccountId,
        accountName,
        scopes,
        credentials,
        metadata,
        providerAccountMetadata,
        expiresInSeconds,
      } = req.body;

      if (!provider) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'provider is required.' } });
        return;
      }

      // Stage 9 PlanGuard enforcement
      await planGuardService.enforce(tenantId, 'social_accounts', 1);
      if (['google-sheets', 'excel', 'enterprise_erp', 'salesforce'].includes(provider.toLowerCase())) {
        await planGuardService.enforce(tenantId, 'premium_connectors', 1, { connectorType: provider });
      }

      // Authoritative credential verification against platform's official API
      if (credentials && Object.keys(credentials).length > 0) {
        const verification = await PlatformVerifierService.verifyCredentials(
          provider,
          credentials,
          { ...(providerAccountMetadata || metadata || {}), accountName }
        );

        if (!verification.valid) {
          res.status(400).json({
            success: false,
            error: {
              code: verification.errorCode || 'VERIFICATION_FAILED',
              message: verification.error || 'Credential verification failed with platform API.',
            },
          });
          return;
        }

        // Enrich account details with verified platform response
        if (!accountName && verification.accountName) {
          accountName = verification.accountName;
        }
        if (!providerAccountId && verification.accountId) {
          providerAccountId = verification.accountId;
        }
        providerAccountMetadata = {
          ...(providerAccountMetadata || metadata || {}),
          ...(verification.rawDetails || {}),
          profileUrl: verification.profileUrl || (providerAccountMetadata || metadata || {}).profileUrl,
          avatarUrl: verification.avatarUrl || (providerAccountMetadata || metadata || {}).avatarUrl,
          handle: verification.handle || (providerAccountMetadata || metadata || {}).handle,
          verifiedAt: new Date().toISOString(),
        };
      }

      const connection = await connectionService.createConnection({
        tenantId,
        brandId: brandId || (req.params.brandId as string) || null,
        provider,
        providerAccountId,
        accountName: accountName || `${provider} Account`,
        scopes,
        credentials,
        providerAccountMetadata: providerAccountMetadata || metadata || {},
        expiresInSeconds,
      });

      res.status(201).json({
        success: true,
        data: connection,
        connection, // backward-compatibility alias
      });
    } catch (err: any) {
      if (err.statusCode || err.name === 'PlanGuardError') {
        res.status(err.statusCode || 403).json({
          success: false,
          error: {
            code: err.code || 'PLAN_LIMIT_EXCEEDED',
            message: err.message,
            checkResult: err.checkResult,
          },
        });
        return;
      }
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: err.message } });
    }
  }

  /**
   * PUT /api/v1/connections/:id
   * Updates connection properties (brandId, name, scopes, status).
   */
  public static async updateConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const updated = await connectionService.updateConnection(tenantId, id, req.body);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/reconnect
   * Initiates re-authentication or token refresh for a degraded connection.
   */
  public static async reconnectConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;
      const { redirectUri, credentials, accountName } = req.body;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      // If user provided manual credentials to reconnect, verify and save in vault
      if (credentials && Object.keys(credentials).length > 0) {
        const conn = await connectionService.getConnectionById(tenantId, id);
        if (!conn) {
          res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found.' } });
          return;
        }

        const verification = await PlatformVerifierService.verifyCredentials(
          conn.provider,
          credentials,
          { accountName: accountName || conn.account_name }
        );

        if (!verification.valid) {
          res.status(400).json({
            success: false,
            error: {
              code: verification.errorCode || 'VERIFICATION_FAILED',
              message: verification.error || 'Failed to verify updated credentials with platform API.',
            },
          });
          return;
        }

        if (conn.credential_reference) {
          await credentialVaultService.updateCredentials(tenantId, conn.credential_reference, credentials);
        } else {
          await credentialVaultService.storeCredentials(tenantId, id, credentials);
        }

        const updated = await connectionService.transitionStatus(tenantId, id, 'CONNECTED', null);
        if (accountName || verification.accountName) {
          await connectionService.updateConnection(tenantId, id, {
            accountName: accountName || verification.accountName,
            providerAccountMetadata: {
              ...(conn.provider_account_metadata || {}),
              profileUrl: verification.profileUrl,
              avatarUrl: verification.avatarUrl,
              handle: verification.handle,
              verifiedAt: new Date().toISOString(),
            },
          });
        }

        res.status(200).json({
          success: true,
          data: { reconnected: true, connection: updated },
          message: 'Connection successfully reconnected and verified.',
        });
        return;
      }

      const result = await connectionService.reconnectConnection(tenantId, id, redirectUri);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'RECONNECT_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/disconnect
   * Gracefully disconnects a connection, revokes tokens, and updates state machine to DISCONNECTED.
   */
  public static async disconnectConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const result = await connectionService.disconnectConnection(tenantId, id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DISCONNECT_FAILED', message: err.message } });
    }
  }

  /**
   * DELETE /api/v1/connections/:id
   * Permanently removes connection, cascade-deleting credentials and audit logs.
   */
  public static async deleteConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      await connectionService.deleteConnection(tenantId, id);
      res.status(200).json({
        success: true,
        message: 'Connection deleted successfully.',
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/test
   * Tests connection validity using current credentials against official platform API.
   */
  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const conn = await connectionService.getConnectionById(tenantId, id);
      if (!conn) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found.' } });
        return;
      }

      if (conn.credential_reference) {
        try {
          const creds = await credentialVaultService.getCredentials(tenantId, conn.credential_reference);
          const verification = await PlatformVerifierService.verifyCredentials(
            conn.provider,
            creds,
            (conn.provider_account_metadata as Record<string, any>) || {}
          );

          if (!verification.valid) {
            await connectionService.transitionStatus(tenantId, id, 'REAUTH_REQUIRED', verification.error);
            res.status(200).json({
              success: false,
              data: {
                status: 'REAUTH_REQUIRED',
                error: verification.error,
                lastCheckedAt: new Date(),
              },
            });
            return;
          }

          await connectionService.transitionStatus(tenantId, id, 'CONNECTED', null);
          res.status(200).json({
            success: true,
            data: {
              status: 'CONNECTED',
              lastCheckedAt: new Date(),
              verifiedAccount: verification,
            },
          });
          return;
        } catch (vaultErr: any) {
          await connectionService.transitionStatus(tenantId, id, 'NEEDS_ATTENTION', vaultErr.message);
          res.status(200).json({
            success: false,
            data: { status: 'NEEDS_ATTENTION', error: vaultErr.message },
          });
          return;
        }
      }

      const health = await connectionHealthService.checkConnectionHealth(tenantId, id);
      res.status(200).json({
        success: health.status === 'CONNECTED',
        data: health,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'TEST_FAILED', message: err.message } });
    }
  }

  /**
   * GET /api/v1/connections/:id/health
   * Retrieves connection health details.
   */
  public static async getConnectionHealth(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id, provider } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      // If id is provided as UUID, query by ID
      if (id && id !== ':provider') {
        const conn = await connectionService.getConnectionById(tenantId, id);
        if (!conn) {
          res.status(404).json({ success: false, error: { code: 'CONNECTION_NOT_FOUND', message: 'Connection not found.' } });
          return;
        }

        const evaluation = await channelHealthMonitorService.evaluateConnection(tenantId, conn.id);

        res.status(200).json({
          success: true,
          data: {
            id: conn.id,
            provider: conn.provider,
            status: conn.status,
            healthStatus: evaluation.state,
            channelHealthState: evaluation.state,
            isPublishingEligible: evaluation.isPublishingEligible,
            publishingIneligibilityReason: evaluation.publishingIneligibilityReason,
            tokenValid: evaluation.tokenValid,
            tokenExpiresAt: evaluation.tokenExpiresAt,
            expiresInSeconds: evaluation.expiresInSeconds,
            isRefreshable: evaluation.isRefreshable,
            isRefreshing: evaluation.isRefreshing,
            isRevoked: evaluation.isRevoked,
            scopesValid: evaluation.scopesValid,
            missingScopes: evaluation.missingScopes,
            apiReachable: evaluation.apiReachable,
            latencyMs: evaluation.latencyMs,
            isRateLimited: evaluation.isRateLimited,
            isProviderOutage: evaluation.isProviderOutage,
            expiresAt: conn.expires_at,
            lastHealthCheckAt: evaluation.lastCheckedAt,
            lastError: evaluation.lastError,
          },
        });
        return;
      }

      // Legacy fallback: GET /:provider/health
      const targetProvider = provider || req.params.provider;
      const conns = await connectionService.listConnections(tenantId, { provider: targetProvider });
      const first = conns[0];

      res.status(200).json({
        provider: targetProvider,
        status: first ? first.health_status || first.status.toLowerCase() : 'healthy',
        lastSyncedAt: first?.last_health_check_at || new Date(),
        tokenExpiresAt: first?.expires_at || null,
        rateLimitWindow: 'healthy',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'HEALTH_CHECK_FAILED', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/health-check
   * Triggers an immediate active health check on the connection.
   */
  public static async triggerHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const result = await connectionHealthService.checkConnectionHealth(tenantId, id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'HEALTH_CHECK_FAILED', message: err.message } });
    }
  }

  /**
   * GET /api/v1/connections/:id/resources
   * Discovers and lists external resources with strict tenant isolation.
   */
  public static async discoverResources(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id, provider } = req.params;
      const { refresh } = req.query;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      // If called with UUID connection ID
      if (id && id !== ':provider') {
        const conn = await connectionService.getConnectionById(tenantId, id);
        if (!conn) {
          res.status(404).json({ success: false, error: { code: 'CONNECTION_NOT_FOUND', message: 'Connection not found.' } });
          return;
        }

        if (['facebook', 'instagram', 'meta'].includes(conn.provider.toLowerCase())) {
          const metaRes = await metaSelfService.getDiscoveredResources(tenantId, id);
          res.status(200).json({
            success: true,
            data: metaRes.pages,
            pages: metaRes.pages,
            resources: metaRes.pages,
          });
          return;
        }

        let resources = [];
        if (refresh === 'true' || refresh === '1') {
          resources = await resourceDiscoveryService.discoverAndPersistResources(tenantId, id);
        } else {
          resources = await resourceDiscoveryService.listDiscoveredResources(tenantId, id);
          if (resources.length === 0) {
            resources = await resourceDiscoveryService.discoverAndPersistResources(tenantId, id);
          }
        }

        res.status(200).json({
          success: true,
          data: resources,
          resources, // backward compatibility
        });
        return;
      }

      // Legacy fallback: GET /:provider/resources?brandId=...
      const brandId = (req.query.brandId as string) || (req.params.brandId as string);
      const resources = await resourceDiscoveryService.listDiscoveredResources(tenantId, undefined, brandId);

      res.status(200).json({
        provider,
        resources,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'RESOURCE_DISCOVERY_FAILED', message: err.message } });
    }
  }

  /**
   * PATCH /api/v1/connections/resources/:resourceId/select
   * Toggles resource selection for publishing or campaign routing.
   */
  public static async toggleResourceSelection(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { resourceId } = req.params;
      const { isSelected = true } = req.body;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const updated = await resourceDiscoveryService.toggleResourceSelection(tenantId, resourceId, Boolean(isSelected));
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { code: 'SELECTION_FAILED', message: err.message } });
    }
  }

  /**
   * GET /api/v1/connections/:id/events
   * Lists audit events and lifecycle history for a connection.
   */
  public static async listConnectionEvents(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const { id } = req.params;

      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const conn = await connectionService.getConnectionById(tenantId, id);
      if (!conn) {
        res.status(404).json({ success: false, error: { code: 'CONNECTION_NOT_FOUND', message: 'Connection not found.' } });
        return;
      }

      const events = await db('connection_events')
        .where({ connection_id: id, tenant_id: tenantId })
        .orderBy('created_at', 'desc')
        .limit(50);

      const parsed = events.map((e) => ({
        id: e.id,
        connectionId: e.connection_id,
        tenantId: e.tenant_id,
        brandId: e.brand_id,
        eventType: e.event_type,
        status: e.status,
        details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details || {},
        createdAt: e.created_at,
      }));

      res.status(200).json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }

  /**
   * POST /api/v1/connections/:id/sync
   * Synchronizes data source and triggers active automations listening for datasource changes.
   */
  public static async syncDatasource(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
        return;
      }

      const connectionId = req.params.id || req.body.connectionId;
      const { resourceId, changePayload } = req.body;

      if (!connectionId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'connectionId is required.' } });
        return;
      }

      const result = await dataSourceSelfService.syncDatasourceAndTrigger({
        tenantId,
        connectionId,
        resourceId,
        changePayload,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_FAILED', message: err.message },
      });
    }
  }
}

// Backward-compatible individual function exports
export const listConnections = ConnectionsController.listConnections;
export const createConnection = ConnectionsController.createConnection;
export const getConnectionHealth = ConnectionsController.getConnectionHealth;
export const discoverResources = ConnectionsController.discoverResources;
export const syncDatasource = ConnectionsController.syncDatasource;
