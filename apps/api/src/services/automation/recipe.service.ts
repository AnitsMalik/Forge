import type { AutomationRecipe, AutomationTriggerConfig, AutomationStepConfig, AutomationCondition } from '@socialforge/shared';
import crypto from 'crypto';
import { db } from '../../db/connection.js';

export const PREBUILT_RECIPES: AutomationRecipe[] = [
  {
    id: 'product-promotion',
    title: 'Product Promotion',
    description: 'Watches Google Sheets or Excel for new or updated catalog items, validates required product attributes (never inventing price, discount, availability, or guarantees), synthesizes Facebook & Instagram copy, renders branded Product Promotion templates, enforces marketing claim policies, requests human approval by default, provides user-configurable scheduling, publishes to Meta with real provider confirmation, records publishing jobs and analytics, and generates closed-loop AI growth recommendations.',
    category: 'ecommerce',
    icon: 'Sparkles',
    requiredConnectors: ['google-sheets', 'facebook', 'instagram'],
    defaultTrigger: {
      type: 'datasource_change',
      name: 'New or updated product',
      sourceType: 'google_sheets_or_excel',
      intervalMinutes: 15,
    },
    defaultConditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'READY',
      },
    ],
    defaultActions: [
      {
        id: 'step_normalize',
        type: 'normalize_product',
        name: 'Validate & Normalize Catalog Product',
        config: {},
      },
      {
        id: 'step_ai_understand',
        type: 'ai_product_understanding',
        name: 'AI Product Understanding & Content Generation',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
      {
        id: 'step_render_tpl',
        type: 'render_template',
        name: 'Select Product Promotion Template & Render Variants',
        config: {
          templateId: 'tpl-product-flagship',
        },
      },
      {
        id: 'step_policy_check',
        type: 'policy_claim_check',
        name: 'Brand, Policy & Claim Verification',
        config: {},
      },
      {
        id: 'step_create_draft',
        type: 'create_post',
        name: 'Create SocialForge Draft Post with Provenance Lineage',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
      {
        id: 'step_approval_gate',
        type: 'approval_gate',
        name: 'Approval Gate (Required by Default)',
        config: {
          required: true,
        },
      },
      {
        id: 'step_schedule',
        type: 'schedule_post',
        name: 'Schedule Post (User Configurable)',
        config: {},
      },
      {
        id: 'step_publish_meta',
        type: 'publish_meta',
        name: 'Publish to Facebook & Instagram with Provider Confirmation',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
      {
        id: 'step_collect_analytics',
        type: 'collect_analytics',
        name: 'Collect Remote Post Analytics & Telemetry',
        config: {},
      },
      {
        id: 'step_ai_recommendation',
        type: 'generate_ai_recommendation',
        name: 'Generate AI Marketing Growth Recommendation',
        config: {},
      },
    ],
  },
  {
    id: 'flagship-product-promotion',
    title: 'Product Promotion',
    description: 'Watches Google Sheets for new or updated catalog items, normalizes product details, generates AI copy, renders branded multi-platform templates (Facebook & Instagram), enforces marketing claim policy, generates client sign-off magic links, and publishes live with complete end-to-end lineage and telemetry.',
    category: 'ecommerce',
    icon: 'Sparkles',
    requiredConnectors: ['google-sheets', 'facebook', 'instagram'],
    defaultTrigger: {
      type: 'datasource_change',
      intervalMinutes: 15,
    },
    defaultConditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'Ready',
      },
    ],
    defaultActions: [
      {
        id: 'step_normalize',
        type: 'normalize_product',
        name: 'Validate & Normalize Catalog Product',
        config: {},
      },
      {
        id: 'step_ai_understand',
        type: 'ai_product_understanding',
        name: 'AI Product Understanding & Copy Synthesis',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
      {
        id: 'step_render_tpl',
        type: 'render_template',
        name: 'Render Product Promotion Template & Variants',
        config: {
          templateId: 'tpl-product-flagship',
        },
      },
      {
        id: 'step_policy_check',
        type: 'policy_claim_check',
        name: 'Verify Marketing Claims & Disclaimers',
        config: {},
      },
      {
        id: 'step_create_draft',
        type: 'create_post',
        name: 'Create SocialForge Draft Post with Provenance Lineage',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
      {
        id: 'step_approval_gate',
        type: 'approval_gate',
        name: 'Client Sign-off Approval Gate (Magic Link)',
        config: {},
      },
      {
        id: 'step_publish_meta',
        type: 'publish_meta',
        name: 'Publish to Meta (Facebook Page & Instagram)',
        config: {
          platforms: ['facebook', 'instagram'],
        },
      },
    ],
  },
  {
    id: 'sheets-to-social',
    title: 'Google Sheets to Multi-Platform Publisher',
    description: 'Automatically reads editorial calendars or approved copy rows from Google Sheets and drafts multi-channel posts.',
    category: 'productivity',
    icon: 'Sheet',
    requiredConnectors: ['google-sheets'],
    defaultTrigger: {
      type: 'datasource_change',
      intervalMinutes: 60,
    },
    defaultConditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'Ready',
      },
    ],
    defaultActions: [
      {
        id: 'step_generate_copy',
        type: 'generate_content',
        name: 'Synthesize Multi-Channel Captions',
        config: {
          tone: 'engaging, brand-aligned',
          platforms: ['instagram', 'linkedin', 'facebook'],
        },
      },
      {
        id: 'step_create_draft',
        type: 'create_post',
        name: 'Create SocialForge Draft Post',
        config: {
          platforms: ['instagram', 'linkedin', 'facebook'],
        },
      },
      {
        id: 'step_client_approval',
        type: 'approval_gate',
        name: 'Request Client Sign-off (Magic Link)',
        config: {},
      },
    ],
  },
  {
    id: 'shopify-product-drop',
    title: 'Shopify Product Drop Campaign',
    description: 'Listens for newly published e-commerce products and instantly drafts launch teasers and reels.',
    category: 'ecommerce',
    icon: 'ShoppingBag',
    requiredConnectors: ['shopify'],
    defaultTrigger: {
      type: 'webhook',
      eventPattern: 'products/create',
    },
    defaultConditions: [
      {
        field: 'status',
        operator: 'equals',
        value: 'active',
      },
    ],
    defaultActions: [
      {
        id: 'step_generate_product_copy',
        type: 'generate_content',
        name: 'Generate Product Teaser & Hooks',
        config: {
          prompt: 'Highlight product features, customer value, and launch discounts',
          platforms: ['instagram', 'tiktok', 'facebook'],
        },
      },
      {
        id: 'step_create_launch_post',
        type: 'create_post',
        name: 'Create Launch Post & Platform Variants',
        config: {
          platforms: ['instagram', 'tiktok'],
        },
      },
      {
        id: 'step_approval_gate',
        type: 'approval_gate',
        name: 'Queue for Marketing Lead Approval',
        config: {},
      },
    ],
  },
  {
    id: 'content-recycler',
    title: 'Weekly High-Performing Content Recycler',
    description: 'Weekly scheduled engine that identifies top-performing historical posts, rewrites the hooks, and schedules fresh variants.',
    category: 'social',
    icon: 'Repeat',
    requiredConnectors: [],
    defaultTrigger: {
      type: 'schedule',
      cronExpression: '0 9 * * 1', // Every Monday at 9am
      intervalMinutes: 10080,
    },
    defaultConditions: [
      {
        field: 'engagement_rate',
        operator: 'greater_than',
        value: 2.5,
      },
    ],
    defaultActions: [
      {
        id: 'step_rewrite_hooks',
        type: 'generate_content',
        name: 'Rewrite Headline & Angle for Evergreen Reach',
        config: {
          prompt: 'Take high-performing angle and provide 3 fresh headline variations',
          platforms: ['linkedin', 'instagram'],
        },
      },
      {
        id: 'step_schedule_recycled_post',
        type: 'create_post',
        name: 'Queue Recycled Post as Draft',
        config: {
          platforms: ['linkedin', 'instagram'],
        },
      },
    ],
  },
  {
    id: 'gdrive-asset-watcher',
    title: 'Google Drive Asset Watcher',
    description: 'Watches designated Google Drive folders for new creative media assets, extracts highlights, and queues drafts.',
    category: 'productivity',
    icon: 'FolderSync',
    requiredConnectors: ['google-drive'],
    defaultTrigger: {
      type: 'datasource_change',
      intervalMinutes: 30,
    },
    defaultConditions: [
      {
        field: 'mimeType',
        operator: 'contains',
        value: 'video',
      },
    ],
    defaultActions: [
      {
        id: 'step_generate_video_captions',
        type: 'generate_content',
        name: 'Draft Vertical Video Reel Caption & Tags',
        config: {
          platforms: ['tiktok', 'instagram'],
        },
      },
      {
        id: 'step_create_video_draft',
        type: 'create_post',
        name: 'Create Video Draft with Attached Media',
        config: {
          platforms: ['tiktok', 'instagram'],
        },
      },
      {
        id: 'step_request_approval',
        type: 'approval_gate',
        name: 'Dispatch Review Link to Client Portal',
        config: {},
      },
    ],
  },
  {
    id: 'outperformer-amplification',
    title: 'Outperformer Winner Amplification',
    description: 'Triggered when the Stage 6 Winner Detection engine identifies an outperforming post (statistical outperformer >=2x, velocity surge >=2.5x, or creative angle winner). Automatically synthesizes a spin-off angle, creates a multi-platform draft, and requests marketing review.',
    category: 'social',
    icon: 'Trophy',
    requiredConnectors: [],
    defaultTrigger: {
      type: 'analytics_winner_detected',
      name: 'Analytics Winner Detected',
    },
    defaultConditions: [
      {
        field: 'lift_multiplier',
        operator: 'greater_than',
        value: 1.5,
      },
    ],
    defaultActions: [
      {
        id: 'step_synthesize_derivative',
        type: 'generate_content',
        name: 'Synthesize High-Converting Derivative Angles',
        config: {
          prompt: 'Model the hook and linguistic style of this winning post into fresh derivative copy',
          platforms: ['instagram', 'facebook', 'linkedin'],
        },
      },
      {
        id: 'step_create_derivative_draft',
        type: 'create_post',
        name: 'Create Derivative SocialForge Draft Post',
        config: {
          platforms: ['instagram', 'facebook', 'linkedin'],
        },
      },
      {
        id: 'step_approval_gate',
        type: 'approval_gate',
        name: 'Queue for Marketing Lead Sign-off',
        config: {
          required: true,
        },
      },
    ],
  },
];

export class RecipeService {
  /**
   * Returns list of available recipes.
   */
  public listRecipes(): AutomationRecipe[] {
    return PREBUILT_RECIPES;
  }

  /**
   * Retrieves single recipe by ID.
   */
  public getRecipe(recipeId: string): AutomationRecipe | null {
    return PREBUILT_RECIPES.find((r) => r.id === recipeId) || null;
  }

  /**
   * Instantiates a pre-built recipe into an active automation for a tenant and brand.
   */
  public async instantiateRecipe(
    tenantId: string,
    brandId: string,
    recipeId: string,
    customName?: string,
    userId?: string
  ): Promise<any> {
    const recipe = this.getRecipe(recipeId);
    if (!recipe) {
      throw new Error(`Recipe '${recipeId}' not found.`);
    }

    // Verify brand ownership
    const brand = await db('brands')
      .where({ id: brandId, tenant_id: tenantId })
      .first();

    if (!brand) {
      throw new Error('Brand not found or access denied for tenant.');
    }

    const automationId = crypto.randomUUID();
    const webhookToken = `whk_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();

    const triggerConfig = {
      ...recipe.defaultTrigger,
      webhookToken,
    };

    const newRecord = {
      id: automationId,
      tenant_id: tenantId,
      brand_id: brandId,
      name: customName || `${recipe.title} (${brand.name})`,
      description: recipe.description,
      trigger_type: recipe.defaultTrigger.type,
      trigger_config: JSON.stringify(triggerConfig),
      conditions: recipe.defaultConditions ? JSON.stringify(recipe.defaultConditions) : null,
      actions: JSON.stringify(recipe.defaultActions),
      status: 'active',
      execution_count: 0,
      created_by: userId || null,
      created_at: now,
      updated_at: now,
    };

    await db('automations').insert(newRecord);

    return {
      id: automationId,
      tenantId,
      brandId,
      name: newRecord.name,
      description: newRecord.description,
      triggerType: newRecord.trigger_type,
      triggerConfig,
      conditions: recipe.defaultConditions || [],
      actions: recipe.defaultActions,
      status: 'active',
      recipeId,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export const recipeService = new RecipeService();
