import crypto from 'crypto';
import { config } from '../../config/index.js';

export interface UnifiedOAuthState {
  tenantId: string;
  brandId: string;
  userId?: string;
  provider: string;
  timestamp: number;
  nonce: string;
}

export class OAuthStateService {
  private static getSecret(): string {
    return process.env.SESSION_SECRET || config.jwtSecret || 'meta_oauth_secret_fallback';
  }

  public static generateState(tenantId: string, brandId: string, provider: string, userId?: string): string {
    const payload: UnifiedOAuthState = {
      tenantId,
      brandId,
      userId: userId || 'system',
      provider: provider.toLowerCase(),
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.getSecret())
      .update(data)
      .digest('base64url');

    return `${data}.${signature}`;
  }

  public static validateState(stateString: string): {
    valid: boolean;
    state?: UnifiedOAuthState;
    error?: string;
  } {
    if (!stateString || typeof stateString !== 'string') {
      return { valid: false, error: 'State parameter missing' };
    }

    const parts = stateString.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed state token format' };
    }

    const [data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', this.getSecret())
      .update(data)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return { valid: false, error: 'OAuth state signature verification failed' };
    }

    try {
      const decoded: any = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      // Enforce 30-minute state expiration window
      if (decoded.timestamp && Date.now() - decoded.timestamp > 30 * 60 * 1000) {
        return { valid: false, error: 'OAuth state parameter has expired' };
      }
      return {
        valid: true,
        state: {
          tenantId: decoded.tenantId,
          brandId: decoded.brandId,
          userId: decoded.userId || 'system',
          provider: (decoded.provider || 'facebook').toLowerCase(),
          timestamp: decoded.timestamp,
          nonce: decoded.nonce,
        },
      };
    } catch {
      return { valid: false, error: 'Could not deserialize OAuth state' };
    }
  }
}
