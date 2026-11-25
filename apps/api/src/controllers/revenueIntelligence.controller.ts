/**
 * Enterprise Predictive Churn & Revenue Intelligence Controller
 * SocialForge Platform v5.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { revenueIntelligenceService, RevenueIntelligenceError } from '../services/superadmin/revenueIntelligence.service.js';

function actorOf(req: Request) {
  return {
    id: (req as any).user?.userId || 'unknown-operator',
    email: (req as any).user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof RevenueIntelligenceError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class RevenueIntelligenceController {
  // Telemetry overview
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await revenueIntelligenceService.getOverviewTelemetry();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // Churn scores
  async listChurnScores(req: Request, res: Response, next: NextFunction) {
    try {
      const { tier, primaryRiskFactor, limit, offset } = req.query;
      const data = await revenueIntelligenceService.listChurnScores({
        tier: tier as string | undefined,
        primaryRiskFactor: primaryRiskFactor as string | undefined,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getTenantChurnScore(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await revenueIntelligenceService.getTenantChurnScore(req.params.tenantId);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async evaluateTenantRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, forceReevaluation, usageVelocityScore, seatUtilizationPercent, billingHealthScore, supportSentiment } = req.body;
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }

      const customFactors = (usageVelocityScore !== undefined || seatUtilizationPercent !== undefined || billingHealthScore !== undefined || supportSentiment !== undefined)
        ? {
            usageVelocityScore: usageVelocityScore !== undefined ? Number(usageVelocityScore) : undefined,
            seatUtilizationPercent: seatUtilizationPercent !== undefined ? Number(seatUtilizationPercent) : undefined,
            billingHealthScore: billingHealthScore !== undefined ? Number(billingHealthScore) : undefined,
            supportSentiment: supportSentiment !== undefined ? Number(supportSentiment) : undefined,
          }
        : undefined;

      const data = await revenueIntelligenceService.evaluateTenantRisk(
        { tenantId, forceReevaluation },
        actorOf(req),
        customFactors
      );
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // LTV & Expansion metrics
  async listLtvMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { tier, limit } = req.query;
      const data = await revenueIntelligenceService.listLtvMetrics({
        tier: tier as string | undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getTenantLtvMetric(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await revenueIntelligenceService.getTenantLtvMetric(req.params.tenantId);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Interventions
  async listInterventions(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, priority, tenantId, limit } = req.query;
      const data = await revenueIntelligenceService.listInterventions({
        status: status as string | undefined,
        priority: priority as string | undefined,
        tenantId: tenantId as string | undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async createIntervention(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await revenueIntelligenceService.createIntervention(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateIntervention(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await revenueIntelligenceService.updateIntervention(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteIntervention(req: Request, res: Response, next: NextFunction) {
    try {
      await revenueIntelligenceService.deleteIntervention(req.params.id, actorOf(req));
      res.json({ success: true, message: 'Intervention successfully deleted' });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // Simulation
  async simulateScenario(req: Request, res: Response, next: NextFunction) {
    try {
      const { usageVelocityDelta, seatUtilizationDelta, billingHealthDelta, discountIncentiveApplied, trainingSessionCompleted } = req.body;
      const data = revenueIntelligenceService.simulateScenario({
        usageVelocityDelta: Number(usageVelocityDelta || 0),
        seatUtilizationDelta: Number(seatUtilizationDelta || 0),
        billingHealthDelta: Number(billingHealthDelta || 0),
        discountIncentiveApplied: Boolean(discountIncentiveApplied),
        trainingSessionCompleted: Boolean(trainingSessionCompleted),
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }
}

export const revenueIntelligenceController = new RevenueIntelligenceController();
