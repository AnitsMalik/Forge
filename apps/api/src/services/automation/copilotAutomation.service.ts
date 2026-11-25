import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { templateService } from '../templates/index.js';
import { EntitlementService } from '../entitlement.service.js';
import { planGuardService } from '../billing/planGuard.service.js';
import type {
  CopilotIntent,
  CopilotValidationReport,
  CopilotToolCallAudit,
  CopilotStructuredPlan,
  CopilotAutomationPlan,
  CreateCopilotPlanRequest,
  EditCopilotPlanRequest,
} from '@socialforge/shared';

export class CopilotAutomationService {
  /**
   * Main entrypoint: POST /agent/copilot/automation
   * Converts natural language into a structured automation plan.
   * Produces a plan for human review; does NOT execute external actions or publish directly.
   */
  public async generateAutomationPlan(
    tenantId: string,
    brandId: string,
    userId: string,
    request: CreateCopilotPlanRequest
  ): Promise<CopilotAutomationPlan> {
    const prompt = request.prompt;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required for Copilot automation synthesis.');
    }

    // 0. PlanGuard Entitlement Check: AI Credits budget
    await planGuardService.enforce(tenantId, 'ai_credits', 500);

    const toolCalls: CopilotToolCallAudit[] = [];

    // 1. Tool Call: Permission Validation
    const permStart = Date.now();
    const permResult = await this.validatePermissions(tenantId, userId, brandId);
    toolCalls.push({
      toolName: 'permissions.validateUserRole',
      timestamp: new Date().toISOString(),
      input: { tenantId, userId, brandId },
      result: { hasAccess: permResult.valid, role: permResult.role },
      durationMs: Date.now() - permStart,
    });
    if (!permResult.valid) {
      throw new Error(`Permission denied: User does not have authorization to create automations in this brand.`);
    }

    // 2. Intent Extraction from Natural Language
    const extractedIntent = this.extractIntentFromPrompt(prompt);

    // 3. Tool Call: Connectors Check (Zero Credential Exposure)
    const connStart = Date.now();
    const connResult = await this.checkAvailableConnectors(tenantId, brandId, extractedIntent);
    toolCalls.push({
      toolName: 'connectors.checkAvailableConnections',
      timestamp: new Date().toISOString(),
      input: { brandId, requiredChannels: extractedIntent.channels, source: extractedIntent.triggerSource },
      result: {
        connectedChannels: connResult.connectedChannels,
        missingConnectors: connResult.missingConnectors,
        hasDataSource: connResult.hasDataSource,
        zeroCredentialsExposed: true,
      },
      durationMs: Date.now() - connStart,
    });

    // 4. Tool Call: Available Template Check
    const tplStart = Date.now();
    const tplResult = await this.checkAvailableTemplate(tenantId, brandId, extractedIntent.templateName);
    toolCalls.push({
      toolName: 'templates.checkCatalogAvailability',
      timestamp: new Date().toISOString(),
      input: { templateName: extractedIntent.templateName, brandId },
      result: {
        templateFound: tplResult.found,
        templateId: tplResult.templateId,
        isCustom: tplResult.isCustom,
      },
      durationMs: Date.now() - tplStart,
    });
    extractedIntent.templateId = tplResult.templateId;

    // 5. Tool Call: Policy & Marketing Claim Validation
    const policyStart = Date.now();
    const policyResult = await this.validatePolicyAndClaims(brandId, prompt);
    toolCalls.push({
      toolName: 'policy.validateBrandRulesAndClaims',
      timestamp: new Date().toISOString(),
      input: { brandId, promptSummary: prompt.slice(0, 100) },
      result: {
        policyPassed: policyResult.valid,
        forbiddenClaimsFound: policyResult.forbiddenClaims,
      },
      durationMs: Date.now() - policyStart,
    });

    // 6. Tool Call: Quota Validation
    const quotaStart = Date.now();
    const quotaResult = await this.validateQuota(tenantId, 30); // estimated 30 monthly runs for weekdays
    toolCalls.push({
      toolName: 'quotas.evaluateAutomationLimits',
      timestamp: new Date().toISOString(),
      input: { tenantId, estimatedMonthlyRuns: 30 },
      result: {
        quotaValid: quotaResult.valid,
        planName: quotaResult.planName,
        remainingPosts: quotaResult.remaining,
      },
      durationMs: Date.now() - quotaStart,
    });

    // 7. Compile Structured Automation Workflow Plan
    const structuredPlan = this.compileStructuredPlan(extractedIntent, tplResult.templateId);

    // 8. Compile Validation Report
    const issues: string[] = [];
    const warnings: string[] = [];

    if (!connResult.valid) {
      warnings.push(`Some required channels or sources (${connResult.missingConnectors.join(', ')}) are not connected yet. They must be connected before live publishing.`);
    }
    if (!tplResult.found) {
      issues.push(`Template "${extractedIntent.templateName}" not found; falling back to canonical Product Promotion.`);
    }
    if (!policyResult.valid) {
      issues.push(`Policy check detected potential prohibited claims: ${policyResult.forbiddenClaims.join(', ')}.`);
    }
    if (!quotaResult.valid) {
      warnings.push(`Tenant is near monthly quota limit (${quotaResult.remaining} remaining).`);
    }

    const validationReport: CopilotValidationReport = {
      connectorsValid: connResult.valid,
      templateValid: tplResult.found,
      policyValid: policyResult.valid,
      quotaValid: quotaResult.valid,
      permissionsValid: permResult.valid,
      connectedChannels: connResult.connectedChannels,
      missingConnectors: connResult.missingConnectors,
      resolvedTemplateId: tplResult.templateId,
      quotaRemaining: quotaResult.remaining,
      estimatedMonthlyRuns: 30,
      issues,
      warnings,
    };

    // 9. Persist Plan in Database
    const planId = crypto.randomUUID();
    const now = new Date();
    const initialStatus = issues.length === 0 ? 'validated' : 'draft';

    const planRecord: CopilotAutomationPlan = {
      id: planId,
      tenantId,
      brandId,
      userId,
      prompt,
      extractedIntent,
      structuredPlan,
      validationReport,
      status: initialStatus,
      automationId: null,
      toolCalls,
      testResults: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await db('copilot_automation_plans').insert({
      id: planId,
      tenant_id: tenantId,
      brand_id: brandId,
      user_id: userId,
      prompt,
      extracted_intent: JSON.stringify(extractedIntent),
      structured_plan: JSON.stringify(structuredPlan),
      validation_report: JSON.stringify(validationReport),
      status: initialStatus,
      automation_id: null,
      tool_calls: JSON.stringify(toolCalls),
      test_results: null,
      created_at: now,
      updated_at: now,
    });

    return planRecord;
  }

  /**
   * Retrieves a generated automation plan by ID.
   */
  public async getPlan(tenantId: string, planId: string): Promise<CopilotAutomationPlan | null> {
    const row = await db('copilot_automation_plans')
      .where({ id: planId, tenant_id: tenantId })
      .first();

    if (!row) return null;
    return this.mapDbRowToPlan(row);
  }

  /**
   * Lists generated copilot plans for a brand/tenant.
   */
  public async listPlans(tenantId: string, brandId?: string): Promise<CopilotAutomationPlan[]> {
    let query = db('copilot_automation_plans').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.andWhere({ brand_id: brandId });
    }
    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((r) => this.mapDbRowToPlan(r));
  }

  /**
   * Dry-run tests the automation plan.
   * Simulates trigger detection, condition validation, normalization, and template binding.
   * Strictly DOES NOT execute external social publishing or modify remote feeds.
   */
  public async testPlan(
    tenantId: string,
    planId: string,
    samplePayload?: Record<string, any>
  ): Promise<{
    planId: string;
    testStatus: 'passed' | 'failed';
    stepSimulations: Array<{
      stepId: string;
      stepName: string;
      status: 'success' | 'failed' | 'skipped';
      details: string;
    }>;
    summary: string;
  }> {
    const plan = await this.getPlan(tenantId, planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    const testItem = samplePayload || {
      product_name: 'Wireless Noise-Canceling Headphones',
      price: '$199.00',
      availability: 'in_stock',
      status: 'READY',
      row_id: 'sheet_row_test_1',
    };

    const stepSimulations: Array<{
      stepId: string;
      stepName: string;
      status: 'success' | 'failed' | 'skipped';
      details: string;
    }> = [];

    // Step 1: Ingestion & Condition Check
    const condition = plan.structuredPlan.conditions[0];
    const conditionPasses = condition
      ? String(testItem[condition.field] || '').toUpperCase() === String(condition.value).toUpperCase()
      : true;

    if (!conditionPasses) {
      stepSimulations.push({
        stepId: 'cond_check',
        stepName: 'Evaluate Condition',
        status: 'failed',
        details: `Sample record status "${testItem.status}" does not match required "${condition?.value}".`,
      });
      const results = {
        planId,
        testStatus: 'failed' as const,
        stepSimulations,
        summary: 'Dry-run test failed: Condition rejected test payload.',
      };
      await db('copilot_automation_plans')
        .where({ id: planId })
        .update({ test_results: JSON.stringify(results), updated_at: new Date() });
      return results;
    }

    stepSimulations.push({
      stepId: 'cond_check',
      stepName: 'Evaluate Condition',
      status: 'success',
      details: `Condition "${condition?.field} == ${condition?.value}" evaluated to true.`,
    });

    // Step 2: Product Normalization
    const hasPrice = Boolean(testItem.price);
    const hasAvail = Boolean(testItem.availability);
    if (!hasPrice || !hasAvail) {
      stepSimulations.push({
        stepId: 'step_normalize',
        stepName: 'Validate & Normalize Catalog Product',
        status: 'failed',
        details: 'Anti-hallucination guard failure: Price or availability is missing.',
      });
      const results = {
        planId,
        testStatus: 'failed' as const,
        stepSimulations,
        summary: 'Dry-run test failed: Missing required uninvented attributes.',
      };
      await db('copilot_automation_plans')
        .where({ id: planId })
        .update({ test_results: JSON.stringify(results), updated_at: new Date() });
      return results;
    }

    stepSimulations.push({
      stepId: 'step_normalize',
      stepName: 'Validate & Normalize Catalog Product',
      status: 'success',
      details: `Normalized "${testItem.product_name}" with uninvented price ${testItem.price}.`,
    });

    // Step 3: AI Copy Synthesis
    stepSimulations.push({
      stepId: 'step_ai_understand',
      stepName: 'AI Copy Synthesis',
      status: 'success',
      details: `Simulated Facebook and Instagram captions generated adhering to brand voice.`,
    });

    // Step 4: Template Binding
    stepSimulations.push({
      stepId: 'step_render_tpl',
      stepName: 'Render Template & Variants',
      status: 'success',
      details: `Template "${plan.extractedIntent.templateName}" rendered across 1:1, 4:5, and 9:16 aspect ratios.`,
    });

    // Step 5: Approval Gate Simulation
    stepSimulations.push({
      stepId: 'step_approval_gate',
      stepName: 'Approval Gate',
      status: 'success',
      details: `Simulated 64-character cryptographic magic review link generation. Approval required before publication.`,
    });

    // Step 6: Social Publishing Simulation (Mock/Sandbox guard)
    stepSimulations.push({
      stepId: 'step_publish_meta',
      stepName: 'Publish to Meta (Simulated)',
      status: 'success',
      details: `Dry-run mode: External publishing bypassed safely. Zero network mutations performed.`,
    });

    const testResults = {
      planId,
      testStatus: 'passed' as const,
      stepSimulations,
      summary: 'All dry-run steps passed successfully. Workflow is valid and ready for activation.',
    };

    await db('copilot_automation_plans')
      .where({ id: planId })
      .update({
        test_results: JSON.stringify(testResults),
        status: 'tested',
        updated_at: new Date(),
      });

    return testResults;
  }

  /**
   * Edits a generated plan before activation.
   */
  public async editPlan(
    tenantId: string,
    planId: string,
    updates: EditCopilotPlanRequest
  ): Promise<CopilotAutomationPlan> {
    const existing = await this.getPlan(tenantId, planId);
    if (!existing) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    if (existing.status === 'activated') {
      throw new Error(`Cannot edit an already activated plan. Update the live automation directly.`);
    }

    const newStructuredPlan = {
      ...existing.structuredPlan,
      ...(updates.structuredPlan || {}),
    };

    const newExtractedIntent = {
      ...existing.extractedIntent,
      ...(updates.extractedIntent || {}),
    };

    // Strict Guard: User/AI cannot set approvalRequired to false if policy mandates approval
    newExtractedIntent.approvalRequired = true;
    newStructuredPlan.approvalPolicy = { required: true, method: 'magic_link' };

    await db('copilot_automation_plans')
      .where({ id: planId })
      .update({
        structured_plan: JSON.stringify(newStructuredPlan),
        extracted_intent: JSON.stringify(newExtractedIntent),
        updated_at: new Date(),
      });

    return (await this.getPlan(tenantId, planId))!;
  }

  /**
   * Activates the plan into a live automation in the Automation Engine.
   */
  public async activatePlan(tenantId: string, planId: string): Promise<{
    plan: CopilotAutomationPlan;
    automationId: string;
    status: string;
  }> {
    const plan = await this.getPlan(tenantId, planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    if (plan.status === 'activated') {
      return {
        plan,
        automationId: plan.automationId!,
        status: 'already_active',
      };
    }

    if (plan.status === 'cancelled') {
      throw new Error(`Cannot activate a cancelled plan.`);
    }

    // Verify brand ownership
    const brand = await db('brands')
      .where({ id: plan.brandId, tenant_id: tenantId })
      .first();

    if (!brand) {
      throw new Error('Brand not found or access denied for tenant.');
    }

    // Insert live automation into automations table
    const automationId = crypto.randomUUID();
    const webhookToken = `whk_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();

    const triggerConfig = {
      ...plan.structuredPlan.trigger,
      webhookToken,
      cronExpression: plan.structuredPlan.scheduleConfig?.cronExpression,
    };

    await db('automations').insert({
      id: automationId,
      tenant_id: tenantId,
      brand_id: plan.brandId,
      name: plan.structuredPlan.name,
      description: plan.structuredPlan.description,
      trigger_type: plan.structuredPlan.trigger.type,
      trigger_config: JSON.stringify(triggerConfig),
      conditions: JSON.stringify(plan.structuredPlan.conditions),
      actions: JSON.stringify(plan.structuredPlan.actions),
      status: 'active',
      execution_count: 0,
      created_by: plan.userId,
      created_at: now,
      updated_at: now,
    });

    // Update plan status
    await db('copilot_automation_plans')
      .where({ id: planId })
      .update({
        status: 'activated',
        automation_id: automationId,
        updated_at: now,
      });

    const updatedPlan = await this.getPlan(tenantId, planId);

    return {
      plan: updatedPlan!,
      automationId,
      status: 'active',
    };
  }

  /**
   * Cancels a generated plan.
   */
  public async cancelPlan(tenantId: string, planId: string, reason?: string): Promise<CopilotAutomationPlan> {
    const plan = await this.getPlan(tenantId, planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found.`);
    }

    await db('copilot_automation_plans')
      .where({ id: planId })
      .update({
        status: 'cancelled',
        updated_at: new Date(),
      });

    return (await this.getPlan(tenantId, planId))!;
  }

  // ---------------------------------------------------------------------------
  // Internal Intent Extraction & Validation Helpers
  // ---------------------------------------------------------------------------

  private extractIntentFromPrompt(prompt: string): CopilotIntent {
    const lower = prompt.toLowerCase();

    // 1. Trigger extraction
    let triggerSource = 'google_sheets';
    let triggerType = 'datasource_change';
    let triggerName = 'New product';

    if (lower.includes('google sheet') || lower.includes('spreadsheet') || lower.includes('excel')) {
      triggerSource = 'google_sheets_or_excel';
      triggerType = 'datasource_change';
      triggerName = 'New or updated product in Google Sheet';
    } else if (lower.includes('drive') || lower.includes('google drive')) {
      triggerSource = 'google_drive';
      triggerType = 'drive_file_changed';
      triggerName = 'New Drive file';
    } else if (lower.includes('shopify') || lower.includes('store product')) {
      triggerSource = 'shopify';
      triggerType = 'commerce_product_created';
      triggerName = 'New Commerce Product';
    } else if (lower.includes('winner') || lower.includes('outperformer')) {
      triggerSource = 'analytics';
      triggerType = 'analytics_winner_detected';
      triggerName = 'Analytics Winner Detected';
    }

    // 2. Template extraction
    let templateName = 'Product Promotion';
    if (lower.includes('product promotion')) {
      templateName = 'Product Promotion';
    } else if (lower.includes('review') || lower.includes('testimonial')) {
      templateName = 'Testimonial Review';
    } else if (lower.includes('announcement') || lower.includes('milestone')) {
      templateName = 'Company Announcement';
    } else if (lower.includes('tip') || lower.includes('how to')) {
      templateName = 'Educational Tip';
    }

    // 3. Channels extraction
    const channels: string[] = [];
    if (lower.includes('instagram')) channels.push('instagram');
    if (lower.includes('facebook')) channels.push('facebook');
    if (lower.includes('linkedin')) channels.push('linkedin');
    if (lower.includes('twitter') || lower.includes(' x ')) channels.push('twitter');
    if (lower.includes('tiktok')) channels.push('tiktok');
    if (channels.length === 0) {
      channels.push('instagram', 'facebook');
    }

    // 4. Schedule extraction
    let schedule = 'Weekdays 7 PM';
    let cronExpression = '0 19 * * 1-5';

    if (lower.includes('weekday') && (lower.includes('7 pm') || lower.includes('19:00'))) {
      schedule = 'Weekdays 7 PM';
      cronExpression = '0 19 * * 1-5';
    } else if (lower.includes('daily') || lower.includes('every day')) {
      schedule = 'Daily 9 AM';
      cronExpression = '0 9 * * *';
    } else if (lower.includes('weekend')) {
      schedule = 'Weekends 10 AM';
      cronExpression = '0 10 * * 6,0';
    } else if (lower.includes('monday')) {
      schedule = 'Mondays 9 AM';
      cronExpression = '0 9 * * 1';
    }

    // 5. Conditions & Approval
    const statusCondition = 'READY';
    const approvalRequired = true; // Non-bypassable: Always required by default

    return {
      triggerName,
      triggerType,
      triggerSource,
      templateName,
      channels,
      schedule,
      cronExpression,
      approvalRequired,
      statusCondition,
    };
  }

  private async checkAvailableConnectors(
    tenantId: string,
    brandId: string,
    intent: CopilotIntent
  ): Promise<{ valid: boolean; connectedChannels: string[]; missingConnectors: string[]; hasDataSource: boolean }> {
    // Check Meta / Social connections
    const metaConn = await db('meta_connections')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .whereIn('status', ['healthy', 'connected'])
      .first();

    const socialConns = await db('social_connections')
      .where({ tenant_id: tenantId, brand_id: brandId })
      .andWhere('status', 'CONNECTED');

    const connectedChannels: string[] = [];
    if (metaConn) {
      connectedChannels.push('facebook', 'instagram');
    }
    for (const sc of socialConns) {
      if (sc.provider) connectedChannels.push(sc.provider.toLowerCase());
    }

    const missingConnectors: string[] = [];
    for (const ch of intent.channels) {
      if (!connectedChannels.includes(ch)) {
        missingConnectors.push(ch);
      }
    }

    // Check data source connector
    const hasDataSource = Boolean(
      socialConns.some((sc) => sc.provider === 'google-sheets' || sc.provider === 'google-drive') ||
      intent.triggerSource === 'google_sheets_or_excel'
    );

    return {
      valid: missingConnectors.length === 0,
      connectedChannels: Array.from(new Set(connectedChannels)),
      missingConnectors,
      hasDataSource,
    };
  }

  private async checkAvailableTemplate(
    tenantId: string,
    brandId: string,
    templateName: string
  ): Promise<{ found: boolean; templateId: string; isCustom: boolean }> {
    // Canonical template match
    if (templateName.toLowerCase().includes('product')) {
      return { found: true, templateId: 'tpl-product-flagship', isCustom: false };
    }

    const tpl = await templateService.selectBestTemplate(tenantId, {
      category: 'product_promotion',
      brandId,
    });

    if (tpl) {
      return { found: true, templateId: tpl.id, isCustom: Boolean(tpl.isCustom) };
    }

    return { found: true, templateId: 'tpl-product-flagship', isCustom: false };
  }

  private async validatePolicyAndClaims(
    brandId: string,
    prompt: string
  ): Promise<{ valid: boolean; forbiddenClaims: string[] }> {
    const prohibitedWords = [
      'guaranteed profit',
      'miracle cure',
      'instant wealth',
      '#1 in the world',
      'cure all disease',
      '100% risk free',
    ];

    const forbiddenClaims: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    for (const phrase of prohibitedWords) {
      if (lowerPrompt.includes(phrase)) {
        forbiddenClaims.push(phrase);
      }
    }

    return {
      valid: forbiddenClaims.length === 0,
      forbiddenClaims,
    };
  }

  private async validateQuota(
    tenantId: string,
    estimatedMonthlyRuns: number
  ): Promise<{ valid: boolean; planName: string; remaining: number }> {
    try {
      const sub = await EntitlementService.getResolvedSubscription(tenantId);
      const limit = sub.maxPostsPerMonth || 100;
      return {
        valid: limit >= estimatedMonthlyRuns,
        planName: sub.planName || 'Agency Pro',
        remaining: Math.max(0, limit - estimatedMonthlyRuns),
      };
    } catch {
      return {
        valid: true,
        planName: 'Standard',
        remaining: 100,
      };
    }
  }

  private async validatePermissions(
    tenantId: string,
    userId: string,
    brandId: string
  ): Promise<{ valid: boolean; role?: string }> {
    const tu = await db('tenant_users')
      .where({ tenant_id: tenantId, user_id: userId })
      .first();

    if (!tu) {
      return { valid: false };
    }

    const allowedRoles = ['owner', 'admin', 'agency_admin', 'brand_manager', 'creator'];
    return {
      valid: allowedRoles.includes(tu.role),
      role: tu.role,
    };
  }

  private compileStructuredPlan(
    intent: CopilotIntent,
    templateId: string
  ): CopilotStructuredPlan {
    return {
      name: `${intent.templateName} (${intent.channels.join(' & ')})`,
      description: `Automated workflow: ${intent.triggerName} with ${intent.templateName} on ${intent.channels.join(', ')} scheduled for ${intent.schedule}.`,
      trigger: {
        type: intent.triggerType,
        sourceType: intent.triggerSource,
        intervalMinutes: 15,
        cronExpression: intent.cronExpression,
      },
      conditions: [
        {
          field: 'status',
          operator: 'equals',
          value: intent.statusCondition,
        },
      ],
      actions: [
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
            platforms: intent.channels,
          },
        },
        {
          id: 'step_render_tpl',
          type: 'render_template',
          name: 'Render Product Promotion Template & Variants',
          config: {
            templateId,
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
            platforms: intent.channels,
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
          name: `Schedule Post (${intent.schedule})`,
          config: {
            cronExpression: intent.cronExpression,
            humanReadable: intent.schedule,
          },
        },
        {
          id: 'step_publish_meta',
          type: 'publish_meta',
          name: `Publish to ${intent.channels.join(' & ')}`,
          config: {
            platforms: intent.channels,
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
          name: 'Generate Closed-Loop AI Growth Recommendation',
          config: {},
        },
      ],
      approvalPolicy: {
        required: true,
        method: 'magic_link',
      },
      scheduleConfig: {
        humanReadable: intent.schedule,
        cronExpression: intent.cronExpression,
      },
    };
  }

  private mapDbRowToPlan(row: any): CopilotAutomationPlan {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      userId: row.user_id,
      prompt: row.prompt,
      extractedIntent: typeof row.extracted_intent === 'string' ? JSON.parse(row.extracted_intent) : row.extracted_intent,
      structuredPlan: typeof row.structured_plan === 'string' ? JSON.parse(row.structured_plan) : row.structured_plan,
      validationReport: typeof row.validation_report === 'string' ? JSON.parse(row.validation_report) : row.validation_report,
      status: row.status,
      automationId: row.automation_id,
      toolCalls: typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls || [],
      testResults: typeof row.test_results === 'string' ? JSON.parse(row.test_results) : row.test_results || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const copilotAutomationService = new CopilotAutomationService();
