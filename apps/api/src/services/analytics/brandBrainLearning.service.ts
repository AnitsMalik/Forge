import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { BrandBrainService } from '../brandBrainService.js';
import type {
  AnalyticsWinner,
  BrandLearningInsight,
  LearnedPromptContext,
  WinningAttributes,
} from '@socialforge/shared';

export class BrandBrainLearningService {
  /**
   * Extracts linguistic, structural, and creative attributes from a post variant.
   */
  public extractWinningAttributes(copyText: string, mediaType?: string): WinningAttributes {
    const text = (copyText || '').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const hookHeadline = lines[0] || '';

    // Classify Hook Style
    let hookStyle = 'direct_statement';
    if (hookHeadline.includes('?') || /^(what|how|why|are|can|is|who)\b/i.test(hookHeadline)) {
      hookStyle = 'curiosity_question';
    } else if (/\b(never|always|stop|secret|warning|mistake|truth)\b/i.test(hookHeadline)) {
      hookStyle = 'bold_claim';
    } else if (/\b(\d+|top\s+\d+|reasons|ways|steps)\b/i.test(hookHeadline)) {
      hookStyle = 'numbered_list';
    } else if (/\b(transform|game-changer|unbelievable|finally)\b/i.test(hookHeadline)) {
      hookStyle = 'high_urgency_value';
    }

    // Extract CTAs
    let ctaText = 'Tap the link in bio';
    const ctaMatches = text.match(/(link in bio|comment below|shop now|order today|click the link|tap below|visit our site|get yours today|save this post)/i);
    if (ctaMatches) {
      ctaText = ctaMatches[0];
    }

    // Extract Emojis
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const emojisUsed = text.match(emojiRegex) || ['✨'];

    // Extract Hashtags
    const hashtagMatches = text.match(/#[a-zA-Z0-9_]+/g) || [];
    const hashtags = Array.from(new Set(hashtagMatches));

    // Determine Tone
    let tone = 'modern_approachable';
    if (text.includes('!') && (text.includes('🚀') || text.includes('🔥') || text.includes('⚡'))) {
      tone = 'high_energy_inspirational';
    } else if (/\b(proven|results|roi|data|analytics|growth)\b/i.test(text)) {
      tone = 'authoritative_data_backed';
    }

    return {
      hookStyle,
      hookHeadline,
      primaryAngle: hookStyle,
      ctaText,
      tone,
      emojisUsed: emojisUsed.slice(0, 5),
      hashtags: hashtags.slice(0, 8),
      visualFormat: mediaType || 'image',
      contentLength: text.length,
    };
  }

  /**
   * Closed-loop learning pipeline: Ingests a detected winner, updates agent memories,
   * updates brand brain preferences, and stores an auditable insight.
   */
  public async learnFromWinner(winner: AnalyticsWinner): Promise<{
    memoriesCreated: number;
    brainUpdated: boolean;
    insightId: string;
  }> {
    const { tenantId, brandId, winnerType, liftMultiplier, metricsSnapshot, winningAttributes } = winner;

    const attributes = winningAttributes || this.extractWinningAttributes(
      (winner as any).caption || (metricsSnapshot as any).caption || ''
    );

    let memoriesCreated = 0;

    // 1. Write to agent_memories: engagement_pattern
    const patternKey = `winning_hook_${attributes.hookStyle || 'general'}`;
    const patternValue = {
      winnerType,
      hookHeadline: attributes.hookHeadline,
      hookStyle: attributes.hookStyle,
      ctaText: attributes.ctaText,
      tone: attributes.tone,
      hashtags: attributes.hashtags,
      liftMultiplier,
      engagementRate: (metricsSnapshot as any).engagementRate || (metricsSnapshot as any).engagement_rate || 0,
      learnedAt: new Date().toISOString(),
    };

    const existingMem = await db('agent_memories')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        key: patternKey,
      })
      .first();

    if (existingMem) {
      await db('agent_memories')
        .where({ id: existingMem.id })
        .update({
          value: JSON.stringify(patternValue),
          confidence: Math.min(1.0, Number(existingMem.confidence || 0.8) + 0.05),
          updated_at: new Date(),
        });
    } else {
      await db('agent_memories').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        memory_type: 'engagement_pattern',
        key: patternKey,
        value: JSON.stringify(patternValue),
        confidence: 0.95,
        created_at: new Date(),
        updated_at: new Date(),
      });
      memoriesCreated++;
    }

    // 2. Write to agent_memories: continuous_learning_guideline
    const guidelineKey = 'continuous_brand_learning_strategy';
    const guidelineValue = {
      latestWinnerId: winner.id,
      recommendedHookStyle: attributes.hookStyle,
      recommendedCTA: attributes.ctaText,
      preferredTone: attributes.tone,
      highPerformingTags: attributes.hashtags,
      liftMultiplier,
      summary: `Outperforming content identified (${liftMultiplier}x lift). Prioritize ${attributes.hookStyle} openers with '${attributes.ctaText}' call-to-action.`,
      updatedAt: new Date().toISOString(),
    };

    const existingGuide = await db('agent_memories')
      .where({
        tenant_id: tenantId,
        brand_id: brandId,
        key: guidelineKey,
      })
      .first();

    if (existingGuide) {
      await db('agent_memories')
        .where({ id: existingGuide.id })
        .update({
          value: JSON.stringify(guidelineValue),
          confidence: 0.98,
          updated_at: new Date(),
        });
    } else {
      await db('agent_memories').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        brand_id: brandId,
        memory_type: 'brand_guidelines',
        key: guidelineKey,
        value: JSON.stringify(guidelineValue),
        confidence: 0.98,
        created_at: new Date(),
        updated_at: new Date(),
      });
      memoriesCreated++;
    }

    // 3. Update brand_brains table preferences
    let brainUpdated = false;
    try {
      const brandBrain = await BrandBrainService.getBrandBrain(brandId);
      if (brandBrain) {
        const currentTags = brandBrain.hashtagPreferences?.defaultTags || [];
        const newTags = attributes.hashtags || [];
        const mergedTags = Array.from(new Set([...currentTags, ...newTags])).slice(0, 10);

        const currentCTAs = brandBrain.ctaPreferences || [];
        const mergedCTAs = attributes.ctaText && !currentCTAs.includes(attributes.ctaText)
          ? [attributes.ctaText, ...currentCTAs].slice(0, 8)
          : currentCTAs;

        await db('brand_brains')
          .where({ brand_id: brandId })
          .update({
            hashtag_preferences: JSON.stringify({
              ...brandBrain.hashtagPreferences,
              defaultTags: mergedTags,
            }),
            cta_preferences: JSON.stringify(mergedCTAs),
            updated_at: new Date(),
          });
        brainUpdated = true;
      }
    } catch (err: any) {
      console.warn(`[BrandBrainLearning] Could not auto-update brand_brains table: ${err.message}`);
    }

    // 4. Create record in brand_learning_insights
    const insightId = crypto.randomUUID();
    const performanceLift = Number((Math.max(0, (liftMultiplier - 1.0) * 100)).toFixed(2));

    await db('brand_learning_insights').insert({
      id: insightId,
      tenant_id: tenantId,
      brand_id: brandId,
      insight_type: 'hook_strategy',
      title: `High Velocity Hook: ${attributes.hookStyle || 'Formula'} (+${performanceLift}% Lift)`,
      summary: `Detected ${winnerType} outperforming baseline by ${liftMultiplier}x. First line hook "${(attributes.hookHeadline || '').slice(0, 80)}" generated peak conversion.`,
      confidence: 0.95,
      sample_size: 1,
      performance_lift: performanceLift,
      recommended_action: `Incorporate '${attributes.hookStyle}' style into upcoming campaign drafts. Use CTA: "${attributes.ctaText}".`,
      metadata: JSON.stringify({
        winnerId: winner.id,
        platform: winner.platform,
        winningAttributes: attributes,
        metrics: winner.metricsSnapshot,
      }),
      applied_to_brand_brain: brainUpdated,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return {
      memoriesCreated,
      brainUpdated,
      insightId,
    };
  }

  /**
   * Retrieves aggregated learning insights for a brand.
   */
  public async getBrandLearningInsights(brandId: string): Promise<{
    insights: BrandLearningInsight[];
    learnedContext: LearnedPromptContext;
  }> {
    const rawInsights = await db('brand_learning_insights')
      .where({ brand_id: brandId })
      .orderBy('created_at', 'desc')
      .limit(20);

    const memories = await db('agent_memories')
      .where({ brand_id: brandId })
      .andWhere((qb) => {
        qb.where('memory_type', 'engagement_pattern').orWhere('memory_type', 'brand_guidelines');
      })
      .orderBy('updated_at', 'desc')
      .limit(10);

    const winningHooks: string[] = [];
    const winningCTAs: string[] = [];
    const hashtags: string[] = [];
    const toneRecommendations: string[] = [];
    const formatInsights: string[] = [];

    for (const mem of memories) {
      let val: any = {};
      try {
        val = typeof mem.value === 'string' ? JSON.parse(mem.value) : mem.value;
      } catch {}

      if (val.hookHeadline) winningHooks.push(val.hookHeadline);
      if (val.ctaText && !winningCTAs.includes(val.ctaText)) winningCTAs.push(val.ctaText);
      if (val.recommendedCTA && !winningCTAs.includes(val.recommendedCTA)) winningCTAs.push(val.recommendedCTA);
      if (val.preferredTone && !toneRecommendations.includes(val.preferredTone)) toneRecommendations.push(val.preferredTone);
      if (Array.isArray(val.hashtags)) {
        for (const t of val.hashtags) {
          if (!hashtags.includes(t)) hashtags.push(t);
        }
      }
      if (val.summary) formatInsights.push(val.summary);
    }

    const learnedContext: LearnedPromptContext = {
      brandId,
      winningHooks: winningHooks.slice(0, 5),
      winningCTAs: winningCTAs.slice(0, 5),
      highPerformingHashtags: hashtags.slice(0, 8),
      toneRecommendations: toneRecommendations.slice(0, 3),
      formatInsights: formatInsights.slice(0, 3),
      summaryGuideline: winningHooks.length > 0
        ? `Lead with curiosity/bold claims modeled on "${winningHooks[0]}". Conclude with verified CTA "${winningCTAs[0] || 'Link in bio'}".`
        : 'Optimize for crisp problem agitation with verified engagement hooks.',
    };

    const insights: BrandLearningInsight[] = rawInsights.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      insightType: r.insight_type,
      title: r.title,
      summary: r.summary,
      confidence: Number(r.confidence || 1.0),
      sampleSize: Number(r.sample_size || 1),
      performanceLift: Number(r.performance_lift || 0),
      recommendedAction: r.recommended_action,
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
      appliedToBrandBrain: Boolean(r.applied_to_brand_brain),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return {
      insights,
      learnedContext,
    };
  }

  /**
   * Generates prompt instructions to bias AI copy generation towards winning patterns.
   */
  public async getLearnedPromptDirectives(brandId: string): Promise<string> {
    const { learnedContext } = await this.getBrandLearningInsights(brandId);
    if (!learnedContext.winningHooks.length && !learnedContext.winningCTAs.length) {
      return '';
    }

    const directives: string[] = [
      '### CONTINUOUS BRAND BRAIN LEARNING DIRECTIVES (DATA-BACKED):',
    ];

    if (learnedContext.winningHooks.length) {
      directives.push(`- Model opening hooks on proven high-velocity openers: "${learnedContext.winningHooks.join('", "')}"`);
    }
    if (learnedContext.winningCTAs.length) {
      directives.push(`- Use high-converting Call-to-Action: "${learnedContext.winningCTAs.join('" or "')}"`);
    }
    if (learnedContext.highPerformingHashtags.length) {
      directives.push(`- Incorporate high-affinity tags: ${learnedContext.highPerformingHashtags.join(' ')}`);
    }
    directives.push(`- Summary Strategy: ${learnedContext.summaryGuideline}`);

    return directives.join('\n');
  }
}

export const brandBrainLearningService = new BrandBrainLearningService();
