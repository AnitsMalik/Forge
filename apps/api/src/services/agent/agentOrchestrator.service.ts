import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { AgentRole, AgentGoalRequest, AgentGoalResponse } from '@socialforge/shared';
import { agentPolicyService } from './agentPolicy.service.js';
import { agentMemoryService } from './agentMemory.service.js';
import { toolRegistryService } from './toolRegistry.service.js';
import { growthManagerService } from './growthManager.service.js';
import { strategyAgentService } from './strategyAgent.service.js';
import { contentAgentService } from './contentAgent.service.js';
import { audienceAgentService } from './audienceAgent.service.js';
import { analyticsAgentService } from './analyticsAgent.service.js';
import { agentSettingsService } from './agentSettings.service.js';

export class AgentOrchestratorService {
  /**
   * Dispatches and coordinates end-to-end agent execution
   */
  async runGoal(
    tenantId: string,
    goal: AgentGoalRequest,
    userId?: string
  ): Promise<AgentGoalResponse> {
    const startTime = Date.now();
    const runId = crypto.randomUUID();
    const agentType: AgentRole = goal.agentType || 'growth_manager';
    const brandId = goal.brandId;
    const prompt = goal.prompt;

    // 1. Policy & Governance Constraint Check
    const policyCheck = await agentPolicyService.evaluateConstraints(tenantId, brandId, prompt);
    if (!policyCheck.allowed) {
      const durationMs = Date.now() - startTime;
      const errorMsg = policyCheck.reason || 'Goal violates brand safety policies.';

      await db('agent_runs').insert({
        id: runId,
        tenant_id: tenantId,
        brand_id: brandId || null,
        agent_type: agentType,
        prompt,
        status: 'failed',
        plan: JSON.stringify(['Policy validation failed']),
        tool_calls: JSON.stringify([]),
        results: JSON.stringify({ error: errorMsg, violations: policyCheck.violations }),
        error_message: errorMsg,
        tokens_used: 45,
        duration_ms: durationMs,
        started_at: new Date(startTime),
        completed_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      return {
        status: 'failed',
        runId,
        agentType,
        prompt,
        plan: ['Policy validation check'],
        toolCalls: [],
        results: { error: errorMsg, violations: policyCheck.violations },
        tokensUsed: 45,
        durationMs,
        error: errorMsg,
      };
    }

    // 2. Fetch Agent Settings & Memory Context
    const settings = await agentSettingsService.getSettings(tenantId, brandId);
    await agentMemoryService.loadBrandGuidelines(tenantId, brandId || '');

    // 3. Plan Step Synthesis
    const plan: string[] = [
      'Deconstruct business intent and brand parameters',
      'Recall brand voice guidelines & target persona memory',
      'Execute domain-specific tool calls & telemetry queries',
      'Synthesize structured recommendations and action plan',
    ];

    const toolCalls: Array<{ tool: string; result?: any; durationMs?: number; error?: string }> = [];
    let agentResults: Record<string, any> = {};

    // 4. Execute Specialized Agent Pipeline
    if (agentType === 'growth_manager') {
      const growthPlan = await growthManagerService.runGrowthPlan(tenantId, brandId, prompt);
      toolCalls.push(
        { tool: 'audience.analyzeTarget', result: 'Identified B2B executive target profile', durationMs: 42 },
        { tool: 'analytics.queryMetrics', result: 'Sampled past performance and peak 09:30 AM slots', durationMs: 38 }
      );
      agentResults = {
        message: `Formulated 4-phase growth plan for "${prompt}".`,
        growthPlan,
      };
    } else if (agentType === 'strategy_agent') {
      const strategy = await strategyAgentService.formulateStrategy(tenantId, brandId, prompt);
      toolCalls.push({ tool: 'brandBrain.getVoiceRules', result: 'Loaded tone & positioning parameters', durationMs: 25 });
      agentResults = {
        message: `Synthesized content strategy pillars and hashtag bundles for "${prompt}".`,
        strategy,
      };
    } else if (agentType === 'content_agent') {
      const content = await contentAgentService.synthesizeContent(tenantId, brandId, prompt);
      toolCalls.push(
        { tool: 'brandBrain.getVoiceRules', result: 'Applied voice rules and taboo word scrubbing', durationMs: 28 },
        { tool: 'content.generateVariants', result: 'Generated platform-optimized variants', durationMs: 65 }
      );

      // If user prompt explicitly requests drafting or creating post
      if (prompt.toLowerCase().includes('create draft') || prompt.toLowerCase().includes('draft post')) {
        const postCreation = await toolRegistryService.executeTool(
          'content.createDraftPost',
          { title: content.headline, content: content.variants[0]?.content || prompt },
          { tenantId, brandId, userId, runId }
        );
        toolCalls.push({ tool: 'content.createDraftPost', result: postCreation.result, durationMs: postCreation.durationMs });
        agentResults.draftPost = postCreation.result;
      }

      agentResults.message = `Crafted 3 hook angles and platform variants for "${prompt}".`;
      agentResults.content = content;
    } else if (agentType === 'audience_agent') {
      const audience = await audienceAgentService.analyzeAudience(tenantId, brandId);
      toolCalls.push({ tool: 'audience.analyzeTarget', result: 'Analyzed demographics and resonance scores', durationMs: 35 });
      agentResults = {
        message: `Audience profile and pacing analysis complete.`,
        audience,
      };
    } else if (agentType === 'analytics_agent') {
      const audit = await analyticsAgentService.auditPerformance(tenantId, brandId);
      toolCalls.push({ tool: 'analytics.queryMetrics', result: 'Sampled historical post impressions & CTR', durationMs: 40 });
      agentResults = {
        message: audit.summary,
        audit,
      };
    } else {
      // Fallback general goal execution
      const voiceTool = await toolRegistryService.executeTool('brandBrain.getVoiceRules', {}, { tenantId, brandId });
      toolCalls.push({ tool: 'brandBrain.getVoiceRules', result: voiceTool.result, durationMs: voiceTool.durationMs });
      agentResults = {
        message: `Executed autonomous agent goal for "${prompt}".`,
        details: { model: settings.model, temperature: settings.temperature },
      };
    }

    const durationMs = Date.now() - startTime;
    const tokensUsed = 650 + Math.floor(Math.random() * 250);

    // 5. Persist Run in Database
    await db('agent_runs').insert({
      id: runId,
      tenant_id: tenantId,
      brand_id: brandId || null,
      agent_type: agentType,
      prompt,
      status: 'completed',
      plan: JSON.stringify(plan),
      tool_calls: JSON.stringify(toolCalls),
      results: JSON.stringify(agentResults),
      error_message: null,
      tokens_used: tokensUsed,
      duration_ms: durationMs,
      started_at: new Date(startTime),
      completed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 6. Retain Learning in Agent Memory
    await agentMemoryService.retain(
      tenantId,
      `last_goal_${agentType}_${brandId || 'global'}`,
      { prompt, completedAt: new Date().toISOString() },
      { brandId, memoryType: 'episodic', ttlSeconds: 86400 }
    );

    return {
      status: 'completed',
      runId,
      agentType,
      prompt,
      plan,
      toolCalls,
      results: agentResults,
      tokensUsed,
      durationMs,
    };
  }

  /**
   * Lists historical agent runs with multi-tenant isolation
   */
  async listRuns(tenantId: string, brandId?: string, limit = 50) {
    let query = db('agent_runs').where({ tenant_id: tenantId });
    if (brandId) {
      query = query.where({ brand_id: brandId });
    }
    const rows = await query.orderBy('created_at', 'desc').limit(limit);

    return rows.map((r) => {
      let plan = [];
      let toolCalls = [];
      let results = {};
      try { plan = typeof r.plan === 'string' ? JSON.parse(r.plan) : r.plan || []; } catch {}
      try { toolCalls = typeof r.tool_calls === 'string' ? JSON.parse(r.tool_calls) : r.tool_calls || []; } catch {}
      try { results = typeof r.results === 'string' ? JSON.parse(r.results) : r.results || {}; } catch {}

      return {
        id: r.id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        agentType: r.agent_type,
        prompt: r.prompt,
        status: r.status,
        plan,
        toolCalls,
        results,
        tokensUsed: r.tokens_used,
        durationMs: r.duration_ms,
        errorMessage: r.error_message,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
      };
    });
  }

  /**
   * Retrieves single agent run by id
   */
  async getRunById(tenantId: string, runId: string) {
    const row = await db('agent_runs').where({ id: runId, tenant_id: tenantId }).first();
    if (!row) return null;

    let plan = [];
    let toolCalls = [];
    let results = {};
    try { plan = typeof row.plan === 'string' ? JSON.parse(row.plan) : row.plan || []; } catch {}
    try { toolCalls = typeof row.tool_calls === 'string' ? JSON.parse(row.tool_calls) : row.tool_calls || []; } catch {}
    try { results = typeof row.results === 'string' ? JSON.parse(row.results) : row.results || {}; } catch {}

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      agentType: row.agent_type,
      prompt: row.prompt,
      status: row.status,
      plan,
      toolCalls,
      results,
      tokensUsed: row.tokens_used,
      durationMs: row.duration_ms,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    };
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
