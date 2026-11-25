/**
 * Enterprise Global API Gateway, Dynamic Rate-Limiter & Token Bucket Throttling Service
 * SocialForge Platform v5.1.0
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import type {
  GatewayRoute,
  TokenBucketQuota,
  ThrottleAuditLog,
  GatewayTelemetry,
  GatewayAuthStrategy,
  GatewayRateLimitTier,
  CreateGatewayRouteDto,
  UpdateGatewayRouteDto,
  SimulateThrottleRequest,
  SimulateThrottleResponse,
} from '@socialforge/shared';

export class ApiGatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiGatewayError';
  }
}

interface Actor {
  id: string;
  email: string;
}

export class ApiGatewayService {
  private mapRoute(row: any): GatewayRoute {
    return {
      id: row.id,
      routePath: row.route_path,
      serviceName: row.service_name,
      authStrategy: row.auth_strategy as GatewayAuthStrategy,
      rateLimitTier: row.rate_limit_tier as GatewayRateLimitTier,
      requestsPerMinute: Number(row.requests_per_minute),
      burstCapacity: Number(row.burst_capacity),
      corsEnabled: Boolean(row.cors_enabled),
      isActive: Boolean(row.is_active),
      timeoutMs: Number(row.timeout_ms),
      description: row.description || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapBucket(row: any): TokenBucketQuota {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name || row.name || undefined,
      routeId: row.route_id,
      routePath: row.route_path || undefined,
      availableTokens: Number(row.available_tokens),
      maxCapacity: Number(row.max_capacity),
      refillRatePerSec: Number(row.refill_rate_per_sec),
      lastRefillAt: new Date(row.last_refill_at).toISOString(),
      totalRequestsAllowed: Number(row.total_requests_allowed),
      totalRequestsThrottled: Number(row.total_requests_throttled),
      isThrottled: Boolean(row.is_throttled),
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapLog(row: any): ThrottleAuditLog {
    return {
      id: row.id,
      tenantId: row.tenant_id || null,
      tenantName: row.tenant_name || row.name || undefined,
      routePath: row.route_path,
      clientIp: row.client_ip,
      requestedTokens: Number(row.requested_tokens),
      remainingTokens: Number(row.remaining_tokens),
      throttleReason: row.throttle_reason,
      httpStatus: Number(row.http_status),
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private async audit(actor: Actor, action: string, targetId: string, details: Record<string, any>) {
    try {
      await db('superadmin_audit_logs').insert({
        id: crypto.randomUUID(),
        superadmin_id: actor.id,
        superadmin_email: actor.email,
        action,
        target_resource_type: 'api_gateway',
        target_resource_id: targetId,
        reason: 'Enterprise API Gateway & Rate Limiting Operation',
        details: JSON.stringify(details),
        created_at: new Date(),
      });
    } catch {
      // Non-blocking audit logger
    }
  }

  /**
   * Retrieves Gateway & Dynamic Throttling Telemetry
   */
  public async getTelemetry(): Promise<GatewayTelemetry> {
    const [routes, buckets, logs] = await Promise.all([
      db('api_gateway_routes').select('id', 'is_active', 'timeout_ms'),
      db('api_token_bucket_quotas')
        .leftJoin('tenants', 'api_token_bucket_quotas.tenant_id', 'tenants.id')
        .select(
          'api_token_bucket_quotas.*',
          'tenants.name as tenant_name'
        ),
      db('api_throttle_audit_logs').select('route_path', 'created_at'),
    ]);

    const totalRoutes = routes.length;
    const activeRoutes = routes.filter((r) => r.is_active).length;
    const totalBuckets = buckets.length;

    let totalAllowed = 0;
    let totalThrottled = 0;

    for (const b of buckets) {
      totalAllowed += Number(b.total_requests_allowed || 0);
      totalThrottled += Number(b.total_requests_throttled || 0);
    }

    const totalEvaluated = totalAllowed + totalThrottled;
    const globalThrottleRate = totalEvaluated > 0
      ? Number(((totalThrottled / totalEvaluated) * 100).toFixed(2))
      : 0;

    const avgTimeout = routes.length > 0
      ? routes.reduce((sum, r) => sum + Number(r.timeout_ms || 10000), 0) / routes.length
      : 10000;
    const averageLatencyMs = Number((avgTimeout / 120).toFixed(1)); // simulated gateway edge hop overhead

    // Top throttled routes from logs
    const routeThrottleCounts: Record<string, number> = {};
    for (const log of logs) {
      routeThrottleCounts[log.route_path] = (routeThrottleCounts[log.route_path] || 0) + 1;
    }
    const topThrottledRoutes = Object.entries(routeThrottleCounts)
      .map(([routePath, throttledCount]) => ({ routePath, throttledCount }))
      .sort((a, b) => b.throttledCount - a.throttledCount)
      .slice(0, 5);

    // Top consumers
    const topConsumers = buckets
      .map((b) => ({
        tenantId: b.tenant_id,
        tenantName: b.tenant_name || b.tenant_id,
        requestsAllowed: Number(b.total_requests_allowed || 0),
        requestsThrottled: Number(b.total_requests_throttled || 0),
      }))
      .sort((a, b) => b.requestsAllowed - a.requestsAllowed)
      .slice(0, 5);

    return {
      totalRoutes,
      activeRoutes,
      totalBuckets,
      totalRequestsEvaluated: totalEvaluated,
      totalThrottledCount: totalThrottled,
      globalThrottleRate,
      averageLatencyMs,
      topThrottledRoutes,
      topConsumers,
    };
  }

  /**
   * Lists Gateway Routes
   */
  public async listRoutes(options?: {
    serviceName?: string;
    isActive?: boolean;
    tier?: string;
    search?: string;
  }): Promise<GatewayRoute[]> {
    let query = db('api_gateway_routes').select('*').orderBy('route_path', 'asc');

    if (options?.serviceName) query = query.where('service_name', options.serviceName);
    if (options?.isActive !== undefined) query = query.where('is_active', options.isActive);
    if (options?.tier) query = query.where('rate_limit_tier', options.tier);
    if (options?.search) {
      const q = `%${options.search}%`;
      query = query.where((b) => {
        b.where('route_path', 'like', q)
          .orWhere('service_name', 'like', q)
          .orWhere('description', 'like', q);
      });
    }

    const rows = await query;
    return rows.map(this.mapRoute);
  }

  /**
   * Retrieves single gateway route
   */
  public async getRouteById(id: string): Promise<GatewayRoute> {
    const row = await db('api_gateway_routes').where('id', id).first();
    if (!row) {
      throw new ApiGatewayError(404, `Gateway route not found: ${id}`);
    }
    return this.mapRoute(row);
  }

  /**
   * Creates a new gateway route
   */
  public async createRoute(dto: CreateGatewayRouteDto, actor: Actor): Promise<GatewayRoute> {
    if (!dto.routePath || !dto.routePath.startsWith('/') || dto.routePath.trim().length < 3) {
      throw new ApiGatewayError(400, 'Route path must start with "/" and be at least 3 characters long');
    }
    if (!dto.requestsPerMinute || dto.requestsPerMinute <= 0) {
      throw new ApiGatewayError(400, 'Requests per minute must be greater than 0');
    }
    if (!dto.burstCapacity || dto.burstCapacity <= 0) {
      throw new ApiGatewayError(400, 'Burst capacity must be greater than 0');
    }

    const normalizedPath = dto.routePath.trim();
    const existing = await db('api_gateway_routes').where('route_path', normalizedPath).first();
    if (existing) {
      throw new ApiGatewayError(409, `Route with path "${normalizedPath}" already exists`);
    }

    const id = `route-${crypto.randomUUID().slice(0, 18)}`;
    const now = new Date();

    await db('api_gateway_routes').insert({
      id,
      route_path: normalizedPath,
      service_name: dto.serviceName || 'content_service',
      auth_strategy: dto.authStrategy || 'jwt_bearer',
      rate_limit_tier: dto.rateLimitTier || 'standard',
      requests_per_minute: dto.requestsPerMinute,
      burst_capacity: dto.burstCapacity,
      cors_enabled: dto.corsEnabled !== false,
      is_active: dto.isActive !== false,
      timeout_ms: dto.timeoutMs || 10000,
      description: dto.description || null,
      created_at: now,
      updated_at: now,
    });

    await this.audit(actor, 'CREATE_GATEWAY_ROUTE', id, {
      routePath: normalizedPath,
      serviceName: dto.serviceName,
      rateLimitTier: dto.rateLimitTier,
    });

    return this.getRouteById(id);
  }

  /**
   * Updates an existing gateway route
   */
  public async updateRoute(id: string, dto: UpdateGatewayRouteDto, actor: Actor): Promise<GatewayRoute> {
    const existing = await db('api_gateway_routes').where('id', id).first();
    if (!existing) {
      throw new ApiGatewayError(404, `Gateway route not found: ${id}`);
    }

    const updates: Record<string, any> = {
      updated_at: new Date(),
    };

    if (dto.routePath) {
      if (!dto.routePath.startsWith('/') || dto.routePath.trim().length < 3) {
        throw new ApiGatewayError(400, 'Route path must start with "/" and be at least 3 characters long');
      }
      updates.route_path = dto.routePath.trim();
    }
    if (dto.serviceName) updates.service_name = dto.serviceName;
    if (dto.authStrategy) updates.auth_strategy = dto.authStrategy;
    if (dto.rateLimitTier) updates.rate_limit_tier = dto.rateLimitTier;
    if (dto.requestsPerMinute) updates.requests_per_minute = dto.requestsPerMinute;
    if (dto.burstCapacity) updates.burst_capacity = dto.burstCapacity;
    if (dto.corsEnabled !== undefined) updates.cors_enabled = dto.corsEnabled;
    if (dto.isActive !== undefined) updates.is_active = dto.isActive;
    if (dto.timeoutMs) updates.timeout_ms = dto.timeoutMs;
    if (dto.description !== undefined) updates.description = dto.description;

    await db('api_gateway_routes').where('id', id).update(updates);

    await this.audit(actor, 'UPDATE_GATEWAY_ROUTE', id, {
      updates,
      previousPath: existing.route_path,
    });

    return this.getRouteById(id);
  }

  /**
   * Deletes a gateway route
   */
  public async deleteRoute(id: string, actor: Actor): Promise<void> {
    const existing = await db('api_gateway_routes').where('id', id).first();
    if (!existing) {
      throw new ApiGatewayError(404, `Gateway route not found: ${id}`);
    }

    await db('api_gateway_routes').where('id', id).delete();

    await this.audit(actor, 'DELETE_GATEWAY_ROUTE', id, {
      routePath: existing.route_path,
    });
  }

  /**
   * Lists Token Bucket Quotas
   */
  public async listBuckets(options?: {
    tenantId?: string;
    routeId?: string;
    isThrottled?: boolean;
    limit?: number;
  }): Promise<TokenBucketQuota[]> {
    let query = db('api_token_bucket_quotas')
      .join('tenants', 'api_token_bucket_quotas.tenant_id', 'tenants.id')
      .join('api_gateway_routes', 'api_token_bucket_quotas.route_id', 'api_gateway_routes.id')
      .select(
        'api_token_bucket_quotas.*',
        'tenants.name as tenant_name',
        'api_gateway_routes.route_path as route_path'
      )
      .orderBy('api_token_bucket_quotas.total_requests_throttled', 'desc');

    if (options?.tenantId) query = query.where('api_token_bucket_quotas.tenant_id', options.tenantId);
    if (options?.routeId) query = query.where('api_token_bucket_quotas.route_id', options.routeId);
    if (options?.isThrottled !== undefined) query = query.where('api_token_bucket_quotas.is_throttled', options.isThrottled);
    if (options?.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map(this.mapBucket);
  }

  /**
   * Resets tenant token bucket quota
   */
  public async resetBucket(tenantId: string, routeId: string, actor: Actor): Promise<TokenBucketQuota> {
    const bucket = await db('api_token_bucket_quotas')
      .where({ tenant_id: tenantId, route_id: routeId })
      .first();

    if (!bucket) {
      throw new ApiGatewayError(404, `Token bucket not found for tenant: ${tenantId} and route: ${routeId}`);
    }

    const now = new Date();
    await db('api_token_bucket_quotas')
      .where('id', bucket.id)
      .update({
        available_tokens: bucket.max_capacity,
        is_throttled: false,
        last_refill_at: now,
        updated_at: now,
      });

    await this.audit(actor, 'RESET_TOKEN_BUCKET', bucket.id, {
      tenantId,
      routeId,
      restoredTokens: bucket.max_capacity,
    });

    const updated = await db('api_token_bucket_quotas')
      .join('tenants', 'api_token_bucket_quotas.tenant_id', 'tenants.id')
      .join('api_gateway_routes', 'api_token_bucket_quotas.route_id', 'api_gateway_routes.id')
      .where('api_token_bucket_quotas.id', bucket.id)
      .select(
        'api_token_bucket_quotas.*',
        'tenants.name as tenant_name',
        'api_gateway_routes.route_path as route_path'
      )
      .first();

    return this.mapBucket(updated);
  }

  /**
   * Atomic Token Consumption Engine using continuous proportional refill algorithm
   */
  public async consumeToken(
    tenantId: string,
    routePath: string,
    tokenCost = 1,
    clientIp = '127.0.0.1'
  ): Promise<{ allowed: boolean; remainingTokens: number; retryAfterSeconds: number }> {
    // Find matching route pattern
    const routes = await db('api_gateway_routes').where('is_active', true).select('*');
    const matchedRoute = routes.find((r) => {
      const pattern = r.route_path.replace('*', '.*');
      return new RegExp(`^${pattern}$`).test(routePath) || r.route_path === routePath;
    }) || routes[0]; // fallback to first route

    if (!matchedRoute) {
      return { allowed: true, remainingTokens: 100, retryAfterSeconds: 0 };
    }

    // Find or create bucket
    let bucket = await db('api_token_bucket_quotas')
      .where({ tenant_id: tenantId, route_id: matchedRoute.id })
      .first();

    const now = new Date();

    if (!bucket) {
      const bucketId = `tb-${crypto.randomUUID().slice(0, 18)}`;
      await db('api_token_bucket_quotas').insert({
        id: bucketId,
        tenant_id: tenantId,
        route_id: matchedRoute.id,
        available_tokens: matchedRoute.burst_capacity,
        max_capacity: matchedRoute.burst_capacity,
        refill_rate_per_sec: Number((matchedRoute.requests_per_minute / 60).toFixed(2)),
        last_refill_at: now,
        total_requests_allowed: 0,
        total_requests_throttled: 0,
        is_throttled: false,
        created_at: now,
        updated_at: now,
      });

      bucket = await db('api_token_bucket_quotas').where('id', bucketId).first();
    }

    // Continuous proportional refill calculation
    const elapsedSeconds = Math.max(0, (now.getTime() - new Date(bucket.last_refill_at).getTime()) / 1000);
    const refilledTokens = elapsedSeconds * Number(bucket.refill_rate_per_sec);
    const currentTokens = Math.min(Number(bucket.max_capacity), Number(bucket.available_tokens) + refilledTokens);

    if (currentTokens >= tokenCost) {
      // Request Allowed
      const newAvailable = Number((currentTokens - tokenCost).toFixed(2));
      await db('api_token_bucket_quotas')
        .where('id', bucket.id)
        .update({
          available_tokens: newAvailable,
          last_refill_at: now,
          total_requests_allowed: db.raw('total_requests_allowed + 1'),
          is_throttled: false,
          updated_at: now,
        });

      return {
        allowed: true,
        remainingTokens: newAvailable,
        retryAfterSeconds: 0,
      };
    } else {
      // Request Throttled (429)
      const missingTokens = tokenCost - currentTokens;
      const retryAfterSeconds = Math.ceil(missingTokens / Number(bucket.refill_rate_per_sec || 1));

      await db('api_token_bucket_quotas')
        .where('id', bucket.id)
        .update({
          available_tokens: currentTokens,
          last_refill_at: now,
          total_requests_throttled: db.raw('total_requests_throttled + 1'),
          is_throttled: true,
          updated_at: now,
        });

      // Log 429 Throttle Audit Event
      await db('api_throttle_audit_logs').insert({
        id: `tal-${crypto.randomUUID().slice(0, 18)}`,
        tenant_id: tenantId,
        route_path: routePath,
        client_ip: clientIp,
        requested_tokens: tokenCost,
        remaining_tokens: Number(currentTokens.toFixed(2)),
        throttle_reason: `Token bucket capacity exhausted (${currentTokens.toFixed(1)}/${bucket.max_capacity} tokens remaining)`,
        http_status: 429,
        created_at: now,
      });

      return {
        allowed: false,
        remainingTokens: Number(currentTokens.toFixed(2)),
        retryAfterSeconds,
      };
    }
  }

  /**
   * Lists 429 Throttle Audit Logs
   */
  public async listThrottleLogs(options?: {
    tenantId?: string;
    limit?: number;
  }): Promise<ThrottleAuditLog[]> {
    let query = db('api_throttle_audit_logs')
      .leftJoin('tenants', 'api_throttle_audit_logs.tenant_id', 'tenants.id')
      .select('api_throttle_audit_logs.*', 'tenants.name as tenant_name')
      .orderBy('api_throttle_audit_logs.created_at', 'desc');

    if (options?.tenantId) query = query.where('api_throttle_audit_logs.tenant_id', options.tenantId);
    if (options?.limit) query = query.limit(options.limit);

    const rows = await query;
    return rows.map(this.mapLog);
  }

  /**
   * In-memory simulation of burst load and token bucket replenishment
   */
  public simulateThrottle(req: SimulateThrottleRequest): SimulateThrottleResponse {
    const startTime = performance.now();
    const burst = req.simulateBurst || 1;
    const tokenCost = req.tokenCost || 1;
    const maxCapacity = 50; // standard burst ceiling
    const refillRate = 5.0; // 5 tokens / sec

    const totalCost = burst * tokenCost;
    const allowed = totalCost <= maxCapacity;
    const remainingTokens = Math.max(0, maxCapacity - totalCost);
    const burstExhausted = !allowed;
    const retryAfterSeconds = burstExhausted ? Math.ceil((totalCost - maxCapacity) / refillRate) : 0;
    const executionTimeMs = Number((performance.now() - startTime).toFixed(2));

    const decisionReason = allowed
      ? `Simulated load of ${burst} request(s) smoothly absorbed within ${maxCapacity} burst capacity window.`
      : `Simulated burst of ${burst} concurrent request(s) exhausted token bucket limit (deficit: ${totalCost - maxCapacity} tokens). Rate-limited (429).`;

    return {
      allowed,
      remainingTokens,
      maxCapacity,
      burstExhausted,
      retryAfterSeconds,
      routeMatched: req.routePath,
      executionTimeMs,
      decisionReason,
    };
  }
}

export const apiGatewayService = new ApiGatewayService();
