import crypto from 'crypto';
import { db } from '../../db/connection.js';
import {
  templateService,
  templateRendererService,
  templateValidatorService,
  CANONICAL_PRODUCT_PROMOTION_TEMPLATE,
} from '../templates/index.js';
import { triggerService } from '../automation/trigger.service.js';

export interface SynthesisOptions {
  platforms?: string[];
  templateId?: string;
  requireApproval?: boolean;
  authorId?: string;
  customPrompt?: string;
  autoApprove?: boolean;
  campaignId?: string;
}

export interface SynthesizedPostResult {
  postId: string;
  title: string;
  status: 'draft' | 'in_review' | 'approved';
  marketingObjectId: string;
  objectType: string;
  variants: Array<{
    id: string;
    platform: string;
    caption: string;
    aspectRatio: string;
  }>;
  templateId?: string;
  templateVersion?: number;
  approvalLink?: string;
  provenance: Record<string, any>;
}

export class MarketingObjectSynthesisService {
  /**
   * Synthesizes a multi-platform social post from a normalized marketing object.
   */
  public async synthesizePost(
    tenantId: string,
    brandId: string,
    objectId: string,
    options: SynthesisOptions = {}
  ): Promise<SynthesizedPostResult> {
    if (!tenantId || !brandId || !objectId) {
      throw new Error('tenantId, brandId, and objectId are required.');
    }

    // 1. Fetch marketing object with strict tenant and brand scoping
    const object = await db('marketing_objects')
      .where({
        id: objectId,
        tenant_id: tenantId,
        brand_id: brandId,
      })
      .first();

    if (!object) {
      throw new Error(`Marketing object '${objectId}' not found for tenant and brand.`);
    }

    if (object.status === 'invalid') {
      const errList = typeof object.validation_errors === 'string'
        ? JSON.parse(object.validation_errors)
        : object.validation_errors || [];
      throw new Error(
        `Cannot synthesize post: Marketing object has validation errors: ${JSON.stringify(errList)}`
      );
    }

    const normalizedData = typeof object.normalized_data === 'string'
      ? JSON.parse(object.normalized_data)
      : object.normalized_data || {};

    const properties = typeof object.properties === 'string'
      ? JSON.parse(object.properties)
      : object.properties || {};

    const merged = { ...properties, ...normalizedData };
    const objectType = object.object_type;
    const platforms = options.platforms && options.platforms.length > 0
      ? options.platforms
      : ['facebook', 'instagram'];

    // 2. Synthesize platform copy tailored to the marketing object type
    const copySynthesis = this.generateCopyForObjectType(objectType, merged, platforms, options.customPrompt);

    // 3. Select & render visual template
    const templateSelection = await this.selectAndRenderTemplate(
      tenantId,
      brandId,
      objectType,
      merged,
      copySynthesis,
      options.templateId
    );

    // 4. Policy check for claims and CTA
    this.enforcePolicyGuard(copySynthesis, templateSelection.template);

    // 5. Resolve author
    const authorId = await this.resolveAuthorId(tenantId, options.authorId);

    // 6. Create post with complete lineage
    const postId = crypto.randomUUID();
    const now = new Date();
    const postStatus = options.autoApprove ? 'approved' : options.requireApproval ? 'in_review' : 'draft';

    const provenance = {
      marketingObjectId: object.id,
      objectType,
      source: object.source,
      sourceRecordId: object.source_record_id,
      sourceVersion: object.source_version,
      templateId: templateSelection.template?.id || null,
      templateVersion: templateSelection.versionNumber || 1,
      aiModel: 'SocialForge-MarketingSynthesizer-v3',
      synthesizedAt: now.toISOString(),
      rawProvenance: typeof object.provenance === 'string' ? JSON.parse(object.provenance) : object.provenance || {},
    };

    await db('posts').insert({
      id: postId,
      tenant_id: tenantId,
      brand_id: brandId,
      author_id: authorId,
      campaign_id: options.campaignId || null,
      title: copySynthesis.title,
      base_content: copySynthesis.headline,
      status: postStatus,
      source_record_id: object.source_record_id,
      source_version: object.source_version,
      template_id: templateSelection.template?.id || null,
      template_version: templateSelection.versionNumber || 1,
      provenance: JSON.stringify(provenance),
      created_at: now,
      updated_at: now,
    });

    // 7. Insert post variants
    const variantRecords = copySynthesis.variants.map((v) => ({
      id: crypto.randomUUID(),
      post_id: postId,
      platform: v.platform,
      content: v.caption,
      status: postStatus,
      media_asset_ids: JSON.stringify([]),
      platform_specific_config: JSON.stringify(templateSelection.platformVariants?.[v.platform] || {}),
      created_at: now,
      updated_at: now,
    }));

    if (variantRecords.length > 0) {
      await db('post_variants').insert(variantRecords);
    }

    // 8. Generate approval request if required
    let approvalLink: string | undefined;
    if (options.requireApproval) {
      const approvalId = crypto.randomUUID();
      const magicToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await db('approval_requests').insert({
        id: approvalId,
        post_id: postId,
        requested_by: authorId,
        status: 'pending',
        magic_token: magicToken,
        magic_token_expires_at: expiresAt,
        created_at: now,
      });

      const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:5173';
      approvalLink = `${webAppUrl}/review/${magicToken}`;
    }

    return {
      postId,
      title: copySynthesis.title,
      status: postStatus,
      marketingObjectId: object.id,
      objectType,
      variants: copySynthesis.variants.map((v, idx) => ({
        id: variantRecords[idx]?.id || crypto.randomUUID(),
        platform: v.platform,
        caption: v.caption,
        aspectRatio: v.aspectRatio,
      })),
      templateId: templateSelection.template?.id,
      templateVersion: templateSelection.versionNumber,
      approvalLink,
      provenance,
    };
  }

  /**
   * Batch synthesizes posts for multiple marketing objects.
   */
  public async batchSynthesize(
    tenantId: string,
    brandId: string,
    objectIds: string[],
    options: SynthesisOptions = {}
  ): Promise<SynthesizedPostResult[]> {
    const results: SynthesizedPostResult[] = [];
    for (const id of objectIds) {
      try {
        const res = await this.synthesizePost(tenantId, brandId, id, options);
        results.push(res);
      } catch (err: any) {
        console.error(`[MarketingObjectSynthesisService] Error synthesizing object ${id}:`, err.message);
      }
    }
    return results;
  }

  /**
   * Generates specialized, multi-platform copy based on the marketing object type.
   */
  private generateCopyForObjectType(
    objectType: string,
    data: Record<string, any>,
    platforms: string[],
    customPrompt?: string
  ) {
    let title = 'Exciting Announcement';
    let headline = '';
    let badge = 'FEATURED';
    let ctaText = 'Learn More';
    let igBody = '';
    let fbBody = '';

    switch (objectType) {
      case 'Product': {
        const name = data.name || data.title || 'Exclusive Product';
        const price = data.priceFormatted || data.price || '$49.99';
        const discount = data.discount ? ` (${data.discount} OFF)` : '';
        const desc = data.description || 'Engineered for exceptional daily performance and premium style.';
        title = `${name} Drop`;
        headline = `🔥 ${name} – Now Available for ${price}`;
        badge = data.discount ? String(data.discount).toUpperCase() : 'NEW DROP';
        ctaText = 'Shop Now';
        igBody = `✨ Introducing ${name}! ✨\n\n${desc}\n\n🏷️ Available now for only ${price}${discount}.\n👉 Tap the link in bio to shop now!\n\n#ShopNow #ProductDrop #Innovation #Style #SocialForge`;
        fbBody = `🚀 New Arrival: ${name}\n\n${desc}\n\nGet yours today for just ${price}${discount}! Limited stock available.\n\nShop directly at our official store today.`;
        break;
      }

      case 'Offer': {
        const offerTitle = data.title || data.name || 'Limited Time Offer';
        const code = data.discount_code || data.code || 'SAVE20';
        const val = data.discount_value || data.discount || '20%';
        const end = data.end_date || 'Midnight';
        title = `Special Offer: ${offerTitle}`;
        headline = `⚡ ${val} OFF with code ${code}`;
        badge = `${val} OFF`;
        ctaText = 'Claim Offer';
        igBody = `🎉 EXCLUSIVE SALE! 🎉\n\n${offerTitle}\n\nUse code **${code}** at checkout to unlock **${val} OFF**! Offer ends ${end}.\n\n👉 Tap link in bio to claim your savings now!\n\n#SpecialOffer #Sale #FlashSale #DiscountCode`;
        fbBody = `🎁 Limited Time Special Offer: ${offerTitle}\n\nEnjoy ${val} OFF across our entire collection when you use promo code **${code}**. Don't wait—offer expires ${end}!\n\nClaim your savings now at our store.`;
        break;
      }

      case 'Event': {
        const eventName = data.name || data.title || 'Exclusive Event';
        const time = data.start_time || 'Upcoming';
        const loc = data.location || 'Online';
        title = `Event: ${eventName}`;
        headline = `📅 Join Us for ${eventName}`;
        badge = 'LIVE EVENT';
        ctaText = 'Register Today';
        igBody = `Mark your calendars! 🗓️✨\n\nJoin us for **${eventName}**!\n📍 Where: ${loc}\n🕒 When: ${time}\n\nReserve your spot now via the link in our bio! 🎟️\n\n#LiveEvent #Networking #Community #RegisterNow`;
        fbBody = `Exciting Announcement! We are hosting **${eventName}**.\n\n📍 Location: ${loc}\n⏰ Date & Time: ${time}\n\nSpaces are limited. Register today to secure your attendance!`;
        break;
      }

      case 'Customer Review': {
        const reviewer = data.reviewer_name || 'Verified Customer';
        const rating = data.rating || 5;
        const review = data.review_text || 'Absolutely incredible experience. Exceeded all our expectations!';
        const stars = '⭐'.repeat(Math.min(5, Math.max(1, Number(rating) || 5)));
        title = `5-Star Review from ${reviewer}`;
        headline = `${stars} "${review.slice(0, 50)}..."`;
        badge = `${stars} REVIEW`;
        ctaText = 'Read Reviews';
        igBody = `"${review}"\n\n— ${reviewer} ${stars}\n\nWe love hearing from our wonderful community! Thank you for trusting us with your journey. ❤️\n\n#CustomerLove #5StarReview #Testimonial #HappyClient #SocialProof`;
        fbBody = `${stars} " ${review} "\n\nThank you, ${reviewer}, for this incredible 5-star review! Our team strives to deliver excellence every single day.\n\nDiscover what others are saying and join our happy community today.`;
        break;
      }

      case 'Service': {
        const sName = data.name || 'Professional Service';
        const dur = data.duration_minutes ? ` (${data.duration_minutes} mins)` : '';
        const price = data.priceFormatted || data.price || 'Contact for pricing';
        title = `Service: ${sName}`;
        headline = `⭐ Elevate Your Results with ${sName}`;
        badge = 'TOP SERVICE';
        ctaText = 'Book Now';
        igBody = `Looking to take your results to the next level? ✨\n\nOur **${sName}**${dur} is now open for bookings!\n💼 Starting at: ${price}\n\n👉 Book your session today via link in bio!\n\n#ProfessionalServices #Consulting #Growth #BookNow`;
        fbBody = `Ready for results? Our **${sName}**${dur} is designed to help you succeed effortlessly.\n\nPricing: ${price}\n\nBook your consultation or service slot today to get started.`;
        break;
      }

      case 'Article': {
        const aTitle = data.title || 'Latest Insights';
        const author = data.author ? `by ${data.author}` : '';
        title = `Article: ${aTitle}`;
        headline = `📖 New Read: ${aTitle}`;
        badge = 'MUST READ';
        ctaText = 'Read More';
        igBody = `📚 Fresh off the press! 📚\n\n"${aTitle}" ${author}\n\nDiscover key insights and actionable strategies in our latest release.\n👉 Tap the link in bio to read the full article!\n\n#MustRead #Insights #IndustryTrends #Knowledge`;
        fbBody = `New Article Published: "${aTitle}" ${author}\n\nExplore our latest deep-dive breakdown and practical strategies.\n\nRead the full piece on our official blog now.`;
        break;
      }

      default: {
        const defTitle = data.title || data.name || data.headline || `${objectType} Spotlight`;
        title = `${objectType}: ${defTitle}`;
        headline = `✨ ${defTitle}`;
        badge = objectType.toUpperCase();
        ctaText = 'Learn More';
        igBody = `✨ Spotlight on our latest ${objectType}: **${defTitle}**! ✨\n\nCheck out the full details via the link in our bio.\n\n#${objectType.replace(/\s+/g, '')} #Update #SocialForge`;
        fbBody = `Announcing our latest ${objectType}: **${defTitle}**.\n\nExplore the full details and connect with our team today!`;
        break;
      }
    }

    if (customPrompt) {
      igBody += `\n\n${customPrompt}`;
      fbBody += `\n\n${customPrompt}`;
    }

    const variants = platforms.map((p) => {
      const isIg = p.toLowerCase().includes('instagram');
      return {
        platform: p,
        caption: isIg ? igBody : fbBody,
        aspectRatio: isIg ? '4:5' : '1:1',
      };
    });

    return {
      title,
      headline,
      badge,
      ctaText,
      variants,
    };
  }

  /**
   * Selects and renders the best template for the marketing object.
   */
  private async selectAndRenderTemplate(
    tenantId: string,
    brandId: string,
    objectType: string,
    data: Record<string, any>,
    copy: any,
    explicitTemplateId?: string
  ) {
    let template: any = null;

    if (explicitTemplateId) {
      template = await templateService.getTemplate(tenantId, explicitTemplateId);
    }

    if (!template) {
      if (objectType === 'Product') {
        template = CANONICAL_PRODUCT_PROMOTION_TEMPLATE;
      } else {
        const cat = objectType === 'Offer' ? 'promotion' : 'product_promotion';
        template = await templateService.selectBestTemplate(tenantId, {
          category: cat,
          platform: 'instagram',
          brandId,
        });
      }
    }

    if (!template) {
      template = CANONICAL_PRODUCT_PROMOTION_TEMPLATE;
    }

    const variableContext = {
      product_name: data.name || copy.title,
      price: data.priceFormatted || data.price || '$49.00',
      discount: data.discount || copy.badge || 'SPECIAL OFFER',
      cta_text: copy.ctaText || 'Shop Now',
      image_url: data.image || data.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1080',
      product_description: data.description || '',
      headline: copy.headline,
      topic: copy.title,
    };

    // Render layers
    const rendered = templateRendererService.renderTemplate(template, variableContext);
    const platformVariants = templateService.generatePlatformVariants(rendered);

    // Validate contrast and boundaries
    const valReport = await templateValidatorService.validateTemplate(tenantId, brandId, rendered);
    if (!valReport.isValid) {
      console.warn(`[MarketingObjectSynthesisService] WCAG Warning:`, valReport.errors);
    }

    return {
      template,
      versionNumber: template.activeVersion || 1,
      rendered,
      platformVariants,
    };
  }

  /**
   * Policy guard against deceptive marketing claims and forbidden CTA verbs.
   */
  private enforcePolicyGuard(copy: any, template: any) {
    const prohibited = template?.claimRestrictions || [
      '#1 in the world',
      'guaranteed profit',
      'miracle cure',
      'instant wealth',
      'risk-free',
      'cure all',
    ];

    for (const variant of copy.variants) {
      for (const forbidden of prohibited) {
        if (variant.caption.toLowerCase().includes(forbidden.toLowerCase())) {
          throw new Error(`Marketing claim policy violation: Copy contains prohibited phrase "${forbidden}"`);
        }
      }
    }
  }

  /**
   * Resolves author ID for post records.
   */
  private async resolveAuthorId(tenantId: string, explicitUserId?: string): Promise<string> {
    if (explicitUserId) {
      const u = await db('users').where({ id: explicitUserId }).first();
      if (u) return u.id;
    }

    const tu = await db('tenant_users').where({ tenant_id: tenantId }).first();
    if (tu) return tu.user_id;

    const anyUser = await db('users').first();
    if (anyUser) return anyUser.id;

    const sysId = crypto.randomUUID();
    await db('users').insert({
      id: sysId,
      email: `system-${tenantId.slice(0, 8)}@socialforge.internal`,
      password_hash: '$2b$10$systemplaceholderhash',
      full_name: 'SocialForge Synthesis Bot',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: sysId,
      role: 'creator',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return sysId;
  }

  /**
   * Dispatches automation triggers when a marketing object is created or updated.
   */
  public async triggerAutomationsForMarketingObject(
    tenantId: string,
    brandId: string,
    marketingObject: any,
    eventType: 'created' | 'updated'
  ) {
    try {
      return await triggerService.handleDatasourceChange(
        tenantId,
        marketingObject.source || 'business_data',
        marketingObject.id,
        {
          marketingObjectId: marketingObject.id,
          objectType: marketingObject.object_type,
          sourceRecordId: marketingObject.source_record_id,
          sourceVersion: marketingObject.source_version,
          eventType,
          properties: marketingObject.properties,
          normalizedData: marketingObject.normalized_data,
          status: marketingObject.status,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (err: any) {
      console.warn(`[MarketingObjectSynthesisService] Trigger error:`, err.message);
      return [];
    }
  }
}

export const marketingObjectSynthesisService = new MarketingObjectSynthesisService();
