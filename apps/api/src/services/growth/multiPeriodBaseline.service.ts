import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { PlanGuardService, planGuardService } from '../billing/planGuard.service.js';
import type {
  BrandPerformanceBaseline,
  MultiPeriodBaselineSnapshot,
} from '@socialforge/shared';

export interface BaselinePeriodConfig {
  period: string; // '7d' | '30d' | '90d' | '365d'
  days: number;
}

export const SUPPORTED_BASELINE_PERIODS: BaselinePeriodConfig[] = [
  { period: '7d', days: 7 },
  { period: '30d', days: 30 },
  { period: '90d', days: 90 },
  { period: '365d', days: 365 },
];

export class MultiPeriodBaselineService {
  private planGuard: PlanGuardService;

  constructor(guard = planGuardService) {
    this.planGuard = guard;
  }

  /**
   * Enforces retention limit for a specified historical day window.
   * Throws PlanGuardError if requested days exceed subscription plan retention.
   */
  public async enforceRetention(tenantId: string, days: number): Promise<void> {
    await this.planGuard.enforce(tenantId, 'analytics_retention', days);
  }

  /**
   * Retrieves allowed retention days for the tenant according to their commercial subscription plan.
   */
  public async getAllowedRetentionDays(tenantId: string): Promise<number> {
    const checkResult = await this.planGuard.check(tenantId, 'analytics_retention', 1);
    return checkResult.limit || 7;
  }

  /**
   * Calculates and persists moving average baselines across all supported time periods.
   */
  public async calculateBaselines(
    tenantId: string,
    brandId: string,
    platform = 'all'
  ): Promise<Record<string, BrandPerformanceBaseline>> {
    const allowedDays = await this.getAllowedRetentionDays(tenantId);
    const results: Record<string, BrandPerformanceBaseline> = {};
    const now = new Date();

    const brand = await db('brands').where({ id: brandId, tenant_id: tenantId }).first();
    if (!brand) {
      return {};
    }

    for (const config of SUPPORTED_BASELINE_PERIODS) {
      const isEntitled = config.days <= allowedDays;
      const cutoffDate = new Date(now.getTime() - config.days * 24 * 60 * 60 * 1000);

      // Query metrics from post_analytics_snapshots scoped by brand_id (verified by tenant)
      let query = db('post_analytics_snapshots')
        .where({
          brand_id: brandId,
        })
        .where('created_at', '>=', cutoffDate);

      if (platform !== 'all') {
        query = query.where({ platform });
      }

      const snapshots = await query.select(
        'impressions',
        'reach',
        'engagement',
        'clicks',
        'shares',
        'comments',
        'likes',
        'saves',
        'raw_metrics',
        'created_at'
      );

      const postCount = snapshots.length;

      let avgImpressions = 0;
      let avgReach = 0;
      let avgEngagements = 0;
      let avgShares = 0;
      let avgComments = 0;
      let avgSaves = 0;
      let avgClicks = 0;
      let avgVelocityScore = 0;
      let avgHalfLifeHours = platform === 'instagram' ? 48 : platform === 'x' ? 4 : platform === 'linkedin' ? 72 : 24;

      if (postCount > 0) {
        let totalImpressions = 0;
        let totalReach = 0;
        let totalEngagements = 0;
        let totalShares = 0;
        let totalComments = 0;
        let totalSaves = 0;
        let totalClicks = 0;
        let totalVelocity = 0;

        for (const snap of snapshots) {
          totalImpressions += Number(snap.impressions || 0);
          totalReach += Number(snap.reach || 0);
          totalEngagements += Number(snap.engagement || (Number(snap.likes || 0) + Number(snap.comments || 0)));
          totalShares += Number(snap.shares || 0);
          totalComments += Number(snap.comments || 0);
          totalSaves += Number(snap.saves || 0);
          totalClicks += Number(snap.clicks || 0);

          let raw: Record<string, any> = {};
          if (typeof snap.raw_metrics === 'string') {
            try {
              raw = JSON.parse(snap.raw_metrics);
            } catch {
              raw = {};
            }
          } else if (snap.raw_metrics) {
            raw = snap.raw_metrics;
          }

          totalVelocity += Number(raw.velocityScore || (Number(snap.engagement || 0) / 24));
        }

        avgImpressions = Math.round((totalImpressions / postCount) * 100) / 100;
        avgReach = Math.round((totalReach / postCount) * 100) / 100;
        avgEngagements = Math.round((totalEngagements / postCount) * 100) / 100;
        avgShares = Math.round((totalShares / postCount) * 100) / 100;
        avgComments = Math.round((totalComments / postCount) * 100) / 100;
        avgSaves = Math.round((totalSaves / postCount) * 100) / 100;
        avgClicks = Math.round((totalClicks / postCount) * 100) / 100;
        avgVelocityScore = Math.round((totalVelocity / postCount) * 100) / 100;
      }

      const avgEngagementRate = avgImpressions > 0
        ? Math.round(((avgEngagements / avgImpressions) * 100) * 100) / 100
        : 0;

      // Upsert record into brand_performance_baselines
      const existing = await db('brand_performance_baselines')
        .where({
          tenant_id: tenantId,
          brand_id: brandId,
          platform,
          period: config.period,
        })
        .first();

      const baselineId = existing?.id || crypto.randomUUID();
      const metadataObj = {
        isEntitled,
        allowedDays,
        periodDays: config.days,
        sampleSize: postCount,
      };

      if (existing) {
        await db('brand_performance_baselines')
          .where({ id: baselineId })
          .update({
            post_count: postCount,
            avg_impressions: avgImpressions,
            avg_reach: avgReach,
            avg_engagements: avgEngagements,
            avg_engagement_rate: avgEngagementRate,
            avg_shares: avgShares,
            avg_comments: avgComments,
            avg_saves: avgSaves,
            avg_clicks: avgClicks,
            avg_velocity_score: avgVelocityScore,
            avg_half_life_hours: avgHalfLifeHours,
            calculated_at: now,
            metadata: JSON.stringify(metadataObj),
            updated_at: now,
          });
      } else {
        await db('brand_performance_baselines').insert({
          id: baselineId,
          tenant_id: tenantId,
          brand_id: brandId,
          platform,
          period: config.period,
          post_count: postCount,
          avg_impressions: avgImpressions,
          avg_reach: avgReach,
          avg_engagements: avgEngagements,
          avg_engagement_rate: avgEngagementRate,
          avg_shares: avgShares,
          avg_comments: avgComments,
          avg_saves: avgSaves,
          avg_clicks: avgClicks,
          avg_velocity_score: avgVelocityScore,
          avg_half_life_hours: avgHalfLifeHours,
          calculated_at: now,
          metadata: JSON.stringify(metadataObj),
          created_at: now,
          updated_at: now,
        });
      }

      results[config.period] = {
        id: baselineId,
        tenantId,
        brandId,
        platform,
        period: config.period,
        postCount,
        avgImpressions,
        avgReach,
        avgEngagements,
        avgEngagementRate,
        avgShares,
        avgComments,
        avgSaves,
        avgClicks,
        avgVelocityScore,
        avgHalfLifeHours,
        calculatedAt: now,
        metadata: metadataObj,
      };
    }

    return results;
  }

  /**
   * Retrieves multi-period performance baselines for a brand.
   */
  public async getBaselines(
    tenantId: string,
    brandId: string,
    platform = 'all'
  ): Promise<MultiPeriodBaselineSnapshot> {
    const allowedDays = await this.getAllowedRetentionDays(tenantId);

    const rows = await db('brand_performance_baselines')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        platform,
      })
      .select('*');

    let baselines: Record<string, BrandPerformanceBaseline> = {};

    if (rows.length === 0) {
      baselines = await this.calculateBaselines(tenantId, brandId, platform);
    } else {
      for (const row of rows) {
        let meta = row.metadata;
        if (typeof meta === 'string') {
          try {
            meta = JSON.parse(meta);
          } catch {
            meta = {};
          }
        }

        baselines[row.period] = {
          id: row.id,
          tenantId: row.tenant_id,
          brandId: row.brand_id,
          platform: row.platform,
          period: row.period,
          postCount: Number(row.post_count || 0),
          avgImpressions: Number(row.avg_impressions || 0),
          avgReach: Number(row.avg_reach || 0),
          avgEngagements: Number(row.avg_engagements || 0),
          avgEngagementRate: Number(row.avg_engagement_rate || 0),
          avgShares: Number(row.avg_shares || 0),
          avgComments: Number(row.avg_comments || 0),
          avgSaves: Number(row.avg_saves || 0),
          avgClicks: Number(row.avg_clicks || 0),
          avgVelocityScore: Number(row.avg_velocity_score || 0),
          avgHalfLifeHours: Number(row.avg_half_life_hours || 0),
          calculatedAt: row.calculated_at,
          metadata: meta,
        };
      }
    }

    return {
      brandId,
      tenantId,
      platform,
      allowedRetentionDays: allowedDays,
      baselines,
      calculatedAt: new Date().toISOString(),
    };
  }
}

export const multiPeriodBaselineService = new MultiPeriodBaselineService();
