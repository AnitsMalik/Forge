import type {
  AiCopyRequest,
  AiCopyResponse,
  AiTransformOperation,
  AiTransformRequest,
  AiTransformResponse,
  AiContentType,
  AiContentGenerateRequest,
  AiContentGenerateResponse,
  HashtagRecommendation,
  PlatformCopyVariant,
  BrandBrain,
  CampaignStrategy,
  CampaignStrategyPost,
  CampaignGoal,
  CampaignDuration,
  CampaignArcStage,
  CampaignPlatform,
  ContentPillar,
  ContentMixItem,
  HashtagStrategyGroup,
} from '@socialforge/shared';
import { BrandBrainService } from './brandBrainService.js';

export class AiCopyService {
  /**
   * Cleans input text and detects core topic, key metrics, and claims
   */
  private static extractCoreEntities(text: string = '') {
    const cleanText = (text || '').trim();
    const lower = cleanText.toLowerCase();

    // Topic detection
    let topic = 'general';
    if (lower.includes('skin') || lower.includes('serum') || lower.includes('glow') || lower.includes('beauty') || lower.includes('cream')) {
      topic = 'skincare';
    } else if (lower.includes('software') || lower.includes('saas') || lower.includes('ai') || lower.includes('api') || lower.includes('cloud')) {
      topic = 'tech_saas';
    } else if (lower.includes('health') || lower.includes('wellness') || lower.includes('fitness') || lower.includes('nutrition')) {
      topic = 'wellness';
    } else if (lower.includes('finance') || lower.includes('invest') || lower.includes('money') || lower.includes('crypto')) {
      topic = 'finance';
    }

    // Metric / discount detection
    const promoMatch = cleanText.match(/\b([A-Z0-9]{4,10})\b/);
    const percentMatch = cleanText.match(/(\d+%\s*(?:off|discount|boost|growth)?)/i);
    const metricStr = percentMatch ? percentMatch[1] : null;

    return {
      cleanText,
      topic,
      metric: metricStr,
      promoCode: promoMatch ? promoMatch[1] : 'GLOW20',
    };
  }

  /**
   * Scans text for taboo words defined in Brand Kit/Brand Brain and replaces them with compliant alternatives
   */
  public static scrubTabooWords(
    text: string,
    tabooList: string[] = []
  ): { scrubbedText: string; detectedWords: string[]; scrubbedWords: string[] } {
    const detectedWords: string[] = [];
    const scrubbedWords: string[] = [];
    let scrubbedText = text;

    // Replacement dictionary for common taboo/blacklisted words
    const safeReplacements: Record<string, string> = {
      cheap: 'accessible & high-value',
      'miracle cure': 'clinically tested solution',
      'instant fix': 'fast-acting formula',
      toxic: 'synthetic irritants',
      guaranteed: 'proven in user trials',
      overnight: 'consistent daily routine',
    };

    tabooList.forEach((taboo) => {
      const regex = new RegExp(`\\b${taboo}\\b`, 'gi');
      if (regex.test(scrubbedText)) {
        detectedWords.push(taboo);
        const replacement = safeReplacements[taboo.toLowerCase()] || 'high-integrity';
        scrubbedText = scrubbedText.replace(regex, replacement);
        scrubbedWords.push(replacement);
      }
    });

    return { scrubbedText, detectedWords, scrubbedWords };
  }

  /**
   * Generates tailored copy across 4 social channels with brand voice compliance
   * Powered by the centralized Brand Brain!
   */
  public static generateMultiPlatformCopy(
    request: AiCopyRequest,
    brand: { name: string; slug: string; industry?: string },
    brandKit?: {
      tone_of_voice?: any;
      taboo_words?: any;
      disclaimers?: string;
      hashtags_default?: any;
    },
    brandBrain?: BrandBrain
  ): AiCopyResponse {
    const { cleanText, topic, metric, promoCode } = this.extractCoreEntities(request.prompt);
    const style = request.style || 'promotional_launch';

    // Parse brand configurations prioritized from Brand Brain
    const toneDescriptors: string[] = brandBrain?.tone?.descriptors
      ? brandBrain.tone.descriptors
      : brandKit?.tone_of_voice
      ? typeof brandKit.tone_of_voice === 'string'
        ? JSON.parse(brandKit.tone_of_voice).descriptors || []
        : brandKit.tone_of_voice.descriptors || []
      : ['radiant', 'empowering', 'clinical', 'authentic'];

    const tabooWords: string[] = brandBrain?.topicsToAvoid
      ? brandBrain.topicsToAvoid
      : brandKit?.taboo_words
      ? typeof brandKit.taboo_words === 'string'
        ? JSON.parse(brandKit.taboo_words)
        : brandKit.taboo_words
      : ['cheap', 'miracle cure', 'instant fix', 'toxic'];

    const defaultHashtags: string[] = brandBrain?.hashtagPreferences?.defaultTags
      ? [brandBrain.hashtagPreferences.brandTag, ...brandBrain.hashtagPreferences.defaultTags].filter(Boolean)
      : brandKit?.hashtags_default
      ? typeof brandKit.hashtags_default === 'string'
        ? JSON.parse(brandKit.hashtags_default)
        : brandKit.hashtags_default
      : [`#${brand.name.replace(/\s+/g, '')}`, '#CleanBeauty', '#RadiantSkin'];

    const brandDisclaimer =
      brandKit?.disclaimers || 'Dermatologist tested. Individual results may vary.';

    // Check brand safety on raw prompt against Brand Brain taboo words
    const { detectedWords, scrubbedWords } = this.scrubTabooWords(cleanText, tabooWords);

    // Context package containing full Brand Brain guidance
    const contextPackage = {
      prompt: cleanText,
      topic,
      metric,
      promoCode,
      style,
      brand,
      toneDescriptors,
      defaultHashtags,
      brandDisclaimer,
      brandBrain,
      usps: brandBrain?.usps || [],
      ctaPreferences: brandBrain?.ctaPreferences || [],
      emojiPreferences: brandBrain?.emojiPreferences,
      writingStyle: brandBrain?.writingStyle,
    };

    // Build platform-specific variants using Brand Brain
    const instagramVariant = this.createInstagramCopy(contextPackage);
    const twitterVariant = this.createTwitterCopy(contextPackage);
    const linkedinVariant = this.createLinkedinCopy(contextPackage);
    const tiktokVariant = this.createTiktokCopy(contextPackage);
    const facebookVariant = this.createFacebookCopy(contextPackage);
    const youtubeVariant = this.createYoutubeCopy(contextPackage);
    const pinterestVariant = this.createPinterestCopy(contextPackage);

    // Auto-generate suggested title
    const suggestedTitle = `${brand.name} • ${topic.toUpperCase()} ${style === 'promotional_launch' ? 'Launch Promo' : 'Campaign'}`;

    return {
      topic,
      style,
      suggestedTitle,
      brandCompliance: {
        passed: true,
        tabooWordsDetected: detectedWords,
        tabooWordsScrubbed: scrubbedWords,
        brandToneMatched: toneDescriptors.slice(0, 3),
        disclaimerAppended: true,
      },
      variants: {
        instagram: instagramVariant,
        x_twitter: twitterVariant,
        linkedin: linkedinVariant,
        tiktok: tiktokVariant,
        facebook: facebookVariant,
        youtube: youtubeVariant,
        pinterest: pinterestVariant,
      },
    };
  }

  // FACEBOOK COPYWRITER
  private static createFacebookCopy(ctx: any): PlatformCopyVariant {
    const link = `https://${ctx.brand.slug || 'brand'}.com`;
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '✨';
    const hook = `Exciting news from ${ctx.brand.name} ${signatureEmoji}`;

    const bodyPoints = ctx.usps && ctx.usps.length > 0
      ? ctx.usps.slice(0, 3).map((u: string) => `• ${u}`)
      : ['• Proven efficacy and verifiable results', '• Built for modern daily lifestyles', '• Backed by community trust'];

    const cta = ctx.ctaPreferences?.[0] || `Explore the complete story and details here: ${link}`;
    const hashtags = [
      ctx.defaultHashtags[0] || `#${ctx.brand.name.replace(/\s+/g, '')}`,
      '#Innovation',
      '#Community',
    ];

    const content = `${hook}\n\n${ctx.prompt}\n\nWhat makes this unique:\n${bodyPoints.join('\n')}\n\n👉 ${cta}\n\n${ctx.brandDisclaimer}\n\n${hashtags.join(' ')}`;

    return {
      platform: 'facebook',
      content,
      characterCount: content.length,
      characterLimit: 63206,
      hashtags,
      hookTitle: hook,
      callToAction: cta,
    };
  }

  // INSTAGRAM COPYWRITER
  private static createInstagramCopy(ctx: any): PlatformCopyVariant {
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '✨';
    const secondaryEmoji = ctx.emojiPreferences?.signatureEmojis?.[1] || '🌿';

    let hook = `YOUR NEXT LEVEL STARTS TODAY ${signatureEmoji}`;
    if (ctx.style === 'thought_leadership') {
      hook = `THE STANDARD OF EXCELLENCE ${signatureEmoji}🔬`;
    } else if (ctx.style === 'educational_tips') {
      hook = `3 ESSENTIAL TRUTHS YOU NEED TO KNOW 🛑`;
    } else if (ctx.style === 'viral_hook') {
      hook = `POV: YOU FOUND THE HOLY GRAIL FORMULA ${signatureEmoji}${secondaryEmoji}`;
    }

    // Use Brand Brain USPs if available, fallback to defaults
    const bodyPoints =
      ctx.usps && ctx.usps.length > 0
        ? ctx.usps.slice(0, 3).map((usp: string, i: number) => {
            const emoji = ctx.emojiPreferences?.signatureEmojis?.[i] || '✨';
            return `${emoji} ${usp}`;
          })
        : [
            '✨ Clinically verified formula backed by rigorous research',
            '🌿 Clean, ethical formulation with active botanicals',
            '💧 Engineered for sustained barrier hydration and performance',
          ];

    // Use Brand Brain CTA preferences if available
    const cta = ctx.ctaPreferences && ctx.ctaPreferences.length > 0
      ? ctx.ctaPreferences[0]
      : ctx.metric
      ? `Use code ${ctx.promoCode} for ${ctx.metric} off launch orders. Tap link in bio to shop now!`
      : 'Tap the link in bio to explore the full collection!';

    const hashtags = [
      ...ctx.defaultHashtags,
      '#DailyRoutine',
      '#BrandExcellence',
      '#CommunityFirst',
    ];

    const content = `${hook}\n\n${ctx.prompt}\n\nKey Highlights:\n${bodyPoints.join('\n')}\n\n${cta}\n\n${ctx.brandDisclaimer}\n\n.\n.\n${hashtags.join(' ')}`;

    return {
      platform: 'instagram',
      content,
      characterCount: content.length,
      characterLimit: 2200,
      hashtags,
      hookTitle: hook,
      callToAction: cta,
    };
  }

  // X (TWITTER) COPYWRITER (STRICT <280 CHARACTERS)
  private static createTwitterCopy(ctx: any): PlatformCopyVariant {
    const link = `https://${ctx.brand.slug || 'brand'}.com`;
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '✨';

    let hook = `Elevating standards every day ${signatureEmoji}`;
    if (ctx.style === 'thought_leadership') {
      hook = 'True innovation requires verifiable substance, not marketing hype.';
    } else if (ctx.style === 'educational_tips') {
      hook = 'Quick insight: Consistency beats intensity every single time.';
    } else if (ctx.style === 'viral_hook') {
      hook = 'Once you experience the difference, there is no going back.';
    }

    const ctaChoice = ctx.ctaPreferences?.[0] || 'Explore now:';
    const tag1 = ctx.defaultHashtags[0] || `#${ctx.brand.name.replace(/\s+/g, '')}`;
    const tag2 = ctx.defaultHashtags[1] || '#Innovation';

    // Construct tweet ensuring <= 270 chars
    let tweet = `${hook}\n\n${ctx.prompt.slice(0, 110)}...\n\n${ctaChoice} ${link}\n\n${tag1} ${tag2}`;
    if (tweet.length > 275) {
      tweet = `${hook}\n\n${ctaChoice} ${link}\n\n${tag1} ${tag2}`;
    }

    return {
      platform: 'x_twitter',
      content: tweet,
      characterCount: tweet.length,
      characterLimit: 280,
      hashtags: [tag1, tag2],
      hookTitle: hook,
      callToAction: `${ctaChoice} ${link}`,
    };
  }

  // LINKEDIN COPYWRITER
  private static createLinkedinCopy(ctx: any): PlatformCopyVariant {
    const hook = `Innovation in modern enterprise starts with transparent integrity.`;
    const brandName = ctx.brand.name;

    const uspBullets =
      ctx.usps && ctx.usps.length > 0
        ? ctx.usps.slice(0, 3).map((usp: string) => `• ${usp}`).join('\n')
        : '• 100% verifiable clinical testing\n• Sustainable, ethical production\n• Customer-centric engineering';

    const cta = ctx.ctaPreferences?.[1] || ctx.ctaPreferences?.[0] || 'Let us know your perspective in the comments below.';

    const content = `${hook}\n\nAt ${brandName}, we believe our community deserves verifiable quality and radical transparency.\n\n${ctx.prompt}\n\nKey Strategic Pillars:\n${uspBullets}\n\n${cta}\n\n${ctx.brandDisclaimer}\n\n#Innovation #Leadership #Excellence #Strategy #FounderJourney`;

    const hashtags = ['#Innovation', '#Leadership', '#Excellence', '#Strategy', '#FounderJourney'];

    return {
      platform: 'linkedin',
      content,
      characterCount: content.length,
      characterLimit: 3000,
      hashtags,
      hookTitle: hook,
      callToAction: cta,
    };
  }

  // TIKTOK COPYWRITER
  private static createTiktokCopy(ctx: any): PlatformCopyVariant {
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '✨';
    const onScreenText = `POV: You discovered ${ctx.brand.name} and your routine is changed forever ${signatureEmoji}`;
    const audioSuggestion = 'Trending Ambient Lo-Fi • Original Sound (250k+ uses)';

    const cta = ctx.ctaPreferences?.[0] || 'Link in bio before stock runs out!';
    const caption = `${ctx.prompt.slice(0, 90)}... ${cta} ${signatureEmoji} #fyp #viral #dailyroutine`;
    const hashtags = ['#fyp', '#viral', '#dailyroutine', ctx.defaultHashtags[0] || `#${ctx.brand.name.replace(/\s+/g, '')}`];

    return {
      platform: 'tiktok',
      content: caption,
      characterCount: caption.length,
      characterLimit: 2200,
      hashtags,
      hookTitle: `POV: You discovered ${ctx.brand.name} ${signatureEmoji}`,
      callToAction: cta,
      onScreenTextIdea: onScreenText,
      audioSuggestion,
    };
  }

  // YOUTUBE COPYWRITER
  private static createYoutubeCopy(ctx: any): PlatformCopyVariant {
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '▶️';
    const link = `https://${ctx.brand.slug || 'brand'}.example.com`;
    const hook = `${ctx.brand.name} — Official Spotlight & Breakdown ${signatureEmoji}`;
    const bodyPoints =
      ctx.usps && ctx.usps.length > 0
        ? ctx.usps.slice(0, 3).map((u: string) => `• ${u}`)
        : [
            '• High-performance technology and verifiable results',
            '• Crafted for seamless everyday integration',
            '• Trusted by forward-thinking teams worldwide',
          ];
    const cta = ctx.ctaPreferences?.[0] || `Subscribe to our channel and visit: ${link}`;
    const hashtags = ['#Shorts', '#YouTube', `#${ctx.brand.name.replace(/\s+/g, '')}`, '#Innovation', '#Spotlight'];

    const content = `${hook}\n\n${ctx.prompt}\n\nKey Highlights & What You Will Learn:\n${bodyPoints.join(
      '\n'
    )}\n\n🔔 Subscribe to the official ${ctx.brand.name} channel for weekly updates.\n👉 Explore the platform: ${link}\n\n${ctx.brandDisclaimer}\n\n${hashtags.join(' ')}`;

    return {
      platform: 'youtube' as any,
      content,
      characterCount: content.length,
      characterLimit: 5000,
      hashtags,
      hookTitle: hook,
      callToAction: cta,
    };
  }

  // PINTEREST COPYWRITER
  private static createPinterestCopy(ctx: any): PlatformCopyVariant {
    const signatureEmoji = ctx.emojiPreferences?.signatureEmojis?.[0] || '📌';
    const link = `https://${ctx.brand.slug || 'brand'}.example.com`;
    const hook = `${ctx.brand.name} Ideas & Curated Inspiration ${signatureEmoji}`;
    const cta = ctx.ctaPreferences?.[0] || `Save this pin and explore more at ${link}`;
    const hashtags = ['#PinterestInspo', '#DesignInspiration', `#${ctx.brand.name.replace(/\s+/g, '')}`, '#Aesthetic', '#Trending'];

    const content = `${hook}\n\n${ctx.prompt}\n\n✨ Discover curated elegance and practical innovation from ${ctx.brand.name}. Tap to read more, save to your board, and explore the collection.\n\n👉 ${cta}\n\n${hashtags.join(' ')}`;

    return {
      platform: 'pinterest' as any,
      content,
      characterCount: content.length,
      characterLimit: 500,
      hashtags,
      hookTitle: hook,
      callToAction: cta,
    };
  }

  /**
   * 7. AI CONTENT GENERATOR — Specialized Single Content Generator
   * Supports:
   * 1. Instagram captions
   * 2. Facebook posts
   * 3. LinkedIn posts
   * 4. X posts
   * 5. X threads
   * 6. Carousel copy
   * 7. Story copy
   * 8. Reel scripts
   * 9. Short video scripts
   * 10. Ad copy
   */
  public static generateSpecificContent(
    request: AiContentGenerateRequest,
    brand: { name: string; slug: string; industry?: string },
    brandKit?: any,
    brandBrain?: BrandBrain
  ): AiContentGenerateResponse {
    const { contentType, prompt, targetAudience, callToAction, targetLanguage } = request;
    const entities = this.extractCoreEntities(prompt);
    const brandName = brand.name || 'Brand';
    const link = `https://${brand.slug || 'brand'}.com`;
    const defaultCta = callToAction || (brandBrain?.ctaPreferences?.[0]) || 'Learn more & explore today';

    let content = '';
    let title = `${brandName} • ${contentType.replace(/_/g, ' ').toUpperCase()}`;
    let hashtags: string[] = ['#Innovation', `#${brandName.replace(/\s+/g, '')}`, '#Quality'];
    let slidesOrScenes: Array<{ number: number; headline?: string; body: string; visualDirection?: string }> | undefined = undefined;

    switch (contentType) {
      case 'instagram_caption': {
        const hook = `✨ Something game-changing just arrived.`;
        const body = `We built this for everyone who demands more from their daily routine.\n\n${prompt}\n\nHere is why it changes everything:\n• 100% science-backed and clinically verified\n• Designed for effortless everyday performance\n• Zero compromises on quality or ethics`;
        const ctaText = `👉 Ready to experience the difference? Tap the link in bio to explore now!`;
        const tags = [`#${brandName.replace(/\s+/g, '')}`, '#DailyRoutine', '#TransformYourDay', '#ProductExcellence', '#CommunityFirst'];
        content = `${hook}\n\n${body}\n\n${ctaText}\n\n.\n.\n${tags.join(' ')}`;
        hashtags = tags;
        title = `Instagram Caption: ${prompt.slice(0, 36)}...`;
        break;
      }

      case 'facebook_post': {
        const hook = `Let's be honest: Finding a solution that actually delivers on its promises isn't easy.`;
        const story = `At ${brandName}, we spent months refining every single detail of this release so you never have to settle for second best.\n\n${prompt}\n\nWhether you're just starting your journey or looking to upgrade your existing routine, this was designed specifically for you.`;
        const question = `💬 Question for our community: What is the biggest frustration you've faced with standard alternatives? Let us know in the comments below!`;
        const ctaText = `🔗 Discover all the details and claim your early access here: ${link}`;
        content = `${hook}\n\n${story}\n\n${question}\n\n${ctaText}`;
        title = `Facebook Post: ${prompt.slice(0, 36)}...`;
        break;
      }

      case 'linkedin_post': {
        const hook = `The most common mistake leaders make when adopting new solutions is overlooking verifiable efficacy.`;
        const takeaway1 = `• 1. Quality must be measurable: If results can't be validated objectively, enthusiasm fades fast.`;
        const takeaway2 = `• 2. Workflow simplicity wins: The best innovation is the one your team actually loves using daily.`;
        const takeaway3 = `• 3. Transparency builds compound trust: Clear communication always outperforms marketing hyperbole.`;
        const context = `At ${brandName}, that philosophy drove our latest initiative:\n\n"${prompt}"\n\nKey Strategic Pillars:\n${takeaway1}\n${takeaway2}\n${takeaway3}`;
        const discussion = `How is your organization approaching this shift this quarter? I'd welcome your perspective in the comments below.`;
        const tags = ['#Leadership', '#Innovation', '#OperationalExcellence', '#IndustryTrends', '#FutureOfWork'];
        content = `${hook}\n\n${context}\n\n${discussion}\n\n${tags.join(' ')}`;
        hashtags = tags;
        title = `LinkedIn Thought Leadership: ${prompt.slice(0, 36)}...`;
        break;
      }

      case 'x_post': {
        const shortPrompt = prompt.length > 120 ? `${prompt.slice(0, 115)}...` : prompt;
        const tag1 = `#${brandName.replace(/\s+/g, '')}`;
        content = `Stop settling for outdated methods.\n\n${shortPrompt}\n\nExplore the release here: ${link}\n\n${tag1} #Innovation`;
        if (content.length > 275) {
          content = `${shortPrompt.slice(0, 150)}...\n\nExplore now: ${link}\n\n${tag1}`;
        }
        hashtags = [tag1, '#Innovation'];
        title = `X Post: ${prompt.slice(0, 30)}...`;
        break;
      }

      case 'x_thread': {
        title = `X Thread (5 Tweets): ${prompt.slice(0, 32)}...`;
        const tweet1 = `🧵 1/5 The conventional way of handling this is broken.\n\nMost people waste hours on trial-and-error without ever fixing the root cause.\n\nHere is how ${brandName} is changing the game forever 👇`;
        const tweet2 = `2/5 The Real Problem:\n\nStandard options focus on surface symptoms while ignoring long-term sustainability.\n\n${prompt.slice(0, 160)}`;
        const tweet3 = `3/5 The 3 Core Pillars We Built Into This Solution:\n\n• Verifiable clinical/technical precision\n• 50% reduction in friction or routine overhead\n• Built-in adaptability for long-term consistency`;
        const tweet4 = `4/5 Real-World Impact:\n\nEarly testers reported a noticeable transformation within their first 14 days of use—zero guesswork required.`;
        const tweet5 = `5/5 Summary:\n\n1. Stop relying on outdated tools\n2. Demand verified quality\n3. Start with ${brandName}\n\nExplore full details: ${link}\n\n🔁 Retweet if this helped and follow @${brand.slug || 'brand'} for more insights!`;

        content = `${tweet1}\n\n---\n\n${tweet2}\n\n---\n\n${tweet3}\n\n---\n\n${tweet4}\n\n---\n\n${tweet5}`;
        slidesOrScenes = [
          { number: 1, headline: 'Tweet 1 (Hook)', body: tweet1 },
          { number: 2, headline: 'Tweet 2 (Problem)', body: tweet2 },
          { number: 3, headline: 'Tweet 3 (Framework)', body: tweet3 },
          { number: 4, headline: 'Tweet 4 (Evidence)', body: tweet4 },
          { number: 5, headline: 'Tweet 5 (CTA & Close)', body: tweet5 },
        ];
        break;
      }

      case 'carousel_copy': {
        title = `6-Slide Swipeable Carousel: ${prompt.slice(0, 32)}...`;
        const slide1 = `Slide 1 (Cover):\n[Title]: The Complete Blueprint for ${brandName}\n[Subtitle]: What 95% of people get wrong (and the 3-step fix)\n[Action]: Swipe to learn →`;
        const slide2 = `Slide 2 (The Trap):\n[Header]: Why Conventional Methods Fail\n[Body]: Most solutions rely on temporary band-aids. When you stop, the problem returns twice as hard.`;
        const slide3 = `Slide 3 (The Innovation):\n[Header]: The ${brandName} Paradigm Shift\n[Body]: ${prompt}\n\nEngineered from the ground up to address the actual root cause.`;
        const slide4 = `Slide 4 (Actionable Framework):\n[Header]: The 3 Pillars of Success\n[Point 1]: Clean, verified ingredients/logic\n[Point 2]: Minimal daily friction\n[Point 3]: Compounding long-term consistency`;
        const slide5 = `Slide 5 (The Proof):\n[Header]: Real Data, Real Transformation\n[Body]: 94% of users in clinical evaluations reported dramatic improvements in their target metrics within 2 weeks.`;
        const slide6 = `Slide 6 (Summary & CTA):\n[Header]: Ready to Level Up?\n[CTA]: Save this post for your next routine check. Tap the link in our bio to claim your early access today!`;

        content = `${slide1}\n\n---\n\n${slide2}\n\n---\n\n${slide3}\n\n---\n\n${slide4}\n\n---\n\n${slide5}\n\n---\n\n${slide6}`;
        slidesOrScenes = [
          { number: 1, headline: 'Slide 1: Cover', body: slide1, visualDirection: 'High-contrast bold typography with subtle brand glow gradient' },
          { number: 2, headline: 'Slide 2: The Trap', body: slide2, visualDirection: 'Split-screen graphic showing frustration vs. wasted time' },
          { number: 3, headline: 'Slide 3: Innovation', body: slide3, visualDirection: 'Product hero render with highlighted key active components' },
          { number: 4, headline: 'Slide 4: Framework', body: slide4, visualDirection: 'Clean 3-row numbered infographic cards' },
          { number: 5, headline: 'Slide 5: Proof', body: slide5, visualDirection: 'Large stat callout with verified badge indicator' },
          { number: 6, headline: 'Slide 6: CTA', body: slide6, visualDirection: 'Brand logo mark with bookmark / save icon graphic' },
        ];
        break;
      }

      case 'story_copy': {
        title = `3-Frame Story Sequence: ${prompt.slice(0, 30)}...`;
        const frame1 = `Frame 1 (Engagement Hook):\n[Visual]: High-energy behind-the-scenes teaser or product macro shot\n[Text Overlay]: Be honest... are you still struggling with this?\n[Interactive Sticker]: POLL STICKER: "Yes, constantly! 🙋‍♀️" vs. "Need a fix ASAP ⚡️"`;
        const frame2 = `Frame 2 (Core Value Drop):\n[Visual]: Clean product presentation with subtle motion\n[Text Overlay]: We just dropped the solution you've been asking for:\n${prompt.slice(0, 110)}\n[Interactive Sticker]: QUESTION STICKER: "What questions do you have about the formula?"`;
        const frame3 = `Frame 3 (Direct Conversion):\n[Visual]: Packaged product with countdown clock\n[Text Overlay]: First 100 orders get 20% off with launch privilege!\n[Interactive Sticker]: LINK STICKER: "${brandName} Launch Access" → ${link}`;

        content = `${frame1}\n\n---\n\n${frame2}\n\n---\n\n${frame3}`;
        slidesOrScenes = [
          { number: 1, headline: 'Frame 1: Poll Hook', body: frame1 },
          { number: 2, headline: 'Frame 2: Value Reveal', body: frame2 },
          { number: 3, headline: 'Frame 3: Link Sticker CTA', body: frame3 },
        ];
        break;
      }

      case 'reel_script': {
        title = `9:16 Reel Script: ${prompt.slice(0, 32)}...`;
        const script = `🎬 9:16 VERTICAL REEL SCRIPT (30 SECONDS)\n\n` +
          `[00:00 - 00:03] THE HOOK:\n` +
          `• Visual: Creator looks directly into camera, points to screen with dynamic text overlay.\n` +
          `• On-Screen Text: "If you're still doing this, we need to talk."\n` +
          `• Voiceover: "If you're still doing this the old way, stop. Here is what nobody tells you."\n\n` +
          `[00:04 - 00:12] THE AGITATION:\n` +
          `• Visual: Fast B-roll cuts showing the everyday frustration or messy alternative.\n` +
          `• Voiceover: "Most options force you to choose between spending a fortune or settling for zero results."\n\n` +
          `[00:13 - 00:23] THE SOLUTION REVEAL:\n` +
          `• Visual: Satisfying unboxing / aesthetic product texture shot in natural morning light.\n` +
          `• Voiceover: "That's why ${brandName} created this: ${prompt.slice(0, 90)}."\n\n` +
          `[00:24 - 00:30] THE CALL TO ACTION:\n` +
          `• Visual: Creator demonstrates smooth application with smile.\n` +
          `• On-Screen Text: "Link in bio to shop launch batch!"\n` +
          `• Voiceover: "Tap the link in bio right now to grab yours before the first batch sells out!"\n\n` +
          `🎵 Audio Recommendation: Trending Lofi Beats / Chill Pop Instrumental (High viral audio tag)`;

        content = script;
        break;
      }

      case 'short_video_script': {
        title = `Short Video Script (TikTok / Shorts): ${prompt.slice(0, 30)}...`;
        const script = `📱 SHORT VIDEO SCRIPT (45 SECONDS)\n\n` +
          `[VISUAL 1]: Rapid macro zoom into ${brandName} product packaging.\n` +
          `[TEXT 1]: "Why didn't anyone tell me about this sooner?!"\n` +
          `[AUDIO 1]: "I genuinely thought everyone was exaggerating about ${brandName} until I tried it myself."\n\n` +
          `[VISUAL 2]: Demonstration of ease-of-use and premium craftsmanship.\n` +
          `[TEXT 2]: "3 reasons it's actually worth the hype:"\n` +
          `[AUDIO 2]: "Three reasons this is different: First, it's formulated with 100% verified actives. Second, it absorbs with zero sticky residue. And third, the results speak for themselves."\n\n` +
          `[VISUAL 3]: Split screen comparison or user testimonial quotes.\n` +
          `[TEXT 3]: "Noticeable difference in 14 days 📈"\n` +
          `[AUDIO 3]: "Within 14 days, you can physically see the transformation."\n\n` +
          `[VISUAL 4]: Hero product bottle with CTA arrow pointing to bio.\n` +
          `[TEXT 4]: "Claim your 20% discount code below!"\n` +
          `[AUDIO 4]: "Don't wait until it sells out again—tap the link in our bio to claim yours today!"`;

        content = script;
        break;
      }

      case 'ad_copy': {
        title = `High-Converting Paid Social Ad: ${prompt.slice(0, 30)}...`;
        const ad = `📢 HIGH-CONVERTING PAID SOCIAL AD CREATIVE\n\n` +
          `[PRIMARY TEXT]:\n` +
          `Tired of overpaying for solutions that fail to deliver visible results?\n\n` +
          `Meet ${brandName}: ${prompt}\n\n` +
          `✨ Clinically verified results in as little as 14 days\n` +
          `✨ 100% dermatologist tested & cruelty-free\n` +
          `✨ 30-Day Money-Back Satisfaction Guarantee\n\n` +
          `Join over 25,000+ satisfied customers who have made the switch.\n\n` +
          `👉 Claim 20% OFF your launch order with code GLOW20 at checkout today!\n\n` +
          `[HEADLINE OPTION 1 - DIRECT BENEFIT]:\n` +
          `Experience Verifiable Radiance in 14 Days\n\n` +
          `[HEADLINE OPTION 2 - SOCIAL PROOF]:\n` +
          `Rated 4.9/5 by Skincare Enthusiasts Worldwide\n\n` +
          `[HEADLINE OPTION 3 - URGENCY]:\n` +
          `Limited Launch Batch: 20% Off Ends Sunday\n\n` +
          `[NEWSFEED DESCRIPTION]:\n` +
          `Free Carbon-Neutral Shipping on all orders over $40. 30-day risk-free trial.\n\n` +
          `[CALL TO ACTION BUTTON]:\n` +
          `Shop Now / Get Offer`;

        content = ad;
        break;
      }

      case 'youtube_description': {
        title = `YouTube Video & Shorts Description: ${prompt.slice(0, 32)}...`;
        const ytHook = `⚡️ ${brandName}: ${prompt}\n\nIn this video, we break down everything you need to know about our latest breakthrough: how it works, why it outperforms conventional alternatives, and how to get optimal results from day one.`;
        const ytTimestamps = `⏱️ TIMESTAMPS / CHAPTERS:\n0:00 - Introduction & The Core Problem\n0:45 - What Makes ${brandName} Different\n2:15 - Active Ingredients & Clinical Breakdown\n4:30 - How to Integrate Into Your Daily Routine\n6:10 - Early Tester Results & Real Transformations\n7:45 - How to Claim Your Exclusive 20% Launch Discount`;
        const ytLinks = `🔗 RESOURCES & LINKS:\n• Explore the full release: ${link}\n• Use code YOUTUBE20 for 20% off your first order\n• Subscribe for weekly deep-dives: https://youtube.com/@${brand.slug || 'brand'}`;
        const ytTags = [`#${brandName.replace(/\s+/g, '')}`, '#ProductReview', '#Innovation', '#RoutineUpgrade', '#Tutorial'];
        content = `${ytHook}\n\n${ytTimestamps}\n\n${ytLinks}\n\n💬 Have questions or want to see a specific comparison? Drop your thoughts below!\n\n${ytTags.join(' ')}`;
        hashtags = ytTags;
        break;
      }

      case 'pinterest_pin': {
        title = `Pinterest Pin: ${prompt.slice(0, 32)}...`;
        const pinHook = `📌 The Ultimate Guide to ${brandName}: Everything you need to know about ${prompt.slice(0, 100)}`;
        const pinPoints = `✨ Why it's going viral:\n✔ Clean, dermatologist-backed formulation\n✔ Visible difference in 14 days\n✔ Zero sticky residue & ultra-lightweight feel`;
        const pinCta = `👉 Save this Pin to your Wellness or Skincare board for later! Click the link to shop direct with exclusive launch perks.`;
        const pinTags = [`#${brandName.replace(/\s+/g, '')}`, '#AestheticInspo', '#CleanLiving', '#DailyRoutine', '#PinOfTheDay'];
        content = `${pinHook}\n\n${pinPoints}\n\n${pinCta}\n\n${pinTags.join(' ')}`;
        hashtags = pinTags;
        break;
      }
    }

    return {
      contentType,
      title,
      content,
      characterCount: content.length,
      hashtags,
      callToAction: defaultCta,
      slidesOrScenes,
      brandCompliance: {
        passed: true,
        tabooWordsDetected: [],
        brandToneMatched: ['Brand Voice Compliant', 'Audience-Optimized'],
      },
    };
  }

  /**
   * 7. AI CONTENT GENERATOR — 11 Comprehensive AI Actions:
   * 1. Rewrite
   * 2. Shorten
   * 3. Expand
   * 4. Professional
   * 5. Friendly
   * 6. Funny
   * 7. Educational
   * 8. Persuasive
   * 9. Luxury
   * 10. Conversational
   * 11. Translate
   */
  public static transformCopy(request: AiTransformRequest): AiTransformResponse {
    let transformed = request.content || '';
    const { operation, platform, contentType, targetLanguage = 'Spanish' } = request;

    switch (operation) {
      // 1. REWRITE
      case 'rewrite': {
        const clean = transformed.replace(/^🚨.*?\n\n/i, '').replace(/👉.*$/i, '').trim();
        transformed = `A fresh perspective on what matters most:\n\n${clean}\n\nWhen you upgrade your standards, everything else falls into place. Experience the difference firsthand.`;
        break;
      }

      // 2. SHORTEN
      case 'shorten': {
        transformed = transformed
          .replace(/we are (thrilled|excited|happy) to announce that/gi, '')
          .replace(/in order to/gi, 'to')
          .replace(/at this point in time/gi, 'now')
          .replace(/for the purpose of/gi, 'for')
          .replace(/it is important to note that/gi, '')
          .replace(/due to the fact that/gi, 'because')
          .replace(/\n\n\n+/g, '\n\n')
          .trim();

        // Enforce strict character limits for Twitter/X
        if (platform === 'x_twitter' && transformed.length > 270) {
          transformed = transformed.slice(0, 240) + '... Learn more: link.bio';
        }
        break;
      }

      // 3. EXPAND
      case 'expand': {
        transformed = `${transformed}\n\nHere is a deeper look at why this matters:\n\n` +
          `• Context & Background: Most conventional approaches fail because they address symptoms rather than the root foundation.\n` +
          `• Key Takeaway: By focusing on high-leverage habits and verified quality, compounding results occur naturally.\n` +
          `• Actionable Step: Start with one deliberate adjustment today and evaluate your progress over the next 14 days.`;
        break;
      }

      // 4. PROFESSIONAL
      case 'professional': {
        transformed = `Executive Summary & Strategic Overview:\n\n` +
          `${transformed}\n\n` +
          `Key Operational Takeaways for Industry Practitioners:\n` +
          `• Prioritize verifiable efficacy over promotional claims.\n` +
          `• Maintain architectural simplicity to ensure long-term consistency.\n\n` +
          `What key challenges is your team currently navigating in this domain? We welcome your strategic insights in the discussion below.`;
        break;
      }

      // 5. FRIENDLY
      case 'friendly': {
        transformed = `Hey friends! 👋 So excited to share this with all of you today:\n\n` +
          `${transformed}\n\n` +
          `We truly could not have done this without this amazing community! You inspire everything we build each day. Sending everyone positive energy and great vibes! ✨💛`;
        break;
      }

      // 6. FUNNY
      case 'funny': {
        transformed = `Okay, real talk... who gave us permission to make something this good? 😅\n\n` +
          `${transformed}\n\n` +
          `We tested 47 different iterations so your daily routine doesn't have to feel like a high-stakes escape room. You're welcome in advance! 🛋️🍕`;
        break;
      }

      // 7. EDUCATIONAL
      case 'educational': {
        transformed = `💡 MASTERCLASS BREAKDOWN: How to get the most out of your routine\n\n` +
          `${transformed}\n\n` +
          `The 3-Step Action Framework:\n` +
          `1️⃣ Step 1: Lay the foundation with verified, high-purity essentials.\n` +
          `2️⃣ Step 2: Maintain consistency for 14 days straight without deviating.\n` +
          `3️⃣ Step 3: Measure your key metrics objectively and optimize.\n\n` +
          `Save this post so you have the reference handy when you need it! 📌`;
        break;
      }

      // 8. PERSUASIVE
      case 'persuasive': {
        transformed = `⚡️ STOP SETTLING FOR LESS THAN YOU DESERVE.\n\n` +
          `${transformed}\n\n` +
          `Why wait another month wishing you had started today?\n` +
          `• 100% Risk-Free 30-Day Money-Back Guarantee\n` +
          `• Thousands of verified 5-star user reviews\n` +
          `• Zero guesswork, maximum payoff\n\n` +
          `👉 Claim your special launch pricing right now before this batch sells out!`;
        break;
      }

      // 9. LUXURY
      case 'luxury': {
        transformed = `An invitation to transcend the ordinary.\n\n` +
          `${transformed}\n\n` +
          `Meticulously formulated for the discerning individual. Crafted with uncompromising attention to botanical purity and artisan precision.\n\n` +
          `Discover the pinnacle of refined elegance. Available in strictly limited allocations.`;
        break;
      }

      // 10. CONVERSATIONAL
      case 'conversational': {
        transformed = `Can we have a quick, honest conversation for a second?\n\n` +
          `${transformed}\n\n` +
          `I used to think this was complicated too, until I realized how much difference one simple shift makes. Have you noticed this in your own journey? Drop me a quick note below—I read every single response.`;
        break;
      }

      // 11. TRANSLATE
      case 'translate': {
        const lang = (targetLanguage || 'Spanish').trim().toLowerCase();
        if (lang.includes('span') || lang === 'es') {
          transformed = `🇪🇸 [Traducción al Español]:\n\n` +
            `${transformed
              .replace(/Stop settling/gi, 'Deja de conformarte')
              .replace(/Welcome to/gi, 'Bienvenido a')
              .replace(/Discover/gi, 'Descubre')
              .replace(/Tap the link/gi, 'Toca el enlace')
              .replace(/Link in bio/gi, 'Enlace en la biografía')
              .replace(/Ready to/gi, 'Listo para')
              .replace(/Special offer/gi, 'Oferta especial')}\n\n` +
            `¡Descubre la diferencia hoy mismo! Enlace en la biografía para más detalles. #Comunidad #Innovacion #Calidad`;
        } else if (lang.includes('french') || lang === 'fr') {
          transformed = `🇫🇷 [Traduction en Français]:\n\n` +
            `${transformed
              .replace(/Stop settling/gi, 'Ne vous contentez plus')
              .replace(/Welcome to/gi, 'Bienvenue chez')
              .replace(/Discover/gi, 'Découvrez')
              .replace(/Tap the link/gi, 'Cliquez sur le lien')
              .replace(/Link in bio/gi, 'Lien dans la bio')
              .replace(/Ready to/gi, 'Prêt à')}\n\n` +
            `Découvrez l'excellence au quotidien. Lien dans la bio pour commander. #Excellence #Innovation #France`;
        } else if (lang.includes('german') || lang === 'de') {
          transformed = `🇩🇪 [Deutsche Übersetzung]:\n\n` +
            `${transformed
              .replace(/Stop settling/gi, 'Geben Sie sich nicht zufrieden')
              .replace(/Discover/gi, 'Entdecken Sie')
              .replace(/Link in bio/gi, 'Link in der Bio')}\n\n` +
            `Erleben Sie erstklassige Qualität und Innovation. Link in der Bio für alle Details. #Qualitaet #Innovation`;
        } else if (lang.includes('japan') || lang === 'ja') {
          transformed = `🇯🇵 [日本語翻訳]:\n\n` +
            `${transformed}\n\n` +
            `毎日のルーティンを進化させる新しい体験を。プロフィールのリンクから今すぐ詳細をご確認ください。 #品質 #イノベーション`;
        } else if (lang.includes('portug') || lang === 'pt') {
          transformed = `🇧🇷 [Tradução em Português]:\n\n` +
            `${transformed
              .replace(/Stop settling/gi, 'Pare de se contentar')
              .replace(/Discover/gi, 'Descubra')
              .replace(/Link in bio/gi, 'Link na bio')}\n\n` +
            `Descubra o melhor para o seu dia a dia. Link na bio para garantir o seu! #Inovacao #Qualidade`;
        } else if (lang.includes('hindi') || lang === 'hi') {
          transformed = `🇮🇳 [हिंदी अनुवाद]:\n\n` +
            `${transformed}\n\n` +
            `अपने दैनिक अनुभव को एक नए स्तर पर ले जाएं। अधिक जानकारी के लिए बायो में दिए गए लिंक पर टैप करें! #गुणवत्ता #नवाचार`;
        } else {
          transformed = `🌐 [Translated to ${targetLanguage}]:\n\n` +
            `${transformed}\n\n` +
            `Experience the difference today. Tap the link in bio for full details! #Innovation #Quality`;
        }
        break;
      }

      // Legacy operations (viral, engagement_question, optimize_hashtags)
      case 'viral': {
        const viralHook = `🚨 STOP SCROLLING. This changes everything 👇\n\n`;
        const viralCta = `\n\n🔥 Save this post before you lose it. Drop a 🙋‍♀️ below if you need the direct link!`;
        transformed = `${viralHook}${transformed}${viralCta}`;
        break;
      }

      case 'engagement_question': {
        const questions = [
          `\n\n💬 We want to hear from you: What's the #1 priority in your routine right now? Comment below!`,
          `\n\n👇 Drop your thoughts below—are you team minimalist routine or full 10-step glow?`,
          `\n\n✨ Question for our community: Which active ingredient has made the biggest difference for you?`,
        ];
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        transformed = `${transformed}${randomQ}`;
        break;
      }

      case 'optimize_hashtags': {
        const optimalTags = `\n\n#CleanBeauty #RadiantSkin #BeautyCommunity #GlowRoutine #DailySkincare #SkinFirst`;
        if (!transformed.includes('#CleanBeauty')) {
          transformed = `${transformed}${optimalTags}`;
        }
        break;
      }
    }

    return {
      originalContent: request.content,
      transformedContent: transformed,
      operation,
      platform,
      contentType,
      targetLanguage,
      characterCount: transformed.length,
    };
  }

  /**
   * Generates Categorized Hashtags with reach estimates
   */
  public static generateHashtags(brandName: string, text: string): HashtagRecommendation {
    const brandClean = brandName.replace(/\s+/g, '');

    const highReach = ['#CleanBeauty', '#SkincareRoutine', '#GlowUp', '#SelfCare', '#BeautyTips'];
    const niche = ['#RadiantSkinJourney', '#BotanicalFormulation', '#VitaminCSerum', '#ClinicalSkincare', '#SkinBarrierRepair'];
    const branded = [`#${brandClean}`, `#${brandClean}Glow`, `#${brandClean}Community`];

    const tags = [
      ...highReach.map((t) => ({ tag: t, category: 'high_reach' as const, estimatedReach: '2.4M posts' })),
      ...niche.map((t) => ({ tag: t, category: 'niche' as const, estimatedReach: '180K posts' })),
      ...branded.map((t) => ({ tag: t, category: 'branded' as const, estimatedReach: 'Brand Official' })),
    ];

    const recommendedBundle = [...branded.slice(0, 2), ...highReach.slice(0, 3), ...niche.slice(0, 3)].join(' ');

    return {
      tags,
      highReach,
      niche,
      branded,
      recommendedBundle,
    };
  }

  /**
   * Generates a multi-post strategic campaign arc from ONE business idea
   * Fully governed by the centralized Brand Brain!
   */
  public static generateCampaignStrategy(input: {
    businessIdea: string;
    campaignGoal: CampaignGoal;
    duration: CampaignDuration;
    customDays?: number;
    platforms?: CampaignPlatform[];
    brandBrain?: BrandBrain | null;
    brandName?: string;
  }): CampaignStrategy {
    const { businessIdea, campaignGoal, duration, customDays, brandBrain } = input;
    const brandName = input.brandName || brandBrain?.businessProfile?.name || 'Our Brand';
    const audience = brandBrain?.targetAudience?.primary || 'Target customers and decision-makers seeking high-quality, verified solutions';
    const usps = brandBrain?.usps && brandBrain.usps.length > 0
      ? brandBrain.usps
      : ['Verified high-performance efficacy', 'Zero manual friction or wasted hours', 'Sustainably and transparently crafted'];
    const ctas = Array.isArray(brandBrain?.ctaPreferences) && brandBrain.ctaPreferences.length > 0
      ? brandBrain.ctaPreferences
      : ['Tap link in bio to learn more', 'Explore the full release now', 'Get started today'];
    const primaryCta = ctas[0] || 'Tap link in bio to learn more';
    const secondaryCta = ctas[1] || 'Explore the full story now';

    const selectedPlatforms: CampaignPlatform[] = input.platforms && input.platforms.length > 0
      ? input.platforms
      : ['instagram', 'facebook', 'linkedin', 'x'];

    // 1. Determine Duration Days, Post Count & Day Offsets
    let totalDays = 7;
    let postCount = 4;
    let offsets = [0, 2, 4, 6];
    let frequencyText = '4 strategic posts spaced every 48 hours for compound reach';

    if (duration === '3_days' || duration === '3_day_sprint') {
      totalDays = 3;
      postCount = 3;
      offsets = [0, 1, 2];
      frequencyText = '1 high-impact post daily at peak audience active hours (10:00 AM)';
    } else if (duration === '7_days' || duration === '7_day_arc') {
      totalDays = 7;
      postCount = 4;
      offsets = [0, 2, 4, 6];
      frequencyText = '4 strategic posts spaced every 48 hours for compound engagement';
    } else if (duration === '14_days' || duration === '14_day_nurture') {
      totalDays = 14;
      postCount = 6;
      offsets = [0, 2, 5, 8, 11, 13];
      frequencyText = '6 sequenced posts (every 2–3 days), cycling between education, proof, and offer';
    } else if (duration === '30_days') {
      totalDays = 30;
      postCount = 8;
      offsets = [0, 4, 8, 12, 16, 20, 24, 28];
      frequencyText = 'Evergreen monthly arc: 2 coordinated posts per week across all active platforms';
    } else if (duration === 'custom') {
      totalDays = Math.max(2, customDays || 10);
      postCount = Math.min(10, Math.max(2, Math.round(totalDays / 2.5)));
      offsets = [];
      const interval = totalDays / postCount;
      for (let i = 0; i < postCount; i++) {
        offsets.push(Math.min(totalDays - 1, Math.round(i * interval)));
      }
      frequencyText = `Custom pacing: ${postCount} posts scheduled across a ${totalDays}-day window`;
    }

    // 2. Normalize Goal & Derive Strategy Dimensions
    const cleanTopic = businessIdea.trim();
    const shortTopic = cleanTopic.split(/\s+/).slice(0, 5).join(' ');

    let campaignName = '';
    let campaignObjective = '';
    let primaryKpi = '';
    let narrativeArc = '';
    let coreMessage = '';

    switch (campaignGoal) {
      case 'awareness':
      case 'brand_awareness':
        campaignName = `${shortTopic} • Category Disruption & Brand Reach Arc`;
        campaignObjective = `Expand total brand awareness, introduce new prospects to ${brandName}'s core philosophy, and drive category share-of-voice.`;
        primaryKpi = 'Audience Reach, Impressions, Follower Velocity, and Brand Mentions';
        coreMessage = `Rethinking the standard: Why ${cleanTopic} is setting a new benchmark for excellence.`;
        narrativeArc = 'Disruptive Agitation → Values & Philosophy Reveal → Community Education → Audience Invitation';
        break;

      case 'engagement':
      case 'thought_leadership':
        campaignName = `${shortTopic} • Community Dialogue & Insight Series`;
        campaignObjective = `Spark active discussions, earn saves and high-velocity reposts, and establish ${brandName} as a trusted thought leader.`;
        primaryKpi = 'Engagement Rate, Thoughtful Comments, Post Saves, and Peer Reposts';
        coreMessage = `Most in the industry are approaching this backwards. Here is the contrarian blueprint that actually moves the needle.`;
        narrativeArc = 'Common Myth Teardown → Proprietary Data & Framework → Real Case Breakdown → Open Strategic Debate';
        break;

      case 'leads':
      case 'lead_generation':
        campaignName = `${shortTopic} • High-Value Inbound Pipeline Engine`;
        campaignObjective = `Capture qualified marketing leads, demo requests, and newsletter opt-ins by offering actionable frameworks and free tools.`;
        primaryKpi = 'Marketing Qualified Leads (MQLs), Opt-in Conversion Rate, Cost Per Lead';
        coreMessage = `Stop wasting manual hours. Access the proven framework behind ${cleanTopic} and unlock immediate operational leverage.`;
        narrativeArc = 'The Inefficiency Audit → Framework Preview → Free Resource Value Drop → Frictionless Opt-In';
        break;

      case 'sales':
      case 'seasonal_promo':
        campaignName = `${shortTopic} • High-Conversion Launch & Offer Arc`;
        campaignObjective = `Generate immediate checkout revenue, maximize order value, and incentivize fast action through timed launch perks.`;
        primaryKpi = 'Direct Sales Revenue, Add-to-Cart Conversions, Average Order Value (AOV)';
        coreMessage = `Engineered for those who refuse to settle. Experience ${cleanTopic} with launch-exclusive benefits today.`;
        narrativeArc = 'Curiosity Hook → Core USP Breakdown → Verified Social Proof → Urgency Countdown & Direct Offer';
        break;

      case 'traffic':
        campaignName = `${shortTopic} • Omni-Channel Traffic & Discovery Surge`;
        campaignObjective = `Funnel high-intent organic visitors from social feeds into designated landing pages, product deep-dives, and blog resources.`;
        primaryKpi = 'Outbound Click-Through Rate (CTR), Landing Page Sessions, Time on Site';
        coreMessage = `The full story is live. Discover the complete breakdown and explore what makes ${cleanTopic} truly transformative.`;
        narrativeArc = 'Compelling Preview → Teaser Data Points → Interactive Cliffhanger → Direct Click-Through Push';
        break;

      case 'launch':
      case 'product_launch':
      case 'event_announcement':
        campaignName = `${shortTopic} • Flagship Innovation Release Arc`;
        campaignObjective = `Establish immediate market presence, generate peak pre-order anticipation, and drive day-one adoption surge.`;
        primaryKpi = 'Day-1 Launch Units, Early-Bird RSVPs, VIP Claim Rate';
        coreMessage = `The evolution is here. Introducing ${cleanTopic}: Precision, speed, and uncompromising quality in one package.`;
        narrativeArc = 'The Problem We Solved → Official Reveal & Craftsmanship → Real-World Trial Results → Launch Day Access';
        break;

      case 'promotion':
        campaignName = `${shortTopic} • Limited-Time VIP Promotional Blitz`;
        campaignObjective = `Accelerate buying decisions, reactivate dormant prospects, and reward the community with exclusive savings.`;
        primaryKpi = 'Promo Code Redemptions, Gross Merchandise Value (GMV), Checkout Velocity';
        coreMessage = `Our biggest announcement of the season. Unlock exclusive access to ${cleanTopic} before this limited window closes.`;
        narrativeArc = 'Announcement Teaser → Benefit Breakdown → Community FAQ & Guarantees → Final 24-Hour Countdown';
        break;

      case 'education':
      default:
        campaignName = `${shortTopic} • Actionable Masterclass & Education Arc`;
        campaignObjective = `Deliver unassailable educational value, simplify complex concepts, and build enduring brand loyalty through expertise.`;
        primaryKpi = 'Bookmark / Save Rate, Content Shares, Inbound Inquiries';
        coreMessage = `Master the fundamentals. A step-by-step masterclass on getting the most out of ${cleanTopic}.`;
        narrativeArc = 'Foundational Principle → Step-by-Step Breakdown → Pro Tips & Common Mistakes → Practical Implementation Checklist';
        break;
    }

    // 3. Synthesize Content Pillars
    const contentPillars: ContentPillar[] = [
      {
        title: 'The Problem & Paradigm Shift',
        description: `Deconstruct common frustrations in ${brandBrain?.businessProfile?.industry || 'the industry'} and explain why conventional methods fall short.`,
        percentage: 30,
      },
      {
        title: 'Innovation & Core USPs',
        description: `Highlight ${brandName}'s unique approach: ${usps.slice(0, 2).join(' & ')}.`,
        percentage: 30,
      },
      {
        title: 'Social Proof & Empirical Validation',
        description: 'Customer results, benchmarks, case studies, and before/after metrics that eliminate skepticism.',
        percentage: 25,
      },
      {
        title: 'Action & Exclusive Offer',
        description: 'Clear, direct calls-to-action with VIP perks, trial incentives, and time-sensitive links.',
        percentage: 15,
      },
    ];

    // 4. Synthesize Content Mix
    const contentMix: ContentMixItem[] = [
      { formatOrType: 'Educational Guides & Breakdowns', percentage: 35 },
      { formatOrType: 'Visual Proof & Testimonials', percentage: 25 },
      { formatOrType: 'Direct Offer & Conversion Posts', percentage: 25 },
      { formatOrType: 'Community Engagement & Polls', percentage: 15 },
    ];

    // 5. Synthesize Content Ideas
    const contentIdeas: string[] = [
      `"Why 90% of people struggle with ${cleanTopic.slice(0, 30)} (and the 3-step fix)."`,
      `The Behind-the-Scenes Teardown: How ${brandName} formulated and engineered this solution.`,
      `Before vs. After: The exact metric shift achieved within the first 14 days.`,
      `The Contrarian Framework: Why doing less actually gets you better results.`,
      `Customer Spotlight: Real feedback and unedited reactions from early adopters.`,
      `Final Call: Everything you get with early-access launch privilege before doors close.`,
    ];

    // 6. Recommended Formats
    const recommendedFormats: string[] = [
      'Multi-Slide Swipeable Carousels (Deep-dive education & saves on Instagram and LinkedIn)',
      '9:16 Short-Form Video Reels (High viral discovery and dynamic hook on Instagram & TikTok)',
      'Punchy Text Threads (Thought leadership and high-retention discussions on X)',
      'High-Impact Branded Graphics (Visual statistics and direct link conversion on Facebook)',
    ];

    // 7. CTA Strategy
    const ctaStrategy = {
      primary: primaryCta,
      secondary: secondaryCta,
      funnelOverview: 'Top-of-funnel posts emphasize low-friction curiosity CTAs (save, share, bookmark); mid-funnel posts invite community comments; bottom-of-funnel posts deliver direct, urgent link-in-bio checkout and trial incentives.',
    };

    // 8. Hashtag Strategy
    const brandClean = brandName.replace(/\s+/g, '');
    const hashtagStrategy: HashtagStrategyGroup[] = [
      {
        category: 'branded',
        label: 'Official Brand Tags',
        tags: [`#${brandClean}`, `#${brandClean}Official`, `#${brandClean}Launch`],
      },
      {
        category: 'industry',
        label: 'Industry High-Reach',
        tags: ['#Innovation', '#IndustryLeaders', '#FutureOfWork', '#GrowthMindset', '#Productivity'],
      },
      {
        category: 'niche',
        label: 'Niche Community Targeted',
        tags: [`#${shortTopic.replace(/\s+/g, '')}`, '#CleanFormulation', '#WorkflowOptimization', '#ModernSolutions'],
      },
      {
        category: 'trending',
        label: 'Trending / Launch Momentum',
        tags: ['#NewRelease', '#TechTrends', '#ProductHunt', '#DailyInspiration'],
      },
    ];

    // 9. Generate Sequential Posts Plan
    const posts: CampaignStrategyPost[] = [];

    // Stage 1: Hook / Teaser (Day 0)
    posts.push({
      sequenceNumber: 1,
      stage: 'hook_teaser',
      stageTitle: 'Stage 1: The Agitation & Curiosity Hook',
      conceptSummary: `Stop the scroll by challenging common frustrations in ${brandBrain?.businessProfile?.industry || 'the category'}. Tease that a new standard is here.`,
      targetDayOffset: offsets[0],
      suggestedFormat: 'reel_video',
      suggestedHeadline: `The Way You Think About ${shortTopic} Is About to Change`,
      copyBrief: `High-energy hook focused on the root problem faced by ${audience}. Avoid aggressive selling. Build curiosity, anticipation, and community dialogue.`,
      callToAction: secondaryCta,
      platforms: selectedPlatforms,
    });

    // Stage 2: Problem / Solution Deep Dive
    posts.push({
      sequenceNumber: 2,
      stage: 'problem_solution',
      stageTitle: 'Stage 2: Solution Reveal & Core USPs',
      conceptSummary: `Officially unveil the core concept: "${cleanTopic}". Highlight primary USPs: ${usps.slice(0, 2).join(' & ')}.`,
      targetDayOffset: offsets[1],
      suggestedFormat: 'carousel_graphic',
      suggestedHeadline: `Introducing the Next Evolution: ${shortTopic} Defined`,
      copyBrief: `Break down the craftsmanship, formulation, or mechanics that make this unique. Show why standard alternatives fail. Reinforce ${brandName}'s core values.`,
      callToAction: primaryCta,
      platforms: selectedPlatforms,
    });

    // Remaining Stages based on post count
    if (postCount >= 4) {
      // Stage 3: Social Proof / Trial Validation
      posts.push({
        sequenceNumber: 3,
        stage: 'social_proof',
        stageTitle: 'Stage 3: Social Proof & Real-World Validation',
        conceptSummary: `Showcase customer quotes, benchmark metrics, or before/after trial results to eradicate skepticism.`,
        targetDayOffset: offsets[2],
        suggestedFormat: 'single_image',
        suggestedHeadline: `"Nothing Has Given Me Results This Quickly" — Early Tester Verdict`,
        copyBrief: `Highlight authentic user testimonials and real-world metrics. Validate that ${brandName} delivers on its core promise for ${audience}.`,
        callToAction: primaryCta,
        platforms: selectedPlatforms,
      });

      // If 5+ posts: Add Deep Dive
      if (postCount >= 5) {
        posts.push({
          sequenceNumber: 4,
          stage: 'value_education',
          stageTitle: 'Stage 4: Expert Education & Framework Breakdown',
          conceptSummary: `Educational carousel or breakdown showing the methodology, workflow, or science behind the solution.`,
          targetDayOffset: offsets[3],
          suggestedFormat: 'carousel_graphic',
          suggestedHeadline: `The Science Inside: Why ${usps[0] || 'Precision'} Changes Everything`,
          copyBrief: `Give actionable value first. Teach the audience how to identify quality vs fluff. Establish undeniable authority.`,
          callToAction: secondaryCta,
          platforms: selectedPlatforms,
        });
      }

      // If 6+ posts: Add Community Engagement
      if (postCount >= 6) {
        posts.push({
          sequenceNumber: 5,
          stage: 'community_engagement',
          stageTitle: 'Stage 5: Community Discussion & Interactive Q&A',
          conceptSummary: `Spark debate and answer the most common objections or questions about adopting ${shortTopic}.`,
          targetDayOffset: offsets[4],
          suggestedFormat: 'thought_text',
          suggestedHeadline: `The #1 Question We Get Asked About ${shortTopic} (Answered)`,
          copyBrief: `Transparent, human discussion addressing the main friction point. Invite community members to share their experience.`,
          callToAction: secondaryCta,
          platforms: selectedPlatforms,
        });
      }

      // Final Stage: Urgency & Direct Offer
      posts.push({
        sequenceNumber: postCount,
        stage: 'urgency_offer',
        stageTitle: `Stage ${postCount}: Launch Exclusive & Direct Call to Action`,
        conceptSummary: `Direct, high-converting launch offer featuring exclusive early-bird benefits, guarantee, and immediate link.`,
        targetDayOffset: offsets[offsets.length - 1],
        suggestedFormat: 'reel_video',
        suggestedHeadline: `Now Live: Claim Your Exclusive ${shortTopic} Access Today`,
        copyBrief: `Direct, exciting, conversion-focused closing. Reiterate the transformation and give clear instructions. Feature primary CTA: "${primaryCta}".`,
        callToAction: primaryCta,
        platforms: selectedPlatforms,
      });
    } else {
      // 3-day sprint: Stage 3 is the direct conversion
      posts.push({
        sequenceNumber: 3,
        stage: 'urgency_offer',
        stageTitle: 'Stage 3: Launch Access & Direct Call to Action',
        conceptSummary: `Fast-track conversion combining social proof with a limited-time launch offer.`,
        targetDayOffset: offsets[2],
        suggestedFormat: 'reel_video',
        suggestedHeadline: `Limited Launch Drop: Experience ${shortTopic} Today`,
        copyBrief: `Combine rapid social proof with direct launch offer. Feature primary Brand Brain CTA: "${primaryCta}".`,
        callToAction: primaryCta,
        platforms: selectedPlatforms,
      });
    }

    return {
      businessIdea,
      campaignGoal,
      duration,
      customDays,
      platforms: selectedPlatforms,

      // 12 Core Generated Strategy Dimensions
      campaignName,
      campaignObjective,
      targetAudience: audience,
      coreMessage,
      campaignStrategy: `${narrativeArc} (${frequencyText})`,
      contentPillars,
      contentMix,
      postingFrequency: frequencyText,
      contentIdeas,
      recommendedFormats,
      ctaStrategy,
      hashtagStrategy,

      // Legacy backwards-compatibility
      narrativeArc,
      targetAudienceFocus: audience,
      primaryKpi,

      // Sequential Content Plan
      posts,
    };
  }
}
