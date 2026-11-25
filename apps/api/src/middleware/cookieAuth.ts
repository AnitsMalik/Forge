import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      cookies: Record<string, string>;
    }
  }
}

export function cookieParser(req: Request, _res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};

  if (cookieHeader) {
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch {
          req.cookies[key] = val;
        }
      }
    }
  }

  next();
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken?: string; csrfToken?: string }
) {
  const isProd = config.nodeEnv === 'production';

  // Access Token (15 mins)
  res.cookie('sf_access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  // Refresh Token (7 days)
  if (tokens.refreshToken) {
    res.cookie('sf_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });
  }

  // CSRF Token (7 days, readable by client-side JS)
  const csrfToken = tokens.csrfToken || crypto.randomBytes(16).toString('hex');
  res.cookie('sf_csrf_token', csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  return csrfToken;
}

export function clearAuthCookies(res: Response) {
  const isProd = config.nodeEnv === 'production';

  res.clearCookie('sf_access_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });

  res.clearCookie('sf_refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/v1/auth',
  });

  res.clearCookie('sf_csrf_token', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Validates CSRF double-submit cookie on state-changing requests when authenticated via cookie.
 */
export function validateCsrf(req: Request, _res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // If using Authorization: Bearer header, browser does not send this automatically cross-origin; CSRF is prevented
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If using Cookie authentication, enforce CSRF token header
  if (req.cookies && req.cookies.sf_access_token) {
    const csrfHeader = req.headers['x-csrf-token'] as string;
    const csrfCookie = req.cookies.sf_csrf_token;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return next(new AppError(403, 'CSRF_FAILED', 'Invalid or missing CSRF token'));
    }
  }

  return next();
}
