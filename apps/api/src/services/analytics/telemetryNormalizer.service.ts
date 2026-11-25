import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { NormalizedTelemetry, TelemetryPlatform } from '@socialforge/shared';

export class TelemetryNormalizerService {
  /**
   * Normalizes raw metrics from any social platform into the canonical NormalizedTelemetry model.
   * Supports Meta (Facebook/Instagram), X (Twitter), LinkedIn, TikTok, and YouTube Shorts.
   */
  public normalize(
    platform: TelemetryPlatform,
    remotePostId: string,
    rawMetrics: Record<string, any>,
    publishedAt?: Date | string | null
  ): NormalizedTelemetry {
    const plat = (platform || '').toLowerCase();

    let impressions = 0;
    let reach = 0;
    let likes = 0;
    let comments = 0;
    let shares = 0;
    let clicks = 0;
    let saves = 0;
    let videoViews = 0;
    let watchTimeSeconds = 0;
    let engagement = 0;
    let engagementRate = 0;
    let ctr = 0;
    let velocityScore = 0;
    let roi = 0;

    if (plat === 'facebook' || plat === 'fb') {
      impressions = Number(rawMetrics.impressions || rawMetrics.post_impressions || 0);
      reach = Number(rawMetrics.reach || rawMetrics.post_impressions_unique || Math.round(impressions * 0.85));
      likes = Number(rawMetrics.likes || rawMetrics.reactions || 0);
      comments = Number(rawMetrics.comments || 0);
      shares = Number(rawMetrics.shares || 0);
      clicks = Number(rawMetrics.clicks || rawMetrics.post_clicks || 0);
      videoViews = Number(rawMetrics.video_views || rawMetrics.videoViews || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + clicks));
    } else if (plat === 'instagram' || plat === 'ig') {
      impressions = Number(rawMetrics.impressions || 0);
      reach = Number(rawMetrics.reach || Math.round(impressions * 0.82));
      likes = Number(rawMetrics.likes || 0);
      comments = Number(rawMetrics.comments || 0);
      shares = Number(rawMetrics.shares || 0);
      saves = Number(rawMetrics.saves || rawMetrics.saved || 0);
      clicks = Number(rawMetrics.clicks || rawMetrics.profile_activity || 0);
      videoViews = Number(rawMetrics.video_views || rawMetrics.videoViews || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + saves + clicks));
    } else if (plat === 'twitter' || plat === 'x') {
      impressions = Number(rawMetrics.impression_count || rawMetrics.impressions || 0);
      reach = Number(rawMetrics.reach || Math.round(impressions * 0.75));
      likes = Number(rawMetrics.like_count || rawMetrics.likes || 0);
      comments = Number(rawMetrics.reply_count || rawMetrics.comments || 0);
      shares = Number(rawMetrics.retweet_count || rawMetrics.shares || 0) + Number(rawMetrics.quote_count || 0);
      clicks = Number(rawMetrics.url_link_clicks || rawMetrics.clicks || 0);
      videoViews = Number(rawMetrics.view_count || rawMetrics.video_views || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + clicks));
    } else if (plat === 'linkedin') {
      impressions = Number(rawMetrics.impressionCount || rawMetrics.impressions || 0);
      reach = Number(rawMetrics.uniqueImpressionsCount || rawMetrics.reach || Math.round(impressions * 0.80));
      likes = Number(rawMetrics.likeCount || rawMetrics.likes || rawMetrics.reactions || 0);
      comments = Number(rawMetrics.commentCount || rawMetrics.comments || 0);
      shares = Number(rawMetrics.shareCount || rawMetrics.shares || 0);
      clicks = Number(rawMetrics.clickCount || rawMetrics.clicks || 0);
      videoViews = Number(rawMetrics.video_views || rawMetrics.videoViews || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + clicks));
    } else if (plat === 'tiktok') {
      impressions = Number(rawMetrics.view_count || rawMetrics.impressions || 0);
      reach = Number(rawMetrics.reach || Math.round(impressions * 0.88));
      likes = Number(rawMetrics.like_count || rawMetrics.likes || 0);
      comments = Number(rawMetrics.comment_count || rawMetrics.comments || 0);
      shares = Number(rawMetrics.share_count || rawMetrics.shares || 0);
      saves = Number(rawMetrics.favourite_count || rawMetrics.saves || 0);
      clicks = Number(rawMetrics.clicks || 0);
      videoViews = impressions;
      watchTimeSeconds = Number(rawMetrics.total_watch_time || rawMetrics.watchTimeSeconds || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + saves));
    } else if (plat === 'youtube' || plat === 'youtube_shorts') {
      impressions = Number(rawMetrics.views || rawMetrics.impressions || 0);
      reach = Number(rawMetrics.reach || Math.round(impressions * 0.90));
      likes = Number(rawMetrics.likes || 0);
      comments = Number(rawMetrics.comments || 0);
      shares = Number(rawMetrics.shares || 0);
      clicks = Number(rawMetrics.clicks || 0);
      videoViews = impressions;
      watchTimeSeconds = Number(rawMetrics.watchTimeSeconds || (Number(rawMetrics.estimatedMinutesWatched || 0) * 60));
      engagement = Number(rawMetrics.engagement || (likes + comments + shares));
    } else {
      // Generic fallback
      impressions = Number(rawMetrics.impressions || 0);
      reach = Number(rawMetrics.reach || impressions);
      likes = Number(rawMetrics.likes || 0);
      comments = Number(rawMetrics.comments || 0);
      shares = Number(rawMetrics.shares || 0);
      clicks = Number(rawMetrics.clicks || 0);
      videoViews = Number(rawMetrics.video_views || 0);
      engagement = Number(rawMetrics.engagement || (likes + comments + shares + clicks));
    }

    // Engagement Rate (%)
    if (rawMetrics.engagement_rate !== undefined && rawMetrics.engagement_rate !== null) {
      engagementRate = Number(rawMetrics.engagement_rate);
    } else if (impressions > 0) {
      engagementRate = Number(((engagement / impressions) * 100).toFixed(2));
    }

    // Click-Through Rate (%)
    if (rawMetrics.ctr !== undefined && rawMetrics.ctr !== null) {
      ctr = Number(rawMetrics.ctr);
    } else if (impressions > 0 && clicks > 0) {
      ctr = Number(((clicks / impressions) * 100).toFixed(2));
    }

    // Velocity Score (engagements per hour)
    if (rawMetrics.velocity_score !== undefined) {
      velocityScore = Number(rawMetrics.velocity_score);
    } else if (publishedAt) {
      const pubDate = new Date(publishedAt).getTime();
      const diffHours = Math.max(0.25, (Date.now() - pubDate) / (1000 * 60 * 60));
      velocityScore = Number((engagement / diffHours).toFixed(2));
    } else {
      velocityScore = Number((engagement / 24).toFixed(2));
    }

    if (rawMetrics.roi !== undefined) {
      roi = Number(rawMetrics.roi);
    }

    return {
      platform: plat,
      remotePostId: String(remotePostId),
      impressions,
      reach,
      likes,
      comments,
      shares,
      clicks,
      saves,
      videoViews,
      watchTimeSeconds,
      engagement,
      engagementRate,
      ctr,
      velocityScore,
      roi,
      rawMetrics,
    };
  }

  /**
   * Ingests and stores normalized telemetry for a post variant.
   * Updates snapshot and writes timeseries entry with tenant/brand isolation.
   */
  public async ingestTelemetry(params: {
    tenantId: string;
    brandId: string;
    postId: string;
    postVariantId: string;
    platform: TelemetryPlatform;
    remotePostId: string;
    rawMetrics: Record<string, any>;
    publishedAt?: Date | string | null;
  }): Promise<NormalizedTelemetry> {
    const { tenantId, brandId, postId, postVariantId, platform, remotePostId, rawMetrics, publishedAt } = params;

    // Verify tenant and brand ownership
    const post = await db('posts')
      .where({ id: postId, tenant_id: tenantId, brand_id: brandId })
      .first();
    if (!post) {
      throw new Error(`Post ${postId} not found or tenant/brand mismatch`);
    }

    const variant = await db('post_variants')
      .where({ id: postVariantId, post_id: postId })
      .first();
    if (!variant) {
      throw new Error(`Variant ${postVariantId} not found for post ${postId}`);
    }

    const normalized = this.normalize(
      platform || variant.platform,
      remotePostId || variant.remote_post_id || postVariantId,
      rawMetrics,
      publishedAt || post.published_at || post.created_at
    );

    // Upsert into post_analytics_snapshots
    const existingSnapshot = await db('post_analytics_snapshots')
      .where({ post_variant_id: postVariantId })
      .first();

    const snapshotPayload = {
      brand_id: brandId,
      post_id: postId,
      post_variant_id: postVariantId,
      platform: normalized.platform,
      remote_post_id: normalized.remotePostId,
      reach: normalized.reach,
      impressions: normalized.impressions,
      reactions: normalized.likes,
      likes: normalized.likes,
      comments: normalized.comments,
      shares: normalized.shares,
      saves: normalized.saves || 0,
      clicks: normalized.clicks,
      video_views: normalized.videoViews || 0,
      watch_time_seconds: normalized.watchTimeSeconds || 0,
      engagement: normalized.engagement,
      engagement_rate: normalized.engagementRate,
      ctr: normalized.ctr,
      velocity_score: normalized.velocityScore,
      roi: normalized.roi || 0,
      raw_metrics: JSON.stringify(normalized.rawMetrics),
      last_fetched_at: new Date(),
      updated_at: new Date(),
    };

    if (existingSnapshot) {
      await db('post_analytics_snapshots')
        .where({ id: existingSnapshot.id })
        .update(snapshotPayload);
    } else {
      await db('post_analytics_snapshots').insert({
        id: crypto.randomUUID(),
        created_at: new Date(),
        ...snapshotPayload,
      });
    }

    // Insert timeseries into post_analytics_metrics
    const metricEntries = [
      { metric: 'impressions', value: normalized.impressions },
      { metric: 'reach', value: normalized.reach },
      { metric: 'likes', value: normalized.likes },
      { metric: 'comments', value: normalized.comments },
      { metric: 'shares', value: normalized.shares },
      { metric: 'clicks', value: normalized.clicks },
      { metric: 'engagement_rate', value: normalized.engagementRate },
    ];

    const now = new Date();
    for (const m of metricEntries) {
      try {
        await db('post_analytics_metrics').insert({
          id: crypto.randomUUID(),
          brand_id: brandId,
          post_id: postId,
          post_variant_id: postVariantId,
          platform: normalized.platform,
          remote_post_id: normalized.remotePostId,
          metric: m.metric,
          value: m.value,
          metric_date: now,
          fetched_at: now,
          created_at: now,
          updated_at: now,
        });
      } catch (err: any) {
        // Ignore unique key collisions on the same timestamp
      }
    }

    return normalized;
  }
}

export const telemetryNormalizerService = new TelemetryNormalizerService();
