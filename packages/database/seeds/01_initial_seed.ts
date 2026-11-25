import type { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encryptSecret } from '../../services/cryptoVault.js';

export async function seed(knex: Knex): Promise<void> {
  // Disable foreign key checks for clean truncation in MySQL
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex('analytics_metrics').del();
  await knex('publish_logs').del();
  await knex('approval_comments').del();
  await knex('approval_requests').del();
  await knex('social_accounts').del();
  await knex('post_variants').del();
  await knex('posts').del();
  await knex('campaigns').del();
  await knex('media_assets').del();
  await knex('brand_brains').del();
  await knex('brand_kits').del();
  await knex('brand_users').del();
  await knex('brands').del();
  await knex('tenant_users').del();
  await knex('users').del();
  await knex('tenants').del();
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');

  const masterPasswordHash = await bcrypt.hash('Access@123', 12);
  const defaultPasswordHash = masterPasswordHash;

  // =====================================================================
  // MASTER SUPERADMIN: Hoasp International (singh.ninex@gmail.com)
  // Master user with full, unrestricted view and manage access
  // =====================================================================
  const masterTenantId = crypto.randomUUID();
  await knex('tenants').insert({
    id: masterTenantId,
    name: 'Hoasp International',
    slug: 'hoasp-international',
    subscription_tier: 'enterprise',
    settings: JSON.stringify({ primaryLocale: 'en-US' }),
  });

  const masterUserId = crypto.randomUUID();
  await knex('users').insert({
    id: masterUserId,
    email: 'singh.ninex@gmail.com',
    password_hash: masterPasswordHash,
    full_name: 'Hoasp International Master Admin',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_active: true,
    is_superadmin: true,
  });

  await knex('tenant_users').insert({
    id: crypto.randomUUID(),
    tenant_id: masterTenantId,
    user_id: masterUserId,
    role: 'agency_admin',
  });

  // =====================================================================
  // TENANT A: Apex Digital Agency (Luminary Glow Cosmetics)
  // =====================================================================
  const tenantAId = crypto.randomUUID();
  await knex('tenants').insert({
    id: tenantAId,
    name: 'Apex Digital Agency',
    slug: 'apex-digital',
    subscription_tier: 'agency_pro',
    settings: JSON.stringify({ primaryLocale: 'en-US' }),
  });

  const userAId = masterUserId;

  await knex('tenant_users').insert({
    id: crypto.randomUUID(),
    tenant_id: tenantAId,
    user_id: userAId,
    role: 'agency_admin',
  });

  const brandAId = crypto.randomUUID();
  await knex('brands').insert({
    id: brandAId,
    tenant_id: tenantAId,
    name: 'Luminary Glow Cosmetics',
    slug: 'luminary-glow',
    industry: 'Beauty & Skincare',
    website_url: 'https://luminaryglow.example.com',
    timezone: 'Asia/Kolkata',
  });

  await knex('brand_users').insert({
    id: crypto.randomUUID(),
    brand_id: brandAId,
    user_id: userAId,
    brand_role: 'brand_manager',
  });

  // Brand Kit for Brand A
  await knex('brand_kits').insert({
    id: crypto.randomUUID(),
    brand_id: brandAId,
    tone_of_voice: JSON.stringify({
      formality: 'approachable',
      descriptors: ['radiant', 'empowering', 'clinically proven', 'sophisticated'],
    }),
    target_audiences: JSON.stringify([
      'Women 22-40 interested in clean skincare',
      'Professionals seeking simple daily routines',
    ]),
    primary_colors: JSON.stringify({
      primary: '#E11D48',
      secondary: '#FB7185',
      accent: '#FBBF24',
      background: '#FFF1F2',
      text: '#1E293B',
    }),
    fonts: JSON.stringify({
      heading: 'Playfair Display',
      body: 'Plus Jakarta Sans',
    }),
    logo_urls: JSON.stringify({
      primary: 'https://placehold.co/400x120/E11D48/FFFFFF.png?text=Luminary+Glow',
      icon: 'https://placehold.co/120x120/E11D48/FFFFFF.png?text=LG',
    }),
    hashtags_default: JSON.stringify(['#LuminaryGlow', '#CleanBeauty', '#RadiantSkin', '#GlowRoutine']),
    taboo_words: JSON.stringify(['cheap', 'miracle cure', 'instant fix', 'toxic']),
    disclaimers: 'Dermatologist tested. Individual results may vary.',
    guidelines: 'Always emphasize botanical ingredients backed by clinical formulation.',
  });

  // Centralized 16-Dimension Brand Brain for Brand A
  await knex('brand_brains').insert({
    id: crypto.randomUUID(),
    brand_id: brandAId,
    business_profile: JSON.stringify({
      name: 'Luminary Glow Cosmetics',
      industry: 'Beauty & Skincare',
      tagline: 'Precision Cellular Radiance Driven by Clinical Botany',
      mission: 'To deliver transparent, clinically verified skincare that empowers individuals to embrace their natural glow.',
    }),
    products: JSON.stringify([
      { name: 'Vitamin C Brightening Serum', category: 'Serum', description: '15% active L-ascorbic acid with ferulic acid booster' },
      { name: 'Phyto-Barrier Night Cream', category: 'Moisturizer', description: 'Ceramide-rich lipid restore botanical night balm' },
    ]),
    services: JSON.stringify([
      { name: 'Complimentary Skin Barrier Consultation', description: '15-minute digital skin analysis with licensed aesthetician' },
    ]),
    usps: JSON.stringify([
      '15% active stabilized L-ascorbic acid formulation',
      'Clinically proven brighter skin tone within 14 days',
      '100% recyclable PCR glass packaging with carbon-neutral shipping',
      'Dermatologist tested and Leaping Bunny certified cruelty-free',
      'Zero synthetic fragrances, parabens, or sulfates',
      'Direct-to-consumer transparent formulation pricing',
      'Triple-purified cold-pressed botanical carrier extracts',
    ]),
    target_audience: JSON.stringify({
      primary: 'Discerning skincare enthusiasts aged 24-48 seeking clean, science-backed efficacy',
      demographics: ['Ages 24-48', 'Urban professionals', 'Clean beauty conscious'],
    }),
    pain_points: JSON.stringify([
      'Dull and uneven skin tone from urban pollution',
      'Sensitive skin reacting poorly to synthetic fragrances',
      'Confusing multi-step skincare routines that fail to deliver results',
    ]),
    brand_values: JSON.stringify([
      'Clinical Transparency',
      'Botanical Integrity',
      'Empowered Self-Confidence',
      'Environmental Responsibility',
    ]),
    tone: JSON.stringify({
      formality: 'approachable',
      descriptors: ['radiant', 'empowering', 'clinically proven', 'sophisticated'],
    }),
    writing_style: JSON.stringify({
      guidelines: 'Radiant, empowering, and scientifically precise voice.',
      sentenceStructure: 'balanced',
      vocabularyLevel: 'accessible',
      pointOfView: 'first_person_plural',
    }),
    languages: JSON.stringify(['English (US)']),
    cta_preferences: JSON.stringify([
      'Experience the Clinical Difference • Tap Link in Bio',
      'Reserve your complimentary skin analysis today',
    ]),
    emoji_preferences: JSON.stringify({
      usage: 'moderate',
      signatureEmojis: ['✨', '🌿', '💎', '💫'],
    }),
    hashtag_preferences: JSON.stringify({
      brandTag: '#LuminaryGlow',
      defaultTags: ['#LuminaryGlow', '#CleanBeauty', '#RadiantSkin', '#GlowRoutine'],
      bannedTags: ['#miraclecure', '#instantfix'],
      maxCount: 5,
    }),
    topics_to_avoid: JSON.stringify(['cheap', 'miracle cure', 'instant fix', 'toxic', 'unverified medical claims']),
    visual_identity: JSON.stringify({
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
      logoUrls: {
        primary: 'https://placehold.co/400x120/E11D48/FFFFFF.png?text=Luminary+Glow',
        icon: 'https://placehold.co/120x120/E11D48/FFFFFF.png?text=LG',
      },
    }),
    content_pillars: JSON.stringify([
      { title: 'Clinical Education & Ingredient Science', description: 'Deep-dive chemistry and bio-actives', weightPercentage: 40, sampleTopics: ['Vitamin C stabilization', 'Barrier lipids'] },
      { title: 'Transformation Proof & Community Stories', description: 'Real results and clinical trial data', weightPercentage: 30, sampleTopics: ['14-day trials', 'Customer transformations'] },
      { title: 'Sustainable Botany & Founder Mission', description: 'Zero-waste packaging and clean formulation', weightPercentage: 20, sampleTopics: ['Refillable bottles', 'Cold-pressed extracts'] },
      { title: 'Exclusive Launch Events & VIP Perks', description: 'Product drops and early bird incentives', weightPercentage: 10, sampleTopics: ['VIP code GLOW20', 'Free skin analysis'] },
    ]),
  });

  // Campaign for Brand A: Vitamin C Launch Arc
  const campaignAId = crypto.randomUUID();
  const campaignStrategyA = {
    narrativeArc: '4-Stage Breakthrough Arc: Tease the industry problem → Reveal the solution with clinical botanical USPs → Present early trial validation → Drive launch week urgency.',
    targetAudienceFocus: 'Discerning skincare enthusiasts aged 24-48 seeking clean, science-backed efficacy',
    primaryKpi: 'Early-bird conversions, click-through rate, and launch units sold',
    posts: [
      {
        sequenceNumber: 1,
        stageTitle: 'Stage 1: Hook & Disruptive Teaser',
        suggestedFormat: 'reel_video',
        targetDayOffset: 0,
        suggestedHeadline: 'The Way You Think About Vitamin C Serums Is About to Change',
        conceptSummary: 'Challenge the common misconception that vitamin C must be sticky, unstable, or oxidize quickly.',
        callToAction: 'Tap link in bio to join early access',
      },
      {
        sequenceNumber: 2,
        stageTitle: 'Stage 2: Solution Reveal & Core USPs',
        suggestedFormat: 'carousel_graphic',
        targetDayOffset: 2,
        suggestedHeadline: 'Introducing 15% Active L-Ascorbic Acid with Ferulic Booster',
        conceptSummary: 'Deep-dive carousel showcasing the cold-pressed botanical extraction and triple-stabilized formula.',
        callToAction: 'Experience the Clinical Difference • Tap Link in Bio',
      },
      {
        sequenceNumber: 3,
        stageTitle: 'Stage 3: Social Proof & Real-World Validation',
        suggestedFormat: 'single_image',
        targetDayOffset: 4,
        suggestedHeadline: 'The Verdict Is In: "Nothing Has Given Me Radiance This Quickly"',
        conceptSummary: 'Spotlight on dermatologist clinical trial metrics: 94% noticed tone evening within 14 days.',
        callToAction: 'Reserve your complimentary skin analysis today',
      },
      {
        sequenceNumber: 4,
        stageTitle: 'Stage 4: Launch Exclusive & Direct Call to Action',
        suggestedFormat: 'reel_video',
        targetDayOffset: 6,
        suggestedHeadline: 'Now Live: Claim 20% Off Launch Orders with Code GLOW20',
        conceptSummary: 'Urgent call-to-action video countdown showcasing the limited-edition launch batch.',
        callToAction: 'Experience the Clinical Difference • Tap Link in Bio',
      },
    ],
  };

  await knex('campaigns').insert({
    id: campaignAId,
    brand_id: brandAId,
    name: 'Vitamin C Brightening Launch Arc',
    description: 'Flagship product launch campaign with 20% early-bird code GLOW20 across 4 coordinated narrative stages.',
    status: 'active',
    goal: 'product_launch',
    strategy: JSON.stringify(campaignStrategyA),
    start_date: new Date('2026-09-24T14:00:00.000Z'),
    end_date: new Date('2026-10-01T14:00:00.000Z'),
  });

  // Seed 4 Coordinated Posts for Campaign A
  const post1Id = crypto.randomUUID();
  await knex('posts').insert({
    id: post1Id,
    tenant_id: tenantAId,
    brand_id: brandAId,
    author_id: userAId,
    campaign_id: campaignAId,
    title: 'Stage 1: The Way You Think About Vitamin C Is About to Change',
    base_content: 'Most vitamin C serums oxidize before you even finish the bottle. We spent 18 months formulating a stabilized 15% active L-ascorbic acid that stays crystal clear and radically transforms radiance.',
    status: 'published',
    scheduled_for: new Date('2026-09-24T14:00:00.000Z'),
    published_at: new Date('2026-09-24T14:00:00.000Z'),
  });

  const post2Id = crypto.randomUUID();
  await knex('posts').insert({
    id: post2Id,
    tenant_id: tenantAId,
    brand_id: brandAId,
    author_id: userAId,
    campaign_id: campaignAId,
    title: 'Stage 2: Introducing 15% Active L-Ascorbic Acid with Ferulic Booster',
    base_content: 'Clinical botany meets precision chemistry. 15% active vitamin C paired with ferulic acid booster delivers 8x photoprotection and visible tone evening in 14 days.',
    status: 'scheduled',
    scheduled_for: new Date('2026-09-26T14:00:00.000Z'),
  });

  const post3Id = crypto.randomUUID();
  await knex('posts').insert({
    id: post3Id,
    tenant_id: tenantAId,
    brand_id: brandAId,
    author_id: userAId,
    campaign_id: campaignAId,
    title: 'Stage 3: 94% Reported Noticeable Radiance in 14 Days',
    base_content: 'Real people, verifiable clinical results. 94% of our trial participants noticed visibly brighter skin in two weeks with zero sensitivity or redness.',
    status: 'scheduled',
    scheduled_for: new Date('2026-09-28T14:00:00.000Z'),
  });

  const post4Id = crypto.randomUUID();
  await knex('posts').insert({
    id: post4Id,
    tenant_id: tenantAId,
    brand_id: brandAId,
    author_id: userAId,
    campaign_id: campaignAId,
    title: 'Stage 4: Launch Exclusive: Use Code GLOW20 for 20% Off',
    base_content: 'The wait is over! Our Vitamin C Brightening Serum is officially live. Use code GLOW20 at checkout for 20% off launch orders this week only.',
    status: 'scheduled',
    scheduled_for: new Date('2026-09-30T14:00:00.000Z'),
  });

  // Post Variants for Post 1
  await knex('post_variants').insert([
    {
      id: crypto.randomUUID(),
      post_id: post1Id,
      platform: 'instagram',
      content: 'YOUR GLOW ERA STARTS TODAY ✨🍊\n\nMost vitamin C serums oxidize before you even finish the bottle. We engineered a breakthrough 15% stabilized formula that delivers radiant skin in 14 days without stickiness.\n\nTap link in bio to join VIP early access!\n\n#LuminaryGlow #CleanBeauty #RadiantSkin #GlowRoutine',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'reel_video' }),
      status: 'published',
    },
    {
      id: crypto.randomUUID(),
      post_id: post1Id,
      platform: 'x_twitter',
      content: 'Dull skin? Not on our watch. ✨\n\nOur stabilized 15% Vitamin C Brightening Serum is coming. Zero stickiness, clinically proven radiance in 14 days.\n\nVIP access: https://luminaryglow.example.com\n\n#CleanBeauty #LuminaryGlow',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'short_post' }),
      status: 'published',
    },
    {
      id: crypto.randomUUID(),
      post_id: post1Id,
      platform: 'linkedin',
      content: 'Innovation in modern skincare starts with transparent integrity.\n\nAfter 18 months of clinical formulation, our R&D team has eliminated the traditional oxidation flaws of topical Vitamin C.\n\nKey formulation milestones:\n• 15% stabilized L-ascorbic acid\n• 94% clinical trial satisfaction\n• 100% recyclable glass packaging\n\n#BeautyTech #ProductLaunch #CleanBeauty',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'thought_leadership' }),
      status: 'published',
    },
    {
      id: crypto.randomUUID(),
      post_id: post1Id,
      platform: 'tiktok',
      content: 'Stop scrolling if you want glass skin in 14 days 🍊✨ Link in bio before early access closes! #skintok #cleanbeauty #glassskin #glowroutine #fyp',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'reel_video' }),
      status: 'published',
    },
  ]);

  // Post Variants for Post 2
  await knex('post_variants').insert([
    {
      id: crypto.randomUUID(),
      post_id: post2Id,
      platform: 'instagram',
      content: 'BEHIND THE FORMULATION 🌿\n\nWhy does 15% active L-ascorbic acid paired with ferulic acid matter?\n\n✨ 8x photoprotection boost\n✨ Triple-stabilized cold-pressed botanical carrier\n✨ Lightweight quick-absorbing texture\n\nExperience the Clinical Difference • Tap Link in Bio\n\n#LuminaryGlow #CleanBeauty #RadiantSkin #SkincareScience',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'carousel_graphic' }),
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      post_id: post2Id,
      platform: 'x_twitter',
      content: 'Science meets botanical efficacy. 15% Vitamin C + Ferulic Booster = 8x photoprotection. ✨\n\nRead the formulation breakdown: https://luminaryglow.example.com/science\n\n#CleanBeauty #SkincareScience',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'short_post' }),
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      post_id: post2Id,
      platform: 'linkedin',
      content: 'Formulation transparency is reshaping the luxury cosmetics sector.\n\nHere is how we stabilized high-potency L-ascorbic acid without synthetic preservatives or fillers.\n\n#Biotech #CosmeticsInnovation #CleanFormulation',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'carousel_graphic' }),
      status: 'pending',
    },
    {
      id: crypto.randomUUID(),
      post_id: post2Id,
      platform: 'tiktok',
      content: 'The secret ingredient dermatologists actually swear by for glowing skin ✨ #skintok #dermatology #glowup #skincaretips',
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify({ suggestedFormat: 'reel_video' }),
      status: 'pending',
    },
  ]);

  // Seed 4 Mock Sandbox Channels for Brand A
  const sandboxChannelsA = [
    {
      platform: 'instagram',
      name: 'Luminary Glow Official (Sandbox)',
      handle: '@luminaryglow',
      followers: 84200,
      avatar: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150',
    },
    {
      platform: 'x_twitter',
      name: 'Luminary Glow Cosmetics (Sandbox)',
      handle: '@luminaryglow',
      followers: 42100,
      avatar: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150',
    },
    {
      platform: 'linkedin',
      name: 'Luminary Glow Cosmetics Corp (Sandbox)',
      handle: 'luminary-glow-cosmetics',
      followers: 18400,
      avatar: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150',
    },
    {
      platform: 'tiktok',
      name: 'Luminary Glow Skincare (Sandbox)',
      handle: '@luminaryglowbeauty',
      followers: 125000,
      avatar: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=150',
    },
  ];

  for (const ch of sandboxChannelsA) {
    const cleanAccountId = `sb_${ch.platform}_luminary-glow`;
    const token = `sandbox_oauth_${ch.platform}_${crypto.randomBytes(16).toString('hex')}`;
    const encryptedAccessToken = encryptSecret(token);
    const encryptedRefreshToken = encryptSecret(`refresh_${token}`);

    await knex('social_accounts').insert({
      id: crypto.randomUUID(),
      brand_id: brandAId,
      platform: ch.platform,
      account_name: ch.name,
      account_id: cleanAccountId,
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      is_active: true,
      metadata: JSON.stringify({
        handle: ch.handle,
        avatarUrl: ch.avatar,
        followerCount: ch.followers,
        isSandbox: true,
        profileUrl: `https://${ch.platform}.com/${ch.handle.replace('@', '')}`,
      }),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // =====================================================================
  // TENANT B: Nexus Audio Group (Echo Sound Labs) - Multi-Tenant Isolation
  // =====================================================================
  const tenantBId = crypto.randomUUID();
  await knex('tenants').insert({
    id: tenantBId,
    name: 'Nexus Media Group',
    slug: 'nexus-media',
    subscription_tier: 'creator_pro',
    settings: JSON.stringify({ primaryLocale: 'en-US' }),
  });

  const userBId = crypto.randomUUID();
  await knex('users').insert({
    id: userBId,
    email: 'alex@nexus.com',
    password_hash: defaultPasswordHash,
    full_name: 'Alex Vance',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    is_active: true,
  });

  await knex('tenant_users').insert({
    id: crypto.randomUUID(),
    tenant_id: tenantBId,
    user_id: userBId,
    role: 'agency_admin',
  });

  const brandBId = crypto.randomUUID();
  await knex('brands').insert({
    id: brandBId,
    tenant_id: tenantBId,
    name: 'Echo Sound Labs',
    slug: 'echo-sound-labs',
    industry: 'Consumer Audio & Tech',
    website_url: 'https://echosound.example.com',
    timezone: 'America/Los_Angeles',
  });

  await knex('brand_users').insert({
    id: crypto.randomUUID(),
    brand_id: brandBId,
    user_id: userBId,
    brand_role: 'brand_manager',
  });

  await knex('brand_kits').insert({
    id: crypto.randomUUID(),
    brand_id: brandBId,
    tone_of_voice: JSON.stringify({
      formality: 'conversational',
      descriptors: ['dynamic', 'precise', 'audiophile', 'cutting-edge'],
    }),
    target_audiences: JSON.stringify([
      'Audiophiles and music producers',
      'Remote workers seeking active noise cancellation',
    ]),
    primary_colors: JSON.stringify({
      primary: '#06B6D4',
      secondary: '#3B82F6',
      accent: '#F59E0B',
      background: '#0F172A',
      text: '#F8FAFC',
    }),
    fonts: JSON.stringify({
      heading: 'Outfit',
      body: 'Plus Jakarta Sans',
    }),
    logo_urls: JSON.stringify({
      primary: 'https://placehold.co/400x120/06B6D4/FFFFFF.png?text=Echo+Sound',
      icon: 'https://placehold.co/120x120/06B6D4/FFFFFF.png?text=ES',
    }),
    hashtags_default: JSON.stringify(['#EchoSound', '#Audiophile', '#HiResAudio', '#SoundEngineering']),
    taboo_words: JSON.stringify(['tinny', 'cheap headphones', 'distorted']),
    disclaimers: 'Frequency response tested in anechoic chamber. IPX5 water resistance certified.',
    guidelines: 'Emphasize acoustic clarity, spatial soundstages, and premium machined aluminum craftsmanship.',
  });

  console.log('MySQL Seed completed successfully!');
  console.log(`  Master Superadmin: singh.ninex@gmail.com / Access@123 (Full Master Platform Access)`);
  console.log(`  Tenant: Hoasp International (${masterTenantId})`);
  console.log(`  Tenant A: Apex Digital Agency (${tenantAId}) -> Brand: Luminary Glow Cosmetics (${brandAId})`);
  console.log(`  Tenant B: Nexus Media Group (${tenantBId}) -> Brand: Echo Sound Labs (${brandBId})`);
}
