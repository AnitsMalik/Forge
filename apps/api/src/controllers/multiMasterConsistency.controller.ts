import type { Request, Response } from 'express';
import { multiMasterConsistencyService } from '../services/superadmin/multiMasterConsistency.service.js';

export class MultiMasterConsistencyController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await multiMasterConsistencyService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listNodes(req: Request, res: Response): Promise<void> {
    try {
      const nodes = await multiMasterConsistencyService.getNodes();
      res.json({ success: true, data: nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateFencing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { is_fenced, reason } = req.body;
      if (typeof is_fenced !== 'boolean') {
        res.status(400).json({ success: false, error: 'is_fenced boolean is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await multiMasterConsistencyService.updateNodeFencing(id, is_fenced, reason, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listVectorClocks(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type } = req.query;
      const clocks = await multiMasterConsistencyService.getVectorClocks(entity_type as string | undefined);
      res.json({ success: true, data: clocks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = await multiMasterConsistencyService.getPolicies();
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updatePolicy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resolution_strategy, tie_breaker_region, auto_resolve } = req.body;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await multiMasterConsistencyService.updatePolicy(
        id,
        { resolution_strategy, tie_breaker_region, auto_resolve },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listConvergenceLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const logs = await multiMasterConsistencyService.getConvergenceLogs(
        limit ? parseInt(limit as string, 10) : 50
      );
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulateConflict(req: Request, res: Response): Promise<void> {
    try {
      const {
        entity_type,
        entity_id,
        region_a,
        payload_a,
        timestamp_a,
        region_b,
        payload_b,
        timestamp_b,
        strategy_override,
      } = req.body;

      if (!entity_type || !entity_id || !region_a || !region_b) {
        res.status(400).json({ success: false, error: 'entity_type, entity_id, region_a, and region_b are required' });
        return;
      }

      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await multiMasterConsistencyService.simulateConflictRace(
        {
          entity_type,
          entity_id,
          region_a,
          payload_a: payload_a || {},
          timestamp_a: timestamp_a || new Date().toISOString(),
          region_b,
          payload_b: payload_b || {},
          timestamp_b: timestamp_b || new Date().toISOString(),
          strategy_override,
        },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const multiMasterConsistencyController = new MultiMasterConsistencyController();
