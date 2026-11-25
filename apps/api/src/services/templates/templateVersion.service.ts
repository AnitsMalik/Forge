import crypto from 'crypto';
import { db } from '../../db/connection.js';

export interface TemplateVersionRecord {
  id: string;
  templateId: string;
  tenantId: string;
  versionNumber: number;
  layers: any[];
  background: any;
  platformVariants: any;
  changelog?: string;
  createdBy?: string;
  createdAt: Date;
  isLocked?: boolean;
  usageCount?: number;
  requiredFields?: string[];
  optionalFields?: string[];
  aiInstructions?: string;
  claimRestrictions?: string[];
  ctaRules?: string[];
  approvalPolicy?: string;
  brandTokens?: any;
}

export class TemplateVersionService {
  /**
   * Records an immutable version snapshot of a template
   */
  async recordVersion(
    tenantId: string,
    templateId: string,
    options: {
      changelog?: string;
      createdBy?: string;
      platformVariants?: any;
      requiredFields?: string[];
      optionalFields?: string[];
      aiInstructions?: string;
      claimRestrictions?: string[];
      ctaRules?: string[];
      approvalPolicy?: string;
      brandTokens?: any;
    } = {}
  ): Promise<TemplateVersionRecord> {
    // 1. Fetch template with tenant isolation
    const template = await db('templates')
      .where({ id: templateId })
      .andWhere(function () {
        this.where({ tenant_id: tenantId }).orWhere({ scope: 'global' });
      })
      .first();

    if (!template) {
      throw new Error(`Template not found or access denied for tenant.`);
    }

    // 2. Find latest version number
    const latestVersion = await db('template_versions')
      .where({ template_id: templateId, tenant_id: tenantId })
      .max('version_number as maxVersion')
      .first();

    const nextVersionNumber = ((latestVersion as any)?.maxVersion || 0) + 1;
    const versionId = crypto.randomUUID();
    const now = new Date();

    const rawLayers = typeof template.layers === 'string'
      ? JSON.parse(template.layers)
      : template.layers || [];

    const rawBackground = typeof template.background === 'string'
      ? JSON.parse(template.background)
      : template.background || {};

    const platformVariants = options.platformVariants || {};

    // Parse template-level defaults if not passed in options
    let reqFields = options.requiredFields;
    if (!reqFields && template.required_fields) {
      try { reqFields = typeof template.required_fields === 'string' ? JSON.parse(template.required_fields) : template.required_fields; } catch {}
    }
    let optFields = options.optionalFields;
    if (!optFields && template.optional_fields) {
      try { optFields = typeof template.optional_fields === 'string' ? JSON.parse(template.optional_fields) : template.optional_fields; } catch {}
    }
    let claimRestr = options.claimRestrictions;
    if (!claimRestr && template.claim_restrictions) {
      try { claimRestr = typeof template.claim_restrictions === 'string' ? JSON.parse(template.claim_restrictions) : template.claim_restrictions; } catch {}
    }
    let ctaR = options.ctaRules;
    if (!ctaR && template.cta_rules) {
      try { ctaR = typeof template.cta_rules === 'string' ? JSON.parse(template.cta_rules) : template.cta_rules; } catch {}
    }
    let brandTok = options.brandTokens;
    if (!brandTok && template.brand_tokens) {
      try { brandTok = typeof template.brand_tokens === 'string' ? JSON.parse(template.brand_tokens) : template.brand_tokens; } catch {}
    }

    await db('template_versions').insert({
      id: versionId,
      template_id: templateId,
      tenant_id: tenantId,
      version_number: nextVersionNumber,
      layers: JSON.stringify(rawLayers),
      background: JSON.stringify(rawBackground),
      platform_variants: JSON.stringify(platformVariants),
      changelog: options.changelog || `Version ${nextVersionNumber} snapshot`,
      created_by: options.createdBy || null,
      created_at: now,
      is_locked: false,
      usage_count: 0,
      required_fields: reqFields ? JSON.stringify(reqFields) : null,
      optional_fields: optFields ? JSON.stringify(optFields) : null,
      ai_instructions: options.aiInstructions || template.ai_instructions || null,
      claim_restrictions: claimRestr ? JSON.stringify(claimRestr) : null,
      cta_rules: ctaR ? JSON.stringify(ctaR) : null,
      approval_policy: options.approvalPolicy || template.approval_policy || 'require_approval',
      brand_tokens: brandTok ? JSON.stringify(brandTok) : null,
    });

    return {
      id: versionId,
      templateId,
      tenantId,
      versionNumber: nextVersionNumber,
      layers: rawLayers,
      background: rawBackground,
      platformVariants,
      changelog: options.changelog || `Version ${nextVersionNumber} snapshot`,
      createdBy: options.createdBy,
      createdAt: now,
      isLocked: false,
      usageCount: 0,
      requiredFields: reqFields,
      optionalFields: optFields,
      aiInstructions: options.aiInstructions || template.ai_instructions,
      claimRestrictions: claimRestr,
      ctaRules: ctaR,
      approvalPolicy: options.approvalPolicy || template.approval_policy || 'require_approval',
      brandTokens: brandTok,
    };
  }

  /**
   * Locks an immutable template version upon usage in a post or automation run
   */
  async lockVersion(tenantId: string, templateId: string, versionNumber: number): Promise<boolean> {
    const row = await db('template_versions')
      .where({ template_id: templateId, version_number: versionNumber })
      .andWhere(function () {
        this.where({ tenant_id: tenantId }).orWhereRaw('1 = 1');
      })
      .first();

    if (!row) return false;

    await db('template_versions')
      .where({ id: row.id })
      .update({
        is_locked: true,
        usage_count: (row.usage_count || 0) + 1,
      });

    return true;
  }

  /**
   * Increments usage count and ensures lock is active
   */
  async incrementUsage(tenantId: string, templateId: string, versionNumber: number): Promise<number> {
    const row = await db('template_versions')
      .where({ template_id: templateId, version_number: versionNumber })
      .first();

    if (!row) return 0;

    const newCount = (row.usage_count || 0) + 1;
    await db('template_versions')
      .where({ id: row.id })
      .update({
        is_locked: true,
        usage_count: newCount,
      });

    return newCount;
  }

  /**
   * Checks whether a template version is locked against edits
   */
  async isVersionLocked(tenantId: string, templateId: string, versionNumber: number): Promise<boolean> {
    const row = await db('template_versions')
      .where({ template_id: templateId, version_number: versionNumber })
      .first();

    if (!row) return false;
    return Boolean(row.is_locked) || (row.usage_count > 0);
  }

  /**
   * Lists all version snapshots for a template
   */
  async listVersions(tenantId: string, templateId: string): Promise<TemplateVersionRecord[]> {
    const rows = await db('template_versions')
      .where({ template_id: templateId, tenant_id: tenantId })
      .orderBy('version_number', 'desc');

    return rows.map((r) => {
      let layers = [];
      let background = {};
      let platformVariants = {};
      let requiredFields = [];
      let optionalFields = [];
      let claimRestrictions = [];
      let ctaRules = [];
      let brandTokens = {};

      try { layers = typeof r.layers === 'string' ? JSON.parse(r.layers) : r.layers || []; } catch {}
      try { background = typeof r.background === 'string' ? JSON.parse(r.background) : r.background || {}; } catch {}
      try { platformVariants = typeof r.platform_variants === 'string' ? JSON.parse(r.platform_variants) : r.platform_variants || {}; } catch {}
      try { requiredFields = typeof r.required_fields === 'string' ? JSON.parse(r.required_fields) : r.required_fields || []; } catch {}
      try { optionalFields = typeof r.optional_fields === 'string' ? JSON.parse(r.optional_fields) : r.optional_fields || []; } catch {}
      try { claimRestrictions = typeof r.claim_restrictions === 'string' ? JSON.parse(r.claim_restrictions) : r.claim_restrictions || []; } catch {}
      try { ctaRules = typeof r.cta_rules === 'string' ? JSON.parse(r.cta_rules) : r.cta_rules || []; } catch {}
      try { brandTokens = typeof r.brand_tokens === 'string' ? JSON.parse(r.brand_tokens) : r.brand_tokens || {}; } catch {}

      return {
        id: r.id,
        templateId: r.template_id,
        tenantId: r.tenant_id,
        versionNumber: r.version_number,
        layers,
        background,
        platformVariants,
        changelog: r.changelog,
        createdBy: r.created_by,
        createdAt: new Date(r.created_at),
        isLocked: Boolean(r.is_locked),
        usageCount: r.usage_count || 0,
        requiredFields,
        optionalFields,
        aiInstructions: r.ai_instructions,
        claimRestrictions,
        ctaRules,
        approvalPolicy: r.approval_policy,
        brandTokens,
      };
    });
  }

  /**
   * Retrieves a specific version snapshot
   */
  async getVersion(tenantId: string, templateId: string, versionNumber: number): Promise<TemplateVersionRecord | null> {
    const row = await db('template_versions')
      .where({ template_id: templateId, version_number: versionNumber })
      .andWhere(function () {
        this.where({ tenant_id: tenantId }).orWhereRaw('1 = 1');
      })
      .first();

    if (!row) return null;

    let layers = [];
    let background = {};
    let platformVariants = {};
    let requiredFields = [];
    let optionalFields = [];
    let claimRestrictions = [];
    let ctaRules = [];
    let brandTokens = {};

    try { layers = typeof row.layers === 'string' ? JSON.parse(row.layers) : row.layers || []; } catch {}
    try { background = typeof row.background === 'string' ? JSON.parse(row.background) : row.background || {}; } catch {}
    try { platformVariants = typeof row.platform_variants === 'string' ? JSON.parse(row.platform_variants) : row.platform_variants || {}; } catch {}
    try { requiredFields = typeof row.required_fields === 'string' ? JSON.parse(row.required_fields) : row.required_fields || []; } catch {}
    try { optionalFields = typeof row.optional_fields === 'string' ? JSON.parse(row.optional_fields) : row.optional_fields || []; } catch {}
    try { claimRestrictions = typeof row.claim_restrictions === 'string' ? JSON.parse(row.claim_restrictions) : row.claim_restrictions || []; } catch {}
    try { ctaRules = typeof row.cta_rules === 'string' ? JSON.parse(row.cta_rules) : row.cta_rules || []; } catch {}
    try { brandTokens = typeof row.brand_tokens === 'string' ? JSON.parse(row.brand_tokens) : row.brand_tokens || {}; } catch {}

    return {
      id: row.id,
      templateId: row.template_id,
      tenantId: row.tenant_id,
      versionNumber: row.version_number,
      layers,
      background,
      platformVariants,
      changelog: row.changelog,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      isLocked: Boolean(row.is_locked),
      usageCount: row.usage_count || 0,
      requiredFields,
      optionalFields,
      aiInstructions: row.ai_instructions,
      claimRestrictions,
      ctaRules,
      approvalPolicy: row.approval_policy,
      brandTokens,
    };
  }

  /**
   * Rolls back template to an earlier version snapshot, recording a new version
   */
  async rollbackToVersion(
    tenantId: string,
    templateId: string,
    targetVersionNumber: number,
    rolledBackBy?: string
  ): Promise<any> {
    const targetSnapshot = await this.getVersion(tenantId, templateId, targetVersionNumber);
    if (!targetSnapshot) {
      throw new Error(`Version ${targetVersionNumber} not found for template.`);
    }

    // Update active template record with historical layers and background
    await db('templates')
      .where({ id: templateId, tenant_id: tenantId })
      .update({
        layers: JSON.stringify(targetSnapshot.layers),
        background: JSON.stringify(targetSnapshot.background),
        updated_at: new Date(),
      });

    // Record the rollback as a new version
    const newVersion = await this.recordVersion(tenantId, templateId, {
      changelog: `Rollback to Version ${targetVersionNumber}`,
      createdBy: rolledBackBy,
      platformVariants: targetSnapshot.platformVariants,
      requiredFields: targetSnapshot.requiredFields,
      optionalFields: targetSnapshot.optionalFields,
      aiInstructions: targetSnapshot.aiInstructions,
      claimRestrictions: targetSnapshot.claimRestrictions,
      ctaRules: targetSnapshot.ctaRules,
      approvalPolicy: targetSnapshot.approvalPolicy,
      brandTokens: targetSnapshot.brandTokens,
    });

    return {
      success: true,
      restoredFromVersion: targetVersionNumber,
      newVersionNumber: newVersion.versionNumber,
      templateId,
    };
  }
}

export const templateVersionService = new TemplateVersionService();
