import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { AppError } from './errorHandler.js';

export interface ScopedBrand {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  industry?: string;
  website_url?: string;
  timezone: string;
}

declare global {
  namespace Express {
    interface Request {
      scopedBrand?: ScopedBrand;
    }
  }
}

/**
 * Validates that the brand identified by :brandId in the URL parameters
 * belongs to the authenticated user's tenant.
 *
 * Enforces security standard: Returns HTTP 404 Not Found rather than 403
 * to prevent leaking the existence of other tenants' resources.
 */
export async function validateBrandTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const { brandId } = req.params;

    if (!brandId) {
      return next();
    }

    if (!req.user || !req.user.tenantId) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    const brand = await db('brands')
      .where({ id: brandId, tenant_id: req.user.tenantId })
      .first();

    if (!brand) {
      return next(new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found'));
    }

    req.scopedBrand = brand;
    return next();
  } catch (err) {
    return next(err);
  }
}
