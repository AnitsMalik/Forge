import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { sanitizeSecrets } from './sanitizer.js';
import type { AutomationFailureState, DlqRecord } from './types.js';

export interface HandleFailureParams {
  runId: string;
  automationId?: string;
  tenantId: string;
  brandId: string;
  failureState: AutomationFailureState;
  errorMessage: string;
  errorStack?: string;
  retryCount: number;
  maxRetries?: number;
  baseDelayMs?: number;
  idempotencyKey?: string;
  triggerEvent?: any;
  runContext?: any;
}

export class RetryDlqService {
  /**
   * Calculates exponential backoff delay with jitter.
   * e.g., retry 0 -> 1000ms, retry 1 -> 2000ms, retry 2 -> 4000ms
   */
  public calculateExponentialBackoff(
    retryCount: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 60000
  ): number {
    const exponential = baseDelayMs * Math.pow(2, Math.max(0, retryCount));
    const jitter = Math.floor(Math.random() * 200); // 0-200ms jitter to prevent thundering herd
    return Math.min(exponential + jitter, maxDelayMs);
  }

  /**
   * Handles an automation run failure. If retries remain, schedules next retry.
   * If retries are exhausted, commits the run to the Dead-Letter Queue (DLQ).
   */
  public async handleFailure(params: HandleFailureParams): Promise<{
    retrying: boolean;
    retryCount: number;
    nextRetryAt?: Date;
    dlqId?: string;
  }> {
    const maxRetries = params.maxRetries ?? 3;
    const baseDelayMs = params.baseDelayMs ?? 1000;
    const nextRetryCount = params.retryCount + 1;

    if (nextRetryCount <= maxRetries) {
      // Schedule Retry with Exponential Backoff
      const delayMs = this.calculateExponentialBackoff(params.retryCount, baseDelayMs);
      const nextRetryAt = new Date(Date.now() + delayMs);

      try {
        await db('automation_runs')
          .where({ id: params.runId })
          .update({
            status: 'retrying',
            lifecycle_state: params.failureState,
            retry_count: nextRetryCount,
            next_retry_at: nextRetryAt,
            error_message: `[Retry ${nextRetryCount}/${maxRetries} scheduled] ${params.errorMessage}`,
            updated_at: new Date(),
          });
      } catch (err) {
        console.warn('[RetryDlqService] Warning scheduling retry in DB:', err);
      }

      return {
        retrying: true,
        retryCount: nextRetryCount,
        nextRetryAt,
      };
    }

    // Retries Exhausted -> Commit to Dead-Letter Queue (DLQ)
    const dlqId = crypto.randomUUID();
    const now = new Date();

    try {
      await db('automation_runs')
        .where({ id: params.runId })
        .update({
          status: 'failed',
          lifecycle_state: params.failureState,
          retry_count: nextRetryCount,
          next_retry_at: null,
          error_message: `[Dead-Lettered] ${params.errorMessage}`,
          completed_at: now,
          updated_at: now,
        });

      await db('automation_dlq').insert({
        id: dlqId,
        run_id: params.runId,
        automation_id: params.automationId || null,
        tenant_id: params.tenantId,
        brand_id: params.brandId,
        failure_state: params.failureState,
        error_message: params.errorMessage,
        error_stack: params.errorStack || null,
        retry_count: nextRetryCount,
        idempotency_key: params.idempotencyKey || null,
        trigger_event: params.triggerEvent ? JSON.stringify(params.triggerEvent) : null,
        run_context: params.runContext ? JSON.stringify(params.runContext) : null,
        status: 'dead_letter',
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      console.warn('[RetryDlqService] Warning committing to DLQ in DB:', err);
    }

    return {
      retrying: false,
      retryCount: nextRetryCount,
      dlqId,
    };
  }

  /**
   * Lists DLQ items for a tenant.
   */
  public async listDlq(
    tenantId: string,
    params?: { brandId?: string; status?: string; limit?: number }
  ): Promise<DlqRecord[]> {
    try {
      let query = db('automation_dlq').where({ tenant_id: tenantId });
      if (params?.brandId) query = query.andWhere({ brand_id: params.brandId });
      if (params?.status) query = query.andWhere({ status: params.status });
      query = query.orderBy('created_at', 'desc').limit(params?.limit || 50);

      const rows = await query;
      return rows.map((r) => ({
        id: r.id,
        runId: r.run_id,
        automationId: r.automation_id,
        tenantId: r.tenant_id,
        brandId: r.brand_id,
        failureState: r.failure_state,
        errorMessage: sanitizeSecrets(r.error_message),
        errorStack: r.error_stack,
        retryCount: r.retry_count,
        idempotencyKey: r.idempotency_key,
        triggerEvent: sanitizeSecrets(typeof r.trigger_event === 'string' ? JSON.parse(r.trigger_event) : r.trigger_event),
        runContext: sanitizeSecrets(typeof r.run_context === 'string' ? JSON.parse(r.run_context) : r.run_context),
        status: r.status,
        replayedAt: r.replayed_at ? new Date(r.replayed_at) : undefined,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Replays a dead-lettered item by resetting retry count and re-queuing run.
   */
  public async replayDlq(dlqId: string, tenantId: string): Promise<{ success: boolean; runId?: string }> {
    const item = await db('automation_dlq').where({ id: dlqId, tenant_id: tenantId }).first();
    if (!item) {
      throw new Error('DLQ record not found or access denied.');
    }

    const now = new Date();
    await db('automation_dlq').where({ id: dlqId }).update({
      status: 'replayed',
      replayed_at: now,
      updated_at: now,
    });

    if (item.run_id) {
      await db('automation_runs').where({ id: item.run_id }).update({
        status: 'pending',
        lifecycle_state: 'DETECTED',
        retry_count: 0,
        next_retry_at: null,
        error_message: null,
        updated_at: now,
      });
      return { success: true, runId: item.run_id };
    }

    return { success: true };
  }

  /**
   * Discards a dead-lettered item.
   */
  public async discardDlq(dlqId: string, tenantId: string): Promise<boolean> {
    const updated = await db('automation_dlq')
      .where({ id: dlqId, tenant_id: tenantId })
      .update({
        status: 'discarded',
        updated_at: new Date(),
      });
    return updated > 0;
  }
}

export const retryDlqService = new RetryDlqService();
