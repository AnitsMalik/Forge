import { Request, Response } from 'express';
import { SiemService } from '../services/superadmin/siem.service.js';

export class SiemController {
  /**
   * GET /admin/operations/siem/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await SiemService.getOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[SiemController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve SIEM overview' });
    }
  }

  /**
   * GET /admin/operations/siem/destinations
   */
  static async listDestinations(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const destinations = await SiemService.listDestinations(tenantId as string);
      res.json(destinations);
    } catch (err: any) {
      console.error('[SiemController] listDestinations error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SIEM destinations' });
    }
  }

  /**
   * GET /admin/operations/siem/destinations/:id
   */
  static async getDestinationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const destination = await SiemService.getDestinationById(id);
      if (!destination) {
        res.status(404).json({ error: `SIEM destination ${id} not found` });
        return;
      }
      res.json(destination);
    } catch (err: any) {
      console.error('[SiemController] getDestinationById error:', err);
      res.status(500).json({ error: err.message || 'Failed to get SIEM destination' });
    }
  }

  /**
   * POST /admin/operations/siem/destinations
   */
  static async createDestination(req: Request, res: Response): Promise<void> {
    try {
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const created = await SiemService.createDestination(
        req.body,
        superadmin.id,
        superadmin.email
      );
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[SiemController] createDestination error:', err);
      res.status(400).json({ error: err.message || 'Failed to create SIEM destination' });
    }
  }

  /**
   * PUT /admin/operations/siem/destinations/:id
   */
  static async updateDestination(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const updated = await SiemService.updateDestination(
        id,
        req.body,
        superadmin.id,
        superadmin.email
      );
      res.json(updated);
    } catch (err: any) {
      console.error('[SiemController] updateDestination error:', err);
      res.status(400).json({ error: err.message || 'Failed to update SIEM destination' });
    }
  }

  /**
   * DELETE /admin/operations/siem/destinations/:id
   */
  static async deleteDestination(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      await SiemService.deleteDestination(id, superadmin.id, superadmin.email);
      res.status(204).send();
    } catch (err: any) {
      console.error('[SiemController] deleteDestination error:', err);
      res.status(400).json({ error: err.message || 'Failed to delete SIEM destination' });
    }
  }

  /**
   * PATCH /admin/operations/siem/destinations/:id/status
   */
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (status !== 'active' && status !== 'paused') {
        res.status(400).json({ error: 'Status must be active or paused' });
        return;
      }
      const superadmin = (req as any).user || { id: 'superadmin', email: 'superadmin@socialforge.ai' };
      const updated = await SiemService.toggleStatus(id, status, superadmin.id, superadmin.email);
      res.json(updated);
    } catch (err: any) {
      console.error('[SiemController] toggleStatus error:', err);
      res.status(400).json({ error: err.message || 'Failed to update stream status' });
    }
  }

  /**
   * POST /admin/operations/siem/destinations/:id/probe
   */
  static async dispatchProbe(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await SiemService.dispatchProbe(id, req.body || {});
      res.json(result);
    } catch (err: any) {
      console.error('[SiemController] dispatchProbe error:', err);
      res.status(400).json({ error: err.message || 'Failed to execute SIEM probe' });
    }
  }

  /**
   * GET /admin/operations/siem/logs
   */
  static async listDeliveryLogs(req: Request, res: Response): Promise<void> {
    try {
      const { destinationId, limit, offset } = req.query;
      const logs = await SiemService.listDeliveryLogs({
        destinationId: destinationId as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(logs);
    } catch (err: any) {
      console.error('[SiemController] listDeliveryLogs error:', err);
      res.status(500).json({ error: err.message || 'Failed to list SIEM delivery logs' });
    }
  }
}
