import { db } from '../../db/connection.js';
import { connectionService } from './connection.service.js';
import { channelHealthMonitorService } from './channelHealthMonitor.service.js';
import type {
  ConnectionStatus,
  ChannelHealthState,
  ChannelHealthEvaluation,
  HealthCheckResult,
} from '@socialforge/shared';

export interface AggregatedHealthSummary {
  overallStatus: 'healthy' | 'degraded' | 'action_required';
  totalConnections: number;
  statusCounts: Record<ConnectionStatus, number>;
  channelHealthCounts: Record<ChannelHealthState, number>;
  publishingEligibleCount: number;
  expiringSoonCount: number;
  unhealthyConnections: Array<{
    id: string;
    provider: string;
    accountName: string;
    status: ConnectionStatus;
    channelHealthState: ChannelHealthState;
    lastError: any;
    expiresAt: Date | string | null;
  }>;
  evaluations?: ChannelHealthEvaluation[];
}

export class ConnectionHealthService {
  /**
   * Executes an active, on-demand health check against a single provider connection.
   * Resolves credentials securely server-side and evaluates full Channel Health state.
   */
  public async checkConnectionHealth(
    tenantId: string,
    connectionId: string,
    options: { force?: boolean } = {}
  ): Promise<HealthCheckResult & { previousStatus: ConnectionStatus; evaluation: ChannelHealthEvaluation }> {
    const conn = await connectionService.getConnectionById(tenantId, connectionId);
    if (!conn) {
      throw new Error('Connection not found for current workspace.');
    }

    const previousStatus = conn.status;

    // Delegate to unified ChannelHealthMonitorService
    const evaluation = await channelHealthMonitorService.evaluateConnection(tenantId, connectionId, {
      force: options.force ?? true,
    });

    const checkResult: HealthCheckResult = {
      status: conn.status,
      lastCheckedAt: evaluation.lastCheckedAt,
      latencyMs: evaluation.latencyMs || 25,
      error: evaluation.lastError || null,
      metadata: {
        channelHealthState: evaluation.state,
        isPublishingEligible: evaluation.isPublishingEligible,
        publishingIneligibilityReason: evaluation.publishingIneligibilityReason,
        tokenValid: evaluation.tokenValid,
        scopesValid: evaluation.scopesValid,
        apiReachable: evaluation.apiReachable,
        isRateLimited: evaluation.isRateLimited,
        isProviderOutage: evaluation.isProviderOutage,
      },
    };

    // Audit log
    await connectionService.logEvent({
      connectionId,
      tenantId,
      brandId: conn.brand_id,
      eventType: 'health_check',
      status: evaluation.isPublishingEligible ? 'success' : 'warning',
      details: {
        channelHealthState: evaluation.state,
        isPublishingEligible: evaluation.isPublishingEligible,
        latencyMs: evaluation.latencyMs,
        error: evaluation.lastError,
      },
    });

    return {
      ...checkResult,
      previousStatus,
      evaluation,
    };
  }

  /**
   * Produces an aggregated health summary for the tenant across all connections.
   */
  public async getHealthSummary(
    tenantId: string,
    brandId?: string | null
  ): Promise<AggregatedHealthSummary> {
    const connections = await connectionService.listConnections(tenantId, { brandId });

    const statusCounts: Record<ConnectionStatus, number> = {
      CONNECTED: 0,
      CHECKING: 0,
      NEEDS_ATTENTION: 0,
      REAUTH_REQUIRED: 0,
      PERMISSION_MISSING: 0,
      RATE_LIMITED: 0,
      DISCONNECTED: 0,
    };

    const channelHealthCounts: Record<ChannelHealthState, number> = {
      Connected: 0,
      Healthy: 0,
      'Expiring Soon': 0,
      Refreshing: 0,
      'Reauthorization Required': 0,
      Disconnected: 0,
      'Provider Error': 0,
    };

    const unhealthyConnections: AggregatedHealthSummary['unhealthyConnections'] = [];
    const evaluations: ChannelHealthEvaluation[] = [];
    let publishingEligibleCount = 0;
    let expiringSoonCount = 0;

    for (const c of connections) {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;

      // Evaluate channel health state (leveraging cached connectivity checks to preserve API quotas)
      try {
        const evalResult = await channelHealthMonitorService.evaluateConnection(tenantId, c.id, { force: false });
        evaluations.push(evalResult);

        channelHealthCounts[evalResult.state] = (channelHealthCounts[evalResult.state] || 0) + 1;
        if (evalResult.isPublishingEligible) {
          publishingEligibleCount++;
        }
        if (evalResult.state === 'Expiring Soon') {
          expiringSoonCount++;
        }

        if (evalResult.state !== 'Healthy' && evalResult.state !== 'Connected') {
          unhealthyConnections.push({
            id: c.id,
            provider: c.provider,
            accountName: c.account_name || `${c.provider} Account`,
            status: c.status,
            channelHealthState: evalResult.state,
            lastError: evalResult.lastError,
            expiresAt: c.expires_at || null,
          });
        }
      } catch (err: any) {
        channelHealthCounts['Provider Error'] = (channelHealthCounts['Provider Error'] || 0) + 1;
        unhealthyConnections.push({
          id: c.id,
          provider: c.provider,
          accountName: c.account_name || `${c.provider} Account`,
          status: c.status,
          channelHealthState: 'Provider Error',
          lastError: err.message,
          expiresAt: c.expires_at || null,
        });
      }
    }

    let overallStatus: AggregatedHealthSummary['overallStatus'] = 'healthy';
    if (channelHealthCounts['Reauthorization Required'] > 0 || statusCounts.REAUTH_REQUIRED > 0) {
      overallStatus = 'action_required';
    } else if (
      channelHealthCounts['Provider Error'] > 0 ||
      channelHealthCounts['Expiring Soon'] > 0 ||
      statusCounts.NEEDS_ATTENTION > 0 ||
      statusCounts.RATE_LIMITED > 0
    ) {
      overallStatus = 'degraded';
    }

    return {
      overallStatus,
      totalConnections: connections.length,
      statusCounts,
      channelHealthCounts,
      publishingEligibleCount,
      expiringSoonCount,
      unhealthyConnections,
      evaluations,
    };
  }
}

export const connectionHealthService = new ConnectionHealthService();
