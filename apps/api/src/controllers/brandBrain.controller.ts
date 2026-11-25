import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { BrandBrainService } from '../services/brandBrainService.js';
import { WebsiteScraperService } from '../services/websiteScraperService.js';
import { UpdateBrandBrainSchema, WebsiteExtractionRequestSchema } from '@socialforge/shared';

export class BrandBrainController {
  /**
   * GET /api/v1/brands/:brandId/brain
   * Fetches the 16-dimension Brand Brain for a brand
   */
  public static async getBrandBrain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId } = req.params;

      const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
      if (!brand) {
        throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
      }

      const brain = await BrandBrainService.getBrandBrain(brandId);

      res.status(200).json({
        success: true,
        data: brain,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/brands/:brandId/brain
   * Updates the unified Brand Brain and syncs with brand_kits
   */
  public static async updateBrandBrain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId } = req.params;
      const validated = UpdateBrandBrainSchema.parse(req.body);

      const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
      if (!brand) {
        throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
      }

      const updatedBrain = await BrandBrainService.updateBrandBrain(brandId, validated as any);

      res.status(200).json({
        success: true,
        data: updatedBrain,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/brands/:brandId/brain/extract-website
   * Scrapes a public website URL, extracts factual brand & product information (0 hallucination),
   * and returns the draft result for user confirmation BEFORE saving.
   */
  public static async extractWebsite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId } = req.params;
      const { url } = WebsiteExtractionRequestSchema.parse(req.body);

      const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
      if (!brand) {
        throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
      }

      const extractionResult = await WebsiteScraperService.extractFromWebsite(url);

      res.status(200).json({
        success: true,
        data: extractionResult,
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * GET /api/v1/brands/:brandId/brain/ai-context
   * Diagnostic / preview endpoint for marketers to see the exact centralized AI prompt
   */
  public static async getAiContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId } = req.params;

      const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
      if (!brand) {
        throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found');
      }

      const brain = await BrandBrainService.getBrandBrain(brandId);
      const systemPrompt = BrandBrainService.buildAiContextPrompt(brain, {
        platform: req.query.platform as string,
        campaignGoal: req.query.campaignGoal as string,
      });

      res.status(200).json({
        success: true,
        data: {
          brandId,
          systemPrompt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
