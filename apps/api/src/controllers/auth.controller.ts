import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
} from '@socialforge/shared';
import {
  hashPassword,
  verifyPassword,
} from '../services/auth/passwordService.js';
import {
  signAccessToken,
  createRefreshTokenSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  createPasswordResetToken,
  verifyAndConsumePasswordResetToken,
  createEmailVerificationToken,
  verifyAndConsumeEmailVerificationToken,
} from '../services/auth/tokenService.js';
import {
  isAccountLocked,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
} from '../services/auth/accountLockoutService.js';
import { recordAuthAudit } from '../services/auth/authAuditService.js';
import { setAuthCookies, clearAuthCookies } from '../middleware/cookieAuth.js';
import { SignupOtpService } from '../services/auth/signupOtp.service.js';

export async function sendSignupOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, agencySlug } = req.body;
    const result = await SignupOtpService.sendSignupOtp({ email, agencySlug });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function verifyOtpAndRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp, fullName, password, agencyName, agencySlug } = req.body;
    const result = await SignupOtpService.verifyAndRegister(
      { email, otp, fullName, password, agencyName, agencySlug },
      req.ip,
      req.headers['user-agent']
    );

    const csrfToken = setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return res.status(201).json({
      success: true,
      message: 'Account successfully verified and created.',
      data: {
        user: result.user,
        tenant: result.tenant,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          csrfToken,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = RegisterSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();
    const normalizedSlug = validated.agencySlug.toLowerCase().trim();

    // 1. Check if user already exists
    const existingUser = await db('users').where({ email: normalizedEmail }).first();
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'A user with this email address already exists');
    }

    // 2. Check if tenant slug already exists
    const existingTenant = await db('tenants').where({ slug: normalizedSlug }).first();
    if (existingTenant) {
      throw new AppError(409, 'SLUG_EXISTS', 'An agency with this slug already exists');
    }

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(validated.password);
    const now = new Date();

    // 3. Atomically create tenant, user, and tenant_user
    await db.transaction(async (trx) => {
      await trx('tenants').insert({
        id: tenantId,
        name: validated.agencyName.trim(),
        slug: normalizedSlug,
        subscription_tier: 'standard',
        settings: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      });

      await trx('users').insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: validated.fullName.trim(),
        email_verified: false,
        failed_login_attempts: 0,
        token_version: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      });

      await trx('tenant_users').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        user_id: userId,
        role: 'agency_admin',
        created_at: now,
        updated_at: now,
      });
    });

    const user = await db('users').where({ id: userId }).first();
    const tenant = await db('tenants').where({ id: tenantId }).first();

    // 4. Create single-use email verification token
    const verificationToken = await createEmailVerificationToken(userId);

    // 5. Generate secure session & rotating refresh token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: 'agency_admin' as const,
      tokenVersion: user.token_version,
      isSuperAdmin: Boolean(user.is_superadmin),
    };

    const accessToken = signAccessToken(tokenPayload);
    const { refreshToken } = await createRefreshTokenSession(
      tokenPayload,
      req.ip,
      req.headers['user-agent']
    );

    // 6. Set secure HttpOnly cookies
    const csrfToken = setAuthCookies(res, { accessToken, refreshToken });

    // 7. Audit log
    await recordAuthAudit('register', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { tenantId: tenant.id },
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          emailVerified: false,
          role: 'agency_admin',
          isSuperAdmin: Boolean(user.is_superadmin),
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscriptionTier: tenant.subscription_tier,
          role: 'agency_admin',
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwtExpiresIn,
          csrfToken,
        },
        // Include dev token in test/dev for automated testing
        ...(config.nodeEnv !== 'production' && { devVerificationToken: verificationToken }),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = LoginSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const user = await db('users').where({ email: normalizedEmail }).first();

    // 1. Account Lockout check (Brute-Force Shield)
    if (user) {
      const lockStatus = isAccountLocked(user);
      if (lockStatus.isLocked) {
        await recordAuthAudit('login_blocked_locked', {
          userId: user.id,
          email: normalizedEmail,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
        throw new AppError(
          423,
          'ACCOUNT_LOCKED',
          `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockStatus.remainingMinutes} minute(s).`
        );
      }
    }

    // 2. Prevent account enumeration by running dummy hash if user not found
    if (!user || !user.is_active) {
      // Dummy compare to avoid timing side-channels
      await verifyPassword(
        validated.password,
        '$2a$12$e80Yh8fO/mG9B5h1m5K0O.1s7w9rN0n7G8a2u3v4w5x6y7z8a9b0c'
      );
      await recordAuthAudit('login_failed', {
        email: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { reason: 'nonexistent_or_inactive' },
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // 3. Password comparison
    const isMatch = await verifyPassword(validated.password, user.password_hash);
    if (!isMatch) {
      const { isLocked, attemptsCount } = await recordFailedLoginAttempt(
        user.id,
        user.email,
        req.ip,
        req.headers['user-agent']
      );

      await recordAuthAudit('login_failed', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { attemptsCount },
      });

      if (isLocked) {
        throw new AppError(
          423,
          'ACCOUNT_LOCKED',
          'Account has been temporarily locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.'
        );
      }

      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // 4. Successful Login: Clear any failed attempts
    await clearFailedLoginAttempts(user.id);

    // 5. Fetch primary tenant membership and subscription tier
    const membership = await db('tenant_users')
      .join('tenants', 'tenant_users.tenant_id', 'tenants.id')
      .where('tenant_users.user_id', user.id)
      .select('tenants.id as tenantId', 'tenants.name as tenantName', 'tenants.slug as tenantSlug', 'tenants.subscription_tier as defaultTier', 'tenant_users.role')
      .first();

    if (!membership) {
      throw new AppError(403, 'NO_TENANT', 'User is not assigned to any active agency tenant');
    }

    const activeSub = await db('tenant_subscriptions')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.tenant_id', membership.tenantId)
      .whereIn('tenant_subscriptions.status', ['active', 'trialing'])
      .orderBy('tenant_subscriptions.created_at', 'desc')
      .select('tenant_subscriptions.plan_id', 'subscription_plans.name as plan_name')
      .first();

    const subscriptionTier = activeSub?.plan_name || activeSub?.plan_id || membership.defaultTier || 'Agency Pro';

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      tenantId: membership.tenantId,
      role: membership.role,
      tokenVersion: user.token_version,
      isSuperAdmin: Boolean(user.is_superadmin),
    };

    // 6. Sign access token and rotating refresh token
    const accessToken = signAccessToken(tokenPayload);
    const { refreshToken } = await createRefreshTokenSession(
      tokenPayload,
      req.ip,
      req.headers['user-agent']
    );

    // 7. Set secure HttpOnly cookies
    const csrfToken = setAuthCookies(res, { accessToken, refreshToken });

    // 8. Audit log
    await recordAuthAudit('login_success', {
      userId: user.id,
      email: user.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { tenantId: membership.tenantId },
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          emailVerified: Boolean(user.email_verified),
          role: membership.role,
          isSuperAdmin: Boolean(user.is_superadmin),
        },
        tenant: {
          id: membership.tenantId,
          name: membership.tenantName,
          slug: membership.tenantSlug,
          subscriptionTier: subscriptionTier,
          role: membership.role,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwtExpiresIn,
          csrfToken,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.sf_refresh_token || req.body?.refreshToken;

    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }

    clearAuthCookies(res);

    if (req.user?.userId) {
      await recordAuthAudit('logout', {
        userId: req.user.userId,
        email: req.user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.sf_refresh_token || req.body?.refreshToken;

    if (!rawToken) {
      throw new AppError(401, 'INVALID_TOKEN', 'Refresh token is required');
    }

    const { newAccessToken, newRefreshToken, user, tenant } = await rotateRefreshToken(
      rawToken,
      req.ip,
      req.headers['user-agent']
    );

    const csrfToken = setAuthCookies(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    return res.status(200).json({
      success: true,
      data: {
        user,
        tenant,
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwtExpiresIn,
          csrfToken,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = ForgotPasswordSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const user = await db('users').where({ email: normalizedEmail }).first();

    let devResetToken: string | undefined;

    if (user && user.is_active) {
      devResetToken = await createPasswordResetToken(user.id);

      await recordAuthAudit('password_reset_requested', {
        userId: user.id,
        email: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } else {
      // Record generic attempt without revealing user existence
      await recordAuthAudit('password_reset_unknown_email', {
        email: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Always return generic success message to prevent user enumeration
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
      ...(config.nodeEnv !== 'production' && devResetToken && { devResetToken }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = ResetPasswordSchema.parse(req.body);

    // 1. Verify and consume reset token (single-use)
    const userId = await verifyAndConsumePasswordResetToken(validated.token);

    // 2. Hash new password
    const newHash = await hashPassword(validated.password);

    // 3. Update password and invalidate all active sessions
    await db('users')
      .where({ id: userId })
      .update({
        password_hash: newHash,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: new Date(),
      });

    // Revoke all refresh tokens and bump token_version
    await revokeAllUserSessions(userId);

    clearAuthCookies(res);

    await recordAuthAudit('password_reset_success', {
      userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    return next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.query.token as string) || req.body?.token;
    const validated = VerifyEmailSchema.parse({ token });

    const userId = await verifyAndConsumeEmailVerificationToken(validated.token);

    await recordAuthAudit('email_verified', {
      userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({
      success: true,
      message: 'Email address has been successfully verified.',
    });
  } catch (err) {
    return next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = ResendVerificationSchema.parse(req.body);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const user = await db('users').where({ email: normalizedEmail }).first();
    let devVerificationToken: string | undefined;

    if (user && !user.email_verified) {
      devVerificationToken = await createEmailVerificationToken(user.id);

      await recordAuthAudit('email_verification_resent', {
        userId: user.id,
        email: normalizedEmail,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If your account requires verification, a new verification link has been sent.',
      ...(config.nodeEnv !== 'production' && devVerificationToken && { devVerificationToken }),
    });
  } catch (err) {
    return next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const tenantId = req.user!.tenantId;

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      throw new AppError(401, 'USER_NOT_FOUND', 'User session expired or user record not found');
    }

    const tenant = await db('tenants').where({ id: tenantId }).first();
    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Associated tenant not found');
    }

    const brands = await db('brands').where({ tenant_id: tenantId }).select('*');

    const activeSub = await db('tenant_subscriptions')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .where('tenant_subscriptions.tenant_id', tenantId)
      .whereIn('tenant_subscriptions.status', ['active', 'trialing'])
      .orderBy('tenant_subscriptions.created_at', 'desc')
      .select('tenant_subscriptions.plan_id', 'subscription_plans.name as plan_name')
      .first();

    const subscriptionTier = activeSub?.plan_name || activeSub?.plan_id || tenant.subscription_tier || 'Agency Pro';

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          emailVerified: Boolean(user.email_verified),
          role: req.user!.role,
          isSuperAdmin: Boolean(user.is_superadmin),
        },
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          subscriptionTier: subscriptionTier,
        },
        brands,
      },
    });
  } catch (err) {
    return next(err);
  }
}
