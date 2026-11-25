import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { AppError } from '../../middleware/errorHandler.js';
import { hashPassword } from './passwordService.js';
import { signAccessToken, createRefreshTokenSession } from './tokenService.js';
import { recordAuthAudit } from './authAuditService.js';

export interface SendSignupOtpParams {
  email: string;
  agencySlug?: string;
}

export interface VerifyAndRegisterParams {
  email: string;
  otp: string;
  fullName: string;
  password: string;
  agencyName: string;
  agencySlug: string;
}

export class SignupOtpService {
  /**
   * Step 1: Validate email/slug availability, generate cryptographically secure 6-digit OTP,
   * hash with SHA-256, store in database, and dispatch verification email.
   */
  public static async sendSignupOtp(params: SendSignupOtpParams): Promise<{
    success: boolean;
    message: string;
    expiresInSeconds: number;
    devOtp?: string;
  }> {
    const normalizedEmail = params.email.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new AppError(400, 'INVALID_EMAIL', 'A valid email address is required.');
    }

    // 1. Check if user already exists
    const existingUser = await db('users').where({ email: normalizedEmail }).first();
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'An account with this email address already exists.');
    }

    // 2. Check if agency slug is taken (if provided)
    if (params.agencySlug) {
      const normalizedSlug = params.agencySlug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '');
      const existingSlug = await db('tenants').where({ slug: normalizedSlug }).first();
      if (existingSlug) {
        throw new AppError(409, 'SLUG_EXISTS', 'An agency with this slug already exists.');
      }
    }

    // 3. Cooldown check: prevent sending another OTP within 45 seconds
    const recentOtp = await db('signup_otp_verifications')
      .where({ email: normalizedEmail, is_verified: false })
      .orderBy('created_at', 'desc')
      .first();

    if (recentOtp) {
      const elapsedMs = Date.now() - new Date(recentOtp.created_at).getTime();
      if (elapsedMs < 45000) {
        const remainingSec = Math.ceil((45000 - elapsedMs) / 1000);
        throw new AppError(429, 'OTP_COOLDOWN', `Please wait ${remainingSec} seconds before requesting a new code.`);
      }
    }

    // 4. Invalidate prior active OTPs for this email
    await db('signup_otp_verifications')
      .where({ email: normalizedEmail, is_verified: false })
      .del();

    // 5. Generate secure 6-digit numeric OTP
    const rawOtp = String(crypto.randomInt(100000, 999999));
    const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await db('signup_otp_verifications').insert({
      id: crypto.randomUUID(),
      email: normalizedEmail,
      otp_hash: otpHash,
      attempts: 0,
      expires_at: expiresAt,
      is_verified: false,
      created_at: new Date(),
    });

    console.log(`[AUTH OTP] 6-Digit Code for ${normalizedEmail}: [${rawOtp}] (Expires in 10m)`);

    // 6. Attempt to dispatch email via SMTP if configured in environment
    try {
      const smtpHost = process.env.SMTP_HOST;
      if (smtpHost) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
              }
            : undefined,
        });

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.3);">
            <h2 style="color: #a855f7; margin-top: 0; font-size: 22px;">HoaspForge Security Code</h2>
            <p style="font-size: 15px; color: #94a3b8; line-height: 1.5;">Use the verification code below to complete your agency sign up:</p>
            <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid #a855f7; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff;">${rawOtp}</span>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.4;">This code is valid for 10 minutes. If you did not request this verification code, please ignore this email.</p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"HoaspForge" <noreply@socialforge.io>',
          to: normalizedEmail,
          subject: `${rawOtp} is your HoaspForge verification code`,
          text: `Your HoaspForge verification code is ${rawOtp}. This code expires in 10 minutes.`,
          html,
        });
        console.log(`[AUTH OTP] Successfully dispatched email via SMTP to ${normalizedEmail}`);
      }
    } catch (mailErr: any) {
      console.warn(`[AUTH OTP] Notice: SMTP delivery skipped or failed (${mailErr?.message || mailErr}). In development mode, code is logged to console.`);
    }

    // In dev / test or when email provider is simulated, log or return devOtp for fast testing
    const isDev = config.nodeEnv !== 'production';

    return {
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
      expiresInSeconds: 600,
      ...(isDev ? { devOtp: rawOtp } : {}),
    };
  }

  /**
   * Step 2: Verify the 6-digit OTP code against the SHA-256 hash.
   * If valid, atomically provision the Agency Tenant, User (email_verified: true), and Tenant Admin.
   */
  public static async verifyAndRegister(
    params: VerifyAndRegisterParams,
    ip?: string,
    userAgent?: string
  ): Promise<{
    user: any;
    tenant: any;
    accessToken: string;
    refreshToken: string;
  }> {
    const normalizedEmail = params.email.toLowerCase().trim();
    const cleanOtp = (params.otp || '').trim().replace(/\s+/g, '');
    const cleanSlug = (params.agencySlug || 'agency')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '');

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new AppError(400, 'INVALID_OTP_FORMAT', 'Please provide a valid 6-digit verification code.');
    }

    // 1. Fetch latest active OTP verification record
    const otpRecord = await db('signup_otp_verifications')
      .where({ email: normalizedEmail, is_verified: false })
      .orderBy('created_at', 'desc')
      .first();

    if (!otpRecord) {
      throw new AppError(400, 'OTP_NOT_FOUND', 'No active verification code found for this email. Please request a code.');
    }

    // 2. Expiry check
    if (new Date(otpRecord.expires_at).getTime() < Date.now()) {
      throw new AppError(400, 'OTP_EXPIRED', 'Verification code has expired. Please request a new code.');
    }

    // 3. Max attempts check
    if (otpRecord.attempts >= 5) {
      await db('signup_otp_verifications').where({ id: otpRecord.id }).del();
      throw new AppError(429, 'MAX_ATTEMPTS', 'Too many invalid attempts. This code has been invalidated. Please request a new one.');
    }

    // 4. Verify SHA-256 Hash
    const inputHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
    if (inputHash !== otpRecord.otp_hash) {
      const newAttempts = otpRecord.attempts + 1;
      await db('signup_otp_verifications').where({ id: otpRecord.id }).update({ attempts: newAttempts });
      const remaining = 5 - newAttempts;
      throw new AppError(
        400,
        'INVALID_OTP',
        remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts exceeded.'
      );
    }

    // 5. Code is valid! Mark verified immediately
    await db('signup_otp_verifications').where({ id: otpRecord.id }).update({ is_verified: true });

    // 6. Double check uniqueness before atomic insertion
    const existingUser = await db('users').where({ email: normalizedEmail }).first();
    if (existingUser) {
      throw new AppError(409, 'USER_EXISTS', 'An account with this email address already exists.');
    }

    const existingTenant = await db('tenants').where({ slug: cleanSlug }).first();
    if (existingTenant) {
      throw new AppError(409, 'SLUG_EXISTS', 'An agency with this slug already exists.');
    }

    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(params.password);
    const now = new Date();

    // 7. Atomically create Tenant, User (email_verified: true), and Tenant Membership
    await db.transaction(async (trx) => {
      await trx('tenants').insert({
        id: tenantId,
        name: params.agencyName.trim(),
        slug: cleanSlug,
        subscription_tier: 'standard',
        settings: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      });

      await trx('users').insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: params.fullName.trim(),
        email_verified: true, // VERIFIED VIA OTP!
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

    // 8. Generate session tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: 'agency_admin' as const,
      tokenVersion: user.token_version,
      isSuperAdmin: Boolean(user.is_superadmin),
    };

    const accessToken = signAccessToken(tokenPayload);
    const { refreshToken } = await createRefreshTokenSession(tokenPayload, ip, userAgent);

    // 9. Audit trail
    await recordAuthAudit('register_otp_verified', {
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      metadata: { tenantId: tenant.id, agencySlug: cleanSlug },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        emailVerified: true,
        role: 'agency_admin',
        isSuperAdmin: Boolean(user.is_superadmin),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subscriptionTier: tenant.subscription_tier,
      },
      accessToken,
      refreshToken,
    };
  }
}
