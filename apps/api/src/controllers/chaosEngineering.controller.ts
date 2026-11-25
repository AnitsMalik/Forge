/**
 * Enterprise Automated Chaos Engineering & Resiliency Testing Controller
 * SocialForge Platform v5.3.0
 */

import { Request, Response, NextFunction } from 'express';
import {
  chaosEngineeringService,
  ChaosEngineeringError,
} from '../services/superadmin/chaosEngineering.service.js';

function actorOf(req: Request) {
  return {
    id: (req as any).user?.userId || 'unknown-operator',
    email: (req as any).user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof ChaosEngineeringError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class ChaosEngineeringController {
  async getTelemetry(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.getResilienceTelemetry();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async listExperiments(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, subsystem } = req.query;
      const data = await chaosEngineeringService.listExperiments({
        status: status as string | undefined,
        subsystem: subsystem as string | undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getExperimentById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.getExperimentById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createExperiment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.createExperiment(actorOf(req), req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateExperiment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.updateExperiment(actorOf(req), req.params.id, req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteExperiment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.deleteExperiment(actorOf(req), req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async executeExperiment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.executeExperiment(actorOf(req), req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async abortExperiment(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const data = await chaosEngineeringService.abortExperiment(
        actorOf(req),
        req.params.id,
        reason || 'Manual emergency abort triggered by operator'
      );
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async simulateChaos(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await chaosEngineeringService.simulateChaos(req.body);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listTripwires(req: Request, res: Response, next: NextFunction) {
    try {
      const { experimentId, limit } = req.query;
      const data = await chaosEngineeringService.getTripwireEvents(
        experimentId as string | undefined,
        limit ? Number(limit) : 50
      );
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }
}

export const chaosEngineeringController = new ChaosEngineeringController();
