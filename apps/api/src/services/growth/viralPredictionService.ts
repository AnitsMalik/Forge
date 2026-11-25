import crypto from 'node:crypto';
import { db } from '../../db/connection.js';

export interface ViralPredictionInput {
  brandId: string;
  postVariantId?: string;
  platform: string;
  content: string;
  mediaUrls?: string[];
}

export interface ViralPredictionResult {
  id: string;
  overallScore: number; // 0.00 to 100.00
  tier: 'low' | 'moderate' | 'high' | 'breakout';
  hookScore: number;
  readabilityScore: number;
  mediaSynergyScore: number;
  hashtagScore: number;
  velocityMultiplier: number;
  recommendations: string[];
}

export class ViralPredictionService {
  private static instance: ViralPredictionService;

  public static getInstance(): ViralPredictionService {
    if (!ViralPredictionService.instance) {
      ViralPredictionService.instance = new ViralPredictionService();
    }
    return ViralPredictionService.instance;
  }

  /**
   * Evaluates opening hook strength based on curiosity gap, urgency, and emotional density.
   */
  public evaluateHook(firstLine: string): number {
    if (!firstLine || firstLine.trim().length === 0) return 10.0;

    let score = 50.0;
    const text = firstLine.toLowerCase();

    // 1. Curiosity Gap / Pattern Interrupt triggers
    const curiosityKeywords = [
      'stop scrolling', 'secret', 'nobody talks about', 'truth about', 'mistake',
      'this changes', 'how to', 'why you', 'tested', 'what happened', 'revealed', 'insane'
    ];
    if (curiosityKeywords.some((kw) => text.includes(kw))) {
      score += 20.0;
    }

    // 2. Numbers / Listicle hooks ("3 ways", "5 steps")
    if (/\b\d+\s+(ways|steps|hacks|reasons|tools|lessons|secrets|rules)\b/i.test(text)) {
      score += 15.0;
    }

    // 3. Question hook
    if (text.includes('?')) {
      score += 10.0;
    }

    // 4. Emoji punctuation / visual stopping power
    if (/[\u{1F300}-\u{1FAFF}]/u.test(firstLine)) {
      score += 5.0;
    }

    // 5. Length discipline: opening hooks between 25 and 90 chars perform best
    const len = firstLine.trim().length;
    if (len >= 25 && len <= 90) {
      score += 10.0;
    } else if (len > 140) {
      score -= 10.0; // too wordy for an immediate hook
    }

    return Math.min(100.0, Math.max(0.0, parseFloat(score.toFixed(2))));
  }

  /**
   * Evaluates readability, paragraph breaks, and visual scannability.
   */
  public evaluateReadability(content: string): number {
    if (!content || content.trim().length === 0) return 0.0;

    let score = 50.0;
    const lines = content.split('\n');

    // Good whitespace usage (at least 2 line breaks for mobile reading)
    if (lines.length >= 3) {
      score += 15.0;
    }

    // Bullet points / numbered lists
    if (/^[•\-\*]\s+/m.test(content) || /^\d+\.\s+/m.test(content)) {
      score += 15.0;
    }

    // Call-to-action detection at the end
    const lastParagraph = lines[lines.length - 1]?.toLowerCase() || '';
    if (
      lastParagraph.includes('comment') ||
      lastParagraph.includes('share') ||
      lastParagraph.includes('save') ||
      lastParagraph.includes('link') ||
      lastParagraph.includes('drop a') ||
      lastParagraph.includes('tap')
    ) {
      score += 15.0;
    }

    // Avoid massive unspaced walls of text (> 350 chars with no line break)
    const hasWallOfText = lines.some((l) => l.length > 350);
    if (hasWallOfText) {
      score -= 20.0;
    }

    return Math.min(100.0, Math.max(0.0, parseFloat(score.toFixed(2))));
  }

  /**
   * Evaluates media format synergy and algorithmic multipliers.
   */
  public evaluateMediaSynergy(mediaUrls: string[] = [], platform: string): number {
    const isShortsOrReels = platform === 'tiktok' || platform === 'youtube_shorts' || platform === 'instagram';

    if (!mediaUrls || mediaUrls.length === 0) {
      // Text-only posts have low viral potential on short-form platforms, moderate on LinkedIn/X
      return platform === 'x_twitter' || platform === 'linkedin' ? 65.0 : 35.0;
    }

    const hasVideo = mediaUrls.some((u) => u.endsWith('.mp4') || u.includes('/video/'));
    const isMultiAsset = mediaUrls.length > 1;

    if (hasVideo) {
      return isShortsOrReels ? 96.0 : 88.0;
    }

    if (isMultiAsset) {
      // Carousel post
      return 85.0;
    }

    // Single static image
    return 72.0;
  }

  /**
   * Evaluates hashtag count and algorithmic distribution suitability.
   */
  public evaluateHashtags(content: string, platform: string): number {
    const tags = content.match(/#[a-zA-Z0-9_]+/g) || [];
    const count = tags.length;

    let score = 60.0;

    switch (platform) {
      case 'instagram':
      case 'tiktok':
        if (count >= 3 && count <= 6) score = 95.0;
        else if (count === 0) score = 50.0;
        else if (count > 15) score = 40.0; // spam penalty
        else score = 75.0;
        break;
      case 'youtube_shorts':
        if (content.includes('#Shorts')) score = 95.0;
        else score = 65.0;
        break;
      case 'linkedin':
        if (count >= 2 && count <= 4) score = 90.0;
        else if (count > 6) score = 55.0;
        else score = 70.0;
        break;
      case 'x_twitter':
        if (count >= 1 && count <= 2) score = 90.0;
        else if (count > 3) score = 50.0;
        else score = 70.0;
        break;
      default:
        score = count > 0 ? 80.0 : 60.0;
    }

    return Math.min(100.0, Math.max(0.0, parseFloat(score.toFixed(2))));
  }

  /**
   * Predicts viral breakout probability and returns actionable recommendations.
   */
  public async predict(input: ViralPredictionInput): Promise<ViralPredictionResult> {
    const lines = input.content.split('\n');
    const firstLine = lines.find((l) => l.trim().length > 0) || '';

    const hookScore = this.evaluateHook(firstLine);
    const readabilityScore = this.evaluateReadability(input.content);
    const mediaSynergyScore = this.evaluateMediaSynergy(input.mediaUrls || [], input.platform);
    const hashtagScore = this.evaluateHashtags(input.content, input.platform);

    // Weighted composite calculation
    const weighted =
      hookScore * 0.35 +
      mediaSynergyScore * 0.30 +
      readabilityScore * 0.20 +
      hashtagScore * 0.15;

    const overallScore = parseFloat(weighted.toFixed(2));

    // Determine algorithmic tier and velocity multiplier
    let tier: 'low' | 'moderate' | 'high' | 'breakout';
    let velocityMultiplier = 1.0;

    if (overallScore >= 85.0) {
      tier = 'breakout';
      velocityMultiplier = 3.2;
    } else if (overallScore >= 70.0) {
      tier = 'high';
      velocityMultiplier = 2.1;
    } else if (overallScore >= 50.0) {
      tier = 'moderate';
      velocityMultiplier = 1.4;
    } else {
      tier = 'low';
      velocityMultiplier = 0.8;
    }

    // Generate actionable recommendations
    const recommendations: string[] = [];
    if (hookScore < 70) {
      recommendations.push('Strengthen the opening hook: Use a curiosity gap, quantifiable metric, or pattern-interrupt.');
    }
    if (readabilityScore < 70) {
      recommendations.push('Add spacing and bullet points: Scannable vertical copy improves completion and watch times.');
    }
    if (mediaSynergyScore < 75 && (input.platform === 'tiktok' || input.platform === 'youtube_shorts')) {
      recommendations.push('Attach a 9:16 vertical video asset to unlock full short-form algorithmic discovery.');
    }
    if (hashtagScore < 70) {
      if (input.platform === 'youtube_shorts') {
        recommendations.push('Include the #Shorts hashtag to guarantee inclusion in the YouTube Shorts feed.');
      } else {
        recommendations.push('Optimize hashtag density to 3-5 high-relevance niche hashtags.');
      }
    }
    if (recommendations.length === 0) {
      recommendations.push('High-probability viral formulation: Content and media are tuned for maximum distribution.');
    }

    const predictionId = crypto.randomUUID();

    // Persist in viral_score_predictions if postVariantId provided
    if (input.postVariantId) {
      await db('viral_score_predictions').insert({
        id: predictionId,
        brand_id: input.brandId,
        post_variant_id: input.postVariantId,
        overall_score: overallScore,
        tier,
        hook_score: hookScore,
        readability_score: readabilityScore,
        media_synergy_score: mediaSynergyScore,
        hashtag_score: hashtagScore,
        velocity_multiplier: velocityMultiplier,
        recommendations: JSON.stringify(recommendations),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return {
      id: predictionId,
      overallScore,
      tier,
      hookScore,
      readabilityScore,
      mediaSynergyScore,
      hashtagScore,
      velocityMultiplier,
      recommendations,
    };
  }
}

export const viralPredictionService = ViralPredictionService.getInstance();
