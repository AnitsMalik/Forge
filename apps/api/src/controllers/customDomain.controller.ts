/**
 * Multi-Tenant Custom Domains & White-Label Agency Portals Controller
 * SocialForge Platform v4.6.0
 */

import { Request, Response, NextFunction } from 'express';
import { customDomainService, CustomDomainError } from '../services/superadmin/customDomain.service.js';

function actorOf(req: Request) {
  return {
    id: req.user?.userId || 'unknown-admin',
    email: req.user?.email || 'admin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof CustomDomainError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class CustomDomainController {
  // ---------------------------------------------------------------------------
  // Superadmin Management Endpoints (/api/v1/admin/operations/custom-domains/*)
  // ---------------------------------------------------------------------------

  async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.getOverview();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async listDomains(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, tenantId, portalType, search, page, limit } = req.query;
      const data = await customDomainService.listDomains({
        status: status as string | undefined,
        tenantId: tenantId as string | undefined,
        portalType: portalType as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getDomainById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.getDomainById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.createDomain(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.updateDomain(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.updateBranding(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.deleteDomain(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async verifyDns(req: Request, res: Response, next: NextFunction) {
    try {
      const { forceSuccess, cnameActual, txtActual } = req.body || {};
      const override = forceSuccess !== undefined ? { forceSuccess, cnameActual, txtActual } : undefined;
      const data = await customDomainService.verifyDns(req.params.id, override, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async renewSsl(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await customDomainService.renewSslCertificate(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listAccessLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Number(req.query.limit) || 50;
      const data = await customDomainService.listAccessLogs(req.params.id, limit);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // ---------------------------------------------------------------------------
  // Public White-Label Endpoints (/api/v1/public/white-label/*)
  // ---------------------------------------------------------------------------

  async resolveWhiteLabelConfig(req: Request, res: Response, next: NextFunction) {
    try {
      // Determine hostname from query param or host header
      const host = (req.query.domain as string) || req.headers['x-forwarded-host'] || req.headers.host || '';
      const data = await customDomainService.resolveWhiteLabelConfig(String(host));
      if (!data) {
        return res.status(404).json({ success: false, error: 'Custom domain not found or not active.' });
      }

      // Record access log for telemetry
      const domainObj = await customDomainService.getDomainByName(data.domain);
      if (domainObj) {
        customDomainService.recordAccessLog({
          customDomainId: domainObj.id,
          tenantId: domainObj.tenantId,
          hostHeader: String(host),
          requestPath: req.originalUrl || req.path || '/config',
          clientIp: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
          userAgent: (req.headers['user-agent'] as string) || 'WhiteLabelClient/1.0',
          statusCode: 200,
          responseTimeMs: 4,
        }).catch((err) => console.error('[CustomDomainController] Access log write error:', err));
      }

      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async validateDomain(req: Request, res: Response, next: NextFunction) {
    try {
      const domain = String(req.query.domain || '').trim().toLowerCase();
      if (!domain) {
        return res.status(400).json({ success: false, error: 'domain query parameter is required.' });
      }
      const existing = await customDomainService.getDomainByName(domain);
      res.json({
        success: true,
        data: {
          domain,
          available: existing === null,
          registered: existing !== null,
          status: existing ? existing.status : null,
        },
      });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }
}

export const customDomainController = new CustomDomainController();
