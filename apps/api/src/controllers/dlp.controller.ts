import { Request, Response } from 'express';
import { DlpService } from '../services/superadmin/dlp.service.js';

export class DlpController {
  /**
   * GET /admin/operations/dlp/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const overview = await DlpService.getOverview(tenantId as string);
      res.json(overview);
    } catch (err: any) {
      console.error('[DlpController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve DLP overview' });
    }
  }

  /**
   * GET /admin/operations/dlp/policies
   */
  static async listPolicies(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, category, enabled, search } = req.query;
      const filter: any = {};
      if (category) filter.category = category as string;
      if (enabled !== undefined) filter.enabled = enabled === 'true';
      if (search) filter.search = search as string;

      const policies = await DlpService.listPolicies(tenantId as string, filter);
      res.json(policies);
    } catch (err: any) {
      console.error('[DlpController] listPolicies error:', err);
      res.status(500).json({ error: err.message || 'Failed to list DLP policies' });
    }
  }

  /**
   * GET /admin/operations/dlp/policies/:id
   */
  static async getPolicyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;
      const policy = await DlpService.getPolicyById(id, tenantId as string);
      if (!policy) {
        res.status(404).json({ error: `DLP policy ${id} not found` });
        return;
      }
      res.json(policy);
    } catch (err: any) {
      console.error('[DlpController] getPolicyById error:', err);
      res.status(500).json({ error: err.message || 'Failed to get DLP policy' });
    }
  }

  /**
   * POST /admin/operations/dlp/policies
   */
  static async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const { tenantId, ...body } = req.body;
      const created = await DlpService.createPolicy(tenantId || null, body, user);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[DlpController] createPolicy error:', err);
      res.status(400).json({ error: err.message || 'Failed to create DLP policy' });
    }
  }

  /**
   * PUT /admin/operations/dlp/policies/:id
   */
  static async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const { id } = req.params;
      const { tenantId, ...body } = req.body;
      const updated = await DlpService.updatePolicy(id, tenantId || null, body, user);
      res.json(updated);
    } catch (err: any) {
      console.error('[DlpController] updatePolicy error:', err);
      res.status(400).json({ error: err.message || 'Failed to update DLP policy' });
    }
  }

  /**
   * DELETE /admin/operations/dlp/policies/:id
   */
  static async deletePolicy(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const { id } = req.params;
      const { tenantId } = req.query;
      await DlpService.deletePolicy(id, (tenantId as string) || null, user);
      res.json({ success: true, message: `DLP policy ${id} deleted successfully` });
    } catch (err: any) {
      console.error('[DlpController] deletePolicy error:', err);
      res.status(400).json({ error: err.message || 'Failed to delete DLP policy' });
    }
  }

  /**
   * POST /admin/operations/dlp/policies/:id/toggle
   */
  static async togglePolicy(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const { id } = req.params;
      const { tenantId, is_enabled } = req.body;
      const updated = await DlpService.togglePolicy(id, tenantId || null, Boolean(is_enabled), user);
      res.json(updated);
    } catch (err: any) {
      console.error('[DlpController] togglePolicy error:', err);
      res.status(400).json({ error: err.message || 'Failed to toggle DLP policy' });
    }
  }

  /**
   * POST /admin/operations/dlp/inspect
   */
  static async inspectContent(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, content, targetScope, entityType, entityId } = req.body;
      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }
      if (!targetScope) {
        res.status(400).json({ error: 'targetScope is required' });
        return;
      }

      const result = await DlpService.inspectContent(
        tenantId,
        content || '',
        targetScope,
        { entityType: entityType || 'post', entityId }
      );
      res.json(result);
    } catch (err: any) {
      console.error('[DlpController] inspectContent error:', err);
      res.status(500).json({ error: err.message || 'Failed to inspect content' });
    }
  }

  /**
   * POST /admin/operations/dlp/simulate
   */
  static async simulateScan(req: Request, res: Response): Promise<void> {
    try {
      const { content, policyIds } = req.body;
      const result = await DlpService.simulateScan(content || '', policyIds);
      res.json(result);
    } catch (err: any) {
      console.error('[DlpController] simulateScan error:', err);
      res.status(500).json({ error: err.message || 'Failed to simulate DLP scan' });
    }
  }

  /**
   * GET /admin/operations/dlp/incidents
   */
  static async listIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, severity, action_taken, quarantine_status, search, page, limit } = req.query;
      const result = await DlpService.listIncidents(tenantId as string, {
        severity: severity as string,
        action_taken: action_taken as string,
        quarantine_status: quarantine_status as string,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      console.error('[DlpController] listIncidents error:', err);
      res.status(500).json({ error: err.message || 'Failed to list DLP incidents' });
    }
  }

  /**
   * POST /admin/operations/dlp/incidents/:id/review
   */
  static async reviewQuarantine(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const { id } = req.params;
      const { tenantId, decision, reviewNotes } = req.body;

      if (!tenantId) {
        res.status(400).json({ error: 'tenantId is required' });
        return;
      }
      if (!decision || (decision !== 'approved_override' && decision !== 'rejected_dismissed')) {
        res.status(400).json({ error: 'Valid decision ("approved_override" or "rejected_dismissed") is required' });
        return;
      }

      const updated = await DlpService.reviewQuarantine(
        id,
        tenantId,
        decision,
        user,
        reviewNotes
      );
      res.json(updated);
    } catch (err: any) {
      console.error('[DlpController] reviewQuarantine error:', err);
      res.status(400).json({ error: err.message || 'Failed to review quarantined incident' });
    }
  }
}
