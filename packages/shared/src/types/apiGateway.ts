export type GatewayAuthStrategy = 'jwt_bearer' | 'api_key' | 'mutual_tls' | 'public';

export type GatewayRateLimitTier = 'standard' | 'high_throughput' | 'unlimited' | 'strict_burst';

export interface GatewayRoute {
  id: string;
  routePath: string; // e.g. /api/v1/posts/*
  serviceName: string; // e.g. content_service, publishing_service
  authStrategy: GatewayAuthStrategy;
  rateLimitTier: GatewayRateLimitTier;
  requestsPerMinute: number;
  burstCapacity: number;
  corsEnabled: boolean;
  isActive: boolean;
  timeoutMs: number;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenBucketQuota {
  id: string;
  tenantId: string;
  tenantName?: string;
  routeId: string;
  routePath?: string;
  availableTokens: number;
  maxCapacity: number;
  refillRatePerSec: number;
  lastRefillAt: string;
  totalRequestsAllowed: number;
  totalRequestsThrottled: number;
  isThrottled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThrottleAuditLog {
  id: string;
  tenantId?: string | null;
  tenantName?: string;
  routePath: string;
  clientIp: string;
  requestedTokens: number;
  remainingTokens: number;
  throttleReason: string;
  httpStatus: number; // 429
  createdAt: string;
}

export interface GatewayTelemetry {
  totalRoutes: number;
  activeRoutes: number;
  totalBuckets: number;
  totalRequestsEvaluated: number;
  totalThrottledCount: number;
  globalThrottleRate: number; // % throttled
  averageLatencyMs: number;
  topThrottledRoutes: Array<{ routePath: string; throttledCount: number }>;
  topConsumers: Array<{ tenantId: string; tenantName?: string; requestsAllowed: number; requestsThrottled: number }>;
}

export interface CreateGatewayRouteDto {
  routePath: string;
  serviceName: string;
  authStrategy: GatewayAuthStrategy;
  rateLimitTier: GatewayRateLimitTier;
  requestsPerMinute: number;
  burstCapacity: number;
  corsEnabled?: boolean;
  isActive?: boolean;
  timeoutMs?: number;
  description?: string;
}

export interface UpdateGatewayRouteDto {
  routePath?: string;
  serviceName?: string;
  authStrategy?: GatewayAuthStrategy;
  rateLimitTier?: GatewayRateLimitTier;
  requestsPerMinute?: number;
  burstCapacity?: number;
  corsEnabled?: boolean;
  isActive?: boolean;
  timeoutMs?: number;
  description?: string;
}

export interface SimulateThrottleRequest {
  tenantId: string;
  routePath: string;
  tokenCost?: number;
  simulateBurst?: number;
}

export interface SimulateThrottleResponse {
  allowed: boolean;
  remainingTokens: number;
  maxCapacity: number;
  burstExhausted: boolean;
  retryAfterSeconds: number;
  routeMatched: string;
  executionTimeMs: number;
  decisionReason: string;
}

export interface ResetTenantBucketRequest {
  tenantId: string;
  routeId?: string;
}
