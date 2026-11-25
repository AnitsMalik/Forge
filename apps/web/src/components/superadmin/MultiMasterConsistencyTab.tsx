/**
 * Enterprise Cross-Region Active-Active Multi-Master Conflict Resolution & Global Distributed Consistency Engine Tab
 * HoaspForge Platform v6.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe,
  Database,
  Layers,
  Zap,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Clock,
  X,
  GitMerge,
  Cpu,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  MultiMasterNode,
  VectorClockState,
  ConflictResolutionPolicy,
  DistributedConvergenceLog,
  MultiMasterTelemetry,
  ConflictResolutionStrategy,
  SimulateConflictRaceResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'nodes' | 'clocks' | 'policies' | 'simulator';

export const MultiMasterConsistencyTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('nodes');

  // Telemetry
  const [telemetry, setTelemetry] = useState<MultiMasterTelemetry | null>(null);

  // Nodes & Fencing
  const [nodes, setNodes] = useState<MultiMasterNode[]>([]);
  const [fencingTarget, setFencingTarget] = useState<MultiMasterNode | null>(null);
  const [fencingReason, setFencingReason] = useState('Routine network partition isolation drill');

  // Vector Clocks
  const [vectorClocks, setVectorClocks] = useState<VectorClockState[]>([]);
  const [filterEntityType, setFilterEntityType] = useState<string>('all');

  // Policies
  const [policies, setPolicies] = useState<ConflictResolutionPolicy[]>([]);
  const [editingPolicy, setEditingPolicy] = useState<ConflictResolutionPolicy | null>(null);
  const [policyStrategy, setPolicyStrategy] = useState<ConflictResolutionStrategy>('lww_timestamp');
  const [policyTieBreaker, setPolicyTieBreaker] = useState('us-east-1');
  const [policyAutoResolve, setPolicyAutoResolve] = useState(true);

  // Convergence Logs & Simulator
  const [logs, setLogs] = useState<DistributedConvergenceLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Race Simulator Form
  const [simEntityType, setSimEntityType] = useState('campaign_schedule');
  const [simEntityId, setSimEntityId] = useState('camp-summer-launch-2026');
  const [simRegionA, setSimRegionA] = useState('us-east-1');
  const [simPayloadA, setSimPayloadA] = useState('{"publish_at": "2026-07-01T14:00:00Z", "status": "scheduled"}');
  const [simTimestampA, setSimTimestampA] = useState('2026-06-30T12:00:00.120Z');
  const [simRegionB, setSimRegionB] = useState('eu-west-1');
  const [simPayloadB, setSimPayloadB] = useState('{"publish_at": "2026-07-01T15:00:00Z", "status": "scheduled"}');
  const [simTimestampB, setSimTimestampB] = useState('2026-06-30T12:00:00.340Z');
  const [simStrategy, setSimStrategy] = useState<ConflictResolutionStrategy>('lww_timestamp');
  const [simResult, setSimResult] = useState<SimulateConflictRaceResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, nodesRes, clocksRes, policiesRes, logsRes] = await Promise.all([
        api.adminOps.getMultiMasterTelemetry(),
        api.adminOps.listMultiMasterNodes(),
        api.adminOps.listVectorClocks(filterEntityType === 'all' ? undefined : filterEntityType),
        api.adminOps.listConflictResolutionPolicies(),
        api.adminOps.listDistributedConvergenceLogs(30),
      ]);
      setTelemetry(telRes);
      setNodes(nodesRes);
      setVectorClocks(clocksRes);
      setPolicies(policiesRes);
      setLogs(logsRes);
    } catch (err: any) {
      showToast(`Failed to load multi-master consistency topology: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterEntityType, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Quorum Fence Toggle
  const handleToggleFencing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fencingTarget) return;
    const nextFencedState = !fencingTarget.is_fenced;
    try {
      await api.adminOps.updateMultiMasterFencing(fencingTarget.id, {
        is_fenced: nextFencedState,
        reason: fencingReason,
      });
      showToast(
        `Quorum fence ${nextFencedState ? 'isolated' : 'restored'} on ${fencingTarget.node_name}`,
        'success'
      );
      setFencingTarget(null);
      loadData();
    } catch (err: any) {
      showToast(`Failed to update quorum fence: ${err.message}`, 'error');
    }
  };

  // Handle Policy Edit
  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      await api.adminOps.updateConflictResolutionPolicy(editingPolicy.id, {
        resolution_strategy: policyStrategy,
        tie_breaker_region: policyTieBreaker,
        auto_resolve: policyAutoResolve,
      });
      showToast(`Conflict resolution policy '${editingPolicy.policy_name}' updated`, 'success');
      setEditingPolicy(null);
      loadData();
    } catch (err: any) {
      showToast(`Failed to update policy: ${err.message}`, 'error');
    }
  };

  // Handle Race Simulation
  const handleSimulateRace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      let parsedA = {};
      let parsedB = {};
      try {
        parsedA = JSON.parse(simPayloadA);
      } catch {
        parsedA = { raw: simPayloadA };
      }
      try {
        parsedB = JSON.parse(simPayloadB);
      } catch {
        parsedB = { raw: simPayloadB };
      }

      const res = await api.adminOps.simulateConflictRace({
        entity_type: simEntityType,
        entity_id: simEntityId,
        region_a: simRegionA,
        payload_a: parsedA,
        timestamp_a: simTimestampA,
        region_b: simRegionB,
        payload_b: parsedB,
        timestamp_b: simTimestampB,
        strategy_override: simStrategy,
      });
      setSimResult(res);
      showToast(
        `Race resolved in ${res.convergence_latency_ms}ms via ${res.strategy_applied}: Winning region '${res.winning_region}'`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(`Conflict simulation failed: ${err.message}`, 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc' }}>
            <span style={{ display: 'inline-flex', color: '#ec4899' }}>
              <Globe size={26} />
            </span>
            Active-Active Multi-Master Conflict Resolution & Consistency Engine
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
            Cross-Region Vector Clocks, CRDT Commutative Merges, LWW Deterministic Tie-Breaking & Split-Brain Quorum Fencing
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
            }}
          >
            <span style={{ display: 'inline-flex' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </span>
            Refresh Mesh
          </button>
          <button
            onClick={() => setShowLogsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#0f172a',
              color: '#f472b6',
              border: '1px solid #db2777',
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
            Convergence Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Active Multi-Master Clusters */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Multi-Master Clusters
            </span>
            <span style={{ display: 'inline-flex', color: '#ec4899' }}>
              <Globe size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_active_nodes ?? '--'} Nodes
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: telemetry?.fenced_nodes === 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {telemetry?.fenced_nodes ?? 0} Fenced
            </span>
            <span>• Multi-Region Active-Active</span>
          </div>
        </div>

        {/* KPI 2: Quorum Health */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quorum Health & Consensus
            </span>
            <span style={{ display: 'inline-flex', color: '#34d399' }}>
              <ShieldCheck size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.quorum_health_percent ?? 100}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#38bdf8', fontWeight: 600, textTransform: 'capitalize' }}>
              {telemetry?.mesh_consistency_state.replace('_', ' ') ?? 'Strict Quorum'}
            </span>
            <span>• Weighted votes</span>
          </div>
        </div>

        {/* KPI 3: Vector Clock Managed Entities */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vector Clock Ledgers
            </span>
            <span style={{ display: 'inline-flex', color: '#818cf8' }}>
              <Layers size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.total_vector_clock_entities ?? '--'} Tracked
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span>Causal history & concurrency tags</span>
          </div>
        </div>

        {/* KPI 4: Conflict Resolution Rate & Latency */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              24h Conflicts Resolved
            </span>
            <span style={{ display: 'inline-flex', color: '#fbbf24' }}>
              <GitMerge size={18} />
            </span>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {telemetry?.conflicts_resolved_24h ?? '--'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
            <span style={{ color: '#34d399', fontWeight: 600 }}>Avg {telemetry?.avg_convergence_latency_ms ?? 0} ms</span>
            <span>• Zero human triage stalls</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
        {[
          { id: 'nodes', label: 'Active-Active Node Topology & Quorum Fencing', icon: Server },
          { id: 'clocks', label: 'Vector Clock Causality Matrix', icon: Layers },
          { id: 'policies', label: 'Conflict Resolution Policies', icon: Sliders },
          { id: 'simulator', label: 'Write Race Simulator & Convergence Logs', icon: Zap },
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

      {/* Sub-tab 1: Nodes & Quorum Fencing */}
      {subTab === 'nodes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
          {nodes.map((node) => (
            <div
              key={node.id}
              style={{
                background: '#1e293b',
                border: node.is_fenced ? '1px solid #ef4444' : '1px solid #334155',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{node.node_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Region: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{node.region}</span>
                  </div>
                </div>
                <span
                  style={{
                    background: node.is_fenced ? '#7f1d1d' : '#064e3b',
                    color: node.is_fenced ? '#fca5a5' : '#34d399',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {node.sync_status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>RPC Endpoint</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1', marginTop: '0.15rem', wordBreak: 'break-all' }}>
                    {node.endpoint_url}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quorum Weight</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>
                    {node.quorum_weight} votes
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Write Capacity</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginTop: '0.15rem' }}>
                    {node.write_capacity_qps.toLocaleString()} QPS
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Vector Clock Tick</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#a78bfa', marginTop: '0.15rem' }}>
                    v{node.vector_clock_version}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setFencingTarget(node);
                    setFencingReason(
                      node.is_fenced
                        ? 'Restoring node to live active-active consensus quorum'
                        : 'Routine network partition isolation drill'
                    );
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: node.is_fenced ? '#064e3b' : '#7f1d1d',
                    color: node.is_fenced ? '#34d399' : '#fca5a5',
                    border: 'none',
                    borderRadius: '5px',
                    padding: '0.45rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}>
                    {node.is_fenced ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  </span>
                  {node.is_fenced ? 'Lift Quorum Fence' : 'Isolate / Fence Node'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tab 2: Vector Clocks */}
      {subTab === 'clocks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                Distributed Vector Clocks Registry
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Filter Entity:</span>
                <select
                  value={filterEntityType}
                  onChange={(e) => setFilterEntityType(e.target.value)}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.6rem',
                  }}
                >
                  <option value="all">All Entities</option>
                  <option value="campaign_schedule">campaign_schedule</option>
                  <option value="post_variant_content">post_variant_content</option>
                  <option value="tenant_quota_counter">tenant_quota_counter</option>
                  <option value="permission_grant">permission_grant</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Entity Type & ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Regional Vector Clocks</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Causal State</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Write</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {vectorClocks.map((vc) => (
                    <tr key={vc.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{vc.entity_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {vc.entity_id}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {Object.entries(vc.region_clocks).map(([region, tick]) => (
                            <span
                              key={region}
                              style={{
                                background: '#0f172a',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0.15rem 0.45rem',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                color: '#38bdf8',
                              }}
                            >
                              {region}: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{tick}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            background: vc.causal_state === 'ordered' ? '#064e3b' : '#7c2d12',
                            color: vc.causal_state === 'ordered' ? '#34d399' : '#fdba74',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}
                        >
                          {vc.causal_state}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                        {vc.last_write_timestamp ? new Date(vc.last_write_timestamp).toLocaleTimeString() : 'Never'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                        {vc.last_updated_at ? new Date(vc.last_updated_at).toLocaleTimeString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Conflict Resolution Policies */}
      {subTab === 'policies' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem' }}>
          {policies.map((pol) => {
            const strategyColors: Record<string, { bg: string; text: string }> = {
              lww_timestamp: { bg: '#1e3a8a', text: '#60a5fa' },
              crdt_pn_counter: { bg: '#064e3b', text: '#34d399' },
              crdt_or_set: { bg: '#4c1d95', text: '#c084fc' },
              highest_priority_region: { bg: '#831843', text: '#f472b6' },
              manual_operator_triage: { bg: '#7c2d12', text: '#fdba74' },
            };
            const badge = strategyColors[pol.resolution_strategy] || { bg: '#334155', text: '#cbd5e1' };

            return (
              <div
                key={pol.id}
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
                    <div style={{ fontWeight: 700, fontSize: '0.975rem', color: '#f8fafc' }}>{pol.policy_name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#818cf8', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                      Target: {pol.entity_type}
                    </div>
                  </div>
                  <span
                    style={{
                      background: pol.is_active ? '#064e3b' : '#334155',
                      color: pol.is_active ? '#34d399' : '#94a3b8',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {pol.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: '#0f172a', padding: '0.75rem', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Resolution Strategy</div>
                    <span
                      style={{
                        display: 'inline-block',
                        background: badge.bg,
                        color: badge.text,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginTop: '0.25rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {pol.resolution_strategy.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tie-Breaker Region</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>
                      {pol.tie_breaker_region}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Auto-Resolution</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: pol.auto_resolve ? '#34d399' : '#fbbf24', marginTop: '0.15rem' }}>
                      {pol.auto_resolve ? 'Automated' : 'Manual Triage'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Last Updated</div>
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                      {pol.updated_at ? new Date(pol.updated_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setEditingPolicy(pol);
                      setPolicyStrategy(pol.resolution_strategy);
                      setPolicyTieBreaker(pol.tie_breaker_region);
                      setPolicyAutoResolve(pol.auto_resolve);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#334155',
                      color: '#f8fafc',
                      border: 'none',
                      borderRadius: '5px',
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'inline-flex' }}>
                      <Sliders size={13} />
                    </span>
                    Modify Strategy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-tab 4: Write Race Simulator */}
      {subTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
          {/* Controls Form */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', color: '#ec4899' }}>
                <Zap size={18} />
              </span>
              Cross-Region Concurrent Write Race Sandbox
            </h3>

            <form onSubmit={handleSimulateRace} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Entity Target Type
                  </label>
                  <select
                    value={simEntityType}
                    onChange={(e) => setSimEntityType(e.target.value)}
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
                    <option value="campaign_schedule">campaign_schedule</option>
                    <option value="post_variant_content">post_variant_content</option>
                    <option value="tenant_quota_counter">tenant_quota_counter</option>
                    <option value="permission_grant">permission_grant</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Entity Identifier
                  </label>
                  <input
                    type="text"
                    value={simEntityId}
                    onChange={(e) => setSimEntityId(e.target.value)}
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
              </div>

              {/* Node A */}
              <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>Region A (Write Node)</span>
                  <select
                    value={simRegionA}
                    onChange={(e) => setSimRegionA(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.75rem', borderRadius: '4px', padding: '0.2rem' }}
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={simPayloadA}
                  onChange={(e) => setSimPayloadA(e.target.value)}
                  placeholder="JSON Payload A"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#f8fafc', fontSize: '0.75rem', fontFamily: 'monospace' }}
                />
                <input
                  type="text"
                  value={simTimestampA}
                  onChange={(e) => setSimTimestampA(e.target.value)}
                  placeholder="Timestamp A"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#cbd5e1', fontSize: '0.75rem' }}
                />
              </div>

              {/* Node B */}
              <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ec4899' }}>Region B (Concurrent Node)</span>
                  <select
                    value={simRegionB}
                    onChange={(e) => setSimRegionB(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.75rem', borderRadius: '4px', padding: '0.2rem' }}
                  >
                    <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={simPayloadB}
                  onChange={(e) => setSimPayloadB(e.target.value)}
                  placeholder="JSON Payload B"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#f8fafc', fontSize: '0.75rem', fontFamily: 'monospace' }}
                />
                <input
                  type="text"
                  value={simTimestampB}
                  onChange={(e) => setSimTimestampB(e.target.value)}
                  placeholder="Timestamp B"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.4rem', color: '#cbd5e1', fontSize: '0.75rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Resolution Strategy Override
                </label>
                <select
                  value={simStrategy}
                  onChange={(e) => setSimStrategy(e.target.value as ConflictResolutionStrategy)}
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
                  <option value="lww_timestamp">Last-Write-Wins (Timestamp with Priority Tie-Breaker)</option>
                  <option value="crdt_pn_counter">CRDT PN-Counter (Additive Commutative Merge)</option>
                  <option value="crdt_or_set">CRDT OR-Set (Observed-Remove Field Union)</option>
                  <option value="highest_priority_region">Highest Priority Region (Regional Quorum Weight)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={simulating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  background: '#ec4899',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.65rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: simulating ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ display: 'inline-flex' }}>
                  <Play size={15} />
                </span>
                {simulating ? 'Resolving Conflict...' : 'Execute Race Simulation'}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', color: '#38bdf8' }}>
                <Activity size={18} />
              </span>
              Convergence Result & Winning Payload
            </h3>

            {simResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Winning Region / State</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
                      {simResult.winning_region}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem', textTransform: 'uppercase' }}>
                      Strategy: {simResult.strategy_applied}
                    </div>
                  </div>

                  <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Convergence Latency</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f472b6', marginTop: '0.2rem' }}>
                      {simResult.convergence_latency_ms} ms
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.1rem' }}>
                      {simResult.quorum_nodes_agreed} Quorum Nodes Agreed
                    </div>
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Convergence Summary</div>
                  <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                    {simResult.resolution_summary}
                  </div>
                </div>

                <div style={{ background: '#0f172a', padding: '0.85rem', borderRadius: '6px', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.35rem' }}>Winning / Merged Payload</div>
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
                    {JSON.stringify(simResult.winning_payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#64748b', padding: '2rem' }}>
                <span style={{ display: 'inline-flex', marginBottom: '0.5rem', opacity: 0.5 }}>
                  <Zap size={32} />
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Define concurrent regional write parameters and execute simulation to view live convergence.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Toggle Quorum Fence */}
      {fencingTarget && (
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
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>
                {fencingTarget.is_fenced ? 'Lift Quorum Fencing' : 'Enforce Quorum Fencing'}
              </div>
              <button
                onClick={() => setFencingTarget(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Node: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{fencingTarget.node_name}</span> ({fencingTarget.region})
            </div>

            <form onSubmit={handleToggleFencing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Operator Justification / Reason
                </label>
                <input
                  type="text"
                  value={fencingReason}
                  onChange={(e) => setFencingReason(e.target.value)}
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
                  onClick={() => setFencingTarget(null)}
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
                    background: fencingTarget.is_fenced ? '#064e3b' : '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Confirm {fencingTarget.is_fenced ? 'Lift Fence' : 'Isolate Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Resolution Policy */}
      {editingPolicy && (
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
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>
                Edit Conflict Resolution Strategy
              </div>
              <button
                onClick={() => setEditingPolicy(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Policy: <span style={{ fontWeight: 600, color: '#f8fafc' }}>{editingPolicy.policy_name}</span> ({editingPolicy.entity_type})
            </div>

            <form onSubmit={handleUpdatePolicy} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Resolution Strategy
                </label>
                <select
                  value={policyStrategy}
                  onChange={(e) => setPolicyStrategy(e.target.value as ConflictResolutionStrategy)}
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
                  <option value="lww_timestamp">Last-Write-Wins (LWW Timestamp)</option>
                  <option value="crdt_pn_counter">CRDT PN-Counter (Additive Commutative Merge)</option>
                  <option value="crdt_or_set">CRDT OR-Set (Observed-Remove Field Union)</option>
                  <option value="highest_priority_region">Highest Priority Region (Regional Quorum Weight)</option>
                  <option value="manual_operator_triage">Manual Operator Triage</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Deterministic Tie-Breaker Region
                </label>
                <select
                  value={policyTieBreaker}
                  onChange={(e) => setPolicyTieBreaker(e.target.value)}
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
                  <option value="us-east-1">us-east-1 (N. Virginia)</option>
                  <option value="us-west-2">us-west-2 (Oregon)</option>
                  <option value="eu-west-1">eu-west-1 (Ireland)</option>
                  <option value="ap-south-1">ap-south-1 (Mumbai)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="autoResolveCheckbox"
                  checked={policyAutoResolve}
                  onChange={(e) => setPolicyAutoResolve(e.target.checked)}
                />
                <label htmlFor="autoResolveCheckbox" style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                  Enable automatic background conflict resolution
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
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
                    background: '#ec4899',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Strategy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convergence Logs Drawer */}
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
              maxWidth: '850px',
              maxHeight: '80vh',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.1rem' }}>
                Distributed Convergence & Resolution Audit Logs
              </div>
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
                    <th style={{ padding: '0.65rem 0.85rem' }}>Conflict ID</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Entity</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Conflicting Regions</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Winner</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Strategy</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Latency</th>
                    <th style={{ padding: '0.65rem 0.85rem' }}>Resolved At</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontFamily: 'monospace', color: '#cbd5e1' }}>{log.conflict_id}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: '#f8fafc' }}>{log.entity_type}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#ec4899' }}>{log.conflicting_regions.join(' vs ')}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#34d399', fontWeight: 600 }}>{log.winning_region}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textTransform: 'uppercase', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {log.strategy_applied.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#f472b6' }}>{log.resolution_latency_ms} ms</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b' }}>
                        {new Date(log.resolved_at).toLocaleTimeString()}
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
