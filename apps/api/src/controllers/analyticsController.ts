import type { Request, Response } from 'express';
import { db } from '../db/connection.js';
import { MetaAnalyticsSyncService } from '../services/meta/analyticsSync.js';
import { telemetryNormalizerService } from '../services/analytics/telemetryNormalizer.service.js';
import { winnerDetectionService } from '../services/analytics/winnerDetection.service.js';
import { brandBrainLearningService } from '../services/analytics/brandBrainLearning.service.js';
import { aiMarketingAdvisorService } from '../services/analytics/aiMarketingAdvisor.service.js';
import { isRealExternalPostId, isSandboxUrl } from '@socialforge/shared';

export class AnalyticsController {
  /**
   * Helper to verify user access to the brand.
   */
  private static async verifyBrandAccess(req: Request, brandId: string): Promise<boolean> {
    const user = req.user;
    if (!user) return false;
    if ((user.role as string) === 'system_admin') return true;

    const brand = await db('brands')
      .where({ id: brandId, tenant_id: user.tenantId })
      .first();

    return !!brand;
  }

  /**
   * Helper to build date range filter from query params.
   */
  private static parseDateRange(
    timeRangeParam: string = '30d',
    startDateParam?: string,
    endDateParam?: string
  ): { startDate: Date; endDate: Date; rangeLabel: string } {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now.getTime());

    if (timeRangeParam === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeRangeParam === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRangeParam === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRangeParam === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeRangeParam === 'custom' && startDateParam) {
      startDate = new Date(startDateParam);
      if (endDateParam) {
        endDate = new Date(endDateParam);
        // Include full end day
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      // Default to 30 days
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate,
      endDate,
      rangeLabel: timeRangeParam,
    };
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/overview
   * Retrieves aggregated brand overview KPIs, time-series curves, platform breakdown, and paginated real published posts.
   */
  public static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      // 1. Permission check
      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access to this brand is denied' },
        });
        return;
      }

      const timeRangeParam = (req.query.timeRange as string) || '30d';
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      const platformParam = ((req.query.platform as string) || 'all').toLowerCase();
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 15));
      const offset = (page - 1) * limit;

      const { startDate, endDate, rangeLabel } = AnalyticsController.parseDateRange(
        timeRangeParam,
        startDateParam,
        endDateParam
      );

      // Check Meta connection status (with centralized social_connections fallback)
      const connection = await db('meta_connections')
        .where({ brand_id: brandId })
        .orderBy('created_at', 'desc')
        .first();

      let connectionStatus = connection?.status || 'disconnected';
      if (connectionStatus === 'disconnected') {
        const socialConn = await db('social_connections')
          .where({ brand_id: brandId })
          .whereIn('provider', ['facebook', 'instagram'])
          .whereNot({ status: 'DISCONNECTED' })
          .orderBy('created_at', 'desc')
          .first();
        if (socialConn) {
          connectionStatus = socialConn.status.toLowerCase();
        }
      }
      const isReauthRequired = connectionStatus === 'reauth_required';

      // 2. Query published post variants matching brand, date range, and platform
      let baseVariantsQuery = db('post_variants')
        .join('posts', 'post_variants.post_id', 'posts.id')
        .where('posts.brand_id', brandId)
        .where('post_variants.status', 'published')
        .whereNotNull('post_variants.remote_post_id');

      if (timeRangeParam !== 'all') {
        baseVariantsQuery = baseVariantsQuery
          .where('posts.published_at', '>=', startDate)
          .where('posts.published_at', '<=', endDate);
      }

      if (platformParam !== 'all') {
        baseVariantsQuery = baseVariantsQuery.where('post_variants.platform', platformParam);
      }

      const rawVariants = await baseVariantsQuery
        .leftJoin('post_analytics_snapshots', 'post_variants.id', 'post_analytics_snapshots.post_variant_id')
        .select(
          'post_variants.id as variant_id',
          'post_variants.platform',
          'post_variants.remote_post_id',
          'post_variants.remote_post_url',
          'post_variants.media_asset_ids',
          'posts.id as post_id',
          'posts.title as post_title',
          'posts.base_content',
          'posts.published_at',
          'posts.created_at as post_created_at',
          'post_analytics_snapshots.reach',
          'post_analytics_snapshots.impressions',
          'post_analytics_snapshots.reactions',
          'post_analytics_snapshots.likes',
          'post_analytics_snapshots.comments',
          'post_analytics_snapshots.shares',
          'post_analytics_snapshots.saves',
          'post_analytics_snapshots.clicks',
          'post_analytics_snapshots.video_views',
          'post_analytics_snapshots.profile_activity',
          'post_analytics_snapshots.engagement',
          'post_analytics_snapshots.engagement_rate',
          'post_analytics_snapshots.last_fetched_at',
          'post_analytics_snapshots.last_error'
        );

      // Strictly filter to real, confirmed publications only
      const allVariants = rawVariants.filter(
        (v) => isRealExternalPostId(v.remote_post_id) && !isSandboxUrl(v.remote_post_url)
      );

      // 3. Compute Real Totals across published variants (No fake/estimated numbers)
      let totalReachSum: number | null = null;
      let totalImpressionsSum: number | null = null;
      let totalClicksSum: number | null = null;
      let totalReactionsSum: number | null = null;
      let totalCommentsSum: number | null = null;
      let totalSharesSum: number | null = null;
      let totalSavesSum: number | null = null;
      let totalVideoViewsSum: number | null = null;
      let totalEngagementSum: number | null = null;

      let engagementRateSum = 0;
      let engagementRateCount = 0;
      let latestFetchedAt: Date | null = null;

      const distinctPostIds = new Set<string>();

      const platformBreakdown: Record<
        string,
        {
          postsCount: number;
          reach: number | null;
          impressions: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          saves: number | null;
          clicks: number | null;
          videoViews: number | null;
          engagement: number | null;
          engagementRate: number | null;
          lastUpdated: string | null;
        }
      > = {
        facebook: {
          postsCount: 0,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          saves: null,
          clicks: null,
          videoViews: null,
          engagement: null,
          engagementRate: null,
          lastUpdated: null,
        },
        instagram: {
          postsCount: 0,
          reach: null,
          impressions: null,
          likes: null,
          comments: null,
          shares: null,
          saves: null,
          clicks: null,
          videoViews: null,
          engagement: null,
          engagementRate: null,
          lastUpdated: null,
        },
      };

      for (const row of allVariants) {
        distinctPostIds.add(row.post_id);
        const plat = row.platform || 'facebook';

        if (!platformBreakdown[plat]) {
          platformBreakdown[plat] = {
            postsCount: 0,
            reach: null,
            impressions: null,
            likes: null,
            comments: null,
            shares: null,
            saves: null,
            clicks: null,
            videoViews: null,
            engagement: null,
            engagementRate: null,
            lastUpdated: null,
          };
        }

        platformBreakdown[plat].postsCount += 1;

        // Reach
        if (row.reach !== null && row.reach !== undefined) {
          const val = Number(row.reach);
          totalReachSum = (totalReachSum ?? 0) + val;
          platformBreakdown[plat].reach = (platformBreakdown[plat].reach ?? 0) + val;
        }

        // Impressions
        if (row.impressions !== null && row.impressions !== undefined) {
          const val = Number(row.impressions);
          totalImpressionsSum = (totalImpressionsSum ?? 0) + val;
          platformBreakdown[plat].impressions = (platformBreakdown[plat].impressions ?? 0) + val;
        }

        // Clicks
        if (row.clicks !== null && row.clicks !== undefined) {
          const val = Number(row.clicks);
          totalClicksSum = (totalClicksSum ?? 0) + val;
          platformBreakdown[plat].clicks = (platformBreakdown[plat].clicks ?? 0) + val;
        }

        // Likes / Reactions
        const rx = row.reactions !== null ? row.reactions : row.likes;
        if (rx !== null && rx !== undefined) {
          const val = Number(rx);
          totalReactionsSum = (totalReactionsSum ?? 0) + val;
          platformBreakdown[plat].likes = (platformBreakdown[plat].likes ?? 0) + val;
        }

        // Comments
        if (row.comments !== null && row.comments !== undefined) {
          const val = Number(row.comments);
          totalCommentsSum = (totalCommentsSum ?? 0) + val;
          platformBreakdown[plat].comments = (platformBreakdown[plat].comments ?? 0) + val;
        }

        // Shares
        if (row.shares !== null && row.shares !== undefined) {
          const val = Number(row.shares);
          totalSharesSum = (totalSharesSum ?? 0) + val;
          platformBreakdown[plat].shares = (platformBreakdown[plat].shares ?? 0) + val;
        }

        // Saves
        if (row.saves !== null && row.saves !== undefined) {
          const val = Number(row.saves);
          totalSavesSum = (totalSavesSum ?? 0) + val;
          platformBreakdown[plat].saves = (platformBreakdown[plat].saves ?? 0) + val;
        }

        // Video Views
        if (row.video_views !== null && row.video_views !== undefined) {
          const val = Number(row.video_views);
          totalVideoViewsSum = (totalVideoViewsSum ?? 0) + val;
          platformBreakdown[plat].videoViews = (platformBreakdown[plat].videoViews ?? 0) + val;
        }

        // Engagement
        if (row.engagement !== null && row.engagement !== undefined) {
          const val = Number(row.engagement);
          totalEngagementSum = (totalEngagementSum ?? 0) + val;
          platformBreakdown[plat].engagement = (platformBreakdown[plat].engagement ?? 0) + val;
        }

        // Engagement Rate
        if (row.engagement_rate !== null && row.engagement_rate !== undefined) {
          const rateVal = Number(row.engagement_rate);
          engagementRateSum += rateVal;
          engagementRateCount++;
        }

        // Track latest sync timestamp
        if (row.last_fetched_at) {
          const dt = new Date(row.last_fetched_at);
          if (!latestFetchedAt || dt > latestFetchedAt) {
            latestFetchedAt = dt;
          }
          if (
            !platformBreakdown[plat].lastUpdated ||
            dt > new Date(platformBreakdown[plat].lastUpdated!)
          ) {
            platformBreakdown[plat].lastUpdated = dt.toISOString();
          }
        }
      }

      // Calculate Average Engagement Rate
      let averageEngagementRate: number | null = null;
      if (engagementRateCount > 0) {
        averageEngagementRate = Number((engagementRateSum / engagementRateCount).toFixed(2));
      } else if (
        totalEngagementSum !== null &&
        totalReachSum !== null &&
        totalReachSum > 0
      ) {
        averageEngagementRate = Number(((totalEngagementSum / totalReachSum) * 100).toFixed(2));
      }

      // Platform engagement rate
      for (const plat of Object.keys(platformBreakdown)) {
        const p = platformBreakdown[plat];
        if (p.engagement !== null && p.reach !== null && p.reach > 0) {
          p.engagementRate = Number(((p.engagement / p.reach) * 100).toFixed(2));
        } else if (p.engagement !== null && p.impressions !== null && p.impressions > 0) {
          p.engagementRate = Number(((p.engagement / p.impressions) * 100).toFixed(2));
        }
      }

      // 4. Fetch Media Assets thumbnails for all posts
      const brandMedia = await db('media_assets')
        .where('brand_id', brandId)
        .select('id', 'storage_key', 'media_type', 'file_name', 'thumbnail_url');

      const mediaMap = new Map<string, any>();
      for (const m of brandMedia) {
        mediaMap.set(m.id, m);
      }

      // 5. Group variants by post_id to construct Post Analytics List
      const postMap = new Map<string, any>();

      for (const row of allVariants) {
        if (!postMap.has(row.post_id)) {
          let assetIds: string[] = [];
          try {
            assetIds =
              typeof row.media_asset_ids === 'string'
                ? JSON.parse(row.media_asset_ids)
                : row.media_asset_ids || [];
          } catch {
            assetIds = [];
          }

          const firstAsset = assetIds.length > 0 ? mediaMap.get(assetIds[0]) : null;
          const thumbUrl = firstAsset
            ? firstAsset.thumbnail_url || `/uploads/${firstAsset.storage_key}`
            : null;

          postMap.set(row.post_id, {
            id: row.post_id,
            title: row.post_title,
            caption: row.base_content,
            publishedAt: row.published_at || row.post_created_at,
            thumbnailUrl: thumbUrl,
            mediaType: firstAsset ? firstAsset.media_type : 'none',
            variants: [],
            // Aggregate values
            reach: null,
            impressions: null,
            clicks: null,
            reactions: null,
            likes: null,
            comments: null,
            shares: null,
            saves: null,
            videoViews: null,
            engagement: null,
            engagementRate: null,
            lastFetchedAt: null,
            lastError: null,
          });
        }

        const postEntry = postMap.get(row.post_id);

        const variantItem = {
          id: row.variant_id,
          platform: row.platform,
          remotePostId: row.remote_post_id,
          remotePostUrl: row.remote_post_url,
          reach: row.reach !== null && row.reach !== undefined ? Number(row.reach) : null,
          impressions:
            row.impressions !== null && row.impressions !== undefined
              ? Number(row.impressions)
              : null,
          clicks: row.clicks !== null && row.clicks !== undefined ? Number(row.clicks) : null,
          reactions:
            row.reactions !== null && row.reactions !== undefined
              ? Number(row.reactions)
              : null,
          likes: row.likes !== null && row.likes !== undefined ? Number(row.likes) : null,
          comments:
            row.comments !== null && row.comments !== undefined
              ? Number(row.comments)
              : null,
          shares: row.shares !== null && row.shares !== undefined ? Number(row.shares) : null,
          saves: row.saves !== null && row.saves !== undefined ? Number(row.saves) : null,
          videoViews:
            row.video_views !== null && row.video_views !== undefined
              ? Number(row.video_views)
              : null,
          profileActivity:
            row.profile_activity !== null && row.profile_activity !== undefined
              ? Number(row.profile_activity)
              : null,
          engagement:
            row.engagement !== null && row.engagement !== undefined
              ? Number(row.engagement)
              : null,
          engagementRate:
            row.engagement_rate !== null && row.engagement_rate !== undefined
              ? Number(row.engagement_rate)
              : null,
          lastFetchedAt: row.last_fetched_at,
          lastError: row.last_error,
        };

        postEntry.variants.push(variantItem);

        // Aggregate for post card display
        if (variantItem.reach !== null) {
          postEntry.reach = (postEntry.reach ?? 0) + variantItem.reach;
        }
        if (variantItem.impressions !== null) {
          postEntry.impressions = (postEntry.impressions ?? 0) + variantItem.impressions;
        }
        if (variantItem.clicks !== null) {
          postEntry.clicks = (postEntry.clicks ?? 0) + variantItem.clicks;
        }
        if (variantItem.reactions !== null || variantItem.likes !== null) {
          const lk = variantItem.reactions ?? variantItem.likes ?? 0;
          postEntry.likes = (postEntry.likes ?? 0) + lk;
          postEntry.reactions = postEntry.likes;
        }
        if (variantItem.comments !== null) {
          postEntry.comments = (postEntry.comments ?? 0) + variantItem.comments;
        }
        if (variantItem.shares !== null) {
          postEntry.shares = (postEntry.shares ?? 0) + variantItem.shares;
        }
        if (variantItem.saves !== null) {
          postEntry.saves = (postEntry.saves ?? 0) + variantItem.saves;
        }
        if (variantItem.videoViews !== null) {
          postEntry.videoViews = (postEntry.videoViews ?? 0) + variantItem.videoViews;
        }
        if (variantItem.engagement !== null) {
          postEntry.engagement = (postEntry.engagement ?? 0) + variantItem.engagement;
        }
        if (variantItem.engagementRate !== null) {
          postEntry.engagementRate = variantItem.engagementRate;
        }
        if (variantItem.lastFetchedAt) {
          postEntry.lastFetchedAt = variantItem.lastFetchedAt;
        }
        if (variantItem.lastError) {
          postEntry.lastError = variantItem.lastError;
        }
      }

      // Recompute post-level engagement rate if needed
      for (const p of postMap.values()) {
        if (p.engagement !== null && p.reach !== null && p.reach > 0) {
          p.engagementRate = Number(((p.engagement / p.reach) * 100).toFixed(2));
        } else if (p.engagement !== null && p.impressions !== null && p.impressions > 0) {
          p.engagementRate = Number(((p.engagement / p.impressions) * 100).toFixed(2));
        }
      }

      const allPosts = Array.from(postMap.values()).sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      const totalPostsCount = allPosts.length;
      const paginatedPosts = allPosts.slice(offset, offset + limit);

      // 6. Real Daily Performance Timeline
      const timeSeries: Array<{
        date: string;
        reach: number | null;
        impressions: number | null;
        engagements: number | null;
        likes: number | null;
        comments: number | null;
        shares: number | null;
        clicks: number | null;
        videoViews: number | null;
      }> = [];

      // Query granular metrics within date range
      const granularMetrics = await db('post_analytics_metrics')
        .where('brand_id', brandId)
        .where('metric_date', '>=', startDate)
        .where('metric_date', '<=', endDate)
        .select('metric', 'value', 'metric_date');

      const dayBuckets = new Map<string, any>();
      for (const m of granularMetrics) {
        const day = new Date(m.metric_date).toISOString().split('T')[0];
        if (!dayBuckets.has(day)) {
          dayBuckets.set(day, {
            date: day,
            reach: null,
            impressions: null,
            engagements: null,
            likes: null,
            comments: null,
            shares: null,
            clicks: null,
            videoViews: null,
          });
        }
        const bucket = dayBuckets.get(day);
        const val = Number(m.value);

        switch (m.metric) {
          case 'reach':
            bucket.reach = (bucket.reach ?? 0) + val;
            break;
          case 'impressions':
            bucket.impressions = (bucket.impressions ?? 0) + val;
            break;
          case 'engagement':
            bucket.engagements = (bucket.engagements ?? 0) + val;
            break;
          case 'likes':
          case 'reactions':
            bucket.likes = (bucket.likes ?? 0) + val;
            break;
          case 'comments':
            bucket.comments = (bucket.comments ?? 0) + val;
            break;
          case 'shares':
            bucket.shares = (bucket.shares ?? 0) + val;
            break;
          case 'clicks':
            bucket.clicks = (bucket.clicks ?? 0) + val;
            break;
          case 'video_views':
            bucket.videoViews = (bucket.videoViews ?? 0) + val;
            break;
        }
      }

      const sortedDays = Array.from(dayBuckets.keys()).sort();
      for (const d of sortedDays) {
        timeSeries.push(dayBuckets.get(d));
      }

      res.json({
        success: true,
        data: {
          totals: {
            totalPublishedPosts: distinctPostIds.size,
            totalReach: totalReachSum,
            totalImpressions: totalImpressionsSum,
            totalClicks: totalClicksSum,
            totalReactions: totalReactionsSum,
            totalComments: totalCommentsSum,
            totalShares: totalSharesSum,
            totalSaves: totalSavesSum,
            totalVideoViews: totalVideoViewsSum,
            totalEngagement: totalEngagementSum,
            averageEngagementRate: averageEngagementRate,
            lastSyncedAt: latestFetchedAt ? latestFetchedAt.toISOString() : null,
            lastSuccessfulSync: connection?.last_successful_sync
              ? new Date(connection.last_successful_sync).toISOString()
              : latestFetchedAt
              ? latestFetchedAt.toISOString()
              : null,
            lastAttempt: connection?.last_attempt
              ? new Date(connection.last_attempt).toISOString()
              : null,
            lastError: connection?.last_error || null,
            reauthRequired: isReauthRequired,
            connectionStatus,
          },
          platformBreakdown,
          timeSeries,
          posts: paginatedPosts,
          pagination: {
            page,
            limit,
            totalCount: totalPostsCount,
            totalPages: Math.ceil(totalPostsCount / limit),
            hasMore: offset + limit < totalPostsCount,
          },
          filters: {
            timeRange: rangeLabel,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            platform: platformParam,
          },
        },
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getOverview] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve analytics overview' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/posts/:postId
   * Detailed drilldown for a single post.
   */
  public static async getPostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, postId } = req.params;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access to this brand is denied' },
        });
        return;
      }

      const post = await db('posts')
        .where({ id: postId, brand_id: brandId })
        .first();

      if (!post) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Post not found' },
        });
        return;
      }

      const variants = await db('post_variants')
        .where('post_id', postId)
        .leftJoin('post_analytics_snapshots', 'post_variants.id', 'post_analytics_snapshots.post_variant_id')
        .select(
          'post_variants.id',
          'post_variants.platform',
          'post_variants.status',
          'post_variants.remote_post_id',
          'post_variants.remote_post_url',
          'post_variants.media_asset_ids',
          'post_analytics_snapshots.reach',
          'post_analytics_snapshots.impressions',
          'post_analytics_snapshots.reactions',
          'post_analytics_snapshots.likes',
          'post_analytics_snapshots.comments',
          'post_analytics_snapshots.shares',
          'post_analytics_snapshots.saves',
          'post_analytics_snapshots.clicks',
          'post_analytics_snapshots.video_views',
          'post_analytics_snapshots.profile_activity',
          'post_analytics_snapshots.engagement',
          'post_analytics_snapshots.engagement_rate',
          'post_analytics_snapshots.raw_metrics',
          'post_analytics_snapshots.last_fetched_at',
          'post_analytics_snapshots.last_error'
        );

      let mediaAsset = null;
      let assetIds: string[] = [];
      for (const v of variants) {
        try {
          const ids =
            typeof v.media_asset_ids === 'string'
              ? JSON.parse(v.media_asset_ids)
              : v.media_asset_ids || [];
          if (Array.isArray(ids) && ids.length > 0) {
            assetIds = ids;
            break;
          }
        } catch {}
      }

      if (assetIds.length > 0) {
        mediaAsset = await db('media_assets').where('id', assetIds[0]).first();
      }

      const thumbUrl = mediaAsset
        ? mediaAsset.thumbnail_url || `/uploads/${mediaAsset.storage_key}`
        : null;

      // Aggregates across variants
      let aggReach: number | null = null;
      let aggImpressions: number | null = null;
      let aggLikes: number | null = null;
      let aggComments: number | null = null;
      let aggShares: number | null = null;
      let aggSaves: number | null = null;
      let aggClicks: number | null = null;
      let aggVideoViews: number | null = null;
      let aggEngagement: number | null = null;
      let latestFetchedAt: Date | null = null;

      const variantsData = variants.map((v) => {
        const reach = v.reach !== null && v.reach !== undefined ? Number(v.reach) : null;
        const imp = v.impressions !== null && v.impressions !== undefined ? Number(v.impressions) : null;
        const rx = v.reactions !== null ? Number(v.reactions) : v.likes !== null ? Number(v.likes) : null;
        const comms = v.comments !== null && v.comments !== undefined ? Number(v.comments) : null;
        const sh = v.shares !== null && v.shares !== undefined ? Number(v.shares) : null;
        const sv = v.saves !== null && v.saves !== undefined ? Number(v.saves) : null;
        const clk = v.clicks !== null && v.clicks !== undefined ? Number(v.clicks) : null;
        const vv = v.video_views !== null && v.video_views !== undefined ? Number(v.video_views) : null;
        const pa = v.profile_activity !== null && v.profile_activity !== undefined ? Number(v.profile_activity) : null;
        const eng = v.engagement !== null && v.engagement !== undefined ? Number(v.engagement) : null;
        const rate = v.engagement_rate !== null && v.engagement_rate !== undefined ? Number(v.engagement_rate) : null;

        if (reach !== null) aggReach = (aggReach ?? 0) + reach;
        if (imp !== null) aggImpressions = (aggImpressions ?? 0) + imp;
        if (rx !== null) aggLikes = (aggLikes ?? 0) + rx;
        if (comms !== null) aggComments = (aggComments ?? 0) + comms;
        if (sh !== null) aggShares = (aggShares ?? 0) + sh;
        if (sv !== null) aggSaves = (aggSaves ?? 0) + sv;
        if (clk !== null) aggClicks = (aggClicks ?? 0) + clk;
        if (vv !== null) aggVideoViews = (aggVideoViews ?? 0) + vv;
        if (eng !== null) aggEngagement = (aggEngagement ?? 0) + eng;

        if (v.last_fetched_at) {
          const dt = new Date(v.last_fetched_at);
          if (!latestFetchedAt || dt > latestFetchedAt) latestFetchedAt = dt;
        }

        return {
          id: v.id,
          platform: v.platform,
          status: v.status,
          remotePostId: v.remote_post_id,
          remotePostUrl: v.remote_post_url,
          metrics: {
            reach,
            impressions: imp,
            reactions: rx,
            likes: rx,
            comments: comms,
            shares: sh,
            saves: sv,
            clicks: clk,
            videoViews: vv,
            profileActivity: pa,
            engagement: eng,
            engagementRate: rate,
          },
          lastFetchedAt: v.last_fetched_at,
          lastError: v.last_error,
        };
      });

      let aggRate: number | null = null;
      if (aggEngagement !== null && aggReach !== null && aggReach > 0) {
        aggRate = Number(((aggEngagement / aggReach) * 100).toFixed(2));
      } else if (aggEngagement !== null && aggImpressions !== null && aggImpressions > 0) {
        aggRate = Number(((aggEngagement / aggImpressions) * 100).toFixed(2));
      }

      // Query performance timeline for this post
      const timelineMetrics = await db('post_analytics_metrics')
        .where('post_id', postId)
        .orderBy('metric_date', 'asc')
        .select('metric', 'value', 'metric_date', 'platform');

      res.json({
        success: true,
        data: {
          post: {
            id: post.id,
            brandId: post.brand_id,
            title: post.title,
            caption: post.base_content,
            status: post.status,
            publishedAt: post.published_at || post.created_at,
            thumbnailUrl: thumbUrl,
            mediaType: mediaAsset ? mediaAsset.media_type : 'none',
          },
          aggregate: {
            reach: aggReach,
            impressions: aggImpressions,
            reactions: aggLikes,
            likes: aggLikes,
            comments: aggComments,
            shares: aggShares,
            saves: aggSaves,
            clicks: aggClicks,
            videoViews: aggVideoViews,
            engagement: aggEngagement,
            engagementRate: aggRate,
            lastFetchedAt: latestFetchedAt ? new Date(latestFetchedAt as any).toISOString() : null,
          },
          variants: variantsData,
          timeline: timelineMetrics,
        },
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getPostAnalytics] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve post analytics' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/analytics/sync
   * Triggers real analytics synchronization from Meta Graph API.
   */
  public static async syncMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const postId = req.body?.postId as string | undefined;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access to this brand is denied' },
        });
        return;
      }

      const syncResult = await MetaAnalyticsSyncService.syncBrandAnalytics(brandId, {
        postId,
        force: true, // Manual click forces refresh of metrics
      });

      res.json({
        success: true,
        data: {
          ...syncResult,
          message: syncResult.reauthRequired
            ? 'Meta connection authorization expired. Reauthorization required.'
            : syncResult.skipped
            ? 'A synchronization job is already running for this brand.'
            : `Successfully synchronized analytics for ${syncResult.syncedCount} published post(s).`,
        },
      });
    } catch (err: any) {
      console.error('[AnalyticsController.syncMetrics] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: err.message || 'Failed to sync analytics' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/analytics/posts/:postId/sync
   * Refreshes real analytics for a specific post.
   */
  public static async syncSinglePost(req: Request, res: Response): Promise<void> {
    try {
      const { brandId, postId } = req.params;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access to this brand is denied' },
        });
        return;
      }

      const syncResult = await MetaAnalyticsSyncService.syncBrandAnalytics(brandId, {
        postId,
        force: true,
      });

      res.json({
        success: true,
        data: syncResult,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.syncSinglePost] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'SYNC_ERROR', message: err.message || 'Failed to sync post analytics' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/export
   * Exports real performance report as CSV or JSON.
   */
  public static async exportReport(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const format = (req.query.format as string) || 'csv';

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access to this brand is denied' },
        });
        return;
      }

      const brand = await db('brands').where('id', brandId).first();
      const brandName = brand ? brand.name : 'Brand';

      const variants = await db('post_variants')
        .join('posts', 'post_variants.post_id', 'posts.id')
        .leftJoin('post_analytics_snapshots', 'post_variants.id', 'post_analytics_snapshots.post_variant_id')
        .where('posts.brand_id', brandId)
        .where('post_variants.status', 'published')
        .select(
          'posts.id as post_id',
          'posts.title as post_title',
          'posts.published_at',
          'post_variants.platform',
          'post_variants.remote_post_id',
          'post_variants.remote_post_url',
          'post_analytics_snapshots.reach',
          'post_analytics_snapshots.impressions',
          'post_analytics_snapshots.reactions',
          'post_analytics_snapshots.likes',
          'post_analytics_snapshots.comments',
          'post_analytics_snapshots.shares',
          'post_analytics_snapshots.saves',
          'post_analytics_snapshots.clicks',
          'post_analytics_snapshots.video_views',
          'post_analytics_snapshots.engagement',
          'post_analytics_snapshots.engagement_rate',
          'post_analytics_snapshots.last_fetched_at'
        );

      if (format === 'json') {
        res.json({
          success: true,
          data: {
            brandName,
            exportedAt: new Date().toISOString(),
            variants,
          },
        });
        return;
      }

      const headers = [
        'Post ID',
        'Post Title',
        'Platform',
        'Published Date',
        'Remote Post ID',
        'Permalink',
        'Reach',
        'Impressions',
        'Reactions/Likes',
        'Comments',
        'Shares',
        'Saves',
        'Clicks',
        'Video Views',
        'Engagement',
        'Engagement Rate %',
        'Last Synced At',
      ];

      const rows = variants.map((v) => {
        const reach = v.reach !== null && v.reach !== undefined ? v.reach : 'Not available';
        const imp = v.impressions !== null && v.impressions !== undefined ? v.impressions : 'Not available';
        const likes = v.reactions ?? v.likes ?? 'Not available';
        const comms = v.comments !== null && v.comments !== undefined ? v.comments : 'Not available';
        const sh = v.shares !== null && v.shares !== undefined ? v.shares : 'Not available';
        const sv = v.saves !== null && v.saves !== undefined ? v.saves : 'Not available';
        const clk = v.clicks !== null && v.clicks !== undefined ? v.clicks : 'Not available';
        const vv = v.video_views !== null && v.video_views !== undefined ? v.video_views : 'Not available';
        const eng = v.engagement !== null && v.engagement !== undefined ? v.engagement : 'Not available';
        const rate =
          v.engagement_rate !== null && v.engagement_rate !== undefined
            ? `${v.engagement_rate}%`
            : 'Not available';

        return [
          `"${v.post_id}"`,
          `"${(v.post_title || 'Untitled').replace(/"/g, '""')}"`,
          `"${v.platform || 'N/A'}"`,
          `"${v.published_at ? new Date(v.published_at).toISOString().split('T')[0] : 'N/A'}"`,
          `"${v.remote_post_id || 'N/A'}"`,
          `"${v.remote_post_url || 'N/A'}"`,
          reach,
          imp,
          likes,
          comms,
          sh,
          sv,
          clk,
          vv,
          eng,
          rate,
          `"${(v as any).last_fetched_at ? new Date((v as any).last_fetched_at).toISOString() : 'Never'}"`,
        ].join(',');
      });

      const csvContent = [
        `# SocialForge Real Social Post Performance Report`,
        `# Brand: ${brandName}`,
        `# Exported: ${new Date().toUTCString()}`,
        ``,
        headers.join(','),
        ...rows,
      ].join('\n');

      const filename = `socialforge-real-analytics-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvContent);
    } catch (err: any) {
      console.error('[AnalyticsController.exportReport] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to export analytics report' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/winners
   * Retrieves detected winners for brand.
   */
  public static async getWinners(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { winnerType, platform, limit } = req.query;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const winners = await winnerDetectionService.getWinners(brandId, {
        winnerType: winnerType as string | undefined,
        platform: platform as string | undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({
        success: true,
        data: { winners, count: winners.length },
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getWinners] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get winners' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/analytics/detect-winners
   * Triggers real-time winner detection scan.
   */
  public static async detectWinners(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { forceRecheck } = req.body || {};

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const winners = await winnerDetectionService.detectWinnersForBrand(brandId, {
        forceRecheck: Boolean(forceRecheck),
        triggerAutomations: true,
      });

      res.json({
        success: true,
        data: {
          detectedCount: winners.length,
          winners,
        },
      });
    } catch (err: any) {
      console.error('[AnalyticsController.detectWinners] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'DETECTION_ERROR', message: err.message || 'Failed to detect winners' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/learning-insights
   * Retrieves continuous brand brain learning insights and directives.
   */
  public static async getLearningInsights(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const result = await brandBrainLearningService.getBrandLearningInsights(brandId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getLearningInsights] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get learning insights' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/analytics/telemetry/ingest
   * Ingests normalized telemetry across any platform.
   */
  public static async ingestTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { postId, postVariantId, platform, remotePostId, rawMetrics, publishedAt } = req.body || {};

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const brand = await db('brands').where({ id: brandId }).first();
      if (!brand) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Brand not found' } });
        return;
      }

      const telemetry = await telemetryNormalizerService.ingestTelemetry({
        tenantId: brand.tenant_id,
        brandId,
        postId,
        postVariantId,
        platform,
        remotePostId,
        rawMetrics: rawMetrics || {},
        publishedAt,
      });

      res.json({
        success: true,
        data: telemetry,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.ingestTelemetry] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INGESTION_ERROR', message: err.message || 'Failed to ingest telemetry' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/baselines
   * Returns current brand performance baseline benchmarks.
   */
  public static async getBaselines(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const baseline = await winnerDetectionService.calculateBrandBaseline(brandId);

      res.json({
        success: true,
        data: baseline,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getBaselines] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get brand baseline' },
      });
    }
  }

  /**
   * GET /api/v1/brands/:brandId/analytics/advisor
   * Closed-Loop AI Marketing Advisor: Analyzes published post performance telemetry
   * and synthesizes data-backed campaign proposals.
   */
  public static async getAdvisorDiagnosis(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const diagnosis = await aiMarketingAdvisorService.getAdvisorDiagnosis(brandId);

      res.json({
        success: true,
        data: diagnosis,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.getAdvisorDiagnosis] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'ADVISOR_ERROR', message: err.message || 'Failed to get AI advisor diagnosis' },
      });
    }
  }

  /**
   * POST /api/v1/brands/:brandId/analytics/advisor/apply
   * Accepts a proposal, links to growth_recommendations, and provides pre-filled campaign payload.
   */
  public static async applyAdvisorProposal(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { proposalId } = req.body || {};

      const hasAccess = await AnalyticsController.verifyBrandAccess(req, brandId);
      if (!hasAccess) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
        return;
      }

      const userId = (req.user as any)?.id;
      const result = await aiMarketingAdvisorService.applyProposal(brandId, proposalId, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[AnalyticsController.applyAdvisorProposal] Error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'ADVISOR_APPLY_ERROR', message: err.message || 'Failed to apply advisor proposal' },
      });
    }
  }
}

