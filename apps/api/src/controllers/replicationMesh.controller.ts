/**
 * Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh Controller
 * SocialForge Platform v5.2.0
 */

import { Request, Response, NextFunction } from 'express';
import {
  replicationMeshService,
  ReplicationMeshError,
} from '../services/superadmin/replicationMesh.service.js';

function actorOf(req: Request) {
  return {
    id: (req as any).user?.userId || 'unknown-operator',
    email: (req as any).user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof ReplicationMeshError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class ReplicationMeshController {
  async getTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.getTopologyTelemetry();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async listNodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { region_code, role, status } = req.query;
      const data = await replicationMeshService.getNodes({
        region_code: region_code as string | undefined,
        role: role as string | undefined,
        status: status as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getNodeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.getNodeById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.createNode(actorOf(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.updateNode(actorOf(req), req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteNode(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.deleteNode(actorOf(req), req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async recordHeartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.recordHeartbeat(actorOf(req), req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listHeartbeats(req: Request, res: Response, next: NextFunction) {
    try {
      const { nodeId, limit } = req.query;
      const data = await replicationMeshService.getHeartbeats(
        nodeId as string | undefined,
        limit ? Number(limit) : 50
      );
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async simulateFailover(req: Request, res: Response, next: NextFunction) {
    try {
      const { candidateNodeId } = req.body;
      if (!candidateNodeId) {
        return res.status(400).json({ success: false, error: 'candidateNodeId is required for simulation.' });
      }
      const data = await replicationMeshService.simulateFailover(candidateNodeId);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async executeFailover(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await replicationMeshService.executeFailover(actorOf(req), req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listFailoverEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;
      const data = await replicationMeshService.getFailoverEvents(limit ? Number(limit) : 50);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }
}

export const replicationMeshController = new ReplicationMeshController();
