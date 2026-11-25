import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import { AiCopyService } from '../services/aiCopyService.js';
import { BrandBrainService } from '../services/brandBrainService.js';
import { UsageTrackerService } from '../services/usageTracker.service.js';
import type { AiCopyRequest, AiTransformRequest, AiContentGenerateRequest } from '@socialforge/shared';

export class AiCopyController {
  /**
   * POST /api/v1/brands/:brandId/ai/generate-content
   * Supports all 10 content formats
   */
  public static async generateContent(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { contentType, prompt, targetAudience, callToAction, targetLanguage } = req.body as AiContentGenerateRequest;

      if (!prompt || !prompt.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Prompt text is required for AI content generation.' },
        });
        return;
      }

      if (!contentType) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Content type is required.' },
        });
        return;
      }

      const brand = await db('brands').where({ id: brandId }).first();
      if (!brand) {
        res.status(404).json({
          success: false,
          error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
        });
        return;
      }

      const brandKit = await db('brand_kits').where({ brand_id: brandId }).first();
      const brandBrain = await BrandBrainService.getBrandBrain(brandId);

      const result = AiCopyService.generateSpecificContent(
        { contentType, prompt, targetAudience, callToAction, targetLanguage },
        { name: brand.name, slug: brand.slug, industry: brand.industry },
        brandKit,
        brandBrain
      );

      // Record consumed AI tokens
      const tenantId = (req.user as any)?.tenantId || brand.tenant_id;
      if (tenantId) {
        const estimatedTokens = Math.max(150, Math.ceil(((prompt?.length || 0) + (result.content?.length || 0)) / 4));
        await UsageTrackerService.recordUsage(tenantId, 'ai_tokens_consumed', estimatedTokens).catch((e) =>
          console.warn('[AiCopyController] Failed to record token usage:', e?.message)
        );
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AiCopyController.generateContent] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'AI_CONTENT_ERROR', message: err.message || 'Failed to synthesize content.' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/ai/generate-copy
   */
  public static async generateCopy(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { prompt, style, campaignGoal, customTopic } = req.body as AiCopyRequest;

      if (!prompt || !prompt.trim()) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Prompt text is required for AI copy generation.' },
        });
        return;
      }

      // Fetch brand, legacy brand kit, and centralized Brand Brain
      const brand = await db('brands').where({ id: brandId }).first();
      if (!brand) {
        res.status(404).json({
          success: false,
          error: { code: 'BRAND_NOT_FOUND', message: 'Brand not found' },
        });
        return;
      }

      const brandKit = await db('brand_kits').where({ brand_id: brandId }).first();
      const brandBrain = await BrandBrainService.getBrandBrain(brandId);

      const result = AiCopyService.generateMultiPlatformCopy(
        { prompt, style, campaignGoal, customTopic },
        { name: brand.name, slug: brand.slug, industry: brand.industry },
        brandKit,
        brandBrain
      );

      // Record consumed AI tokens across platform variants
      const tenantId = (req.user as any)?.tenantId || brand.tenant_id;
      if (tenantId) {
        const variantsText = Object.values(result.variants || {}).reduce((acc: number, v: any) => acc + (v.content?.length || 0), 0);
        const estimatedTokens = Math.max(350, Math.ceil(((prompt?.length || 0) + variantsText) / 4));
        await UsageTrackerService.recordUsage(tenantId, 'ai_tokens_consumed', estimatedTokens).catch((e) =>
          console.warn('[AiCopyController] Failed to record token usage:', e?.message)
        );
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AiCopyController.generateCopy] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'AI_COPY_ERROR', message: err.message || 'Failed to synthesize multi-platform copy.' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/ai/transform-copy
   */
  public static async transformCopy(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { content, platform, operation } = req.body as AiTransformRequest;

      if (!content || !operation) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Content and operation are required.' },
        });
        return;
      }

      const result = AiCopyService.transformCopy({ content, platform, operation });

      // Record transformed AI tokens
      const tenantId = (req.user as any)?.tenantId;
      if (tenantId) {
        const estimatedTokens = Math.max(100, Math.ceil(((content?.length || 0) + (result.transformedContent?.length || 0)) / 4));
        await UsageTrackerService.recordUsage(tenantId, 'ai_tokens_consumed', estimatedTokens).catch((e) =>
          console.warn('[AiCopyController] Failed to record token usage:', e?.message)
        );
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AiCopyController.transformCopy] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'AI_TRANSFORM_ERROR', message: err.message || 'Failed to transform copy.' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/ai/hashtags
   */
  public static async getHashtags(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { text } = req.body;

      const brand = await db('brands').where({ id: brandId }).first();
      const brandName = brand ? brand.name : 'SocialForge';

      const result = AiCopyService.generateHashtags(brandName, text || '');

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AiCopyController.getHashtags] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'HASHTAG_GEN_ERROR', message: err.message || 'Failed to generate hashtags.' },
      });
    }
  }
}
