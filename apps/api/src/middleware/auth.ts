import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../db/connection.js';
import { AppError } from './errorHandler.js';
import type { TenantRole } from '@socialforge/shared';

export interface AuthContext {
  userId: string;
  id?: string;
  email: string;
  tenantId: string;
  role: TenantRole;
  tokenVersion?: number;
  isSuperAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;

  // 1. Check Authorization: Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fall back to secure HttpOnly cookie
  if (!token && req.cookies && req.cookies.sf_access_token) {
    token = req.cookies.sf_access_token;
  }

  if (!token) {
    // If strict auth is requested or on admin/governance endpoints, never allow unauthenticated dev fallback
    const isStrictEndpoint = req.originalUrl?.includes('/admin') || req.headers['x-strict-auth'] === 'true';
    if (isStrictEndpoint) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Missing Authorization header'));
    }

    // In development/local testing mode, gracefully fall back to active brand/demo session
    if (config.nodeEnv === 'development' || process.env.NODE_ENV !== 'production') {
      try {
        const brandIdMatch = req.originalUrl?.match(/\/brands\/([0-9a-fA-F-]+)/);
        const brandId = (req.params as any)?.brandId || (brandIdMatch ? brandIdMatch[1] : null);
        if (brandId) {
          const brand = await db('brands').where({ id: brandId }).first();
          if (brand) {
            const tenantUser = await db('tenant_users')
              .where({ tenant_id: brand.tenant_id })
              .first();
            if (tenantUser) {
              const user = await db('users').where({ id: tenantUser.user_id }).first();
              if (user && user.is_active) {
                req.user = {
                  userId: user.id,
                  id: user.id,
                  email: user.email,
                  tenantId: brand.tenant_id,
                  role: tenantUser.role as any,
                };
                return next();
              }
            }
          }
        }

        const fallbackUser = await db('users').where({ is_active: true }).first();
        if (fallbackUser) {
          const membership = await db('tenant_users').where({ user_id: fallbackUser.id }).first();
          if (membership) {
            req.user = {
              userId: fallbackUser.id,
              id: fallbackUser.id,
              email: fallbackUser.email,
              tenantId: membership.tenant_id,
              role: membership.role as any,
              isSuperAdmin: Boolean(fallbackUser.is_superadmin),
            };
            return next();
          }
        }
      } catch (e) {
        // Fall through to 401
      }
    }

    return next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthContext;

    // Verify token version / active status & superadmin privileges
    let isSuperAdmin = Boolean(payload.isSuperAdmin);
    if (payload.userId) {
      const user = await db('users')
        .where({ id: payload.userId })
        .select('is_active', 'token_version', 'is_superadmin')
        .first();

      if (!user || !user.is_active) {
        return next(new AppError(401, 'UNAUTHORIZED', 'Account is deactivated or not found'));
      }

      if (payload.tokenVersion !== undefined && user.token_version !== payload.tokenVersion) {
        return next(new AppError(401, 'TOKEN_REVOKED', 'Session has expired or was revoked. Please log in again.'));
      }

      if (user.is_superadmin !== undefined && user.is_superadmin !== null) {
        isSuperAdmin = Boolean(user.is_superadmin);
      }
    }

    req.user = { ...payload, id: payload.userId, isSuperAdmin };

    // Support dynamic workspace switching via x-tenant-id header if authorized
    const requestedTenantId = req.headers['x-tenant-id'];
    if (requestedTenantId && typeof requestedTenantId === 'string' && requestedTenantId !== payload.tenantId) {
      const membership = await db('tenant_users')
        .where({ user_id: payload.userId, tenant_id: requestedTenantId })
        .first();

      if (membership) {
        req.user.tenantId = requestedTenantId;
        req.user.role = membership.role;
      }
    }

    return next();
  } catch (err: any) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token has expired or is invalid'));
  }
}

export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token && req.cookies && req.cookies.sf_access_token) {
    token = req.cookies.sf_access_token;
  }

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthContext;
    if (payload.userId) {
      const user = await db('users')
        .where({ id: payload.userId })
        .select('is_active', 'token_version')
        .first();

      if (user && user.is_active && (payload.tokenVersion === undefined || user.token_version === payload.tokenVersion)) {
        req.user = { ...payload, id: payload.userId };
      }
    }
  } catch {
    // Continue gracefully for optional auth
  }

  return next();
}


export function requireRole(...allowedRoles: TenantRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    return next();
  };
}

export async function requireSuperadmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || !req.user.userId) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  try {
    const user = await db('users')
      .where({ id: req.user.userId })
      .select('is_superadmin', 'is_active')
      .first();

    if (!user || !user.is_active || !user.is_superadmin) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'Access denied. Platform superadmin privilege required.'
        )
      );
    }

    req.user.isSuperAdmin = true;
    return next();
  } catch (err) {
    return next(err);
  }
}

export const requireAuth = authenticate;
