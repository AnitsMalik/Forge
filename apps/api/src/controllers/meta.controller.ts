import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  metaOAuthService,
  metaTokenManager,
  facebookPagesService,
  instagramService,
  metaPublishingService,
  metaAgentTool,
  normalizeMetaError,
  connectionMonitorService,
} from '../services/meta/index.js';

/**
 * Initiates the Meta OAuth flow.
 * GET /api/v1/integrations/meta/connect
 */
export async function connectMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const brandId = (req.query.brandId as string) || req.params.brandId;
    const format = req.query.format as string;

    if (!brandId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'brandId query parameter is required.');
    }

    const brand = await db('brands').where({ id: brandId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');
    }

    const tenantId = req.user?.tenantId || brand.tenant_id;
    const userId = req.user?.userId || (await db('brand_users').where({ brand_id: brandId }).first())?.user_id;

    const authUrl = metaOAuthService.getAuthorizationUrl(tenantId, brandId, userId);

    if (format === 'json' || req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        success: true,
        data: {
          authorizationUrl: authUrl,
        },
      });
    }

    return res.redirect(authUrl);
  } catch (err) {
    return next(err);
  }
}

/**
 * OAuth Callback Handler.
 * GET /api/v1/integrations/meta/callback
 */
export async function metaCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { code, state, error, error_description } = req.query as Record<string, string>;

    const webBaseUrl = config.nodeEnv === 'production' ? '' : 'http://localhost:5173';

    if (error) {
      console.warn('[MetaOAuth Callback] Error from Meta:', error, error_description);
      return res.redirect(
        `${webBaseUrl}/?tab=channels&meta_status=error&error_message=${encodeURIComponent(
          error_description || error
        )}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${webBaseUrl}/?tab=channels&meta_status=error&error_message=${encodeURIComponent(
          'Missing code or state in OAuth callback'
        )}`
      );
    }

    const result = await metaOAuthService.handleCallback(code, state);

    return res.redirect(
      `${webBaseUrl}/?tab=channels&meta_status=success&brandId=${result.brandId}&pageCount=${result.pageCount}`
    );
  } catch (err: any) {
    const normalized = normalizeMetaError(err);
    const webBaseUrl = config.nodeEnv === 'production' ? '' : 'http://localhost:5173';
    return res.redirect(
      `${webBaseUrl}/?tab=channels&meta_status=error&error_message=${encodeURIComponent(
        normalized.message
      )}`
    );
  }
}

/**
 * Gets the current Meta connection status for a brand.
 * GET /api/v1/brands/:brandId/integrations/meta/status
 */
export async function getMetaStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const connection = await db('meta_connections').where({ brand_id: brandId }).first();

    if (!connection) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          status: 'disconnected',
        },
      });
    }

    let isTokenExpired = false;
    if (connection.credential_expires_at) {
      isTokenExpired = metaTokenManager.isTokenExpired(connection.credential_expires_at);
    }

    const tokenMasked = metaTokenManager.maskToken(
      connection.encrypted_page_access_token || connection.encrypted_user_access_token || ''
    );

    let scopes: string[] = [];
    try {
      scopes = typeof connection.scopes === 'string' ? JSON.parse(connection.scopes) : connection.scopes || [];
    } catch {}

    return res.status(200).json({
      success: true,
      data: {
        id: connection.id,
        connected: connection.status === 'connected' && !isTokenExpired,
        status: isTokenExpired ? 'reauth_required' : connection.status,
        reauthorizationRequired: isTokenExpired || connection.status === 'reauth_required',
        provider: 'meta',
        metaUserId: connection.meta_user_id,
        selectedPageId: connection.selected_page_id,
        selectedPageName: connection.selected_page_name,
        instagramAccountId: connection.instagram_account_id,
        instagramUsername: connection.instagram_username,
        credentialExpiresAt: connection.credential_expires_at,
        tokenMasked,
        scopes,
        requireApprovalBeforePublish: Boolean(connection.require_approval_before_publish),
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Background health check for connected Meta accounts (Requirements 7 & 11).
 * Strictly read-only; never publishes content during health checks.
 * GET /api/v1/brands/:brandId/integrations/meta/health
 * POST /api/v1/brands/:brandId/integrations/meta/health-check
 */
export async function getConnectionHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const health = await connectionMonitorService.checkConnectionHealth(brandId);
    return res.status(200).json({
      success: true,
      data: health,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lists all discovered Facebook Pages for this brand's connection.
 * GET /api/v1/brands/:brandId/integrations/meta/pages
 */
export async function listDiscoveredPages(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const connection = await db('meta_connections').where({ brand_id: brandId }).first();
    if (!connection) {
      throw new AppError(404, 'CONNECTION_NOT_FOUND', 'No Meta connection found for this brand.');
    }

    // Refresh pages if user token is valid
    let decryptedUserToken = '';
    if (connection.encrypted_user_access_token) {
      try {
        decryptedUserToken = metaTokenManager.decryptToken(connection.encrypted_user_access_token);
      } catch {}
    }

    let pages = await db('meta_facebook_pages')
      .where({ connection_id: connection.id })
      .select('*');

    // If no pages stored yet or refresh requested, fetch live
    if (pages.length === 0 && decryptedUserToken) {
      await facebookPagesService.syncConnectionPages(connection.id, decryptedUserToken);
      pages = await db('meta_facebook_pages').where({ connection_id: connection.id }).select('*');
    }

    // Join with connected instagram accounts
    const igAccounts = await db('meta_instagram_accounts')
      .where({ connection_id: connection.id })
      .select('*');

    const igByPage = new Map<string, any>();
    igAccounts.forEach((ig) => igByPage.set(ig.page_id, ig));

    const result = pages.map((p) => {
      const ig = igByPage.get(p.page_id);
      return {
        id: p.page_id,
        name: p.name,
        category: p.category,
        pictureUrl: p.picture_url,
        tasks: typeof p.tasks === 'string' ? JSON.parse(p.tasks) : p.tasks || [],
        isSelected: p.page_id === connection.selected_page_id || Boolean(p.is_selected),
        hasInstagram: Boolean(ig),
        instagramAccount: ig
          ? {
              id: ig.instagram_account_id,
              username: ig.username,
              name: ig.name,
              profilePictureUrl: ig.profile_picture_url,
              followersCount: ig.followers_count,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Selects an authorized Facebook Page for publishing.
 * POST /api/v1/brands/:brandId/integrations/meta/select-page
 */
export async function selectPage(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const { pageId } = req.body;

    if (!pageId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'pageId is required.');
    }

    const result = await facebookPagesService.selectPage(brandId, pageId);

    return res.status(200).json({
      success: true,
      message: `Successfully selected Facebook Page "${result.selectedPageName}".`,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Securely imports a Meta Graph API Explorer token for development testing.
 * POST /api/v1/brands/:brandId/integrations/meta/dev-token
 */
export async function importDevToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid token string is required.');
    }

    const brand = await db('brands').where({ id: brandId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');
    }

    const tenantId = req.user?.tenantId || brand.tenant_id;
    const userId = req.user?.userId || (await db('brand_users').where({ brand_id: brandId }).first())?.user_id;

    // Verify token info via debug_token
    let debugInfo: any = null;
    let expiresAt: Date | null = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days fallback
    try {
      debugInfo = await metaTokenManager.debugToken(token);
      if (debugInfo.expiresAt) {
        expiresAt = debugInfo.expiresAt;
      }
    } catch (err) {
      // In development, allow proceeding if token format is plausible
    }

    // Encrypt token
    const encryptedToken = metaTokenManager.encryptToken(token);
    const now = new Date();

    const existingConn = await db('meta_connections').where({ brand_id: brandId }).first();
    let connectionId = existingConn?.id;

    if (existingConn) {
      await db('meta_connections')
        .where({ id: existingConn.id })
        .update({
          meta_user_id: debugInfo?.userId || 'dev_user',
          encrypted_user_access_token: encryptedToken,
          credential_expires_at: expiresAt,
          scopes: JSON.stringify(debugInfo?.scopes || ['pages_show_list', 'pages_manage_posts', 'instagram_content_publish']),
          status: 'connected',
          metadata: JSON.stringify({ isDevelopmentToken: true }),
          updated_at: now,
        });
    } else {
      connectionId = crypto.randomUUID();
      await db('meta_connections').insert({
        id: connectionId,
        tenant_id: tenantId,
        brand_id: brandId,
        user_id: userId,
        provider: 'meta',
        meta_user_id: debugInfo?.userId || 'dev_user',
        encrypted_user_access_token: encryptedToken,
        credential_expires_at: expiresAt,
        scopes: JSON.stringify(debugInfo?.scopes || ['pages_show_list', 'pages_manage_posts', 'instagram_content_publish']),
        status: 'connected',
        require_approval_before_publish: true,
        metadata: JSON.stringify({ isDevelopmentToken: true }),
        created_at: now,
        updated_at: now,
      });
    }

    // Sync pages using development token
    const discoveredPages = await facebookPagesService.syncConnectionPages(connectionId!, token);

    // Auto-select first page if none selected
    if (discoveredPages.length > 0) {
      await facebookPagesService.selectPage(brandId, discoveredPages[0].id);
    }

    return res.status(200).json({
      success: true,
      message: 'Development token securely encrypted and saved. Facebook Pages discovered.',
      data: {
        pageCount: discoveredPages.length,
        pages: discoveredPages,
        tokenMasked: metaTokenManager.maskToken(token),
        expiresAt,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Safely validates the brand's Meta credential without publishing (Requirement 8 & 9).
 * POST /api/v1/brands/:brandId/integrations/meta/validate-token
 */
export async function validateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const result = await metaOAuthService.validateBrandMetaCredential(brandId);

    const httpStatus = result.isValid ? 200 : (result.status === 'expired' || result.status === 'disconnected' ? 401 : 400);

    return res.status(httpStatus).json({
      success: result.isValid,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Tests connection validity, permissions, and API latency.
 * POST /api/v1/brands/:brandId/integrations/meta/test
 */
export async function testMetaConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const start = Date.now();
    const result = await metaOAuthService.validateBrandMetaCredential(brandId);
    const latencyMs = Date.now() - start;

    const connection = await db('meta_connections').where({ brand_id: brandId }).first();
    const tokenEnc = connection?.encrypted_page_access_token || connection?.encrypted_user_access_token;
    const tokenMasked = tokenEnc ? metaTokenManager.maskToken(metaTokenManager.decryptToken(tokenEnc)) : '••••';

    return res.status(result.isValid ? 200 : 401).json({
      success: result.isValid,
      data: {
        isValid: result.isValid,
        latencyMs,
        expiresAt: result.expiresAt,
        scopes: result.scopes || [],
        selectedPageId: result.pageId,
        selectedPageName: result.pageName,
        instagramAccountId: connection?.instagram_account_id,
        tokenMasked,
        error: result.error,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Publishes content immediately or schedules it.
 * POST /api/v1/brands/:brandId/integrations/meta/publish
 */
export async function publishMetaContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const { platform, accountId, text, caption, mediaUrls, scheduledAt, postId, postVariantId } = req.body;

    if (!platform || (!accountId && !brandId)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'platform and accountId/brandId are required.');
    }

    const result = await metaPublishingService.publishSocialPost(
      {
        platform,
        accountId,
        text,
        caption,
        mediaUrls,
        scheduledAt,
        brandId,
        postId,
        postVariantId,
      },
      {
        tenantId: req.user?.tenantId,
        brandId,
        userId: req.user?.userId,
        agentId: 'user_manual_dispatch',
      }
    );

    return res.status(result.success ? 200 : 400).json({
      success: result.success,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * AI Agent Publishing endpoint.
 * POST /api/v1/brands/:brandId/integrations/meta/agent/publish
 */
export async function agentPublish(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const { platform, account_id, text, caption, media_urls, scheduled_at, require_approval } = req.body;

    const result = await metaAgentTool.execute(
      {
        platform,
        brand_id: brandId,
        account_id,
        text,
        caption,
        media_urls,
        scheduled_at,
        require_approval,
        agent_id: 'ai_social_agent',
      },
      req.user?.userId
    );

    return res.status(200).json({
      success: result.success,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lists publishing jobs and their execution status.
 * GET /api/v1/brands/:brandId/integrations/meta/jobs
 */
export async function listPublishingJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const jobs = await db('publishing_jobs')
      .where({ brand_id: brandId })
      .orderBy('created_at', 'desc')
      .limit(50);

    const parsedJobs = jobs.map((job) => ({
      id: job.id,
      platform: job.platform,
      accountId: job.account_id,
      scheduledAt: job.scheduled_at,
      status: job.status,
      attemptCount: job.attempt_count,
      maxAttempts: job.max_attempts,
      nextRetryAt: job.next_retry_at,
      externalPostId: job.external_post_id,
      externalPostUrl: job.external_post_url,
      lastError: job.last_error,
      createdAt: job.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: parsedJobs,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lists audit logs for publishing actions.
 * GET /api/v1/brands/:brandId/integrations/meta/audit-logs
 */
export async function listPublishingAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const logs = await db('publishing_audit_logs')
      .where({ brand_id: brandId })
      .orderBy('timestamp', 'desc')
      .limit(50);

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Updates connection settings (e.g. require_approval_before_publish).
 * PUT /api/v1/brands/:brandId/integrations/meta/settings
 */
export async function updateMetaSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const { requireApprovalBeforePublish } = req.body;

    const connection = await db('meta_connections').where({ brand_id: brandId }).first();
    if (!connection) {
      throw new AppError(404, 'CONNECTION_NOT_FOUND', 'Meta connection not found.');
    }

    await db('meta_connections')
      .where({ id: connection.id })
      .update({
        require_approval_before_publish: Boolean(requireApprovalBeforePublish),
        updated_at: new Date(),
      });

    return res.status(200).json({
      success: true,
      message: 'Meta settings updated.',
      data: {
        requireApprovalBeforePublish: Boolean(requireApprovalBeforePublish),
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Disconnects Meta connection and safely purges credentials.
 * POST /api/v1/brands/:brandId/integrations/meta/disconnect
 */
export async function disconnectMeta(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    const connection = await db('meta_connections').where({ brand_id: brandId }).first();
    if (!connection) {
      throw new AppError(404, 'CONNECTION_NOT_FOUND', 'No Meta connection found.');
    }

    // Safely delete connection and cascade to pages/accounts
    await db('meta_connections').where({ id: connection.id }).del();

    // Mark Facebook and Instagram in social_accounts as inactive
    await db('social_accounts')
      .where({ brand_id: brandId })
      .whereIn('platform', ['facebook', 'instagram'])
      .update({
        is_active: false,
        updated_at: new Date(),
      });

    return res.status(200).json({
      success: true,
      message: 'Meta credentials purged and account disconnected successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Initiates the Meta reconnect flow for a specific brand (Requirement 2 & 3).
 * GET /api/v1/brands/:brandId/integrations/meta/reconnect
 * POST /api/v1/brands/:brandId/integrations/meta/reconnect
 */
export async function getReconnectUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;
    const brand = await db('brands').where({ id: brandId }).first();
    if (!brand) {
      throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');
    }
    const tenantId = req.user?.tenantId || brand.tenant_id;
    const userId = req.user?.userId || (await db('brand_users').where({ brand_id: brandId }).first())?.user_id;

    const authUrl = metaOAuthService.getAuthorizationUrl(tenantId, brandId, userId);

    return res.status(200).json({
      success: true,
      data: {
        authorizationUrl: authUrl,
        brandId,
        reconnect: true,
      },
    });
  } catch (err) {
    return next(err);
  }
}
