import { db } from '../../db/connection.js';
import { sanitizeSecrets } from './sanitizer.js';
import type { AutomationHealthSummary } from '@socialforge/shared';
import type { AutomationMetrics } from './types.js';

export class AutomationHealthService {
  /**
   * Produces an aggregated health summary for the tenant across all automations.
   */
  public async getHealthSummary(tenantId: string, brandId?: string | null): Promise<AutomationHealthSummary> {
    let autoQuery = db('automations').where({ tenant_id: tenantId });
    let runQuery = db('automation_runs').where({ tenant_id: tenantId });

    if (brandId) {
      autoQuery = autoQuery.andWhere({ brand_id: brandId });
      runQuery = runQuery.andWhere({ brand_id: brandId });
    }

    const automations = await autoQuery.select('id', 'name', 'status');
    const runs = await runQuery.select('id', 'automation_id', 'status', 'duration_ms', 'error_message', 'created_at');

    const totalAutomations = automations.length;
    let activeCount = 0;
    let pausedCount = 0;
    let errorCount = 0;

    for (const a of automations) {
      if (a.status === 'active') activeCount++;
      else if (a.status === 'paused') pausedCount++;
      else if (a.status === 'error') errorCount++;
    }

    const totalRuns = runs.length;
    let completedRuns = 0;
    let failedRuns = 0;
    let totalDurationMs = 0;
    let durationCount = 0;

    const autoNameMap = new Map<string, string>();
    automations.forEach((a) => autoNameMap.set(a.id, a.name));

    const recentErrors: AutomationHealthSummary['recentErrors'] = [];

    for (const r of runs) {
      if (r.status === 'completed') completedRuns++;
      else if (r.status === 'failed') {
        failedRuns++;
        if (recentErrors.length < 5) {
          recentErrors.push({
            runId: r.id,
            automationId: r.automation_id,
            automationName: autoNameMap.get(r.automation_id) || 'Unknown Automation',
            errorMessage: sanitizeSecrets(r.error_message || 'Execution failed'),
            occurredAt: r.created_at,
          });
        }
      }

      if (typeof r.duration_ms === 'number' && r.duration_ms > 0) {
        totalDurationMs += r.duration_ms;
        durationCount++;
      }
    }

    const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100;
    const avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;

    return {
      totalAutomations,
      activeCount,
      pausedCount,
      errorCount,
      totalRuns,
      completedRuns,
      failedRuns,
      successRate,
      avgDurationMs,
      recentErrors,
    };
  }

  /**
   * Produces comprehensive operational metrics including queue lag, retries count, failure rate, and DLQ depth.
   */
  public async getAutomationMetrics(tenantId: string, brandId?: string | null): Promise<AutomationMetrics> {
    let autoQuery = db('automations').where({ tenant_id: tenantId });
    let runQuery = db('automation_runs').where({ tenant_id: tenantId });
    let dlqQuery = db('automation_dlq').where({ tenant_id: tenantId, status: 'dead_letter' });

    if (brandId) {
      autoQuery = autoQuery.andWhere({ brand_id: brandId });
      runQuery = runQuery.andWhere({ brand_id: brandId });
      dlqQuery = dlqQuery.andWhere({ brand_id: brandId });
    }

    const automations = await autoQuery.select('id', 'name', 'status');
    const runs = await runQuery.select(
      'id',
      'automation_id',
      'status',
      'duration_ms',
      'retry_count',
      'error_message',
      'created_at',
      'started_at',
      'completed_at'
    );

    let dlqDepth = 0;
    try {
      const dlqCount = await dlqQuery.count('id as count').first();
      dlqDepth = Number(dlqCount?.count || 0);
    } catch {}

    const totalAutomations = automations.length;
    let activeCount = 0;
    let pausedCount = 0;
    let errorCount = 0;

    for (const a of automations) {
      if (a.status === 'active') activeCount++;
      else if (a.status === 'paused') pausedCount++;
      else if (a.status === 'error' || a.status === 'failed') errorCount++;
    }

    const totalRuns = runs.length;
    let completedRuns = 0;
    let failedRuns = 0;
    let awaitingApprovalRuns = 0;
    let retryingRuns = 0;
    let totalRetries = 0;
    let totalDurationMs = 0;
    let durationCount = 0;
    let totalQueueLagMs = 0;
    let queueLagCount = 0;

    const autoNameMap = new Map<string, string>();
    automations.forEach((a) => autoNameMap.set(a.id, a.name));

    const recentErrors: AutomationMetrics['recentErrors'] = [];

    for (const r of runs) {
      totalRetries += Number(r.retry_count || 0);

      if (r.status === 'completed') completedRuns++;
      else if (r.status === 'failed') {
        failedRuns++;
        if (recentErrors.length < 10) {
          recentErrors.push({
            runId: r.id,
            automationId: r.automation_id,
            automationName: autoNameMap.get(r.automation_id) || 'Unknown Automation',
            errorMessage: sanitizeSecrets(r.error_message || 'Execution error'),
            occurredAt: r.created_at,
          });
        }
      } else if (r.status === 'awaiting_approval') {
        awaitingApprovalRuns++;
      } else if (r.status === 'retrying') {
        retryingRuns++;
      }

      if (typeof r.duration_ms === 'number' && r.duration_ms > 0) {
        totalDurationMs += r.duration_ms;
        durationCount++;
      }

      // Calculate queue lag: difference between created_at and started_at
      if (r.created_at && r.started_at) {
        const lag = new Date(r.started_at).getTime() - new Date(r.created_at).getTime();
        if (lag >= 0) {
          totalQueueLagMs += lag;
          queueLagCount++;
        }
      }
    }

    const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100;
    const failureRate = totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0;
    const avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;
    const queueLagMs = queueLagCount > 0 ? Math.round(totalQueueLagMs / queueLagCount) : 0;

    return {
      totalAutomations,
      activeCount,
      pausedCount,
      errorCount,
      totalRuns,
      completedRuns,
      failedRuns,
      awaitingApprovalRuns,
      retryingRuns,
      successRate,
      failureRate,
      retryCount: totalRetries,
      dlqDepth,
      avgDurationMs,
      queueLagMs,
      recentErrors,
    };
  }
}

export const automationHealthService = new AutomationHealthService();

