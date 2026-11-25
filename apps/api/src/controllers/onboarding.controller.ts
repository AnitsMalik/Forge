import type { Request, Response, NextFunction } from 'express';
import { OnboardingService } from '../services/onboarding/onboarding.service.js';

export class OnboardingController {
  /**
   * GET /api/v1/onboarding/status
   */
  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      const result = await OnboardingService.getOnboardingStatus(tenantId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/onboarding/brand
   */
  public static async createBrand(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId || req.user?.id;
      if (!tenantId || !userId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant or user context.' });
        return;
      }

      const result = await OnboardingService.createOnboardingBrand(tenantId, userId, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/onboarding/map-assets
   */
  public static async mapAssets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      const { brandId, connectionIds } = req.body;
      if (!brandId) {
        res.status(400).json({ success: false, error: 'brandId is required' });
        return;
      }

      const result = await OnboardingService.mapAssetsToBrand(tenantId, brandId, connectionIds || []);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/onboarding/communication
   */
  public static async configureCommunication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      const { brandId, channel, config } = req.body;
      if (!brandId || !channel || !config) {
        res.status(400).json({ success: false, error: 'brandId, channel, and config are required' });
        return;
      }

      const result = await OnboardingService.configureCommunicationChannel(tenantId, brandId, channel, config);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/onboarding/verify
   */
  public static async verifyChannels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      const brandId = req.query.brandId as string | undefined;
      const result = await OnboardingService.verifyAllWorkspaceChannels(tenantId, brandId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/onboarding/complete
   */
  public static async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing tenant context.' });
        return;
      }

      const { brandId } = req.body;
      if (!brandId) {
        res.status(400).json({ success: false, error: 'brandId is required' });
        return;
      }

      const result = await OnboardingService.completeOnboarding(tenantId, brandId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

