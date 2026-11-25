import crypto from 'crypto';
import { db } from '../db/connection.js';
import type {
  BrandBrain,
  BrandBrainBusinessProfile,
  BrandBrainProduct,
  BrandBrainServiceOffering,
  BrandBrainTargetAudience,
  BrandBrainTone,
  BrandBrainWritingStyle,
  BrandBrainEmojiPreferences,
  BrandBrainHashtagPreferences,
  BrandBrainVisualIdentity,
  BrandBrainContentPillar,
} from '@socialforge/shared';

export class BrandBrainService {
  /**
   * Helper to parse JSON fields safely
   */
  private static parseJson<T>(val: unknown, fallback: T): T {
    if (!val) return fallback;
    if (typeof val === 'string') {
      try {
        return JSON.parse(val) as T;
      } catch {
        return fallback;
      }
    }
    return val as T;
  }

  /**
   * Retrieves or auto-initializes the unified Brand Brain for a brand.
   * If the brand_brain record does not yet exist, it creates one using the existing
   * brand and brand_kit records so no existing data is ever lost.
   */
  public static async getBrandBrain(brandId: string): Promise<BrandBrain> {
    const existing = await db('brand_brains').where({ brand_id: brandId }).first();

    if (existing) {
      return {
        id: existing.id,
        brandId: existing.brand_id,
        businessProfile: this.parseJson<BrandBrainBusinessProfile>(existing.business_profile, {
          name: 'Brand',
          description: '',
          industry: '',
        }),
        products: this.parseJson<BrandBrainProduct[]>(existing.products, []),
        services: this.parseJson<BrandBrainServiceOffering[]>(existing.services, []),
        usps: this.parseJson<string[]>(existing.usps, []),
        targetAudience: this.parseJson<BrandBrainTargetAudience>(existing.target_audience, {
          primary: 'General Audience',
          demographics: [],
        }),
        painPoints: this.parseJson<string[]>(existing.pain_points, []),
        brandValues: this.parseJson<string[]>(existing.brand_values, []),
        tone: this.parseJson<BrandBrainTone>(existing.tone, {
          formality: 'approachable',
          descriptors: ['modern', 'authentic'],
        }),
        writingStyle: this.parseJson<BrandBrainWritingStyle>(existing.writing_style, {
          guidelines: 'Clear, engaging, and professional social copy with active voice.',
          sentenceStructure: 'balanced',
          vocabularyLevel: 'accessible',
          pointOfView: 'first_person_plural',
        }),
        languages: this.parseJson<string[]>(existing.languages, ['English (US)']),
        ctaPreferences: this.parseJson<string[]>(existing.cta_preferences, [
          'Visit our website',
          'Explore the collection',
          'Tap the link in bio',
        ]),
        emojiPreferences: this.parseJson<BrandBrainEmojiPreferences>(existing.emoji_preferences, {
          usage: 'moderate',
          signatureEmojis: ['✨', '🌱', '💫'],
        }),
        hashtagPreferences: this.parseJson<BrandBrainHashtagPreferences>(existing.hashtag_preferences, {
          brandTag: '#SocialForge',
          defaultTags: [],
          bannedTags: [],
          maxCount: 5,
        }),
        topicsToAvoid: this.parseJson<string[]>(existing.topics_to_avoid, []),
        visualIdentity: this.parseJson<BrandBrainVisualIdentity>(existing.visual_identity, {
          colors: {
            primary: '#E11D48',
            secondary: '#FB7185',
            accent: '#FBBF24',
            background: '#FFF1F2',
            text: '#1E293B',
          },
          fonts: {
            heading: 'Playfair Display',
            body: 'Plus Jakarta Sans',
          },
          logoUrls: {},
        }),
        contentPillars: this.parseJson<BrandBrainContentPillar[]>(existing.content_pillars, []),
        createdAt: existing.created_at,
        updatedAt: existing.updated_at,
      };
    }

    // Auto-seed from existing brand & brand_kit
    const brand = await db('brands').where({ id: brandId }).first();
    const brandKit = await db('brand_kits').where({ brand_id: brandId }).first();

    const brandName = brand ? brand.name : 'Luminary Glow Cosmetics';
    const industry = brand?.industry || 'Beauty & Wellness';
    const websiteUrl = brand?.website_url || 'https://luminaryglow.example.com';

    const kitColors = brandKit
      ? this.parseJson(brandKit.primary_colors, {
          primary: '#E11D48',
          secondary: '#FB7185',
          accent: '#FBBF24',
          background: '#FFF1F2',
          text: '#1E293B',
        })
      : {
          primary: '#E11D48',
          secondary: '#FB7185',
          accent: '#FBBF24',
          background: '#FFF1F2',
          text: '#1E293B',
        };

    const kitFonts = brandKit
      ? this.parseJson(brandKit.fonts, { heading: 'Playfair Display', body: 'Plus Jakarta Sans' })
      : { heading: 'Playfair Display', body: 'Plus Jakarta Sans' };

    const kitTone = brandKit
      ? this.parseJson(brandKit.tone_of_voice, {
          formality: 'approachable',
          descriptors: ['radiant', 'empowering', 'clinical', 'authentic'],
        })
      : { formality: 'approachable', descriptors: ['radiant', 'empowering', 'clinical', 'authentic'] };

    const kitHashtags = brandKit
      ? this.parseJson<string[]>(brandKit.hashtags_default, ['#LuminaryGlow', '#CleanBeauty', '#RadiantSkin'])
      : ['#LuminaryGlow', '#CleanBeauty', '#RadiantSkin'];

    const kitTaboos = brandKit
      ? this.parseJson<string[]>(brandKit.taboo_words, ['cheap', 'miracle cure', 'instant fix', 'toxic'])
      : ['cheap', 'miracle cure', 'instant fix', 'toxic'];

    const defaultBrain: BrandBrain = {
      id: crypto.randomUUID(),
      brandId,
      businessProfile: {
        name: brandName,
        tagline: 'Evidence-backed botanical skincare engineered for lasting cellular radiance',
        description: `${brandName} develops clinical-grade, botanically infused skincare solutions designed to nourish and revitalize the skin barrier without synthetic irritants.`,
        industry,
        mission: 'To deliver transparent, clinically verified skincare that empowers individuals to embrace their natural radiance.',
        websiteUrl,
      },
      products: [
        {
          id: crypto.randomUUID(),
          name: 'Radiance Renewal 15% Vitamin C Serum',
          category: 'Serums & Treatments',
          description: 'Stabilized L-Ascorbic Acid infused with botanical hyaluronic acid and ferulic complex.',
          price: '$48.00',
        },
        {
          id: crypto.randomUUID(),
          name: 'Ceramide Barrier Hydration Crème',
          category: 'Moisturizers',
          description: 'Tri-ceramide multi-lipid moisture barrier replenishment for 72-hour sustained hydration.',
          price: '$42.00',
        },
      ],
      services: [
        {
          id: crypto.randomUUID(),
          name: 'Virtual Skincare Consultation',
          description: '1-on-1 personalized skin analysis and routine design with certified aesthetic specialists.',
          deliverables: ['Digital skin diagnosis', 'Custom AM/PM regimen', 'Ingredient safety guide'],
        },
      ],
      usps: [
        '100% Dermatologist Tested & Hypoallergenic',
        'Clinical 15% Active Vitamin C Formula with 72h stability',
        'Zero Synthetic Fragrances, Parabens, or Phthalates',
        'Sustainably sourced botanical active ingredients',
      ],
      targetAudience: {
        primary: 'Discerning skincare enthusiasts aged 24-48 seeking clean, science-backed efficacy',
        demographics: ['Women & men 24-48', 'Urban professionals', 'Health & wellness conscious'],
        icpDescription:
          'Consumers experiencing skin dullness, texture irregularities, or dehydration who demand ingredient transparency and clinical proof.',
      },
      painPoints: [
        'Dull, uneven skin tone caused by environmental stressors and oxidative damage',
        'Ineffective skincare products packed with artificial fillers and harsh chemicals',
        'Confusion over complicated multi-step beauty routines with conflicting active ingredients',
      ],
      brandValues: [
        'Clinical Integrity & Verification',
        'Clean & Conscious Botanical Formulation',
        'Radical Ingredient Transparency',
        'Cruelty-Free & Sustainable Packaging',
      ],
      tone: {
        formality: (kitTone.formality as any) || 'approachable',
        descriptors: kitTone.descriptors || ['radiant', 'empowering', 'clinical', 'authentic'],
        personalityTraits: ['Knowledgeable', 'Empowering', 'Reassuring', 'Sophisticated'],
      },
      writingStyle: {
        guidelines:
          'Use confident, uplifting, and scientifically grounded prose. Emphasize visible transformation and botanical purity without making exaggerated medical claims.',
        sentenceStructure: 'balanced',
        vocabularyLevel: 'accessible',
        pointOfView: 'first_person_plural',
      },
      languages: ['English (US)', 'Spanish (Latin America)'],
      ctaPreferences: [
        'Discover your natural radiance at the link in bio',
        'Shop the clinical formulation online today',
        'Book your complimentary consultation with our skincare specialists',
        'Tag us in your 14-day transformation with #LuminaryGlow',
      ],
      emojiPreferences: {
        usage: 'moderate',
        signatureEmojis: ['✨', '🌱', '💧', '💫', '🤍'],
        rules: 'Use 2-4 elegant emojis per caption. Place them as bullet separators or closing accents.',
      },
      hashtagPreferences: {
        brandTag: `#${brandName.replace(/\s+/g, '')}`,
        defaultTags: kitHashtags,
        bannedTags: ['#cure', '#miracle', '#quickfix', '#cheapbeauty'],
        maxCount: 5,
      },
      topicsToAvoid: [
        ...kitTaboos,
        'cheap',
        'miracle cure',
        'instant fix',
        'toxic',
        'Unverified medical claims',
        'Competitor brand bashing',
        'Harsh chemical peels',
      ],
      visualIdentity: {
        colors: kitColors,
        fonts: kitFonts,
        logoUrls: {
          primary: '/logo.svg',
          icon: '/logo.svg',
        },
      },
      contentPillars: [
        {
          id: crypto.randomUUID(),
          title: 'Science of Radiance (Clinical Education)',
          description: 'Breakdowns of active ingredients (Vitamin C, Hyaluronic, Ceramides) and skin physiology.',
          weightPercentage: 35,
          sampleTopics: [
            'How Vitamin C combats oxidative stress',
            '3 skincare myths dermatologist debunked',
            'Understanding your skin barrier lipid matrix',
          ],
        },
        {
          id: crypto.randomUUID(),
          title: 'Product Spotlight & Regimen Guides',
          description: 'Feature demonstrations, texture reveals, and optimal layering instructions.',
          weightPercentage: 30,
          sampleTopics: [
            'AM vs PM application guide for optimal absorption',
            'Inside our botanical stabilization lab',
            'Ingredient spotlight: Botanical Squalane',
          ],
        },
        {
          id: crypto.randomUUID(),
          title: 'Community Proof & Real Transformations',
          description: 'Real user reviews, 14-day trials, dermatologist testimonials, and UGC highlights.',
          weightPercentage: 20,
          sampleTopics: [
            '14-Day before & after participant clinical study',
            'Dermatologist reaction to our clinical trials',
            'Community spotlight: How Sarah transformed her glow',
          ],
        },
        {
          id: crypto.randomUUID(),
          title: 'Conscious Beauty & Behind the Scenes',
          description: 'Sustainable sourcing, ethical packaging, lab formulation notes, and brand values.',
          weightPercentage: 15,
          sampleTopics: [
            'Why 100% recyclable glass protects active vitamin C',
            'Meet our formulation scientists in California',
            'Our commitment to cruelty-free certification',
          ],
        },
      ],
    };

    // Save newly initialized brain to database
    await db('brand_brains').insert({
      id: defaultBrain.id,
      brand_id: brandId,
      business_profile: JSON.stringify(defaultBrain.businessProfile),
      products: JSON.stringify(defaultBrain.products),
      services: JSON.stringify(defaultBrain.services),
      usps: JSON.stringify(defaultBrain.usps),
      target_audience: JSON.stringify(defaultBrain.targetAudience),
      pain_points: JSON.stringify(defaultBrain.painPoints),
      brand_values: JSON.stringify(defaultBrain.brandValues),
      tone: JSON.stringify(defaultBrain.tone),
      writing_style: JSON.stringify(defaultBrain.writingStyle),
      languages: JSON.stringify(defaultBrain.languages),
      cta_preferences: JSON.stringify(defaultBrain.ctaPreferences),
      emoji_preferences: JSON.stringify(defaultBrain.emojiPreferences),
      hashtag_preferences: JSON.stringify(defaultBrain.hashtagPreferences),
      topics_to_avoid: JSON.stringify(defaultBrain.topicsToAvoid),
      visual_identity: JSON.stringify(defaultBrain.visualIdentity),
      content_pillars: JSON.stringify(defaultBrain.contentPillars),
    });

    return defaultBrain;
  }

  /**
   * Saves updates to the unified Brand Brain and syncs shared attributes to brand_kits
   */
  public static async updateBrandBrain(brandId: string, updates: Partial<BrandBrain>): Promise<BrandBrain> {
    // Ensure brain exists first
    await this.getBrandBrain(brandId);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (updates.businessProfile) updatePayload.business_profile = JSON.stringify(updates.businessProfile);
    if (updates.products) updatePayload.products = JSON.stringify(updates.products);
    if (updates.services) updatePayload.services = JSON.stringify(updates.services);
    if (updates.usps) updatePayload.usps = JSON.stringify(updates.usps);
    if (updates.targetAudience) updatePayload.target_audience = JSON.stringify(updates.targetAudience);
    if (updates.painPoints) updatePayload.pain_points = JSON.stringify(updates.painPoints);
    if (updates.brandValues) updatePayload.brand_values = JSON.stringify(updates.brandValues);
    if (updates.tone) updatePayload.tone = JSON.stringify(updates.tone);
    if (updates.writingStyle) updatePayload.writing_style = JSON.stringify(updates.writingStyle);
    if (updates.languages) updatePayload.languages = JSON.stringify(updates.languages);
    if (updates.ctaPreferences) updatePayload.cta_preferences = JSON.stringify(updates.ctaPreferences);
    if (updates.emojiPreferences) updatePayload.emoji_preferences = JSON.stringify(updates.emojiPreferences);
    if (updates.hashtagPreferences) updatePayload.hashtag_preferences = JSON.stringify(updates.hashtagPreferences);
    if (updates.topicsToAvoid) updatePayload.topics_to_avoid = JSON.stringify(updates.topicsToAvoid);
    if (updates.visualIdentity) updatePayload.visual_identity = JSON.stringify(updates.visualIdentity);
    if (updates.contentPillars) updatePayload.content_pillars = JSON.stringify(updates.contentPillars);

    await db('brand_brains').where({ brand_id: brandId }).update(updatePayload);

    // Keep legacy brand_kits in sync for backward compatibility
    const kitUpdates: Record<string, unknown> = { updated_at: new Date() };
    if (updates.tone) {
      kitUpdates.tone_of_voice = JSON.stringify({
        formality: updates.tone.formality,
        descriptors: updates.tone.descriptors,
      });
    }
    if (updates.visualIdentity?.colors) {
      kitUpdates.primary_colors = JSON.stringify(updates.visualIdentity.colors);
    }
    if (updates.visualIdentity?.fonts) {
      kitUpdates.fonts = JSON.stringify(updates.visualIdentity.fonts);
    }
    if (updates.hashtagPreferences?.defaultTags) {
      kitUpdates.hashtags_default = JSON.stringify(updates.hashtagPreferences.defaultTags);
    }
    if (updates.topicsToAvoid) {
      kitUpdates.taboo_words = JSON.stringify(updates.topicsToAvoid);
    }
    if (updates.targetAudience?.demographics) {
      kitUpdates.target_audiences = JSON.stringify(updates.targetAudience.demographics);
    }

    if (Object.keys(kitUpdates).length > 1) {
      await db('brand_kits').where({ brand_id: brandId }).update(kitUpdates);
    }

    // Keep brand table in sync (websiteUrl, industry, name)
    if (updates.businessProfile) {
      const brandUpdates: Record<string, unknown> = {};
      if (updates.businessProfile.websiteUrl !== undefined) {
        brandUpdates.website_url = updates.businessProfile.websiteUrl;
      }
      if (updates.businessProfile.industry !== undefined) {
        brandUpdates.industry = updates.businessProfile.industry;
      }
      if (Object.keys(brandUpdates).length > 0) {
        await db('brands').where({ id: brandId }).update(brandUpdates);
      }
    }

    return this.getBrandBrain(brandId);
  }

  /**
   * CENTRALIZED BRAND BRAIN AI CONTEXT GENERATOR
   * Every AI generation across the platform (copywriting, posters, storyboards, campaigns)
   * must call this method to retrieve the single source of truth for brand intelligence.
   */
  public static buildAiContextPrompt(
    brain: BrandBrain,
    options?: {
      platform?: string;
      campaignGoal?: string;
      contentPillar?: string;
    }
  ): string {
    const bp = brain.businessProfile;
    const tone = brain.tone;
    const style = brain.writingStyle;
    const aud = brain.targetAudience;
    const emojis = brain.emojiPreferences;
    const hashtags = brain.hashtagPreferences;

    // Filter relevant pillar if specified
    const activePillars = options?.contentPillar
      ? brain.contentPillars.filter((p) => p.title.toLowerCase().includes(options.contentPillar!.toLowerCase()))
      : brain.contentPillars;

    return `
=== CENTRALIZED BRAND BRAIN GOVERNANCE CONTEXT ===
BRAND IDENTITY & MISSION:
- Brand Name: ${bp.name}
- Industry: ${bp.industry || 'General Industry'}
- Tagline: ${bp.tagline || 'Excellence and Innovation'}
- Core Mission: ${bp.mission || bp.description}
- Website: ${bp.websiteUrl || 'N/A'}

PRODUCTS & OFFERINGS:
${
  brain.products.length > 0
    ? brain.products.map((p) => `- ${p.name}: ${p.description}${p.price ? ` [Price: ${p.price}]` : ''}`).join('\n')
    : '- Core brand catalog'
}

SERVICES & CAPABILITIES:
${
  brain.services.length > 0
    ? brain.services
        .map((s) => `- ${s.name}: ${s.description}${s.deliverables ? ` (Deliverables: ${s.deliverables.join(', ')})` : ''}`)
        .join('\n')
    : '- Bespoke client solutions'
}

UNIQUE SELLING PROPOSITIONS (USPs):
${brain.usps.map((u) => `- ${u}`).join('\n')}

TARGET AUDIENCE & PAIN POINTS:
- Primary Audience: ${aud.primary}
- Demographics: ${aud.demographics.join(', ')}
${aud.icpDescription ? `- Ideal Customer Profile: ${aud.icpDescription}` : ''}
- Customer Pain Points Addressed:
${brain.painPoints.map((pp) => `  * ${pp}`).join('\n')}

CORE BRAND VALUES:
${brain.brandValues.map((v) => `- ${v}`).join('\n')}

VOICE, TONE & WRITING STYLE:
- Formality Level: ${tone.formality}
- Voice Descriptors: ${tone.descriptors.join(', ')}
- Personality Traits: ${(tone.personalityTraits || []).join(', ')}
- Writing Style Guidelines: ${style.guidelines}
- Point of View: ${style.pointOfView || 'first_person_plural (We, Our)'}
- Sentence Cadence: ${style.sentenceStructure || 'balanced'}
- Supported Languages: ${brain.languages.join(', ')}

CALLS TO ACTION (CTA PREFERENCES):
${brain.ctaPreferences.map((cta) => `- "${cta}"`).join('\n')}

EMOJI & HASHTAG USAGE RULES:
- Emoji Usage Policy: ${emojis.usage.toUpperCase()} (${emojis.signatureEmojis.join(' ')})
${emojis.rules ? `- Emoji Guidelines: ${emojis.rules}` : ''}
- Primary Brand Hashtag: ${hashtags.brandTag}
- Default Associated Hashtags: ${hashtags.defaultTags.join(' ')}
- Maximum Hashtags Recommended: ${hashtags.maxCount}

CONTENT PILLARS & THEMATIC GOALS:
${activePillars.map((cp) => `- [${cp.title}]: ${cp.description}`).join('\n')}

STRICT BRAND SAFETY & NEGATIVE CONSTRAINTS (MANDATORY):
- NEVER use or mention the following taboo words or topics under any circumstances:
  ${brain.topicsToAvoid.join(', ')}
- Banned Hashtags: ${hashtags.bannedTags.join(', ')}
- Legal Compliance: Adhere strictly to verified claims. Never promise unverified medical, financial, or miraculous guarantees.
==================================================
`.trim();
  }
}
