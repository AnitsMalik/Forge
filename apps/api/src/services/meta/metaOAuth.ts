import crypto from 'crypto';
import { config } from '../../config/index.js';
import { db } from '../../db/connection.js';
import { metaTokenManager } from './tokenManager.js';
import { facebookPagesService } from './facebookPages.js';
import { MetaIntegrationError, normalizeMetaError } from './errors.js';

export interface StatePayload {
  tenantId: string;
  brandId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

export interface MetaCredentialValidationResult {
  isValid: boolean;
  status: 'connected' | 'expired' | 'disconnected' | 'invalid';
  pageId?: string;
  pageName?: string;
  scopes?: string[];
  expiresAt?: Date | null;
  error?: {
    code: string;
    metaCode?: number;
    metaSubcode?: number;
    userMessage: string;
  };
}

export class MetaOAuthService {
  private secretKey: string;
  private inflightCallbacks = new Map<string, Promise<any>>();
  private completedCallbacks = new Map<string, { result: any; expiresAt: number }>();

  constructor() {
    this.secretKey = config.jwtSecret || config.encryptionMasterKey || 'socialforge_meta_oauth_secret';

    // Periodically prune completed callback cache every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.completedCallbacks.entries()) {
        if (now > item.expiresAt) {
          this.completedCallbacks.delete(key);
        }
      }
    }, 2 * 60 * 1000).unref();
  }

  /**
   * Generates a tamper-proof CSRF state string signed with HMAC-SHA256.
   */
  public generateState(tenantId: string, brandId: string, userId: string): string {
    const payload: StatePayload = {
      tenantId,
      brandId,
      userId,
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
   * Validates a CSRF state token and decodes the tenant, brand, and user context.
   */
  public validateState(stateString: string): {
    valid: boolean;
    tenantId?: string;
    brandId?: string;
    userId?: string;
    error?: string;
  } {
    if (!stateString || typeof stateString !== 'string') {
      return { valid: false, error: 'State parameter is missing' };
    }

    const parts = stateString.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed state parameter' };
    }

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(data)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'State HMAC signature mismatch (CSRF warning)' };
    }

    try {
      const payload: StatePayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));

      // Check state expiration (15 minutes)
      const maxAgeMs = 15 * 60 * 1000;
      if (Date.now() - payload.timestamp > maxAgeMs) {
        return { valid: false, error: 'OAuth authorization request has expired. Please initiate again.' };
      }

      return {
        valid: true,
        tenantId: payload.tenantId,
        brandId: payload.brandId,
        userId: payload.userId,
      };
    } catch {
      return { valid: false, error: 'Failed to decode state payload JSON' };
    }
  }

  /**
   * Constructs the official Meta OAuth authorization URL.
   * Permissions requested adhere strictly to current Meta Graph API docs:
   * - pages_show_list
   * - pages_read_engagement
   * - pages_manage_posts
   * - instagram_basic
   * - instagram_content_publish
   * - public_profile
   */
  public getAuthorizationUrl(tenantId: string, brandId: string, userId: string): string {
    const appId = config.meta.appId;
    const version = config.meta.graphApiVersion || 'v20.0';
    const redirectUri = config.meta.oauthRedirectUri;

    const state = this.generateState(tenantId, brandId, userId);

    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
      'public_profile',
    ].join(',');

    const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
    url.searchParams.append('client_id', appId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('state', state);
    url.searchParams.append('scope', scopes);
    url.searchParams.append('response_type', 'code');

    return url.toString();
  }

  /**
   * Handles the OAuth callback:
   * 1. Validates CSRF state
   * 2. Exchanges code for short-lived token
   * 3. Exchanges short-lived token for long-lived token (60 days)
   * 4. Inspects token via debug_token
   * 5. Saves encrypted credentials
   * 6. Discovers and syncs Facebook Pages & connected Instagram accounts
   */
  public async handleCallback(code: string, state: string): Promise<any> {
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${code}:${state}`)
      .digest('hex');

    // 1. Check if this callback was already completed recently (replay idempotency)
    const completed = this.completedCallbacks.get(idempotencyKey);
    if (completed && Date.now() < completed.expiresAt) {
      return completed.result;
    }

    // 2. Check if this callback is currently inflight (prevent duplicate concurrent executions)
    const existingInflight = this.inflightCallbacks.get(idempotencyKey);
    if (existingInflight) {
      return await existingInflight;
    }

    // 3. Execute with lock tracking and result caching
    const executionPromise = this.processCallbackInternal(code, state);
    this.inflightCallbacks.set(idempotencyKey, executionPromise);

    try {
      const result = await executionPromise;
      this.completedCallbacks.set(idempotencyKey, {
        result,
        expiresAt: Date.now() + 60 * 1000,
      });
      return result;
    } finally {
      this.inflightCallbacks.delete(idempotencyKey);
    }
  }

  private async processCallbackInternal(code: string, state: string): Promise<any> {
    const validation = this.validateState(state);
    if (!validation.valid || !validation.brandId || !validation.tenantId) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: `OAuth state validation failed: ${validation.error || 'Invalid state'}`,
        httpStatus: 400,
        isTransient: false,
      });
    }

    const { tenantId, brandId, userId } = validation;

    // 1. Exchange code for short-lived user token
    const shortLived = await metaTokenManager.exchangeCodeForToken(code);

    // 2. Exchange for long-lived user token (60-day)
    let longLivedToken = shortLived.accessToken;
    let expiresAt: Date | null = new Date(Date.now() + shortLived.expiresIn * 1000);

    try {
      const longLived = await metaTokenManager.exchangeForLongLivedToken(shortLived.accessToken);
      longLivedToken = longLived.accessToken;
      expiresAt = new Date(Date.now() + longLived.expiresIn * 1000);
    } catch (err) {
      console.warn('Long-lived token exchange failed, using short-lived token:', err);
    }

    // 3. Inspect token with debug_token
    let debugInfo: any = null;
    try {
      debugInfo = await metaTokenManager.debugToken(longLivedToken);
      if (debugInfo.expiresAt) {
        expiresAt = debugInfo.expiresAt;
      }
    } catch {
      // Non-critical
    }

    // 4. Encrypt user token
    const encryptedUserToken = metaTokenManager.encryptToken(longLivedToken);
    const now = new Date();

    // 5. Upsert meta_connections for this brand
    const existingConn = await db('meta_connections').where({ brand_id: brandId }).first();
    let connectionId = existingConn?.id;

    if (existingConn) {
      await db('meta_connections')
        .where({ id: existingConn.id })
        .update({
          meta_user_id: debugInfo?.userId || existingConn.meta_user_id,
          encrypted_user_access_token: encryptedUserToken,
          credential_expires_at: expiresAt,
          scopes: JSON.stringify(debugInfo?.scopes || []),
          status: 'connected',
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
        meta_user_id: debugInfo?.userId || null,
        encrypted_user_access_token: encryptedUserToken,
        credential_expires_at: expiresAt,
        scopes: JSON.stringify(debugInfo?.scopes || []),
        status: 'connected',
        require_approval_before_publish: true,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      });
    }

    // 6. Discover and sync all Facebook Pages and Instagram accounts with error resilience
    let discoveredPages: any[] = [];
    try {
      discoveredPages = await facebookPagesService.syncConnectionPages(
        connectionId!,
        longLivedToken
      );
    } catch (syncErr: any) {
      console.warn(
        '[MetaOAuth Callback] Page sync encountered error; credentials securely stored:',
        syncErr?.message
      );
    }

    // 7. Automatic invalidation & replacement on reauthorization
    // Priority:
    // a) HOASP International Page ID '1405588742634526'
    // b) Previously selected page if still discovered
    // c) First discovered page
    const updatedConn = await db('meta_connections').where({ id: connectionId }).first();
    const targetPageId = '1405588742634526';
    let pageToSelect = discoveredPages.find((p) => p.id === targetPageId);
    if (!pageToSelect && updatedConn?.selected_page_id) {
      pageToSelect = discoveredPages.find((p) => p.id === updatedConn.selected_page_id);
    }
    if (!pageToSelect && discoveredPages.length > 0) {
      pageToSelect = discoveredPages[0];
    }

    if (pageToSelect) {
      try {
        await facebookPagesService.selectPage(brandId, pageToSelect.id);
      } catch (selErr: any) {
        console.warn('[MetaOAuth Callback] Page auto-selection error:', selErr?.message);
      }
    }

    return {
      success: true,
      brandId,
      connectionId,
      pageCount: discoveredPages.length,
      pages: discoveredPages,
    };
  }

  /**
   * Safely checks the brand's Meta credential without publishing (Requirement 8 & 9).
   * Stores structured error code/subcode in metadata and DB without logging secrets.
   */
  public async validateBrandMetaCredential(brandId: string): Promise<MetaCredentialValidationResult> {
    const conn = await db('meta_connections').where({ brand_id: brandId }).first();
    if (!conn) {
      return {
        isValid: false,
        status: 'disconnected',
        error: {
          code: 'META_AUTH_REQUIRED',
          userMessage: 'No Meta connection found for this brand.',
        },
      };
    }

    // Determine target page access token
    let targetTokenEnc = conn.encrypted_page_access_token;
    const targetPageId = conn.selected_page_id;
    let targetPageName = conn.selected_page_name;

    if (!targetTokenEnc && targetPageId) {
      const pageRec = await db('meta_facebook_pages')
        .where({ connection_id: conn.id, page_id: targetPageId })
        .first();
      if (pageRec?.encrypted_access_token) {
        targetTokenEnc = pageRec.encrypted_access_token;
        targetPageName = pageRec.name;
      }
    }

    if (!targetTokenEnc) {
      targetTokenEnc = conn.encrypted_user_access_token;
    }

    if (!targetTokenEnc) {
      return {
        isValid: false,
        status: 'invalid',
        error: {
          code: 'MISSING_CREDENTIALS',
          userMessage: 'No Meta access token stored for this connection.',
        },
      };
    }

    // Check expiration timestamp
    if (metaTokenManager.isTokenExpired(conn.credential_expires_at)) {
      const now = new Date();
      const existingMeta = typeof conn.metadata === 'string' ? JSON.parse(conn.metadata || '{}') : (conn.metadata || {});
      await db('meta_connections').where({ id: conn.id }).update({
        status: 'expired',
        metadata: JSON.stringify({
          ...existingMeta,
          lastError: {
            code: 'META_TOKEN_EXPIRED',
            metaCode: 190,
            metaSubcode: 463,
            message: 'Your Meta access token has expired. Please re-authorize SocialForge in Social Channels.',
            checkedAt: now.toISOString(),
          },
        }),
        updated_at: now,
      });

      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .update({ is_active: false, updated_at: now });

      return {
        isValid: false,
        status: 'expired',
        pageId: targetPageId,
        pageName: targetPageName,
        expiresAt: conn.credential_expires_at,
        error: {
          code: 'META_TOKEN_EXPIRED',
          metaCode: 190,
          metaSubcode: 463,
          userMessage: 'Your Meta access token has expired. Please re-authorize SocialForge in Social Channels.',
        },
      };
    }

    // Safely validate token against Meta without publishing
    try {
      const decryptedToken = metaTokenManager.decryptToken(targetTokenEnc);
      const debugInfo = await metaTokenManager.debugToken(decryptedToken);

      if (!debugInfo.isValid) {
        const now = new Date();
        const existingMeta = typeof conn.metadata === 'string' ? JSON.parse(conn.metadata || '{}') : (conn.metadata || {});
        const isExpired = debugInfo.errorSubcode === 463 || (debugInfo.errorMessage && /expired/i.test(debugInfo.errorMessage));
        const status = isExpired ? 'expired' : 'disconnected';
        const code = isExpired ? 'META_TOKEN_EXPIRED' : 'META_AUTH_REQUIRED';
        const userMsg = isExpired
          ? 'Your Meta access token has expired. Please re-authorize SocialForge in Social Channels.'
          : 'Your Meta connection needs to be re-authorized. Please reconnect your Facebook Page in Social Channels.';

        await db('meta_connections').where({ id: conn.id }).update({
          status,
          metadata: JSON.stringify({
            ...existingMeta,
            lastError: {
              code,
              metaCode: debugInfo.errorCode || 190,
              metaSubcode: debugInfo.errorSubcode,
              message: userMsg,
              checkedAt: now.toISOString(),
            },
          }),
          updated_at: now,
        });

        await db('social_accounts')
          .where({ brand_id: brandId, platform: 'facebook' })
          .update({ is_active: false, updated_at: now });

        return {
          isValid: false,
          status,
          pageId: targetPageId,
          pageName: targetPageName,
          expiresAt: debugInfo.expiresAt || conn.credential_expires_at,
          error: {
            code,
            metaCode: debugInfo.errorCode || 190,
            metaSubcode: debugInfo.errorSubcode,
            userMessage: userMsg,
          },
        };
      }

      // Token is valid!
      const now = new Date();
      const existingMeta = typeof conn.metadata === 'string' ? JSON.parse(conn.metadata || '{}') : (conn.metadata || {});
      const resolvedExpiresAt = debugInfo.neverExpires ? null : (debugInfo.expiresAt || conn.credential_expires_at);
      await db('meta_connections').where({ id: conn.id }).update({
        status: 'connected',
        credential_expires_at: resolvedExpiresAt,
        metadata: JSON.stringify({
          ...existingMeta,
          lastValidated: now.toISOString(),
          lastError: null,
        }),
        updated_at: now,
      });

      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .update({ is_active: true, token_expires_at: resolvedExpiresAt, updated_at: now });

      return {
        isValid: true,
        status: 'connected',
        pageId: targetPageId,
        pageName: targetPageName,
        scopes: debugInfo.scopes,
        expiresAt: resolvedExpiresAt,
      };
    } catch (err: any) {
      const normalized = normalizeMetaError(err);
      return {
        isValid: false,
        status: 'expired',
        error: {
          code: normalized.code,
          metaCode: normalized.rawMetaCode || 190,
          metaSubcode: normalized.metaSubcode,
          userMessage: normalized.userMessage,
        },
      };
    }
  }
}

export const metaOAuthService = new MetaOAuthService();

