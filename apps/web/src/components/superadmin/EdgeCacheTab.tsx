/**
 * Global Multi-Region Edge Caching & Content Delivery Network (CDN) Tab
 * HoaspForge Platform v4.8.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Server,
  Zap,
  Globe,
  Activity,
  Layers,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HardDrive,
  Cpu,
  Radio,
  Sliders,
  Sparkles,
  ArrowRight,
  Filter,
  Eye,
  Check,
  Copy,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  EdgeCacheNode,
  EdgeNodeStatus,
  EdgeCacheRule,
  EdgePurgeRequest,
  EdgePurgeType,
  EdgeTrafficMetric,
  EdgeSimulationResult,
  EdgeCacheOverview,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'nodes' | 'rules' | 'purge' | 'simulator' | 'analytics';

export const EdgeCacheTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('nodes');

  // Overview Telemetry
  const [overview, setOverview] = useState<EdgeCacheOverview | null>(null);

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

  // PoP Nodes
  const [nodes, setNodes] = useState<EdgeCacheNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<EdgeCacheNode | null>(null);
  const [updatingNode, setUpdatingNode] = useState(false);

  // Cache Rules
  const [rules, setRules] = useState<EdgeCacheRule[]>([]);
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EdgeCacheRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    ruleName: '',
    routePattern: '',
    priority: 50,
    cacheTier: 'edge_memory' as 'edge_memory' | 'edge_ssd' | 'origin_pass',
    ttlSeconds: 300,
    swrSeconds: 60,
    cacheTags: 'assets, cdn',
    bypassOnAuth: true,
    bypassMethods: 'POST, PUT, DELETE, PATCH',
    isEnabled: true,
  });

  // Cache Purge
  const [purgeLogs, setPurgeLogs] = useState<EdgePurgeRequest[]>([]);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeType, setPurgeType] = useState<EdgePurgeType>('tag');
  const [purgeTargets, setPurgeTargets] = useState('');
  const [purgeReason, setPurgeReason] = useState('');
  const [purging, setPurging] = useState(false);

  // Edge Simulation
  const [simRoute, setSimRoute] = useState('/api/v1/status');
  const [simMethod, setSimMethod] = useState('GET');
  const [simAuthHeader, setSimAuthHeader] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<EdgeSimulationResult | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<EdgeTrafficMetric[]>([]);

  // Clipboard Helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('Copied to clipboard');
  };

  // Data Loading
  const loadOverview = useCallback(async () => {
    try {
      const data = await api.adminOps.getEdgeCacheOverview();
      setOverview(data);
    } catch (err: any) {
      showToast(`Failed to load CDN overview: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadNodes = useCallback(async () => {
    try {
      const data = await api.adminOps.listEdgeNodes();
      setNodes(data);
    } catch (err: any) {
      showToast(`Failed to load Edge nodes: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadRules = useCallback(async () => {
    try {
      const data = await api.adminOps.listEdgeRules();
      setRules(data);
    } catch (err: any) {
      showToast(`Failed to load Edge rules: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadPurges = useCallback(async () => {
    try {
      const data = await api.adminOps.listEdgePurgeLogs(30);
      setPurgeLogs(data);
    } catch (err: any) {
      showToast(`Failed to load Purge logs: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadMetrics = useCallback(async () => {
    try {
      const data = await api.adminOps.getEdgeTrafficMetrics(24);
      setMetrics(data);
    } catch (err: any) {
      showToast(`Failed to load Edge metrics: ${err.message}`, 'error');
    }
  }, [showToast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadOverview(), loadNodes(), loadRules(), loadPurges(), loadMetrics()]);
    setLoading(false);
  }, [loadOverview, loadNodes, loadRules, loadPurges, loadMetrics]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handlers
  const handleUpdateNodeStatus = async (nodeId: string, status: EdgeNodeStatus) => {
    setUpdatingNode(true);
    try {
      await api.adminOps.updateEdgeNodeStatus(nodeId, status);
      showToast(`Node status updated to "${status}"`, 'success');
      loadNodes();
      loadOverview();
      setSelectedNode(null);
    } catch (err: any) {
      showToast(`Failed to update node status: ${err.message}`, 'error');
    } finally {
      setUpdatingNode(false);
    }
  };

  const handleToggleRule = async (rule: EdgeCacheRule) => {
    try {
      await api.adminOps.toggleEdgeRule(rule.id, !rule.isEnabled);
      showToast(`Rule "${rule.ruleName}" ${!rule.isEnabled ? 'enabled' : 'disabled'}`, 'info');
      loadRules();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to toggle rule: ${err.message}`, 'error');
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete CDN Caching Rule',
      description: 'Are you sure you want to permanently delete this CDN caching rule? Requests matching this path pattern will fall back to default edge origin TTLs.',
      confirmText: 'Delete Rule',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteEdgeRule(ruleId);
          showToast('Caching rule deleted successfully', 'success');
          loadRules();
          loadOverview();
        } catch (err: any) {
          showToast(`Failed to delete rule: ${err.message}`, 'error');
        }
      },
    });
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ruleName: ruleForm.ruleName,
        routePattern: ruleForm.routePattern,
        priority: Number(ruleForm.priority),
        cacheTier: ruleForm.cacheTier,
        ttlSeconds: Number(ruleForm.ttlSeconds),
        swrSeconds: Number(ruleForm.swrSeconds),
        cacheTags: ruleForm.cacheTags.split(',').map((t) => t.trim()).filter(Boolean),
        bypassOnAuth: ruleForm.bypassOnAuth,
        bypassMethods: ruleForm.bypassMethods.split(',').map((m) => m.trim().toUpperCase()).filter(Boolean),
        isEnabled: ruleForm.isEnabled,
      };

      if (editingRule) {
        await api.adminOps.updateEdgeRule(editingRule.id, payload);
        showToast('Edge caching rule updated', 'success');
      } else {
        await api.adminOps.createEdgeRule(payload);
        showToast('New Edge caching rule deployed across PoPs', 'success');
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      loadRules();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to save rule: ${err.message}`, 'error');
    }
  };

  const handleExecutePurge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purgeReason.trim().length < 6) {
      showToast('Please provide an operational justification (minimum 6 characters)', 'error');
      return;
    }
    setPurging(true);
    try {
      const targets = purgeType === 'purge_all'
        ? ['*']
        : purgeTargets.split(',').map((t) => t.trim()).filter(Boolean);

      const res = await api.adminOps.executeEdgePurge({
        purgeType,
        targets,
        reason: purgeReason.trim(),
      });
      showToast(`Cache purge completed! Reached ${res.nodesAffected} edge PoP nodes`, 'success');
      setPurgeModalOpen(false);
      setPurgeTargets('');
      setPurgeReason('');
      loadPurges();
      loadOverview();
    } catch (err: any) {
      showToast(`Failed to purge cache: ${err.message}`, 'error');
    } finally {
      setPurging(false);
    }
  };

  const handleSimulateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      const headers: Record<string, string> = {};
      if (simAuthHeader) {
        headers['Authorization'] = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      }
      const res = await api.adminOps.simulateEdgeRequest({
        route: simRoute.trim(),
        method: simMethod,
        headers,
      });
      setSimResult(res);
      showToast(`Simulation complete: ${res.cacheDecision} (${res.responseHeaders['CF-Cache-Status']})`, 'info');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Node Status Pill
  const renderStatusPill = (status: EdgeNodeStatus) => {
    const config = {
      online: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e33', icon: CheckCircle2 },
      degraded: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab30833', icon: AlertTriangle },
      draining: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f633', icon: Activity },
      offline: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef444433', icon: XCircle },
    }[status];
    const Icon = config.icon;
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: config.bg,
          color: config.text,
          border: `1px solid ${config.border}`,
          textTransform: 'uppercase',
        }}
      >
        <Icon size={13} />
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. TOP TELEMETRY STAT CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Global Edge PoP Nodes</span>
            <Server size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.onlineNodes} / ${overview.totalNodes}` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={12} color="#10b981" />
            100% Multi-Region Anycast Mesh
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Global Cache Hit Ratio</span>
            <Zap size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.globalHitRatio}%` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Edge SSD + Stale-While-Revalidate
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Origin Shield Offload</span>
            <HardDrive size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.originOffloadPercent}%` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            Bandwidth: {overview ? `${(overview.totalBandwidthBytes / (1024 * 1024 * 1024)).toFixed(2)} GB (24h)` : '...'}
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
            borderRadius: '12px',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Global Edge Latency</span>
            <Clock size={18} color="#eab308" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>
            {overview ? `${overview.avgEdgeLatencyMs} ms` : '...'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981' }}>
            p95 Tail Latency &lt; 25ms Across All PoPs
          </div>
        </div>
      </div>

      {/* 2. SUB-TABS NAVIGATION & ACTIONS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'nodes', label: 'Edge PoP Nodes', icon: Globe },
            { id: 'rules', label: 'Caching Rules & TTL', icon: Sliders },
            { id: 'purge', label: 'Cache Invalidation & Purge', icon: Trash2 },
            { id: 'simulator', label: 'CDN Edge Simulator', icon: Sparkles },
            { id: 'analytics', label: 'Traffic & Metrics', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`subtab-edge-${tab.id}`}
                onClick={() => setSubTab(tab.id as SubTab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: active ? '#60a5fa' : '#94a3b8',
                  border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadAll()}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          {subTab === 'rules' && (
            <button
              id="btn-deploy-rule"
              onClick={() => {
                setEditingRule(null);
                setRuleForm({
                  ruleName: '',
                  routePattern: '',
                  priority: 50,
                  cacheTier: 'edge_memory',
                  ttlSeconds: 300,
                  swrSeconds: 60,
                  cacheTags: 'assets, cdn',
                  bypassOnAuth: true,
                  bypassMethods: 'POST, PUT, DELETE, PATCH',
                  isEnabled: true,
                });
                setRuleModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              Deploy Cache Rule
            </button>
          )}

          {subTab === 'purge' && (
            <button
              id="btn-trigger-purge"
              onClick={() => setPurgeModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} />
              Dispatch Cache Purge
            </button>
          )}
        </div>
      </div>

      {/* 3. SUB-TAB CONTENT */}

      {/* SUB-TAB A: EDGE POP NODES */}
      {subTab === 'nodes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {nodes.map((node) => (
              <div
                key={node.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                        {node.name}
                      </span>
                      {node.sslActive && (
                        <span title="ACME SSL Active" style={{ display: 'inline-flex' }}>
                          <ShieldCheck size={14} color="#10b981" />
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                      {node.nodeCode} • {node.region}
                    </div>
                  </div>
                  {renderStatusPill(node.status)}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '10px',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Latency</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                      {node.latencyMs} ms
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Hit Ratio</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>
                      {node.hitRatio}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Uptime</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#38bdf8' }}>
                      {node.uptimePercent}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Active Conns</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>
                      {node.activeConnections.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Storage Capacity Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>Edge SSD Usage</span>
                    <span>{node.usedGb} GB / {node.capacityGb} GB</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (node.usedGb / node.capacityGb) * 100)}%`,
                        background: 'linear-gradient(90deg, #3b82f6, #10b981)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    {node.ipAddress}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {node.status !== 'online' && (
                      <button
                        onClick={() => handleUpdateNodeStatus(node.id, 'online')}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          border: '1px solid #22c55e33',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Set Online
                      </button>
                    )}
                    {node.status !== 'draining' && (
                      <button
                        onClick={() => handleUpdateNodeStatus(node.id, 'draining')}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid #3b82f633',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Drain
                      </button>
                    )}
                    {node.status !== 'degraded' && (
                      <button
                        onClick={() => handleUpdateNodeStatus(node.id, 'degraded')}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#eab308',
                          border: '1px solid #eab30833',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Degrade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB B: CACHING RULES & TTL */}
      {subTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="Search rules by name, route pattern, or tags..."
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px 8px 36px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Rule Name</th>
                  <th style={{ padding: '12px 16px' }}>Route Pattern</th>
                  <th style={{ padding: '12px 16px' }}>Tier</th>
                  <th style={{ padding: '12px 16px' }}>TTL / SWR</th>
                  <th style={{ padding: '12px 16px' }}>Cache Tags</th>
                  <th style={{ padding: '12px 16px' }}>Bypass</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules
                  .filter((r) =>
                    !ruleSearch ||
                    r.ruleName.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                    r.routePattern.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                    r.cacheTags.some((t) => t.toLowerCase().includes(ruleSearch.toLowerCase()))
                  )
                  .map((rule) => (
                    <tr
                      key={rule.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        color: '#e2e8f0',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#38bdf8' }}>{rule.priority}.</span>
                          <span>{rule.ruleName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <code
                          style={{
                            background: 'rgba(0, 0, 0, 0.35)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            color: '#e2e8f0',
                            fontSize: '12px',
                          }}
                        >
                          {rule.routePattern}
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: rule.cacheTier === 'edge_memory' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: rule.cacheTier === 'edge_memory' ? '#60a5fa' : '#c084fc',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {rule.cacheTier.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{rule.ttlSeconds}s</span> TTL
                          <span style={{ color: '#64748b', margin: '0 4px' }}>/</span>
                          <span style={{ color: '#eab308' }}>{rule.swrSeconds}s</span> SWR
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {rule.cacheTags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: '11px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                color: '#94a3b8',
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '11px', color: '#94a3b8' }}>
                        {rule.bypassOnAuth && <span style={{ color: '#fb923c' }}>Auth</span>}
                        {rule.bypassOnAuth && rule.bypassMethods.length > 0 && <span>, </span>}
                        {rule.bypassMethods.join(', ')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => handleToggleRule(rule)}
                          style={{
                            background: rule.isEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: rule.isEnabled ? '#22c55e' : '#ef4444',
                            border: `1px solid ${rule.isEnabled ? '#22c55e33' : '#ef444433'}`,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {rule.isEnabled ? 'ACTIVE' : 'DISABLED'}
                        </button>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setRuleForm({
                                ruleName: rule.ruleName,
                                routePattern: rule.routePattern,
                                priority: rule.priority,
                                cacheTier: rule.cacheTier,
                                ttlSeconds: rule.ttlSeconds,
                                swrSeconds: rule.swrSeconds,
                                cacheTags: rule.cacheTags.join(', '),
                                bypassOnAuth: rule.bypassOnAuth,
                                bypassMethods: rule.bypassMethods.join(', '),
                                isEnabled: rule.isEnabled,
                              });
                              setRuleModalOpen(true);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB C: CACHE INVALIDATION & PURGE LOG */}
      {subTab === 'purge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Purge ID</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Targets</th>
                  <th style={{ padding: '12px 16px' }}>Justification Reason</th>
                  <th style={{ padding: '12px 16px' }}>PoPs Reached</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {purgeLogs.map((purge) => (
                  <tr
                    key={purge.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#e2e8f0',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#94a3b8' }}>
                      {purge.id}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: purge.purgeType === 'purge_all' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: purge.purgeType === 'purge_all' ? '#f87171' : '#60a5fa',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {purge.purgeType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {purge.targets.map((t) => (
                          <code
                            key={t}
                            style={{
                              background: 'rgba(0, 0, 0, 0.35)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#e2e8f0',
                            }}
                          >
                            {t}
                          </code>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                      {purge.reason}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 600 }}>
                      {purge.nodesAffected} Nodes
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          fontWeight: 600,
                        }}
                      >
                        {purge.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(purge.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB D: CDN EDGE SIMULATOR */}
      {subTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#60a5fa" />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                Simulate CDN Edge Request
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Test how the Multi-Region Anycast Edge evaluates your route against deployed caching rules,
              stale-while-revalidate policies, and HTTP bypass conditions.
            </p>

            <form onSubmit={handleSimulateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Request Route Path
                </label>
                <input
                  id="input-sim-route"
                  type="text"
                  value={simRoute}
                  onChange={(e) => setSimRoute(e.target.value)}
                  placeholder="/api/v1/status or /assets/logo.png"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    HTTP Method
                  </label>
                  <select
                    id="select-sim-method"
                    value={simMethod}
                    onChange={(e) => setSimMethod(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      marginTop: '16px',
                    }}
                  >
                    <input
                      id="checkbox-sim-auth"
                      type="checkbox"
                      checked={simAuthHeader}
                      onChange={(e) => setSimAuthHeader(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    Include Bearer Token
                  </label>
                </div>
              </div>

              <button
                id="btn-run-simulation"
                type="submit"
                disabled={simulating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <Play size={14} />
                {simulating ? 'Evaluating Edge...' : 'Execute Edge Simulation'}
              </button>
            </form>
          </div>

          {/* Simulation Output Inspector */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                  CDN Edge Decision Engine
                </h3>
              </div>
              {simResult && (
                <span
                  id="sim-decision-pill"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    background: simResult.cacheDecision === 'HIT' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                    color: simResult.cacheDecision === 'HIT' ? '#22c55e' : '#eab308',
                    border: `1px solid ${simResult.cacheDecision === 'HIT' ? '#22c55e33' : '#eab30833'}`,
                  }}
                >
                  {simResult.cacheDecision}
                </span>
              )}
            </div>

            {simResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: '#94a3b8' }}>Matched Rule:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {simResult.matchedRule ? simResult.matchedRule.ruleName : 'No rule (Pass-through)'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Effective TTL:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#10b981' }}>
                      {simResult.effectiveTtlSeconds}s
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Origin Shield:</span>{' '}
                    <span style={{ fontWeight: 600, color: simResult.originShielded ? '#38bdf8' : '#fb923c' }}>
                      {simResult.originShielded ? 'Active (Shielded)' : 'Bypass (Direct Origin)'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Serving PoP:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {simResult.simulatedNode.nodeCode} ({simResult.simulatedNode.region})
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Emitted Response Headers
                  </div>
                  <div
                    style={{
                      background: 'rgba(0, 0, 0, 0.45)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      color: '#cbd5e1',
                    }}
                  >
                    {Object.entries(simResult.responseHeaders).map(([key, val]) => (
                      <div key={key}>
                        <span style={{ color: '#38bdf8' }}>{key}</span>: {val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                No simulation executed yet. Fill out the route form and click "Execute Edge Simulation".
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB E: TRAFFIC & METRICS */}
      {subTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(0, 0, 0, 0.3)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Hour Bucket</th>
                  <th style={{ padding: '12px 16px' }}>Total Requests</th>
                  <th style={{ padding: '12px 16px' }}>Cache Hits</th>
                  <th style={{ padding: '12px 16px' }}>Misses</th>
                  <th style={{ padding: '12px 16px' }}>Bypasses</th>
                  <th style={{ padding: '12px 16px' }}>Bandwidth</th>
                  <th style={{ padding: '12px 16px' }}>Origin Offload</th>
                  <th style={{ padding: '12px 16px' }}>p95 Latency</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      color: '#e2e8f0',
                    }}
                  >
                    <td style={{ padding: '14px 16px', color: '#94a3b8' }}>
                      {new Date(m.timeBucket).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {m.totalRequests.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 600 }}>
                      {m.cacheHits.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#eab308' }}>
                      {m.cacheMisses.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>
                      {m.cacheBypasses.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {(m.bandwidthBytes / (1024 * 1024)).toFixed(1)} MB
                    </td>
                    <td style={{ padding: '14px 16px', color: '#38bdf8', fontWeight: 600 }}>
                      {m.originOffloadPercent}%
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e2e8f0' }}>
                      {m.p95LatencyMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MODALS */}

      {/* MODAL 1: DEPLOY / EDIT CACHE RULE */}
      {ruleModalOpen && (
        <div
          id="modal-configure-rule"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>
                {editingRule ? 'Edit Caching Rule' : 'Deploy CDN Caching Rule'}
              </h3>
              <button
                onClick={() => setRuleModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  value={ruleForm.ruleName}
                  onChange={(e) => setRuleForm({ ...ruleForm, ruleName: e.target.value })}
                  placeholder="e.g. Public Brand Assets"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Route Pattern (Must start with "/")
                </label>
                <input
                  type="text"
                  value={ruleForm.routePattern}
                  onChange={(e) => setRuleForm({ ...ruleForm, routePattern: e.target.value })}
                  placeholder="e.g. /assets/* or /api/v1/public/*"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    TTL (Seconds)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.ttlSeconds}
                    onChange={(e) => setRuleForm({ ...ruleForm, ttlSeconds: Number(e.target.value) })}
                    min="0"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    SWR (Stale-While-Revalidate)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.swrSeconds}
                    onChange={(e) => setRuleForm({ ...ruleForm, swrSeconds: Number(e.target.value) })}
                    min="0"
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Cache Tags (comma-separated for fast bulk invalidation)
                </label>
                <input
                  type="text"
                  value={ruleForm.cacheTags}
                  onChange={(e) => setRuleForm({ ...ruleForm, cacheTags: e.target.value })}
                  placeholder="assets, branding, static"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ruleForm.bypassOnAuth}
                    onChange={(e) => setRuleForm({ ...ruleForm, bypassOnAuth: e.target.checked })}
                  />
                  Bypass on Authorization Header
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={ruleForm.isEnabled}
                    onChange={(e) => setRuleForm({ ...ruleForm, isEnabled: e.target.checked })}
                  />
                  Rule Active
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {editingRule ? 'Save Changes' : 'Deploy Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DISPATCH PURGE */}
      {purgeModalOpen && (
        <div
          id="modal-purge-cache"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} color="#ef4444" />
                <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', fontWeight: 600 }}>
                  Dispatch Cache Invalidation
                </h3>
              </div>
              <button
                onClick={() => setPurgeModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecutePurge} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Purge Scope / Type
                </label>
                <select
                  value={purgeType}
                  onChange={(e) => setPurgeType(e.target.value as EdgePurgeType)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                >
                  <option value="tag">By Cache Tag (Recommended)</option>
                  <option value="url">By Exact URL Path</option>
                  <option value="wildcard">By Wildcard Pattern (*)</option>
                  <option value="purge_all">Global Purge (All Cache)</option>
                </select>
              </div>

              {purgeType !== 'purge_all' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    Targets (comma-separated tags or URLs)
                  </label>
                  <input
                    type="text"
                    value={purgeTargets}
                    onChange={(e) => setPurgeTargets(e.target.value)}
                    placeholder={purgeType === 'tag' ? 'branding, white-label' : '/api/v1/status*'}
                    required
                    style={{
                      width: '100%',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                  Operational Justification (Mandatory audit log reason)
                </label>
                <input
                  type="text"
                  value={purgeReason}
                  onChange={(e) => setPurgeReason(e.target.value)}
                  placeholder="e.g. Asset brand logo refresh deployment"
                  required
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f8fafc',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setPurgeModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purging}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {purging ? 'Purging Nodes...' : 'Invalidate Edge Cache'}
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
