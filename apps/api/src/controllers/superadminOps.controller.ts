import type { Request, Response, NextFunction } from 'express';
import { SuperadminOpsService } from '../services/superadmin/superadminOps.service.js';
import { AppError } from '../middleware/errorHandler.js';

function getSuperadminUser(req: Request) {
  const user = (req as any).user;
  if (!user || !user.userId) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
  return {
    userId: user.userId,
    email: user.email || 'superadmin@socialforge.ai',
  };
}

export class SuperadminOpsController {
  // 1. TENANTS
  public static async searchTenants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, planId, status, page, limit } = req.query;
      const result = await SuperadminOpsService.searchTenants({
        search: search as string,
        planId: planId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async getTenantDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const detail = await SuperadminOpsService.getTenantDetail(tenantId);
      res.status(200).json({ success: true, data: detail });
    } catch (err) {
      next(err);
    }
  }

  // 2. SUBSCRIPTION
  public static async updateSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { tenantId } = req.params;
      const { planId, status, reason, confirmation } = req.body;
      const result = await SuperadminOpsService.updateTenantSubscription(superadmin, tenantId, {
        planId,
        status,
        reason,
        confirmation: Boolean(confirmation),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 3. USAGE
  public static async getUsageOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await SuperadminOpsService.getPlatformUsageOverview();
      res.status(200).json({ success: true, data: overview });
    } catch (err) {
      next(err);
    }
  }

  // 4. PROVIDER HEALTH
  public static async getProviderHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await SuperadminOpsService.getProviderHealth();
      res.status(200).json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }

  // 5. CONNECTION HEALTH
  public static async listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, provider, healthStatus, page, limit } = req.query;
      const result = await SuperadminOpsService.listConnectionHealth({
        tenantId: tenantId as string,
        provider: provider as string,
        healthStatus: healthStatus as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async testConnectionHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { id } = req.params;
      const { reason } = req.body;
      const result = await SuperadminOpsService.testConnectionHealth(superadmin, id, reason);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 6. AUTOMATION HEALTH
  public static async listAutomations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, status, page, limit } = req.query;
      const result = await SuperadminOpsService.listAutomationHealth({
        tenantId: tenantId as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async listFailedAutomations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, page, limit } = req.query;
      const result = await SuperadminOpsService.listFailedAutomations({
        tenantId: tenantId as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 7. QUEUE & WORKERS
  public static async getQueueHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await SuperadminOpsService.getQueueHealth();
      res.status(200).json({ success: true, data: health });
    } catch (err) {
      next(err);
    }
  }

  public static async listWorkerFailures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, jobType } = req.query;
      const result = await SuperadminOpsService.listWorkerFailures({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        jobType: jobType as string,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 8. RATE LIMITS
  public static async getRateLimits(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SuperadminOpsService.getRateLimitTelemetry();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 9. DLQ
  public static async listDlq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sourceType, page, limit, search } = req.query;
      const result = await SuperadminOpsService.listDlqJobs({
        sourceType: sourceType as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search as string,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static async retryDlq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { id } = req.params;
      const { sourceType, reason, confirmation, force } = req.body;
      const result = await SuperadminOpsService.retryDlqJob(superadmin, {
        jobId: id,
        sourceType: sourceType || 'publishing_job',
        reason,
        confirmation: Boolean(confirmation),
        force: Boolean(force),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 10. AUDIT LOGS
  public static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { superadminId, targetTenantId, action, search, page, limit } = req.query;
      const result = await SuperadminOpsService.listSuperadminAuditLogs({
        superadminId: superadminId as string,
        targetTenantId: targetTenantId as string,
        action: action as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 11. ENTITLEMENT MANAGEMENT
  public static async overrideEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { tenantId } = req.params;
      const { resource, limitValue, isEnabled, reason, confirmation } = req.body;
      const result = await SuperadminOpsService.overrideTenantEntitlement(superadmin, tenantId, {
        resource,
        limitValue: limitValue === undefined ? null : limitValue,
        isEnabled: isEnabled === undefined ? true : Boolean(isEnabled),
        reason,
        confirmation: Boolean(confirmation),
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // 12. IMPERSONATION
  public static async createImpersonation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { tenantId, reason, ticketReference, durationMinutes, confirmation } = req.body;
      const session = await SuperadminOpsService.createAuditedImpersonationSession(superadmin, {
        tenantId,
        reason,
        ticketReference,
        durationMinutes,
        confirmation: Boolean(confirmation),
      });
      res.status(201).json({ success: true, data: session });
    } catch (err) {
      next(err);
    }
  }

  public static async revokeImpersonation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const superadmin = getSuperadminUser(req);
      const { sessionId } = req.params;
      const { reason } = req.body;
      const result = await SuperadminOpsService.revokeImpersonationSession(superadmin, sessionId, reason);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
