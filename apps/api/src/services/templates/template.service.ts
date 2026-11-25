import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { BUILT_IN_TEMPLATES } from '../../controllers/templateController.js';
import { CANONICAL_STAGE4_TEMPLATE_CATALOG } from './templateCatalog.js';
import { templateRendererService } from './templateRenderer.service.js';
import { platformVariantService, TargetPlatform } from './platformVariant.service.js';
import { templateVersionService } from './templateVersion.service.js';
import { templateValidatorService } from './templateValidator.service.js';

export const CANONICAL_PRODUCT_PROMOTION_TEMPLATE = {
  id: 'tpl-product-flagship',
  name: 'Flagship Product Promotion',
  description: 'High-conversion product promo card with product imagery slot, price badge, discount tag, and action CTA.',
  category: 'product',
  subcategory: 'product_promotion',
  dimensions: { width: 1080, height: 1080 },
  aspectRatio: '1:1',
  isBuiltIn: true,
  isCustom: false,
  scope: 'global' as const,
  supportedPlatforms: ['facebook', 'instagram', 'linkedin', 'tiktok'],
  requiredFields: ['product_name', 'price'],
  optionalFields: ['discount', 'badge', 'cta_text', 'product_description', 'image_url'],
  brandTokens: {
    primary: '#3b82f6',
    accent: '#facc15',
    background: '#0f172a',
    fontFamily: "'Outfit', sans-serif",
  },
  aiInstructions: 'Generate high-converting, benefit-driven copy emphasizing value and urgent incentive. Keep claims factual and compliant. Format price clearly with currency symbol. Include a direct call to action.',
  claimRestrictions: ['#1 in the world', 'guaranteed profit', 'miracle cure', 'instant wealth', 'risk-free', 'cure all'],
  ctaRules: ['Shop Now', 'Order Today', 'Claim Offer', 'Learn More', 'Get Yours'],
  approvalPolicy: 'require_approval',
  status: 'active',
  activeVersion: 1,
  background: {
    type: 'gradient' as const,
    value: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #4338ca 100%)',
    overlayOpacity: 0.15,
  },
  tags: ['Product', 'Promotion', 'Flagship', 'E-commerce', 'Meta'],
  layers: [
    {
      id: 'l-badge',
      type: 'text',
      name: 'Promo Badge',
      x: 50,
      y: 12,
      width: 44,
      height: 6,
      text: '{{discount | uppercase | "SPECIAL OFFER ⚡"}}',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
      color: '#0f172a',
      backgroundColor: '#facc15',
      backgroundPadding: 8,
      borderRadius: 9999,
      letterSpacing: 2,
    },
    {
      id: 'l-image',
      type: 'image',
      name: 'Product Hero Image',
      x: 50,
      y: 40,
      width: 70,
      height: 42,
      url: '{{image_url}}',
      borderRadius: 16,
    },
    {
      id: 'l-name',
      type: 'text',
      name: 'Product Name',
      x: 50,
      y: 68,
      width: 86,
      height: 12,
      text: '{{product_name}}',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 32,
      fontWeight: '900',
      textAlign: 'center',
      color: '#ffffff',
      letterSpacing: -0.5,
    },
    {
      id: 'l-price',
      type: 'text',
      name: 'Price Callout',
      x: 50,
      y: 80,
      width: 60,
      height: 8,
      text: 'Only {{price}} today!',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      color: '#38bdf8',
    },
    {
      id: 'l-cta',
      type: 'text',
      name: 'Call To Action',
      x: 50,
      y: 90,
      width: 44,
      height: 8,
      text: '{{cta_text | "Shop Now ➔"}}',
      fontFamily: "'Outfit', sans-serif",
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      color: '#ffffff',
      backgroundColor: '#3b82f6',
      backgroundPadding: 10,
      borderRadius: 9999,
    },
  ],
};

export interface CreateTemplateInput {
  brandId?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  aspectRatio?: string;
  dimensions?: { width: number; height: number };
  background?: any;
  layers?: any[];
  visualComponents?: any[];
  tags?: string[];
  thumbnailUrl?: string;
  scope?: 'global' | 'tenant' | 'brand';
  supportedPlatforms?: string[];
  requiredFields?: string[];
  optionalFields?: string[];
  brandTokens?: any;
  aiInstructions?: string;
  claimRestrictions?: string[];
  ctaRules?: string[];
  approvalPolicy?: string;
  status?: 'active' | 'inactive';
  activeVersion?: number;
  isAgent?: boolean;
  caller?: string;
}

export class TemplateService {
  /**
   * Returns all canonical built-in templates across all 7 categories and 22 subcategories
   */
  public getBuiltInTemplates() {
    return [
      CANONICAL_PRODUCT_PROMOTION_TEMPLATE,
      ...CANONICAL_STAGE4_TEMPLATE_CATALOG.filter((t) => t.id !== CANONICAL_PRODUCT_PROMOTION_TEMPLATE.id),
      ...BUILT_IN_TEMPLATES.filter((t) => !CANONICAL_STAGE4_TEMPLATE_CATALOG.some((c) => c.id === t.id)),
    ];
  }

  /**
   * Lists templates available to a tenant (both built-in templates and tenant/brand scoped templates)
   */
  async listTemplates(
    tenantId: string,
    brandId?: string,
    filters: {
      scope?: string;
      category?: string;
      status?: string;
      platform?: string;
    } = {}
  ) {
    let query = db('templates').where(function () {
      this.where({ scope: 'global' })
        .orWhere(function () {
          this.where({ tenant_id: tenantId });
          if (brandId) {
            this.where(function () {
              this.where({ scope: 'tenant' }).orWhere({ scope: 'brand', brand_id: brandId });
            });
          }
        });
    });

    if (filters.scope) {
      query = query.where({ scope: filters.scope });
    }
    if (filters.category && filters.category !== 'all') {
      query = query.where({ category: filters.category });
    }
    if (filters.status) {
      query = query.where({ status: filters.status });
    }

    const rows = await query.orderBy('created_at', 'desc');

    const customTemplates = rows.map((r) => {
      let layers = [];
      let background = {};
      let tags = [];
      let supportedPlatforms = [];
      let requiredFields = [];
      let optionalFields = [];
      let brandTokens = {};
      let claimRestrictions = [];
      let ctaRules = [];

      let dimensions = null;
      let visualComponents = [];
      try { layers = typeof r.layers === 'string' ? JSON.parse(r.layers) : r.layers || []; } catch {}
      try { background = typeof r.background === 'string' ? JSON.parse(r.background) : r.background || {}; } catch {}
      try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags || []; } catch {}
      try { supportedPlatforms = typeof r.supported_platforms === 'string' ? JSON.parse(r.supported_platforms) : r.supported_platforms || ['facebook', 'instagram']; } catch {}
      try { requiredFields = typeof r.required_fields === 'string' ? JSON.parse(r.required_fields) : r.required_fields || []; } catch {}
      try { optionalFields = typeof r.optional_fields === 'string' ? JSON.parse(r.optional_fields) : r.optional_fields || []; } catch {}
      try { brandTokens = typeof r.brand_tokens === 'string' ? JSON.parse(r.brand_tokens) : r.brand_tokens || {}; } catch {}
      try { claimRestrictions = typeof r.claim_restrictions === 'string' ? JSON.parse(r.claim_restrictions) : r.claim_restrictions || []; } catch {}
      try { ctaRules = typeof r.cta_rules === 'string' ? JSON.parse(r.cta_rules) : r.cta_rules || []; } catch {}
      try { dimensions = typeof r.dimensions === 'string' ? JSON.parse(r.dimensions) : r.dimensions || null; } catch {}
      try { visualComponents = typeof r.visual_components === 'string' ? JSON.parse(r.visual_components) : r.visual_components || []; } catch {}

      return {
        id: r.id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        name: r.name,
        description: r.description,
        category: r.category,
        subcategory: r.subcategory || null,
        aspectRatio: r.aspect_ratio,
        dimensions: dimensions || { width: 1080, height: 1080 },
        isCustom: Boolean(r.is_custom),
        isBuiltIn: Boolean(r.is_built_in),
        scope: r.scope || 'tenant',
        supportedPlatforms,
        requiredFields,
        optionalFields,
        brandTokens,
        aiInstructions: r.ai_instructions,
        claimRestrictions,
        ctaRules,
        approvalPolicy: r.approval_policy || 'require_approval',
        status: r.status || 'active',
        activeVersion: r.active_version || 1,
        background,
        layers,
        visualComponents: visualComponents && visualComponents.length > 0 ? visualComponents : layers,
        tags,
        thumbnailUrl: r.thumbnail_url,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    let all = [...this.getBuiltInTemplates(), ...customTemplates];

    // Filter by platform if requested
    if (filters.platform) {
      const p = filters.platform.toLowerCase();
      all = all.filter((t: any) => {
        if (!t.supportedPlatforms) return true;
        return t.supportedPlatforms.map((sp: string) => sp.toLowerCase()).includes(p);
      });
    }

    return all;
  }

  /**
   * Retrieves a single template by ID ensuring tenant access
   */
  async getTemplate(tenantId: string, templateId: string) {
    // 1. Check built-in templates first
    const builtIns = this.getBuiltInTemplates();
    const builtIn = builtIns.find((t) => t.id === templateId);
    if (builtIn) return builtIn;

    // 2. Query custom templates for tenant or global
    const row = await db('templates')
      .where({ id: templateId })
      .andWhere(function () {
        this.where({ tenant_id: tenantId }).orWhere({ scope: 'global' });
      })
      .first();

    if (!row) return null;

    let layers = [];
    let background = {};
    let tags = [];
    let supportedPlatforms = [];
    let requiredFields = [];
    let optionalFields = [];
    let brandTokens = {};
    let claimRestrictions = [];
    let ctaRules = [];
    let dimensions = null;
    let visualComponents = [];

    try { layers = typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers || []; } catch {}
    try { background = typeof row.background === 'string' ? JSON.parse(row.background) : row.background || {}; } catch {}
    try { tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags || []; } catch {}
    try { supportedPlatforms = typeof row.supported_platforms === 'string' ? JSON.parse(row.supported_platforms) : row.supported_platforms || ['facebook', 'instagram']; } catch {}
    try { requiredFields = typeof row.required_fields === 'string' ? JSON.parse(row.required_fields) : row.required_fields || []; } catch {}
    try { optionalFields = typeof row.optional_fields === 'string' ? JSON.parse(row.optional_fields) : row.optional_fields || []; } catch {}
    try { brandTokens = typeof row.brand_tokens === 'string' ? JSON.parse(row.brand_tokens) : row.brand_tokens || {}; } catch {}
    try { claimRestrictions = typeof row.claim_restrictions === 'string' ? JSON.parse(row.claim_restrictions) : row.claim_restrictions || []; } catch {}
    try { ctaRules = typeof row.cta_rules === 'string' ? JSON.parse(row.cta_rules) : row.cta_rules || []; } catch {}
    try { dimensions = typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions || null; } catch {}
    try { visualComponents = typeof row.visual_components === 'string' ? JSON.parse(row.visual_components) : row.visual_components || []; } catch {}

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory || null,
      aspectRatio: row.aspect_ratio,
      dimensions: dimensions || { width: 1080, height: 1080 },
      isCustom: Boolean(row.is_custom),
      isBuiltIn: Boolean(row.is_built_in),
      scope: row.scope || 'tenant',
      supportedPlatforms,
      requiredFields,
      optionalFields,
      brandTokens,
      aiInstructions: row.ai_instructions,
      claimRestrictions,
      ctaRules,
      approvalPolicy: row.approval_policy || 'require_approval',
      status: row.status || 'active',
      activeVersion: row.active_version || 1,
      background,
      layers,
      visualComponents: visualComponents && visualComponents.length > 0 ? visualComponents : layers,
      tags,
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Creates a new custom template and records version 1
   */
  /**
   * Creates a new custom template and records version 1.
   * AI agents are strictly forbidden from modifying template definitions directly.
   */
  async createTemplate(
    tenantId: string,
    input: CreateTemplateInput,
    createdBy?: string,
    options?: { isAgent?: boolean; caller?: string }
  ) {
    if (input.isAgent || input.caller === 'ai_agent' || options?.isAgent || options?.caller === 'ai_agent') {
      throw new Error('AI_MUTATION_RESTRICTED: AI agents cannot modify system template definitions. Templates are controlled system artifacts.');
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const record = {
      id,
      tenant_id: tenantId,
      brand_id: input.brandId || null,
      name: input.name,
      description: input.description || null,
      category: input.category || 'promotion',
      subcategory: input.subcategory || null,
      aspect_ratio: input.aspectRatio || '1:1',
      dimensions: input.dimensions ? JSON.stringify(input.dimensions) : null,
      is_custom: true,
      is_built_in: false,
      scope: input.scope || (input.brandId ? 'brand' : 'tenant'),
      supported_platforms: JSON.stringify(input.supportedPlatforms || ['facebook', 'instagram']),
      required_fields: JSON.stringify(input.requiredFields || []),
      optional_fields: JSON.stringify(input.optionalFields || []),
      brand_tokens: JSON.stringify(input.brandTokens || {}),
      ai_instructions: input.aiInstructions || null,
      claim_restrictions: JSON.stringify(input.claimRestrictions || []),
      cta_rules: JSON.stringify(input.ctaRules || []),
      approval_policy: input.approvalPolicy || 'require_approval',
      status: input.status || 'active',
      active_version: 1,
      background: JSON.stringify(input.background || { type: 'color', value: '#0f172a' }),
      layers: JSON.stringify(input.layers || []),
      visual_components: JSON.stringify(input.visualComponents || input.layers || []),
      tags: JSON.stringify(input.tags || []),
      thumbnail_url: input.thumbnailUrl || null,
      created_at: now,
      updated_at: now,
    };

    await db('templates').insert(record);

    // Record initial Version 1 snapshot
    await templateVersionService.recordVersion(tenantId, id, {
      changelog: 'Initial template creation',
      createdBy,
      requiredFields: input.requiredFields,
      optionalFields: input.optionalFields,
      aiInstructions: input.aiInstructions,
      claimRestrictions: input.claimRestrictions,
      ctaRules: input.ctaRules,
      approvalPolicy: input.approvalPolicy,
      brandTokens: input.brandTokens,
    });

    return this.getTemplate(tenantId, id);
  }

  /**
   * Updates an existing custom template and respects version immutability:
   * If the active version is locked (has been used in post/automation), automatically branches
   * a brand-new immutable version snapshot so historical posts remain intact.
   * AI agents are strictly forbidden from modifying template definitions directly.
   */
  async updateTemplate(
    tenantId: string,
    templateId: string,
    updates: Partial<CreateTemplateInput>,
    updatedBy?: string,
    options?: { isAgent?: boolean; caller?: string }
  ) {
    if (updates.isAgent || updates.caller === 'ai_agent' || options?.isAgent || options?.caller === 'ai_agent') {
      throw new Error('AI_MUTATION_RESTRICTED: AI agents cannot modify system template definitions. Templates are controlled system artifacts.');
    }

    const existing = await db('templates').where({ id: templateId, tenant_id: tenantId }).first();
    if (!existing) {
      throw new Error('Template not found or access denied for tenant.');
    }

    const currentVersionNumber = existing.active_version || 1;
    const isLocked = await templateVersionService.isVersionLocked(tenantId, templateId, currentVersionNumber);

    const patch: any = { updated_at: new Date() };
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.category !== undefined) patch.category = updates.category;
    if (updates.subcategory !== undefined) patch.subcategory = updates.subcategory;
    if (updates.aspectRatio !== undefined) patch.aspect_ratio = updates.aspectRatio;
    if (updates.dimensions !== undefined) patch.dimensions = JSON.stringify(updates.dimensions);
    if (updates.background !== undefined) patch.background = JSON.stringify(updates.background);
    if (updates.layers !== undefined) patch.layers = JSON.stringify(updates.layers);
    if (updates.visualComponents !== undefined) patch.visual_components = JSON.stringify(updates.visualComponents);
    if (updates.tags !== undefined) patch.tags = JSON.stringify(updates.tags);
    if (updates.scope !== undefined) patch.scope = updates.scope;
    if (updates.supportedPlatforms !== undefined) patch.supported_platforms = JSON.stringify(updates.supportedPlatforms);
    if (updates.requiredFields !== undefined) patch.required_fields = JSON.stringify(updates.requiredFields);
    if (updates.optionalFields !== undefined) patch.optional_fields = JSON.stringify(updates.optionalFields);
    if (updates.brandTokens !== undefined) patch.brand_tokens = JSON.stringify(updates.brandTokens);
    if (updates.aiInstructions !== undefined) patch.ai_instructions = updates.aiInstructions;
    if (updates.claimRestrictions !== undefined) patch.claim_restrictions = JSON.stringify(updates.claimRestrictions);
    if (updates.ctaRules !== undefined) patch.cta_rules = JSON.stringify(updates.ctaRules);
    if (updates.approvalPolicy !== undefined) patch.approval_policy = updates.approvalPolicy;
    if (updates.status !== undefined) patch.status = updates.status;

    let targetVersionNumber = currentVersionNumber;
    if (isLocked) {
      // Automatic branching of new version!
      const latestVersion = await db('template_versions')
        .where({ template_id: templateId, tenant_id: tenantId })
        .max('version_number as maxVersion')
        .first();
      targetVersionNumber = ((latestVersion as any)?.maxVersion || currentVersionNumber) + 1;
      patch.active_version = targetVersionNumber;
    }

    await db('templates').where({ id: templateId, tenant_id: tenantId }).update(patch);

    // Record new version snapshot (preserving previous immutable version)
    await templateVersionService.recordVersion(tenantId, templateId, {
      changelog: isLocked
        ? `Branch new version ${targetVersionNumber} (Version ${currentVersionNumber} locked by usage)`
        : `Template updated: ${updates.name || 'layers update'}`,
      createdBy: updatedBy,
      requiredFields: updates.requiredFields,
      optionalFields: updates.optionalFields,
      aiInstructions: updates.aiInstructions,
      claimRestrictions: updates.claimRestrictions,
      ctaRules: updates.ctaRules,
      approvalPolicy: updates.approvalPolicy,
      brandTokens: updates.brandTokens,
    });

    return this.getTemplate(tenantId, templateId);
  }

  /**
   * Deletes a custom template with tenant isolation.
   * AI agents are strictly forbidden from modifying template definitions directly.
   */
  async deleteTemplate(
    tenantId: string,
    templateId: string,
    options?: { isAgent?: boolean; caller?: string }
  ): Promise<boolean> {
    if (options?.isAgent || options?.caller === 'ai_agent') {
      throw new Error('AI_MUTATION_RESTRICTED: AI agents cannot modify system template definitions. Templates are controlled system artifacts.');
    }

    const isBuiltIn = this.getBuiltInTemplates().some((t) => t.id === templateId);
    if (isBuiltIn) {
      throw new Error('Cannot delete system built-in template.');
    }

    const existing = await db('templates').where({ id: templateId, tenant_id: tenantId }).first();
    if (!existing) {
      throw new Error('Template not found or access denied for tenant.');
    }

    await db('template_versions').where({ template_id: templateId, tenant_id: tenantId }).delete();
    const count = await db('templates').where({ id: templateId, tenant_id: tenantId }).delete();
    return count > 0;
  }

  /**
   * Duplicates a template (built-in or custom) into tenant's brand workspace
   */
  async duplicateTemplate(tenantId: string, templateId: string, newName?: string, createdBy?: string) {
    const source = await this.getTemplate(tenantId, templateId);
    if (!source) {
      throw new Error('Source template not found.');
    }

    return this.createTemplate(
      tenantId,
      {
        brandId: (source as any).brandId,
        name: newName || `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        subcategory: (source as any).subcategory,
        aspectRatio: source.aspectRatio,
        dimensions: (source as any).dimensions,
        background: source.background,
        layers: source.layers,
        visualComponents: (source as any).visualComponents,
        tags: source.tags,
        scope: 'tenant',
        supportedPlatforms: (source as any).supportedPlatforms,
        requiredFields: (source as any).requiredFields,
        optionalFields: (source as any).optionalFields,
        brandTokens: (source as any).brandTokens,
        aiInstructions: (source as any).aiInstructions,
        claimRestrictions: (source as any).claimRestrictions,
        ctaRules: (source as any).ctaRules,
        approvalPolicy: (source as any).approvalPolicy,
      },
      createdBy
    );
  }

  /**
   * Selects the best matching active template based on category, subcategory, platform, and format
   */
  async selectBestTemplate(
    tenantId: string,
    criteria: {
      category?: string;
      subcategory?: string;
      platform?: string;
      aspectRatio?: string;
      brandId?: string;
    }
  ) {
    const all = await this.listTemplates(tenantId, criteria.brandId, {
      category: criteria.category,
      platform: criteria.platform,
      status: 'active',
    });

    if (all.length === 0) {
      // Fallback to any built-in template matching criteria or canonical flagship
      return CANONICAL_PRODUCT_PROMOTION_TEMPLATE;
    }

    // Rank by match
    const scored = all.map((tpl: any) => {
      let score = 0;
      if (criteria.subcategory && tpl.subcategory && tpl.subcategory.toLowerCase() === criteria.subcategory.toLowerCase()) score += 15;
      if (criteria.category && tpl.category && tpl.category.toLowerCase() === criteria.category.toLowerCase()) score += 10;
      if (criteria.aspectRatio && tpl.aspectRatio === criteria.aspectRatio) score += 5;
      if (criteria.platform && tpl.supportedPlatforms && tpl.supportedPlatforms.includes(criteria.platform.toLowerCase())) score += 5;
      if (criteria.brandId && tpl.brandId === criteria.brandId) score += 3;
      return { tpl, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].tpl;
  }

  /**
   * Renders template with dynamic variable substitution
   */
  renderWithVariables(template: any, variables: Record<string, any>) {
    return templateRendererService.renderTemplate(template, variables);
  }

  /**
   * Generates platform variants for target ratios
   */
  generatePlatformVariants(template: any, targetPlatforms?: TargetPlatform[]) {
    if (!targetPlatforms || targetPlatforms.length === 0) {
      return platformVariantService.generateMultiPlatformBundle(template);
    }
    const result: Record<string, any> = {};
    for (const p of targetPlatforms) {
      result[p] = platformVariantService.generatePlatformVariant(template, p);
    }
    return result;
  }

  /**
   * Validates template against brand kit
   */
  async validateTemplate(tenantId: string, brandId: string | undefined, template: any) {
    return templateValidatorService.validateTemplate(tenantId, brandId, template);
  }
}

export const templateService = new TemplateService();
