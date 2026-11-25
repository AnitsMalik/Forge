import { Request, Response, NextFunction } from 'express';
import { Permission, hasPermission, TenantRole } from '@socialforge/shared';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).userRole as TenantRole;
    if (!userRole || !hasPermission(userRole, permission)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}
