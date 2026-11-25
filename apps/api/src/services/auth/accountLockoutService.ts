import { db } from '../../db/connection.js';
import { recordAuthAudit } from './authAuditService.js';

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface LockoutStatus {
  isLocked: boolean;
  remainingMinutes: number;
}

export function isAccountLocked(user: { locked_until?: Date | string | null }): LockoutStatus {
  if (!user.locked_until) {
    return { isLocked: false, remainingMinutes: 0 };
  }

  const lockTime = new Date(user.locked_until).getTime();
  const now = Date.now();

  if (lockTime > now) {
    const diffMs = lockTime - now;
    const remainingMinutes = Math.ceil(diffMs / (60 * 1000));
    return { isLocked: true, remainingMinutes };
  }

  return { isLocked: false, remainingMinutes: 0 };
}

export async function recordFailedLoginAttempt(
  userId: string,
  email: string,
  ip?: string,
  userAgent?: string
): Promise<{ isLocked: boolean; attemptsCount: number }> {
  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    return { isLocked: false, attemptsCount: 0 };
  }

  const newAttempts = (user.failed_login_attempts || 0) + 1;
  const now = new Date();

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await db('users')
      .where({ id: userId })
      .update({
        failed_login_attempts: newAttempts,
        locked_until: lockedUntil,
        updated_at: now,
      });

    await recordAuthAudit('account_locked', {
      userId,
      email,
      ip,
      userAgent,
      metadata: {
        attempts: newAttempts,
        lockedUntil: lockedUntil.toISOString(),
      },
    });

    return { isLocked: true, attemptsCount: newAttempts };
  }

  await db('users')
    .where({ id: userId })
    .update({
      failed_login_attempts: newAttempts,
      updated_at: now,
    });

  return { isLocked: false, attemptsCount: newAttempts };
}

export async function clearFailedLoginAttempts(userId: string): Promise<void> {
  await db('users')
    .where({ id: userId })
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
      updated_at: new Date(),
    });
}
