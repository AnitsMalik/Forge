/**
 * Enterprise Cross-Region Active-Active Sharding, Distributed Transaction Coordinator & Autonomous Data Rebalancing Mesh Controller
 * SocialForge Platform v6.8.0
 */

import type { Request, Response } from 'express';
import { shardingMeshService } from '../../services/superadmin/shardingMesh.service.js';

export class ShardingMeshController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await shardingMeshService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listShards(req: Request, res: Response): Promise<void> {
    try {
      const shards = await shardingMeshService.getShards();
      res.json({ success: true, data: shards });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async registerShard(req: Request, res: Response): Promise<void> {
    try {
      const { shard_name, region, host_endpoint, vnodes_count } = req.body;
      if (!shard_name || !region || !host_endpoint) {
        res.status(400).json({
          success: false,
          error: 'shard_name, region, and host_endpoint are required',
        });
        return;
      }

      const shard = await shardingMeshService.registerShard({
        shard_name,
        region,
        host_endpoint,
        vnodes_count,
      });

      res.status(201).json({ success: true, data: shard });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteShard(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Shard id is required' });
        return;
      }

      const deleted = await shardingMeshService.deleteShard(id);
      res.json({ success: true, data: { deleted } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listRoutingRanges(req: Request, res: Response): Promise<void> {
    try {
      const ranges = await shardingMeshService.getRoutingRanges();
      res.json({ success: true, data: ranges });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async routeKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.query;
      if (!key || typeof key !== 'string') {
        res.status(400).json({ success: false, error: 'Query parameter key is required' });
        return;
      }

      const route = await shardingMeshService.routeKey(key);
      res.json({ success: true, data: route });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit } = req.query;
      const transactions = await shardingMeshService.getTransactions(
        status as string | undefined,
        limit ? Number(limit) : undefined
      );
      res.json({ success: true, data: transactions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTransactionDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Transaction id is required' });
        return;
      }

      const tx = await shardingMeshService.getTransactionDetail(id);
      if (!tx) {
        res.status(404).json({ success: false, error: `Transaction ${id} not found` });
        return;
      }

      res.json({ success: true, data: tx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async coordinateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { target_tenant_id, payload, simulate_participant_failure } = req.body;
      if (!target_tenant_id) {
        res.status(400).json({
          success: false,
          error: 'target_tenant_id is required',
        });
        return;
      }

      const tx = await shardingMeshService.coordinateTransaction({
        target_tenant_id,
        payload: payload || {},
        simulate_participant_failure: Boolean(simulate_participant_failure),
      });

      res.status(201).json({ success: true, data: tx });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Transaction id is required' });
        return;
      }

      const deleted = await shardingMeshService.deleteTransaction(id);
      res.json({ success: true, data: { deleted } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listMigrations(req: Request, res: Response): Promise<void> {
    try {
      const migrations = await shardingMeshService.getMigrations();
      res.json({ success: true, data: migrations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerRebalance(req: Request, res: Response): Promise<void> {
    try {
      const { source_shard_id, target_shard_id, vnode_id, total_keys } = req.body;
      if (!source_shard_id || !target_shard_id || !vnode_id) {
        res.status(400).json({
          success: false,
          error: 'source_shard_id, target_shard_id, and vnode_id are required',
        });
        return;
      }

      const migration = await shardingMeshService.triggerRebalance({
        source_shard_id,
        target_shard_id,
        vnode_id,
        total_keys,
      });

      res.status(201).json({ success: true, data: migration });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteMigration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Migration id is required' });
        return;
      }

      const deleted = await shardingMeshService.deleteMigration(id);
      res.json({ success: true, data: { deleted } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const shardingMeshController = new ShardingMeshController();
