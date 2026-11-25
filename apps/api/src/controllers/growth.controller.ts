import type { Request, Response } from 'express';
import {
  multiPeriodBaselineService,
  growthAdvisorService,
  experimentEngineService,
  engagementHalfLifeService,
  liftEstimatorService,
  growthPipelineService,
  viralPredictionService,
  abTestingService,
} from '../services/growth/index.js';

export class GrowthController {
  private getTenantId(req: Request): string {
    return (
      (req as any).tenantId ||
      (req as any).user?.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      'default-tenant'
    );
  }

  private getBrandId(req: Request): string {
    return (
      req.params.brandId ||
      (req.query.brandId as string) ||
      (req.body.brandId as string) ||
      (req.headers['x-brand-id'] as string) ||
      'default-brand'
    );
  }

  /**
   * GET /api/v1/brands/:brandId/growth/baselines
   */
  public getBaselines = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const platform = (req.query.platform as string) || 'all';

      // If user specifically requested days parameter, enforce retention ceiling
      if (req.query.days) {
        const days = Number(req.query.days);
        await multiPeriodBaselineService.enforceRetention(tenantId, days);
      }

      const snapshot = await multiPeriodBaselineService.getBaselines(tenantId, brandId, platform);
      res.json({ success: true, data: snapshot });
    } catch (err: any) {
      const statusCode = err.statusCode || (err.name === 'PlanGuardError' ? 403 : 500);
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || 'BASELINES_FAILED',
          message: err.message || 'Failed to retrieve multi-period baselines.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/baselines/recalculate
   */
  public recalculateBaselines = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const platform = (req.body.platform as string) || (req.query.platform as string) || 'all';

      const baselines = await multiPeriodBaselineService.calculateBaselines(tenantId, brandId, platform);
      res.json({ success: true, data: baselines });
    } catch (err: any) {
      const statusCode = err.statusCode || (err.name === 'PlanGuardError' ? 403 : 500);
      res.status(statusCode).json({
        success: false,
        error: {
          code: err.code || 'RECALCULATE_BASELINES_FAILED',
          message: err.message || 'Failed to recalculate baselines.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/recommendations
   */
  public getRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const status = req.query.status as string;
      const category = req.query.category as string;

      const recommendations = await growthAdvisorService.getRecommendations(tenantId, brandId, {
        status,
        category,
      });
      res.json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATIONS_FAILED',
          message: err.message || 'Failed to fetch growth recommendations.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/recommendations/generate
   */
  public generateRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);

      const recommendations = await growthAdvisorService.generateRecommendations(tenantId, brandId);
      res.json({ success: true, data: recommendations });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GENERATE_RECOMMENDATIONS_FAILED',
          message: err.message || 'Failed to generate recommendations.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/recommendations/:id/apply
   */
  public applyRecommendation = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const recommendationId = req.params.id;
      const userId = (req as any).user?.id;

      const applied = await growthAdvisorService.applyRecommendation(
        tenantId,
        brandId,
        recommendationId,
        userId
      );
      res.json({ success: true, data: applied });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'APPLY_RECOMMENDATION_FAILED',
          message: err.message || 'Failed to apply recommendation.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/recommendations/:id/dismiss
   */
  public dismissRecommendation = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const recommendationId = req.params.id;

      const dismissed = await growthAdvisorService.dismissRecommendation(
        tenantId,
        brandId,
        recommendationId
      );
      res.json({ success: true, data: dismissed });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'DISMISS_RECOMMENDATION_FAILED',
          message: err.message || 'Failed to dismiss recommendation.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/experiments
   */
  public getExperiments = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);

      const experiments = await experimentEngineService.getExperiments(tenantId, brandId);
      res.json({ success: true, data: experiments });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_EXPERIMENTS_FAILED',
          message: err.message || 'Failed to get experiments.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/experiments
   */
  public createExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { experimentName, hypothesis, variantType, variants } = req.body;

      if (!experimentName || !variantType || !Array.isArray(variants) || variants.length < 2) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_EXPERIMENT_INPUT',
            message: 'Experiment requires experimentName, variantType, and at least 2 variants.',
          },
        });
        return;
      }

      const created = await experimentEngineService.createExperiment(tenantId, brandId, {
        experimentName,
        hypothesis,
        variantType,
        variants,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_EXPERIMENT_FAILED',
          message: err.message || 'Failed to create experiment.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/experiments/:experimentId/variants/:variantLetter/telemetry
   */
  public recordVariantTelemetry = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { experimentId, variantLetter } = req.params;
      const { impressions, engagements, conversions, sampleSize } = req.body;

      const updated = await experimentEngineService.recordVariantTelemetry(
        tenantId,
        brandId,
        experimentId,
        variantLetter,
        {
          impressions: Number(impressions || 0),
          engagements: Number(engagements || 0),
          conversions: Number(conversions || 0),
          sampleSize: sampleSize ? Number(sampleSize) : undefined,
        }
      );

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'RECORD_TELEMETRY_FAILED',
          message: err.message || 'Failed to record variant telemetry.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/experiments/:experimentId/evaluate
   */
  public evaluateExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { experimentId } = req.params;

      const evaluation = await experimentEngineService.evaluateExperiment(
        tenantId,
        brandId,
        experimentId
      );

      res.json({ success: true, data: evaluation });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'EVALUATE_EXPERIMENT_FAILED',
          message: err.message || 'Failed to evaluate experiment.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/experiments/:experimentId/conclude
   */
  public concludeExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { experimentId } = req.params;
      const { winningVariantLetter } = req.body;

      const concluded = await experimentEngineService.concludeExperiment(
        tenantId,
        brandId,
        experimentId,
        winningVariantLetter
      );

      res.json({ success: true, data: concluded });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CONCLUDE_EXPERIMENT_FAILED',
          message: err.message || 'Failed to conclude experiment.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/half-life
   */
  public getHalfLifeMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const platform = (req.query.platform as string) || 'facebook';
      const publishedAt = (req.query.publishedAt as string) || new Date().toISOString();
      const currentEngagements = Number(req.query.currentEngagements || 0);
      const velocityScore = req.query.velocityScore ? Number(req.query.velocityScore) : undefined;

      const result = engagementHalfLifeService.evaluateEngagementVelocity(
        platform,
        publishedAt,
        currentEngagements,
        velocityScore
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'HALF_LIFE_FAILED',
          message: err.message || 'Failed to calculate half-life metrics.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/lift/estimate
   */
  public estimateLift = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        variantMetric,
        baselineMetric,
        variantSampleSize,
        baselineSampleSize,
        confidenceLevel,
      } = req.body;

      const result = liftEstimatorService.estimateLift(
        Number(variantMetric || 0),
        Number(baselineMetric || 0),
        Number(variantSampleSize || 1),
        Number(baselineSampleSize || 1),
        confidenceLevel ? Number(confidenceLevel) : 0.95
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LIFT_ESTIMATE_FAILED',
          message: err.message || 'Failed to estimate lift.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/goal-gap
   */
  public getGoalGap = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const period = (req.query.period as string) || '30d';

      const analysis = await growthPipelineService.analyzeGoalGaps(tenantId, brandId, period);
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GOAL_GAP_FAILED',
          message: err.message || 'Failed to calculate goal-gap analysis.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/goals
   */
  public getGoals = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const period = (req.query.period as string) || '30d';

      const goals = await growthPipelineService.getGoals(tenantId, brandId, period);
      res.json({ success: true, data: goals });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_GOALS_FAILED',
          message: err.message || 'Failed to fetch brand goals.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/goals
   */
  public setGoal = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { metric, targetValue, period, startDate, endDate } = req.body;

      if (!metric || targetValue === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_GOAL_INPUT',
            message: 'Metric and targetValue are required.',
          },
        });
        return;
      }

      const goal = await growthPipelineService.setGoal(tenantId, brandId, {
        metric,
        targetValue: Number(targetValue),
        period,
        startDate,
        endDate,
      });

      res.status(201).json({ success: true, data: goal });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SET_GOAL_FAILED',
          message: err.message || 'Failed to set brand goal.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/dimensions
   */
  public getDimensions = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const period = (req.query.period as string) || '30d';

      const dimensions = await growthPipelineService.analyzeDimensions(tenantId, brandId, period);
      res.json({ success: true, data: dimensions });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'DIMENSIONS_FAILED',
          message: err.message || 'Failed to analyze performance dimensions.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/forecast
   */
  public getForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const horizonDays = req.body?.horizonDays ? Number(req.body.horizonDays) : 30;

      const forecast = await growthPipelineService.generateForecastRanges(tenantId, brandId, horizonDays);
      res.json({ success: true, data: forecast });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FORECAST_FAILED',
          message: err.message || 'Failed to generate growth forecast ranges.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/repurposing
   */
  public getRepurposing = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);

      const items = await growthPipelineService.generateCrossChannelRepurposings(tenantId, brandId);
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'REPURPOSING_FAILED',
          message: err.message || 'Failed to generate cross-channel repurposing suggestions.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/pipeline/run
   */
  public runPipeline = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { simulatedProviderFailure, period } = req.body || {};

      const result = await growthPipelineService.executePipeline(tenantId, brandId, {
        simulatedProviderFailure,
        period,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PIPELINE_RUN_FAILED',
          message: err.message || 'Failed to execute growth analytics pipeline.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/viral/predict
   */
  public predictViralScore = async (req: Request, res: Response): Promise<void> => {
    try {
      const brandId = this.getBrandId(req);
      const { content, platform, mediaUrls, postVariantId } = req.body || {};

      if (!content || !platform) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Content and platform are required.' },
        });
        return;
      }

      const prediction = await viralPredictionService.predict({
        brandId,
        postVariantId,
        platform,
        content,
        mediaUrls,
      });

      res.json({ success: true, data: prediction });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'VIRAL_PREDICTION_FAILED',
          message: err.message || 'Failed to compute viral probability prediction.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/ab-tests
   */
  public createABExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = this.getTenantId(req);
      const brandId = this.getBrandId(req);
      const { postId, name, variants, flightWindowHours, sampleSizeTarget } = req.body || {};

      if (!postId || !name || !variants || variants.length < 2) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'PostId, name, and at least 2 variants are required.' },
        });
        return;
      }

      const result = await abTestingService.createExperiment({
        tenantId,
        brandId,
        postId,
        name,
        variants,
        flightWindowHours,
        sampleSizeTarget,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AB_EXPERIMENT_CREATE_FAILED',
          message: err.message || 'Failed to create A/B experiment.',
        },
      });
    }
  };

  /**
   * POST /api/v1/brands/:brandId/growth/ab-tests/:experimentId/evaluate
   */
  public evaluateABSignificance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentId } = req.params;
      const result = await abTestingService.evaluateSignificance(experimentId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AB_EVALUATION_FAILED',
          message: err.message || 'Failed to evaluate A/B test significance.',
        },
      });
    }
  };

  /**
   * GET /api/v1/brands/:brandId/growth/ab-tests/:experimentId
   */
  public getABExperiment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { experimentId } = req.params;
      const details = await abTestingService.getExperimentDetails(experimentId);
      res.json({ success: true, data: details });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AB_DETAILS_FAILED',
          message: err.message || 'Failed to retrieve A/B test details.',
        },
      });
    }
  };
}

export const growthController = new GrowthController();
