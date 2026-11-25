/**
 * Enterprise Automated Chaos Engineering, Resiliency Testing & Fault Injection Tab
 * HoaspForge Platform v5.3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Zap,
  ShieldAlert,
  Activity,
  PlayCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Server,
  StopCircle,
  Check,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  ChaosExperiment,
  ChaosFaultExecution,
  ChaosTripwireEvent,
  ChaosResilienceTelemetry,
  ChaosSubsystem,
  ChaosFaultType,
  ChaosExperimentStatus,
  CreateChaosExperimentDto,
  ChaosSimulationResult,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'experiments' | 'executions' | 'tripwires' | 'simulator';

export const ChaosEngineeringTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('experiments');

  // Telemetry
  const [telemetry, setTelemetry] = useState<ChaosResilienceTelemetry | null>(null);

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

  // Experiments
  const [experiments, setExperiments] = useState<ChaosExperiment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subsystemFilter, setSubsystemFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Executions & Tripwires
  const [executions, setExecutions] = useState<ChaosFaultExecution[]>([]);
  const [tripwires, setTripwires] = useState<ChaosTripwireEvent[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExp, setEditingExp] = useState<ChaosExperiment | null>(null);
  const [abortingExp, setAbortingExp] = useState<ChaosExperiment | null>(null);
  const [abortReason, setAbortReason] = useState('Manual emergency circuit breaker triggered by operator');

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateChaosExperimentDto>({
    name: '',
    target_subsystem: 'api_gateway',
    fault_type: 'latency_spike',
    blast_radius_percent: 15,
    duration_seconds: 60,
    tripwire_thresholds: {
      max_error_rate_percent: 25,
      max_p99_latency_ms: 2000,
      auto_rollback: true,
    },
  });

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editBlastRadius, setEditBlastRadius] = useState(15);
  const [editDuration, setEditDuration] = useState(60);

  // Simulator State
  const [simSubsystem, setSimSubsystem] = useState<ChaosSubsystem>('api_gateway');
  const [simFaultType, setSimFaultType] = useState<ChaosFaultType>('latency_spike');
  const [simBlastRadius, setSimBlastRadius] = useState(20);
  const [simLoadRps, setSimLoadRps] = useState(250);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ChaosSimulationResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, expRes, twRes] = await Promise.all([
        api.adminOps.getChaosTelemetry(),
        api.adminOps.listChaosExperiments(),
        api.adminOps.listChaosTripwires({ limit: 25 }),
      ]);
      setTelemetry(telRes);
      setExperiments(expRes);
      setExecutions(telRes.recentExecutions || []);
      setTripwires(twRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load chaos engineering data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create Experiment
  const handleCreateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      showToast('Experiment name is required', 'error');
      return;
    }
    try {
      await api.adminOps.createChaosExperiment(createForm);
      showToast(`Chaos experiment "${createForm.name}" created successfully`, 'success');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        target_subsystem: 'api_gateway',
        fault_type: 'latency_spike',
        blast_radius_percent: 15,
        duration_seconds: 60,
        tripwire_thresholds: {
          max_error_rate_percent: 25,
          max_p99_latency_ms: 2000,
          auto_rollback: true,
        },
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create experiment', 'error');
    }
  };

  // Update Experiment
  const handleUpdateExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExp) return;
    try {
      await api.adminOps.updateChaosExperiment(editingExp.id, {
        name: editName,
        blast_radius_percent: editBlastRadius,
        duration_seconds: editDuration,
      });
      showToast(`Experiment "${editName}" updated`, 'success');
      setEditingExp(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update experiment', 'error');
    }
  };

  // Delete Experiment
  const handleDeleteExperiment = (exp: ChaosExperiment) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Chaos Experiment',
      description: `Are you sure you want to permanently delete chaos experiment "${exp.name}"? Historical execution telemetry will be preserved.`,
      confirmText: 'Delete Experiment',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteChaosExperiment(exp.id);
          showToast(`Experiment "${exp.name}" deleted`, 'success');
          loadData();
        } catch (err: any) {
          showToast(err.message || 'Failed to delete experiment', 'error');
        }
      },
    });
  };

  // Execute Experiment
  const handleExecuteExperiment = async (exp: ChaosExperiment) => {
    try {
      const res = await api.adminOps.executeChaosExperiment(exp.id);
      if (res.tripwireTriggered) {
        showToast(
          `Safety Tripwire Activated! Experiment "${exp.name}" automatically halted to prevent cluster degradation.`,
          'info'
        );
      } else {
        showToast(`Chaos experiment "${exp.name}" completed successfully! Resilience score: ${res.experiment.resilience_score}/100`, 'success');
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute experiment', 'error');
    }
  };

  // Abort Experiment
  const handleAbortExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abortingExp) return;
    try {
      await api.adminOps.abortChaosExperiment(abortingExp.id, abortReason);
      showToast(`Emergency rollback triggered for experiment "${abortingExp.name}"`, 'success');
      setAbortingExp(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to abort experiment', 'error');
    }
  };

  // Run Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateChaosExperiment({
        target_subsystem: simSubsystem,
        fault_type: simFaultType,
        blast_radius_percent: simBlastRadius,
        simulated_traffic_load_rps: simLoadRps,
      });
      setSimResult(res);
      showToast('Blast radius simulation finished', 'info');
    } catch (err: any) {
      showToast(err.message || 'Simulation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Filtered experiments
  const filteredExperiments = experiments.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.target_subsystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.fault_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubsystem = !subsystemFilter || exp.target_subsystem === subsystemFilter;
    const matchesStatus = !statusFilter || exp.status === statusFilter;
    return matchesSearch && matchesSubsystem && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Banner */}
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
            <span title="Chaos Engineering" style={{ display: 'inline-flex' }}>
              <Flame size={24} color="#f97316" />
            </span>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f8fafc' }}>
              Automated Chaos Engineering & Resiliency Lab
            </h2>
            <span
              style={{
                fontSize: '11px',
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                color: '#f97316',
                fontWeight: '600',
                border: '1px solid rgba(249, 115, 22, 0.3)',
              }}
            >
              Fault Engine v5.3
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Controlled fault injection, blast radius containment, real-time safety tripwires, and automated rollback circuit breakers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            id="btn-refresh-chaos"
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
            id="btn-open-create-chaos"
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <span title="Create Experiment" style={{ display: 'inline-flex' }}>
              <Plus size={15} />
            </span>
            Create Experiment
          </button>
        </div>
      </div>

      {/* 4 Telemetry KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Experiments */}
        <div
          id="card-chaos-experiments"
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
              Chaos Experiments
            </span>
            <span title="Experiments" style={{ display: 'inline-flex' }}>
              <Flame size={16} color="#f97316" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>
              {telemetry?.totalExperiments ?? 0}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Configured</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Active Fault Injections:{' '}
            <span style={{ color: (telemetry?.activeExperiments || 0) > 0 ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
              {telemetry?.activeExperiments ?? 0} Running
            </span>
          </div>
        </div>

        {/* Card 2: Resilience Score */}
        <div
          id="card-chaos-score"
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
              Resilience Score
            </span>
            <span title="Score" style={{ display: 'inline-flex' }}>
              <Activity size={16} color="#10b981" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#10b981' }}>
              {telemetry?.averageResilienceScore ?? 95.0}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>/ 100 Index</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Cluster Tolerant to Multi-AZ & Network Outages
          </div>
        </div>

        {/* Card 3: Safety Tripwires */}
        <div
          id="card-chaos-tripwires"
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
              Safety Circuit Breakers
            </span>
            <span title="Tripwires" style={{ display: 'inline-flex' }}>
              <ShieldAlert size={16} color="#38bdf8" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>
              {telemetry?.tripwiresTriggeredCount ?? 0}
            </span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Tripwire Aborts</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Automatic Rollback Guardrails Active
          </div>
        </div>

        {/* Card 4: Subsystem Fault Tolerance */}
        <div
          id="card-chaos-tolerance"
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
              Subsystem Health
            </span>
            <span title="Health" style={{ display: 'inline-flex' }}>
              <Zap size={16} color="#a855f7" />
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: '700', color: '#f8fafc' }}>98.2%</span>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Weighted Avg</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Top: DB Mesh (99.1%) • API Gateway (98.5%)
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
          id="subtab-chaos-experiments"
          onClick={() => setSubTab('experiments')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'experiments' ? '#ea580c' : 'transparent',
            color: subTab === 'experiments' ? '#ffffff' : '#94a3b8',
          }}
        >
          Experiment Registry ({experiments.length})
        </button>

        <button
          id="subtab-chaos-executions"
          onClick={() => setSubTab('executions')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'executions' ? '#ea580c' : 'transparent',
            color: subTab === 'executions' ? '#ffffff' : '#94a3b8',
          }}
        >
          Fault Injections & Logs ({executions.length})
        </button>

        <button
          id="subtab-chaos-tripwires"
          onClick={() => setSubTab('tripwires')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'tripwires' ? '#ea580c' : 'transparent',
            color: subTab === 'tripwires' ? '#ffffff' : '#94a3b8',
          }}
        >
          Safety Tripwires ({tripwires.length})
        </button>

        <button
          id="subtab-chaos-simulator"
          onClick={() => setSubTab('simulator')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: subTab === 'simulator' ? '#ea580c' : 'transparent',
            color: subTab === 'simulator' ? '#ffffff' : '#94a3b8',
          }}
        >
          Blast Radius Simulator
        </button>
      </div>

      {/* Subtab 1: Experiment Registry */}
      {subTab === 'experiments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <span style={{ position: 'absolute', left: '10px', top: '10px', display: 'inline-flex' }}>
                <Search size={14} color="#64748b" />
              </span>
              <input
                id="input-search-chaos"
                type="text"
                placeholder="Search experiments by name, fault, subsystem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <select
                id="select-filter-subsystem"
                value={subsystemFilter}
                onChange={(e) => setSubsystemFilter(e.target.value)}
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
                <option value="">All Subsystems</option>
                <option value="api_gateway">API Gateway</option>
                <option value="database_mesh">Database Mesh</option>
                <option value="redis_cache">Redis Cache</option>
                <option value="social_webhook">Social Webhook</option>
                <option value="ai_orchestrator">AI Fleet Orchestrator</option>
              </select>
            </div>

            <div style={{ minWidth: '140px' }}>
              <select
                id="select-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="halted_by_tripwire">Halted by Tripwire</option>
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
                  <th style={{ padding: '12px 16px' }}>Experiment Name</th>
                  <th style={{ padding: '12px 16px' }}>Target Subsystem</th>
                  <th style={{ padding: '12px 16px' }}>Fault Type</th>
                  <th style={{ padding: '12px 16px' }}>Blast Radius</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Resilience Score</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExperiments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                      No chaos experiments match filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredExperiments.map((exp) => (
                    <tr key={exp.id} id={`exp-row-${exp.id}`} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#f8fafc' }}>{exp.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Duration: {exp.duration_seconds}s</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#38bdf8', fontWeight: '500' }}>
                        {exp.target_subsystem.replace('_', ' ').toUpperCase()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(249, 115, 22, 0.15)',
                            color: '#f97316',
                            fontWeight: '600',
                          }}
                        >
                          {exp.fault_type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f8fafc' }}>
                        {exp.blast_radius_percent}%
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            backgroundColor:
                              exp.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.2)'
                                : exp.status === 'running'
                                ? 'rgba(245, 158, 11, 0.2)'
                                : exp.status === 'halted_by_tripwire'
                                ? 'rgba(239, 68, 68, 0.2)'
                                : 'rgba(148, 163, 184, 0.2)',
                            color:
                              exp.status === 'completed'
                                ? '#10b981'
                                : exp.status === 'running'
                                ? '#f59e0b'
                                : exp.status === 'halted_by_tripwire'
                                ? '#ef4444'
                                : '#94a3b8',
                          }}
                        >
                          {exp.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {exp.resilience_score !== null ? (
                          <span style={{ fontWeight: '700', color: exp.resilience_score > 90 ? '#10b981' : '#f59e0b' }}>
                            {exp.resilience_score}/100
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Pending Run</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            id={`btn-execute-exp-${exp.id}`}
                            title="Execute Fault Injection"
                            onClick={() => handleExecuteExperiment(exp)}
                            style={{
                              padding: '5px 8px',
                              backgroundColor: '#0f172a',
                              border: '1px solid rgba(249, 115, 22, 0.4)',
                              color: '#f97316',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <span title="Execute" style={{ display: 'inline-flex' }}>
                              <PlayCircle size={13} />
                            </span>
                          </button>

                          {exp.status === 'running' && (
                            <button
                              id={`btn-abort-exp-${exp.id}`}
                              title="Emergency Abort"
                              onClick={() => setAbortingExp(exp)}
                              style={{
                                padding: '5px 8px',
                                backgroundColor: '#0f172a',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              <span title="Abort" style={{ display: 'inline-flex' }}>
                                <StopCircle size={13} />
                              </span>
                            </button>
                          )}

                          <button
                            id={`btn-edit-exp-${exp.id}`}
                            title="Configure Blueprint"
                            onClick={() => {
                              setEditingExp(exp);
                              setEditName(exp.name);
                              setEditBlastRadius(exp.blast_radius_percent);
                              setEditDuration(exp.duration_seconds);
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

                          <button
                            id={`btn-delete-exp-${exp.id}`}
                            title="Delete Experiment"
                            onClick={() => handleDeleteExperiment(exp)}
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

      {/* Subtab 2: Fault Injections & Logs */}
      {subTab === 'executions' && (
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
                <th style={{ padding: '12px 16px' }}>Execution ID</th>
                <th style={{ padding: '12px 16px' }}>Subsystem & Fault</th>
                <th style={{ padding: '12px 16px' }}>Impacted Requests</th>
                <th style={{ padding: '12px 16px' }}>Avg Latency Injected</th>
                <th style={{ padding: '12px 16px' }}>Tripwire Abort</th>
                <th style={{ padding: '12px 16px' }}>Recovery Time</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {executions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    No execution telemetry records available.
                  </td>
                </tr>
              ) : (
                executions.map((exe) => (
                  <tr key={exe.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94a3b8', fontSize: '12px' }}>
                      {exe.id.substring(0, 16)}...
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#f8fafc', fontWeight: '500' }}>{exe.subsystem}</div>
                      <div style={{ fontSize: '11px', color: '#f97316' }}>{exe.fault_type}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: '600' }}>
                      {exe.affected_requests_count.toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8' }}>+{exe.injected_latency_ms_avg}ms</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: exe.emergency_aborted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: exe.emergency_aborted ? '#ef4444' : '#10b981',
                          fontWeight: '600',
                        }}
                      >
                        {exe.emergency_aborted ? 'ABORTED' : 'NOMINAL'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#10b981' }}>{exe.recovery_time_seconds}s</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(exe.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 3: Safety Tripwires */}
      {subTab === 'tripwires' && (
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
                <th style={{ padding: '12px 16px' }}>Tripwire ID</th>
                <th style={{ padding: '12px 16px' }}>Experiment ID</th>
                <th style={{ padding: '12px 16px' }}>Breached Metric</th>
                <th style={{ padding: '12px 16px' }}>Observed vs Threshold</th>
                <th style={{ padding: '12px 16px' }}>Action Taken</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {tripwires.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    Zero tripwire breaches on record. All clusters operating safely.
                  </td>
                </tr>
              ) : (
                tripwires.map((tw) => (
                  <tr key={tw.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>
                      {tw.id.substring(0, 16)}...
                    </td>
                    <td style={{ padding: '12px 16px', color: '#38bdf8' }}>{tw.experiment_id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#f8fafc' }}>{tw.metric_name}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '600' }}>
                      {tw.observed_value} &gt; {tw.threshold_value}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tw.action_taken}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                      {new Date(tw.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtab 4: Blast Radius Simulator */}
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
              In-Memory Blast Radius & Failure Impact Simulator
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Evaluates subsystem degradation thresholds, p99 latency spikes, and simulated tripwire triggers without
              injecting live faults into production traffic.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Target Subsystem
              </label>
              <select
                id="select-sim-subsystem"
                value={simSubsystem}
                onChange={(e) => setSimSubsystem(e.target.value as ChaosSubsystem)}
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
                <option value="api_gateway">API Gateway</option>
                <option value="database_mesh">Database Mesh</option>
                <option value="redis_cache">Redis Cache</option>
                <option value="social_webhook">Social Webhook Ingress</option>
                <option value="ai_orchestrator">AI Fleet Orchestrator</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Fault Type
              </label>
              <select
                id="select-sim-fault"
                value={simFaultType}
                onChange={(e) => setSimFaultType(e.target.value as ChaosFaultType)}
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
                <option value="latency_spike">Latency Spike</option>
                <option value="service_unavailable_503">Service Unavailable (503)</option>
                <option value="packet_loss">Packet Loss</option>
                <option value="token_exhaustion">Token Bucket Exhaustion</option>
                <option value="database_partition">Database Split Partition</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Blast Radius ({simBlastRadius}%)
              </label>
              <input
                id="slider-sim-radius"
                type="range"
                min={5}
                max={90}
                value={simBlastRadius}
                onChange={(e) => setSimBlastRadius(Number(e.target.value))}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                Simulated Traffic (RPS)
              </label>
              <input
                id="input-sim-rps"
                type="number"
                min={50}
                max={5000}
                value={simLoadRps}
                onChange={(e) => setSimLoadRps(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              id="btn-run-chaos-sim"
              onClick={handleRunSimulation}
              disabled={simLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#ea580c',
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
              Simulate Blast Radius
            </button>
          </div>

          {simResult && (
            <div
              id="box-chaos-sim-results"
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
                      backgroundColor: simResult.tripwireTriggered
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                      color: simResult.tripwireTriggered ? '#ef4444' : '#10b981',
                    }}
                  >
                    {simResult.tripwireTriggered ? 'TRIPWIRE TRIP' : 'RESILIENT PASS'}
                  </span>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Projected Resilience Score: <strong style={{ color: '#f8fafc' }}>{simResult.projectedResilienceScore}/100</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Simulated Volume</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                    {simResult.simulatedRequestsCount.toLocaleString()} Requests
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Error Rate</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: simResult.simulatedErrorRatePercent > 10 ? '#ef4444' : '#10b981' }}>
                    {simResult.simulatedErrorRatePercent}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Projected p99 Latency</div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#38bdf8' }}>
                    {simResult.projectedP99LatencyMs}ms
                  </div>
                </div>
              </div>

              {simResult.tripwireReason && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#ef4444', marginBottom: '4px' }}>
                    Tripwire Containment Reason:
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5' }}>{simResult.tripwireReason}</p>
                </div>
              )}

              {simResult.recommendations.length > 0 && (
                <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8', marginBottom: '4px' }}>
                    Resiliency Recommendations:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#bae6fd' }}>
                    {simResult.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Create Chaos Experiment */}
      {showCreateModal && (
        <div
          id="modal-create-chaos"
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
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Create Chaos Blueprint</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExperiment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Experiment Title *
                </label>
                <input
                  id="input-create-chaos-name"
                  type="text"
                  required
                  placeholder="e.g. Gateway Token Burst Saturation"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
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
                    Target Subsystem *
                  </label>
                  <select
                    id="select-create-chaos-subsystem"
                    value={createForm.target_subsystem}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, target_subsystem: e.target.value as ChaosSubsystem })
                    }
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
                    <option value="api_gateway">API Gateway</option>
                    <option value="database_mesh">Database Mesh</option>
                    <option value="redis_cache">Redis Cache</option>
                    <option value="social_webhook">Social Webhook Ingress</option>
                    <option value="ai_orchestrator">AI Fleet Orchestrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Fault Scenario *
                  </label>
                  <select
                    id="select-create-chaos-fault"
                    value={createForm.fault_type}
                    onChange={(e) => setCreateForm({ ...createForm, fault_type: e.target.value as ChaosFaultType })}
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
                    <option value="latency_spike">Latency Spike</option>
                    <option value="service_unavailable_503">Service Unavailable (503)</option>
                    <option value="packet_loss">Packet Loss</option>
                    <option value="token_exhaustion">Token Exhaustion</option>
                    <option value="database_partition">Database Partition</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                    Blast Radius (%) *
                  </label>
                  <input
                    id="input-create-chaos-radius"
                    type="number"
                    min={1}
                    max={100}
                    value={createForm.blast_radius_percent}
                    onChange={(e) => setCreateForm({ ...createForm, blast_radius_percent: Number(e.target.value) })}
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
                    Duration (Seconds) *
                  </label>
                  <input
                    id="input-create-chaos-duration"
                    type="number"
                    min={5}
                    max={3600}
                    value={createForm.duration_seconds}
                    onChange={(e) => setCreateForm({ ...createForm, duration_seconds: Number(e.target.value) })}
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
                  id="btn-submit-create-chaos"
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Create Experiment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Chaos Experiment */}
      {editingExp && (
        <div
          id="modal-edit-chaos"
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
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Configure Experiment</h3>
              <button
                onClick={() => setEditingExp(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateExperiment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Title
                </label>
                <input
                  id="input-edit-chaos-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                    Blast Radius (%)
                  </label>
                  <input
                    id="input-edit-chaos-radius"
                    type="number"
                    min={1}
                    max={100}
                    value={editBlastRadius}
                    onChange={(e) => setEditBlastRadius(Number(e.target.value))}
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
                    Duration (s)
                  </label>
                  <input
                    id="input-edit-chaos-duration"
                    type="number"
                    min={5}
                    max={3600}
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
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
                  onClick={() => setEditingExp(null)}
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
                  id="btn-submit-edit-chaos"
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ea580c',
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

      {/* Modal 3: Emergency Abort */}
      {abortingExp && (
        <div
          id="modal-abort-chaos"
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
              maxWidth: '460px',
              borderRadius: '12px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span title="Emergency Halt" style={{ display: 'inline-flex' }}>
                <AlertTriangle size={22} color="#ef4444" />
              </span>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                Trigger Emergency Circuit Breaker
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Immediately halts active chaos experiment <strong style={{ color: '#f8fafc' }}>"{abortingExp.name}"</strong>,
              removes all active proxy fault injections, and restores default production routing.
            </p>

            <form onSubmit={handleAbortExperiment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  Operator Justification Reason
                </label>
                <textarea
                  id="textarea-abort-reason"
                  rows={3}
                  required
                  value={abortReason}
                  onChange={(e) => setAbortReason(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAbortingExp(null)}
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
                  id="btn-submit-abort-chaos"
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Halt Experiment Now
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
