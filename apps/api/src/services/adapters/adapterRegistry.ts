import type { SocialPlatform } from '@socialforge/shared';
import { BaseSocialAdapter } from './socialPlatformAdapter.js';
import { MockSandboxAdapter } from './mockSandboxAdapter.js';
import { MetaAdapter } from './metaAdapter.js';
import { XTwitterAdapter } from './xTwitterAdapter.js';
import { LinkedInAdapter } from './linkedInAdapter.js';
import { TikTokAdapter } from './tiktokAdapter.js';
import { YouTubeShortsAdapter } from './youtubeShortsAdapter.js';
import { ThreadsAdapter } from './threadsAdapter.js';
import { PinterestAdapter } from './pinterestAdapter.js';

export class SocialAdapterRegistry {
  private static instance: SocialAdapterRegistry;
  private adapters: Map<string, BaseSocialAdapter> = new Map();
  private sandboxFallback: MockSandboxAdapter;

  private constructor() {
    this.sandboxFallback = new MockSandboxAdapter();

    const mockAdapter = new MockSandboxAdapter();
    const metaAdapter = new MetaAdapter();
    const xAdapter = new XTwitterAdapter();
    const linkedInAdapter = new LinkedInAdapter();
    const tiktokAdapter = new TikTokAdapter();
    const youtubeShortsAdapter = new YouTubeShortsAdapter();
    const threadsAdapter = new ThreadsAdapter();
    const pinterestAdapter = new PinterestAdapter();

    this.adapters.set('mock_sandbox', mockAdapter);
    this.adapters.set('instagram', metaAdapter);
    this.adapters.set('facebook', metaAdapter);
    this.adapters.set('x_twitter', xAdapter);
    this.adapters.set('twitter', xAdapter);
    this.adapters.set('linkedin', linkedInAdapter);
    this.adapters.set('tiktok', tiktokAdapter);
    this.adapters.set('youtube_shorts', youtubeShortsAdapter);
    this.adapters.set('youtube', youtubeShortsAdapter);
    this.adapters.set('threads', threadsAdapter);
    this.adapters.set('pinterest', pinterestAdapter);
  }

  public static getInstance(): SocialAdapterRegistry {
    if (!SocialAdapterRegistry.instance) {
      SocialAdapterRegistry.instance = new SocialAdapterRegistry();
    }
    return SocialAdapterRegistry.instance;
  }

  public getAdapter(platform: SocialPlatform | string): BaseSocialAdapter {
    const key = (platform || '').toLowerCase();
    const adapter = this.adapters.get(key);
    if (!adapter) {
      return this.sandboxFallback;
    }
    return adapter;
  }

  public registerAdapter(platform: SocialPlatform | string, adapter: BaseSocialAdapter): void {
    const key = (platform || '').toLowerCase();
    this.adapters.set(key, adapter);
  }

  public getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const socialAdapterRegistry = SocialAdapterRegistry.getInstance();
