import crypto from 'node:crypto';
import { db } from '../../db/connection.js';

export interface CreateABExperimentInput {
  tenantId: string;
  brandId: string;
  postId: string;
  name: string;
  flightWindowHours?: number;
  sampleSizeTarget?: number;
  variants: Array<{
    postVariantId: string;
    label: string; // 'Variant A', 'Variant B'
    trafficAllocationPct?: number;
    viralScore?: number;
  }>;
}

export interface ABExperimentTelemetry {
  experimentId: string;
  status: 'draft' | 'running' | 'concluded' | 'cancelled';
  winningVariantId: string | null;
  confidenceScore: number | null;
  sampleSizeTarget: number;
  totalImpressions: number;
  totalEngagements: number;
  variants: Array<{
    id: string;
    postVariantId: string;
    label: string;
    trafficAllocationPct: number;
    impressions: number;
    engagements: number;
    clicks: number;
    shares: number;
    conversionRate: number;
    viralScore: number;
    isWinner: boolean;
  }>;
}

export class ABTestingService {
  private static instance: ABTestingService;

  public static getInstance(): ABTestingService {
    if (!ABTestingService.instance) {
      ABTestingService.instance = new ABTestingService();
    }
    return ABTestingService.instance;
  }

  /**
   * Creates a new A/B testing experiment across multiple post variants.
   */
  public async createExperiment(input: CreateABExperimentInput): Promise<{ experimentId: string; status: string }> {
    const experimentId = crypto.randomUUID();
    const flightHours = input.flightWindowHours || 6;
    const target = input.sampleSizeTarget || 1000;

    await db('ab_test_experiments').insert({
      id: experimentId,
      tenant_id: input.tenantId,
      brand_id: input.brandId,
      post_id: input.postId,
      name: input.name,
      status: 'running',
      sample_size_target: target,
      flight_window_hours: flightHours,
      started_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    const splitDefault = 100.0 / Math.max(1, input.variants.length);

    for (const v of input.variants) {
      await db('ab_test_variants').insert({
        id: crypto.randomUUID(),
        experiment_id: experimentId,
        post_variant_id: v.postVariantId,
        variant_label: v.label,
        traffic_allocation_pct: v.trafficAllocationPct || parseFloat(splitDefault.toFixed(2)),
        viral_score: v.viralScore || 75.0,
        impressions: 0,
        engagements: 0,
        clicks: 0,
        shares: 0,
        conversion_rate: 0.0,
        is_winner: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return {
      experimentId,
      status: 'running',
    };
  }

  /**
   * Records engagement results for a specific test variant during its flight window.
   */
  public async recordVariantMetrics(
    experimentId: string,
    postVariantId: string,
    metrics: { impressions: number; engagements: number; clicks?: number; shares?: number }
  ): Promise<void> {
    const row = await db('ab_test_variants')
      .where({ experiment_id: experimentId, post_variant_id: postVariantId })
      .first();

    if (!row) throw new Error('Variant not found in experiment');

    const totalImpressions = (row.impressions || 0) + metrics.impressions;
    const totalEngagements = (row.engagements || 0) + metrics.engagements;
    const totalClicks = (row.clicks || 0) + (metrics.clicks || 0);
    const totalShares = (row.shares || 0) + (metrics.shares || 0);

    const conversionRate = totalImpressions > 0 ? parseFloat((totalEngagements / totalImpressions).toFixed(4)) : 0.0;

    await db('ab_test_variants')
      .where({ id: row.id })
      .update({
        impressions: totalImpressions,
        engagements: totalEngagements,
        clicks: totalClicks,
        shares: totalShares,
        conversion_rate: conversionRate,
        updated_at: new Date(),
      });
  }

  /**
   * Evaluates statistical significance and declares a winning variant if p < 0.05 (confidence > 95%).
   */
  public async evaluateSignificance(experimentId: string): Promise<{
    concluded: boolean;
    winningVariantId: string | null;
    confidenceScore: number;
    summary: string;
  }> {
    const experiment = await db('ab_test_experiments').where({ id: experimentId }).first();
    if (!experiment) throw new Error('Experiment not found');

    const variants = await db('ab_test_variants').where({ experiment_id: experimentId }).orderBy('conversion_rate', 'desc');
    if (variants.length < 2) throw new Error('At least 2 variants required to compute statistical significance');

    const topVariant = variants[0];
    const secondVariant = variants[1];

    const p1 = topVariant.conversion_rate;
    const n1 = topVariant.impressions;
    const p2 = secondVariant.conversion_rate;
    const n2 = secondVariant.impressions;

    let confidenceScore = 50.0;

    if (n1 > 50 && n2 > 50 && p1 > p2) {
      // Pooled standard error calculation for 2-proportion Z-test
      const pooled = (p1 * n1 + p2 * n2) / (n1 + n2);
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
      const zScore = se > 0 ? (p1 - p2) / se : 0;

      // Approximate normal cumulative distribution
      if (zScore >= 2.58) confidenceScore = 99.5;
      else if (zScore >= 1.96) confidenceScore = 97.5;
      else if (zScore >= 1.64) confidenceScore = 92.0;
      else if (zScore >= 1.28) confidenceScore = 85.0;
      else confidenceScore = Math.max(50.0, parseFloat((50 + zScore * 20).toFixed(2)));
    } else if (p1 > p2) {
      confidenceScore = 75.0;
    }

    const isStatisticallySignificant = confidenceScore >= 95.0;

    let winningVariantId: string | null = null;
    let summary = '';

    if (isStatisticallySignificant) {
      winningVariantId = topVariant.post_variant_id;
      summary = `${topVariant.variant_label} declared winner with ${confidenceScore}% statistical confidence (${(topVariant.conversion_rate * 100).toFixed(2)}% vs ${(secondVariant.conversion_rate * 100).toFixed(2)}% engagement).`;

      // Update experiment status
      await db('ab_test_experiments').where({ id: experimentId }).update({
        status: 'concluded',
        winning_variant_id: winningVariantId,
        confidence_score: confidenceScore,
        concluded_at: new Date(),
        updated_at: new Date(),
      });

      // Mark winner in variants table
      await db('ab_test_variants').where({ id: topVariant.id }).update({ is_winner: true, updated_at: new Date() });

      // Automatically promote winning variant in posts table
      await db('posts').where({ id: experiment.post_id }).update({
        status: 'approved',
        updated_at: new Date(),
      });
    } else {
      summary = `Experiment flight active: ${topVariant.variant_label} leads at ${confidenceScore}% confidence (below 95% threshold). Accumulating sample volume.`;
    }

    return {
      concluded: isStatisticallySignificant,
      winningVariantId,
      confidenceScore,
      summary,
    };
  }

  /**
   * Retrieves full telemetry details for an A/B testing experiment.
   */
  public async getExperimentDetails(experimentId: string): Promise<ABExperimentTelemetry> {
    const experiment = await db('ab_test_experiments').where({ id: experimentId }).first();
    if (!experiment) throw new Error('Experiment not found');

    const variants = await db('ab_test_variants').where({ experiment_id: experimentId });

    const totalImpressions = variants.reduce((sum, v) => sum + (v.impressions || 0), 0);
    const totalEngagements = variants.reduce((sum, v) => sum + (v.engagements || 0), 0);

    return {
      experimentId: experiment.id,
      status: experiment.status,
      winningVariantId: experiment.winning_variant_id,
      confidenceScore: experiment.confidence_score ? parseFloat(experiment.confidence_score) : null,
      sampleSizeTarget: experiment.sample_size_target,
      totalImpressions,
      totalEngagements,
      variants: variants.map((v) => ({
        id: v.id,
        postVariantId: v.post_variant_id,
        label: v.variant_label,
        trafficAllocationPct: parseFloat(v.traffic_allocation_pct),
        impressions: v.impressions,
        engagements: v.engagements,
        clicks: v.clicks,
        shares: v.shares,
        conversionRate: parseFloat(v.conversion_rate),
        viralScore: parseFloat(v.viral_score),
        isWinner: Boolean(v.is_winner),
      })),
    };
  }
}

export const abTestingService = ABTestingService.getInstance();
