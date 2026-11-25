import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';
import { BaseSocialAdapter, type AdapterCredentials } from './socialPlatformAdapter.js';
import { MockSandboxAdapter } from './mockSandboxAdapter.js';

export class TikTokAdapter extends BaseSocialAdapter {
  readonly platformId: SocialPlatform = 'tiktok';
  readonly platformName: string = 'TikTok Content Posting API';
  readonly maxCharacters: number = 2200;
  readonly supportsImages: boolean = false;
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
      const sandboxResult = await this.sandbox.publish(payload, credentials);
      const videoId = `${Math.floor(7000000000000000000 + Math.random() * 900000000000000000)}`;
      const remotePostUrl = `https://tiktok.com/@${credentials?.accountName || 'brand'}/video/${videoId}`;
      return {
        ...sandboxResult,
        remotePostId: videoId,
        remotePostUrl,
      };
    }

    // Live TikTok API execution guard
    // Real TikTok Content Posting API requires certified TikTok for Developers Partner App
    return {
      success: false,
      remotePostId: '',
      remotePostUrl: '',
      publishedAt: new Date(),
      httpStatus: 501,
      platform: payload.platform,
      rawResponse: {
        error: 'TikTok Direct Video Publishing requires TikTok for Developers Enterprise Partner approval. Live publishing is restricted to Sandbox Preview mode.',
        isSandboxRequired: true,
      },
      errorMessage: 'TikTok Direct Video Publishing requires TikTok for Developers Enterprise Partner approval. Live publishing is restricted to Sandbox Preview mode.',
    };
  }

  public async fetchMetrics(remotePostId: string, credentials?: AdapterCredentials): Promise<MetricSnapshot> {
    return this.sandbox.fetchMetrics(remotePostId, credentials);
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return this.sandbox.refreshToken(refreshToken);
  }
}
