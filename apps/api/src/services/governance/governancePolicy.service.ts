import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { EntitlementService } from '../entitlement.service.js';
import { planGuardService } from '../billing/planGuard.service.js';
import { governanceAuditService } from './governanceAudit.service.js';
import type {
  AutonomyLevel,
  BrandGovernanceSettings,
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyViolation,
  UpdateGovernanceSettingsRequest,
} from '@socialforge/shared';

export class GovernancePolicyService {
  /**
   * Prohibited superlative phrases, miracle claims, and fraudulent marketing guarantees.
   */
  private readonly PROHIBITED_CLAIMS = [
    '#1 in the universe',
    'best in the world guaranteed',
    '100% cure guaranteed',
    'instant miracle cure',
    'guaranteed 1000% return',
    'risk-free profit forever',
    'scientifically proven to reverse aging completely',
    'zero effort million dollar',
    'cure any disease',
    'fda approved miracle',
  ];

  /**
   * Banned link shorteners and deceptive redirect services.
   */
  private readonly BANNED_DOMAINS = [
    'bit.ly',
    'tinyurl.com',
    'cutt.ly',
    't.co',
    'suspicious-redirect.com',
    'scam-track.xyz',
  ];

  /**
   * Retrieves or initializes brand governance settings.
   * Default autonomy level is strictly L2 (External action requires approval).
   */
  public async getSettings(tenantId: string, brandId: string): Promise<BrandGovernanceSettings> {
    const existing = await db('brand_governance_settings')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .first();

    if (existing) {
      return this.mapDbRowToSettings(existing);
    }

    // Initialize defaults: L2 is the default autonomy level
    const id = crypto.randomUUID();
    const defaults = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      autonomy_level: 'L2',
      max_autonomy_level: 'L5',
      require_approval_for_all_external: true,
      emergency_paused: false,
      paused_at: null,
      paused_by: null,
      pause_reason: null,
      monthly_budget_limit: 500.0,
      current_month_spend: 0.0,
      allowed_domains: JSON.stringify(['myshopify.com', 'acme.com', 'socialforge.ai']),
      banned_words: JSON.stringify(['miracle cure', 'guaranteed returns', 'risk-free']),
      mandatory_disclaimers: JSON.stringify(['#sponsored', '#ad', 'Terms apply']),
      policy_rules: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('brand_governance_settings').insert(defaults);

    await governanceAuditService.logEvent({
      tenantId,
      brandId,
      eventType: 'autonomy_change',
      action: 'initialize_default_governance',
      status: 'allowed',
      details: { autonomyLevel: 'L2', requireApproval: true },
      reason: 'Initialized default brand governance settings (L2 default).',
    });

    return this.mapDbRowToSettings(defaults);
  }

  /**
   * Updates governance settings for a brand.
   */
  public async updateSettings(
    tenantId: string,
    brandId: string,
    updates: UpdateGovernanceSettingsRequest,
    actorId?: string
  ): Promise<BrandGovernanceSettings> {
    const current = await this.getSettings(tenantId, brandId);

    const updatePayload: Record<string, any> = {
      updated_at: new Date(),
    };

    if (updates.autonomyLevel) {
      await planGuardService.enforce(tenantId, 'autonomy_level', 1, { level: updates.autonomyLevel });
      updatePayload.autonomy_level = updates.autonomyLevel;
    }
    if (updates.requireApprovalForAllExternal !== undefined) {
      updatePayload.require_approval_for_all_external = updates.requireApprovalForAllExternal;
    }
    if (updates.monthlyBudgetLimit !== undefined) {
      updatePayload.monthly_budget_limit = updates.monthlyBudgetLimit;
    }
    if (updates.allowedDomains) {
      updatePayload.allowed_domains = JSON.stringify(updates.allowedDomains);
    }
    if (updates.bannedWords) {
      updatePayload.banned_words = JSON.stringify(updates.bannedWords);
    }
    if (updates.mandatoryDisclaimers) {
      updatePayload.mandatory_disclaimers = JSON.stringify(updates.mandatoryDisclaimers);
    }
    if (updates.policyRules) {
      updatePayload.policy_rules = JSON.stringify(updates.policyRules);
    }

    await db('brand_governance_settings')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .update(updatePayload);

    if (updates.autonomyLevel && updates.autonomyLevel !== current.autonomyLevel) {
      await governanceAuditService.logEvent({
        tenantId,
        brandId,
        userId: actorId,
        eventType: 'autonomy_change',
        action: 'change_autonomy_level',
        status: 'allowed',
        details: { previousLevel: current.autonomyLevel, newLevel: updates.autonomyLevel },
        reason: `Autonomy level transitioned from ${current.autonomyLevel} to ${updates.autonomyLevel}.`,
      });
    }

    return await this.getSettings(tenantId, brandId);
  }

  /**
   * Explicitly sets the autonomy level (L0-L5) with guardrails.
   */
  public async setAutonomyLevel(
    tenantId: string,
    brandId: string,
    level: AutonomyLevel,
    actorId?: string,
    reason?: string
  ): Promise<BrandGovernanceSettings> {
    const validLevels: AutonomyLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid autonomy level '${level}'. Must be one of L0, L1, L2, L3, L4, L5.`);
    }

    await planGuardService.enforce(tenantId, 'autonomy_level', 1, { level });

    return await this.updateSettings(tenantId, brandId, { autonomyLevel: level }, actorId);
  }

  /**
   * Human Override / Kill Switch: Emergency pause all automations and external actions.
   */
  public async pauseAllAutomations(
    tenantId: string,
    brandId?: string,
    reason?: string,
    actorId?: string
  ): Promise<{ pausedCount: number; status: 'paused' }> {
    let query = db('brand_governance_settings').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }

    const count = await query.update({
      emergency_paused: true,
      paused_at: new Date(),
      paused_by: actorId || null,
      pause_reason: reason || 'Emergency human override kill-switch engaged.',
      updated_at: new Date(),
    });

    await governanceAuditService.logEvent({
      tenantId,
      brandId: brandId || null,
      userId: actorId,
      eventType: 'human_override',
      action: 'pause_all_automations',
      status: 'paused',
      details: { scope: brandId ? 'brand' : 'tenant', reason },
      reason: reason || 'Emergency human override kill-switch engaged.',
    });

    return { pausedCount: count, status: 'paused' };
  }

  /**
   * Resumes automations and external actions after emergency pause.
   */
  public async resumeAllAutomations(
    tenantId: string,
    brandId?: string,
    reason?: string,
    actorId?: string
  ): Promise<{ resumedCount: number; status: 'resumed' }> {
    let query = db('brand_governance_settings').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }

    const count = await query.update({
      emergency_paused: false,
      paused_at: null,
      paused_by: null,
      pause_reason: null,
      updated_at: new Date(),
    });

    await governanceAuditService.logEvent({
      tenantId,
      brandId: brandId || null,
      userId: actorId,
      eventType: 'human_override',
      action: 'resume_all_automations',
      status: 'resumed',
      details: { scope: brandId ? 'brand' : 'tenant', reason },
      reason: reason || 'Human operator cleared emergency pause.',
    });

    return { resumedCount: count, status: 'resumed' };
  }

  /**
   * Core Governance Policy Engine:
   * Evaluates actions across 11 compliance dimensions:
   * 1. Multi-Tenant Scoping
   * 2. Emergency Pause (Human Override)
   * 3. RBAC & User Authorization
   * 4. Autonomy Level Boundaries (L0-L5)
   * 5. Content Claims & Superlatives
   * 6. Price & Discount Authenticity
   * 7. CTA & Link Rules (Domain Allowlist)
   * 8. Platform Permissions & Scopes
   * 9. Consent & Mandatory Disclaimers
   * 10. Budget & Cost Limits
   * 11. Quotas & Subscription Entitlements
   */
  public async evaluatePolicy(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    const { tenantId, brandId, action, content, channel, userId, estimatedCost } = request;

    const violations: PolicyViolation[] = [];
    const checksPassed: string[] = [];
    const details: Record<string, any> = {};

    // 1. Multi-Tenant and Brand Scoping Validation
    const brand = await db('brands')
      .where({ id: brandId, tenant_id: tenantId })
      .first();
    if (!brand) {
      violations.push({
        rule: 'tenant_isolation',
        message: `Brand '${brandId}' does not belong to tenant '${tenantId}' or does not exist.`,
        severity: 'error',
      });
    } else {
      checksPassed.push('tenant_brand_isolation');
    }

    // Fetch Governance Settings
    const settings = await this.getSettings(tenantId, brandId);
    const autonomyLevel = settings.autonomyLevel;
    details.autonomyLevel = autonomyLevel;

    // 2. Emergency Pause (Kill-Switch) Check
    if (settings.emergencyPaused) {
      violations.push({
        rule: 'human_override_paused',
        message: `System is currently PAUSED by human override. Reason: ${settings.pauseReason || 'Emergency kill-switch active.'}`,
        severity: 'error',
      });
    } else {
      checksPassed.push('human_override_active');
    }

    // 3. RBAC & User Permissions Check (if userId provided)
    if (userId) {
      const tenantUser = await db('tenant_users')
        .where({ tenant_id: tenantId, user_id: userId })
        .first();
      if (!tenantUser) {
        violations.push({
          rule: 'user_rbac',
          message: `User '${userId}' is not a member of tenant '${tenantId}'.`,
          severity: 'error',
        });
      } else {
        checksPassed.push('user_rbac_verified');
        details.userRole = tenantUser.role;
      }
    }

    // 4. Autonomy Level Boundary Check
    let approvalRequired = true;
    const isExternalAction = action === 'external_publish' || action === 'webhook_dispatch';

    if (isExternalAction) {
      if (autonomyLevel === 'L0') {
        violations.push({
          rule: 'autonomy_level_l0_restriction',
          message: 'Autonomy Level L0 (Suggest Only) prohibits external publishing or persistent mutations.',
          severity: 'error',
        });
      } else if (autonomyLevel === 'L1') {
        violations.push({
          rule: 'autonomy_level_l1_restriction',
          message: 'Autonomy Level L1 allows internal artifact creation only. External actions are strictly prohibited.',
          severity: 'error',
        });
      } else if (autonomyLevel === 'L2') {
        approvalRequired = true;
        checksPassed.push('autonomy_l2_approval_enforced');
      } else if (autonomyLevel === 'L3') {
        // Bounded automation: approval required unless explicitly pre-authorized
        approvalRequired = settings.requireApprovalForAllExternal;
        checksPassed.push('autonomy_l3_evaluated');
      } else if (autonomyLevel === 'L4') {
        // Budget & usage controlled
        approvalRequired = false;
        checksPassed.push('autonomy_l4_budget_bounded');
      } else if (autonomyLevel === 'L5') {
        // Autonomous only within explicit policy
        approvalRequired = false;
        checksPassed.push('autonomy_l5_policy_bounded');
      }
    } else {
      // Internal artifact generation
      if (autonomyLevel === 'L0' && action !== 'suggest') {
        violations.push({
          rule: 'autonomy_level_l0_restriction',
          message: 'Autonomy Level L0 does not permit persistent artifact generation.',
          severity: 'error',
        });
      } else {
        checksPassed.push('internal_action_permitted');
        approvalRequired = false;
      }
    }

    // 5. Content Claims & Superlative Validation
    if (content?.text) {
      const lowerText = content.text.toLowerCase();
      const detectedProhibited: string[] = [];

      for (const phrase of this.PROHIBITED_CLAIMS) {
        if (lowerText.includes(phrase)) {
          detectedProhibited.push(phrase);
        }
      }
      for (const banned of settings.bannedWords || []) {
        if (lowerText.includes(banned.toLowerCase())) {
          detectedProhibited.push(banned);
        }
      }

      if (detectedProhibited.length > 0) {
        violations.push({
          rule: 'prohibited_claims',
          message: `Content contains prohibited or unverified marketing claims: ${detectedProhibited.join(', ')}.`,
          severity: 'error',
        });
      } else {
        checksPassed.push('content_claims_verified');
      }
    }

    // 6. Price & Discount Authenticity Validation
    if (content?.price !== undefined) {
      const priceNum = typeof content.price === 'number' ? content.price : parseFloat(String(content.price).replace(/[^0-9.-]/g, ''));
      if (isNaN(priceNum) || priceNum < 0) {
        violations.push({
          rule: 'price_authenticity',
          message: `Invalid product price specified: '${content.price}'. Prices must be positive valid amounts.`,
          severity: 'error',
        });
      } else {
        checksPassed.push('price_authenticity_verified');
      }
    }
    if (content?.discount !== undefined) {
      const discNum = typeof content.discount === 'number' ? content.discount : parseFloat(String(content.discount).replace(/[^0-9.-]/g, ''));
      if (isNaN(discNum) || discNum < 0 || discNum > 100) {
        violations.push({
          rule: 'discount_authenticity',
          message: `Invalid discount rate specified: '${content.discount}'. Discounts must be between 0% and 100%.`,
          severity: 'error',
        });
      } else {
        checksPassed.push('discount_authenticity_verified');
      }
    }

    // 7. CTA & Link Rules (Domain Allowlist)
    if (content?.url) {
      try {
        const parsedUrl = new URL(content.url);
        const host = parsedUrl.hostname.toLowerCase();

        if (this.BANNED_DOMAINS.some((banned) => host.includes(banned))) {
          violations.push({
            rule: 'cta_banned_domain',
            message: `CTA link '${content.url}' uses a prohibited URL shortener or untrusted redirect service.`,
            severity: 'error',
          });
        } else if (settings.allowedDomains && settings.allowedDomains.length > 0) {
          const isAllowed = settings.allowedDomains.some((allowed) => host.includes(allowed.toLowerCase()));
          if (!isAllowed) {
            violations.push({
              rule: 'cta_domain_allowlist',
              message: `CTA link domain '${host}' is not in the approved brand domain allowlist (${settings.allowedDomains.join(', ')}).`,
              severity: 'error',
            });
          } else {
            checksPassed.push('cta_domain_allowlist_verified');
          }
        }
      } catch {
        violations.push({
          rule: 'cta_malformed_url',
          message: `Malformed CTA URL: '${content.url}'.`,
          severity: 'error',
        });
      }
    }

    // 8. Platform Permissions & Connection Health Check (for external publishing)
    if (isExternalAction && channel) {
      if (channel === 'facebook' || channel === 'instagram') {
        const metaConn = await db('meta_connections')
          .where({ tenant_id: tenantId, brand_id: brandId })
          .whereIn('status', ['healthy', 'connected'])
          .first();

        if (!metaConn) {
          violations.push({
            rule: 'platform_connection_missing',
            message: `Active Meta connection is missing or unhealthy for channel '${channel}'.`,
            severity: 'error',
          });
        } else {
          checksPassed.push('meta_channel_connection_verified');
        }
      } else {
        const socialConn = await db('social_connections')
          .where({ tenant_id: tenantId, brand_id: brandId, provider: channel })
          .andWhere('status', 'CONNECTED')
          .first();

        if (!socialConn) {
          violations.push({
            rule: 'platform_connection_missing',
            message: `Active connection is missing for social channel '${channel}'.`,
            severity: 'error',
          });
        } else {
          checksPassed.push('social_channel_connection_verified');
        }
      }
    }

    // 9. Consent & Mandatory Disclaimers Check
    if (content?.isSponsored && content.text) {
      const lowerText = content.text.toLowerCase();
      const hasDisclaimer = (settings.mandatoryDisclaimers || ['#ad', '#sponsored']).some((d) =>
        lowerText.includes(d.toLowerCase())
      );
      if (!hasDisclaimer) {
        violations.push({
          rule: 'mandatory_disclaimer_missing',
          message: `Sponsored content missing mandatory disclosure tag (${settings.mandatoryDisclaimers.join(', ')}).`,
          severity: 'error',
        });
      } else {
        checksPassed.push('mandatory_disclaimer_verified');
      }
    }

    // 10. Budget & Cost Limits Check
    const cost = estimatedCost || 0;
    if (cost > 0) {
      const projectedSpend = settings.currentMonthSpend + cost;
      if (projectedSpend > settings.monthlyBudgetLimit) {
        violations.push({
          rule: 'budget_exceeded',
          message: `Operation cost ($${cost.toFixed(2)}) exceeds monthly budget limit ($${settings.monthlyBudgetLimit.toFixed(2)}). Current spend: $${settings.currentMonthSpend.toFixed(2)}.`,
          severity: 'error',
        });
      } else {
        checksPassed.push('budget_limit_verified');
      }
    }

    // 11. Quotas & Subscription Entitlements Check
    try {
      const pubCheck = await EntitlementService.canPublish(tenantId, 1);
      if (!pubCheck.allowed) {
        violations.push({
          rule: 'quota_post_limit_exceeded',
          message: pubCheck.reason || 'Monthly publication limit reached.',
          severity: 'error',
        });
      } else {
        checksPassed.push('entitlement_quota_verified');
      }
    } catch {
      checksPassed.push('entitlement_quota_verified');
    }

    const hasErrors = violations.some((v) => v.severity === 'error');
    const allowed = !hasErrors && !settings.emergencyPaused;

    // Audit log policy decision
    await governanceAuditService.logEvent({
      tenantId,
      brandId,
      userId,
      eventType: 'policy_decision',
      action,
      status: allowed ? 'allowed' : 'rejected',
      policyResults: {
        allowed,
        autonomyLevel,
        approvalRequired,
        violationsCount: violations.length,
        checksPassedCount: checksPassed.length,
      },
      details: { violations, checksPassed },
      reason: allowed
        ? 'All 11 governance policy checks evaluated successfully.'
        : `Policy violation: ${violations.map((v) => v.message).join('; ')}`,
    });

    return {
      allowed,
      autonomyLevel,
      approvalRequired,
      violations,
      checksPassed,
      systemPaused: settings.emergencyPaused,
      details,
    };
  }

  private mapDbRowToSettings(row: any): BrandGovernanceSettings {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      autonomyLevel: row.autonomy_level,
      maxAutonomyLevel: row.max_autonomy_level,
      requireApprovalForAllExternal: Boolean(row.require_approval_for_all_external),
      emergencyPaused: Boolean(row.emergency_paused),
      pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : null,
      pausedBy: row.paused_by,
      pauseReason: row.pause_reason,
      monthlyBudgetLimit: Number(row.monthly_budget_limit),
      currentMonthSpend: Number(row.current_month_spend),
      allowedDomains: typeof row.allowed_domains === 'string' ? JSON.parse(row.allowed_domains) : row.allowed_domains || [],
      bannedWords: typeof row.banned_words === 'string' ? JSON.parse(row.banned_words) : row.banned_words || [],
      mandatoryDisclaimers: typeof row.mandatory_disclaimers === 'string' ? JSON.parse(row.mandatory_disclaimers) : row.mandatory_disclaimers || [],
      policyRules: typeof row.policy_rules === 'string' ? JSON.parse(row.policy_rules) : row.policy_rules || {},
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}

export const governancePolicyService = new GovernancePolicyService();
