import type { Request, Response } from 'express';
import { databaseArchivalService } from '../services/superadmin/databaseArchival.service.js';

export class DatabaseArchivalController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await databaseArchivalService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await databaseArchivalService.getPartitionConfigs();
      res.json({ success: true, data: configs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const { table_name, partition_type, partition_key, retention_days, active_partition_count } = req.body;
      if (!table_name || !partition_key) {
        res.status(400).json({ success: false, error: 'table_name and partition_key are required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const config = await databaseArchivalService.createPartitionConfig(
        { table_name, partition_type, partition_key, retention_days, active_partition_count },
        operatorUserId
      );
      res.status(201).json({ success: true, data: config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async prunePartitions(req: Request, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await databaseArchivalService.prunePartitions(table, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  async listPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = await databaseArchivalService.getArchivalPolicies();
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { policy_name, target_table, age_threshold_days, target_storage_tier, compression_format, schedule_cron } = req.body;
      if (!policy_name || !target_table) {
        res.status(400).json({ success: false, error: 'policy_name and target_table are required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const policy = await databaseArchivalService.createArchivalPolicy(
        { policy_name, target_table, age_threshold_days, target_storage_tier, compression_format, schedule_cron },
        operatorUserId
      );
      res.status(201).json({ success: true, data: policy });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listArchives(req: Request, res: Response): Promise<void> {
    try {
      const { table_name, status } = req.query;
      const archives = await databaseArchivalService.getColdTierArchives({
        table_name: table_name as string,
        status: status as string,
      });
      res.json({ success: true, data: archives });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerArchival(req: Request, res: Response): Promise<void> {
    try {
      const { policy_id, dry_run } = req.body;
      if (!policy_id) {
        res.status(400).json({ success: false, error: 'policy_id is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await databaseArchivalService.triggerArchival({ policy_id, dry_run }, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async rehydrateArchive(req: Request, res: Response): Promise<void> {
    try {
      const { archive_id, target_hot_table } = req.body;
      if (!archive_id) {
        res.status(400).json({ success: false, error: 'archive_id is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await databaseArchivalService.rehydrateArchive({ archive_id, target_hot_table }, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listMaintenanceLogs(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const logs = await databaseArchivalService.getMaintenanceLogs(limit ? Number(limit) : 50);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulate(req: Request, res: Response): Promise<void> {
    try {
      const { table_name, daily_ingestion_rows, retention_days, compression_format } = req.body;
      if (!table_name) {
        res.status(400).json({ success: false, error: 'table_name is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await databaseArchivalService.simulatePartitioning(
        { table_name, daily_ingestion_rows, retention_days, compression_format },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const databaseArchivalController = new DatabaseArchivalController();
