/**
 * Granular RBAC Permissions Middleware
 * SocialForge Platform v4.4.0
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { rbacService } from '../services/superadmin/rbac.service.js';

export function requirePermission(requiredPermission: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.userId) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    // Superadmin bypasses permission checks
    if (req.user.isSuperAdmin) {
      return next();
    }

    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return next(new AppError(400, 'BAD_REQUEST', 'Tenant context required'));
    }

    try {
      const isAllowed = await rbacService.hasEffectivePermission(
        tenantId,
        req.user.userId,
        requiredPermission
      );

      if (!isAllowed) {
        return next(
          new AppError(
            403,
            'PERMISSION_DENIED',
            `Access denied. Required permission: "${requiredPermission}".`
          )
        );
      }

      return next();
    } catch (err: any) {
      return next(err);
    }
  };
}
