import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';
import { BaseSocialAdapter, type AdapterCredentials } from './socialPlatformAdapter.js';
import { MockSandboxAdapter } from './mockSandboxAdapter.js';

export class ThreadsAdapter extends BaseSocialAdapter {
  readonly platformId: SocialPlatform = 'threads' as SocialPlatform;
  readonly platformName: string = 'Threads API (Meta)';
  readonly maxCharacters: number = 500;
  readonly supportsImages: boolean = true;
  readonly supportsVideos: boolean = true;

  private sandbox = new MockSandboxAdapter();

  public async publish(payload: PublishPayload, credentials?: AdapterCredentials): Promise<PublishResult> {
    const validation = this.validateContent(payload.content, payload.mediaUrls);
    if (!validation.valid) {
      return {
        success: false,
        remotePostId: '',
        remotePostUrl: '',
        publishedAt: new Date(),
        httpStatus: 400,
        platform: payload.platform,
        rawResponse: { errors: validation.errors },
        errorMessage: validation.errors.join('; '),
      };
    }

    if (!credentials?.accessToken || credentials.isSandbox) {
      return this.sandbox.publish(payload, credentials);
    }

    try {
      const threadsUserId = credentials.accountId || 'me';
      const mediaUrls = payload.mediaUrls || [];

      // Step 1: Create Threads Media Container
      const containerParams = new URLSearchParams();
      containerParams.append('access_token', credentials.accessToken);
      containerParams.append('text', payload.content);

      if (mediaUrls.length > 0) {
        const firstMedia = mediaUrls[0];
        const isVideo = /\.(mp4|mov|webm)$/i.test(firstMedia);
        if (isVideo) {
          containerParams.append('media_type', 'VIDEO');
          containerParams.append('video_url', firstMedia);
        } else {
          containerParams.append('media_type', 'IMAGE');
          containerParams.append('image_url', firstMedia);
        }
      } else {
        containerParams.append('media_type', 'TEXT');
      }

      const containerUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads`;
      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerParams.toString(),
      });

      const containerData: any = await containerRes.json();

      if (!containerRes.ok || !containerData?.id) {
        return {
          success: false,
          remotePostId: '',
          remotePostUrl: '',
          publishedAt: new Date(),
          httpStatus: containerRes.status,
          platform: payload.platform,
          rawResponse: containerData,
          errorMessage: containerData?.error?.message || 'Failed to create Threads container',
        };
      }

      const creationId = containerData.id;

      // Optional short wait for video container processing if video
      if (mediaUrls.length > 0 && /\.(mp4|mov|webm)$/i.test(mediaUrls[0])) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Step 2: Publish Threads Media Container
      const publishParams = new URLSearchParams();
      publishParams.append('access_token', credentials.accessToken);
      publishParams.append('creation_id', creationId);

      const publishUrl = `https://graph.threads.net/v1.0/${threadsUserId}/threads_publish`;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams.toString(),
      });

      const publishData: any = await publishRes.json();

      if (!publishRes.ok || !publishData?.id) {
        return {
          success: false,
          remotePostId: '',
          remotePostUrl: '',
          publishedAt: new Date(),
          httpStatus: publishRes.status,
          platform: payload.platform,
          rawResponse: publishData,
          errorMessage: publishData?.error?.message || 'Failed to publish Threads container',
        };
      }

      const threadId = publishData.id;
      const accountName = credentials.accountName || 'threads_user';
      const remotePostUrl = `https://www.threads.net/@${accountName.replace(/^@/, '')}/post/${threadId}`;

      return {
        success: true,
        remotePostId: threadId,
        remotePostUrl,
        publishedAt: new Date(),
        httpStatus: 200,
        platform: payload.platform,
        rawResponse: publishData,
      };
    } catch (err: any) {
      return {
        success: false,
        remotePostId: '',
        remotePostUrl: '',
        publishedAt: new Date(),
        httpStatus: 500,
        platform: payload.platform,
        rawResponse: { error: err.message },
        errorMessage: err.message,
      };
    }
  }

  public async fetchMetrics(remotePostId: string, credentials?: AdapterCredentials): Promise<MetricSnapshot> {
    if (!credentials?.accessToken || credentials.isSandbox) {
      return this.sandbox.fetchMetrics(remotePostId, credentials);
    }

    try {
      const url = `https://graph.threads.net/v1.0/${remotePostId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${credentials.accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        return this.sandbox.fetchMetrics(remotePostId, credentials);
      }
      const data: any = await res.json();
      const metricsMap: Record<string, number> = {};
      if (Array.isArray(data?.data)) {
        for (const item of data.data) {
          metricsMap[item.name] = item.values?.[0]?.value || 0;
        }
      }

      const totalEngagements = (metricsMap.likes || 0) + (metricsMap.replies || 0) + (metricsMap.reposts || 0);
      const views = metricsMap.views || 0;
      const engagementRate = views > 0 ? Number(((totalEngagements / views) * 100).toFixed(2)) : 0;

      return {
        impressions: views,
        reach: views,
        likes: metricsMap.likes || 0,
        comments: metricsMap.replies || 0,
        shares: metricsMap.reposts || 0,
        clicks: 0,
        videoViews: views,
        engagementRate,
      };
    } catch {
      return this.sandbox.fetchMetrics(remotePostId, credentials);
    }
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return {
      accessToken: refreshToken,
      expiresIn: 5184000, // 60 days standard Meta long-lived token
    };
  }
}
