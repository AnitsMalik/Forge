import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { metaClient, MetaClient } from './metaClient.js';
import { metaTokenManager } from './tokenManager.js';
import { credentialVaultService } from '../connections/credentialVault.service.js';
import { isRealExternalPostId, isSandboxUrl } from '@socialforge/shared';

export interface PostMetricValues {
  reach: number | null;
  impressions: number | null;
  reactions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  video_views: number | null;
  profile_activity: number | null;
  engagement: number | null;
  engagement_rate: number | null;
  permalink?: string | null;
  raw?: any;
}

export interface SyncResult {
  totalPublished: number;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ postId: string; variantId: string; platform: string; error: string }>;
  reauthRequired: boolean;
  ownershipConflict?: boolean;
  syncedAt: string;
}

export class MetaAnalyticsSyncService {
  /**
   * Retrieves active, decrypted access token for brand's Meta connection.
   * If token is invalid or expired, sets status to 'reauth_required'.
   */
  public static async getBrandAccessToken(brandId: string): Promise<{
    token: string;
    pageId: string | null;
    instagramAccountId: string | null;
    connectionId: string;
  }> {
    const brand = await db('brands').where({ id: brandId }).first();
    if (!brand) {
      throw new Error(`Brand ${brandId} not found`);
    }

    let connection = await db('meta_connections')
      .where({ brand_id: brandId })
      .where(function(q) {
        q.whereNotNull('encrypted_page_access_token').orWhereNotNull('encrypted_user_access_token');
      })
      .orderBy('created_at', 'desc')
      .first();

    if (!connection) {
      // Gracefully resolve from centralized social_connections repository
      const socialConn = await db('social_connections')
        .where({ brand_id: brandId })
        .whereIn('provider', ['facebook', 'instagram'])
        .whereNot({ status: 'DISCONNECTED' })
        .orderBy('created_at', 'desc')
        .first();

      if (socialConn) {
        let token = '';
        if (socialConn.credential_reference) {
          try {
            const creds: any = await credentialVaultService.getCredentials(brand.tenant_id, socialConn.credential_reference);
            token = creds?.accessToken || creds?.apiKey || '';
          } catch {}
        }
        const meta = typeof socialConn.provider_account_metadata === 'string'
          ? JSON.parse(socialConn.provider_account_metadata)
          : (socialConn.provider_account_metadata || {});
        return {
          token,
          pageId: meta.pageId || socialConn.provider_account_id || null,
          instagramAccountId: meta.instagramAccountId || (socialConn.provider === 'instagram' ? socialConn.provider_account_id : null),
          connectionId: socialConn.id,
        };
      }
      throw new Error(`No Meta connection found for brand ${brandId}`);
    }

    if (connection.tenant_id !== brand.tenant_id) {
      throw new Error(`Tenant isolation violation: Meta connection does not match brand tenant.`);
    }

    if (connection.status === 'ownership_conflict') {
      throw new Error(`Meta connection has an ownership conflict across multiple brands/tenants. Analytics sync is blocked until resolved.`);
    }

    const encryptedToken =
      connection.encrypted_page_access_token || connection.encrypted_user_access_token;

    if (!encryptedToken) {
      throw new Error(`Meta connection ${connection.id} has no valid access token`);
    }

    const token = metaTokenManager.decryptToken(encryptedToken);

    return {
      token,
      pageId: connection.selected_page_id || null,
      instagramAccountId: connection.instagram_account_id || null,
      connectionId: connection.id,
    };
  }

  /**
   * Marks a connection as REAUTH_REQUIRED when token expiry/revocation is detected.
   */
  public static async markReauthRequired(connectionId: string, reason: string): Promise<void> {
    console.warn(`[MetaAnalyticsSync] Marking connection ${connectionId} REAUTH_REQUIRED: ${reason}`);
    await db('meta_connections')
      .where({ id: connectionId })
      .update({
        status: 'reauth_required',
        updated_at: new Date(),
      })
      .catch(() => {});
    await db('social_connections')
      .where({ id: connectionId })
      .update({
        status: 'REAUTH_REQUIRED',
        health_status: 'Reauthorization Required',
        updated_at: new Date(),
      })
      .catch(() => {});
  }

  /**
   * Fetches real metrics for a single Facebook post.
   */
  public static async fetchFacebookPostMetrics(
    remotePostId: string,
    accessToken: string
  ): Promise<PostMetricValues> {
    const metrics: PostMetricValues = {
      reach: null,
      impressions: null,
      reactions: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      clicks: null,
      video_views: null,
      profile_activity: null,
      engagement: null,
      engagement_rate: null,
      permalink: null,
      raw: {},
    };

    // 1. Fetch Post Object fields (Reactions, Comments, Shares, Permalink)
    let hasObjectData = false;
    let objectError: any = null;
    try {
      // First attempt full fields (works if pages_read_user_content is granted)
      let postData: any;
      try {
        postData = await metaClient.get(
          remotePostId,
          {
            fields: 'id,message,created_time,permalink_url,shares,comments.summary(true),reactions.summary(true)',
          },
          accessToken
        );
      } catch (fullErr: any) {
        if (fullErr.statusCode === 401 || fullErr.code === 190) throw fullErr;
        // Fallback to core fields requiring only pages_manage_posts / pages_read_engagement
        postData = await metaClient.get(
          remotePostId,
          {
            fields: 'id,message,created_time,permalink_url,shares',
          },
          accessToken
        );
      }

      if (postData && postData.id) {
        hasObjectData = true;
        metrics.raw.post = postData;
        if (postData.permalink_url) {
          metrics.permalink = postData.permalink_url;
        }

        if (postData.reactions?.summary?.total_count !== undefined) {
          metrics.reactions = Number(postData.reactions.summary.total_count);
          metrics.likes = metrics.reactions;
        }

        if (postData.comments?.summary?.total_count !== undefined) {
          metrics.comments = Number(postData.comments.summary.total_count);
        }

        if (postData.shares?.count !== undefined) {
          metrics.shares = Number(postData.shares.count);
        } else {
          metrics.shares = 0;
        }
      }
    } catch (err: any) {
      if (err.statusCode === 401 || err.code === 190) {
        throw err;
      }
      objectError = err;
      console.warn(`[MetaAnalyticsSync] Could not fetch basic Facebook post fields for ${remotePostId}: ${err.message}`);
    }

    // If post object does not exist on Meta (code 100/subcode 33 or deleted), insights will also not exist.
    const fbObjectDoesNotExist =
      objectError &&
      (objectError.code === 100 ||
        (typeof objectError.message === 'string' && objectError.message.includes('does not exist')));

    if (fbObjectDoesNotExist) {
      throw objectError;
    }

    // 2. Fetch Post Insights (Reach, Impressions, Clicks, Video Views, Engagement, Reactions)
    let hasInsightsData = false;
    try {
      let insightsData: any;
      try {
        insightsData = await metaClient.get(
          `${remotePostId}/insights`,
          {
            metric: 'post_impressions,post_impressions_unique,post_clicks,post_video_views,post_engaged_users',
          },
          accessToken
        );
      } catch (primaryErr: any) {
        if (primaryErr.statusCode === 401 || primaryErr.code === 190) throw primaryErr;
        // Fallback for Graph API v19+ where post_impressions / post_engaged_users may be deprecated on organic posts
        insightsData = await metaClient.get(
          `${remotePostId}/insights`,
          {
            metric: 'post_clicks,post_reactions_by_type_total,post_reactions_like_total,post_video_views',
          },
          accessToken
        );
      }

      if (insightsData && Array.isArray(insightsData.data)) {
        hasInsightsData = true;
        metrics.raw.insights = insightsData;
        for (const item of insightsData.data) {
          const val = item.values?.[0]?.value;
          if (val === undefined || val === null) continue;

          switch (item.name) {
            case 'post_impressions_unique':
              metrics.reach = Number(val);
              break;
            case 'post_impressions':
              metrics.impressions = Number(val);
              break;
            case 'post_clicks':
              metrics.clicks = Number(val);
              break;
            case 'post_video_views':
              metrics.video_views = Number(val);
              break;
            case 'post_engaged_users':
              metrics.engagement = Number(val);
              break;
            case 'post_reactions_like_total':
              if (metrics.likes === null) {
                metrics.likes = Number(val);
              }
              break;
            case 'post_reactions_by_type_total':
              if (metrics.reactions === null && typeof val === 'object') {
                const totalReactions = Object.values(val).reduce((a: any, b: any) => Number(a || 0) + Number(b || 0), 0);
                metrics.reactions = Number(totalReactions);
              }
              break;
          }
        }
      }
    } catch (err: any) {
      if (err.statusCode === 401 || err.code === 190) {
        throw err;
      }
      console.warn(`[MetaAnalyticsSync] Facebook insights unavailable for ${remotePostId}: ${err.message}`);
    }

    if (!hasObjectData && !hasInsightsData) {
      throw objectError || new Error(`Failed to retrieve post data from Meta for ${remotePostId}`);
    }

    // 3. Compute Engagement & Engagement Rate where calculable
    if (metrics.engagement === null) {
      const parts = [metrics.reactions, metrics.comments, metrics.shares, metrics.clicks].filter(
        (v) => v !== null
      );
      if (parts.length > 0) {
        metrics.engagement = parts.reduce((acc, curr) => (acc || 0) + (curr || 0), 0);
      }
    }

    if (metrics.engagement !== null) {
      if (metrics.reach !== null && metrics.reach > 0) {
        metrics.engagement_rate = Number(((metrics.engagement / metrics.reach) * 100).toFixed(2));
      } else if (metrics.impressions !== null && metrics.impressions > 0) {
        metrics.engagement_rate = Number(((metrics.engagement / metrics.impressions) * 100).toFixed(2));
      }
    }

    return metrics;
  }

  /**
   * Fetches real metrics for a single Instagram media post.
   */
  public static async fetchInstagramMediaMetrics(
    remoteMediaId: string,
    accessToken: string
  ): Promise<PostMetricValues> {
    const metrics: PostMetricValues = {
      reach: null,
      impressions: null,
      reactions: null,
      likes: null,
      comments: null,
      shares: null,
      saves: null,
      clicks: null,
      video_views: null,
      profile_activity: null,
      engagement: null,
      engagement_rate: null,
      permalink: null,
      raw: {},
    };

    // 1. Fetch Media Object fields (Likes, Comments, MediaType, Permalink)
    let mediaType = 'IMAGE';
    let mediaProductType = 'FEED';
    let basicError: any = null;

    try {
      const mediaData: any = await metaClient.get(
        remoteMediaId,
        {
          fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
        },
        accessToken
      );

      metrics.raw.media = mediaData;
      if (mediaData.permalink) {
        metrics.permalink = mediaData.permalink;
      }
      if (mediaData.media_type) {
        mediaType = mediaData.media_type;
      }
      if (mediaData.media_product_type) {
        mediaProductType = mediaData.media_product_type;
      }

      if (mediaData.like_count !== undefined && mediaData.like_count !== null) {
        metrics.likes = Number(mediaData.like_count);
        metrics.reactions = metrics.likes;
      }

      if (mediaData.comments_count !== undefined && mediaData.comments_count !== null) {
        metrics.comments = Number(mediaData.comments_count);
      }
    } catch (err: any) {
      if (err.statusCode === 401 || err.code === 190) {
        throw err;
      }
      basicError = err;
      console.warn(`[MetaAnalyticsSync] Could not fetch basic Instagram media fields for ${remoteMediaId}: ${err.message}`);
    }

    // If media object does not exist on Meta, insights and fallbacks will also not exist.
    const igMediaDoesNotExist =
      basicError &&
      (basicError.code === 100 ||
        (typeof basicError.message === 'string' && basicError.message.includes('does not exist')));

    if (igMediaDoesNotExist) {
      throw basicError;
    }

    // 2. Fetch Media Insights (Reach, Impressions, Saved, Shares, Total Interactions, Plays)
    const isVideoOrReel = mediaType === 'VIDEO' || mediaProductType === 'REELS';
    const metricsToRequest = isVideoOrReel
      ? 'reach,saved,shares,total_interactions,plays'
      : 'reach,impressions,saved,shares,total_interactions';

    try {
      const insightsData: any = await metaClient.get(
        `${remoteMediaId}/insights`,
        { metric: metricsToRequest },
        accessToken
      );

      metrics.raw.insights = insightsData;
      if (Array.isArray(insightsData?.data)) {
        for (const item of insightsData.data) {
          const val = item.values?.[0]?.value;
          if (val === undefined || val === null) continue;

          switch (item.name) {
            case 'reach':
              metrics.reach = Number(val);
              break;
            case 'impressions':
              metrics.impressions = Number(val);
              break;
            case 'saved':
              metrics.saves = Number(val);
              break;
            case 'shares':
              metrics.shares = Number(val);
              break;
            case 'plays':
            case 'video_views':
              metrics.video_views = Number(val);
              break;
            case 'profile_activity':
              metrics.profile_activity = Number(val);
              break;
            case 'total_interactions':
              metrics.engagement = Number(val);
              break;
          }
        }
      }
    } catch (err: any) {
      if (err.statusCode === 401 || err.code === 190) {
        throw err;
      }
      // If combined metrics request fails (e.g. unsupported metric code 100), try fallback to basic reach/saved
      try {
        const fallbackInsights: any = await metaClient.get(
          `${remoteMediaId}/insights`,
          { metric: 'reach,saved' },
          accessToken
        );
        if (Array.isArray(fallbackInsights?.data)) {
          for (const item of fallbackInsights.data) {
            const val = item.values?.[0]?.value;
            if (val !== undefined && val !== null) {
              if (item.name === 'reach') metrics.reach = Number(val);
              if (item.name === 'saved') metrics.saves = Number(val);
            }
          }
        }
      } catch (fallbackErr) {
        console.warn(`[MetaAnalyticsSync] Instagram insights unavailable for ${remoteMediaId}: ${err.message}`);
      }
    }

    // 3. Compute Engagement & Engagement Rate where calculable
    if (metrics.engagement === null) {
      const parts = [metrics.likes, metrics.comments, metrics.shares, metrics.saves].filter(
        (v) => v !== null
      );
      if (parts.length > 0) {
        metrics.engagement = parts.reduce((acc, curr) => (acc || 0) + (curr || 0), 0);
      }
    }

    if (metrics.engagement !== null) {
      if (metrics.reach !== null && metrics.reach > 0) {
        metrics.engagement_rate = Number(((metrics.engagement / metrics.reach) * 100).toFixed(2));
      } else if (metrics.impressions !== null && metrics.impressions > 0) {
        metrics.engagement_rate = Number(((metrics.engagement / metrics.impressions) * 100).toFixed(2));
      }
    }

    return metrics;
  }

  /**
   * Persists fetched metrics into post_analytics_snapshots and post_analytics_metrics tables atomically.
   */
  public static async persistMetrics(
    brandId: string,
    postId: string,
    variantId: string,
    platform: string,
    remotePostId: string,
    metrics: PostMetricValues,
    publishedAt: Date | string | null
  ): Promise<void> {
    const now = new Date();
    const d = publishedAt ? new Date(publishedAt) : new Date();
    d.setMilliseconds(0);
    const metricDateStr = d.toISOString().slice(0, 19).replace('T', ' ');
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');

    // 1. Update/Upsert post_analytics_snapshots using MySQL atomic ON DUPLICATE KEY UPDATE
    await db.raw(
      `INSERT INTO post_analytics_snapshots
       (id, brand_id, post_id, post_variant_id, platform, remote_post_id, reach, impressions, reactions, likes, comments, shares, saves, clicks, video_views, profile_activity, engagement, engagement_rate, raw_metrics, last_fetched_at, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       reach = VALUES(reach),
       impressions = VALUES(impressions),
       reactions = VALUES(reactions),
       likes = VALUES(likes),
       comments = VALUES(comments),
       shares = VALUES(shares),
       saves = VALUES(saves),
       clicks = VALUES(clicks),
       video_views = VALUES(video_views),
       profile_activity = VALUES(profile_activity),
       engagement = VALUES(engagement),
       engagement_rate = VALUES(engagement_rate),
       raw_metrics = VALUES(raw_metrics),
       last_fetched_at = VALUES(last_fetched_at),
       last_error = NULL,
       updated_at = VALUES(updated_at)`,
      [
        crypto.randomUUID(),
        brandId,
        postId,
        variantId,
        platform,
        remotePostId,
        metrics.reach,
        metrics.impressions,
        metrics.reactions,
        metrics.likes,
        metrics.comments,
        metrics.shares,
        metrics.saves,
        metrics.clicks,
        metrics.video_views,
        metrics.profile_activity,
        metrics.engagement,
        metrics.engagement_rate,
        JSON.stringify(metrics.raw || {}),
        nowStr,
        null,
        nowStr,
        nowStr,
      ]
    );

    // Update remote permalink on post_variants if retrieved
    if (metrics.permalink) {
      await db('post_variants')
        .where({ id: variantId })
        .update({
          remote_post_url: metrics.permalink,
          updated_at: now,
        });
    }

    // 2. Upsert granular metric time-series in post_analytics_metrics
    const metricEntries: Array<{ metric: string; value: number }> = [];

    if (metrics.reach !== null) metricEntries.push({ metric: 'reach', value: metrics.reach });
    if (metrics.impressions !== null) metricEntries.push({ metric: 'impressions', value: metrics.impressions });
    if (metrics.reactions !== null) metricEntries.push({ metric: 'reactions', value: metrics.reactions });
    if (metrics.likes !== null) metricEntries.push({ metric: 'likes', value: metrics.likes });
    if (metrics.comments !== null) metricEntries.push({ metric: 'comments', value: metrics.comments });
    if (metrics.shares !== null) metricEntries.push({ metric: 'shares', value: metrics.shares });
    if (metrics.saves !== null) metricEntries.push({ metric: 'saves', value: metrics.saves });
    if (metrics.clicks !== null) metricEntries.push({ metric: 'clicks', value: metrics.clicks });
    if (metrics.video_views !== null) metricEntries.push({ metric: 'video_views', value: metrics.video_views });
    if (metrics.profile_activity !== null) metricEntries.push({ metric: 'profile_activity', value: metrics.profile_activity });
    if (metrics.engagement !== null) metricEntries.push({ metric: 'engagement', value: metrics.engagement });
    if (metrics.engagement_rate !== null) metricEntries.push({ metric: 'engagement_rate', value: metrics.engagement_rate });

    for (const entry of metricEntries) {
      await db.raw(
        `INSERT INTO post_analytics_metrics 
         (id, brand_id, post_id, post_variant_id, platform, remote_post_id, metric, value, metric_date, fetched_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         value = VALUES(value),
         fetched_at = VALUES(fetched_at),
         updated_at = VALUES(updated_at)`,
        [
          crypto.randomUUID(),
          brandId,
          postId,
          variantId,
          platform,
          remotePostId,
          entry.metric,
          entry.value,
          metricDateStr,
          nowStr,
          nowStr,
          nowStr,
        ]
      );
    }

    // 3. Keep analytics_metrics table aligned for backward compatibility
    const existingLegacy = await db('analytics_metrics')
      .where({ post_variant_id: variantId })
      .first();

    const legacyPayload = {
      impressions: metrics.impressions !== null ? metrics.impressions : 0,
      reach: metrics.reach !== null ? metrics.reach : 0,
      likes: metrics.likes !== null ? metrics.likes : 0,
      comments: metrics.comments !== null ? metrics.comments : 0,
      shares: metrics.shares !== null ? metrics.shares : 0,
      clicks: metrics.clicks !== null ? metrics.clicks : 0,
      video_views: metrics.video_views !== null ? metrics.video_views : 0,
      engagement_rate: metrics.engagement_rate !== null ? metrics.engagement_rate / 100 : 0.0,
      recorded_at: now,
    };

    if (existingLegacy) {
      await db('analytics_metrics')
        .where({ id: existingLegacy.id })
        .update(legacyPayload);
    } else {
      await db('analytics_metrics').insert({
        id: crypto.randomUUID(),
        post_variant_id: variantId,
        ...legacyPayload,
      });
    }
  }

  private static activeSyncLocks = new Set<string>();

  /**
   * Helper to execute an async action with exponential backoff on transient errors.
   * Does NOT retry authentication errors (OAuth 190, 401).
   */
  public static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 2
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        const isTransient =
          err.statusCode >= 500 ||
          err.statusCode === 429 ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT';
        const isAuth = err.statusCode === 401 || err.code === 190;
        if (!isTransient || isAuth || attempt > maxRetries) {
          throw err;
        }
        const backoffMs = Math.pow(2, attempt) * 400;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  /**
   * Checks if a brand currently has an active synchronization running.
   */
  public static isSyncRunning(brandId: string): boolean {
    return this.activeSyncLocks.has(brandId);
  }

  /**
   * Per-variant failure backoff for scheduled (non-forced) syncs.
   * Prevents permanently failing posts (deleted/unavailable on Meta) from being
   * re-requested every cycle. Backoff doubles per failure: 15m, 30m, 1h ... capped at 24h.
   */
  private static failureBackoff = new Map<string, { failures: number; nextAttemptAt: number }>();

  private static recordVariantFailure(variantId: string, permanent: boolean): void {
    const prev = this.failureBackoff.get(variantId);
    const failures = (prev?.failures || 0) + 1;
    const baseMs = 15 * 60 * 1000;
    const capMs = 24 * 60 * 60 * 1000;
    const delayMs = permanent ? capMs : Math.min(baseMs * Math.pow(2, failures - 1), capMs);
    this.failureBackoff.set(variantId, { failures, nextAttemptAt: Date.now() + delayMs });
  }

  private static isVariantInBackoff(variantId: string): boolean {
    const entry = this.failureBackoff.get(variantId);
    return !!entry && entry.nextAttemptAt > Date.now();
  }

  public static clearFailureBackoff(): void {
    this.failureBackoff.clear();
  }

  /**
   * Syncs real analytics for all published posts of a brand.
   * Supports incremental syncing, rate limit cooldown, concurrency protection, and transient retry.
   */
  public static async syncBrandAnalytics(
    brandId: string,
    options: {
      postId?: string;
      postVariantId?: string;
      force?: boolean;
      cooldownMinutes?: number;
    } = {}
  ): Promise<SyncResult & { skipped?: boolean; message?: string }> {
    const result: SyncResult & { skipped?: boolean; message?: string } = {
      totalPublished: 0,
      syncedCount: 0,
      failedCount: 0,
      errors: [],
      reauthRequired: false,
      syncedAt: new Date().toISOString(),
    };

    // 1. Concurrency Protection: Prevent multiple concurrent sync runs for same brand
    if (this.activeSyncLocks.has(brandId)) {
      return {
        ...result,
        skipped: true,
        message: 'A synchronization job is already running for this brand.',
      };
    }

    this.activeSyncLocks.add(brandId);

    try {
      let authInfo: {
        token: string;
        pageId: string | null;
        instagramAccountId: string | null;
        connectionId: string;
      };

      try {
        authInfo = await this.getBrandAccessToken(brandId);
      } catch (err: any) {
        console.error(`[MetaAnalyticsSync] Could not obtain token for brand ${brandId}: ${err.message}`);
        return {
          ...result,
          errors: [{ postId: '', variantId: '', platform: 'meta', error: err.message }],
        };
      }

      // Record sync attempt timestamp on connection
      await db('meta_connections')
        .where({ id: authInfo.connectionId })
        .update({ last_attempt: new Date(), updated_at: new Date() })
        .catch(() => {});

      // 2. Query published variants with a remote_post_id
      let query = db('post_variants')
        .join('posts', 'post_variants.post_id', 'posts.id')
        .leftJoin(
          'post_analytics_snapshots',
          'post_variants.id',
          'post_analytics_snapshots.post_variant_id'
        )
        .where('posts.brand_id', brandId)
        .where('post_variants.status', 'published')
        .whereIn('post_variants.platform', ['facebook', 'instagram'])
        .whereNotNull('post_variants.remote_post_id');

      if (options.postId) {
        query = query.andWhere('posts.id', options.postId);
      }
      if (options.postVariantId) {
        query = query.andWhere('post_variants.id', options.postVariantId);
      }

      // 3. Incremental Syncing & Rate-Limit Cooldown:
      // If not forced and not single post, only fetch posts that need syncing
      if (!options.force && !options.postId && !options.postVariantId) {
        const cooldownMins = options.cooldownMinutes ?? 15;
        const cooldownThreshold = new Date(Date.now() - cooldownMins * 60 * 1000)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' ');
        query = query.where((builder) => {
          builder
            .whereNull('post_analytics_snapshots.last_fetched_at')
            .orWhere('post_analytics_snapshots.last_fetched_at', '<=', cooldownThreshold);
        });
      }

      const variants = await query.select(
        'post_variants.id as variant_id',
        'post_variants.post_id',
        'post_variants.platform',
        'post_variants.remote_post_id',
        'post_variants.remote_post_url',
        'posts.title',
        'posts.published_at'
      );

      const isIncremental = !options.force && !options.postId && !options.postVariantId;

      const queue = variants.filter((v: any) => {
        const remoteId = v.remote_post_id;
        if (!remoteId) return false;
        // Strictly require genuine external post ID and non-sandbox URL
        if (!isRealExternalPostId(remoteId) || isSandboxUrl(v.remote_post_url)) {
          if (!MetaClient.hasMock(remoteId)) return false;
        }
        // Scheduled runs respect per-variant failure backoff
        if (isIncremental && this.isVariantInBackoff(v.variant_id)) return false;
        return true;
      });

      result.totalPublished = queue.length;

      for (const v of queue) {
        const remoteId = v.remote_post_id;

        const attemptTime = new Date();
        await db('post_analytics_snapshots')
          .where({ post_variant_id: v.variant_id })
          .update({ last_attempt: attemptTime })
          .catch(() => {});

        try {
          // 4. Fetch metrics with safe transient retry & exponential backoff
          let metrics: PostMetricValues;
          if (v.platform === 'facebook') {
            metrics = await this.retryWithBackoff(() =>
              this.fetchFacebookPostMetrics(remoteId, authInfo.token)
            );
          } else if (v.platform === 'instagram') {
            metrics = await this.retryWithBackoff(() =>
              this.fetchInstagramMediaMetrics(remoteId, authInfo.token)
            );
          } else {
            continue;
          }

          // 5. Atomic Upsert (no duplicate rows, exact numbers preserved)
          await this.persistMetrics(
            brandId,
            v.post_id,
            v.variant_id,
            v.platform,
            remoteId,
            metrics,
            v.published_at
          );

          result.syncedCount++;
          this.failureBackoff.delete(v.variant_id);

          // Gentle rate-limit pacing between API calls (150ms)
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (err: any) {
          result.failedCount++;
          const isPermanent =
            err.code === 100 ||
            (typeof err.message === 'string' && err.message.includes('does not exist'));
          this.recordVariantFailure(v.variant_id, isPermanent);
          result.errors.push({
            postId: v.post_id,
            variantId: v.variant_id,
            platform: v.platform,
            error: err.message,
          });

          // Preserve previous metrics snapshot; record last_error & last_attempt
          await db('post_analytics_snapshots')
            .where({ post_variant_id: v.variant_id })
            .update({
              last_attempt: attemptTime,
              last_error: err.message,
              updated_at: new Date(),
            })
            .catch(() => {});

          // Check if OAuth token expired / revoked
          const isAuthError =
            err.statusCode === 401 ||
            err.code === 190 ||
            (typeof err.message === 'string' &&
              (err.message.includes('Error validating access token') ||
                err.message.includes('Session has expired') ||
                err.message.includes('OAuthException')));

          if (isAuthError) {
            result.reauthRequired = true;
            await this.markReauthRequired(authInfo.connectionId, err.message);
            // Immediately stop further requests — never retry revoked token indefinitely!
            break;
          }
        }
      }

      // Record summary metadata on connection
      const syncEndTime = new Date();
      const connUpdate: any = {
        last_attempt: syncEndTime,
        updated_at: syncEndTime,
      };

      if (result.syncedCount > 0) {
        connUpdate.last_successful_sync = syncEndTime;
        connUpdate.last_error = null;
      } else if (result.failedCount > 0 && result.syncedCount === 0) {
        connUpdate.last_error = result.errors[0]?.error || 'Sync failed';
      }

      await db('meta_connections')
        .where({ id: authInfo.connectionId })
        .update(connUpdate)
        .catch(() => {});

      return result;
    } finally {
      this.activeSyncLocks.delete(brandId);
    }
  }
}
