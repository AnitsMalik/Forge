import { Request, Response } from 'express';
import { SlaStatusService } from '../services/superadmin/slaStatus.service.js';

export class SlaStatusController {
  /**
   * GET /admin/operations/sla/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await SlaStatusService.getOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[SlaStatusController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve SLA overview' });
    }
  }

  /**
   * GET /admin/operations/sla/components
   */
  static async getComponents(req: Request, res: Response): Promise<void> {
    try {
      const components = await SlaStatusService.getComponents();
      res.json(components);
    } catch (err: any) {
      console.error('[SlaStatusController] getComponents error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve components' });
    }
  }

  /**
   * POST /admin/operations/sla/components/:id/override
   */
  static async overrideComponentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason, confirmed } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      if (!reason || reason.trim().length < 8) {
        res.status(400).json({ error: 'Mandatory justification must be at least 8 characters.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await SlaStatusService.overrideComponentStatus(id, status, reason, adminUser);
      res.json(result);
    } catch (err: any) {
      console.error('[SlaStatusController] overrideComponentStatus error:', err);
      res.status(400).json({ error: err.message || 'Failed to override component status' });
    }
  }

  /**
   * POST /admin/operations/sla/components/:id/clear-override
   */
  static async clearComponentOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason, confirmed } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      if (!reason || reason.trim().length < 8) {
        res.status(400).json({ error: 'Mandatory justification must be at least 8 characters.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await SlaStatusService.clearComponentOverride(id, reason, adminUser);
      res.json(result);
    } catch (err: any) {
      console.error('[SlaStatusController] clearComponentOverride error:', err);
      res.status(400).json({ error: err.message || 'Failed to clear component override' });
    }
  }

  /**
   * POST /admin/operations/sla/probe
   */
  static async runSyntheticProbe(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const results = await SlaStatusService.runSyntheticProbe(adminUser);
      res.json({ success: true, results });
    } catch (err: any) {
      console.error('[SlaStatusController] runSyntheticProbe error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute synthetic probe' });
    }
  }

  /**
   * GET /admin/operations/sla/maintenance
   */
  static async getMaintenanceWindows(req: Request, res: Response): Promise<void> {
    try {
      const windows = await SlaStatusService.getMaintenanceWindows();
      res.json(windows);
    } catch (err: any) {
      console.error('[SlaStatusController] getMaintenanceWindows error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve maintenance windows' });
    }
  }

  /**
   * POST /admin/operations/sla/maintenance
   */
  static async scheduleMaintenanceWindow(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, impactLevel, impactedComponents, scheduledStartAt, scheduledEndAt, confirmed } =
        req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const created = await SlaStatusService.scheduleMaintenanceWindow(
        {
          title,
          description,
          impactLevel,
          impactedComponents,
          scheduledStartAt,
          scheduledEndAt,
        },
        adminUser
      );

      res.status(201).json(created);
    } catch (err: any) {
      console.error('[SlaStatusController] scheduleMaintenanceWindow error:', err);
      res.status(400).json({ error: err.message || 'Failed to schedule maintenance window' });
    }
  }

  /**
   * POST /admin/operations/sla/maintenance/:id/status
   */
  static async updateMaintenanceWindowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, reason, confirmed } = req.body;

      if (!confirmed) {
        res.status(400).json({ error: 'Explicit operator confirmation is required.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const updated = await SlaStatusService.updateMaintenanceWindowStatus(id, status, reason, adminUser);
      res.json(updated);
    } catch (err: any) {
      console.error('[SlaStatusController] updateMaintenanceWindowStatus error:', err);
      res.status(400).json({ error: err.message || 'Failed to update maintenance window' });
    }
  }

  /**
   * GET /api/v1/status or GET /api/status (Public Zero-Credential Endpoint)
   */
  static async getPublicStatus(req: Request, res: Response): Promise<void> {
    try {
      res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=45');
      const payload = await SlaStatusService.getPublicStatus();
      res.json(payload);
    } catch (err: any) {
      console.error('[SlaStatusController] getPublicStatus error:', err);
      res.status(500).json({
        platformName: 'SocialForge Enterprise Cloud',
        overallStatus: 'operational',
        statusMessage: 'Systems reporting normally',
        components: [],
        activeIncidents: [],
        upcomingMaintenance: [],
      });
    }
  }
}
