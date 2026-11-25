import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';
import { BaseSocialAdapter, type AdapterCredentials } from './socialPlatformAdapter.js';
import { MockSandboxAdapter } from './mockSandboxAdapter.js';

export class PinterestAdapter extends BaseSocialAdapter {
  readonly platformId: SocialPlatform = 'pinterest' as SocialPlatform;
  readonly platformName: string = 'Pinterest API v5';
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
      const mediaUrls = payload.mediaUrls || [];
      const imageUrl = mediaUrls[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
      const boardId = credentials.accountId || 'default_board';

      // Pinterest v5 Create Pin
      const pinBody = {
        title: (payload.content || '').slice(0, 100),
        description: payload.content,
        board_id: boardId,
        media_source: {
          source_type: 'image_url',
          url: imageUrl,
        },
      };

      const res = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pinBody),
      });

      const pinData: any = await res.json();

      if (!res.ok || !pinData?.id) {
        return {
          success: false,
          remotePostId: '',
          remotePostUrl: '',
          publishedAt: new Date(),
          httpStatus: res.status,
          platform: payload.platform,
          rawResponse: pinData,
          errorMessage: pinData?.message || 'Failed to create Pinterest Pin',
        };
      }

      const pinId = pinData.id;
      const remotePostUrl = `https://www.pinterest.com/pin/${pinId}/`;

      return {
        success: true,
        remotePostId: pinId,
        remotePostUrl,
        publishedAt: new Date(),
        httpStatus: 201,
        platform: payload.platform,
        rawResponse: pinData,
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
      const url = `https://api.pinterest.com/v5/pins/${remotePostId}/analytics?metric_types=IMPRESSION,OUTBOUND_CLICK,PIN_CLICK,SAVE`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!res.ok) {
        return this.sandbox.fetchMetrics(remotePostId, credentials);
      }

      const data: any = await res.json();
      const impressions = data?.all?.summary_metrics?.IMPRESSION || 0;
      const clicks = data?.all?.summary_metrics?.PIN_CLICK || 0;
      const saves = data?.all?.summary_metrics?.SAVE || 0;
      const totalEngagements = clicks + saves;
      const engagementRate = impressions > 0 ? Number(((totalEngagements / impressions) * 100).toFixed(2)) : 0;

      return {
        impressions,
        reach: impressions,
        likes: saves,
        comments: 0,
        shares: saves,
        clicks,
        videoViews: 0,
        engagementRate,
      };
    } catch {
      return this.sandbox.fetchMetrics(remotePostId, credentials);
    }
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return {
      accessToken: refreshToken,
      expiresIn: 2592000, // 30 days
    };
  }
}
