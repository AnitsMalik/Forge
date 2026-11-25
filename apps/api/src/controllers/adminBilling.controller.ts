import type { Request, Response, NextFunction } from 'express';
import { SuperadminBillingService } from '../services/billing/superadminBilling.service.js';
import { WebhookDlqService } from '../services/billing/webhookDlq.service.js';
import { BillingEmailService } from '../services/billing/billingEmail.service.js';
import { UsageAlertService } from '../services/billing/usageAlert.service.js';
import { PaymentReconciliationService } from '../services/billing/reconciliation.service.js';
import { db } from '../db/connection.js';

export class AdminBillingController {
  public static async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await SuperadminBillingService.getMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getRevenueHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = req.query.months ? parseInt(req.query.months as string, 10) : 6;
      const history = await SuperadminBillingService.getRevenueHistory(months);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status, planId } = req.query;
      const result = await SuperadminBillingService.listTenantSubscriptions({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search ? (search as string) : undefined,
        status: status ? (status as string) : undefined,
        planId: planId ? (planId as string) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await SuperadminBillingService.listGlobalAuditLogs(limit);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getDlqStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await WebhookDlqService.getStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listDlqDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status, eventType, search } = req.query;
      const result = await WebhookDlqService.listDeliveries({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status ? (status as string) : undefined,
        eventType: eventType ? (eventType as string) : undefined,
        search: search ? (search as string) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async replayDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const force = req.body?.force === true;
      const result = await WebhookDlqService.replayDelivery(id, force);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: { code: 'REPLAY_FAILED', message: err.message },
      });
    }
  }

  public static async replayAllDeliveries(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await WebhookDlqService.replayAllDeadLetters();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async discardDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const discarded = await WebhookDlqService.discardDelivery(id);
      res.status(200).json({
        success: true,
        data: { id, discarded },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listAllEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await BillingEmailService.ensureTable();
      const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
      const offset = (page - 1) * limit;
      const { search, template } = req.query;

      let query = db('billing_email_logs')
        .leftJoin('tenants', 'billing_email_logs.tenant_id', 'tenants.id')
        .select(
          'billing_email_logs.*',
          'tenants.name as tenant_name',
          'tenants.slug as tenant_slug'
        );

      if (template) {
        query = query.where('billing_email_logs.template', template as string);
      }

      if (search) {
        const s = `%${search}%`;
        query = query.where((q) => {
          q.where('billing_email_logs.recipient_email', 'like', s)
            .orWhere('billing_email_logs.subject', 'like', s)
            .orWhere('tenants.name', 'like', s);
        });
      }

      const countResult: any = await query.clone().clearSelect().count('billing_email_logs.id as count');
      const total = Number(countResult[0]?.count || countResult[0]?.['count(*)'] || 0);

      const items = await query.orderBy('billing_email_logs.created_at', 'desc').limit(limit).offset(offset);

      res.status(200).json({
        success: true,
        data: {
          items: items.map((r: any) => ({
            id: r.id,
            tenantId: r.tenant_id,
            tenantName: r.tenant_name || null,
            tenantSlug: r.tenant_slug || null,
            recipientEmail: r.recipient_email,
            recipientName: r.recipient_name,
            template: r.template,
            subject: r.subject,
            htmlBody: r.html_body,
            textBody: r.text_body,
            status: r.status,
            metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
            sentAt: r.sent_at,
            createdAt: r.created_at,
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async previewEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const email = await BillingEmailService.getEmailById(id);
      if (!email) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Billing email not found.' },
        });
        return;
      }

      if (req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(email.htmlBody);
        return;
      }

      res.status(200).json({
        success: true,
        data: email,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/billing/usage/alerts
   * Superadmin platform-wide usage alerts roster with cross-tenant visibility.
   */
  public static async listUsageAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, tenantId, periodMonth, resource, threshold } = req.query;

      const result = await UsageAlertService.listAllAlerts({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        tenantId: tenantId as string,
        periodMonth: periodMonth as string,
        resource: resource as string,
        threshold: threshold ? parseInt(threshold as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/billing/usage/alerts/evaluate
   * Superadmin can force quota evaluation for a specific tenant.
   */
  public static async evaluateTenantUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.body;
      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'tenantId is required in request body.' },
        });
        return;
      }

      const results = await UsageAlertService.evaluateAllTenantQuotas(tenantId);
      res.status(200).json({
        success: true,
        data: {
          tenantId,
          evaluatedCount: results.length,
          triggeredCount: results.filter((r) => r.triggered).length,
          results,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 1. Subscription Plan Management
  // =========================================================================

  public static async listPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await SuperadminBillingService.listPlans();
      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        email: (req as any).user?.email || 'admin@socialforge.io',
      };

      const updated = await SuperadminBillingService.updatePlan(id, req.body, adminUser);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 2. Customer Subscription Details & Plan Assignment
  // =========================================================================

  public static async getCustomerDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const details = await SuperadminBillingService.getCustomerDetails(tenantId);
      res.status(200).json({
        success: true,
        data: details,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async assignCustomerPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { planId, reason, immediate, customPriceCents } = req.body;

      if (!planId) {
        res.status(400).json({ success: false, error: 'planId is required.' });
        return;
      }
      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, error: 'Mandatory audit reason is required for administrative plan changes.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        email: (req as any).user?.email || 'admin@socialforge.io',
      };

      const updatedSub = await SuperadminBillingService.assignCustomerPlan(
        tenantId,
        { planId, reason, immediate, customPriceCents },
        adminUser
      );

      res.status(200).json({
        success: true,
        data: updatedSub,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 3. Enterprise Custom Entitlements
  // =========================================================================

  public static async setCustomerEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { resource, isEnabled, limitValue, config, reason, expiresAt, brandId } = req.body;

      if (!resource) {
        res.status(400).json({ success: false, error: 'resource is required.' });
        return;
      }
      if (isEnabled === undefined) {
        res.status(400).json({ success: false, error: 'isEnabled boolean is required.' });
        return;
      }
      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, error: 'Mandatory audit justification reason is required for enterprise entitlement overrides.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        email: (req as any).user?.email || 'admin@socialforge.io',
      };

      const result = await SuperadminBillingService.setCustomerEntitlement(
        tenantId,
        {
          resource,
          isEnabled: Boolean(isEnabled),
          limitValue: limitValue !== undefined && limitValue !== null ? Number(limitValue) : null,
          config,
          reason,
          expiresAt,
          brandId,
        },
        adminUser
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async removeCustomerEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, resource } = req.params;
      const { reason, brandId } = req.body || {};

      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, error: 'Mandatory audit reason is required to remove an override.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        email: (req as any).user?.email || 'admin@socialforge.io',
      };

      const result = await SuperadminBillingService.removeCustomerEntitlement(
        tenantId,
        resource,
        reason,
        adminUser,
        brandId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async rollbackEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { auditId } = req.params;
      const { reason } = req.body || {};

      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, error: 'Mandatory audit reason is required for rollback.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        email: (req as any).user?.email || 'admin@socialforge.io',
      };

      const result = await SuperadminBillingService.rollbackEntitlement(auditId, reason, adminUser);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // 4. Override Governance & Audit Trail
  // =========================================================================

  public static async listEntitlementAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, resource, action, adminEmail, page, limit } = req.query;

      const result = await SuperadminBillingService.listEntitlementAuditLogs({
        tenantId: tenantId as string | undefined,
        resource: resource as string | undefined,
        action: action as string | undefined,
        adminEmail: adminEmail as string | undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async reconcileAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await PaymentReconciliationService.reconcileAllTenants();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/billing/lifecycle/run-jobs
   * Executes all automated subscription lifecycle jobs: renewal reminders, scheduled cancellations,
   * quota resets at period boundaries, and dunning grace period evaluations.
   */
  public static async runLifecycleJobs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { SubscriptionLifecycleJobService } = await import('../services/billing/subscriptionLifecycleJob.service.js');
      const summary = await SubscriptionLifecycleJobService.runAllLifecycleJobs();
      res.status(200).json({
        success: true,
        data: summary,
        message: 'Automated subscription lifecycle jobs executed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/billing/invoices
   * Cross-tenant invoices and payment transactions roster with status filtering.
   */
  public static async listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, status, search, tenantId } = req.query;
      const result = await SuperadminBillingService.listInvoices({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        status: status as string | undefined,
        search: search as string | undefined,
        tenantId: tenantId as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/billing/usage/overview
   * Platform-wide quota monitoring & telemetry across all tenants and modules.
   */
  public static async getPlatformUsageOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search } = req.query;
      const result = await SuperadminBillingService.getPlatformUsageOverview({
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
        search: search as string | undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/billing/usage/disputes/resolve
   * Investigate & resolve customer quota dispute with audit tracking.
   */
  public static async resolveQuotaDispute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tenantId, resource, action, bonusAmount, newLimit, reason } = req.body;
      const adminUser = {
        id: req.user?.userId || 'superadmin_id',
        email: req.user?.email || 'admin@socialforge.io',
      };

      const result = await SuperadminBillingService.resolveQuotaDispute(
        {
          tenantId,
          resource,
          action,
          bonusAmount,
          newLimit,
          reason,
        },
        adminUser
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

