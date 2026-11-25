import type { Request, Response, NextFunction } from 'express';
import { FtueService } from '../services/onboarding/ftue.service.js';

export class FtueController {
  public static async getState(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant or user context.' });
        return;
      }

      const result = await FtueService.getOrCreateFtueState(tenantId, userId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async saveRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { role, objective } = req.body;
      const result = await FtueService.saveRoleAndObjective(tenantId, userId, role, objective);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async saveWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await FtueService.saveWorkspaceSetup(tenantId, userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async saveBrandKit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await FtueService.saveBrandKit(tenantId, userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async generateBrandAi(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { websiteUrl, businessName, industry } = req.body;
      const result = await FtueService.generateBrandAi(websiteUrl, businessName, industry);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async createFirstPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await FtueService.createFirstPost(tenantId, userId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async scheduleFirstPost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await FtueService.scheduleOrPublishFirstPost(tenantId, userId, req.body);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async trackEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { eventName, stepNumber, metadata } = req.body;
      await FtueService.logEvent(tenantId, userId, eventName, stepNumber, metadata);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  public static async getAdminAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = (req.query.tenantId as string) || req.user?.tenantId;
      const result = await FtueService.getAdminAnalytics(tenantId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

