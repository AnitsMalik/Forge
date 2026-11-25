export type TargetPlatform =
  | 'instagram_square'
  | 'instagram_portrait'
  | 'tiktok_reel'
  | 'linkedin_feed'
  | 'facebook_feed'
  | 'x_twitter';

export interface PlatformSpec {
  platform: TargetPlatform;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9' | '1.91:1';
  dimensions: { width: number; height: number };
  maxCharacters: number;
  safeZoneMarginPercent: number;
}

export const PLATFORM_SPECS: Record<TargetPlatform, PlatformSpec> = {
  instagram_square: {
    platform: 'instagram_square',
    aspectRatio: '1:1',
    dimensions: { width: 1080, height: 1080 },
    maxCharacters: 2200,
    safeZoneMarginPercent: 5,
  },
  instagram_portrait: {
    platform: 'instagram_portrait',
    aspectRatio: '4:5',
    dimensions: { width: 1080, height: 1350 },
    maxCharacters: 2200,
    safeZoneMarginPercent: 6,
  },
  tiktok_reel: {
    platform: 'tiktok_reel',
    aspectRatio: '9:16',
    dimensions: { width: 1080, height: 1920 },
    maxCharacters: 4000,
    safeZoneMarginPercent: 12, // Extra bottom margin for TikTok UI icons
  },
  linkedin_feed: {
    platform: 'linkedin_feed',
    aspectRatio: '16:9',
    dimensions: { width: 1200, height: 627 },
    maxCharacters: 3000,
    safeZoneMarginPercent: 5,
  },
  facebook_feed: {
    platform: 'facebook_feed',
    aspectRatio: '1.91:1',
    dimensions: { width: 1200, height: 630 },
    maxCharacters: 63206,
    safeZoneMarginPercent: 5,
  },
  x_twitter: {
    platform: 'x_twitter',
    aspectRatio: '16:9',
    dimensions: { width: 1200, height: 675 },
    maxCharacters: 280,
    safeZoneMarginPercent: 5,
  },
};

export class PlatformVariantService {
  /**
   * Returns specifications for a target platform
   */
  public getVariantSpecs(platform: string): PlatformSpec {
    const key = (platform.toLowerCase().replace(/[^a-z_]/g, '_') as TargetPlatform);
    return PLATFORM_SPECS[key] || PLATFORM_SPECS.instagram_square;
  }

  /**
   * Adapts layer coordinates and font sizing from one aspect ratio to target platform
   */
  public adaptLayersForPlatform(layers: any[], targetPlatform: TargetPlatform): any[] {
    const spec = this.getVariantSpecs(targetPlatform);
    const { safeZoneMarginPercent, dimensions } = spec;

    return layers.map((layer) => {
      const adapted = JSON.parse(JSON.stringify(layer));

      // Calculate vertical and horizontal scaling factors based on aspect ratio
      if (spec.aspectRatio === '9:16') {
        // Vertical story/reel: shift content toward center-safe zone
        if (typeof adapted.y === 'number') {
          // Adjust y to avoid bottom UI elements (reels/tiktok engagement buttons)
          adapted.y = Math.min(Math.max(adapted.y, safeZoneMarginPercent), 100 - safeZoneMarginPercent - 15);
        }
        if (typeof adapted.fontSize === 'number') {
          adapted.fontSize = Math.round(adapted.fontSize * 1.15); // Slightly larger for mobile full-screen
        }
      } else if (spec.aspectRatio === '16:9' || spec.aspectRatio === '1.91:1') {
        // Wide landscape feed: compact vertical margins
        if (typeof adapted.y === 'number') {
          adapted.y = Math.min(Math.max(adapted.y * 0.85, safeZoneMarginPercent), 100 - safeZoneMarginPercent);
        }
        if (typeof adapted.fontSize === 'number') {
          adapted.fontSize = Math.round(adapted.fontSize * 0.9); // Slightly smaller for landscape density
        }
      } else if (spec.aspectRatio === '4:5') {
        // Portrait feed: slight expansion
        if (typeof adapted.fontSize === 'number') {
          adapted.fontSize = Math.round(adapted.fontSize * 1.05);
        }
      }

      // Truncate text if layer text exceeds platform character limits
      if (targetPlatform === 'x_twitter' && typeof adapted.text === 'string' && adapted.text.length > 280) {
        adapted.text = adapted.text.slice(0, 277) + '...';
      }

      return adapted;
    });
  }

  /**
   * Generates a complete platform variant of a template
   */
  public generatePlatformVariant(baseTemplate: any, targetPlatform: TargetPlatform): any {
    const spec = this.getVariantSpecs(targetPlatform);
    const adaptedLayers = this.adaptLayersForPlatform(baseTemplate.layers || [], targetPlatform);

    return {
      platform: spec.platform,
      aspectRatio: spec.aspectRatio,
      dimensions: spec.dimensions,
      maxCharacters: spec.maxCharacters,
      layers: adaptedLayers,
      background: baseTemplate.background,
    };
  }

  /**
   * Generates a multi-platform bundle containing all 4 standard aspect ratios (1:1, 4:5, 9:16, 16:9)
   */
  public generateMultiPlatformBundle(baseTemplate: any): Record<string, any> {
    const platforms: TargetPlatform[] = ['instagram_square', 'instagram_portrait', 'tiktok_reel', 'linkedin_feed'];
    const bundle: Record<string, any> = {};

    for (const p of platforms) {
      bundle[p] = this.generatePlatformVariant(baseTemplate, p);
    }

    return bundle;
  }
}

export const platformVariantService = new PlatformVariantService();
