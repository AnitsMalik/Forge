import crypto from 'crypto';
import { db } from '../../db/connection.js';

export interface AuditParams {
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
}

const REDACTED_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'appSecret',
  'jwtSecret',
  'key',
]);

function sanitizeMetadata(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key) || /password|token|secret|key/i.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function recordAuthAudit(
  event: string,
  params: AuditParams = {}
): Promise<void> {
  try {
    const cleanMeta = sanitizeMetadata(params.metadata || {});
    await db('auth_audit_logs').insert({
      id: crypto.randomUUID(),
      user_id: params.userId || null,
      email: params.email ? params.email.toLowerCase() : null,
      event,
      ip_address: params.ip ? params.ip.slice(0, 45) : null,
      user_agent: params.userAgent ? params.userAgent.slice(0, 500) : null,
      metadata: JSON.stringify(cleanMeta),
      created_at: new Date(),
    });
  } catch (err: any) {
    // Audit failure must never crash core auth flow, but log securely
    console.error('[AuthAudit] Failed to persist audit log entry:', err.message);
  }
}
