import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { planGuardService } from '../billing/planGuard.service.js';
import { sanitizeSecrets } from './sanitizer.js';
import type {
  Automation,
  AutomationStatus,
  AutomationTriggerType,
  AutomationTriggerConfig,
  AutomationCondition,
  AutomationStepConfig,
  AutomationRun,
} from '@socialforge/shared';

export interface CreateAutomationInput {
  brandId: string;
  name: string;
  description?: string;
  triggerType: AutomationTriggerType;
  triggerConfig?: AutomationTriggerConfig;
  conditions?: AutomationCondition[];
  actions: AutomationStepConfig[];
  recipeId?: string;
  status?: AutomationStatus;
  userId?: string;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string;
  status?: AutomationStatus;
  triggerConfig?: AutomationTriggerConfig;
  conditions?: AutomationCondition[];
  actions?: AutomationStepConfig[];
}

export class AutomationService {
  /**
   * Lists automations strictly scoped by tenant.
   */
  public async listAutomations(
    tenantId: string,
    filter?: { brandId?: string; status?: string; triggerType?: string }
  ): Promise<Automation[]> {
    let query = db('automations').where({ tenant_id: tenantId });

    if (filter?.brandId) {
      query = query.andWhere({ brand_id: filter.brandId });
    }
    if (filter?.status) {
      query = query.andWhere({ status: filter.status });
    }
    if (filter?.triggerType) {
      query = query.andWhere({ trigger_type: filter.triggerType });
    }

    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((r) => this.formatAutomation(r));
  }

  /**
   * Retrieves single automation strictly scoped by tenant.
   */
  public async getAutomationById(tenantId: string, automationId: string): Promise<Automation | null> {
    const row = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .first();

    if (!row) return null;
    return this.formatAutomation(row);
  }

  /**
   * Creates an automation with brand ownership verification and automatic webhook token generation.
   */
  public async createAutomation(tenantId: string, input: CreateAutomationInput): Promise<Automation> {
    const { brandId, name, description, triggerType, triggerConfig, conditions, actions, recipeId, status, userId } = input;

    // Verify brand ownership
    const brand = await db('brands')
      .where({ id: brandId, tenant_id: tenantId })
      .first();

    if (!brand) {
      throw new Error('Brand not found or access denied for current workspace.');
    }

    const id = crypto.randomUUID();
    const webhookToken = `whk_${crypto.randomBytes(16).toString('hex')}`;
    const now = new Date();

    const resolvedTriggerConfig: AutomationTriggerConfig = {
      type: triggerType,
      ...(triggerConfig || {}),
      webhookToken: triggerConfig?.webhookToken || webhookToken,
    };

    const resolvedStatus = status || 'active';
    if (resolvedStatus === 'active') {
      await planGuardService.enforce(tenantId, 'active_automations', 1);
    }

    const newRecord = {
      id,
      tenant_id: tenantId,
      brand_id: brandId,
      name,
      description: description || null,
      trigger_type: triggerType,
      trigger_config: JSON.stringify(resolvedTriggerConfig),
      conditions: conditions ? JSON.stringify(conditions) : null,
      actions: JSON.stringify(actions),
      status: resolvedStatus,
      execution_count: 0,
      created_by: userId || null,
      created_at: now,
      updated_at: now,
    };

    await db('automations').insert(newRecord);

    return this.formatAutomation({ ...newRecord, recipeId });
  }

  /**
   * Updates an automation with tenant ownership enforcement.
   */
  public async updateAutomation(
    tenantId: string,
    automationId: string,
    updates: UpdateAutomationInput
  ): Promise<Automation> {
    const existing = await this.getAutomationById(tenantId, automationId);
    if (!existing) {
      throw new Error('Automation not found or access denied.');
    }

    if (updates.status === 'active' && existing.status !== 'active') {
      await planGuardService.enforce(tenantId, 'active_automations', 1);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.triggerConfig !== undefined) updateData.trigger_config = JSON.stringify(updates.triggerConfig);
    if (updates.conditions !== undefined) updateData.conditions = JSON.stringify(updates.conditions);
    if (updates.actions !== undefined) updateData.actions = JSON.stringify(updates.actions);

    await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .update(updateData);

    const updated = await this.getAutomationById(tenantId, automationId);
    return updated!;
  }

  /**
   * Deletes an automation with tenant ownership enforcement.
   */
  public async deleteAutomation(tenantId: string, automationId: string): Promise<boolean> {
    const existing = await this.getAutomationById(tenantId, automationId);
    if (!existing) {
      throw new Error('Automation not found or access denied.');
    }

    // Cascade delete runs
    await db('automation_runs')
      .where({ automation_id: automationId, tenant_id: tenantId })
      .delete();

    const count = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .delete();

    return count > 0;
  }

  /**
   * Lists automation runs strictly scoped by tenant with rich search & filtering.
   */
  public async listRuns(
    tenantId: string,
    filter?: {
      automationId?: string;
      brandId?: string;
      status?: string;
      triggerType?: string;
      search?: string;
      dateFrom?: string | Date;
      dateTo?: string | Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let query = db('automation_runs').where({ tenant_id: tenantId });

    if (filter?.automationId) {
      query = query.andWhere({ automation_id: filter.automationId });
    }
    if (filter?.brandId) {
      query = query.andWhere({ brand_id: filter.brandId });
    }
    if (filter?.status) {
      query = query.andWhere({ status: filter.status });
    }
    if (filter?.triggerType) {
      const term = `%${filter.triggerType.toLowerCase()}%`;
      query = query.andWhere(function () {
        this.whereRaw('LOWER(trigger_event) LIKE ?', [term]);
      });
    }
    if (filter?.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      query = query.andWhere(function () {
        this.whereRaw('LOWER(error_message) LIKE ?', [term])
          .orWhereRaw('LOWER(trigger_event) LIKE ?', [term])
          .orWhereRaw('LOWER(lifecycle_state) LIKE ?', [term]);
      });
    }
    if (filter?.dateFrom) {
      query = query.andWhere('created_at', '>=', new Date(filter.dateFrom));
    }
    if (filter?.dateTo) {
      query = query.andWhere('created_at', '<=', new Date(filter.dateTo));
    }

    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;
    const rows = await query.orderBy('created_at', 'desc').limit(limit).offset(offset);

    return rows.map((r) => this.formatRun(r));
  }

  /**
   * Retrieves single automation run strictly scoped by tenant.
   */
  public async getRunById(tenantId: string, runId: string): Promise<any | null> {
    const row = await db('automation_runs')
      .where({ id: runId, tenant_id: tenantId })
      .first();

    if (!row) return null;
    return this.formatRun(row);
  }

  /**
   * Formats raw DB record into canonical Automation domain model.
   */
  private formatAutomation(row: any): Automation {
    let triggerConfig: AutomationTriggerConfig = { type: row.trigger_type };
    try {
      triggerConfig = typeof row.trigger_config === 'string'
        ? JSON.parse(row.trigger_config)
        : row.trigger_config || { type: row.trigger_type };
    } catch {}

    let conditions: AutomationCondition[] | null = null;
    try {
      conditions = typeof row.conditions === 'string'
        ? JSON.parse(row.conditions)
        : row.conditions || null;
    } catch {}

    let actions: AutomationStepConfig[] = [];
    try {
      actions = typeof row.actions === 'string'
        ? JSON.parse(row.actions)
        : row.actions || [];
    } catch {}

    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      name: row.name,
      description: row.description,
      status: row.status,
      triggerType: row.trigger_type,
      triggerConfig,
      conditions,
      actions,
      recipeId: row.recipe_id,
      executionCount: Number(row.execution_count || 0),
      lastRunAt: row.last_run_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Formats raw DB record into canonical AutomationRun domain model with secret redaction.
   */
  private formatRun(row: any): any {
    let triggerEvent: any = {};
    try {
      triggerEvent = typeof row.trigger_event === 'string'
        ? JSON.parse(row.trigger_event)
        : row.trigger_event || {};
    } catch {}

    let stepResults: any[] = [];
    try {
      stepResults = typeof row.step_results === 'string'
        ? JSON.parse(row.step_results)
        : row.step_results || [];
    } catch {}

    return {
      id: row.id,
      automationId: row.automation_id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      triggerEvent: sanitizeSecrets(triggerEvent),
      status: row.status,
      lifecycleState: row.lifecycle_state,
      retryCount: Number(row.retry_count || 0),
      maxRetries: Number(row.max_retries || 3),
      nextRetryAt: row.next_retry_at,
      stepResults: sanitizeSecrets(stepResults),
      errorMessage: row.error_message,
      durationMs: row.duration_ms,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const automationService = new AutomationService();
