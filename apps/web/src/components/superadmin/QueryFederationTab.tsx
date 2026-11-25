/**
 * Enterprise Real-Time Query Federation, Distributed Read Replicas & CQRS Materialized Views Engine Tab
 * HoaspForge Platform v5.9.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Network,
  Database,
  Layers,
  Cpu,
  RefreshCw,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sliders,
  Clock,
  Search,
  Filter,
  BarChart2,
  GitBranch,
  ShieldCheck,
  RotateCcw,
  X,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  QueryFederationSource,
  ReadReplicaCluster,
  CqrsMaterializedView,
  MaterializedViewRefreshLog,
  QueryFederationTelemetry,
  FederationBenchmarkQueryType,
  FederationRoutingStrategy,
  CqrsRefreshMode,
  BenchmarkFederatedQueryResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'sources' | 'replicas' | 'views' | 'benchmark';

export const QueryFederationTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('sources');

  // Telemetry
  const [telemetry, setTelemetry] = useState<QueryFederationTelemetry | null>(null);

  // Sources
  const [sources, setSources] = useState<QueryFederationSource[]>([]);
  const [editingSource, setEditingSource] = useState<QueryFederationSource | null>(null);
  const [weightValue, setWeightValue] = useState<number>(100);

  // Replicas
  const [replicas, setReplicas] = useState<ReadReplicaCluster[]>([]);
  const [failoverTarget, setFailoverTarget] = useState<ReadReplicaCluster | null>(null);
  const [failoverReason, setFailoverReason] = useState<string>('Routine high-availability failover validation');

  // Materialized Views
  const [views, setViews] = useState<CqrsMaterializedView[]>([]);
  const [refreshTarget, setRefreshTarget] = useState<CqrsMaterializedView | null>(null);
  const [refreshMode, setRefreshMode] = useState<CqrsRefreshMode>('incremental');
  const [refreshLogs, setRefreshLogs] = useState<MaterializedViewRefreshLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Benchmark Sandbox
  const [benchmarkQueryType, setBenchmarkQueryType] = useState<FederationBenchmarkQueryType>('analytical_aggregate');
  const [benchmarkTargetTable, setBenchmarkTargetTable] = useState<string>('posts_analytics_rollup');
  const [benchmarkRoutingStrategy, setBenchmarkRoutingStrategy] = useState<FederationRoutingStrategy>('direct_olap');
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkFederatedQueryResult | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, srcRes, repRes, viewsRes, logsRes] = await Promise.all([
        api.adminOps.getQueryFederationTelemetry(),
        api.adminOps.listFederationSources(),
        api.adminOps.listReadReplicaClusters(),
        api.adminOps.listCqrsMaterializedViews(),
        api.adminOps.listMaterializedViewRefreshLogs({ limit: 25 }),
      ]);
      setTelemetry(telRes);
      setSources(srcRes);
      setReplicas(repRes);
      setViews(viewsRes);
      setRefreshLogs(logsRes);
    } catch (err: any) {
      showToast(`Failed to load query federation topology: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Update Weight
  const handleUpdateWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;
    try {
      await api.adminOps.updateFederationSourceWeight(editingSource.id, weightValue);
      showToast(`Read weight for '${editingSource.source_name}' updated to ${weightValue}`, 'success');
      setEditingSource(null);
      loadData();
    } catch (err: any) {
      showToast(`Failed to update weight: ${err.message}`, 'error');
    }
  };

  // Handle Failover Drill
  const handleFailoverDrill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failoverTarget) return;
    try {
      const res = await api.adminOps.failoverReadReplica(failoverTarget.id, {
        replica_id: failoverTarget.id,
        reason: failoverReason,
      });
      showToast(`Failover drill executed on ${res.cluster_name}: Role shifted to ${res.new_role} in ${res.failover_latency_ms}ms`, 'success');
      setFailoverTarget(null);
      loadData();
    } catch (err: any) {
      showToast(`Failover drill failed: ${err.message}`, 'error');
    }
  };

  // Handle View Refresh
  const handleRefreshView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refreshTarget) return;
    try {
      const res = await api.adminOps.refreshCqrsMaterializedView(refreshTarget.id, {
        refresh_mode: refreshMode,
      });
      showToast(`CQRS view '${res.view_name}' refreshed in ${res.duration_ms}ms (${res.rows_updated} rows)`, 'success');
      setRefreshTarget(null);
      loadData();
    } catch (err: any) {
      showToast(`Failed to refresh view: ${err.message}`, 'error');
    }
  };

  // Handle Run Benchmark
  const handleRunBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenchmarking(true);
    try {
      const res = await api.adminOps.benchmarkFederatedQuery({
        query_type: benchmarkQueryType,
        target_table: benchmarkTargetTable,
        routing_strategy: benchmarkRoutingStrategy,
      });
      setBenchmarkResult(res);
      showToast(`Federated benchmark complete: ${res.latency_ms}ms latency routed to ${res.routed_source_name}`, 'success');
    } catch (err: any) {
      showToast(`Benchmark execution failed: ${err.message}`, 'error');
    } finally {
      setBenchmarking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
            <span style={{ display: 'inline-flex', color: '#6366f1' }}>
              <Network size={26} />
            </span>
            Real-Time Query Federation & CQRS Engine
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Distributed Read-Write Split, Multi-Region Read Replicas, ClickHouse OLAP Federation & Sub-Second CQRS Materialized Views
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </span>
            Refresh Topology
          </button>
          <button
            onClick={() => setShowLogsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <Clock size={14} />
            </span>
            Refresh Logs ({refreshLogs.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Federation Sources */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Federation Sources
            </span>
            <span style={{ display: 'inline-flex', color: '#60a5fa' }}>
              <Database size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_federation_sources ?? '--'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>R/W Ratio: {telemetry?.read_write_split_ratio ?? '84:16'}</span>
            <span>• Primary + Replicas + OLAP</span>
          </div>
        </div>

        {/* KPI 2: Read Replicas & Lag */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Distributed Read Replicas
            </span>
            <span style={{ display: 'inline-flex', color: '#34d399' }}>
              <Server size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_read_replicas ?? '--'} Clusters
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>Avg Lag: {telemetry?.avg_replication_lag_ms ?? 0} ms</span>
            <span>• Multi-Region Quorum</span>
          </div>
        </div>

        {/* KPI 3: CQRS Materialized Views */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CQRS Rollup Views
            </span>
            <span style={{ display: 'inline-flex', color: '#a78bfa' }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.active_materialized_views ?? '--'} Active
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#a78bfa', fontWeight: 600 }}>Hit Rate: {telemetry?.cqrs_cache_hit_rate ?? 96.4}%</span>
            <span>• Sub-second rollups</span>
          </div>
        </div>

        {/* KPI 4: Federation Status */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Mesh Health Status
            </span>
            <span style={{ display: 'inline-flex', color: telemetry?.status === 'optimal' ? '#34d399' : '#fbbf24' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: telemetry?.status === 'optimal' ? '#34d399' : '#fbbf24', marginTop: '0.5rem', textTransform: 'uppercase' }}>
            {telemetry?.status ?? 'Optimal'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span>Lag-aware routing • Zero read stalls</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        {[
          { id: 'sources', label: 'Federation Topology & Routing', icon: Network },
          { id: 'replicas', label: 'Read Replica Clusters & Lag', icon: Server },
          { id: 'views', label: 'CQRS Materialized Views', icon: Layers },
          { id: 'benchmark', label: 'Query Routing Benchmark Sandbox', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as SubTab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1rem',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#f8fafc' : '#94a3b8',
                background: isActive ? '#334155' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'inline-flex' }}>
                <Icon size={16} />
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab 1: Federation Topology & Routing */}
      {subTab === 'sources' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                Configured Federation Data Sources & Weight Engine
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Adaptive load-balancing with weighted round-robin and lag-circuit cutoffs
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Source Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Read Weight</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Replication Lag</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Max QPS</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => {
                    const typeBadgeColors: Record<string, { bg: string; text: string }> = {
                      mysql_primary: { bg: '#831843', text: '#f472b6' },
                      mysql_replica: { bg: '#064e3b', text: '#34d399' },
                      clickhouse_olap: { bg: '#4c1d95', text: '#c084fc' },
                      redis_cache: { bg: '#1e3a8a', text: '#60a5fa' },
                    };
                    const badge = typeBadgeColors[s.source_type] || { bg: '#334155', text: '#cbd5e1' };

                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{s.source_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {s.connection_uri.replace(/:[^:]*@/, ':***@')}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.text,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                            }}
                          >
                            {s.source_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{s.read_weight}</span>
                            <div style={{ width: '80px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, (s.read_weight / 200) * 100)}%`,
                                  height: '100%',
                                  background: '#6366f1',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ color: s.replication_lag_ms <= 10 ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                            {s.replication_lag_ms} ms
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                          {s.max_qps.toLocaleString()} QPS
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: s.status === 'online' ? '#34d399' : '#f87171',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                            }}
                          >
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                background: s.status === 'online' ? '#34d399' : '#f87171',
                              }}
                            />
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setEditingSource(s);
                              setWeightValue(s.read_weight);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#334155',
                              color: '#f8fafc',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.775rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ display: 'inline-flex' }}>
                              <Sliders size={13} />
                            </span>
                            Adjust Weight
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Read Replica Clusters & Lag */}
      {subTab === 'replicas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
          {replicas.map((rep) => (
            <div
              key={rep.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{rep.cluster_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Region: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{rep.region}</span>
                  </div>
                </div>
                <span
                  style={{
                    background: rep.replica_role === 'standby_failover' ? '#831843' : '#064e3b',
                    color: rep.replica_role === 'standby_failover' ? '#f472b6' : '#34d399',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {rep.replica_role}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Endpoint Host</div>
                  <div style={{ fontSize: '0.825rem', fontFamily: 'monospace', color: '#cbd5e1', marginTop: '0.15rem' }}>
                    {rep.host}:{rep.port}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Replication Lag</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: rep.current_lag_ms <= 10 ? '#34d399' : '#fbbf24', marginTop: '0.15rem' }}>
                    {rep.current_lag_ms} ms
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Queries Served</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.15rem' }}>
                    {rep.total_queries_served.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Node Health</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: rep.healthy ? '#34d399' : '#f87171', marginTop: '0.15rem' }}>
                    {rep.healthy ? 'Heartbeat Active' : 'Unresponsive'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setFailoverTarget(rep);
                    setFailoverReason('Routine high-availability failover validation');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: '#0f172a',
                    color: '#f59e0b',
                    border: '1px solid #d97706',
                    borderRadius: '5px',
                    padding: '0.45rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}>
                    <RotateCcw size={13} />
                  </span>
                  Execute Failover Drill
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab 3: CQRS Materialized Views */}
      {subTab === 'views' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
            {views.map((v) => (
              <div
                key={v.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.975rem', color: '#f8fafc' }}>{v.view_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#818cf8', marginTop: '0.2rem', fontWeight: 600 }}>
                      Target Entity: {v.target_entity}
                    </div>
                  </div>
                  <span
                    style={{
                      background: v.status === 'active' ? '#064e3b' : '#7c2d12',
                      color: v.status === 'active' ? '#34d399' : '#fdba74',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {v.status}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.4rem' }}>Source Tables</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {v.source_tables.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: '#0f172a',
                          color: '#94a3b8',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rollup Rows</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>
                      {v.row_count.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Refresh Duration</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a78bfa', marginTop: '0.15rem' }}>
                      {v.refresh_duration_ms} ms
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Refresh Mode</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.15rem', textTransform: 'capitalize' }}>
                      {v.refresh_mode} ({v.refresh_cron})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last Refresh</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      {v.last_refreshed_at ? new Date(v.last_refreshed_at).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setRefreshTarget(v);
                      setRefreshMode(v.refresh_mode);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex' }}>
                      <RefreshCw size={13} />
                    </span>
                    Trigger Refresh
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 4: Query Routing Benchmark Sandbox */}
      {subTab === 'benchmark' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
          {/* Controls Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', color: '#fbbf24' }}>
                <Zap size={18} />
              </span>
              Federated Query Routing Simulation Sandbox
            </h3>

            <form onSubmit={handleRunBenchmark} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Workload / Query Pattern
                </label>
                <select
                  value={benchmarkQueryType}
                  onChange={(e) => setBenchmarkQueryType(e.target.value as FederationBenchmarkQueryType)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="analytical_aggregate">Analytical Rollup & Engagement Aggregation (Multi-million rows)</option>
                  <option value="timeseries_range">Timeseries Metric Range Query (90-day interval)</option>
                  <option value="point_lookup">Point Key Lookup (High QPS tenant metadata)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Target Table / Entity
                </label>
                <select
                  value={benchmarkTargetTable}
                  onChange={(e) => setBenchmarkTargetTable(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="posts_analytics_rollup">mv_posts_realtime_engagement_rollup</option>
                  <option value="campaign_roi_summary">mv_campaign_multiplatform_roi_summary</option>
                  <option value="tenant_spend_daily">mv_tenant_daily_spend_and_quota_consumption</option>
                  <option value="social_webhook_deliveries">social_webhook_deliveries</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Routing Engine Strategy
                </label>
                <select
                  value={benchmarkRoutingStrategy}
                  onChange={(e) => setBenchmarkRoutingStrategy(e.target.value as FederationRoutingStrategy)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="direct_olap">Direct OLAP Engine (ClickHouse Vectorized Columnar Engine)</option>
                  <option value="least_lag">Least-Lag Aware (Dynamically Route to Lowest Latency Replica)</option>
                  <option value="round_robin">Weighted Round-Robin (Balance Across Region Read Pool)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={benchmarking}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  background: '#6366f1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.65rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: benchmarking ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <Play size={15} />
                </span>
                {benchmarking ? 'Routing Query...' : 'Execute Benchmark'}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
                <Activity size={18} />
              </span>
              Execution Telemetry & Plan
            </h3>

            {benchmarkResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Routed Target Node</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>
                      {benchmarkResult.routed_source_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem', textTransform: 'uppercase' }}>
                      {benchmarkResult.source_type}
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Round-Trip Latency</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
                      {benchmarkResult.latency_ms} ms
                    </div>
                    <div style={{ fontSize: '0.75rem', color: benchmarkResult.cached ? '#a78bfa' : '#94a3b8', marginTop: '0.1rem' }}>
                      {benchmarkResult.cached ? 'L2 Query Cache Hit' : 'Physical Storage Scan'}
                    </div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rows Scanned</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>
                    {benchmarkResult.rows_scanned.toLocaleString()} rows
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem' }}>Query Optimizer Execution Plan</div>
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '0.775rem',
                      color: '#a5f3fc',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.4',
                    }}
                  >
                    {benchmarkResult.execution_plan}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', padding: '2rem' }}>
                <span style={{ display: 'inline-flex', marginBottom: '0.5rem', opacity: 0.5 }}>
                  <Zap size={32} />
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Select a workload and strategy, then execute the benchmark to inspect routing latency.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Adjust Read Weight */}
      {editingSource && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>Adjust Read Weight</div>
              <button
                onClick={() => setEditingSource(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Target: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{editingSource.source_name}</span>
            </div>

            <form onSubmit={handleUpdateWeight} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Read Weight (0 = Muted / Standby, 100 = Baseline, 200 = High Preference)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={weightValue}
                  onChange={(e) => setWeightValue(parseInt(e.target.value, 10) || 0)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingSource(null)}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Read Weight
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Failover Drill */}
      {failoverTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '480px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>Execute Failover Drill</div>
              <button
                onClick={() => setFailoverTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Cluster: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{failoverTarget.cluster_name}</span> ({failoverTarget.region})
            </div>

            <form onSubmit={handleFailoverDrill} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Failover Drill Reason & Justification
                </label>
                <input
                  type="text"
                  value={failoverReason}
                  onChange={(e) => setFailoverReason(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setFailoverTarget(null)}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Failover Drill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Refresh View */}
      {refreshTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>Refresh Materialized View</div>
              <button
                onClick={() => setRefreshTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              View: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{refreshTarget.view_name}</span>
            </div>

            <form onSubmit={handleRefreshView} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Refresh Mode
                </label>
                <select
                  value={refreshMode}
                  onChange={(e) => setRefreshMode(e.target.value as CqrsRefreshMode)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="incremental">Incremental Refresh (Only delta changes since last sync)</option>
                  <option value="full">Full Recompute (Complete table recalculation)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRefreshTarget(null)}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Execute Refresh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Refresh Logs Drawer */}
      {showLogsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '80vh',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>CQRS View Refresh Audit Logs</div>
              <button
                onClick={() => setShowLogsModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '0.65rem 0.85rem' }}>View Name</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Mode</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Rows Updated</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Duration</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Status</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Executed At</th>
                  </tr>
                </thead>
                <tbody>
                  {refreshLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#f8fafc' }}>{log.view_name}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textTransform: 'capitalize', color: '#cbd5e1' }}>{log.refresh_mode}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#f8fafc' }}>{log.rows_updated.toLocaleString()}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#a78bfa' }}>{log.duration_ms} ms</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ color: log.status === 'success' ? '#34d399' : '#f87171', fontWeight: 600 }}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#94a3b8' }}>
                        {new Date(log.executed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
