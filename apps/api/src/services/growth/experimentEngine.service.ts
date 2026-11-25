import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { LiftEstimatorService, liftEstimatorService } from './liftEstimator.service.js';
import { BrandBrainService } from '../brandBrainService.js';
import type {
  ExperimentVariant,
  ExperimentVariantType,
  ExperimentStatus,
  LiftEstimateResult,
} from '@socialforge/shared';

export interface CreateExperimentInput {
  experimentName: string;
  hypothesis?: string;
  variantType: ExperimentVariantType;
  variants: Array<{
    letter: string; // 'A', 'B', etc.
    postVariantId?: string;
    sampleSize?: number;
    impressions?: number;
    engagements?: number;
    conversions?: number;
    metadata?: Record<string, any>;
  }>;
}

export class ExperimentEngineService {
  private liftEstimator: LiftEstimatorService;

  constructor(estimator = liftEstimatorService) {
    this.liftEstimator = estimator;
  }

  /**
   * Creates a new A/B or multivariate experiment with control and test variants.
   */
  public async createExperiment(
    tenantId: string,
    brandId: string,
    input: CreateExperimentInput
  ): Promise<ExperimentVariant[]> {
    const experimentId = crypto.randomUUID();
    const now = new Date();
    const createdVariants: ExperimentVariant[] = [];

    for (const v of input.variants) {
      const variantId = crypto.randomUUID();
      const impressions = Number(v.impressions || 0);
      const engagements = Number(v.engagements || 0);
      const conversions = Number(v.conversions || 0);
      const sampleSize = Number(v.sampleSize || impressions || 0);

      const engagementRate = impressions > 0
        ? Math.round(((engagements / impressions) * 100) * 100) / 100
        : 0;
      const conversionRate = impressions > 0
        ? Math.round(((conversions / impressions) * 100) * 100) / 100
        : 0;

      const variantRecord: ExperimentVariant = {
        id: variantId,
        tenantId,
        brandId,
        experimentId,
        experimentName: input.experimentName,
        hypothesis: input.hypothesis || null,
        variantLetter: v.letter,
        variantType: input.variantType,
        postVariantId: v.postVariantId || null,
        sampleSize,
        engagements,
        impressions,
        conversions,
        conversionRate,
        engagementRate,
        liftVsControlPct: 0,
        pValue: null,
        confidenceLevel: 0.95,
        isWinner: false,
        status: 'running',
        metadata: v.metadata || null,
        createdAt: now,
        updatedAt: now,
      };

      await db('experiment_variants').insert({
        id: variantRecord.id,
        tenant_id: variantRecord.tenantId,
        brand_id: variantRecord.brandId,
        experiment_id: variantRecord.experimentId,
        experiment_name: variantRecord.experimentName,
        hypothesis: variantRecord.hypothesis,
        variant_letter: variantRecord.variantLetter,
        variant_type: variantRecord.variantType,
        post_variant_id: variantRecord.postVariantId,
        sample_size: variantRecord.sampleSize,
        engagements: variantRecord.engagements,
        impressions: variantRecord.impressions,
        conversions: variantRecord.conversions,
        conversion_rate: variantRecord.conversionRate,
        engagement_rate: variantRecord.engagementRate,
        lift_vs_control_pct: variantRecord.liftVsControlPct,
        p_value: variantRecord.pValue,
        confidence_level: variantRecord.confidenceLevel,
        is_winner: variantRecord.isWinner,
        status: variantRecord.status,
        metadata: variantRecord.metadata ? JSON.stringify(variantRecord.metadata) : null,
        created_at: now,
        updated_at: now,
      });

      createdVariants.push(variantRecord);
    }

    return createdVariants;
  }

  /**
   * Records updated telemetry observations for an experiment variant.
   */
  public async recordVariantTelemetry(
    tenantId: string,
    brandId: string,
    experimentId: string,
    variantLetter: string,
    telemetry: {
      impressions: number;
      engagements: number;
      conversions?: number;
      sampleSize?: number;
    }
  ): Promise<ExperimentVariant> {
    const existing = await db('experiment_variants')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        experiment_id: experimentId,
        variant_letter: variantLetter,
      })
      .first();

    if (!existing) {
      throw new Error(`Variant ${variantLetter} not found for experiment ${experimentId}.`);
    }

    const impressions = Number(telemetry.impressions || 0);
    const engagements = Number(telemetry.engagements || 0);
    const conversions = Number(telemetry.conversions || 0);
    const sampleSize = Number(telemetry.sampleSize || impressions || 0);

    const engagementRate = impressions > 0
      ? Math.round(((engagements / impressions) * 100) * 100) / 100
      : 0;
    const conversionRate = impressions > 0
      ? Math.round(((conversions / impressions) * 100) * 100) / 100
      : 0;

    const now = new Date();
    await db('experiment_variants')
      .where({ id: existing.id })
      .update({
        impressions,
        engagements,
        conversions,
        sample_size: sampleSize,
        engagement_rate: engagementRate,
        conversion_rate: conversionRate,
        updated_at: now,
      });

    return (await this.getVariantById(existing.id))!;
  }

  /**
   * Evaluates statistical significance and computes lift of Treatment (B) vs Control (A).
   */
  public async evaluateExperiment(
    tenantId: string,
    brandId: string,
    experimentId: string
  ): Promise<{
    experimentId: string;
    control: ExperimentVariant;
    test: ExperimentVariant;
    liftResult: LiftEstimateResult;
    winnerDeclared: boolean;
    winningVariant?: string;
  }> {
    const variants = await db('experiment_variants')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        experiment_id: experimentId,
      })
      .orderBy('variant_letter', 'asc');

    if (variants.length < 2) {
      throw new Error(`Experiment ${experimentId} requires at least 2 variants for evaluation.`);
    }

    const controlRow = variants.find((v) => v.variant_letter.toUpperCase() === 'A') || variants[0];
    const testRow = variants.find((v) => v.variant_letter.toUpperCase() === 'B') || variants[1];

    const control = this.formatVariantRow(controlRow);
    const test = this.formatVariantRow(testRow);

    const liftResult = this.liftEstimator.estimateLift(
      test.engagementRate,
      control.engagementRate,
      test.sampleSize,
      control.sampleSize,
      0.95
    );

    // Update lift on test variant
    const now = new Date();
    await db('experiment_variants')
      .where({ id: test.id })
      .update({
        lift_vs_control_pct: liftResult.empiricalLiftPct,
        confidence_level: liftResult.confidenceScore,
        updated_at: now,
      });

    // Check winner criteria: minimum 10 samples each, confidence >= 0.95 or statistically significant
    const minSampleMet = control.sampleSize >= 10 && test.sampleSize >= 10;
    const winnerDeclared = minSampleMet && (liftResult.confidenceScore >= 0.95 || liftResult.statisticallySignificant);

    let winningVariant: string | undefined = undefined;
    if (winnerDeclared) {
      if (liftResult.empiricalLiftPct > 0) {
        winningVariant = test.variantLetter;
        await db('experiment_variants').where({ id: test.id }).update({ is_winner: true });
        await db('experiment_variants').where({ id: control.id }).update({ is_winner: false });
      } else {
        winningVariant = control.variantLetter;
        await db('experiment_variants').where({ id: control.id }).update({ is_winner: true });
        await db('experiment_variants').where({ id: test.id }).update({ is_winner: false });
      }
    }

    return {
      experimentId,
      control: (await this.getVariantById(control.id))!,
      test: (await this.getVariantById(test.id))!,
      liftResult,
      winnerDeclared,
      winningVariant,
    };
  }

  /**
   * Concludes an experiment and promotes winning variant learnings to Brand Brain.
   */
  public async concludeExperiment(
    tenantId: string,
    brandId: string,
    experimentId: string,
    winningVariantLetter?: string
  ): Promise<ExperimentVariant[]> {
    const now = new Date();

    const variants = await db('experiment_variants').where({
      tenant_id: tenantId,
      brand_id: brandId,
      experiment_id: experimentId,
    });

    if (variants.length === 0) {
      throw new Error(`Experiment ${experimentId} not found.`);
    }

    for (const v of variants) {
      const isWinner = winningVariantLetter
        ? v.variant_letter.toUpperCase() === winningVariantLetter.toUpperCase()
        : v.is_winner;

      await db('experiment_variants')
        .where({ id: v.id })
        .update({
          status: 'concluded',
          concluded_at: now,
          is_winner: isWinner,
          updated_at: now,
        });
    }

    // Closed-loop learning: If winner declared, persist insight to brand_learning_insights
    const winner = variants.find((v) =>
      winningVariantLetter
        ? v.variant_letter.toUpperCase() === winningVariantLetter.toUpperCase()
        : v.is_winner
    );

    if (winner) {
      try {
        const insightId = crypto.randomUUID();
        await db('brand_learning_insights').insert({
          id: insightId,
          tenant_id: tenantId,
          brand_id: brandId,
          insight_type: 'hook_strategy',
          title: `A/B Test Winner: ${winner.experiment_name} (Variant ${winner.variant_letter})`,
          summary: `Variant ${winner.variant_letter} declared winner with +${winner.lift_vs_control_pct}% lift.`,
          confidence: Number(winner.confidence_level || 0.95),
          sample_size: Number(winner.sample_size || 0),
          performance_lift: Number(winner.lift_vs_control_pct || 0),
          recommended_action: `Apply Variant ${winner.variant_letter} format to future campaigns.`,
          metadata: JSON.stringify({
            experimentId,
            variantLetter: winner.variant_letter,
            variantType: winner.variant_type,
          }),
          applied_to_brand_brain: true,
          created_at: now,
          updated_at: now,
        });

        // Also update brand brain
        const brain = await BrandBrainService.getBrandBrain(brandId);
        if (brain) {
          const updatedCTAs = Array.from(
            new Set([...(brain.ctaPreferences || []), `Proven: ${winner.experiment_name}`])
          );
          await BrandBrainService.updateBrandBrain(brandId, {
            ctaPreferences: updatedCTAs,
          });
        }
      } catch {
        // Non-fatal if brand brain learning already exists
      }
    }

    const updatedRows = await db('experiment_variants')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        experiment_id: experimentId,
      })
      .orderBy('variant_letter', 'asc');

    return updatedRows.map((r) => this.formatVariantRow(r));
  }

  /**
   * Retrieves all experiments grouped by experimentId for a brand.
   */
  public async getExperiments(
    tenantId: string,
    brandId: string
  ): Promise<
    Record<
      string,
      {
        experimentId: string;
        experimentName: string;
        hypothesis?: string | null;
        status: string;
        variants: ExperimentVariant[];
      }
    >
  > {
    const rows = await db('experiment_variants')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
      })
      .orderBy('created_at', 'desc');

    const result: Record<
      string,
      {
        experimentId: string;
        experimentName: string;
        hypothesis?: string | null;
        status: string;
        variants: ExperimentVariant[];
      }
    > = {};

    for (const row of rows) {
      const formatted = this.formatVariantRow(row);
      if (!result[row.experiment_id]) {
        result[row.experiment_id] = {
          experimentId: row.experiment_id,
          experimentName: row.experiment_name,
          hypothesis: row.hypothesis,
          status: row.status,
          variants: [],
        };
      }
      result[row.experiment_id].variants.push(formatted);
    }

    return result;
  }

  private async getVariantById(id: string): Promise<ExperimentVariant | null> {
    const row = await db('experiment_variants').where({ id }).first();
    return row ? this.formatVariantRow(row) : null;
  }

  private formatVariantRow(row: any): ExperimentVariant {
    let meta = row.metadata;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = null; }
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      experimentId: row.experiment_id,
      experimentName: row.experiment_name,
      hypothesis: row.hypothesis,
      variantLetter: row.variant_letter,
      variantType: row.variant_type as ExperimentVariantType,
      postVariantId: row.post_variant_id,
      sampleSize: Number(row.sample_size || 0),
      engagements: Number(row.engagements || 0),
      impressions: Number(row.impressions || 0),
      conversions: Number(row.conversions || 0),
      conversionRate: Number(row.conversion_rate || 0),
      engagementRate: Number(row.engagement_rate || 0),
      liftVsControlPct: Number(row.lift_vs_control_pct || 0),
      pValue: row.p_value !== null ? Number(row.p_value) : null,
      confidenceLevel: Number(row.confidence_level || 0.95),
      isWinner: Boolean(row.is_winner),
      status: row.status as ExperimentStatus,
      concludedAt: row.concluded_at,
      metadata: meta,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const experimentEngineService = new ExperimentEngineService();
