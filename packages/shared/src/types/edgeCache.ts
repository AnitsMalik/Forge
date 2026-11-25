/**
 * Edge Caching & Content Delivery Network (CDN) Types
 * Phase 30 - SocialForge Multi-Region Edge Caching Engine
 */

export type EdgeNodeStatus = 'online' | 'degraded' | 'draining' | 'offline';

export type EdgeCacheTier = 'edge_memory' | 'edge_ssd' | 'origin_pass';

export type EdgePurgeType = 'url' | 'tag' | 'wildcard' | 'purge_all';

export type EdgePurgeStatus = 'queued' | 'in_progress' | 'completed' | 'failed';

export type EdgeCacheDecision = 'HIT' | 'MISS' | 'BYPASS' | 'EXPIRED' | 'STALE_REVALIDATE';

export interface EdgeCacheNode {
  id: string;
  nodeCode: string;
  name: string;
  region: string;
  status: EdgeNodeStatus;
  ipAddress: string;
  latencyMs: number;
  hitRatio: number;
  uptimePercent: number;
  capacityGb: number;
  usedGb: number;
  activeConnections: number;
  sslActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EdgeCacheRule {
  id: string;
  tenantId?: string | null;
  ruleName: string;
  priority: number;
  routePattern: string;
  cacheTier: EdgeCacheTier;
  ttlSeconds: number;
  swrSeconds: number;
  cacheTags: string[];
  bypassOnAuth: boolean;
  bypassMethods: string[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EdgePurgeRequest {
  id: string;
  tenantId?: string | null;
  purgeType: EdgePurgeType;
  targets: string[];
  status: EdgePurgeStatus;
  reason: string;
  requestedBy: string;
  nodesAffected: number;
  completedAt?: string | null;
  createdAt: string;
}

export interface EdgeTrafficMetric {
  id: string;
  timeBucket: string;
  edgeNodeId?: string | null;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheBypasses: number;
  bandwidthBytes: number;
  originOffloadPercent: number;
  p95LatencyMs: number;
  createdAt: string;
}

export interface EdgeSimulationRequest {
  route: string;
  method: string;
  headers?: Record<string, string>;
}

export interface EdgeSimulationResult {
  route: string;
  method: string;
  matchedRule: {
    id: string;
    ruleName: string;
    routePattern: string;
    cacheTier: EdgeCacheTier;
    ttlSeconds: number;
    swrSeconds: number;
  } | null;
  cacheDecision: EdgeCacheDecision;
  responseHeaders: {
    'CF-Cache-Status': string;
    'X-SocialForge-Cache': string;
    'X-Edge-Node': string;
    'Age': string;
    'Cache-Control': string;
    'X-Origin-Shield': string;
  };
  effectiveTtlSeconds: number;
  originShielded: boolean;
  simulatedNode: {
    nodeCode: string;
    region: string;
    latencyMs: number;
  };
}

export interface EdgeCacheOverview {
  totalNodes: number;
  onlineNodes: number;
  globalHitRatio: number;
  originOffloadPercent: number;
  totalBandwidthBytes: number;
  avgEdgeLatencyMs: number;
  activeRulesCount: number;
  recentPurgeCount: number;
}
