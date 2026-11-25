import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type { AutomationLifecycleState, AutomationFailureState, StepRunLog } from './types.js';

export class DurableStepLoggerService {
  /**
   * Persists the initiation of a discrete workflow step.
   */
  public async recordStepStart(params: {
    runId: string;
    automationId: string;
    tenantId: string;
    brandId: string;
    stepIndex: number;
    stepName: string;
    lifecyclePhase: AutomationLifecycleState | AutomationFailureState;
    inputPayload?: any;
  }): Promise<string> {
    const stepId = crypto.randomUUID();
    const now = new Date();

    try {
      await db('automation_step_runs').insert({
        id: stepId,
        run_id: params.runId,
        automation_id: params.automationId,
        tenant_id: params.tenantId,
        brand_id: params.brandId,
        step_index: params.stepIndex,
        step_name: params.stepName,
        lifecycle_phase: params.lifecyclePhase,
        status: 'running',
        input_payload: params.inputPayload ? JSON.stringify(params.inputPayload) : null,
        started_at: now,
        created_at: now,
      });
    } catch (err) {
      console.warn('[DurableStepLogger] Warning inserting step run record:', err);
    }

    return stepId;
  }

  /**
   * Marks a step execution as completed with its output payload.
   */
  public async recordStepSuccess(stepId: string, outputPayload?: any, durationMs?: number): Promise<void> {
    const now = new Date();
    try {
      await db('automation_step_runs')
        .where({ id: stepId })
        .update({
          status: 'completed',
          output_payload: outputPayload ? JSON.stringify(outputPayload) : null,
          duration_ms: durationMs || null,
          completed_at: now,
        });
    } catch (err) {
      console.warn('[DurableStepLogger] Warning updating step success:', err);
    }
  }

  /**
   * Marks a step execution as failed with its error message.
   */
  public async recordStepFailure(stepId: string, errorMessage: string, durationMs?: number): Promise<void> {
    const now = new Date();
    try {
      await db('automation_step_runs')
        .where({ id: stepId })
        .update({
          status: 'failed',
          error_message: errorMessage,
          duration_ms: durationMs || null,
          completed_at: now,
        });
    } catch (err) {
      console.warn('[DurableStepLogger] Warning updating step failure:', err);
    }
  }

  /**
   * Retrieves all step logs for a run with tenant boundary enforcement.
   */
  public async listStepRuns(runId: string, tenantId: string): Promise<StepRunLog[]> {
    try {
      const rows = await db('automation_step_runs')
        .where({ run_id: runId, tenant_id: tenantId })
        .orderBy('step_index', 'asc');

      return rows.map((r) => ({
        id: r.id,
        runId: r.run_id,
        automationId: r.automation_id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        stepIndex: r.step_index,
        stepName: r.step_name,
        lifecyclePhase: r.lifecycle_phase,
        status: r.status,
        inputPayload: typeof r.input_payload === 'string' ? JSON.parse(r.input_payload) : r.input_payload,
        outputPayload: typeof r.output_payload === 'string' ? JSON.parse(r.output_payload) : r.output_payload,
        errorMessage: r.error_message,
        durationMs: r.duration_ms,
        startedAt: r.started_at ? new Date(r.started_at) : undefined,
        completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
        createdAt: new Date(r.created_at),
      }));
    } catch {
      return [];
    }
  }
}

export const durableStepLoggerService = new DurableStepLoggerService();
