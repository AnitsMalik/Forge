/**
 * Enterprise Global API Gateway, Dynamic Rate-Limiter & Token Bucket Throttling Tab
 * HoaspForge Platform v5.1.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  ShieldAlert,
  Zap,
  Activity,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Edit3,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  Lock,
  Cpu,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  GatewayRoute,
  TokenBucketQuota,
  ThrottleAuditLog,
  GatewayTelemetry,
  GatewayAuthStrategy,
  GatewayRateLimitTier,
  CreateGatewayRouteDto,
  SimulateThrottleResponse,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'routes' | 'buckets' | 'logs' | 'simulator';

export const ApiGatewayTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('routes');

  // Telemetry
  const [telemetry, setTelemetry] = useState<GatewayTelemetry | null>(null);

  // Accessible Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Routes
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [routeSearch, setRouteSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Buckets
  const [buckets, setBuckets] = useState<TokenBucketQuota[]>([]);
  const [bucketSearch, setBucketSearch] = useState('');
  const [throttledOnly, setThrottledOnly] = useState(false);

  // Logs
  const [throttleLogs, setThrottleLogs] = useState<ThrottleAuditLog[]>([]);

  // Modals
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<GatewayRoute | null>(null);
  const [routeForm, setRouteForm] = useState<CreateGatewayRouteDto>({
    routePath: '',
    serviceName: 'content_service',
    authStrategy: 'jwt_bearer',
    rateLimitTier: 'standard',
    requestsPerMinute: 60,
    burstCapacity: 15,
    corsEnabled: true,
    isActive: true,
    timeoutMs: 10000,
    description: '',
  });

  const [resetModalBucket, setResetModalBucket] = useState<TokenBucketQuota | null>(null);

  // Simulator
  const [simForm, setSimForm] = useState({
    tenantId: 'flagship-tenant-01',
    routePath: '/api/v1/ai/*',
    tokenCost: 1,
    simulateBurst: 20,
  });
  const [simResult, setSimResult] = useState<SimulateThrottleResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await api.adminOps.getApiGatewayTelemetry();
      setTelemetry(res);
    } catch {
      showToast('Failed to fetch gateway telemetry', 'error');
    }
  }, [showToast]);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await api.adminOps.listGatewayRoutes({
        serviceName: serviceFilter || undefined,
        tier: tierFilter || undefined,
        search: routeSearch || undefined,
      });
      setRoutes(res);
    } catch {
      showToast('Failed to load gateway routes', 'error');
    }
  }, [serviceFilter, tierFilter, routeSearch, showToast]);

  const fetchBuckets = useCallback(async () => {
    try {
      const res = await api.adminOps.listTokenBuckets({
        isThrottled: throttledOnly ? true : undefined,
      });
      setBuckets(res);
    } catch {
      showToast('Failed to load token bucket quotas', 'error');
    }
  }, [throttledOnly, showToast]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.adminOps.listThrottleLogs({ limit: 50 });
      setThrottleLogs(res);
    } catch {
      showToast('Failed to load throttle audit logs', 'error');
    }
  }, [showToast]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTelemetry(), fetchRoutes(), fetchBuckets(), fetchLogs()]);
    setLoading(false);
  }, [fetchTelemetry, fetchRoutes, fetchBuckets, fetchLogs]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Simulator handler
  const runSimulation = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateGatewayThrottle(simForm);
      setSimResult(res);
    } catch {
      showToast('Gateway simulation calculation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  }, [simForm, showToast]);

  useEffect(() => {
    if (subTab === 'simulator') {
      runSimulation();
    }
  }, [subTab, runSimulation]);

  // Route Handlers
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.routePath || !routeForm.routePath.startsWith('/')) {
      showToast('Route path must start with "/"', 'error');
      return;
    }
    try {
      if (editingRoute) {
        await api.adminOps.updateGatewayRoute(editingRoute.id, routeForm);
        showToast(`Route ${routeForm.routePath} updated successfully`, 'success');
      } else {
        await api.adminOps.createGatewayRoute(routeForm);
        showToast(`Route ${routeForm.routePath} deployed successfully`, 'success');
      }
      setRouteModalOpen(false);
      setEditingRoute(null);
      fetchRoutes();
      fetchTelemetry();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save route', 'error');
    }
  };

  const handleDeleteRoute = (id: string, path: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Gateway Route',
      description: `Are you sure you want to delete route "${path}"? External and internal requests matched by this route pattern will no longer be forwarded.`,
      confirmText: 'Delete Route',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteGatewayRoute(id);
          showToast(`Route ${path} deleted`, 'info');
          fetchRoutes();
          fetchTelemetry();
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete route', 'error');
        }
      },
    });
  };

  const handleResetBucket = async () => {
    if (!resetModalBucket) return;
    try {
      await api.adminOps.resetTokenBucket(resetModalBucket.tenantId, resetModalBucket.routeId);
      showToast('Token bucket restored to full capacity', 'success');
      setResetModalBucket(null);
      fetchBuckets();
      fetchTelemetry();
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset token bucket', 'error');
    }
  };

  const filteredBuckets = buckets.filter((b) => {
    if (!bucketSearch) return true;
    const q = bucketSearch.toLowerCase();
    return (
      (b.tenantName && b.tenantName.toLowerCase().includes(q)) ||
      (b.routePath && b.routePath.toLowerCase().includes(q)) ||
      b.tenantId.toLowerCase().includes(q)
    );
  });

  return (
    <div id="tab-api_gateway" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network size={26} color="#38bdf8" />
            Global API Gateway & Dynamic Rate-Limiter Engine
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Distributed Token Bucket rate limiting, continuous proportional refill & 429 burst exhaustion protection
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => reloadAll()}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh Gateway
          </button>

          <button
            id="btn-open-create-route"
            onClick={() => {
              setEditingRoute(null);
              setRouteForm({
                routePath: '',
                serviceName: 'content_service',
                authStrategy: 'jwt_bearer',
                rateLimitTier: 'standard',
                requestsPerMinute: 60,
                burstCapacity: 15,
                corsEnabled: true,
                isActive: true,
                timeoutMs: 10000,
                description: '',
              });
              setRouteModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}
          >
            <Plus size={16} />
            Deploy Gateway Route
          </button>
        </div>
      </div>

      {/* 4 Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Active Gateway Routes</span>
            <Network size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38bdf8' }}>
            {telemetry?.activeRoutes ?? '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Total Configured: <strong style={{ color: '#f8fafc' }}>{telemetry?.totalRoutes ?? 0}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Throughput Evaluated</span>
            <Zap size={18} color="#22c55e" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>
            {telemetry?.totalRequestsEvaluated.toLocaleString() ?? '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Active Buckets: <strong style={{ color: '#f8fafc' }}>{telemetry?.totalBuckets ?? 0}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Throttled Requests (429)</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {telemetry?.totalThrottledCount ?? '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Throttle Rate: <strong style={{ color: telemetry && telemetry.globalThrottleRate > 5 ? '#ef4444' : '#f97316' }}>{telemetry?.globalThrottleRate ?? 0}%</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Edge Proxy Latency</span>
            <Activity size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a855f7' }}>
            {telemetry ? `${telemetry.averageLatencyMs}ms` : '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            p99 Token Bucket Evaluation: <strong style={{ color: '#22c55e' }}>&lt; 0.5ms</strong>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px', gap: '8px' }}>
        {[
          { id: 'routes', label: 'Route Configurations & Tiers', icon: Network },
          { id: 'buckets', label: 'Tenant Token Buckets & Quotas', icon: Layers },
          { id: 'logs', label: 'Rate-Limiter Throttle Logs', icon: ShieldAlert },
          { id: 'simulator', label: 'Burst Simulator & Load Tester', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`subtab-gw-${tab.id}`}
              onClick={() => setSubTab(tab.id as SubTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                fontSize: '14px',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Subtab 1: Route Configurations */}
      {subTab === 'routes' && (
        <div id="panel-gw-routes">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search routes by path, service, or description..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                }}
              />
            </div>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
            >
              <option value="">All Services</option>
              <option value="content_service">Content Service</option>
              <option value="publishing_service">Publishing Service</option>
              <option value="ai_agent_service">AI Agent Service</option>
              <option value="analytics_service">Analytics Service</option>
              <option value="webhook_service">Webhook Ingress Service</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{ padding: '8px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
            >
              <option value="">All Limit Tiers</option>
              <option value="standard">Standard (60 rpm)</option>
              <option value="high_throughput">High Throughput (300-600 rpm)</option>
              <option value="strict_burst">Strict Burst</option>
              <option value="unlimited">Unlimited Bypass</option>
            </select>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Route Path</th>
                  <th style={{ padding: '12px 16px' }}>Service</th>
                  <th style={{ padding: '12px 16px' }}>Auth Strategy</th>
                  <th style={{ padding: '12px 16px' }}>Rate Limit Tier</th>
                  <th style={{ padding: '12px 16px' }}>RPM / Burst</th>
                  <th style={{ padding: '12px 16px' }}>Timeout</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {routes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No gateway routes configured.
                    </td>
                  </tr>
                ) : (
                  routes.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#38bdf8' }}>
                        {r.routePath}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{r.serviceName}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{r.authStrategy.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: r.rateLimitTier === 'high_throughput' ? '#22c55e20' : '#334155',
                            color: r.rateLimitTier === 'high_throughput' ? '#22c55e' : '#cbd5e1',
                          }}
                        >
                          {r.rateLimitTier.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.requestsPerMinute} rpm / <strong>{r.burstCapacity} burst</strong>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{r.timeoutMs}ms</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: r.isActive ? '#22c55e20' : '#ef444420',
                            color: r.isActive ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {r.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => {
                            setEditingRoute(r);
                            setRouteForm({
                              routePath: r.routePath,
                              serviceName: r.serviceName,
                              authStrategy: r.authStrategy,
                              rateLimitTier: r.rateLimitTier,
                              requestsPerMinute: r.requestsPerMinute,
                              burstCapacity: r.burstCapacity,
                              corsEnabled: r.corsEnabled,
                              isActive: r.isActive,
                              timeoutMs: r.timeoutMs,
                              description: r.description || '',
                            });
                            setRouteModalOpen(true);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#334155',
                            color: '#f8fafc',
                            border: 'none',
                            borderRadius: '4px',
                            marginRight: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <span title="Edit" style={{ display: 'inline-flex' }}>
                            <Edit3 size={14} />
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(r.id, r.routePath)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef444420',
                            color: '#ef4444',
                            border: '1px solid #ef4444',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <span title="Delete" style={{ display: 'inline-flex' }}>
                            <Trash2 size={14} />
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Tenant Token Buckets */}
      {subTab === 'buckets' && (
        <div id="panel-gw-buckets">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search buckets by tenant name, ID, or route path..."
                value={bucketSearch}
                onChange={(e) => setBucketSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={throttledOnly}
                onChange={(e) => setThrottledOnly(e.target.checked)}
              />
              Show Only Throttled Tenants (429)
            </label>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Tenant</th>
                  <th style={{ padding: '12px 16px' }}>Route Target</th>
                  <th style={{ padding: '12px 16px' }}>Available Tokens</th>
                  <th style={{ padding: '12px 16px' }}>Refill Rate</th>
                  <th style={{ padding: '12px 16px' }}>Allowed / Throttled</th>
                  <th style={{ padding: '12px 16px' }}>Quota Status</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuckets.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No token bucket quotas match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBuckets.map((b) => {
                    const pct = Math.min(100, (b.availableTokens / b.maxCapacity) * 100);
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{b.tenantName || b.tenantId}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{b.tenantId}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>
                          {b.routePath || b.routeId}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', backgroundColor: '#334155', borderRadius: '3px', width: '80px' }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: pct > 30 ? '#22c55e' : '#ef4444',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                            <span style={{ fontWeight: 600 }}>{b.availableTokens} / {b.maxCapacity}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                          +{b.refillRatePerSec} tokens/sec
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: '#22c55e' }}>{b.totalRequestsAllowed}</span> / <span style={{ color: b.totalRequestsThrottled > 0 ? '#ef4444' : '#64748b' }}>{b.totalRequestsThrottled}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: b.isThrottled ? '#ef444420' : '#22c55e20',
                              color: b.isThrottled ? '#ef4444' : '#22c55e',
                            }}
                          >
                            {b.isThrottled ? 'Throttled (429)' : 'Healthy'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => setResetModalBucket(b)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#334155',
                              color: '#f8fafc',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <RotateCcw size={12} />
                            Reset
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Throttle Audit Logs */}
      {subTab === 'logs' && (
        <div id="panel-gw-logs">
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px' }}>Target Route</th>
                  <th style={{ padding: '12px 16px' }}>Tenant</th>
                  <th style={{ padding: '12px 16px' }}>Client IP</th>
                  <th style={{ padding: '12px 16px' }}>Remaining Tokens</th>
                  <th style={{ padding: '12px 16px' }}>Throttle Reason</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {throttleLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No 429 throttle events recorded. All tenant traffic operating within designated quotas.
                    </td>
                  </tr>
                ) : (
                  throttleLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#38bdf8' }}>
                        {log.routePath}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {log.tenantName || log.tenantId || 'Public Anonymous'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                        {log.clientIp}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 600 }}>
                        {log.remainingTokens}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: '13px' }}>
                        {log.throttleReason}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#ef444420',
                            color: '#ef4444',
                          }}
                        >
                          {log.httpStatus} Too Many Requests
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 4: Burst Simulator & Load Tester */}
      {subTab === 'simulator' && (
        <div id="panel-gw-simulator" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="#38bdf8" />
              Burst Load Injection Parameters
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Route Path</label>
              <select
                value={simForm.routePath}
                onChange={(e) => setSimForm({ ...simForm, routePath: e.target.value })}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.routePath}>
                    {r.routePath} ({r.requestsPerMinute} rpm / {r.burstCapacity} burst)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Simulated Concurrent Burst</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: simForm.simulateBurst > 50 ? '#ef4444' : '#38bdf8' }}>
                  {simForm.simulateBurst} requests
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={simForm.simulateBurst}
                onChange={(e) => setSimForm({ ...simForm, simulateBurst: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Token Cost per Call</span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{simForm.tokenCost} token(s)</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={simForm.tokenCost}
                onChange={(e) => setSimForm({ ...simForm, tokenCost: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <button
              onClick={runSimulation}
              disabled={simLoading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Zap size={16} />
              {simLoading ? 'Simulating Rate-Limiter...' : 'Inject Synthetic Burst Load'}
            </button>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="#22c55e" />
              Token Bucket Enforcement Verdict
            </h3>

            {simResult ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Gateway Verdict</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: simResult.allowed ? '#22c55e' : '#ef4444' }}>
                      {simResult.allowed ? '200 ALLOWED' : '429 THROTTLED'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {simResult.burstExhausted ? 'Burst limit exceeded' : 'Absorbed within ceiling'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Remaining Tokens</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>
                      {simResult.remainingTokens} / {simResult.maxCapacity}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Continuous proportional refill</div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Retry-After Penalty</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: simResult.retryAfterSeconds > 0 ? '#f97316' : '#22c55e' }}>
                      {simResult.retryAfterSeconds}s
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Until token bucket replenishment</div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Execution Latency</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>
                      {simResult.executionTimeMs}ms
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Algorithmic rate evaluation</div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: '#0f172a',
                    borderLeft: `4px solid ${simResult.allowed ? '#22c55e' : '#ef4444'}`,
                    borderRadius: '0 6px 6px 0',
                    fontSize: '13px',
                    color: '#cbd5e1',
                  }}
                >
                  {simResult.decisionReason}
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                Adjust parameters and run simulation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Deploy / Edit Route */}
      {routeModalOpen && (
        <div
          id="modal-deploy-route"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '500px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>
              {editingRoute ? 'Edit Gateway Route' : 'Deploy Global Gateway Route'}
            </h3>
            <form onSubmit={handleSaveRoute}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Route Path Pattern</label>
                <input
                  type="text"
                  value={routeForm.routePath}
                  onChange={(e) => setRouteForm({ ...routeForm, routePath: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', fontFamily: 'monospace' }}
                  placeholder="/api/v1/resource/*"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Microservice</label>
                  <select
                    value={routeForm.serviceName}
                    onChange={(e) => setRouteForm({ ...routeForm, serviceName: e.target.value })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  >
                    <option value="content_service">Content Service</option>
                    <option value="publishing_service">Publishing Service</option>
                    <option value="ai_agent_service">AI Agent Service</option>
                    <option value="analytics_service">Analytics Service</option>
                    <option value="webhook_service">Webhook Ingress</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rate Limit Tier</label>
                  <select
                    value={routeForm.rateLimitTier}
                    onChange={(e) => setRouteForm({ ...routeForm, rateLimitTier: e.target.value as GatewayRateLimitTier })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  >
                    <option value="standard">Standard</option>
                    <option value="high_throughput">High Throughput</option>
                    <option value="strict_burst">Strict Burst</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Requests / Minute</label>
                  <input
                    type="number"
                    min="1"
                    value={routeForm.requestsPerMinute}
                    onChange={(e) => setRouteForm({ ...routeForm, requestsPerMinute: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Burst Token Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={routeForm.burstCapacity}
                    onChange={(e) => setRouteForm({ ...routeForm, burstCapacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  value={routeForm.description || ''}
                  onChange={(e) => setRouteForm({ ...routeForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  placeholder="Purpose of this gateway route"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRouteModalOpen(false);
                    setEditingRoute(null);
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  {editingRoute ? 'Save Route' : 'Deploy Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Token Bucket */}
      {resetModalBucket && (
        <div
          id="modal-reset-bucket"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '450px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc' }}>Reset Token Bucket Quota</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to restore the token bucket for{' '}
              <strong style={{ color: '#f8fafc' }}>{resetModalBucket.tenantName || resetModalBucket.tenantId}</strong> on route{' '}
              <strong style={{ color: '#38bdf8' }}>{resetModalBucket.routePath || resetModalBucket.routeId}</strong>? Available tokens will be restored to maximum burst capacity ({resetModalBucket.maxCapacity}).
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setResetModalBucket(null)}
                style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetBucket}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Restore Capacity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Confirmation Modal */}
      <ConfirmDialogModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
