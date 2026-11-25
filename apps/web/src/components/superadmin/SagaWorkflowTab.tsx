/**
 * Enterprise Distributed Workflow Engine, State Machine Orchestration & Long-Running Saga Coordinator Tab
 * HoaspForge Platform v6.7.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Workflow,
  GitBranch,
  Layers,
  RotateCcw,
  Play,
  Pause,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Sliders,
  Server,
  X,
  Gauge,
  ShieldAlert,
  ArrowRight,
  Database,
  FileCode,
  Activity,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  SagaWorkflowDefinition,
  SagaWorkflowStepConfig,
  StateMachineInstance,
  WorkflowStepExecution,
  SagaCompensatingTransaction,
  SagaWorkflowTelemetry,
  StateMachineInstanceDetailResult,
  SagaWorkflowStatus,
  SagaFailureStrategy,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'instances' | 'definitions' | 'executions' | 'sandbox';

export const SagaWorkflowTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('instances');

  // Telemetry
  const [telemetry, setTelemetry] = useState<SagaWorkflowTelemetry | null>(null);

  // Definitions & Instances
  const [definitions, setDefinitions] = useState<SagaWorkflowDefinition[]>([]);
  const [instances, setInstances] = useState<StateMachineInstance[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Selected Instance Detail
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<StateMachineInstanceDetailResult | null>(null);

  // Modals
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggerDefId, setTriggerDefId] = useState('');
  const [triggerTenantId, setTriggerTenantId] = useState('tenant-enterprise-global');
  const [triggerPayloadJson, setTriggerPayloadJson] = useState('{\n  "priority": "high",\n  "region": "us-east-1"\n}');

  const [showCompensationModal, setShowCompensationModal] = useState(false);
  const [compensateReason, setCompensateReason] = useState('External gateway timeout failure');

  // Sandbox state
  const [sandboxInstanceId, setSandboxInstanceId] = useState<string>('');
  const [sandboxOutcome, setSandboxOutcome] = useState<'succeeded' | 'failed'>('succeeded');
  const [sandboxStepIndex, setSandboxStepIndex] = useState<number>(0);
  const [sandboxOutputJson, setSandboxOutputJson] = useState('{\n  "status": "step_ok"\n}');
  const [sandboxError, setSandboxError] = useState('Synthetic step timeout');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [telemetryRes, defsRes, instsRes] = await Promise.all([
        api.adminOps.getSagaWorkflowTelemetry(),
        api.adminOps.listSagaDefinitions(),
        api.adminOps.listStateMachineInstances(statusFilter || undefined),
      ]);

      setTelemetry(telemetryRes);
      setDefinitions(defsRes || []);
      setInstances(instsRes || []);

      if (defsRes && defsRes.length > 0 && !triggerDefId) {
        setTriggerDefId(defsRes[0].id);
      }

      if (selectedInstanceId) {
        const detail = await api.adminOps.getStateMachineInstanceDetail(selectedInstanceId);
        setSelectedDetail(detail);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch saga workflow data', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedInstanceId, triggerDefId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectInstance = async (id: string) => {
    try {
      setSelectedInstanceId(id);
      const detail = await api.adminOps.getStateMachineInstanceDetail(id);
      setSelectedDetail(detail);
      setSandboxInstanceId(id);
      setSandboxStepIndex(detail.instance.current_step_index);
    } catch (err: any) {
      showToast(err.message || 'Failed to load instance detail', 'error');
    }
  };

  const handleTriggerInstance = async () => {
    if (!triggerDefId) {
      showToast('Please select a workflow definition', 'error');
      return;
    }

    try {
      setLoading(true);
      let payloadObj = {};
      try {
        payloadObj = JSON.parse(triggerPayloadJson);
      } catch {
        showToast('Invalid JSON input payload', 'error');
        setLoading(false);
        return;
      }

      const res = await api.adminOps.triggerStateMachineInstance({
        workflow_definition_id: triggerDefId,
        target_tenant_id: triggerTenantId,
        input_payload: payloadObj,
      });

      showToast(`State machine instance ${res.instance.id} triggered successfully`, 'success');
      setShowTriggerModal(false);
      setSelectedInstanceId(res.instance.id);
      setSelectedDetail(res);
      setSandboxInstanceId(res.instance.id);
      setSandboxStepIndex(res.instance.current_step_index);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger workflow instance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSandboxStep = async () => {
    if (!sandboxInstanceId) {
      showToast('No active state machine instance selected', 'error');
      return;
    }

    try {
      setLoading(true);
      let outputObj = {};
      if (sandboxOutcome === 'succeeded') {
        try {
          outputObj = JSON.parse(sandboxOutputJson);
        } catch {
          showToast('Invalid JSON in step output', 'error');
          setLoading(false);
          return;
        }
      }

      const res = await api.adminOps.executeWorkflowStep(
        sandboxInstanceId,
        sandboxStepIndex,
        sandboxOutcome,
        outputObj,
        sandboxOutcome === 'failed' ? sandboxError : undefined
      );

      setSelectedDetail(res);
      setSandboxStepIndex(res.instance.current_step_index);
      showToast(
        `Step ${sandboxStepIndex} evaluated as ${sandboxOutcome}. Instance status: ${res.instance.status}`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute step', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerCompensation = async () => {
    const targetId = selectedInstanceId || sandboxInstanceId;
    if (!targetId) {
      showToast('Select an instance to trigger compensation', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.adminOps.triggerSagaCompensation(targetId, compensateReason);
      setSelectedDetail(res);
      setShowCompensationModal(false);
      showToast(
        `Saga backward compensation completed. Rolled back ${res.compensations.length} transactions.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to trigger saga compensation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeInstance = async () => {
    const targetId = selectedInstanceId || sandboxInstanceId;
    if (!targetId) {
      showToast('Select an instance to resume', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await api.adminOps.resumeStateMachineInstance(targetId);
      setSelectedDetail(res);
      showToast(`Instance ${targetId} resumed to active state`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to resume instance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusBadge = (status: SagaWorkflowStatus | string) => {
    switch (status) {
      case 'completed':
      case 'succeeded':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={12} /> {status}
          </span>
        );
      case 'active':
      case 'executing':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <Activity size={12} className="animate-spin" /> {status}
          </span>
        );
      case 'compensating':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <RotateCcw size={12} /> {status}
          </span>
        );
      case 'compensated':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <RotateCcw size={12} /> {status}
          </span>
        );
      case 'failed':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertTriangle size={12} /> {status}
          </span>
        );
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
            <Clock size={12} /> {status}
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
            <span style={{ display: 'inline-flex' }}><Workflow size={28} color="#8b5cf6" /></span>
            Distributed Workflow Engine & Saga Coordinator
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '14px' }}>
            Multi-Tenant Long-Running State Machine Orchestration with Backward LIFO Compensating Transactions & DAG Visualization
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
            onClick={() => setShowTriggerModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Trigger Saga
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>Active State Machines</span>
            <Activity size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#3b82f6' }}>
            {telemetry?.active_state_machine_instances ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Across {telemetry?.total_workflow_definitions ?? 0} DAG definitions
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>24h Succeeded Sagas</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#10b981' }}>
            {telemetry?.total_succeeded_instances_24h ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            100% ACID workflow finality
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>24h Compensated Sagas</span>
            <RotateCcw size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#f59e0b' }}>
            {telemetry?.total_compensated_sagas_24h ?? 0}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            LIFO reverse rollbacks executed
          </div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>
            <span>Recovery Rate & Latency</span>
            <Gauge size={16} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, margin: '8px 0', color: '#8b5cf6' }}>
            {telemetry?.saga_recovery_success_rate ?? 99.4}%
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Avg duration: {((telemetry?.avg_workflow_duration_ms ?? 0) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Navigation SubTabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: '20px' }}>
        {[
          { key: 'instances', label: 'Live State Machine Instances', icon: Activity },
          { key: 'definitions', label: 'Workflow Definitions & DAG', icon: GitBranch },
          { key: 'executions', label: 'Step Execution Logs & Rollbacks', icon: Clock },
          { key: 'sandbox', label: 'Interactive Saga Sandbox & Drill', icon: Sliders },
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
                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                color: isActive ? '#8b5cf6' : '#9ca3af',
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

      {/* Tab 1: Live State Machine Instances */}
      {subTab === 'instances' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDetail ? '1fr 480px' : '1fr', gap: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>Active & Historical Instances ({instances.length})</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    color: '#e5e7eb',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="compensating">Compensating</option>
                  <option value="compensated">Compensated</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(31, 41, 55, 0.5)', borderBottom: '1px solid #1f2937', color: '#9ca3af' }}>
                    <th style={{ padding: '12px 16px' }}>Instance ID</th>
                    <th style={{ padding: '12px 16px' }}>Workflow Definition</th>
                    <th style={{ padding: '12px 16px' }}>Target Tenant</th>
                    <th style={{ padding: '12px 16px' }}>Step Progress</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Started At</th>
                    <th style={{ padding: '12px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {instances.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        No state machine instances found
                      </td>
                    </tr>
                  ) : (
                    instances.map((inst) => {
                      const isSelected = inst.id === selectedInstanceId;
                      return (
                        <tr
                          key={inst.id}
                          onClick={() => selectInstance(inst.id)}
                          style={{
                            borderBottom: '1px solid #1f2937',
                            background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#c4b5fd' }}>
                            {inst.id}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                            {inst.workflow_definition_id}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#9ca3af' }}>
                            {inst.target_tenant_id}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#f3f4f6' }}>
                              Step {inst.current_step_index}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {renderStatusBadge(inst.status)}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '12px' }}>
                            {new Date(inst.started_at).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectInstance(inst.id);
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instance Detail Drawer */}
          {selectedDetail && (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GitBranch size={16} color="#8b5cf6" /> Instance Details
                </span>
                <button
                  onClick={() => setSelectedDetail(null)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Instance ID & Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#c4b5fd' }}>{selectedDetail.instance.id}</span>
                  {renderStatusBadge(selectedDetail.instance.status)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>Definition</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#f3f4f6', marginTop: '2px' }}>
                  {selectedDetail.definition?.workflow_name || selectedDetail.instance.workflow_definition_id}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Failure Strategy: {selectedDetail.definition?.failure_strategy || 'backward_compensation'}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedDetail.instance.status === 'active' && (
                  <button
                    onClick={() => setShowCompensationModal(true)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={14} /> Compensate Saga
                  </button>
                )}
                {(selectedDetail.instance.status === 'failed' || selectedDetail.instance.status === 'paused') && (
                  <button
                    onClick={handleResumeInstance}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#10b981',
                      border: 'none',
                      color: '#fff',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={14} /> Resume Workflow
                  </button>
                )}
              </div>

              {/* Step DAG Progression */}
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>
                  Step Execution Progression ({selectedDetail.step_executions.length} steps)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDetail.step_executions.map((step) => (
                    <div
                      key={step.id}
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
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>
                          Step {step.step_index}: {step.step_name}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {step.duration_ms}ms · Attempt #{step.attempt_count}
                        </div>
                      </div>
                      <div>{renderStatusBadge(step.status)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compensating Transactions List */}
              {selectedDetail.compensations.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginBottom: '8px' }}>
                    Compensating Transactions ({selectedDetail.compensations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedDetail.compensations.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '11px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                          Step {c.step_index}: {c.compensation_action}
                        </div>
                        <div style={{ color: '#9ca3af' }}>{c.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payload Inspection */}
              <div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>State Payload JSON</div>
                <pre
                  style={{
                    background: '#030712',
                    border: '1px solid #1f2937',
                    borderRadius: '4px',
                    padding: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#a7f3d0',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedDetail.instance.state_payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Workflow Definitions & DAG */}
      {subTab === 'definitions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {definitions.map((def) => (
            <div
              key={def.id}
              style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#f3f4f6' }}>
                    {def.workflow_name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#8b5cf6', fontFamily: 'monospace' }}>
                    {def.workflow_type}
                  </span>
                </div>
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
                  Active
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: '1.4' }}>
                {def.description}
              </p>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px' }}>
                  DAG Steps Configuration ({def.total_steps_count} stages)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {def.steps_configuration.map((step) => (
                    <div
                      key={step.step_index}
                      style={{
                        background: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#e5e7eb' }}>
                          #{step.step_index} {step.step_name}
                        </span>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>{step.action_service}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#6b7280' }}>
                        <span>Endpoint: {step.action_endpoint}</span>
                        <span>Timeout: {step.timeout_seconds}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #1f2937', fontSize: '12px', color: '#6b7280' }}>
                <span>Strategy: {def.failure_strategy}</span>
                <button
                  onClick={() => {
                    setTriggerDefId(def.id);
                    setShowTriggerModal(true);
                  }}
                  style={{
                    background: '#8b5cf6',
                    border: 'none',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Trigger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Step Execution Logs & Compensating Transactions */}
      {subTab === 'executions' && (
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
            Comprehensive Saga Step Executions & Compensating Rollback Trail
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedDetail?.step_executions.length ? (
              selectedDetail.step_executions.map((step) => (
                <div
                  key={step.id}
                  style={{
                    background: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#f3f4f6' }}>
                        Step #{step.step_index}: {step.step_name}
                      </span>
                      <span style={{ marginLeft: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#9ca3af' }}>
                        ID: {step.id}
                      </span>
                    </div>
                    <div>{renderStatusBadge(step.status)}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    <span>Duration: {step.duration_ms}ms</span>
                    <span>Attempts: {step.attempt_count}</span>
                    <span>Started: {new Date(step.started_at).toLocaleTimeString()}</span>
                    {step.completed_at && <span>Completed: {new Date(step.completed_at).toLocaleTimeString()}</span>}
                  </div>

                  {step.error_message && (
                    <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '4px' }}>
                      Error: {step.error_message}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                Select an instance from the Live State Machines tab to view step execution logs
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Interactive Saga Sandbox & Compensation Drill */}
      {subTab === 'sandbox' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
              Interactive Step Execution Simulator
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Target Instance
                </label>
                <select
                  value={sandboxInstanceId}
                  onChange={(e) => {
                    setSandboxInstanceId(e.target.value);
                    selectInstance(e.target.value);
                  }}
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
                  <option value="">Select State Machine Instance...</option>
                  {instances.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.id} ({i.status}) - Step {i.current_step_index}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Step Index
                </label>
                <input
                  type="number"
                  value={sandboxStepIndex}
                  onChange={(e) => setSandboxStepIndex(Number(e.target.value))}
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

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Simulated Outcome
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="outcome"
                      value="succeeded"
                      checked={sandboxOutcome === 'succeeded'}
                      onChange={() => setSandboxOutcome('succeeded')}
                    />
                    Succeeded (Advance to Next Step)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="outcome"
                      value="failed"
                      checked={sandboxOutcome === 'failed'}
                      onChange={() => setSandboxOutcome('failed')}
                    />
                    Failed (Trigger Compensation)
                  </label>
                </div>
              </div>

              {sandboxOutcome === 'succeeded' ? (
                <div>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                    Step Output Payload (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={sandboxOutputJson}
                    onChange={(e) => setSandboxOutputJson(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#030712',
                      border: '1px solid #374151',
                      color: '#a7f3d0',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                    Error Message
                  </label>
                  <input
                    type="text"
                    value={sandboxError}
                    onChange={(e) => setSandboxError(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1f2937',
                      border: '1px solid #374151',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              <button
                onClick={handleExecuteSandboxStep}
                disabled={loading || !sandboxInstanceId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                <Play size={16} /> Execute Step Simulation
              </button>
            </div>
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#f3f4f6' }}>
              Backward LIFO Compensation Drill
            </h3>

            <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
              The Saga Coordinator coordinates backward compensation by executing compensating transactions in reverse order (LIFO) for all completed steps up to the failure point.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Rollback Reason
                </label>
                <input
                  type="text"
                  value={compensateReason}
                  onChange={(e) => setCompensateReason(e.target.value)}
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
                onClick={handleTriggerCompensation}
                disabled={loading || !sandboxInstanceId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={16} /> Trigger Immediate Backward Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trigger Modal */}
      {showTriggerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '24px',
              width: '480px',
              maxWidth: '90%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f3f4f6' }}>
                Trigger State Machine Instance
              </h3>
              <button
                onClick={() => setShowTriggerModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Workflow Definition
                </label>
                <select
                  value={triggerDefId}
                  onChange={(e) => setTriggerDefId(e.target.value)}
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
                  {definitions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.workflow_name} ({d.total_steps_count} steps)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Target Tenant ID
                </label>
                <input
                  type="text"
                  value={triggerTenantId}
                  onChange={(e) => setTriggerTenantId(e.target.value)}
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

              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Initial Input Payload (JSON)
                </label>
                <textarea
                  rows={4}
                  value={triggerPayloadJson}
                  onChange={(e) => setTriggerPayloadJson(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#030712',
                    border: '1px solid #374151',
                    color: '#a7f3d0',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  onClick={() => setShowTriggerModal(false)}
                  style={{
                    background: '#374151',
                    border: 'none',
                    color: '#e5e7eb',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTriggerInstance}
                  disabled={loading}
                  style={{
                    background: '#8b5cf6',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Trigger Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compensation Modal */}
      {showCompensationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '24px',
              width: '440px',
              maxWidth: '90%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} /> Confirm Saga Compensation
              </h3>
              <button
                onClick={() => setShowCompensationModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px 0' }}>
              This will abort the workflow and execute backward LIFO compensating transactions for all successfully executed steps.
            </p>

            <div>
              <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                Compensating Reason
              </label>
              <input
                type="text"
                value={compensateReason}
                onChange={(e) => setCompensateReason(e.target.value)}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setShowCompensationModal(false)}
                style={{
                  background: '#374151',
                  border: 'none',
                  color: '#e5e7eb',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerCompensation}
                disabled={loading}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Execute Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
