import { AppError } from '../../middleware/errorHandler.js';
import type { MetaErrorCode } from '@socialforge/shared';

/**
 * Redacts any Meta access tokens from strings, URLs, or error payloads.
 */
export function redactTokens(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/(access_token|fb_exchange_token|client_secret)=[^&\s]+/gi, '$1=[REDACTED_TOKEN]')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/\b(EAA[A-Za-z0-9_-]{10,})\b/gi, '[REDACTED_META_TOKEN]');
}

export interface MetaErrorDetails {
  code: MetaErrorCode;
  userMessage: string;
  httpStatus: number;
  isTransient: boolean;
  retryAfterSeconds?: number;
  technicalDetails?: string;
  metaSubcode?: number;
  metaCode?: number;
  metaType?: string;
  fbtraceId?: string;
  safeMessage?: string;
}

export class MetaIntegrationError extends AppError {
  public readonly metaCode: MetaErrorCode;
  public readonly rawMetaCode?: number;
  public readonly metaSubcode?: number;
  public readonly metaType: string;
  public readonly fbtraceId?: string;
  public readonly safeMessage: string;
  public readonly userMessage: string;
  public readonly httpStatus: number;
  public readonly isTransient: boolean;
  public readonly retryAfterSeconds?: number;
  public readonly technicalDetails?: string;

  constructor(details: MetaErrorDetails) {
    super(details.httpStatus, details.code, details.userMessage);
    Object.setPrototypeOf(this, MetaIntegrationError.prototype);
    this.metaCode = details.code;
    this.rawMetaCode = details.metaCode;
    this.metaSubcode = details.metaSubcode;
    this.metaType = details.metaType || 'OAuthException';
    this.fbtraceId = details.fbtraceId;
    this.safeMessage = details.safeMessage || details.userMessage;
    this.userMessage = details.userMessage;
    this.httpStatus = details.httpStatus;
    this.isTransient = details.isTransient;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.technicalDetails = details.technicalDetails ? redactTokens(details.technicalDetails) : undefined;
  }
}

/**
 * Normalizes any error from Meta Graph API or local validation into a standardized MetaIntegrationError.
 * Never leaks raw tokens or opaque Meta internal stack traces to the user.
 * Preserves Meta's useful error code, type, fbtrace_id, and safe error message.
 */
export function normalizeMetaError(err: any): MetaIntegrationError {
  if (err instanceof MetaIntegrationError) {
    return err;
  }

  // Parse Meta Graph API structured error if present
  const metaError = err?.response?.data?.error || err?.error || null;
  const metaCode = metaError?.code ?? err?.code;
  const rawMetaCode = typeof metaCode === 'number' ? metaCode : Number(metaCode) || undefined;
  const metaSubcode = metaError?.error_subcode ?? metaError?.subcode ?? err?.subcode;
  const rawMetaSubcode = typeof metaSubcode === 'number' ? metaSubcode : Number(metaSubcode) || undefined;
  const metaType = metaError?.type || err?.type || 'OAuthException';
  const fbtraceId = metaError?.fbtrace_id || err?.fbtrace_id || err?.response?.headers?.get?.('x-fb-trace-id') || undefined;

  const rawMsg = metaError?.message || err?.message || String(err || 'Meta API error');
  const safeMessage = redactTokens(rawMsg);

  // 1a. Token Expired (subcode 463 or message indicates session expiration)
  if (
    rawMetaSubcode === 463 ||
    /session has expired|token has expired|token is expired/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_TOKEN_EXPIRED',
      userMessage: safeMessage || 'Your Meta access token has expired. Please re-authorize SocialForge in Social Channels.',
      safeMessage,
      httpStatus: 401,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 190,
      metaSubcode: rawMetaSubcode || 463,
      metaType,
      fbtraceId,
    });
  }

  // 1b. Token Invalid / Revoked / Auth Required (code 190 or subcodes 458, 460, 490, etc. or Malformed access token)
  if (
    rawMetaCode === 190 ||
    [458, 460, 467, 490, 492].includes(rawMetaSubcode || 0) ||
    /token is invalid|invalid oauth access token|malformed access token|must be an active access token|not authorized|cannot parse the access token/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_AUTH_REQUIRED',
      userMessage: safeMessage || 'Your Meta connection needs to be re-authorized. Please reconnect your Facebook Page in Social Channels.',
      safeMessage,
      httpStatus: 401,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 190,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 2. Permission Denied / Missing Scopes
  // Error codes 10 (Permission denied), 200-299 (Permissions error)
  if (
    rawMetaCode === 10 ||
    (rawMetaCode && rawMetaCode >= 200 && rawMetaCode <= 299) ||
    /permission|requires the|manage_pages|pages_manage_posts|instagram_content_publish|pages_show_list/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_PERMISSION_DENIED',
      userMessage: safeMessage || 'SocialForge lacks the required Meta permissions to publish on this page. Please reconnect and grant all requested Page and Instagram permissions.',
      safeMessage,
      httpStatus: 403,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 200,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 3. Rate Limit / Throttling
  // Meta Error Codes: 4 (Too many calls), 17 (User request limit), 32 (Page request limit), 613 (Calls to stream have exceeded the rate of)
  if (
    [4, 17, 32, 613].includes(rawMetaCode || 0) ||
    /rate limit|too many calls|request limit reached/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_RATE_LIMIT',
      userMessage: safeMessage || 'Meta Graph API rate limit reached. The request will automatically be retried shortly.',
      safeMessage,
      httpStatus: 429,
      isTransient: true,
      retryAfterSeconds: 300,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 4,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 4. Page Not Found (code 803 or code 100 with page not found/aliases)
  if (
    rawMetaCode === 803 ||
    (rawMetaCode === 100 && /page not found|aliases you requested do not exist|does not exist/i.test(safeMessage))
  ) {
    return new MetaIntegrationError({
      code: 'META_PAGE_NOT_FOUND',
      userMessage: safeMessage || 'The selected Facebook Page could not be found or you no longer have admin access to it.',
      safeMessage,
      httpStatus: 404,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 803,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 5. Instagram Not Connected
  if (
    /instagram_business_account|no connected instagram|eligible instagram/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_INSTAGRAM_NOT_CONNECTED',
      userMessage: safeMessage || 'The selected Facebook Page does not have an eligible Instagram Professional account connected.',
      safeMessage,
      httpStatus: 400,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 400,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 6. Media Invalid
  if (
    /aspect ratio|media invalid|unsupported format|image size|video duration|corrupt/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_MEDIA_INVALID',
      userMessage: safeMessage || 'The media file does not meet Meta requirements (dimensions, aspect ratio, or size limit).',
      safeMessage,
      httpStatus: 400,
      isTransient: false,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 400,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 7. Media Still Processing (Transient during IG container creation)
  if (
    rawMetaCode === 9007 ||
    /media is still being processed|media container not ready|in_progress/i.test(safeMessage)
  ) {
    return new MetaIntegrationError({
      code: 'META_MEDIA_PROCESSING',
      userMessage: safeMessage || 'Meta is still encoding the video media container. Retrying automatically...',
      safeMessage,
      httpStatus: 202,
      isTransient: true,
      retryAfterSeconds: 5,
      technicalDetails: safeMessage,
      metaCode: rawMetaCode || 9007,
      metaSubcode: rawMetaSubcode,
      metaType,
      fbtraceId,
    });
  }

  // 8. General Meta API Error
  const isNetworkOr5xx =
    err?.code === 'ECONNRESET' ||
    err?.code === 'ETIMEDOUT' ||
    err?.code === 'ENOTFOUND' ||
    (err?.status && err.status >= 500);

  // Requirement 4: Do NOT replace Meta's useful error with generic "unexpected error"
  const userMessage = isNetworkOr5xx
    ? 'A temporary network error occurred while communicating with Meta servers. We will retry automatically.'
    : (safeMessage && !safeMessage.includes('Unknown Meta error') ? safeMessage : 'Meta Graph API returned an error.');

  return new MetaIntegrationError({
    code: 'META_API_ERROR',
    userMessage,
    safeMessage,
    httpStatus: err?.status || (isNetworkOr5xx ? 503 : 400),
    isTransient: Boolean(isNetworkOr5xx),
    retryAfterSeconds: isNetworkOr5xx ? 15 : undefined,
    technicalDetails: safeMessage,
    metaCode: rawMetaCode,
    metaSubcode: rawMetaSubcode,
    metaType,
    fbtraceId,
  });
}
