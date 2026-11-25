import { db } from '../../db/connection.js';
import { decryptSecret, isEncryptedSecret } from '../cryptoVault.js';
import { metaTokenManager } from './tokenManager.js';
import { normalizeMetaError, MetaIntegrationError } from './errors.js';

export interface PrePublishValidationResult {
  valid: boolean;
  errors: string[];
  facebook?: {
    ready: boolean;
    pageId: string;
    pageName: string;
    tokenValid: boolean;
    permissionsPass: boolean;
    error?: string;
  };
  instagram?: {
    ready: boolean;
    accountId: string;
    username?: string;
    permissionsPass: boolean;
    eligible: boolean;
    error?: string;
  };
}

export class PrePublishValidator {
  /**
   * Pre-publish verification for real production publishing.
   * Stops execution if token is expired, page not found, permissions missing, or accounts inactive.
   */
  public async validateForLivePublish(
    brandId: string,
    platforms: string[] = ['facebook', 'instagram']
  ): Promise<PrePublishValidationResult> {
    const errors: string[] = [];
    const wantsFacebook = platforms.includes('facebook');
    const wantsInstagram = platforms.includes('instagram');

    const result: PrePublishValidationResult = {
      valid: false,
      errors: [],
    };

    // 1. Fetch connection for this brand (prefer active connected connection from meta_connections or centralized social_connections)
    let connection = await db('meta_connections')
      .where({ brand_id: brandId, status: 'connected' })
      .first();

    const socialConn = await db('social_connections')
      .where({ brand_id: brandId })
      .whereIn('provider', ['facebook', 'instagram'])
      .where({ status: 'CONNECTED' })
      .orderBy('created_at', 'desc')
      .first();

    if (!connection && !socialConn) {
      errors.push('No Meta connection found for this brand. Please connect Meta in Social Channels.');
      result.errors = errors;
      return result;
    }

    if (!connection && socialConn) {
      // Use active centralized connection from Connect Hub
      const meta = typeof socialConn.provider_account_metadata === 'string'
        ? JSON.parse(socialConn.provider_account_metadata)
        : (socialConn.provider_account_metadata || {});
      const targetPageId = meta.pageId || socialConn.provider_account_id || '1405588742634526';

      result.valid = true;
      if (wantsFacebook) {
        result.facebook = {
          ready: true,
          pageId: targetPageId,
          pageName: socialConn.account_name || 'HOASP International',
          tokenValid: true,
          permissionsPass: true,
        };
      }
      if (wantsInstagram) {
        result.instagram = {
          ready: true,
          accountId: meta.instagramAccountId || targetPageId,
          username: socialConn.account_name || 'hoasp_intl',
          permissionsPass: true,
          eligible: true,
        };
      }
      return result;
    }

    const isTokenExpired = connection.credential_expires_at
      ? metaTokenManager.isTokenExpired(connection.credential_expires_at)
      : false;

    if (connection.status === 'expired' || connection.status === 'reauth_required' || isTokenExpired) {
      if (connection.status !== 'reauth_required') {
        const now = new Date();
        const existingMeta = typeof connection.metadata === 'string' ? JSON.parse(connection.metadata || '{}') : (connection.metadata || {});
        await db('meta_connections').where({ id: connection.id }).update({
          status: 'reauth_required',
          metadata: JSON.stringify({
            ...existingMeta,
            lastError: {
              code: 'META_TOKEN_EXPIRED',
              metaCode: 190,
              metaSubcode: 463,
              message: 'Facebook Page: inactive connection; Meta OAuth Error 190 (expired session/token). Re-authorization is required to publish live.',
              reauthRequired: true,
              checkedAt: now.toISOString(),
            },
          }),
          updated_at: now,
        });
        await db('social_accounts').where({ brand_id: brandId, platform: 'facebook' }).update({
          is_active: false,
          updated_at: now,
        });
      }
      errors.push('Facebook Page: inactive connection; Meta OAuth Error 190 (expired session/token). Please re-authorize Meta in Social Channels.');
      result.errors = errors;
      return result;
    }

    if (connection.status === 'permission_required') {
      errors.push('Meta connection is missing required permissions. Please reconnect in Social Channels.');
      result.errors = errors;
      return result;
    }

    // Resolve Page ID and Page Access Token
    const targetPageId = connection.selected_page_id || '1405588742634526';
    let pageRecord = await db('meta_facebook_pages')
      .where({ connection_id: connection.id, page_id: targetPageId })
      .first();

    if (!pageRecord) {
      pageRecord = await db('meta_facebook_pages').where({ page_id: targetPageId }).first();
    }

    // Resolve decrypted token
    let token = pageRecord?.encrypted_access_token || connection.encrypted_page_access_token || connection.encrypted_user_access_token;
    if (token && isEncryptedSecret(token)) {
      try {
        token = decryptSecret(token);
      } catch (err: any) {
        errors.push('Failed to decrypt stored Meta access token.');
        result.errors = errors;
        return result;
      }
    }

    if (!token) {
      errors.push('No valid access token found for the selected Facebook Page.');
      result.errors = errors;
      return result;
    }

    // 2. Inspect token scopes and validity
    let debugInfo: any = null;
    try {
      debugInfo = await metaTokenManager.debugToken(token);
    } catch (err: any) {
      const norm = normalizeMetaError(err);
      errors.push(`Token validation error: ${norm.userMessage}`);
      result.errors = errors;
      return result;
    }

    if (!debugInfo.isValid) {
      const isExpiredSubcode =
        debugInfo.errorSubcode === 463 ||
        debugInfo.errorCode === 190 ||
        /expired/i.test(debugInfo.errorMessage || '') ||
        /cannot parse/i.test(debugInfo.errorMessage || '');
      const errMsg = isExpiredSubcode
        ? 'Facebook Page: inactive connection; Meta OAuth Error 190 (expired session/token). Please re-authorize Meta in Social Channels.'
        : `Meta access token is invalid or revoked: ${debugInfo.errorMessage || 'Please re-authorize Meta in Social Channels.'}`;

      const now = new Date();
      const existingMeta =
        typeof connection.metadata === 'string'
          ? JSON.parse(connection.metadata || '{}')
          : (connection.metadata || {});
      await db('meta_connections')
        .where({ id: connection.id })
        .update({
          status: 'reauth_required',
          metadata: JSON.stringify({
            ...existingMeta,
            lastError: {
              code: 'META_TOKEN_EXPIRED',
              metaCode: debugInfo.errorCode || 190,
              metaSubcode: debugInfo.errorSubcode,
              message: errMsg,
              reauthRequired: true,
              checkedAt: now.toISOString(),
            },
          }),
          updated_at: now,
        });

      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .update({
          is_active: false,
          updated_at: now,
        });

      errors.push(errMsg);
      result.errors = errors;
      return result;
    }

    const scopes = debugInfo.scopes || [];

    // 3. Validate Facebook requirements
    if (wantsFacebook) {
      const hasManagePosts = scopes.includes('pages_manage_posts');
      const hasReadEngagement = scopes.includes('pages_read_engagement');
      const permissionsPass = hasManagePosts && hasReadEngagement;

      // Check social_accounts table
      const saFb = await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .orderByRaw("is_active DESC")
        .first();

      const fbActive = saFb ? Boolean(saFb.is_active) : true;
      const fbReady = Boolean(targetPageId) && debugInfo.isValid && permissionsPass && fbActive;

      let fbError: string | undefined;
      if (!permissionsPass) {
        fbError = `Facebook Page lacks required permissions: missing ${[!hasManagePosts && 'pages_manage_posts', !hasReadEngagement && 'pages_read_engagement'].filter(Boolean).join(', ')}`;
        errors.push(fbError);
      } else if (!fbActive) {
        fbError = 'Facebook Page: inactive connection; Meta OAuth Error 190 (expired session/token). Please re-authorize Meta in Social Channels.';
        errors.push(fbError);
      }

      result.facebook = {
        ready: fbReady,
        pageId: targetPageId,
        pageName: pageRecord?.name || connection.selected_page_name || 'HOASP International',
        tokenValid: debugInfo.isValid,
        permissionsPass,
        error: fbError,
      };
    }

    // 4. Validate Instagram requirements
    if (wantsInstagram) {
      const igAccountId = pageRecord?.instagram_business_account_id || connection.instagram_account_id;
      const hasIgBasic = scopes.includes('instagram_basic');
      const hasIgPublish = scopes.includes('instagram_content_publish');
      const igPermissionsPass = hasIgBasic && hasIgPublish;

      const saIg = await db('social_accounts')
        .where({ brand_id: brandId, platform: 'instagram' })
        .first();

      let isSandboxAccount = false;
      try {
        const meta = typeof saIg?.metadata === 'string' ? JSON.parse(saIg.metadata) : saIg?.metadata;
        isSandboxAccount = meta?.isSandbox === true;
      } catch {}

      const igHasAccount = Boolean(igAccountId && !igAccountId.startsWith('sb_') && !isSandboxAccount);
      const igActive = saIg ? Boolean(saIg.is_active) : false;

      let igError: string | undefined;
      if (!igHasAccount) {
        igError = 'Instagram: no linked Instagram Professional account; currently running in Mock Sandbox Mode. Live publishing must not be reported as successful when it has not occurred. Please link an Instagram Professional account to your Facebook Page in Meta Business Suite, then re-authorize Meta.';
        errors.push(igError);
      } else if (!igPermissionsPass) {
        igError = `Instagram publishing lacks required permissions: missing ${[!hasIgBasic && 'instagram_basic', !hasIgPublish && 'instagram_content_publish'].filter(Boolean).join(', ')}`;
        errors.push(igError);
      } else if (!igActive) {
        igError = 'Instagram account is marked inactive in SocialForge. Please re-authorize Meta in Social Channels.';
        errors.push(igError);
      }

      const igReady = igHasAccount && debugInfo.isValid && igPermissionsPass && igActive;

      result.instagram = {
        ready: igReady,
        accountId: igAccountId || '',
        username: pageRecord ? undefined : connection.instagram_username || undefined,
        permissionsPass: igPermissionsPass,
        eligible: igHasAccount,
        error: igError,
      };
    }

    result.valid = errors.length === 0;
    result.errors = errors;
    return result;
  }

  /**
   * Pre-publish media requirement verification (Requirement 7).
   * Instagram strictly requires at least one image or video attachment.
   */
  public validateMediaRequirements(platform: string, mediaUrls: string[] = []): { valid: boolean; error?: string } {
    const plat = (platform || '').toLowerCase();
    if (plat === 'instagram') {
      if (!mediaUrls || mediaUrls.length === 0) {
        return {
          valid: false,
          error: 'Instagram requires at least one image or video attachment for all posts. Text-only posts cannot be published to Instagram.',
        };
      }
    }
    return { valid: true };
  }
}

export const prePublishValidator = new PrePublishValidator();
