import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { recordAuthAudit } from './authAuditService.js';
import type { TenantRole } from '@socialforge/shared';

export interface TokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: TenantRole;
  tokenVersion: number;
  familyId?: string;
  isSuperAdmin?: boolean;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateCryptoToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

export function signRefreshToken(payload: TokenPayload, familyId: string): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      familyId,
      jti: crypto.randomUUID(),
    },
    config.jwtSecret,
    { expiresIn: config.refreshTokenExpiresIn as any }
  );
}

export async function createRefreshTokenSession(
  payload: TokenPayload,
  ip?: string,
  userAgent?: string,
  existingFamilyId?: string
): Promise<{ refreshToken: string; familyId: string; expiresAt: Date }> {
  const familyId = existingFamilyId || crypto.randomUUID();
  const rawToken = signRefreshToken(payload, familyId);
  const tokenHash = hashToken(rawToken);

  // 7 days expiration standard
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db('refresh_tokens').insert({
    id: crypto.randomUUID(),
    user_id: payload.userId,
    token_hash: tokenHash,
    family_id: familyId,
    is_revoked: false,
    expires_at: expiresAt,
    ip_address: ip ? ip.slice(0, 45) : null,
    user_agent: userAgent ? userAgent.slice(0, 500) : null,
    created_at: new Date(),
  });

  return { refreshToken: rawToken, familyId, expiresAt };
}

export async function rotateRefreshToken(
  rawToken: string,
  ip?: string,
  userAgent?: string
): Promise<{
  newAccessToken: string;
  newRefreshToken: string;
  user: any;
  tenant: any;
}> {
  if (!rawToken) {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token is required');
  }

  let decoded: any;
  try {
    decoded = jwt.verify(rawToken, config.jwtSecret);
  } catch (err: any) {
    throw new AppError(401, 'INVALID_TOKEN', 'Refresh token has expired or is invalid');
  }

  const tokenHash = hashToken(rawToken);
  const tokenRecord = await db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .first();

  if (!tokenRecord) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token session');
  }

  // 1. REPLAY / REUSE ATTACK DETECTION
  // If the token is already revoked, an attacker or compromised client is reusing an old token!
  if (tokenRecord.is_revoked) {
    // Invalidate the entire token family immediately
    await db('refresh_tokens')
      .where({ family_id: tokenRecord.family_id })
      .update({ is_revoked: true });

    // Invalidate all tokens for this user by bumping token_version
    await db('users')
      .where({ id: tokenRecord.user_id })
      .increment('token_version', 1);

    await recordAuthAudit('token_reuse_detected', {
      userId: tokenRecord.user_id,
      ip,
      userAgent,
      metadata: {
        familyId: tokenRecord.family_id,
        reusedTokenId: tokenRecord.id,
      },
    });

    throw new AppError(
      401,
      'SECURITY_REVOKED',
      'Security anomaly detected: Refresh token reuse. All active sessions have been terminated. Please log in again.'
    );
  }

  // Check expiration
  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    throw new AppError(401, 'TOKEN_EXPIRED', 'Refresh token has expired. Please log in again.');
  }

  // Verify user existence and token version
  const user = await db('users').where({ id: tokenRecord.user_id }).first();
  if (!user || !user.is_active) {
    throw new AppError(401, 'UNAUTHORIZED', 'User account is inactive or not found');
  }

  if (user.token_version !== decoded.tokenVersion) {
    throw new AppError(401, 'TOKEN_REVOKED', 'Session has been invalidated. Please log in again.');
  }

  // Fetch tenant membership
  const membership = await db('tenant_users')
    .join('tenants', 'tenant_users.tenant_id', 'tenants.id')
    .where('tenant_users.user_id', user.id)
    .select('tenants.id as tenantId', 'tenants.name as tenantName', 'tenants.slug as tenantSlug', 'tenant_users.role')
    .first();

  if (!membership) {
    throw new AppError(403, 'NO_TENANT', 'User is not assigned to any active agency tenant');
  }

  // 2. ROTATE: Invalidate current token
  await db('refresh_tokens')
    .where({ id: tokenRecord.id })
    .update({ is_revoked: true });

  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    tenantId: membership.tenantId,
    role: membership.role,
    tokenVersion: user.token_version,
  };

  // 3. Issue new tokens in the SAME family
  const newAccessToken = signAccessToken(tokenPayload);
  const { refreshToken: newRefreshToken } = await createRefreshTokenSession(
    tokenPayload,
    ip,
    userAgent,
    tokenRecord.family_id
  );

  await recordAuthAudit('token_refreshed', {
    userId: user.id,
    email: user.email,
    ip,
    userAgent,
    metadata: {
      familyId: tokenRecord.family_id,
    },
  });

  return {
    newAccessToken,
    newRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      emailVerified: Boolean(user.email_verified),
    },
    tenant: {
      id: membership.tenantId,
      name: membership.tenantName,
      slug: membership.tenantSlug,
      role: membership.role,
    },
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await db('refresh_tokens')
    .where({ token_hash: tokenHash })
    .update({ is_revoked: true });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await db('refresh_tokens')
    .where({ user_id: userId })
    .update({ is_revoked: true });

  await db('users')
    .where({ id: userId })
    .increment('token_version', 1);
}

// -------------------------------------------------------------
// PASSWORD RESET TOKENS (15 mins expiry, single-use, hashed)
// -------------------------------------------------------------
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate any existing unused reset tokens for this user
  await db('password_reset_tokens')
    .where({ user_id: userId, is_used: false })
    .update({ is_used: true });

  const rawToken = generateCryptoToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await db('password_reset_tokens').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    is_used: false,
    created_at: new Date(),
  });

  return rawToken;
}

export async function verifyAndConsumePasswordResetToken(rawToken: string): Promise<string> {
  if (!rawToken) {
    throw new AppError(400, 'INVALID_TOKEN', 'Reset token is required');
  }

  const tokenHash = hashToken(rawToken);
  const record = await db('password_reset_tokens')
    .where({ token_hash: tokenHash, is_used: false })
    .first();

  if (!record) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid or already used password reset link');
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new AppError(400, 'RESET_TOKEN_EXPIRED', 'Password reset link has expired. Please request a new one.');
  }

  // Mark token as used immediately (single-use)
  await db('password_reset_tokens')
    .where({ id: record.id })
    .update({ is_used: true });

  return record.user_id;
}

// -------------------------------------------------------------
// EMAIL VERIFICATION TOKENS (24 hours expiry, single-use, hashed)
// -------------------------------------------------------------
export async function createEmailVerificationToken(userId: string): Promise<string> {
  // Invalidate existing unused verification tokens
  await db('email_verification_tokens')
    .where({ user_id: userId, is_used: false })
    .update({ is_used: true });

  const rawToken = generateCryptoToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db('email_verification_tokens').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    is_used: false,
    created_at: new Date(),
  });

  return rawToken;
}

export async function verifyAndConsumeEmailVerificationToken(rawToken: string): Promise<string> {
  if (!rawToken) {
    throw new AppError(400, 'INVALID_TOKEN', 'Verification token is required');
  }

  const tokenHash = hashToken(rawToken);
  const record = await db('email_verification_tokens')
    .where({ token_hash: tokenHash, is_used: false })
    .first();

  if (!record) {
    throw new AppError(400, 'INVALID_VERIFY_TOKEN', 'Invalid or already used verification link');
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new AppError(400, 'VERIFY_TOKEN_EXPIRED', 'Email verification link has expired. Please request a new one.');
  }

  // Mark token as used
  await db('email_verification_tokens')
    .where({ id: record.id })
    .update({ is_used: true });

  // Update user as verified
  await db('users')
    .where({ id: record.user_id })
    .update({
      email_verified: true,
      updated_at: new Date(),
    });

  return record.user_id;
}
