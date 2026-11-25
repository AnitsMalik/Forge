import crypto from 'crypto';
import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';
import { BaseSocialAdapter, type AdapterCredentials } from './socialPlatformAdapter.js';

export class MockSandboxAdapter extends BaseSocialAdapter {
  readonly platformId: SocialPlatform = 'mock_sandbox';
  readonly platformName: string = 'Mock Sandbox Simulator';
  readonly maxCharacters: number = 3000;
  readonly supportsImages: boolean = true;
  readonly supportsVideos: boolean = true;

  /**
   * Platform-specific character limits for realistic emulation.
   */
  private static readonly PLATFORM_LIMITS: Record<string, number> = {
    x_twitter: 280,
    twitter: 280,
    instagram: 2200,
    linkedin: 3000,
    tiktok: 2200,
    facebook: 5000,
    youtube_shorts: 500,
    mock_sandbox: 3000,
  };

  public override validateContent(content: string, mediaUrls: string[] = [], targetPlatform?: string): { valid: boolean; errors: string[] } {
    const limit = MockSandboxAdapter.PLATFORM_LIMITS[targetPlatform || 'mock_sandbox'] || 3000;
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Post content cannot be empty.');
    }

    if (content.length > limit) {
      errors.push(`Content exceeds ${targetPlatform || 'platform'} limit of ${limit} characters (current: ${content.length}).`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public async publish(payload: PublishPayload, credentials?: AdapterCredentials): Promise<PublishResult> {
    // 1. Validate content
    const validation = this.validateContent(payload.content, payload.mediaUrls, payload.platform);
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

    // 2. Emulate realistic network latency (150ms - 350ms)
    await new Promise((resolve) => setTimeout(resolve, Math.floor(150 + Math.random() * 200)));

    // 3. Generate platform-tailored remote identifier and URL with explicit sandbox domain
    const remoteId = `sb_${crypto.randomUUID().slice(0, 12)}`;
    let remotePostUrl = `https://sandbox.socialforge.local/${payload.platform}/p/${remoteId}`;

    switch (payload.platform as string) {
      case 'instagram':
        remotePostUrl = `https://sandbox.socialforge.local/instagram/p/${remoteId}`;
        break;
      case 'x_twitter':
        remotePostUrl = `https://sandbox.socialforge.local/x/status/${remoteId}`;
        break;
      case 'linkedin':
        remotePostUrl = `https://sandbox.socialforge.local/linkedin/feed/update/${remoteId}`;
        break;
      case 'tiktok':
        remotePostUrl = `https://sandbox.socialforge.local/tiktok/@brand/video/${remoteId}`;
        break;
      case 'facebook':
        remotePostUrl = `https://sandbox.socialforge.local/facebook/posts/${remoteId}`;
        break;
      case 'youtube_shorts':
        remotePostUrl = `https://sandbox.socialforge.local/youtube/shorts/${remoteId}`;
        break;
      case 'threads':
        remotePostUrl = `https://sandbox.socialforge.local/threads/@brand/post/${remoteId}`;
        break;
      case 'pinterest':
        remotePostUrl = `https://sandbox.socialforge.local/pinterest/pin/${remoteId}`;
        break;
    }

    return {
      success: true,
      remotePostId: remoteId,
      remotePostUrl,
      publishedAt: new Date(),
      httpStatus: 200,
      platform: payload.platform,
      rawResponse: {
        status: 'sandbox',
        mode: 'sandbox',
        simulated: true,
        isSandbox: true,
        accountName: credentials?.accountName || 'SocialForge Sandbox Account',
        publishedTimestamp: Date.now(),
        mediaCount: payload.mediaUrls?.length || 0,
      },
      errorMessage: null,
    };
  }

  public async fetchMetrics(remotePostId: string, _credentials?: AdapterCredentials): Promise<MetricSnapshot> {
    // Generate organic simulated metric curves
    const impressions = Math.floor(1500 + Math.random() * 4500);
    const reach = Math.floor(impressions * (0.78 + Math.random() * 0.16));
    const likes = Math.floor(reach * (0.04 + Math.random() * 0.05));
    const comments = Math.floor(likes * (0.12 + Math.random() * 0.18));
    const shares = Math.floor(likes * (0.08 + Math.random() * 0.14));
    const clicks = Math.floor(reach * (0.025 + Math.random() * 0.04));
    const videoViews = Math.floor(impressions * (0.65 + Math.random() * 0.25));

    const totalEngagements = likes + comments + shares + clicks;
    const engagementRate = impressions > 0 ? Number(((totalEngagements / impressions) * 100).toFixed(2)) : 5.0;

    return {
      impressions,
      reach,
      likes,
      comments,
      shares,
      clicks,
      videoViews,
      engagementRate,
    };
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return {
      accessToken: `mock_sb_refreshed_${crypto.randomBytes(16).toString('hex')}`,
      expiresIn: 5184000, // 60 days
    };
  }
}
