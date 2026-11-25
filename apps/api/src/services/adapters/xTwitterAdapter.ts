import type {
  SocialPlatform,
  PublishPayload,
  PublishResult,
  MetricSnapshot,
} from '@socialforge/shared';
import { BaseSocialAdapter, type AdapterCredentials } from './socialPlatformAdapter.js';
import { MockSandboxAdapter } from './mockSandboxAdapter.js';

export class XTwitterAdapter extends BaseSocialAdapter {
  readonly platformId: SocialPlatform = 'x_twitter';
  readonly platformName: string = 'X (Twitter) API v2';
  readonly maxCharacters: number = 280;
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

    // Live X / Twitter API v2 execution with Media Upload Pipeline
    try {
      const mediaUrls = payload.mediaUrls || [];
      const mediaIds: string[] = [];

      // If media attachments are present, upload via Twitter media/upload endpoint
      if (mediaUrls.length > 0) {
        for (const mediaUrl of mediaUrls) {
          try {
            let buffer: ArrayBuffer | null = null;
            if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
              const fetchRes = await fetch(mediaUrl);
              if (fetchRes.ok) {
                buffer = await fetchRes.arrayBuffer();
              }
            }

            if (buffer) {
              const base64Data = Buffer.from(buffer).toString('base64');
              const uploadRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${credentials.accessToken}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  media_data: base64Data,
                }),
              });

              if (uploadRes.ok) {
                const uploadJson: any = await uploadRes.json();
                if (uploadJson.media_id_string) {
                  mediaIds.push(uploadJson.media_id_string);
                }
              } else {
                console.warn('Twitter media upload failed:', uploadRes.status);
              }
            }
          } catch (mErr: any) {
            console.warn('Error uploading media to Twitter:', mErr.message);
          }
        }
      }

      const tweetPayload: any = {
        text: payload.content,
      };

      if (mediaIds.length > 0) {
        tweetPayload.media = {
          media_ids: mediaIds,
        };
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetPayload),
      });

      const data: any = await response.json();
      if (!response.ok || data.errors || !data.data?.id) {
        const msg = data.errors?.[0]?.message || data.detail || `Twitter API v2 error (HTTP ${response.status})`;
        throw new Error(msg);
      }

      const tweetId = data.data.id;
      const remotePostUrl = `https://x.com/i/status/${tweetId}`;

      return {
        success: true,
        remotePostId: tweetId,
        remotePostUrl,
        publishedAt: new Date(),
        httpStatus: response.status,
        platform: payload.platform,
        rawResponse: data,
        errorMessage: null,
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
    return this.sandbox.fetchMetrics(remotePostId, credentials);
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    return this.sandbox.refreshToken(refreshToken);
  }
}
