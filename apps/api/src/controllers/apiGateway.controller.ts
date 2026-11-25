/**
 * Enterprise Global API Gateway & Rate Limiting Controller
 * SocialForge Platform v5.1.0
 */

import { Request, Response, NextFunction } from 'express';
import { apiGatewayService, ApiGatewayError } from '../services/superadmin/apiGateway.service.js';

function actorOf(req: Request) {
  return {
    id: (req as any).user?.userId || 'unknown-operator',
    email: (req as any).user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof ApiGatewayError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class ApiGatewayController {
  async getTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await apiGatewayService.getTelemetry();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async listRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceName, isActive, tier, search } = req.query;
      const data = await apiGatewayService.listRoutes({
        serviceName: serviceName as string | undefined,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        tier: tier as string | undefined,
        search: search as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getRouteById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await apiGatewayService.getRouteById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await apiGatewayService.createRoute(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await apiGatewayService.updateRoute(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteRoute(req: Request, res: Response, next: NextFunction) {
    try {
      await apiGatewayService.deleteRoute(req.params.id, actorOf(req));
      res.json({ success: true, message: 'Gateway route deleted successfully' });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listBuckets(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, routeId, isThrottled, limit } = req.query;
      const data = await apiGatewayService.listBuckets({
        tenantId: tenantId as string | undefined,
        routeId: routeId as string | undefined,
        isThrottled: isThrottled !== undefined ? isThrottled === 'true' : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async resetBucket(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, routeId } = req.body;
      if (!tenantId || !routeId) {
        return res.status(400).json({ success: false, error: 'tenantId and routeId are required' });
      }
      const data = await apiGatewayService.resetBucket(tenantId, routeId, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async consumeToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, routePath, tokenCost } = req.body;
      if (!tenantId || !routePath) {
        return res.status(400).json({ success: false, error: 'tenantId and routePath are required' });
      }
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const result = await apiGatewayService.consumeToken(tenantId, routePath, Number(tokenCost || 1), clientIp);

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded: Token bucket capacity exhausted',
          data: result,
        });
      }

      res.json({ success: true, data: result });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listThrottleLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, limit } = req.query;
      const data = await apiGatewayService.listThrottleLogs({
        tenantId: tenantId as string | undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async simulateThrottle(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, routePath, tokenCost, simulateBurst } = req.body;
      if (!tenantId || !routePath) {
        return res.status(400).json({ success: false, error: 'tenantId and routePath are required' });
      }
      const data = apiGatewayService.simulateThrottle({
        tenantId,
        routePath,
        tokenCost: tokenCost ? Number(tokenCost) : 1,
        simulateBurst: simulateBurst ? Number(simulateBurst) : 1,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }
}

export const apiGatewayController = new ApiGatewayController();
