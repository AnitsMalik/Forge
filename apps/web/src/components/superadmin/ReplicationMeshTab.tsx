/**
 * Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh Tab
 * HoaspForge Platform v5.2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  Plus,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
  Sliders,
  ShieldAlert,
  ArrowRightLeft,
  Search,
  Filter,
  Check,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  ReplicationNode,
  ReplicationNodeRole,
  ReplicationNodeStatus,
  ReplicationHeartbeatEvent,
  FailoverQuorumEvent,
  MeshTopologyTelemetry,
  CreateReplicationNodeInput,
  FailoverSimulationResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'nodes' | 'heartbeats' | 'failovers' | 'simulator';

export const ReplicationMeshTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('nodes');

  // Telemetry
  const [telemetry, setTelemetry] = useState<MeshTopologyTelemetry | null>(null);

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

  // Nodes
  const [nodes, setNodes] = useState<ReplicationNode[]>([]);
  const [nodeSearch, setNodeSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Heartbeats
  const [heartbeats, setHeartbeats] = useState<ReplicationHeartbeatEvent[]>([]);

  // Failover Events
  const [failovers, setFailovers] = useState<FailoverQuorumEvent[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNode, setEditingNode] = useState<ReplicationNode | null>(null);
  const [failoverCandidate, setFailoverCandidate] = useState<ReplicationNode | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateReplicationNodeInput>({
    region_code: 'us-east-1',
    node_name: '',
    role: 'read_replica',
    ip_address: '10.0.1.10',
    port: 3306,
    is_write_eligible: false,
    heartbeat_interval_sec: 5,
  });

  // Edit Form State
  const [editStatus, setEditStatus] = useState<ReplicationNodeStatus>('healthy');
  const [editRole, setEditRole] = useState<ReplicationNodeRole>('read_replica');
  const [editLag, setEditLag] = useState<number>(0);
  const [editWriteEligible, setEditWriteEligible] = useState<boolean>(false);

  // Failover Form State
  const [failoverReason, setFailoverReason] = useState('Planned high-availability regional maintenance failover');
  const [failoverForce, setFailoverForce] = useState(false);
  const [executingFailover, setExecutingFailover] = useState(false);

  // Simulator State
  const [simCandidateId, setSimCandidateId] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<FailoverSimulationResult | null>(null);

  // Fetch telemetry & data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telemetryRes, nodesRes, hbRes, failoversRes] = await Promise.all([
        api.adminOps.getReplicationTelemetry(),
        api.adminOps.listReplicationNodes(),
        api.adminOps.listReplicationHeartbeats({ limit: 25 }),
        api.adminOps.listFailoverEvents(20),
      ]);

      setTelemetry(telemetryRes);
      setNodes(nodesRes);
      setHeartbeats(hbRes);
      setFailovers(failoversRes);
      if (!simCandidateId && nodesRes.length > 0) {
        const standby = nodesRes.find((n) => n.role === 'hot_standby') || nodesRes[1] || nodesRes[0];
        setSimCandidateId(standby.id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load replication mesh data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, simCandidateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Node
  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.node_name.trim()) {
      showToast('Node name is required', 'error');
      return;
    }
    try {
      await api.adminOps.createReplicationNode(createForm);
      showToast(`Database node "${createForm.node_name}" provisioned successfully`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        region_code: 'us-east-1',
        node_name: '',
        role: 'read_replica',
        ip_address: '10.0.1.10',
        port: 3306,
        is_write_eligible: false,
        heartbeat_interval_sec: 5,
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to provision replication node', 'error');
    }
  };

  // Handle Edit Node
  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;
    try {
      await api.adminOps.updateReplicationNode(editingNode.id, {
        status: editStatus,
        role: editRole,
        replication_lag_ms: editLag,
        is_write_eligible: editWriteEligible,
      });
      showToast(`Node "${editingNode.node_name}" parameters updated successfully`, 'success');
      setEditingNode(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update node configuration', 'error');
    }
  };

  // Handle Delete Node
  const handleDeleteNode = (node: ReplicationNode) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Decommission Database Node',
      description: `Are you sure you want to decommission and delete database node "${node.node_name}"? Cluster consensus and replication topologies will be rebalanced.`,
      confirmText: 'Decommission Node',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteReplicationNode(node.id);
          showToast(`Node "${node.node_name}" decommissioned successfully`, 'success');
          loadData();
        } catch (err: any) {
          showToast(err.message || 'Failed to delete node', 'error');
        }
      },
    });
  };

  // Handle Trigger Heartbeat
  const handleTriggerHeartbeat = async (node: ReplicationNode) => {
    try {
      await api.adminOps.recordReplicationHeartbeat(node.id, {
        lag_ms: node.role === 'leader_primary' ? 0 : Math.floor(Math.random() * 25) + 5,
        commit_throughput_tps: Math.floor(Math.random() * 300) + 150,
        cpu_utilization_percent: Math.floor(Math.random() * 40) + 15,
        status: 'healthy',
      });
      showToast(`Heartbeat logged for ${node.node_name}`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Heartbeat trigger failed', 'error');
    }
  };

  // Handle Execute Failover
  const handleExecuteFailover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failoverCandidate) return;
    setExecutingFailover(true);
    try {
      const res = await api.adminOps.executeFailover({
        promoted_node_id: failoverCandidate.id,
        reason: failoverReason,
        force: failoverForce,
      });
      showToast(
        `Consensus Quorum Reached! Node "${res.promotedNode.node_name}" promoted to Primary Leader (Fencing Token: ${res.failoverEvent.fencing_token})`,
        'success'
      );
      setFailoverCandidate(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Disaster failover promotion failed', 'error');
    } finally {
      setExecutingFailover(false);
    }
  };

  // Handle Simulate
  const handleRunSimulation = async () => {
    if (!simCandidateId) return;
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateFailover(simCandidateId);
      setSimResult(res);
      showToast('Failover simulation finished', 'info');
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Filtered nodes
  const filteredNodes = nodes.filter((node) => {
    const matchesSearch =
      node.node_name.toLowerCase().includes(nodeSearch.toLowerCase()) ||
      node.ip_address.toLowerCase().includes(nodeSearch.toLowerCase()) ||
      node.region_code.toLowerCase().includes(nodeSearch.toLowerCase());
    const matchesRegion = !regionFilter || node.region_code === regionFilter;
    const matchesRole = !roleFilter || node.role === roleFilter;
    return matchesSearch && matchesRegion && matchesRole;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          padding: '20px 24px',
          borderRadius: '12px',
          border: '1px solid #334155',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span title="Database Mesh" style={{ display: 'inline-flex' }}>
              <Database size={24} color="#38bdf8" />
            </span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>
              Multi-Region Disaster Failover & Live Replication Mesh
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontWeight: '600',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              Active-Active v5.2
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Continuous GTID database replication mesh, Raft-style quorum consensus, and zero-downtime disaster failover.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-refresh-mesh"
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <span title="Refresh" style={{ display: 'inline-flex' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </span>
            Refresh
          </button>
          <button
            id="btn-open-create-node"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <span title="Provision Node" style={{ display: 'inline-flex' }}>
              <Plus size={15} />
            </span>
            Provision Node
          </button>
        </div>
      </div>

      {/* Real-time Telemetry KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Quorum & Node Health */}
        <div
          id="card-mesh-quorum"
          style={{
            backgroundColor: '#1e293b',
            padding: '18px 20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
              Quorum Consensus
            </span>
            <span title="Quorum Status" style={{ display: 'inline-flex' }}>
              <ShieldAlert size={16} color={telemetry?.quorumStatus === 'quorate' ? '#10b981' : '#f59e0b'} />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>
              {telemetry ? `${telemetry.healthyNodes} / ${telemetry.totalNodes}` : '0 / 0'}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Nodes Healthy</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  telemetry?.quorumStatus === 'quorate'
                    ? '#10b981'
                    : telemetry?.quorumStatus === 'degraded_quorum'
                    ? '#f59e0b'
                    : '#ef4444',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color:
                  telemetry?.quorumStatus === 'quorate'
                    ? '#10b981'
                    : telemetry?.quorumStatus === 'degraded_quorum'
                    ? '#f59e0b'
                    : '#ef4444',
                textTransform: 'uppercase',
              }}
            >
              {telemetry?.quorumStatus || 'LOST_QUORUM'}
            </span>
          </div>
        </div>

        {/* Card 2: Primary Leader */}
        <div
          id="card-mesh-leader"
          style={{
            backgroundColor: '#1e293b',
            padding: '18px 20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
              Active Primary Leader
            </span>
            <span title="Primary Leader" style={{ display: 'inline-flex' }}>
              <Server size={16} color="#38bdf8" />
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#38bdf8' }}>
            {telemetry?.leaderNode?.node_name || 'NO PRIMARY ELECTED'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '6px' }}>
            <span>Region:</span>
            <span style={{ color: '#e2e8f0', fontWeight: '500' }}>
              {telemetry?.leaderNode?.region_code || 'N/A'}
            </span>
            <span>•</span>
            <span style={{ color: '#10b981' }}>Write Authority Active</span>
          </div>
        </div>

        {/* Card 3: Replication Lag */}
        <div
          id="card-mesh-lag"
          style={{
            backgroundColor: '#1e293b',
            padding: '18px 20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
              Replication Lag
            </span>
            <span title="Lag" style={{ display: 'inline-flex' }}>
              <Activity size={16} color="#10b981" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>
              {telemetry?.averageLagMs ?? 0}ms
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Average</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Max Cluster Lag:{' '}
            <span style={{ color: (telemetry?.maxLagMs || 0) > 50 ? '#f59e0b' : '#e2e8f0', fontWeight: '600' }}>
              {telemetry?.maxLagMs ?? 0}ms
            </span>
          </div>
        </div>

        {/* Card 4: Active Regions */}
        <div
          id="card-mesh-regions"
          style={{
            backgroundColor: '#1e293b',
            padding: '18px 20px',
            borderRadius: '10px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>
              Active Regions
            </span>
            <span title="Regions" style={{ display: 'inline-flex' }}>
              <Zap size={16} color="#a855f7" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>
              {telemetry?.activeRegionCount ?? 0}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Cross-Cloud PoPs</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Avg Round-Trip RTT: <span style={{ color: '#e2e8f0', fontWeight: '600' }}>48.2ms</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #334155',
          paddingBottom: '8px',
        }}
      >
        <button
          id="subtab-mesh-nodes"
          onClick={() => setSubTab('nodes')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'nodes' ? '#0284c7' : 'transparent',
            color: subTab === 'nodes' ? '#ffffff' : '#94a3b8',
          }}
        >
          Topology & Node Mesh ({nodes.length})
        </button>

        <button
          id="subtab-mesh-heartbeats"
          onClick={() => setSubTab('heartbeats')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'heartbeats' ? '#0284c7' : 'transparent',
            color: subTab === 'heartbeats' ? '#ffffff' : '#94a3b8',
          }}
        >
          Heartbeat Telemetry ({heartbeats.length})
        </button>

        <button
          id="subtab-mesh-failovers"
          onClick={() => setSubTab('failovers')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'failovers' ? '#0284c7' : 'transparent',
            color: subTab === 'failovers' ? '#ffffff' : '#94a3b8',
          }}
        >
          Quorum Failover History ({failovers.length})
        </button>

        <button
          id="subtab-mesh-simulator"
          onClick={() => setSubTab('simulator')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'simulator' ? '#0284c7' : 'transparent',
            color: subTab === 'simulator' ? '#ffffff' : '#94a3b8',
          }}
        >
          Disaster Failover Sandbox
        </button>
      </div>

      {/* Subtab 1: Topology & Node Mesh */}
      {subTab === 'nodes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '10px', display: 'inline-flex' }}>
                <Search size={14} color="#64748b" />
              </span>
              <input
                id="input-search-nodes"
                type="text"
                placeholder="Search node name, IP, region..."
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ position: 'relative', minWidth: '160px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '10px', display: 'inline-flex' }}>
                <Filter size={14} color="#64748b" />
              </span>
              <select
                id="select-filter-region"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                <option value="">All Regions</option>
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                <option value="us-central-1">us-central-1 (Chicago)</option>
              </select>
            </div>

            <div style={{ minWidth: '160px' }}>
              <select
                id="select-filter-role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                <option value="">All Roles</option>
                <option value="leader_primary">Leader Primary</option>
                <option value="hot_standby">Hot Standby</option>
                <option value="read_replica">Read Replica</option>
                <option value="witness_arbiter">Witness Arbiter</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '10px',
              border: '1px solid #334155',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Node Name</th>
                  <th style={{ padding: '12px 16px' }}>Region & IP</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Replication Lag</th>
                  <th style={{ padding: '12px 16px' }}>GTID Offset</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No replication nodes match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredNodes.map((node) => (
                    <tr
                      key={node.id}
                      id={`node-row-${node.id}`}
                      style={{ borderBottom: '1px solid #334155' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{node.node_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>ID: {node.id.substring(0, 13)}...</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#e2e8f0', fontWeight: '500' }}>{node.region_code}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {node.ip_address}:{node.port}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            backgroundColor:
                              node.role === 'leader_primary'
                                ? 'rgba(56, 189, 248, 0.2)'
                                : node.role === 'hot_standby'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : node.role === 'witness_arbiter'
                                ? 'rgba(168, 85, 247, 0.2)'
                                : 'rgba(148, 163, 184, 0.2)',
                            color:
                              node.role === 'leader_primary'
                                ? '#38bdf8'
                                : node.role === 'hot_standby'
                                ? '#f59e0b'
                                : node.role === 'witness_arbiter'
                                ? '#a855f7'
                                : '#94a3b8',
                          }}
                        >
                          {node.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color:
                              node.status === 'healthy'
                                ? '#10b981'
                                : node.status === 'degraded'
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor:
                                node.status === 'healthy'
                                  ? '#10b981'
                                  : node.status === 'degraded'
                                  ? '#f59e0b'
                                  : '#ef4444',
                            }}
                          />
                          {node.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontWeight: '600',
                            color: node.replication_lag_ms > 30 ? '#f59e0b' : '#10b981',
                          }}
                        >
                          {node.replication_lag_ms}ms
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                        {node.applied_gtid_set ? node.applied_gtid_set.substring(0, 22) + '...' : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            id={`btn-ping-node-${node.id}`}
                            title="Trigger Heartbeat"
                            onClick={() => handleTriggerHeartbeat(node)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <span title="Ping" style={{ display: 'inline-flex' }}>
                              <Activity size={13} />
                            </span>
                          </button>

                          {node.role !== 'leader_primary' && node.role !== 'witness_arbiter' && (
                            <button
                              id={`btn-failover-node-${node.id}`}
                              title="Promote / Failover"
                              onClick={() => {
                                setFailoverCandidate(node);
                                setFailoverReason('Manual administrative failover promotion');
                              }}
                              style={{
                                padding: '5px 8px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#f59e0b',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <span title="Failover" style={{ display: 'inline-flex' }}>
                                <ArrowRightLeft size={13} />
                              </span>
                            </button>
                          )}

                          <button
                            id={`btn-edit-node-${node.id}`}
                            title="Edit Node Config"
                            onClick={() => {
                              setEditingNode(node);
                              setEditStatus(node.status);
                              setEditRole(node.role);
                              setEditLag(node.replication_lag_ms);
                              setEditWriteEligible(node.is_write_eligible);
                            }}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              color: '#94a3b8',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <span title="Edit" style={{ display: 'inline-flex' }}>
                              <Edit3 size={13} />
                            </span>
                          </button>

                          {node.role !== 'leader_primary' && (
                            <button
                              id={`btn-delete-node-${node.id}`}
                              title="Decommission Node"
                              onClick={() => handleDeleteNode(node)}
                              style={{
                                padding: '5px 8px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <span title="Delete" style={{ display: 'inline-flex' }}>
                                <Trash2 size={13} />
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Continuous Heartbeat Telemetry */}
      {subTab === 'heartbeats' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>Event ID</th>
                <th style={{ padding: '12px 16px' }}>Node ID & Region</th>
                <th style={{ padding: '12px 16px' }}>Replication Lag</th>
                <th style={{ padding: '12px 16px' }}>Commit TPS</th>
                <th style={{ padding: '12px 16px' }}>CPU Utilization</th>
                <th style={{ padding: '12px 16px' }}>Network RTT</th>
                <th style={{ padding: '12px 16px' }}>Recorded At</th>
              </tr>
            </thead>
            <tbody>
              {heartbeats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No heartbeat telemetry records available.
                  </td>
                </tr>
              ) : (
                heartbeats.map((hb) => (
                  <tr key={hb.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94a3b8', fontSize: '12px' }}>
                      {hb.id.substring(0, 16)}...
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#f8fafc', fontWeight: '500' }}>{hb.node_id}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{hb.region_code}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: '600', color: hb.lag_ms > 30 ? '#f59e0b' : '#10b981' }}>
                        {hb.lag_ms}ms
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{hb.commit_throughput_tps} TPS</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{hb.cpu_utilization_percent}%</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{hb.network_rtt_ms}ms</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(hb.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 3: Quorum Election & Failover Log */}
      {subTab === 'failovers' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '10px',
            border: '1px solid #334155',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '12px 16px' }}>Incident ID</th>
                <th style={{ padding: '12px 16px' }}>Trigger Source</th>
                <th style={{ padding: '12px 16px' }}>Promoted Leader</th>
                <th style={{ padding: '12px 16px' }}>Quorum Votes</th>
                <th style={{ padding: '12px 16px' }}>Fencing Token</th>
                <th style={{ padding: '12px 16px' }}>Outcome</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {failovers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No failover quorum events on record.
                  </td>
                </tr>
              ) : (
                failovers.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f8fafc' }}>{ev.incident_id}</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{ev.triggered_by}</td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: '500' }}>
                      {ev.promoted_leader_id}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: '600' }}>
                      {ev.quorum_votes_for} / {ev.quorum_nodes_total} votes
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#f59e0b' }}>
                      #{ev.fencing_token}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            ev.outcome === 'promoted' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: ev.outcome === 'promoted' ? '#10b981' : '#ef4444',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ev.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 4: Failover Sandbox Simulator */}
      {subTab === 'simulator' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '24px',
            borderRadius: '10px',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#f8fafc' }}>
              Predictive Quorum & Split-Brain Disaster Evaluator
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Simulates leader election, quorum consensus, GTID reconciliation, and fencing token validation without
              mutating active database cluster state.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Select Promotion Candidate Node
              </label>
              <select
                id="select-sim-candidate"
                value={simCandidateId}
                onChange={(e) => setSimCandidateId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.node_name} ({n.region_code}) - {n.role} [{n.status}]
                  </option>
                ))}
              </select>
            </div>

            <button
              id="btn-run-simulation"
              onClick={handleRunSimulation}
              disabled={simLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <span title="Run Simulation" style={{ display: 'inline-flex' }}>
                <PlayCircle size={15} />
              </span>
              Run Quorum Simulation
            </button>
          </div>

          {simResult && (
            <div
              id="box-simulation-results"
              style={{
                backgroundColor: '#0f172a',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor:
                        simResult.verdict === 'SAFE_FOR_FAILOVER'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : simResult.verdict === 'ELEVATED_RISK_LAG'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(239, 68, 68, 0.2)',
                      color:
                        simResult.verdict === 'SAFE_FOR_FAILOVER'
                          ? '#10b981'
                          : simResult.verdict === 'ELEVATED_RISK_LAG'
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    VERDICT: {simResult.verdict}
                  </span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Eligibility: {simResult.eligible ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#f59e0b' }}>
                  Allocated Fencing Token: #{simResult.fencingTokenAllocated}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Candidate Lag</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                    {simResult.replicationLagMs}ms
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Est. Data Loss Window</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                    {simResult.estimatedDataLossSeconds}s
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Quorum Projection</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                    {simResult.quorumVotesEstimated.for} / {simResult.quorumVotesEstimated.total} Votes
                  </div>
                </div>
              </div>

              {simResult.warnings.length > 0 && (
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>
                    Identified Guardrail Warnings:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#fed7aa' }}>
                    {simResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Provision Node */}
      {showCreateModal && (
        <div
          id="modal-create-node"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '12px',
              border: '1px solid #334155',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Provision Database Node</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Node Name *
                </label>
                <input
                  id="input-create-node-name"
                  type="text"
                  required
                  placeholder="e.g. syd-db-replica-05"
                  value={createForm.node_name}
                  onChange={(e) => setCreateForm({ ...createForm, node_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Region Code *
                  </label>
                  <select
                    id="select-create-node-region"
                    value={createForm.region_code}
                    onChange={(e) => setCreateForm({ ...createForm, region_code: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  >
                    <option value="us-east-1">us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">us-west-2 (Oregon)</option>
                    <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                    <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    <option value="us-central-1">us-central-1 (Chicago)</option>
                    <option value="ap-southeast-2">ap-southeast-2 (Sydney)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Role *
                  </label>
                  <select
                    id="select-create-node-role"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as ReplicationNodeRole })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  >
                    <option value="read_replica">Read Replica</option>
                    <option value="hot_standby">Hot Standby</option>
                    <option value="witness_arbiter">Witness Arbiter</option>
                    <option value="leader_primary">Leader Primary</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    IP Address *
                  </label>
                  <input
                    id="input-create-node-ip"
                    type="text"
                    required
                    value={createForm.ip_address}
                    onChange={(e) => setCreateForm({ ...createForm, ip_address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Port
                  </label>
                  <input
                    id="input-create-node-port"
                    type="number"
                    value={createForm.port}
                    onChange={(e) => setCreateForm({ ...createForm, port: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-node"
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Provision Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Node Configuration */}
      {editingNode && (
        <div
          id="modal-edit-node"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '12px',
              border: '1px solid #334155',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                Configure {editingNode.node_name}
              </h3>
              <button
                onClick={() => setEditingNode(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Node Status
                </label>
                <select
                  id="select-edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as ReplicationNodeStatus)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="healthy">Healthy</option>
                  <option value="degraded">Degraded</option>
                  <option value="failing">Failing</option>
                  <option value="offline">Offline</option>
                  <option value="recovering">Recovering</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Role Assignment
                </label>
                <select
                  id="select-edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as ReplicationNodeRole)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="leader_primary">Leader Primary</option>
                  <option value="hot_standby">Hot Standby</option>
                  <option value="read_replica">Read Replica</option>
                  <option value="witness_arbiter">Witness Arbiter</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Simulated Replication Lag (ms)
                </label>
                <input
                  id="input-edit-lag"
                  type="number"
                  min={0}
                  value={editLag}
                  onChange={(e) => setEditLag(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="check-edit-write-eligible"
                  type="checkbox"
                  checked={editWriteEligible}
                  onChange={(e) => setEditWriteEligible(e.target.checked)}
                />
                <label htmlFor="check-edit-write-eligible" style={{ fontSize: '13px', color: '#e2e8f0' }}>
                  Write Eligible Authority Enabled
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-edit-node"
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Execute Disaster Failover */}
      {failoverCandidate && (
        <div
          id="modal-execute-failover"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              width: '100%',
              maxWidth: '500px',
              borderRadius: '12px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span title="Warning" style={{ display: 'inline-flex' }}>
                <AlertTriangle size={22} color="#f59e0b" />
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                Authorize Disaster Failover Promotion
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              You are promoting candidate node <strong style={{ color: '#38bdf8' }}>{failoverCandidate.node_name}</strong>{' '}
              ({failoverCandidate.region_code}) to Primary Leader. The current primary leader will be demoted to hot
              standby, and a new monotonic fencing token will be broadcast to the mesh.
            </p>

            <form onSubmit={handleExecuteFailover} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Operational Justification Reason *
                </label>
                <textarea
                  id="textarea-failover-reason"
                  rows={3}
                  required
                  value={failoverReason}
                  onChange={(e) => setFailoverReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="check-failover-force"
                  type="checkbox"
                  checked={failoverForce}
                  onChange={(e) => setFailoverForce(e.target.checked)}
                />
                <label htmlFor="check-failover-force" style={{ fontSize: '13px', color: '#f59e0b' }}>
                  Force Promotion Override (Bypass safety quorum guardrails)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFailoverCandidate(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#334155',
                    color: '#f8fafc',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-failover"
                  type="submit"
                  disabled={executingFailover}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {executingFailover ? 'Executing Failover...' : 'Execute Failover Election'}
                </button>
              </div>
            </form>
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
