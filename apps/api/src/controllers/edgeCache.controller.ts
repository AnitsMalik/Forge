/**
 * Global Multi-Region Edge Caching & Content Delivery Network (CDN) Controller
 * SocialForge Platform v4.8.0
 */

import { Request, Response, NextFunction } from 'express';
import { edgeCacheService, EdgeCacheError } from '../services/superadmin/edgeCache.service.js';

function actorOf(req: Request) {
  return {
    id: req.user?.userId || 'unknown-operator',
    email: req.user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof EdgeCacheError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class EdgeCacheController {
  // Overview
  async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.getOverview();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // Nodes
  async listNodes(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.listNodes();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getNodeById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.getNodeById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateNodeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const data = await edgeCacheService.updateNodeStatus(req.params.id, status, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Rules
  async listRules(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const data = await edgeCacheService.listRules(tenantId);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getRuleById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.getRuleById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.createRule(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateRule(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.updateRule(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async toggleRule(req: Request, res: Response, next: NextFunction) {
    try {
      const { isEnabled } = req.body;
      const data = await edgeCacheService.toggleRule(req.params.id, Boolean(isEnabled), actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.deleteRule(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Purge
  async executePurge(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await edgeCacheService.executePurge(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listPurgeLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await edgeCacheService.listPurgeLogs(limit);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // Simulation
  async simulateEdgeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { route, method, headers } = req.body;
      const data = await edgeCacheService.simulateEdgeRequest(route, method, headers);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Metrics
  async getTrafficMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 24;
      const data = await edgeCacheService.getTrafficMetrics(limit);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }
}

export const edgeCacheController = new EdgeCacheController();
