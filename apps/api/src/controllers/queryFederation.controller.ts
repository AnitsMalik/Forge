import type { Request, Response } from 'express';
import { queryFederationService } from '../services/superadmin/queryFederation.service.js';

export class QueryFederationController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await queryFederationService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listSources(req: Request, res: Response): Promise<void> {
    try {
      const sources = await queryFederationService.getSources();
      res.json({ success: true, data: sources });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateSourceWeight(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { read_weight } = req.body;
      if (typeof read_weight !== 'number' || read_weight < 0) {
        res.status(400).json({ success: false, error: 'read_weight must be a non-negative number' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await queryFederationService.updateSourceWeight(id, read_weight, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listReplicas(req: Request, res: Response): Promise<void> {
    try {
      const replicas = await queryFederationService.getReplicas();
      res.json({ success: true, data: replicas });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async failoverReplica(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await queryFederationService.failoverReplica(id, reason, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listMaterializedViews(req: Request, res: Response): Promise<void> {
    try {
      const views = await queryFederationService.getMaterializedViews();
      res.json({ success: true, data: views });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async refreshMaterializedView(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { refresh_mode } = req.body || {};
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await queryFederationService.refreshMaterializedView(id, refresh_mode, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listRefreshLogs(req: Request, res: Response): Promise<void> {
    try {
      const { view_id, limit } = req.query;
      const logs = await queryFederationService.getRefreshLogs(
        view_id as string | undefined,
        limit ? parseInt(limit as string, 10) : 50
      );
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async benchmarkQuery(req: Request, res: Response): Promise<void> {
    try {
      const { query_type, target_table, routing_strategy } = req.body;
      if (!query_type || !target_table) {
        res.status(400).json({ success: false, error: 'query_type and target_table are required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await queryFederationService.benchmarkFederatedQuery(
        { query_type, target_table, routing_strategy },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const queryFederationController = new QueryFederationController();
