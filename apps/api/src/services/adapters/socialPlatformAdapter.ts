import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';

export interface AdapterCredentials {
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  accountName?: string;
  isSandbox?: boolean;
}

export abstract class BaseSocialAdapter {
  abstract readonly platformId: SocialPlatform;
  abstract readonly platformName: string;
  abstract readonly maxCharacters: number;
  abstract readonly supportsImages: boolean;
  abstract readonly supportsVideos: boolean;

  /**
   * Validates content length, media asset requirements, and platform-specific constraints.
   */
  public validateContent(content: string, mediaUrls: string[] = []): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Content cannot be empty');
    }

    if (content.length > this.maxCharacters) {
      errors.push(
        `Content exceeds ${this.platformName} limit of ${this.maxCharacters} characters (currently ${content.length})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Publishes content to the target social network or sandbox emulator.
   */
  abstract publish(payload: PublishPayload, credentials?: AdapterCredentials): Promise<PublishResult>;

  /**
   * Fetches latest engagement telemetry for a published post.
   */
  abstract fetchMetrics(remotePostId: string, credentials?: AdapterCredentials): Promise<MetricSnapshot>;

  /**
   * Refreshes an expiring OAuth access token using a refresh token.
   */
  abstract refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }>;
}
