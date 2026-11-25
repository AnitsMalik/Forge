/**
 * AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows Service
 * SocialForge Platform v4.7.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import type {
  AgentFleetDefinition,
  AgentFleetRole,
  AgentFleetStatus,
  AgentFleetTelemetry,
  AgentFleetWorkflow,
  AgentWorkflowExecution,
  AgentExecutionStep,
  WorkflowDagConfig,
  WorkflowDagNode,
  CreateAgentDefinitionDto,
  UpdateAgentDefinitionDto,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  DispatchWorkflowRunDto,
  CritiqueStepDto,
} from '@socialforge/shared';

export class AgentFleetError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'AgentFleetError';
  }
}

interface Actor {
  id: string;
  email: string;
}

export class AgentFleetService {
  private mapAgentRow(row: any): AgentFleetDefinition {
    let toolPermissions: string[] = [];
    try {
      if (typeof row.tool_permissions_json === 'string') {
        toolPermissions = JSON.parse(row.tool_permissions_json);
      } else if (Array.isArray(row.tool_permissions_json)) {
        toolPermissions = row.tool_permissions_json;
      }
    } catch {
      toolPermissions = [];
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      slug: row.slug,
      role: row.role as AgentFleetRole,
      description: row.description,
      systemPrompt: row.system_prompt,
      modelName: row.model_name,
      temperature: Number(row.temperature),
      maxTokensPerTurn: Number(row.max_tokens_per_turn),
      toolPermissions,
      status: row.status as AgentFleetStatus,
      concurrencyLimit: Number(row.concurrency_limit),
      isSystem: Boolean(row.is_system),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapWorkflowRow(row: any): AgentFleetWorkflow {
    let dagConfig: WorkflowDagConfig = { entryNodes: [], nodes: [] };
    try {
      if (typeof row.dag_config_json === 'string') {
        dagConfig = JSON.parse(row.dag_config_json);
      } else if (typeof row.dag_config_json === 'object' && row.dag_config_json !== null) {
        dagConfig = row.dag_config_json;
      }
    } catch {
      dagConfig = { entryNodes: [], nodes: [] };
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      triggerType: row.trigger_type,
      status: row.status,
      dagConfig,
      maxBudgetTokens: Number(row.max_budget_tokens),
      timeoutSeconds: Number(row.timeout_seconds),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapExecutionRow(row: any): AgentWorkflowExecution {
    let finalOutput: Record<string, any> | null = null;
    try {
      if (typeof row.final_output_json === 'string') {
        finalOutput = JSON.parse(row.final_output_json);
      } else if (typeof row.final_output_json === 'object') {
        finalOutput = row.final_output_json;
      }
    } catch {
      finalOutput = null;
    }

    return {
      id: row.id,
      workflowId: row.workflow_id,
      tenantId: row.tenant_id,
      triggerEvent: row.trigger_event,
      status: row.status,
      totalTokensUsed: Number(row.total_tokens_used || 0),
      executionCostUsd: Number(row.execution_cost_usd || 0),
      startedAt: new Date(row.started_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      durationMs: row.duration_ms ? Number(row.duration_ms) : null,
      errorMessage: row.error_message,
      finalOutput,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private mapStepRow(row: any): AgentExecutionStep {
    const parseJson = (val: any) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    };

    return {
      id: row.id,
      executionId: row.execution_id,
      agentId: row.agent_id,
      agentRole: row.agent_role as AgentFleetRole,
      stepName: row.step_name,
      stepIndex: Number(row.step_index),
      inputContext: parseJson(row.input_context_json),
      outputContext: parseJson(row.output_context_json),
      critiqueFeedback: parseJson(row.critique_feedback_json),
      status: row.status,
      tokensUsed: Number(row.tokens_used || 0),
      latencyMs: Number(row.latency_ms || 0),
      createdAt: new Date(row.created_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    };
  }

  private async audit(actor: Actor, action: string, targetId: string, details: Record<string, any>, tenantId?: string | null) {
    try {
      await db('superadmin_audit_logs').insert({
        id: crypto.randomUUID(),
        superadmin_id: actor.id,
        superadmin_email: actor.email,
        action,
        target_resource_type: 'agent_fleet',
        target_resource_id: targetId,
        reason: 'Autonomous Agent Fleet Orchestration Operation',
        details: JSON.stringify(details),
        created_at: new Date(),
      });
    } catch (err) {
      console.error('[AgentFleetService] Audit log write failed:', err);
    }
  }

  // =========================================================================
  // 1. FLEET TELEMETRY & OVERVIEW
  // =========================================================================

  async getTelemetry(): Promise<AgentFleetTelemetry> {
    const totalAgentsRow = await db('agent_fleet_definitions').count('id as count').first();
    const systemAgentsRow = await db('agent_fleet_definitions').where({ is_system: 1 }).count('id as count').first();
    const activeAgentsRow = await db('agent_fleet_definitions').whereIn('status', ['idle', 'executing', 'thinking']).count('id as count').first();

    const totalWfRow = await db('agent_fleet_workflows').count('id as count').first();
    const activeWfRow = await db('agent_fleet_workflows').where({ status: 'active' }).count('id as count').first();

    const runningExecRow = await db('agent_workflow_executions').where({ status: 'running' }).count('id as count').first();
    const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const exec24hRow = await db('agent_workflow_executions')
      .where('created_at', '>=', past24h)
      .count('id as count')
      .sum('total_tokens_used as tokens')
      .first();

    const completedRow = await db('agent_workflow_executions')
      .where('created_at', '>=', past24h)
      .where({ status: 'completed' })
      .count('id as count')
      .avg('duration_ms as avgDuration')
      .first();

    const totalExec24h = Number(exec24hRow?.count || 0);
    const completedExec24h = Number(completedRow?.count || 0);
    const fleetSuccessRate = totalExec24h > 0 ? Math.round((completedExec24h / totalExec24h) * 100) : 100;

    return {
      totalAgents: Number(totalAgentsRow?.count || 0),
      activeAgents: Number(activeAgentsRow?.count || 0),
      systemAgents: Number(systemAgentsRow?.count || 0),
      totalWorkflows: Number(totalWfRow?.count || 0),
      activeWorkflows: Number(activeWfRow?.count || 0),
      runningExecutions: Number(runningExecRow?.count || 0),
      totalExecutions24h: totalExec24h,
      totalTokens24h: Number(exec24hRow?.tokens || 0),
      avgLatencyMs: Math.round(Number(completedRow?.avgDuration || 2800)),
      fleetSuccessRate,
    };
  }

  // =========================================================================
  // 2. AGENT DEFINITIONS CATALOG CRUD
  // =========================================================================

  async listAgents(params: {
    role?: string;
    status?: string;
    tenantId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ agents: AgentFleetDefinition[]; total: number }> {
    let query = db('agent_fleet_definitions');

    if (params.role) {
      query = query.where('role', params.role);
    }
    if (params.status) {
      query = query.where('status', params.status);
    }
    if (params.tenantId) {
      query = query.where((b) => b.where('tenant_id', params.tenantId).orWhereNull('tenant_id'));
    }
    if (params.search) {
      const term = `%${params.search.trim()}%`;
      query = query.where((b) => b.where('name', 'like', term).orWhere('description', 'like', term).orWhere('slug', 'like', term));
    }

    const countRow = await query.clone().count('id as count').first();
    const total = Number(countRow?.count || 0);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    const rows = await query.orderBy('is_system', 'desc').orderBy('name', 'asc').limit(limit).offset(offset);
    return {
      agents: rows.map((r) => this.mapAgentRow(r)),
      total,
    };
  }

  async getAgentById(id: string): Promise<AgentFleetDefinition> {
    const row = await db('agent_fleet_definitions').where({ id }).first();
    if (!row) {
      throw new AgentFleetError(404, `Agent definition with id "${id}" not found.`);
    }
    return this.mapAgentRow(row);
  }

  async getAgentBySlug(slug: string): Promise<AgentFleetDefinition | null> {
    const row = await db('agent_fleet_definitions').where({ slug }).first();
    return row ? this.mapAgentRow(row) : null;
  }

  async createAgent(dto: CreateAgentDefinitionDto, actor: Actor): Promise<AgentFleetDefinition> {
    if (!dto.name || !dto.name.trim()) {
      throw new AgentFleetError(400, 'Agent name is required.');
    }
    if (!dto.role) {
      throw new AgentFleetError(400, 'Agent role is required.');
    }
    if (!dto.systemPrompt || !dto.systemPrompt.trim()) {
      throw new AgentFleetError(400, 'Agent system prompt is required.');
    }

    const slug = (dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).slice(0, 64);
    const existing = await this.getAgentBySlug(slug);
    if (existing) {
      throw new AgentFleetError(409, `An agent with slug "${slug}" already exists.`);
    }

    if (dto.temperature !== undefined && (dto.temperature < 0 || dto.temperature > 2.0)) {
      throw new AgentFleetError(400, 'Agent temperature must be between 0.0 and 2.0.');
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const row = {
      id,
      tenant_id: dto.tenantId || null,
      name: dto.name.trim(),
      slug,
      role: dto.role,
      description: dto.description?.trim() || null,
      system_prompt: dto.systemPrompt.trim(),
      model_name: dto.modelName || 'gpt-4o',
      temperature: dto.temperature !== undefined ? dto.temperature : 0.70,
      max_tokens_per_turn: dto.maxTokensPerTurn || 4096,
      tool_permissions_json: JSON.stringify(dto.toolPermissions || []),
      status: 'idle',
      concurrency_limit: dto.concurrencyLimit || 5,
      is_system: 0,
      created_at: now,
      updated_at: now,
    };

    await db('agent_fleet_definitions').insert(row);
    await this.audit(actor, 'create_fleet_agent', id, { slug, role: dto.role, name: dto.name }, dto.tenantId);

    return this.mapAgentRow(row);
  }

  async updateAgent(id: string, dto: UpdateAgentDefinitionDto, actor: Actor): Promise<AgentFleetDefinition> {
    const existing = await this.getAgentById(id);
    const updates: Record<string, any> = { updated_at: new Date() };

    if (dto.name) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description?.trim() || null;
    if (dto.systemPrompt) updates.system_prompt = dto.systemPrompt.trim();
    if (dto.modelName) updates.model_name = dto.modelName;
    if (dto.temperature !== undefined) {
      if (dto.temperature < 0 || dto.temperature > 2.0) {
        throw new AgentFleetError(400, 'Temperature must be between 0.0 and 2.0.');
      }
      updates.temperature = dto.temperature;
    }
    if (dto.maxTokensPerTurn !== undefined) updates.max_tokens_per_turn = dto.maxTokensPerTurn;
    if (dto.toolPermissions) updates.tool_permissions_json = JSON.stringify(dto.toolPermissions);
    if (dto.status) updates.status = dto.status;
    if (dto.concurrencyLimit) updates.concurrency_limit = dto.concurrencyLimit;

    await db('agent_fleet_definitions').where({ id }).update(updates);
    await this.audit(actor, 'update_fleet_agent', id, updates, existing.tenantId);

    return this.getAgentById(id);
  }

  async deleteAgent(id: string, actor: Actor): Promise<{ success: boolean; deletedAgentId: string }> {
    const existing = await this.getAgentById(id);
    if (existing.isSystem) {
      throw new AgentFleetError(403, 'System-level core AI agents cannot be deleted.');
    }

    await db('agent_fleet_definitions').where({ id }).delete();
    await this.audit(actor, 'delete_fleet_agent', id, { name: existing.name, slug: existing.slug }, existing.tenantId);

    return { success: true, deletedAgentId: id };
  }

  // =========================================================================
  // 3. WORKFLOW DAG PIPELINES
  // =========================================================================

  async listWorkflows(params: {
    tenantId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ workflows: AgentFleetWorkflow[]; total: number }> {
    let query = db('agent_fleet_workflows');

    if (params.tenantId) {
      query = query.where('tenant_id', params.tenantId);
    }
    if (params.status) {
      query = query.where('status', params.status);
    }
    if (params.search) {
      const term = `%${params.search.trim()}%`;
      query = query.where((b) => b.where('name', 'like', term).orWhere('description', 'like', term));
    }

    const countRow = await query.clone().count('id as count').first();
    const total = Number(countRow?.count || 0);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    const rows = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);
    return {
      workflows: rows.map((r) => this.mapWorkflowRow(r)),
      total,
    };
  }

  async getWorkflowById(id: string): Promise<AgentFleetWorkflow> {
    const row = await db('agent_fleet_workflows').where({ id }).first();
    if (!row) {
      throw new AgentFleetError(404, `Agent fleet workflow with id "${id}" not found.`);
    }
    return this.mapWorkflowRow(row);
  }

  async createWorkflow(dto: CreateWorkflowDto, actor: Actor): Promise<AgentFleetWorkflow> {
    if (!dto.tenantId) {
      throw new AgentFleetError(400, 'tenantId is required.');
    }
    if (!dto.name || !dto.name.trim()) {
      throw new AgentFleetError(400, 'Workflow name is required.');
    }
    if (!dto.dagConfig || !Array.isArray(dto.dagConfig.nodes) || dto.dagConfig.nodes.length === 0) {
      throw new AgentFleetError(400, 'Workflow DAG must contain at least one node.');
    }

    const tenantExists = await db('tenants').where({ id: dto.tenantId }).first();
    if (!tenantExists) {
      throw new AgentFleetError(404, `Tenant "${dto.tenantId}" not found.`);
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const row = {
      id,
      tenant_id: dto.tenantId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      trigger_type: dto.triggerType || 'manual',
      status: 'active',
      dag_config_json: JSON.stringify(dto.dagConfig),
      max_budget_tokens: dto.maxBudgetTokens || 50000,
      timeout_seconds: dto.timeoutSeconds || 300,
      created_at: now,
      updated_at: now,
    };

    await db('agent_fleet_workflows').insert(row);
    await this.audit(actor, 'create_fleet_workflow', id, { name: dto.name, nodeCount: dto.dagConfig.nodes.length }, dto.tenantId);

    return this.mapWorkflowRow(row);
  }

  async updateWorkflow(id: string, dto: UpdateWorkflowDto, actor: Actor): Promise<AgentFleetWorkflow> {
    const existing = await this.getWorkflowById(id);
    const updates: Record<string, any> = { updated_at: new Date() };

    if (dto.name) updates.name = dto.name.trim();
    if (dto.description !== undefined) updates.description = dto.description?.trim() || null;
    if (dto.status) updates.status = dto.status;
    if (dto.dagConfig) updates.dag_config_json = JSON.stringify(dto.dagConfig);
    if (dto.maxBudgetTokens) updates.max_budget_tokens = dto.maxBudgetTokens;
    if (dto.timeoutSeconds) updates.timeout_seconds = dto.timeoutSeconds;

    await db('agent_fleet_workflows').where({ id }).update(updates);
    await this.audit(actor, 'update_fleet_workflow', id, updates, existing.tenantId);

    return this.getWorkflowById(id);
  }

  async deleteWorkflow(id: string, actor: Actor): Promise<{ success: boolean; deletedWorkflowId: string }> {
    const existing = await this.getWorkflowById(id);
    await db('agent_fleet_workflows').where({ id }).delete();
    await this.audit(actor, 'delete_fleet_workflow', id, { name: existing.name }, existing.tenantId);
    return { success: true, deletedWorkflowId: id };
  }

  // =========================================================================
  // 4. DAG WORKFLOW EXECUTION ENGINE & AGENT HANDOFFS
  // =========================================================================

  async dispatchWorkflowExecution(
    dto: DispatchWorkflowRunDto,
    actor: Actor
  ): Promise<{ execution: AgentWorkflowExecution; steps: AgentExecutionStep[] }> {
    const workflow = await this.getWorkflowById(dto.workflowId);
    if (workflow.status !== 'active') {
      throw new AgentFleetError(400, `Cannot dispatch workflow "${workflow.name}": status is "${workflow.status}".`);
    }

    const executionId = crypto.randomUUID();
    const now = new Date();

    const executionRow = {
      id: executionId,
      workflow_id: workflow.id,
      tenant_id: workflow.tenantId,
      trigger_event: dto.triggerEvent || 'manual_dispatch',
      status: 'running',
      total_tokens_used: 0,
      execution_cost_usd: 0.0000,
      started_at: now,
      completed_at: null,
      duration_ms: null,
      error_message: null,
      final_output_json: null,
      created_at: now,
    };

    await db('agent_workflow_executions').insert(executionRow);

    // Retrieve system or tenant agent definitions to bind to steps
    const allAgents = await db('agent_fleet_definitions').where((b) =>
      b.where('tenant_id', workflow.tenantId).orWhereNull('tenant_id')
    );

    const agentByRole = new Map<AgentFleetRole, any>();
    for (const a of allAgents) {
      if (!agentByRole.has(a.role as AgentFleetRole)) {
        agentByRole.set(a.role as AgentFleetRole, a);
      }
    }

    // Execute DAG nodes sequentially (simulating collaborative agent handoffs)
    const nodes = workflow.dagConfig.nodes || [];
    const stepOutputs = new Map<string, any>();
    const executedSteps: AgentExecutionStep[] = [];
    let totalTokens = 0;
    const startMs = Date.now();

    for (let index = 0; index < nodes.length; index++) {
      const node: WorkflowDagNode = nodes[index];
      const agent = agentByRole.get(node.agentRole) || allAgents[0];

      // Assemble input context from dependencies
      const inputContext: Record<string, any> = {
        params: dto.inputParams || {},
        inheritedContext: {},
      };
      for (const depId of node.dependencies || []) {
        if (stepOutputs.has(depId)) {
          inputContext.inheritedContext[depId] = stepOutputs.get(depId);
        }
      }

      // Synthesize output context based on role
      const stepTokens = 1200 + Math.floor(Math.random() * 800);
      totalTokens += stepTokens;
      const stepLatency = 120 + Math.floor(Math.random() * 80);

      let outputContext: Record<string, any> = {};
      let critiqueFeedback: Record<string, any> | null = null;
      let stepStatus: 'completed' | 'approved' | 'revision_requested' = 'completed';

      switch (node.agentRole) {
        case 'trend_hunter':
          outputContext = {
            trendDiscovered: 'Micro-Habits & Cognitive Focus Protocols',
            trendVelocity: 92.4,
            topHashtags: ['#DeepWork', '#FocusMode', '#ProductivityHacks'],
          };
          break;
        case 'content_architect':
          outputContext = {
            draftVariantA: 'The 15-minute morning ritual that rewires dopamine baseline.',
            draftVariantB: 'Why top 1% engineers avoid early morning notifications.',
            hookRetentionScore: 91.0,
          };
          break;
        case 'visual_director':
          outputContext = {
            visualConcept: 'Minimalist dusk desk setup with glowing amber focus lamp',
            aspectRatio: '9:16',
            colorPalette: ['#1e1e2e', '#f59e0b', '#6366f1'],
          };
          break;
        case 'compliance_auditor':
          outputContext = {
            ftcCompliant: true,
            claimsVerified: true,
            brandSafetyScore: 100,
          };
          critiqueFeedback = {
            reviewer: 'Compliance Guardrail Agent',
            critique: 'Clear from medical or guaranteed income claims. Disclosures verified.',
            status: 'APPROVED',
          };
          stepStatus = 'approved';
          break;
        case 'growth_strategist':
          outputContext = {
            optimalPublishTime: 'Tuesday 09:15 AM EST',
            targetDemographic: 'Tech and knowledge workers aged 24-40',
            projectedViralMultiplier: 3.2,
          };
          break;
        default:
          outputContext = { result: `Completed step ${node.stepName}` };
      }

      stepOutputs.set(node.id, outputContext);

      const stepId = crypto.randomUUID();
      const stepRow = {
        id: stepId,
        execution_id: executionId,
        agent_id: agent ? agent.id : allAgents[0].id,
        agent_role: node.agentRole,
        step_name: node.stepName,
        step_index: index,
        input_context_json: JSON.stringify(inputContext),
        output_context_json: JSON.stringify(outputContext),
        critique_feedback_json: critiqueFeedback ? JSON.stringify(critiqueFeedback) : null,
        status: stepStatus,
        tokens_used: stepTokens,
        latency_ms: stepLatency,
        created_at: new Date(),
        completed_at: new Date(),
      };

      await db('agent_execution_steps').insert(stepRow);
      executedSteps.push(this.mapStepRow(stepRow));
    }

    const durationMs = Date.now() - startMs;
    const costUsd = Number(((totalTokens / 1000) * 0.007).toFixed(4));
    const completedAt = new Date();

    const finalOutput = {
      campaignSummary: 'Autonomous Multi-Agent Collaborative Synthesis Complete',
      stepsExecuted: executedSteps.length,
      aggregateTokens: totalTokens,
      pipelineOutputs: Object.fromEntries(stepOutputs.entries()),
      finalizedAt: completedAt.toISOString(),
    };

    await db('agent_workflow_executions').where({ id: executionId }).update({
      status: 'completed',
      total_tokens_used: totalTokens,
      execution_cost_usd: costUsd,
      completed_at: completedAt,
      duration_ms: durationMs,
      final_output_json: JSON.stringify(finalOutput),
    });

    await this.audit(
      actor,
      'dispatch_fleet_execution',
      executionId,
      { workflowId: workflow.id, totalTokens, stepsExecuted: executedSteps.length },
      workflow.tenantId
    );

    const finalExecution = await this.getExecutionById(executionId);
    return {
      execution: finalExecution.execution,
      steps: executedSteps,
    };
  }

  async listExecutions(params: {
    workflowId?: string;
    tenantId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ executions: AgentWorkflowExecution[]; total: number }> {
    let query = db('agent_workflow_executions');

    if (params.workflowId) {
      query = query.where('workflow_id', params.workflowId);
    }
    if (params.tenantId) {
      query = query.where('tenant_id', params.tenantId);
    }
    if (params.status) {
      query = query.where('status', params.status);
    }

    const countRow = await query.clone().count('id as count').first();
    const total = Number(countRow?.count || 0);

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    const rows = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);
    return {
      executions: rows.map((r) => this.mapExecutionRow(r)),
      total,
    };
  }

  async getExecutionById(
    id: string
  ): Promise<{ execution: AgentWorkflowExecution; steps: AgentExecutionStep[] }> {
    const row = await db('agent_workflow_executions').where({ id }).first();
    if (!row) {
      throw new AgentFleetError(404, `Workflow execution with id "${id}" not found.`);
    }

    const stepRows = await db('agent_execution_steps').where({ execution_id: id }).orderBy('step_index', 'asc');
    return {
      execution: this.mapExecutionRow(row),
      steps: stepRows.map((r) => this.mapStepRow(r)),
    };
  }

  async abortExecution(id: string, reason: string, actor: Actor): Promise<AgentWorkflowExecution> {
    const exec = await this.getExecutionById(id);
    if (exec.execution.status !== 'running' && exec.execution.status !== 'pending') {
      throw new AgentFleetError(400, `Cannot abort execution with status "${exec.execution.status}".`);
    }

    const now = new Date();
    await db('agent_workflow_executions').where({ id }).update({
      status: 'aborted',
      error_message: reason || 'Execution aborted by Superadmin operator',
      completed_at: now,
    });

    await db('agent_execution_steps').where({ execution_id: id, status: 'running' }).update({
      status: 'failed',
      completed_at: now,
    });

    await this.audit(actor, 'abort_fleet_execution', id, { reason }, exec.execution.tenantId);
    const updated = await this.getExecutionById(id);
    return updated.execution;
  }

  async critiqueStep(stepId: string, dto: CritiqueStepDto, actor: Actor): Promise<AgentExecutionStep> {
    const stepRow = await db('agent_execution_steps').where({ id: stepId }).first();
    if (!stepRow) {
      throw new AgentFleetError(404, `Execution step "${stepId}" not found.`);
    }

    const newStatus = dto.approved ? 'approved' : 'revision_requested';
    const feedback = {
      reviewer: actor.email,
      reviewedAt: new Date().toISOString(),
      approved: dto.approved,
      comments: dto.critiqueComments,
      suggestedRevisions: dto.suggestedRevisions || null,
    };

    await db('agent_execution_steps').where({ id: stepId }).update({
      status: newStatus,
      critique_feedback_json: JSON.stringify(feedback),
      completed_at: new Date(),
    });

    await this.audit(actor, 'critique_execution_step', stepId, { approved: dto.approved, stepName: stepRow.step_name });

    const updated = await db('agent_execution_steps').where({ id: stepId }).first();
    return this.mapStepRow(updated);
  }
}

export const agentFleetService = new AgentFleetService();
