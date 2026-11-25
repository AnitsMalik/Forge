import { MetaIntegrationError } from './errors.js';

export interface MediaValidationResult {
  valid: boolean;
  resolvedUrl: string;
  mediaType: 'image' | 'video';
  mimeType?: string;
  fileSizeBytes?: number;
  warnings?: string[];
}

export class MetaMediaService {
  /**
   * Resolves a media URL to a publicly accessible HTTPS URL.
   * If given a relative path like `/uploads/xyz.png`, prepends the public host.
   */
  public resolvePublicUrl(mediaUrl: string): string {
    if (!mediaUrl) return '';

    // Handle relative uploads URLs
    if (mediaUrl.startsWith('/uploads/')) {
      const publicBase =
        process.env.PUBLIC_URL ||
        process.env.API_BASE_URL ||
        'http://localhost:4000';
      return `${publicBase.replace(/\/api\/v1$/, '')}${mediaUrl}`;
    }

    return mediaUrl;
  }

  /**
   * Validates media requirements for Meta Graph API publishing (Facebook & Instagram).
   */
  public validateMedia(
    rawUrl: string,
    platform: 'facebook' | 'instagram',
    declaredType?: 'image' | 'video'
  ): MediaValidationResult {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new MetaIntegrationError({
        code: 'META_MEDIA_INVALID',
        userMessage: 'Media URL is missing or invalid.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    const resolvedUrl = this.resolvePublicUrl(rawUrl);

    // Meta requires publicly accessible URLs
    if (resolvedUrl.startsWith('data:')) {
      throw new MetaIntegrationError({
        code: 'META_MEDIA_INVALID',
        userMessage: 'Meta Graph API requires a publicly accessible HTTPS media URL, not a base64 data URI. Please upload the media asset to storage first.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    // Determine type from extension or declaration
    const lower = resolvedUrl.toLowerCase();
    const isVideo =
      declaredType === 'video' ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.m4v') ||
      lower.includes('video');

    const isImage =
      declaredType === 'image' ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      lower.includes('photo') ||
      lower.includes('images.unsplash.com');

    // Reject unsupported formats (executables, documents, archives)
    const isUnsupported =
      lower.endsWith('.exe') ||
      lower.endsWith('.pdf') ||
      lower.endsWith('.zip') ||
      lower.endsWith('.tar') ||
      lower.endsWith('.sh') ||
      lower.endsWith('.bat') ||
      (!isVideo && !isImage);

    if (isUnsupported) {
      throw new MetaIntegrationError({
        code: 'META_MEDIA_INVALID',
        userMessage: 'Unsupported media format. Meta Graph API only supports JPG, PNG, WEBP images and MP4, MOV videos.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const warnings: string[] = [];

    // Protocol check: In production, Meta strictly requires HTTPS
    if (resolvedUrl.startsWith('http://') && !resolvedUrl.includes('localhost')) {
      warnings.push('Meta requires HTTPS for public media fetching in live production.');
    }

    // Instagram-specific validations
    if (platform === 'instagram') {
      if (mediaType === 'video') {
        warnings.push('For Instagram Reels, recommended aspect ratio is 9:16 (1080x1920) with H.264 video codec and AAC audio.');
      } else {
        warnings.push('For Instagram Feed posts, supported aspect ratios range between 4:5 (vertical) and 1.91:1 (horizontal).');
      }
    }

    return {
      valid: true,
      resolvedUrl,
      mediaType,
      warnings,
    };
  }

  /**
   * Validates media dimensions and aspect ratio according to Meta publishing specifications.
   */
  public validateAspectRatio(
    width: number,
    height: number,
    platform: 'facebook' | 'instagram'
  ): { valid: boolean; ratio: number } {
    if (!width || !height || height <= 0) {
      throw new MetaIntegrationError({
        code: 'META_MEDIA_INVALID',
        userMessage: 'Invalid media dimensions specified.',
        httpStatus: 400,
        isTransient: false,
      });
    }

    const ratio = width / height;

    if (platform === 'instagram') {
      // Instagram requires aspect ratio between 4:5 (0.8) and 1.91:1 (1.91)
      if (ratio < 0.79 || ratio > 1.92) {
        throw new MetaIntegrationError({
          code: 'META_MEDIA_INVALID',
          userMessage: `Invalid aspect ratio (${ratio.toFixed(2)}:1). Instagram requires aspect ratios between 4:5 (0.80) and 1.91:1.`,
          httpStatus: 400,
          isTransient: false,
        });
      }
    }

    return { valid: true, ratio };
  }
}

export const metaMediaService = new MetaMediaService();
