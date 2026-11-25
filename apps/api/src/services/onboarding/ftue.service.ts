import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { connectionService } from '../connections/connection.service.js';
import { EmailMarketingService } from '../emailMarketing/emailMarketing.service.js';

export interface FtueActivityMap {
  role_selected: boolean;
  workspace_created: boolean;
  brand_configured: boolean;
  channels_connected: boolean;
  first_post_created: boolean;
  first_post_scheduled: boolean;
  analytics_explored: boolean;
}

export type FtueStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PARTIALLY_COMPLETED' | 'COMPLETED';
export type DashboardLifecycleState = 'FIRST_TIME' | 'GETTING_STARTED' | 'ACTIVE';

export interface RolePreset {
  role: string;
  label: string;
  description: string;
  focusAreas: string[];
  recommendedObjective: string;
  defaultTabs: string[];
}

export const ROLE_PRESETS: Record<string, RolePreset> = {
  business_owner: {
    role: 'business_owner',
    label: 'Business Owner',
    description: 'Grow your business with hands-off marketing, high-converting posts, and lead generation.',
    focusAreas: ['Brand Setup', 'Channel Connections', 'Content Creation', 'Revenue Insights'],
    recommendedObjective: 'manage_social',
    defaultTabs: ['dashboard', 'studio', 'channels', 'analytics'],
  },
  marketing_manager: {
    role: 'marketing_manager',
    label: 'Marketing Manager',
    description: 'Orchestrate multi-brand marketing arcs, campaign calendars, and team approval gates.',
    focusAreas: ['Campaign Arcs', 'Content Calendars', 'Team Approvals', 'Unified Analytics'],
    recommendedObjective: 'run_campaigns',
    defaultTabs: ['dashboard', 'campaigns', 'calendar', 'approvals', 'analytics'],
  },
  social_media_manager: {
    role: 'social_media_manager',
    label: 'Social Media Manager',
    description: 'Schedule multi-network reels, stories, and carousel feeds with automated hashtag boosters.',
    focusAreas: ['Social Connections', 'Multi-Network Publishing', 'Visual Calendar', 'Community Engagement'],
    recommendedObjective: 'manage_social',
    defaultTabs: ['dashboard', 'channels', 'studio', 'calendar'],
  },
  marketing_agency: {
    role: 'marketing_agency',
    label: 'Marketing Agency',
    description: 'Manage unlimited client brands, white-label portals, client approval links, and team workspaces.',
    focusAreas: ['Multi-Brand Contexts', 'Client Magic Links', 'Team RBAC Roles', 'Client Deliverables'],
    recommendedObjective: 'manage_brands',
    defaultTabs: ['dashboard', 'brands', 'approvals', 'team', 'analytics'],
  },
  content_creator: {
    role: 'content_creator',
    label: 'Content Creator',
    description: 'Turn ideas into high-engagement viral copy, AI graphic designs, and video reels.',
    focusAreas: ['Content Studio', 'AI Copywriter', 'Canva Design', 'Reel Motion Studio'],
    recommendedObjective: 'create_content',
    defaultTabs: ['dashboard', 'studio', 'canva', 'reels', 'media'],
  },
  other: {
    role: 'other',
    label: 'Other Professional',
    description: 'Automate digital marketing workflows, omnichannel broadcasts, and brand growth.',
    focusAreas: ['General Marketing', 'Social Publishing', 'Automations', 'Analytics'],
    recommendedObjective: 'automate',
    defaultTabs: ['dashboard', 'studio', 'channels', 'analytics'],
  },
};

export class FtueService {
  /**
   * 1. getOrCreateFtueState()
   * Retrieves or initializes persistent FTUE record and determines dashboard lifecycle state.
   */
  public static async getOrCreateFtueState(tenantId: string, userId: string) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');

    let row = await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .first();

    const now = new Date();

    if (!row) {
      const newId = crypto.randomUUID();
      const initialActivities: FtueActivityMap = {
        role_selected: false,
        workspace_created: false,
        brand_configured: false,
        channels_connected: false,
        first_post_created: false,
        first_post_scheduled: false,
        analytics_explored: false,
      };

      await db('user_onboarding_progress').insert({
        id: newId,
        user_id: userId,
        tenant_id: tenantId,
        status: 'NOT_STARTED',
        selected_role: null,
        primary_objective: null,
        current_step: 1,
        completed_steps: JSON.stringify([]),
        activities: JSON.stringify(initialActivities),
        started_at: now,
        created_at: now,
        updated_at: now,
      });

      // Track onboarding started event
      await this.logEvent(tenantId, userId, 'onboarding_started', 1, {
        initialStatus: 'NOT_STARTED',
      });

      row = await db('user_onboarding_progress').where({ id: newId }).first();
    }

    // Inspect actual DB assets to sync activities
    const brands = await db('brands').where({ tenant_id: tenantId });
    const brand = brands[0] || null;
    let brandKit: any = null;
    if (brand) {
      brandKit = await db('brand_kits').where({ brand_id: brand.id }).first();
    }

    const socialConnections = await db('social_connections')
      .where({ tenant_id: tenantId })
      .andWhereNot({ status: 'DISCONNECTED' });

    const posts = brand
      ? await db('posts').where({ brand_id: brand.id })
      : await db('posts').where({ tenant_id: tenantId }).limit(10);

    const scheduledOrPublished = posts.filter(
      (p) => p.status === 'scheduled' || p.status === 'published'
    );

    // Parse activities
    let activities: FtueActivityMap = typeof row.activities === 'string'
      ? JSON.parse(row.activities)
      : (row.activities || {});

    let completedSteps: string[] = typeof row.completed_steps === 'string'
      ? JSON.parse(row.completed_steps)
      : (row.completed_steps || []);

    let stateUpdated = false;

    if (row.selected_role && !activities.role_selected) {
      activities.role_selected = true;
      if (!completedSteps.includes('welcome')) completedSteps.push('welcome');
      stateUpdated = true;
    }

    if (brand && !activities.workspace_created) {
      activities.workspace_created = true;
      if (!completedSteps.includes('workspace')) completedSteps.push('workspace');
      stateUpdated = true;
    }

    if (brandKit && !activities.brand_configured) {
      activities.brand_configured = true;
      if (!completedSteps.includes('brand')) completedSteps.push('brand');
      stateUpdated = true;
    }

    if (socialConnections.length > 0 && !activities.channels_connected) {
      activities.channels_connected = true;
      if (!completedSteps.includes('channels')) completedSteps.push('channels');
      stateUpdated = true;
    }

    if (posts.length > 0 && !activities.first_post_created) {
      activities.first_post_created = true;
      if (!completedSteps.includes('first_post')) completedSteps.push('first_post');
      stateUpdated = true;
    }

    if (scheduledOrPublished.length > 0 && !activities.first_post_scheduled) {
      activities.first_post_scheduled = true;
      if (!completedSteps.includes('schedule')) completedSteps.push('schedule');
      stateUpdated = true;
    }

    // Determine status & current step
    let status: FtueStatus = row.status as FtueStatus;
    if (completedSteps.length >= 6 || (activities.first_post_scheduled && activities.channels_connected)) {
      status = 'COMPLETED';
    } else if (completedSteps.length > 0) {
      status = 'IN_PROGRESS';
    }

    let calculatedStep = 1;
    if (activities.role_selected) calculatedStep = 2;
    if (activities.workspace_created) calculatedStep = 3;
    if (activities.brand_configured) calculatedStep = 4;
    if (activities.channels_connected) calculatedStep = 5;
    if (activities.first_post_created) calculatedStep = 6;

    if (stateUpdated || status !== row.status || calculatedStep !== row.current_step) {
      await db('user_onboarding_progress')
        .where({ id: row.id })
        .update({
          status,
          current_step: calculatedStep,
          completed_steps: JSON.stringify(completedSteps),
          activities: JSON.stringify(activities),
          brand_id: brand ? brand.id : row.brand_id,
          first_post_id: posts[0] ? posts[0].id : row.first_post_id,
          first_value_at: scheduledOrPublished[0] && !row.first_value_at ? now : row.first_value_at,
          completed_at: status === 'COMPLETED' && !row.completed_at ? now : row.completed_at,
          updated_at: now,
        });

      row = await db('user_onboarding_progress').where({ id: row.id }).first();
    }

    // Determine Lifecycle State for Dashboard
    let lifecycleState: DashboardLifecycleState = 'FIRST_TIME';
    if (scheduledOrPublished.length >= 3 || (posts.length >= 5 && socialConnections.length >= 2)) {
      lifecycleState = 'ACTIVE';
    } else if (socialConnections.length > 0 || posts.length > 0 || status === 'COMPLETED') {
      lifecycleState = 'GETTING_STARTED';
    } else {
      lifecycleState = 'FIRST_TIME';
    }

    // Determine Next Best Action
    let nextBestAction = {
      title: 'Select Role & Setup Goals',
      message: 'Choose your marketing role and primary objective to personalize your workspace.',
      actionTab: 'onboarding',
      stepNumber: 1,
    };

    if (!activities.role_selected) {
      nextBestAction = {
        title: 'Choose Your Role',
        message: 'Select your role and goals to customize your social publishing workflow.',
        actionTab: 'onboarding',
        stepNumber: 1,
      };
    } else if (!activities.workspace_created) {
      nextBestAction = {
        title: 'Set Up Your Workspace',
        message: 'Name your brand and define your primary industry sector.',
        actionTab: 'onboarding',
        stepNumber: 2,
      };
    } else if (!activities.brand_configured) {
      nextBestAction = {
        title: 'Configure Brand Identity',
        message: 'Complete your Brand Kit colors and tone of voice to generate on-brand copy.',
        actionTab: 'onboarding',
        stepNumber: 3,
      };
    } else if (!activities.channels_connected) {
      nextBestAction = {
        title: 'Connect Social Channels',
        message: 'Connect your Instagram, Facebook, X, or LinkedIn account to start publishing.',
        actionTab: 'channels',
        stepNumber: 4,
      };
    } else if (!activities.first_post_created) {
      nextBestAction = {
        title: 'Create Your First Post',
        message: 'Draft your first high-impact social media post with AI assistance.',
        actionTab: 'studio',
        stepNumber: 5,
      };
    } else if (!activities.first_post_scheduled) {
      nextBestAction = {
        title: 'Schedule or Publish Post',
        message: 'Publish your draft live to connected feeds or schedule it on the visual calendar.',
        actionTab: 'calendar',
        stepNumber: 6,
      };
    } else {
      nextBestAction = {
        title: 'Explore Marketing Analytics',
        message: 'Track audience reach, engagement trends, and viral score predictions.',
        actionTab: 'analytics',
        stepNumber: 7,
      };
    }

    // Role preset info
    const rolePreset = row.selected_role ? ROLE_PRESETS[row.selected_role] || ROLE_PRESETS.other : null;

    // Check if user is first time login
    const user = await db('users').where({ id: userId }).first();
    const isFirstLogin = Boolean(user && (!user.last_login_at || posts.length === 0));

    return {
      success: true,
      data: {
        id: row.id,
        userId,
        tenantId,
        status,
        lifecycleState,
        isFirstLogin,
        currentStep: row.current_step,
        completedSteps,
        activities,
        selectedRole: row.selected_role,
        primaryObjective: row.primary_objective,
        rolePreset,
        workspaceName: row.workspace_name || brand?.name || 'Workspace',
        brand: brand
          ? {
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              industry: brand.industry,
              websiteUrl: brand.website_url,
            }
          : null,
        brandKit: brandKit
          ? {
              primaryColors: typeof brandKit.primary_colors === 'string' ? JSON.parse(brandKit.primary_colors) : brandKit.primary_colors,
              toneOfVoice: typeof brandKit.tone_of_voice === 'string' ? JSON.parse(brandKit.tone_of_voice) : brandKit.tone_of_voice,
              logoUrls: typeof brandKit.logo_urls === 'string' ? JSON.parse(brandKit.logo_urls) : brandKit.logo_urls,
            }
          : null,
        counts: {
          brands: brands.length,
          connectedChannels: socialConnections.length,
          draftPosts: posts.filter((p) => p.status === 'draft').length,
          scheduledPosts: posts.filter((p) => p.status === 'scheduled').length,
          publishedPosts: posts.filter((p) => p.status === 'published').length,
          totalPosts: posts.length,
        },
        nextBestAction,
        startedAt: row.started_at,
        firstValueAt: row.first_value_at,
        completedAt: row.completed_at,
      },
    };
  }

  /**
   * 2. saveRoleAndObjective()
   */
  public static async saveRoleAndObjective(
    tenantId: string,
    userId: string,
    role: string,
    objective: string
  ) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');
    if (!role) throw new Error('Role is required');

    const state = await this.getOrCreateFtueState(tenantId, userId);
    const completedSteps: string[] = state.data.completedSteps.includes('welcome')
      ? state.data.completedSteps
      : [...state.data.completedSteps, 'welcome'];

    const activities: FtueActivityMap = {
      ...state.data.activities,
      role_selected: true,
    };

    const now = new Date();
    await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .update({
        selected_role: role,
        primary_objective: objective || null,
        current_step: 2,
        status: 'IN_PROGRESS',
        completed_steps: JSON.stringify(completedSteps),
        activities: JSON.stringify(activities),
        updated_at: now,
      });

    await this.logEvent(tenantId, userId, 'role_selected', 1, {
      role,
      objective,
    });

    return this.getOrCreateFtueState(tenantId, userId);
  }

  /**
   * 3. saveWorkspaceSetup()
   */
  public static async saveWorkspaceSetup(
    tenantId: string,
    userId: string,
    payload: {
      workspaceName: string;
      brandName: string;
      industry: string;
      websiteUrl?: string;
      description?: string;
      targetAudience?: string;
      location?: string;
      logoUrl?: string;
    }
  ) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');
    if (!payload.workspaceName?.trim()) throw new Error('Workspace name is required');
    if (!payload.brandName?.trim()) throw new Error('Brand name is required');
    if (!payload.industry?.trim()) throw new Error('Industry is required');

    const baseSlug = payload.brandName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `brand-${Date.now()}`;

    let brand = await db('brands').where({ tenant_id: tenantId, name: payload.brandName }).first();
    const now = new Date();

    if (!brand) {
      const brandId = crypto.randomUUID();
      await db('brands').insert({
        id: brandId,
        tenant_id: tenantId,
        name: payload.brandName.trim(),
        slug: baseSlug,
        industry: payload.industry,
        website_url: payload.websiteUrl?.trim() || null,
        timezone: 'UTC',
        created_at: now,
        updated_at: now,
      });

      // Link brand user
      await db('brand_users').insert({
        id: crypto.randomUUID(),
        brand_id: brandId,
        user_id: userId,
        brand_role: 'brand_manager',
      });

      brand = await db('brands').where({ id: brandId }).first();
    } else {
      await db('brands')
        .where({ id: brand.id })
        .update({
          industry: payload.industry,
          website_url: payload.websiteUrl?.trim() || brand.website_url,
          updated_at: now,
        });
    }

    // Update tenant workspace name if applicable
    await db('tenants')
      .where({ id: tenantId })
      .update({
        name: payload.workspaceName.trim(),
        updated_at: now,
      });

    const state = await this.getOrCreateFtueState(tenantId, userId);
    const completedSteps: string[] = state.data.completedSteps.includes('workspace')
      ? state.data.completedSteps
      : [...state.data.completedSteps, 'workspace'];

    const activities: FtueActivityMap = {
      ...state.data.activities,
      workspace_created: true,
    };

    await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .update({
        workspace_name: payload.workspaceName.trim(),
        brand_id: brand.id,
        current_step: 3,
        status: 'IN_PROGRESS',
        completed_steps: JSON.stringify(completedSteps),
        activities: JSON.stringify(activities),
        updated_at: now,
      });

    await this.logEvent(tenantId, userId, 'workspace_created', 2, {
      workspaceName: payload.workspaceName,
      brandId: brand.id,
      industry: payload.industry,
    });

    return this.getOrCreateFtueState(tenantId, userId);
  }

  /**
   * 4. saveBrandKit()
   */
  public static async saveBrandKit(
    tenantId: string,
    userId: string,
    payload: {
      brandId: string;
      logoUrl?: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      description?: string;
      brandVoice: string;
      communicationTone?: string;
      defaultHashtags?: string[];
      language?: string;
    }
  ) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');
    if (!payload.brandId) throw new Error('brandId is required');

    const brand = await db('brands').where({ id: payload.brandId, tenant_id: tenantId }).first();
    if (!brand) throw new Error('Brand not found for this workspace');

    const now = new Date();
    const existingKit = await db('brand_kits').where({ brand_id: brand.id }).first();

    const colorsObj = {
      primary: payload.primaryColor || '#6366F1',
      secondary: payload.secondaryColor || '#EC4899',
      accent: payload.accentColor || '#10B981',
      background: '#0F172A',
      text: '#F8FAFC',
    };

    const toneObj = {
      formality: payload.communicationTone || 'approachable',
      descriptors: [payload.brandVoice || 'Inspirational'],
    };

    const logoObj = {
      primary: payload.logoUrl || null,
      icon: payload.logoUrl || null,
      dark_mode: null,
    };

    if (existingKit) {
      await db('brand_kits')
        .where({ id: existingKit.id })
        .update({
          primary_colors: JSON.stringify(colorsObj),
          tone_of_voice: JSON.stringify(toneObj),
          logo_urls: JSON.stringify(logoObj),
          hashtags_default: JSON.stringify(payload.defaultHashtags || []),
          updated_at: now,
        });
    } else {
      await db('brand_kits').insert({
        id: crypto.randomUUID(),
        brand_id: brand.id,
        primary_colors: JSON.stringify(colorsObj),
        tone_of_voice: JSON.stringify(toneObj),
        target_audiences: JSON.stringify(['General Audience', 'Brand Followers']),
        fonts: JSON.stringify({ heading: 'Inter', body: 'Inter' }),
        logo_urls: JSON.stringify(logoObj),
        hashtags_default: JSON.stringify(payload.defaultHashtags || []),
        taboo_words: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      });
    }

    const state = await this.getOrCreateFtueState(tenantId, userId);
    const completedSteps: string[] = state.data.completedSteps.includes('brand')
      ? state.data.completedSteps
      : [...state.data.completedSteps, 'brand'];

    const activities: FtueActivityMap = {
      ...state.data.activities,
      brand_configured: true,
    };

    await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .update({
        current_step: 4,
        status: 'IN_PROGRESS',
        completed_steps: JSON.stringify(completedSteps),
        activities: JSON.stringify(activities),
        updated_at: now,
      });

    await this.logEvent(tenantId, userId, 'brand_kit_completed', 3, {
      brandId: brand.id,
      brandVoice: payload.brandVoice,
      primaryColor: payload.primaryColor,
    });

    return this.getOrCreateFtueState(tenantId, userId);
  }

  /**
   * 5. generateBrandAi()
   * Generates suggested brand kit and identity from URL, business name, and sector.
   */
  public static async generateBrandAi(
    websiteUrl?: string,
    businessName?: string,
    industry?: string
  ) {
    const name = businessName || 'HoaspForge Partner';
    const sector = industry || 'Technology & Digital Marketing';

    // Industry color schemes
    const palettes: Record<string, { primary: string; secondary: string; accent: string }> = {
      'SaaS & Digital Marketing': { primary: '#6366F1', secondary: '#EC4899', accent: '#10B981' },
      'E-commerce & Retail': { primary: '#EF4444', secondary: '#F59E0B', accent: '#3B82F6' },
      'Healthcare & Wellness': { primary: '#0D9488', secondary: '#06B6D4', accent: '#10B981' },
      'Finance & FinTech': { primary: '#0284C7', secondary: '#1E293B', accent: '#F59E0B' },
      'Real Estate': { primary: '#B45309', secondary: '#1F2937', accent: '#D97706' },
      'Entertainment & Media': { primary: '#8B5CF6', secondary: '#D946EF', accent: '#F43F5E' },
    };

    const chosenPalette = palettes[sector] || { primary: '#4F46E5', secondary: '#7C3AED', accent: '#06B6D4' };

    const cleanDomain = websiteUrl ? websiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') : '';
    const description = `Empowering modern brands with AI-driven social growth, omnichannel marketing distribution, and high-conversion customer engagement across digital platforms.`;

    const hashtags = [
      `#${name.replace(/[^a-zA-Z0-9]/g, '')}`,
      `#${sector.split('&')[0].trim().replace(/[^a-zA-Z0-9]/g, '')}`,
      '#DigitalGrowth',
      '#MarketingStrategy',
      '#BrandBuilding',
      '#SocialMediaSuccess',
      '#ContentCreation',
      '#BusinessLeadership',
    ];

    return {
      success: true,
      data: {
        suggestedName: name,
        websiteUrl: websiteUrl || (cleanDomain ? `https://${cleanDomain}` : ''),
        industry: sector,
        description,
        primaryColor: chosenPalette.primary,
        secondaryColor: chosenPalette.secondary,
        accentColor: chosenPalette.accent,
        brandVoice: 'Inspirational',
        communicationTone: 'Conversational',
        defaultHashtags: hashtags,
        targetAudiences: ['Digital Creators & Founders', 'Industry Professionals', 'Prospective Customers'],
      },
    };
  }

  /**
   * 6. createFirstPost()
   * Creates the user's initial post across selected platforms.
   */
  public static async createFirstPost(
    tenantId: string,
    userId: string,
    payload: {
      brandId: string;
      creationMethod: 'ai' | 'manual' | 'template';
      topic?: string;
      title: string;
      content: string;
      platforms: string[];
      mediaUrls?: string[];
      hashtags?: string[];
      scheduledFor?: string;
      status?: 'draft' | 'scheduled' | 'published';
    }
  ) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');
    if (!payload.brandId) throw new Error('brandId is required');
    if (!payload.content?.trim()) throw new Error('Post content is required');

    const brand = await db('brands').where({ id: payload.brandId, tenant_id: tenantId }).first();
    if (!brand) throw new Error('Brand not found');

    const postId = crypto.randomUUID();
    const now = new Date();
    const platforms = payload.platforms?.length ? payload.platforms : ['instagram', 'facebook', 'linkedin'];
    const title = payload.title?.trim() || `${brand.name} — First Announcement`;

    await db.transaction(async (trx) => {
      // 1. Insert into posts
      await trx('posts').insert({
        id: postId,
        tenant_id: tenantId,
        brand_id: brand.id,
        author_id: userId,
        title,
        base_content: payload.content.trim(),
        status: payload.status || 'draft',
        scheduled_for: payload.scheduledFor ? new Date(payload.scheduledFor) : null,
        created_at: now,
        updated_at: now,
      });

      // 2. Insert platform-specific variants
      for (const platform of platforms) {
        const variantContent = payload.hashtags?.length
          ? `${payload.content.trim()}\n\n${payload.hashtags.join(' ')}`
          : payload.content.trim();

        await trx('post_variants').insert({
          id: crypto.randomUUID(),
          post_id: postId,
          platform,
          content: variantContent,
          media_asset_ids: JSON.stringify(payload.mediaUrls || []),
          platform_specific_config: JSON.stringify({}),
          status: payload.status || 'draft',
          created_at: now,
          updated_at: now,
        });
      }
    });

    const state = await this.getOrCreateFtueState(tenantId, userId);
    const completedSteps: string[] = state.data.completedSteps.includes('first_post')
      ? state.data.completedSteps
      : [...state.data.completedSteps, 'first_post'];

    const activities: FtueActivityMap = {
      ...state.data.activities,
      first_post_created: true,
    };

    await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .update({
        first_post_id: postId,
        current_step: 6,
        status: 'IN_PROGRESS',
        completed_steps: JSON.stringify(completedSteps),
        activities: JSON.stringify(activities),
        updated_at: now,
      });

    await this.logEvent(tenantId, userId, 'first_post_created', 5, {
      postId,
      creationMethod: payload.creationMethod,
      platforms,
      hasMedia: Boolean(payload.mediaUrls?.length),
    });

    const createdPost = await db('posts').where({ id: postId }).first();
    const variants = await db('post_variants').where({ post_id: postId });

    return {
      success: true,
      data: {
        post: createdPost,
        variants,
      },
    };
  }

  /**
   * 7. scheduleOrPublishFirstPost()
   * Executes scheduled or published transition for the first post.
   */
  public static async scheduleOrPublishFirstPost(
    tenantId: string,
    userId: string,
    payload: {
      postId: string;
      brandId: string;
      action: 'publish_now' | 'schedule' | 'save_draft';
      scheduledAt?: string;
      timezone?: string;
      platformAccountIds?: string[];
    }
  ) {
    if (!tenantId || !userId) throw new Error('tenantId and userId are required');
    if (!payload.postId) throw new Error('postId is required');

    const post = await db('posts')
      .where({ id: payload.postId, tenant_id: tenantId })
      .first();
    if (!post) throw new Error('Post not found');

    const now = new Date();
    let newStatus = 'draft';

    if (payload.action === 'publish_now') {
      newStatus = 'published';
    } else if (payload.action === 'schedule') {
      newStatus = 'scheduled';
    }

    await db.transaction(async (trx) => {
      await trx('posts')
        .where({ id: post.id })
        .update({
          status: newStatus,
          scheduled_for: payload.scheduledAt ? new Date(payload.scheduledAt) : post.scheduled_for,
          published_at: newStatus === 'published' ? now : null,
          updated_at: now,
        });

      await trx('post_variants')
        .where({ post_id: post.id })
        .update({
          status: newStatus,
          updated_at: now,
        });
    });

    const state = await this.getOrCreateFtueState(tenantId, userId);
    const completedSteps: string[] = state.data.completedSteps.includes('schedule')
      ? state.data.completedSteps
      : [...state.data.completedSteps, 'schedule'];

    const activities: FtueActivityMap = {
      ...state.data.activities,
      first_post_scheduled: true,
    };

    await db('user_onboarding_progress')
      .where({ user_id: userId, tenant_id: tenantId })
      .update({
        status: 'COMPLETED',
        current_step: 6,
        completed_steps: JSON.stringify(completedSteps),
        activities: JSON.stringify(activities),
        first_value_at: now,
        completed_at: now,
        updated_at: now,
      });

    if (newStatus === 'published') {
      await this.logEvent(tenantId, userId, 'first_post_published', 6, {
        postId: post.id,
      });
    } else if (newStatus === 'scheduled') {
      await this.logEvent(tenantId, userId, 'first_post_scheduled', 6, {
        postId: post.id,
        scheduledAt: payload.scheduledAt,
      });
    }

    await this.logEvent(tenantId, userId, 'onboarding_completed', 6, {
      postId: post.id,
      action: payload.action,
    });

    return {
      success: true,
      message: 'Congratulations! Your first post is ready.',
      description: 'You have successfully completed your first HoaspForge publishing workflow.',
      data: {
        postId: post.id,
        status: newStatus,
        action: payload.action,
        scheduledAt: payload.scheduledAt,
      },
    };
  }

  /**
   * 8. logEvent()
   */
  public static async logEvent(
    tenantId: string,
    userId: string,
    eventName: string,
    stepNumber?: number,
    metadata?: any
  ) {
    try {
      await db('onboarding_analytics_events').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        tenant_id: tenantId,
        event_name: eventName,
        step_number: stepNumber || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        created_at: new Date(),
      });
    } catch (err) {
      console.warn('Failed to log onboarding event:', err);
    }
  }

  /**
   * 9. getAdminAnalytics()
   */
  public static async getAdminAnalytics(tenantId?: string) {
    const baseQuery = tenantId
      ? db('onboarding_analytics_events').where({ tenant_id: tenantId })
      : db('onboarding_analytics_events');

    const allEvents = await baseQuery.select('event_name', 'created_at', 'user_id', 'step_number');

    const totalStarted = allEvents.filter((e) => e.event_name === 'onboarding_started').length || 1;
    const roleSelected = allEvents.filter((e) => e.event_name === 'role_selected').length;
    const workspaceCreated = allEvents.filter((e) => e.event_name === 'workspace_created').length;
    const brandKitCompleted = allEvents.filter((e) => e.event_name === 'brand_kit_completed').length;
    const channelsConnected = allEvents.filter((e) => e.event_name === 'social_channel_connected').length;
    const firstPostCreated = allEvents.filter((e) => e.event_name === 'first_post_created').length;
    const firstPostScheduled = allEvents.filter((e) => e.event_name === 'first_post_scheduled' || e.event_name === 'first_post_published').length;
    const completed = allEvents.filter((e) => e.event_name === 'onboarding_completed').length;

    // Calculate time to first value
    const progressRecords = tenantId
      ? await db('user_onboarding_progress').where({ tenant_id: tenantId })
      : await db('user_onboarding_progress');

    const withValue = progressRecords.filter((p) => p.started_at && p.first_value_at);
    let avgMinutesToValue = 7.5; // baseline estimate
    if (withValue.length > 0) {
      const totalMs = withValue.reduce((acc, p) => {
        const start = new Date(p.started_at).getTime();
        const end = new Date(p.first_value_at).getTime();
        return acc + Math.max(0, end - start);
      }, 0);
      avgMinutesToValue = Math.round((totalMs / withValue.length / (1000 * 60)) * 10) / 10;
    }

    const funnel = [
      { step: 1, name: 'Welcome & Role', count: roleSelected || totalStarted, dropOffPct: 0 },
      { step: 2, name: 'Workspace Setup', count: workspaceCreated, dropOffPct: Math.max(0, Math.round(((totalStarted - workspaceCreated) / totalStarted) * 100)) },
      { step: 3, name: 'Brand Kit', count: brandKitCompleted, dropOffPct: Math.max(0, Math.round(((totalStarted - brandKitCompleted) / totalStarted) * 100)) },
      { step: 4, name: 'Connect Channels', count: channelsConnected, dropOffPct: Math.max(0, Math.round(((totalStarted - channelsConnected) / totalStarted) * 100)) },
      { step: 5, name: 'First Post Created', count: firstPostCreated, dropOffPct: Math.max(0, Math.round(((totalStarted - firstPostCreated) / totalStarted) * 100)) },
      { step: 6, name: 'Scheduled / Published', count: firstPostScheduled, dropOffPct: Math.max(0, Math.round(((totalStarted - firstPostScheduled) / totalStarted) * 100)) },
    ];

    return {
      success: true,
      data: {
        totalOnboardingStarted: totalStarted,
        totalCompleted: completed,
        completionRatePct: Math.min(100, Math.round((completed / totalStarted) * 100)),
        channelConnectionRatePct: Math.min(100, Math.round((channelsConnected / totalStarted) * 100)),
        firstPostCreationRatePct: Math.min(100, Math.round((firstPostCreated / totalStarted) * 100)),
        firstPublishingRatePct: Math.min(100, Math.round((firstPostScheduled / totalStarted) * 100)),
        avgMinutesToFirstValue: avgMinutesToValue,
        funnel,
      },
    };
  }
}
