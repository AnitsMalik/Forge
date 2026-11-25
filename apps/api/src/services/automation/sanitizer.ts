/**
 * Utility to sanitize sensitive information (OAuth tokens, API keys, client secrets, passwords)
 * from logs, responses, step results, and event payloads before exposing them to clients or logs.
 */

const SENSITIVE_KEY_REGEX = /(?:access_token|client_secret|refresh_token|token|secret|password|api_key|apikey|authorization|credential|private_key|auth_header)/i;

export function sanitizeSecrets<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSecrets(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'string' && (val.startsWith('Bearer ') || val.startsWith('ghp_') || val.startsWith('whk_'))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeSecrets(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as T;
}
