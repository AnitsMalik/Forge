import { config } from '../../config/index.js';
import { encryptSecret, decryptSecret, maskSecret, isEncryptedSecret } from '../cryptoVault.js';
import { metaClient } from './metaClient.js';
import { MetaIntegrationError } from './errors.js';

export interface DebugTokenResult {
  isValid: boolean;
  userId: string;
  appId: string;
  scopes: string[];
  expiresAt: Date | null;
  neverExpires?: boolean;
  dataAccessExpiresAt: Date | null;
  errorCode?: number;
  errorSubcode?: number;
  errorMessage?: string;
}

export class MetaTokenManager {
  /**
   * Encrypts a plaintext Meta token using AES-256-GCM.
   */
  public encryptToken(token: string): string {
    if (!token) return '';
    return encryptSecret(token);
  }

  /**
   * Decrypts an encrypted token.
   */
  public decryptToken(encryptedOrRaw: string): string {
    if (!encryptedOrRaw) return '';
    if (isEncryptedSecret(encryptedOrRaw)) {
      return decryptSecret(encryptedOrRaw);
    }
    return encryptedOrRaw;
  }

  /**
   * Returns a safe masked representation (e.g. ••••••••abcd).
   */
  public maskToken(token: string): string {
    return maskSecret(token);
  }

  /**
   * Exchanges an authorization code for a short-lived user access token.
   */
  public async exchangeCodeForToken(
    code: string,
    redirectUri?: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const appId = config.meta.appId;
    const appSecret = config.meta.appSecret;
    const finalRedirect = redirectUri || config.meta.oauthRedirectUri;

    if (code.startsWith('mock_') || config.meta.testMode) {
      return {
        accessToken: 'mock_code_exchanged_token',
        expiresIn: 3600,
      };
    }

    if (!appId || !appSecret) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'Meta App ID and Secret are not configured on this server.',
        httpStatus: 500,
        isTransient: false,
      });
    }

    const data: any = await metaClient.get('oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: finalRedirect,
      code,
    });

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
    };
  }

  /**
   * Exchanges a short-lived token for a long-lived (60-day) user access token.
   * Endpoint: GET /oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...
   */
  public async exchangeForLongLivedToken(
    shortLivedToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const appId = config.meta.appId;
    const appSecret = config.meta.appSecret;

    if (shortLivedToken.startsWith('mock_') || config.meta.testMode) {
      return {
        accessToken: 'mock_long_lived_60d_token',
        expiresIn: 5184000, // 60 days
      };
    }

    if (!appId || !appSecret) {
      throw new MetaIntegrationError({
        code: 'META_AUTH_REQUIRED',
        userMessage: 'Meta App ID and Secret are required to obtain a long-lived access token.',
        httpStatus: 500,
        isTransient: false,
      });
    }

    const data: any = await metaClient.get('oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000,
    };
  }

  public async debugToken(inputToken: string): Promise<DebugTokenResult> {
    const appId = config.meta.appId || '1785874552561096';
    const appSecret = config.meta.appSecret || 'mock_secret';
    const appToken = `${appId}|${appSecret}`;

    try {
      const data: any = await metaClient.get(
        'debug_token',
        { input_token: inputToken },
        appToken
      );

      const tokenInfo = data?.data || {};

      let expiresAt: Date | null = null;
      const neverExpires = tokenInfo.expires_at === 0;
      if (tokenInfo.expires_at && tokenInfo.expires_at > 0) {
        expiresAt = new Date(tokenInfo.expires_at * 1000);
      }

      let dataAccessExpiresAt: Date | null = null;
      if (tokenInfo.data_access_expires_at && tokenInfo.data_access_expires_at > 0) {
        dataAccessExpiresAt = new Date(tokenInfo.data_access_expires_at * 1000);
      }

      const tokenError = tokenInfo.error || (data?.error ? data.error : null);
      let errorCode: number | undefined;
      let errorSubcode: number | undefined;
      let errorMessage: string | undefined;

      if (tokenError) {
        errorCode = tokenError.code;
        errorSubcode = tokenError.error_subcode || tokenError.subcode;
        errorMessage = tokenError.message;
      }

      return {
        isValid: Boolean(tokenInfo.is_valid),
        userId: tokenInfo.user_id || '',
        appId: tokenInfo.app_id || '',
        scopes: Array.isArray(tokenInfo.scopes) ? tokenInfo.scopes : [],
        expiresAt,
        neverExpires,
        dataAccessExpiresAt,
        errorCode,
        errorSubcode,
        errorMessage,
      };
    } catch (err: any) {
      const metaErr = err?.response?.data?.error || err?.error || null;
      return {
        isValid: false,
        userId: '',
        appId: '',
        scopes: [],
        expiresAt: null,
        dataAccessExpiresAt: null,
        errorCode: metaErr?.code || 190,
        errorSubcode: metaErr?.error_subcode || metaErr?.subcode || 463,
        errorMessage: metaErr?.message || err?.message || 'Meta token inspection failed',
      };
    }
  }

  /**
   * Checks if an expiration timestamp is in the past.
   */
  public isTokenExpired(expiresAt: Date | string | null | undefined): boolean {
    if (!expiresAt) return false;
    const date = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    // Buffer with 5 minutes before actual expiry
    return date.getTime() - 5 * 60 * 1000 <= Date.now();
  }
}

export const metaTokenManager = new MetaTokenManager();
