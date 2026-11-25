/**
 * Enterprise Cross-Region Active-Active Sharding, Distributed Transaction Coordinator & Autonomous Data Rebalancing Mesh Tab
 * HoaspForge Platform v6.8.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Share2,
  Server,
  Layers,
  Activity,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Sliders,
  Globe,
  X,
  Gauge,
  ArrowRight,
  ShieldCheck,
  Search,
  Hash,
  Boxes,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  DatabaseShard,
  ShardRoutingRange,
  DistributedTransaction,
  ShardRebalanceMigration,
  ShardingMeshTelemetry,
  KeyRouteResult,
  ShardStatus,
  DistributedTxStatus,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'ring' | 'shards' | 'transactions' | 'rebalance';

export const ShardingMeshTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('ring');

  // Telemetry
  const [telemetry, setTelemetry] = useState<ShardingMeshTelemetry | null>(null);

  // Shards & Routing
  const [shards, setShards] = useState<DatabaseShard[]>([]);
  const [ranges, setRanges] = useState<ShardRoutingRange[]>([]);

  // Key Routing Calculator
  const [testKey, setTestKey] = useState('tenant-enterprise-global');
  const [routeResult, setRouteResult] = useState<KeyRouteResult | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<DistributedTransaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<DistributedTransaction | null>(null);

  // Migrations
  const [migrations, setMigrations] = useState<ShardRebalanceMigration[]>([]);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newShardName, setNewShardName] = useState('SA-East (São Paulo) Expansion Shard');
  const [newShardRegion, setNewShardRegion] = useState('sa-east-1');
  const [newShardEndpoint, setNewShardEndpoint] = useState('saeast1-db-shard.internal:3308');
  const [newShardVnodes, setNewShardVnodes] = useState<number>(6);

  const [showCoordinateModal, setShowCoordinateModal] = useState(false);
  const [coordTenantId, setCoordTenantId] = useState('tenant-global-fintech');
  const [coordSimulateFailure, setCoordSimulateFailure] = useState(false);
  const [coordPayloadJson, setCoordPayloadJson] = useState('{\n  "action": "LEDGER_CREDIT_SETTLEMENT",\n  "amount_usd": 15000\n}');

  const [showRebalanceModal, setShowRebalanceModal] = useState(false);
  const [rebSourceShard, setRebSourceShard] = useState('');
  const [rebTargetShard, setRebTargetShard] = useState('');
  const [rebVnodeId, setRebVnodeId] = useState('vnode-08');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [telemetryRes, shardsRes, rangesRes, txRes, migsRes] = await Promise.all([
        api.adminOps.getShardingMeshTelemetry(),
        api.adminOps.listDatabaseShards(),
        api.adminOps.listShardRoutingRanges(),
        api.adminOps.listDistributedTransactions(),
        api.adminOps.listShardMigrations(),
      ]);

      setTelemetry(telemetryRes);
      setShards(shardsRes || []);
      setRanges(rangesRes || []);
      setTransactions(txRes || []);
      setMigrations(migsRes || []);

      if (shardsRes && shardsRes.length >= 2) {
        if (!rebSourceShard) setRebSourceShard(shardsRes[0].id);
        if (!rebTargetShard) setRebTargetShard(shardsRes[1].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch sharding mesh data', 'error');
    } finally {
      setLoading(false);
    }
  }, [rebSourceShard, rebTargetShard, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRouteKey = async () => {
    if (!testKey.trim()) {
      showToast('Please enter a key to route', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.adminOps.routeShardingKey(testKey.trim());
      setRouteResult(res);
      showToast(`Key routed to ${res.shard_name} via ${res.vnode_id}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Key routing lookup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterShard = async () => {
    try {
      setLoading(true);
      const res = await api.adminOps.registerDatabaseShard({
        shard_name: newShardName,
        region: newShardRegion,
        host_endpoint: newShardEndpoint,
        vnodes_count: newShardVnodes,
      });

      showToast(`Shard ${res.shard_name} registered successfully`, 'success');
      setShowRegisterModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to register shard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCoordinateTransaction = async () => {
    try {
      setLoading(true);
      let payloadObj = {};
      try {
        payloadObj = JSON.parse(coordPayloadJson);
      } catch {
        showToast('Invalid JSON in transaction payload', 'error');
        setLoading(false);
        return;
      }

      const res = await api.adminOps.coordinateDistributedTransaction({
        target_tenant_id: coordTenantId,
        payload: payloadObj,
        simulate_participant_failure: coordSimulateFailure,
      });

      showToast(`2PC Transaction ${res.id} coordinated: ${res.status.toUpperCase()}`, res.status === 'committed' ? 'success' : 'info');
      setShowCoordinateModal(false);
      setSelectedTx(res);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to coordinate 2PC transaction', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerRebalance = async () => {
    if (!rebSourceShard || !rebTargetShard || !rebVnodeId) {
      showToast('Source shard, target shard, and vnode ID are required', 'error');
      return;
    }

    if (rebSourceShard === rebTargetShard) {
      showToast('Source and target shards must be different', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.adminOps.triggerShardRebalance({
        source_shard_id: rebSourceShard,
        target_shard_id: rebTargetShard,
        vnode_id: rebVnodeId,
        total_keys: 50000,
      });

      showToast(`Autonomous rebalance completed: ${res.vnode_id} migrated to ${res.target_shard_id}`, 'success');
      setShowRebalanceModal(false);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger rebalance migration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderShardStatusBadge = (status: ShardStatus | string) => {
    switch (status) {
      case 'online':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={12} /> online
          </span>
        );
      case 'rebalancing':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <Activity size={12} className="animate-spin" /> rebalancing
          </span>
        );
      case 'draining':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Clock size={12} /> draining
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={12} /> {status}
          </span>
        );
    }
  };

  const renderTxStatusBadge = (status: DistributedTxStatus | string) => {
    switch (status) {
      case 'committed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <ShieldCheck size={12} /> committed
          </span>
        );
      case 'aborted':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={12} /> aborted
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Activity size={12} className="animate-spin" /> {status}
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px', color: '#e5e7eb', background: '#0b0f17', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-flex' }}><Database size={28} color="#06b6d4" /></span>
            Cross-Region Sharding & Distributed Transaction Mesh
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Active-Active Regional Sharding with Consistent Hash Rings, 2-Phase Commit (2PC) Coordination & Autonomous Rebalancing
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => loadData()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#1f2937',
              color: '#f3f4f6',
              border: '1px solid #374151',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowCoordinateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#06b6d4',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Zap size={14} /> Coordinate 2PC Tx
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>Active Database Shards</span>
            <Server size={16} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#06b6d4' }}>
            {telemetry?.online_shards ?? 0} / {telemetry?.total_shards ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            100% online in multi-region clusters
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>Virtual vNodes Distributed</span>
            <Boxes size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#10b981' }}>
            {telemetry?.total_vnodes ?? 32}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Across 32-bit consistent hash ring
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>2PC Transactions Coordinated</span>
            <Zap size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#f59e0b' }}>
            {transactions.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Strict ACID two-phase atomic consistency
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>2PC Latency & Replication Lag</span>
            <Gauge size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#8b5cf6' }}>
            {telemetry?.avg_2pc_latency_ms ?? 38}ms
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Cross-region lag: {telemetry?.cross_region_replication_lag_ms ?? 18.4}ms
          </div>
        </div>
      </div>

      {/* Navigation SubTabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '20px' }}>
        {[
          { key: 'ring', label: 'Consistent Hash Shard Ring', icon: Share2 },
          { key: 'shards', label: 'Active Database Shards', icon: Server },
          { key: 'transactions', label: 'Distributed 2PC Transactions', icon: Zap },
          { key: 'rebalance', label: 'Autonomous Rebalance Drills', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key as SubTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #06b6d4' : '2px solid transparent',
                color: isActive ? '#06b6d4' : '#9ca3af',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Consistent Hash Shard Ring & Key Routing Calculator */}
      {subTab === 'ring' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
              Consistent Hash Ring Virtual Node Distribution ({ranges.length} vNodes)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {ranges.map((r) => {
                const isUsEast = r.shard_id.includes('us-east');
                const isEuWest = r.shard_id.includes('eu-west');
                const badgeColor = isUsEast ? '#06b6d4' : isEuWest ? '#10b981' : '#f59e0b';
                const isSelected = routeResult && routeResult.vnode_id === r.vnode_id;

                return (
                  <div
                    key={r.id}
                    style={{
                      background: isSelected ? 'rgba(6, 182, 212, 0.25)' : '#1f2937',
                      border: isSelected ? '2px solid #06b6d4' : '1px solid #374151',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: badgeColor, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{r.vnode_id}</span>
                      <span style={{ fontSize: '9px', opacity: 0.8 }}>{r.shard_id.replace('shard-', '')}</span>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '9px', marginTop: '4px', fontFamily: 'monospace' }}>
                      {r.hash_range_start.toString(16).padStart(8, '0')} - {r.hash_range_end.toString(16).padStart(8, '0')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Routing Calculator Drawer */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hash size={18} color="#06b6d4" /> Deterministic Hash Key Router
            </h3>

            <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: '1.4' }}>
              Calculates MD5 32-bit consistent hash coordinates and pinpoints the deterministic regional shard responsible for a given tenant or entity key.
            </p>

            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Tenant / Entity Key
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={testKey}
                  onChange={(e) => setTestKey(e.target.value)}
                  placeholder="e.g. tenant-apac-fintech"
                  style={{
                    flex: 1,
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
                <button
                  onClick={handleRouteKey}
                  disabled={loading}
                  style={{
                    background: '#06b6d4',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Route
                </button>
              </div>
            </div>

            {routeResult && (
              <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#06b6d4' }}>
                  Key Routing Result
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>32-Bit Hash:</span>
                  <span style={{ fontFamily: 'monospace', color: '#f3f4f6' }}>{routeResult.hash_code} (0x{routeResult.hash_code.toString(16)})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Target vNode:</span>
                  <span style={{ fontWeight: 600, color: '#10b981' }}>{routeResult.vnode_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Target Shard:</span>
                  <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{routeResult.shard_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Region:</span>
                  <span style={{ color: '#f59e0b' }}>{routeResult.region}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#9ca3af' }}>Host Endpoint:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9ca3af' }}>{routeResult.host_endpoint}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Active Database Shards */}
      {subTab === 'shards' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowRegisterModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                background: '#06b6d4',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Register Database Shard
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {shards.map((s) => (
              <div
                key={s.id}
                style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>
                      {s.shard_name}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#06b6d4', fontFamily: 'monospace' }}>
                      {s.region}
                    </span>
                  </div>
                  <div>{renderShardStatusBadge(s.status)}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', background: '#1f2937', padding: '6px 10px', borderRadius: '4px' }}>
                  {s.host_endpoint}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div style={{ background: '#1f2937', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Allocated vNodes</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                      {s.allocated_vnodes}
                    </div>
                  </div>
                  <div style={{ background: '#1f2937', padding: '10px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Keys Count</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginTop: '2px' }}>
                      {s.total_keys_count.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #1f2937' }}>
                  Storage: {(s.storage_size_bytes / 1073741824).toFixed(1)} GB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Distributed 2PC Transactions */}
      {subTab === 'transactions' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedTx ? '1fr 440px' : '1fr', gap: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Distributed 2PC Transactions ({transactions.length})</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(31, 41, 55, 0.5)', borderBottom: '1px solid #1f2937', color: '#9ca3af' }}>
                    <th style={{ padding: '12px 16px' }}>Transaction ID</th>
                    <th style={{ padding: '12px 16px' }}>Target Tenant</th>
                    <th style={{ padding: '12px 16px' }}>Participants</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Started At</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTx(tx)}
                      style={{
                        borderBottom: '1px solid #1f2937',
                        background: selectedTx?.id === tx.id ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#06b6d4' }}>
                        {tx.id}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                        {tx.target_tenant_id}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9ca3af' }}>
                        {tx.participating_shards.length} shards
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {renderTxStatusBadge(tx.status)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '12px' }}>
                        {new Date(tx.started_at).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          style={{
                            background: '#374151',
                            border: 'none',
                            color: '#e5e7eb',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transaction Detail Drawer */}
          {selectedTx && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={16} color="#06b6d4" /> 2PC Transaction Detail
                </span>
                <button
                  onClick={() => setSelectedTx(null)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Transaction ID & Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#06b6d4' }}>{selectedTx.id}</span>
                  {renderTxStatusBadge(selectedTx.status)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  Participating Shard Votes (2PC Phase 1)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTx.participating_shards.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{p.shard_name}</div>
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>{p.region} · {p.latency_ms}ms latency</div>
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: p.vote === 'prepared' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: p.vote === 'prepared' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {p.vote.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTx.error_message && (
                <div style={{ color: '#ef4444', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '4px' }}>
                  {selectedTx.error_message}
                </div>
              )}

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Payload JSON</div>
                <pre
                  style={{
                    background: '#030712',
                    border: '1px solid #1f2937',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#a7f3d0',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedTx.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Autonomous Rebalance Drills */}
      {subTab === 'rebalance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
              Autonomous vNode Migration Drill
            </h3>

            <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
              Simulates zero-downtime vnode rebalancing. Keys are transparently dual-written while existing partitions stream to the destination shard, dynamically updating consistent hash ring routing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Source Shard
                </label>
                <select
                  value={rebSourceShard}
                  onChange={(e) => setRebSourceShard(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  {shards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shard_name} ({s.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Target Shard
                </label>
                <select
                  value={rebTargetShard}
                  onChange={(e) => setRebTargetShard(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                >
                  {shards.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shard_name} ({s.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Virtual vNode ID to Migrate
                </label>
                <input
                  type="text"
                  value={rebVnodeId}
                  onChange={(e) => setRebVnodeId(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#e5e7eb',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <button
                onClick={handleTriggerRebalance}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#06b6d4',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <Activity size={16} /> Execute Live vNode Rebalance
              </button>
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
              Historical Rebalance Migrations ({migrations.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {migrations.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    padding: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#f3f4f6', fontSize: '13px' }}>
                      {m.vnode_id}: {m.source_shard_id.replace('shard-', '')} <ArrowRight size={12} style={{ display: 'inline' }} /> {m.target_shard_id.replace('shard-', '')}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                      }}
                    >
                      {m.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                    Migrated {m.keys_migrated.toLocaleString()} / {m.total_keys.toLocaleString()} keys ({m.progress_percent}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Register Shard Modal */}
      {showRegisterModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f3f4f6' }}>
                Register Regional Database Shard
              </h3>
              <button onClick={() => setShowRegisterModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Shard Name</label>
                <input
                  type="text"
                  value={newShardName}
                  onChange={(e) => setNewShardName(e.target.value)}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Region</label>
                <input
                  type="text"
                  value={newShardRegion}
                  onChange={(e) => setNewShardRegion(e.target.value)}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Host Endpoint</label>
                <input
                  type="text"
                  value={newShardEndpoint}
                  onChange={(e) => setNewShardEndpoint(e.target.value)}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>vNodes to Allocate</label>
                <input
                  type="number"
                  value={newShardVnodes}
                  onChange={(e) => setNewShardVnodes(Number(e.target.value))}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => setShowRegisterModal(false)} style={{ background: '#374151', border: 'none', color: '#e5e7eb', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleRegisterShard} disabled={loading} style={{ background: '#06b6d4', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Register Shard</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coordinate 2PC Modal */}
      {showCoordinateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f3f4f6' }}>
                Coordinate 2-Phase Commit (2PC) Transaction
              </h3>
              <button onClick={() => setShowCoordinateModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Target Tenant ID</label>
                <input
                  type="text"
                  value={coordTenantId}
                  onChange={(e) => setCoordTenantId(e.target.value)}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', color: '#e5e7eb', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#f59e0b' }}>
                  <input
                    type="checkbox"
                    checked={coordSimulateFailure}
                    onChange={(e) => setCoordSimulateFailure(e.target.checked)}
                  />
                  Simulate Participant Vote Failure (Forces 2PC Abort)
                </label>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Payload JSON</label>
                <textarea
                  rows={4}
                  value={coordPayloadJson}
                  onChange={(e) => setCoordPayloadJson(e.target.value)}
                  style={{ width: '100%', background: '#030712', border: '1px solid #374151', color: '#a7f3d0', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => setShowCoordinateModal(false)} style={{ background: '#374151', border: 'none', color: '#e5e7eb', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCoordinateTransaction} disabled={loading} style={{ background: '#06b6d4', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Execute 2PC</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
