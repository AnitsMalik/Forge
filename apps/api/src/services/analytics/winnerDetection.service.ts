import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { triggerService } from '../automation/trigger.service.js';
import { brandBrainLearningService } from './brandBrainLearning.service.js';
import type {
  AnalyticsWinner,
  BrandBaselineBenchmark,
  WinnerType,
  WinningAttributes,
} from '@socialforge/shared';

export class WinnerDetectionService {
  /**
   * Calculates baseline performance benchmarks for a brand across historical posts.
   * If sample size is low, synthesizes industry standard defaults.
   */
  public async calculateBrandBaseline(brandId: string): Promise<BrandBaselineBenchmark> {
    const snapshots = await db('post_analytics_snapshots')
      .where({ brand_id: brandId })
      .select('*');

    if (!snapshots.length) {
      return {
        brandId,
        samplePostCount: 0,
        avgEngagementRate: 2.2,
        avgImpressions: 1200,
        avgVelocity: 15.0,
        avgCtr: 1.5,
        platformBaselines: {
          instagram: { avgEngagementRate: 2.5, avgImpressions: 1500 },
          facebook: { avgEngagementRate: 1.8, avgImpressions: 1000 },
          twitter: { avgEngagementRate: 1.6, avgImpressions: 900 },
          linkedin: { avgEngagementRate: 2.4, avgImpressions: 800 },
          tiktok: { avgEngagementRate: 4.8, avgImpressions: 3000 },
          youtube: { avgEngagementRate: 3.5, avgImpressions: 2500 },
        },
        calculatedAt: new Date().toISOString(),
      };
    }

    let totalRate = 0;
    let totalImp = 0;
    let totalVelocity = 0;
    let totalCtr = 0;

    const platGroups: Record<string, { totalRate: number; totalImp: number; count: number }> = {};

    for (const s of snapshots) {
      const rate = Number(s.engagement_rate || 0);
      const imp = Number(s.impressions || 0);
      const vel = Number(s.velocity_score || 0);
      const ctr = Number(s.ctr || 0);
      const plat = (s.platform || 'instagram').toLowerCase();

      totalRate += rate;
      totalImp += imp;
      totalVelocity += vel;
      totalCtr += ctr;

      if (!platGroups[plat]) {
        platGroups[plat] = { totalRate: 0, totalImp: 0, count: 0 };
      }
      platGroups[plat].totalRate += rate;
      platGroups[plat].totalImp += imp;
      platGroups[plat].count += 1;
    }

    const n = snapshots.length;
    const avgRate = Number((totalRate / n).toFixed(2));
    const avgImp = Math.round(totalImp / n);
    const avgVelocity = Number((totalVelocity / n).toFixed(2));
    const avgCtr = Number((totalCtr / n).toFixed(2));

    const platformBaselines: Record<string, { avgEngagementRate: number; avgImpressions: number }> = {};
    for (const [p, g] of Object.entries(platGroups)) {
      platformBaselines[p] = {
        avgEngagementRate: Number((g.totalRate / g.count).toFixed(2)),
        avgImpressions: Math.round(g.totalImp / g.count),
      };
    }

    return {
      brandId,
      samplePostCount: n,
      avgEngagementRate: Math.max(0.5, avgRate),
      avgImpressions: Math.max(100, avgImp),
      avgVelocity: Math.max(1.0, avgVelocity),
      avgCtr: Math.max(0.2, avgCtr),
      platformBaselines,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Scans all published post variants for a brand, identifies high-velocity or statistical
   * outperformers, persists winners, dispatches automation triggers, and triggers cognitive learning.
   */
  public async detectWinnersForBrand(
    brandId: string,
    options: { forceRecheck?: boolean; triggerAutomations?: boolean } = {}
  ): Promise<AnalyticsWinner[]> {
    const brand = await db('brands').where({ id: brandId }).first();
    if (!brand) {
      throw new Error(`Brand ${brandId} not found`);
    }

    const tenantId = brand.tenant_id;
    const baseline = await this.calculateBrandBaseline(brandId);

    // Retrieve published post variants with their parent posts and latest snapshots
    const variants = await db('post_variants')
      .join('posts', 'post_variants.post_id', 'posts.id')
      .leftJoin('post_analytics_snapshots', 'post_variants.id', 'post_analytics_snapshots.post_variant_id')
      .where('posts.brand_id', brandId)
      .andWhere('posts.tenant_id', tenantId)
      .select(
        'post_variants.id as variant_id',
        'post_variants.post_id',
        'post_variants.platform',
        'post_variants.remote_post_id',
        'post_variants.content as content',
        'post_variants.status as variant_status',
        'posts.title as post_title',
        'posts.published_at',
        'post_analytics_snapshots.impressions',
        'post_analytics_snapshots.reach',
        'post_analytics_snapshots.likes',
        'post_analytics_snapshots.comments',
        'post_analytics_snapshots.shares',
        'post_analytics_snapshots.saves',
        'post_analytics_snapshots.clicks',
        'post_analytics_snapshots.video_views',
        'post_analytics_snapshots.watch_time_seconds',
        'post_analytics_snapshots.engagement',
        'post_analytics_snapshots.engagement_rate',
        'post_analytics_snapshots.ctr',
        'post_analytics_snapshots.velocity_score'
      );

    const detectedWinners: AnalyticsWinner[] = [];

    // Group variants by post_id to evaluate creative angle differences
    const postVariantGroups: Record<string, any[]> = {};
    for (const v of variants) {
      if (!postVariantGroups[v.post_id]) {
        postVariantGroups[v.post_id] = [];
      }
      postVariantGroups[v.post_id].push(v);
    }

    for (const v of variants) {
      const imp = Number(v.impressions || 0);
      const engRate = Number(v.engagement_rate || 0);
      const vel = Number(v.velocity_score || 0);
      const ctr = Number(v.ctr || 0);
      const clicks = Number(v.clicks || 0);

      if (imp <= 0 && engRate <= 0) continue;

      let winnerType: WinnerType | null = null;
      let score = 0;
      let liftMultiplier = 1.0;

      // Compute leave-one-out baseline benchmark to prevent candidate self-skew
      const otherVariants = variants.filter((other) => other.variant_id !== v.variant_id && Number(other.impressions || 0) > 0);
      const effectiveBaselineRate = otherVariants.length > 0
        ? Number((otherVariants.reduce((sum, o) => sum + Number(o.engagement_rate || 0), 0) / otherVariants.length).toFixed(2))
        : baseline.avgEngagementRate;
      const effectiveBaselineVelocity = otherVariants.length > 0
        ? Number((otherVariants.reduce((sum, o) => sum + Number(o.velocity_score || 0), 0) / otherVariants.length).toFixed(2))
        : baseline.avgVelocity;

      // 1. Statistical Outperformer Check
      // Engagement rate >= 2.0x brand average, OR absolute engagement rate >= 7.0%
      if (engRate >= effectiveBaselineRate * 2.0 || engRate >= 7.0) {
        winnerType = 'statistical_outperformer';
        score = engRate;
        liftMultiplier = Number((engRate / Math.max(0.5, effectiveBaselineRate)).toFixed(2));
      }

      // 2. Velocity Surge Check
      // Velocity score >= 2.5x baseline velocity OR velocity >= 50 engagements/hour
      else if (vel >= effectiveBaselineVelocity * 2.5 || vel >= 50) {
        winnerType = 'velocity_surge';
        score = vel;
        liftMultiplier = Number((vel / Math.max(1.0, effectiveBaselineVelocity)).toFixed(2));
      }

      // 3. Creative Angle Comparison Check
      else {
        const siblings = postVariantGroups[v.post_id] || [];
        if (siblings.length > 1) {
          const siblingRates = siblings
            .filter((s) => s.variant_id !== v.variant_id)
            .map((s) => Number(s.engagement_rate || 0));
          const maxSiblingRate = Math.max(...siblingRates, 0);

          if (engRate > 0 && maxSiblingRate > 0 && engRate >= maxSiblingRate * 1.5) {
            winnerType = 'creative_angle_winner';
            score = engRate;
            liftMultiplier = Number((engRate / maxSiblingRate).toFixed(2));
          }
        }
      }

      // 4. High Conversion Check
      if (!winnerType && ctr >= 3.5 && clicks >= 20) {
        winnerType = 'high_conversion';
        score = ctr;
        liftMultiplier = Number((ctr / Math.max(0.2, baseline.avgCtr)).toFixed(2));
      }

      if (!winnerType) continue;

      // Deduplication: check if already recorded within the last 7 days unless forceRecheck is set
      const existing = await db('analytics_winners')
        .where({
          tenant_id: tenantId,
          brand_id: brandId,
          post_variant_id: v.variant_id,
          winner_type: winnerType,
        })
        .first();

      if (existing && !options.forceRecheck) {
        continue;
      }

      // Extract winning attributes from post copy
      const winningAttributes = brandBrainLearningService.extractWinningAttributes(
        v.content || v.post_title || ''
      );

      const metricsSnapshot = {
        platform: v.platform,
        remotePostId: v.remote_post_id,
        impressions: imp,
        reach: Number(v.reach || 0),
        likes: Number(v.likes || 0),
        comments: Number(v.comments || 0),
        shares: Number(v.shares || 0),
        clicks,
        saves: Number(v.saves || 0),
        videoViews: Number(v.video_views || 0),
        watchTimeSeconds: Number(v.watch_time_seconds || 0),
        engagement: Number(v.engagement || 0),
        engagementRate: engRate,
        ctr,
        velocityScore: vel,
      };

      const winnerId = crypto.randomUUID();
      const detectedAt = new Date();

      const winnerRecord: AnalyticsWinner = {
        id: winnerId,
        tenantId,
        brandId,
        postId: v.post_id,
        postVariantId: v.variant_id,
        platform: v.platform,
        remotePostId: v.remote_post_id,
        winnerType,
        score,
        liftMultiplier,
        baselineBenchmark: baseline,
        metricsSnapshot,
        winningAttributes,
        automationDispatched: false,
        detectedAt,
        createdAt: detectedAt,
        updatedAt: detectedAt,
      };

      // Persist to analytics_winners table
      await db('analytics_winners').insert({
        id: winnerId,
        tenant_id: tenantId,
        brand_id: brandId,
        post_id: v.post_id,
        post_variant_id: v.variant_id,
        platform: v.platform,
        remote_post_id: v.remote_post_id,
        winner_type: winnerType,
        score,
        lift_multiplier: liftMultiplier,
        baseline_benchmark: JSON.stringify(baseline),
        metrics_snapshot: JSON.stringify(metricsSnapshot),
        winning_attributes: JSON.stringify(winningAttributes),
        automation_dispatched: false,
        detected_at: detectedAt,
        created_at: detectedAt,
        updated_at: detectedAt,
      });

      // 1. Dispatch trigger to Stage 5 Automation Engine
      let automationRunId: string | null = null;
      if (options.triggerAutomations !== false) {
        try {
          const triggerPayload = {
            winnerId,
            brandId,
            postId: v.post_id,
            postVariantId: v.variant_id,
            platform: v.platform,
            remotePostId: v.remote_post_id,
            winnerType,
            liftMultiplier,
            engagementRate: engRate,
            winningAttributes,
            metrics: metricsSnapshot,
          };

          const runResults = await triggerService.handleAnalyticsWinnerTrigger(tenantId, triggerPayload);
          if (runResults && runResults.length > 0) {
            automationRunId = runResults[0]?.result?.runId || null;
          }

          winnerRecord.automationDispatched = true;
          winnerRecord.automationRunId = automationRunId;

          await db('analytics_winners')
            .where({ id: winnerId })
            .update({
              automation_dispatched: true,
              automation_run_id: automationRunId,
              updated_at: new Date(),
            });
        } catch (err: any) {
          console.warn(`[WinnerDetection] Failed to dispatch automation trigger: ${err.message}`);
        }
      }

      // 2. Feed into Continuous Brand Brain Learning
      try {
        await brandBrainLearningService.learnFromWinner(winnerRecord);
      } catch (err: any) {
        console.warn(`[WinnerDetection] Learning pipeline failed: ${err.message}`);
      }

      detectedWinners.push(winnerRecord);
    }

    return detectedWinners;
  }

  /**
   * Retrieves list of detected winners with multi-tenant filtering.
   */
  public async getWinners(
    brandId: string,
    filters: { winnerType?: string; platform?: string; limit?: number } = {}
  ): Promise<AnalyticsWinner[]> {
    let q = db('analytics_winners')
      .where({ brand_id: brandId })
      .orderBy('detected_at', 'desc');

    if (filters.winnerType) {
      q = q.andWhere('winner_type', filters.winnerType);
    }
    if (filters.platform) {
      q = q.andWhere('platform', filters.platform);
    }
    if (filters.limit) {
      q = q.limit(filters.limit);
    }

    const rows = await q;

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      postId: r.post_id,
      postVariantId: r.post_variant_id,
      platform: r.platform,
      remotePostId: r.remote_post_id,
      winnerType: r.winner_type,
      score: Number(r.score),
      liftMultiplier: Number(r.lift_multiplier),
      baselineBenchmark: typeof r.baseline_benchmark === 'string' ? JSON.parse(r.baseline_benchmark) : r.baseline_benchmark,
      metricsSnapshot: typeof r.metrics_snapshot === 'string' ? JSON.parse(r.metrics_snapshot) : r.metrics_snapshot,
      winningAttributes: typeof r.winning_attributes === 'string' ? JSON.parse(r.winning_attributes) : r.winning_attributes,
      automationDispatched: Boolean(r.automation_dispatched),
      automationRunId: r.automation_run_id,
      detectedAt: r.detected_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}

export const winnerDetectionService = new WinnerDetectionService();
