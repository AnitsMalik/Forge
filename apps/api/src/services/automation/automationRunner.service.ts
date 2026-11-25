import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { idempotencyService } from './idempotency.service.js';
import { conditionService } from './condition.service.js';
import { actionService } from './action.service.js';
import type { AutomationStepConfig, StepExecutionResult } from '@socialforge/shared';

export interface ExecuteAutomationResult {
  success: boolean;
  runId?: string;
  status?: string;
  durationMs?: number;
  stepResults?: StepExecutionResult[];
  skipped?: boolean;
  reason?: string;
  error?: string;
}

export class AutomationRunnerService {
  /**
   * Executes an automation workflow graph with strict tenant scoping,
   * idempotency deduplication, condition evaluation, and step logging.
   */
  public async executeAutomation(
    tenantId: string,
    automationId: string,
    triggerEvent: any = {}
  ): Promise<ExecuteAutomationResult> {
    const startTime = Date.now();

    // 1. Fetch automation with strict tenant isolation
    const automation = await db('automations')
      .where({ id: automationId, tenant_id: tenantId })
      .first();

    if (!automation) {
      throw new Error('Automation not found or access denied for tenant.');
    }

    if (automation.status !== 'active') {
      return {
        success: false,
        status: automation.status,
        reason: `Automation is currently ${automation.status}. Skipping execution.`,
      };
    }

    // 2. Check Idempotency Deduplication Lock
    const idemKey = idempotencyService.generateKey(tenantId, automationId, triggerEvent);
    const acquired = await idempotencyService.checkAndAcquire(idemKey, 900); // 15 min lock
    if (!acquired) {
      return {
        success: false,
        skipped: true,
        reason: 'Duplicate execution prevented by idempotency deduplication engine.',
      };
    }

    // 3. Create Automation Run record
    const runId = crypto.randomUUID();
    const runRecord = {
      id: runId,
      automation_id: automationId,
      tenant_id: tenantId,
      brand_id: automation.brand_id,
      trigger_event: JSON.stringify(triggerEvent),
      status: 'running',
      step_results: JSON.stringify([]),
      error_message: null as string | null,
      duration_ms: null as number | null,
      started_at: new Date(startTime),
      completed_at: null as Date | null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db('automation_runs').insert(runRecord);

    try {
      // 4. Condition Evaluation Gate
      let conditions: any[] = [];
      try {
        conditions = typeof automation.conditions === 'string'
          ? JSON.parse(automation.conditions)
          : automation.conditions || [];
      } catch {
        conditions = [];
      }

      const conditionsMet = conditionService.evaluateConditions(conditions, triggerEvent);
      if (!conditionsMet) {
        const durationMs = Date.now() - startTime;
        await db('automation_runs')
          .where({ id: runId })
          .update({
            status: 'skipped',
            error_message: 'Execution skipped: conditions were not met by trigger payload.',
            duration_ms: durationMs,
            completed_at: new Date(),
            updated_at: new Date(),
          });

        return {
          success: true,
          runId,
          status: 'skipped',
          skipped: true,
          durationMs,
          reason: 'Conditions not satisfied by trigger payload.',
        };
      }

      // 5. Action Steps Sequential Execution
      let rawActions: AutomationStepConfig[] = [];
      try {
        rawActions = typeof automation.actions === 'string'
          ? JSON.parse(automation.actions)
          : automation.actions || [];
      } catch {
        rawActions = [];
      }

      const stepResults: StepExecutionResult[] = [];
      const previousStepOutputs: Record<string, any> = {};
      let hasFailedStep = false;
      let failureError: string | null = null;

      for (let i = 0; i < rawActions.length; i++) {
        const step = rawActions[i];
        const stepResult = await actionService.executeAction(step, i, {
          tenantId,
          brandId: automation.brand_id,
          automationId,
          triggerEvent,
          previousStepOutputs,
        });

        stepResults.push(stepResult);

        if (stepResult.status === 'failed') {
          hasFailedStep = true;
          failureError = stepResult.error || `Step ${i + 1} (${step.type}) failed`;
          break; // Stop execution on first failed step
        }

        if (stepResult.output) {
          previousStepOutputs[step.type] = stepResult.output;
          if (step.id) {
            previousStepOutputs[step.id] = stepResult.output;
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const finalStatus = hasFailedStep ? 'failed' : 'completed';

      // 6. Finalize Run Record
      await db('automation_runs')
        .where({ id: runId })
        .update({
          status: finalStatus,
          step_results: JSON.stringify(stepResults),
          error_message: failureError,
          duration_ms: durationMs,
          completed_at: new Date(),
          updated_at: new Date(),
        });

      // 7. Update Automation Statistics
      if (!hasFailedStep) {
        await db('automations')
          .where({ id: automationId })
          .increment('execution_count', 1)
          .update({
            last_run_at: new Date(),
            updated_at: new Date(),
          });
      }

      return {
        success: !hasFailedStep,
        runId,
        status: finalStatus,
        durationMs,
        stepResults,
        error: failureError || undefined,
      };
    } catch (execErr: any) {
      const durationMs = Date.now() - startTime;
      await db('automation_runs')
        .where({ id: runId })
        .update({
          status: 'failed',
          error_message: execErr.message || 'Fatal execution error',
          duration_ms: durationMs,
          completed_at: new Date(),
          updated_at: new Date(),
        });

      return {
        success: false,
        runId,
        status: 'failed',
        durationMs,
        error: execErr.message,
      };
    }
  }
}

export const automationRunnerService = new AutomationRunnerService();
