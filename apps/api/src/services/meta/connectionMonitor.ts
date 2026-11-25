import { db } from '../../db/connection.js';
import { decryptSecret, isEncryptedSecret } from '../cryptoVault.js';
import { metaTokenManager } from './tokenManager.js';
import { normalizeMetaError, redactTokens } from './errors.js';

export interface MetaConnectionHealthInfo {
  brandId: string;
  status: 'connected' | 'reauth_required' | 'permission_required' | 'disconnected' | 'temporary_error';
  tokenValid: boolean;
  tokenExpiresAt: Date | null;
  selectedPageId: string | null;
  selectedPageName: string | null;
  instagramAccountId: string | null;
  instagramUsername: string | null;
  scopes: string[];
  reauthorizationRequired: boolean;
  lastValidatedAt: string;
  lastFailureCode?: string | number | null;
  lastFailureMessage?: string | null;
  lastFailureTimestamp?: string | null;
  lastSuccessfulPublishAt?: string | null;
}

export class ConnectionMonitorService {
  /**
   * Performs a strictly read-only health check of the Meta connection for a brand.
   * Does NOT publish anything. Updates database connection status and observability metadata.
   */
  public async checkConnectionHealth(brandId: string): Promise<MetaConnectionHealthInfo> {
    const now = new Date();
    const connection = await db('meta_connections').where({ brand_id: brandId }).first();

    if (!connection) {
      return {
        brandId,
        status: 'disconnected',
        tokenValid: false,
        tokenExpiresAt: null,
        selectedPageId: null,
        selectedPageName: null,
        instagramAccountId: null,
        instagramUsername: null,
        scopes: [],
        reauthorizationRequired: true,
        lastValidatedAt: now.toISOString(),
        lastFailureCode: 'NO_CONNECTION',
        lastFailureMessage: 'No Meta connection registered for this brand.',
        lastFailureTimestamp: now.toISOString(),
      };
    }

    let rawToken = connection.encrypted_page_access_token || connection.encrypted_user_access_token;
    if (rawToken && isEncryptedSecret(rawToken)) {
      try {
        rawToken = decryptSecret(rawToken);
      } catch (err: any) {
        rawToken = null;
      }
    }

    if (!rawToken) {
      await db('meta_connections').where({ id: connection.id }).update({
        status: 'reauth_required',
        updated_at: now,
      });

      return {
        brandId,
        status: 'reauth_required',
        tokenValid: false,
        tokenExpiresAt: null,
        selectedPageId: connection.selected_page_id,
        selectedPageName: connection.selected_page_name,
        instagramAccountId: connection.instagram_account_id,
        instagramUsername: connection.instagram_username,
        scopes: [],
        reauthorizationRequired: true,
        lastValidatedAt: now.toISOString(),
        lastFailureCode: 'CORRUPTED_TOKEN',
        lastFailureMessage: 'Unable to decrypt stored access token.',
        lastFailureTimestamp: now.toISOString(),
      };
    }

    // Inspect token with debug_token
    try {
      const debugInfo = await metaTokenManager.debugToken(rawToken);
      const scopes = debugInfo.scopes || [];
      const hasPagePosts = scopes.includes('pages_manage_posts');
      const hasPageRead = scopes.includes('pages_read_engagement');
      const hasIgPublish = scopes.includes('instagram_content_publish');

      const isTokenExpired = debugInfo.neverExpires
        ? false
        : (debugInfo.expiresAt
            ? metaTokenManager.isTokenExpired(debugInfo.expiresAt)
            : (connection.credential_expires_at
                ? metaTokenManager.isTokenExpired(connection.credential_expires_at)
                : false));

      let newStatus: 'connected' | 'reauth_required' | 'permission_required' | 'temporary_error' = 'connected';
      let failureCode: string | number | null = null;
      let failureMessage: string | null = null;

      if (!debugInfo.isValid || isTokenExpired) {
        newStatus = 'reauth_required';
        failureCode = debugInfo.errorCode || 190;
        failureMessage = isTokenExpired
          ? 'Facebook Page: inactive connection; Meta OAuth Error 190 (expired session/token). Re-authorization is required.'
          : (debugInfo.errorMessage || 'Access token has expired or was revoked.');
      } else if (!hasPagePosts || !hasPageRead) {
        newStatus = 'permission_required';
        failureCode = 'MISSING_PAGE_SCOPES';
        failureMessage = 'Missing pages_manage_posts or pages_read_engagement scope.';
      }

      // Check existing metadata
      let meta: any = {};
      try {
        meta = typeof connection.metadata === 'string' ? JSON.parse(connection.metadata || '{}') : connection.metadata || {};
      } catch {
        meta = {};
      }

      const updatedMeta = {
        ...meta,
        last_validated_at: now.toISOString(),
        last_failure_code: failureCode || meta.last_failure_code,
        last_failure_at: failureMessage ? now.toISOString() : meta.last_failure_at,
        reauth_required: newStatus === 'reauth_required',
      };

      const resolvedExpiresAt = debugInfo.neverExpires
        ? null
        : (debugInfo.expiresAt || connection.credential_expires_at);

      await db('meta_connections').where({ id: connection.id }).update({
        status: newStatus,
        metadata: JSON.stringify(updatedMeta),
        credential_expires_at: resolvedExpiresAt,
        scopes: JSON.stringify(scopes),
        updated_at: now,
      });

      // Synchronize social_accounts table active status and verified token expiration
      const isAccountActive = newStatus === 'connected';
      const socialAccountUpdate: Record<string, any> = {
        is_active: isAccountActive,
        updated_at: now,
      };
      if (debugInfo.neverExpires) {
        socialAccountUpdate.token_expires_at = null;
      } else if (debugInfo.expiresAt) {
        socialAccountUpdate.token_expires_at = debugInfo.expiresAt;
      }

      await db('social_accounts')
        .where({ brand_id: brandId, platform: 'facebook' })
        .update(socialAccountUpdate);

      const isRealIgAccount = Boolean(
        connection.instagram_account_id &&
        !connection.instagram_account_id.startsWith('sb_') &&
        !connection.instagram_account_id.startsWith('mock_')
      );

      if (isRealIgAccount) {
        await db('social_accounts')
          .where({ brand_id: brandId, platform: 'instagram' })
          .whereNot('account_id', 'like', 'sb_%')
          .update({
            ...socialAccountUpdate,
            is_active: isAccountActive && hasIgPublish,
          });
      } else {
        // Deactivate live Instagram if no valid professional account is linked
        await db('social_accounts')
          .where({ brand_id: brandId, platform: 'instagram' })
          .update({
            is_active: false,
            updated_at: now,
          });
      }

      return {
        brandId,
        status: newStatus,
        tokenValid: debugInfo.isValid,
        tokenExpiresAt: debugInfo.expiresAt,
        selectedPageId: connection.selected_page_id,
        selectedPageName: connection.selected_page_name,
        instagramAccountId: connection.instagram_account_id,
        instagramUsername: connection.instagram_username,
        scopes,
        reauthorizationRequired: newStatus === 'reauth_required',
        lastValidatedAt: now.toISOString(),
        lastFailureCode: failureCode,
        lastFailureMessage: failureMessage ? redactTokens(failureMessage) : null,
        lastFailureTimestamp: failureMessage ? now.toISOString() : meta.last_failure_at || null,
        lastSuccessfulPublishAt: meta.last_publish_at || null,
      };
    } catch (err: any) {
      const normalized = normalizeMetaError(err);
      const isTransient = normalized.isTransient;
      const newStatus = isTransient ? 'temporary_error' : 'reauth_required';

      let meta: any = {};
      try {
        meta = typeof connection.metadata === 'string' ? JSON.parse(connection.metadata || '{}') : connection.metadata || {};
      } catch {
        meta = {};
      }

      const updatedMeta = {
        ...meta,
        last_validated_at: now.toISOString(),
        last_failure_code: normalized.rawMetaCode || normalized.code,
        last_failure_at: now.toISOString(),
        lastError: {
          code: normalized.code,
          metaCode: normalized.rawMetaCode,
          metaSubcode: normalized.metaSubcode,
          message: normalized.safeMessage,
          reauthRequired: newStatus === 'reauth_required',
          checkedAt: now.toISOString(),
        },
        reauth_required: newStatus === 'reauth_required',
      };

      await db('meta_connections').where({ id: connection.id }).update({
        status: newStatus,
        metadata: JSON.stringify(updatedMeta),
        updated_at: now,
      });

      await db('social_accounts')
        .where({ brand_id: brandId })
        .whereIn('platform', ['facebook', 'instagram'])
        .update({
          is_active: false,
          updated_at: now,
        });

      return {
        brandId,
        status: newStatus,
        tokenValid: false,
        tokenExpiresAt: null,
        selectedPageId: connection.selected_page_id,
        selectedPageName: connection.selected_page_name,
        instagramAccountId: connection.instagram_account_id,
        instagramUsername: connection.instagram_username,
        scopes: [],
        reauthorizationRequired: newStatus === 'reauth_required',
        lastValidatedAt: now.toISOString(),
        lastFailureCode: normalized.rawMetaCode || normalized.code,
        lastFailureMessage: normalized.safeMessage,
        lastFailureTimestamp: now.toISOString(),
      };
    }
  }
}

export const connectionMonitorService = new ConnectionMonitorService();
