import { db } from '../../db/connection.js';
import { connectionService } from './connection.service.js';
import { tokenLifecycleManager } from './tokenLifecycleManager.js';
import { channelHealthMonitorService } from './channelHealthMonitor.service.js';
import type { ConnectionStatus, ChannelHealthState, ChannelHealthEvaluation } from '@socialforge/shared';

export interface HealthAuditResult {
  auditedCount: number;
  healthyCount: number;
  expiringSoonCount: number;
  refreshingCount: number;
  reauthRequiredCount: number;
  providerErrorCount: number;
  disconnectedCount: number;
  connectedCount: number;
  recoveredCount: number;
  refreshedCount: number;
  publishingEligibleCount: number;
  timestamp: string;
}

export type FailureClassification =
  | 'TEMPORARY_NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'EXPIRED_CREDENTIAL'
  | 'REVOKED_PERMISSION'
  | 'PERMISSION_MISSING'
  | 'PROVIDER_OUTAGE'
  | 'UNKNOWN';

export class ConnectionHealthScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static intervalMs = 15 * 60 * 1000; // 15 minutes default

  /**
   * Starts the background automated health check cron job.
   */
  public static start(intervalMs: number = 15 * 60 * 1000): void {
    if (this.timer) {
      console.log('[ConnectionHealthScheduler] Scheduler already active.');
      return;
    }

    this.intervalMs = intervalMs;
    console.log(`[ConnectionHealthScheduler] Starting scheduled health monitor (interval: ${intervalMs / 1000}s)`);

    // Run first audit cycle shortly after boot (e.g. 10s)
    setTimeout(() => {
      this.runAuditCycle().catch((err) =>
        console.error('[ConnectionHealthScheduler] Initial health cycle failed:', err.message)
      );
    }, 10000);

    this.timer = setInterval(() => {
      this.runAuditCycle().catch((err) =>
        console.error('[ConnectionHealthScheduler] Periodic health cycle failed:', err.message)
      );
    }, this.intervalMs);
  }

  /**
   * Stops the background scheduler on shutdown.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[ConnectionHealthScheduler] Background scheduler stopped.');
    }
  }

  /**
   * Classifies error messages into actionable failure categories.
   */
  public static classifyFailure(errorMsg?: string | null): FailureClassification {
    if (!errorMsg) return 'UNKNOWN';
    const lower = errorMsg.toLowerCase();

    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('throttled')) {
      return 'RATE_LIMITED';
    }
    if (lower.includes('expired') || lower.includes('190') || lower.includes('token expired') || lower.includes('token has expired')) {
      return 'EXPIRED_CREDENTIAL';
    }
    if (lower.includes('revoked') || lower.includes('invalid_grant') || lower.includes('access revoked')) {
      return 'REVOKED_PERMISSION';
    }
    if (lower.includes('permission') || lower.includes('scope') || lower.includes('insufficient')) {
      return 'PERMISSION_MISSING';
    }
    if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('504') || lower.includes('timeout') || lower.includes('econnrefused')) {
      return 'TEMPORARY_NETWORK_ERROR';
    }
    if (lower.includes('outage') || lower.includes('service unavailable')) {
      return 'PROVIDER_OUTAGE';
    }

    return 'UNKNOWN';
  }

  /**
   * Runs an audit cycle across all active connections with provider API rate limit budgeting and clear connection states.
   */
  public static async runAuditCycle(): Promise<HealthAuditResult> {
    if (this.isRunning) {
      console.log('[ConnectionHealthScheduler] Cycle already in progress, skipping overlapping run.');
      return {
        auditedCount: 0,
        healthyCount: 0,
        expiringSoonCount: 0,
        refreshingCount: 0,
        reauthRequiredCount: 0,
        providerErrorCount: 0,
        disconnectedCount: 0,
        connectedCount: 0,
        recoveredCount: 0,
        refreshedCount: 0,
        publishingEligibleCount: 0,
        timestamp: new Date().toISOString(),
      };
    }

    this.isRunning = true;
    const now = new Date();

    let auditedCount = 0;
    let healthyCount = 0;
    let expiringSoonCount = 0;
    let refreshingCount = 0;
    let reauthRequiredCount = 0;
    let providerErrorCount = 0;
    let disconnectedCount = 0;
    let connectedCount = 0;
    let recoveredCount = 0;
    let refreshedCount = 0;
    let publishingEligibleCount = 0;

    try {
      // Query all non-disconnected connections
      const activeConnections = await db('social_connections')
        .whereNot({ status: 'DISCONNECTED' })
        .select('*');

      auditedCount = activeConnections.length;

      for (const conn of activeConnections) {
        try {
          const tenantId = conn.tenant_id;
          const previousStatus: ConnectionStatus = conn.status;
          const previousHealthStatus: string = conn.health_status || 'healthy';

          // 1. Proactive Token Refresh for refreshable providers before expiration
          if (tokenLifecycleManager.isRefreshRequired(conn)) {
            console.log(`[ConnectionHealthScheduler] Token proactively eligible for refresh: ${conn.provider} (${conn.id})`);
            const refreshResult = await tokenLifecycleManager.refreshToken(tenantId, conn.id);
            if (refreshResult.refreshed) {
              refreshedCount++;
              const updatedConn = await connectionService.getConnectionById(tenantId, conn.id);
              if (updatedConn) {
                conn.expires_at = updatedConn.expires_at;
                conn.status = updatedConn.status;
              }
            }
          }

          // 2. Perform live channel health evaluation (with rate limit budgeting & cache window)
          const evaluation: ChannelHealthEvaluation = await channelHealthMonitorService.evaluateConnection(
            tenantId,
            conn.id,
            { force: false }
          );

          if (evaluation.isPublishingEligible) {
            publishingEligibleCount++;
          }

          // Map to clear connection states
          switch (evaluation.state) {
            case 'Healthy':
              healthyCount++;
              break;
            case 'Expiring Soon':
              expiringSoonCount++;
              break;
            case 'Refreshing':
              refreshingCount++;
              break;
            case 'Reauthorization Required':
              reauthRequiredCount++;
              break;
            case 'Provider Error':
              providerErrorCount++;
              break;
            case 'Disconnected':
              disconnectedCount++;
              break;
            case 'Connected':
              connectedCount++;
              break;
          }

          // 3. Track Recovery from previous degraded / error states
          if (
            evaluation.state === 'Healthy' &&
            (previousHealthStatus === 'Reauthorization Required' ||
              previousHealthStatus === 'Provider Error' ||
              previousStatus === 'NEEDS_ATTENTION' ||
              previousStatus === 'REAUTH_REQUIRED')
          ) {
            recoveredCount++;
            await connectionService.logEvent({
              connectionId: conn.id,
              tenantId,
              brandId: conn.brand_id,
              eventType: 'status_changed',
              status: 'success',
              details: {
                event: 'connection_recovered',
                previousStatus,
                previousHealthStatus,
                recoveredAt: now.toISOString(),
                message: `Connection recovered to Healthy state after previous ${previousStatus} / ${previousHealthStatus}.`,
              },
            });
          }

          // 4. Actionable customer notification on Reauthorization Required
          if (
            evaluation.state === 'Reauthorization Required' &&
            previousHealthStatus !== 'Reauthorization Required'
          ) {
            await connectionService.logEvent({
              connectionId: conn.id,
              tenantId,
              brandId: conn.brand_id,
              eventType: 'status_changed',
              status: 'warning',
              details: {
                event: 'RECONNECT_REQUIRED',
                reason: evaluation.publishingIneligibilityReason || evaluation.lastError,
                actionUrl: `/connections/${conn.id}/reconnect`,
                timestamp: now.toISOString(),
              },
            });
          }
        } catch (singleErr: any) {
          console.warn(`[ConnectionHealthScheduler] Audit failed for conn ${conn.id}:`, singleErr.message);
          providerErrorCount++;
        }
      }
    } catch (cycleErr: any) {
      console.error('[ConnectionHealthScheduler] Cycle execution error:', cycleErr.message);
    } finally {
      this.isRunning = false;
    }

    const summary: HealthAuditResult = {
      auditedCount,
      healthyCount,
      expiringSoonCount,
      refreshingCount,
      reauthRequiredCount,
      providerErrorCount,
      disconnectedCount,
      connectedCount,
      recoveredCount,
      refreshedCount,
      publishingEligibleCount,
      timestamp: now.toISOString(),
    };

    console.log(
      `[ConnectionHealthScheduler] Audit cycle completed: ${auditedCount} audited (${healthyCount} Healthy, ${expiringSoonCount} Expiring Soon, ${reauthRequiredCount} Reauth Required, ${providerErrorCount} Provider Error, ${publishingEligibleCount} Publishing Eligible).`
    );

    return summary;
  }
}

export const connectionHealthScheduler = ConnectionHealthScheduler;
