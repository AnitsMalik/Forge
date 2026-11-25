/**
 * Real-Time AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows Tab
 * HoaspForge Platform v4.7.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Workflow,
  Play,
  RotateCw,
  Plus,
  ShieldCheck,
  Zap,
  Activity,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Coins,
  Search,
  Filter,
  Eye,
  Sliders,
  CornerDownRight,
  Send,
  Trash2,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal';
import type {
  AgentFleetDefinition,
  AgentFleetRole,
  AgentFleetStatus,
  AgentFleetTelemetry,
  AgentFleetWorkflow,
  AgentWorkflowExecution,
  AgentExecutionStep,
  CreateAgentDefinitionDto,
  CreateWorkflowDto,
  DispatchWorkflowRunDto,
  CritiqueStepDto,
} from '@socialforge/shared';

interface AgentFleetTabProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'catalog' | 'workflows' | 'executions' | 'traces';

const ROLE_LABELS: Record<AgentFleetRole, { label: string; color: string; bg: string }> = {
  trend_hunter: { label: 'Trend Hunter', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  content_architect: { label: 'Content Architect', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  visual_director: { label: 'Visual Director', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  compliance_auditor: { label: 'Compliance Guard', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  growth_strategist: { label: 'Growth Strategist', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  orchestrator_executive: { label: 'Executive Orchestrator', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  custom_agent: { label: 'Custom Agent', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
};

export const AgentFleetTab: React.FC<AgentFleetTabProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<SubTab>('catalog');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<AgentFleetTelemetry | null>(null);

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

  // Agents state
  const [agents, setAgents] = useState<AgentFleetDefinition[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchAgent, setSearchAgent] = useState<string>('');

  // Workflows state
  const [workflows, setWorkflows] = useState<AgentFleetWorkflow[]>([]);
  const [searchWf, setSearchWf] = useState<string>('');

  // Executions state
  const [executions, setExecutions] = useState<AgentWorkflowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<{
    execution: AgentWorkflowExecution;
    steps: AgentExecutionStep[];
  } | null>(null);

  // Modals state
  const [deployAgentModal, setDeployAgentModal] = useState(false);
  const [newAgentForm, setNewAgentForm] = useState<CreateAgentDefinitionDto>({
    name: '',
    role: 'trend_hunter',
    description: '',
    systemPrompt: '',
    modelName: 'gpt-4o',
    temperature: 0.70,
    maxTokensPerTurn: 4096,
    toolPermissions: ['web_search', 'brand_memory'],
    concurrencyLimit: 5,
  });

  const [createWfModal, setCreateWfModal] = useState(false);
  const [newWfTenantId, setNewWfTenantId] = useState('');
  const [newWfName, setNewWfName] = useState('');
  const [newWfDesc, setNewWfDesc] = useState('');

  const [dispatchModal, setDispatchModal] = useState(false);
  const [dispatchWfId, setDispatchWfId] = useState('');
  const [dispatchTopic, setDispatchTopic] = useState('');
  const [dispatching, setDispatching] = useState(false);

  const [critiqueModal, setCritiqueModal] = useState(false);
  const [critiqueStepTarget, setCritiqueStepTarget] = useState<AgentExecutionStep | null>(null);
  const [critiqueApproved, setCritiqueApproved] = useState(true);
  const [critiqueComments, setCritiqueComments] = useState('');

  // Load telemetry
  const loadTelemetry = useCallback(async () => {
    try {
      const data = await api.adminOps.getAgentFleetTelemetry();
      setTelemetry(data);
    } catch (err: any) {
      console.error('Failed to load fleet telemetry:', err);
    }
  }, []);

  // Load agents
  const loadAgents = useCallback(async () => {
    try {
      const res = await api.adminOps.listFleetAgents({
        role: roleFilter || undefined,
        search: searchAgent.trim() || undefined,
      });
      setAgents(res.agents);
    } catch (err: any) {
      showToast(`Failed to load agents: ${err.message}`, 'error');
    }
  }, [roleFilter, searchAgent, showToast]);

  // Load workflows
  const loadWorkflows = useCallback(async () => {
    try {
      const res = await api.adminOps.listFleetWorkflows({
        search: searchWf.trim() || undefined,
      });
      setWorkflows(res.workflows);
    } catch (err: any) {
      showToast(`Failed to load workflows: ${err.message}`, 'error');
    }
  }, [searchWf, showToast]);

  // Load executions
  const loadExecutions = useCallback(async () => {
    try {
      const res = await api.adminOps.listWorkflowExecutions({ limit: 50 });
      setExecutions(res.executions);
      if (res.executions.length > 0 && !selectedExecution) {
        const full = await api.adminOps.getWorkflowExecution(res.executions[0].id);
        setSelectedExecution(full);
      }
    } catch (err: any) {
      showToast(`Failed to load executions: ${err.message}`, 'error');
    }
  }, [selectedExecution, showToast]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTelemetry(), loadAgents(), loadWorkflows(), loadExecutions()]);
    setLoading(false);
  }, [loadTelemetry, loadAgents, loadWorkflows, loadExecutions]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    showToast('Fleet telemetry and traces updated.', 'info');
  };

  // Select execution to inspect
  const handleSelectExecution = async (execId: string) => {
    try {
      const full = await api.adminOps.getWorkflowExecution(execId);
      setSelectedExecution(full);
      setSubTab('traces');
    } catch (err: any) {
      showToast(`Failed to load execution traces: ${err.message}`, 'error');
    }
  };

  // Deploy agent
  const handleDeployAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentForm.name.trim() || !newAgentForm.systemPrompt.trim()) {
      showToast('Agent name and system prompt are required.', 'error');
      return;
    }
    try {
      const created = await api.adminOps.createFleetAgent(newAgentForm);
      showToast(`Agent "${created.name}" successfully deployed!`, 'success');
      setDeployAgentModal(false);
      setNewAgentForm({
        name: '',
        role: 'trend_hunter',
        description: '',
        systemPrompt: '',
        modelName: 'gpt-4o',
        temperature: 0.70,
        maxTokensPerTurn: 4096,
        toolPermissions: ['web_search', 'brand_memory'],
        concurrencyLimit: 5,
      });
      loadTelemetry();
      loadAgents();
    } catch (err: any) {
      showToast(`Agent deployment failed: ${err.message}`, 'error');
    }
  };

  // Delete agent
  const handleDeleteAgent = (agent: AgentFleetDefinition) => {
    if (agent.isSystem) {
      showToast('Core system agents cannot be deleted.', 'error');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Retire & Delete Agent',
      description: `Are you sure you want to retire and delete agent "${agent.name}"? This action permanently removes it from the fleet.`,
      confirmText: 'Decommission Agent',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteFleetAgent(agent.id);
          showToast(`Agent "${agent.name}" decommissioned.`, 'success');
          loadTelemetry();
          loadAgents();
        } catch (err: any) {
          showToast(`Failed to delete agent: ${err.message}`, 'error');
        }
      },
    });
  };

  // Create workflow
  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim() || !newWfTenantId.trim()) {
      showToast('Workflow name and Tenant ID are required.', 'error');
      return;
    }

    const defaultDag = {
      entryNodes: ['node_trend'],
      nodes: [
        {
          id: 'node_trend',
          agentRole: 'trend_hunter' as AgentFleetRole,
          stepName: 'Trend Ingestion',
          promptTemplate: 'Discover breakout social angles for campaign.',
          dependencies: [],
        },
        {
          id: 'node_content',
          agentRole: 'content_architect' as AgentFleetRole,
          stepName: 'Creative Copy Synthesis',
          promptTemplate: 'Draft 3 narrative post variants with hook hooks.',
          dependencies: ['node_trend'],
        },
        {
          id: 'node_audit',
          agentRole: 'compliance_auditor' as AgentFleetRole,
          stepName: 'Compliance & Safety Audit',
          promptTemplate: 'Audit copy for FTC compliance and safety disclosures.',
          dependencies: ['node_content'],
          requiresCritique: true,
          critiqueAgentRole: 'compliance_auditor' as AgentFleetRole,
        },
      ],
      outputFormat: 'campaign_bundle' as const,
    };

    try {
      const payload: CreateWorkflowDto = {
        tenantId: newWfTenantId.trim(),
        name: newWfName.trim(),
        description: newWfDesc.trim() || undefined,
        triggerType: 'manual',
        dagConfig: defaultDag,
        maxBudgetTokens: 40000,
        timeoutSeconds: 240,
      };
      const created = await api.adminOps.createFleetWorkflow(payload);
      showToast(`Workflow DAG "${created.name}" deployed!`, 'success');
      setCreateWfModal(false);
      setNewWfName('');
      setNewWfDesc('');
      setNewWfTenantId('');
      loadTelemetry();
      loadWorkflows();
    } catch (err: any) {
      showToast(`Failed to create workflow: ${err.message}`, 'error');
    }
  };

  // Dispatch workflow run
  const handleDispatchRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchWfId) {
      showToast('Please select a target workflow.', 'error');
      return;
    }
    setDispatching(true);
    try {
      const payload: DispatchWorkflowRunDto = {
        workflowId: dispatchWfId,
        inputParams: { topic: dispatchTopic.trim() || 'Spring Adaptive Wellness' },
        triggerEvent: 'operator_dispatch',
      };
      const res = await api.adminOps.dispatchWorkflowExecution(payload);
      showToast(`Workflow run started! ${res.steps.length} collaborative agent steps executed.`, 'success');
      setDispatchModal(false);
      setDispatchTopic('');
      setSelectedExecution(res);
      setSubTab('traces');
      loadTelemetry();
      loadExecutions();
    } catch (err: any) {
      showToast(`Dispatch failed: ${err.message}`, 'error');
    } finally {
      setDispatching(false);
    }
  };

  // Abort execution
  const handleAbortExecution = (execId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Emergency Abort Execution',
      description: 'Are you sure you want to kill and abort this running execution? Any ongoing tasks or agent steps will be terminated immediately.',
      confirmText: 'Abort Execution',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.abortWorkflowExecution(execId, 'Aborted via Superadmin Operations Emergency Kill-Switch');
          showToast('Workflow execution aborted.', 'info');
          loadTelemetry();
          loadExecutions();
          if (selectedExecution?.execution.id === execId) {
            handleSelectExecution(execId);
          }
        } catch (err: any) {
          showToast(`Failed to abort execution: ${err.message}`, 'error');
        }
      },
    });
  };

  // Submit Critique
  const handleSubmitCritique = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!critiqueStepTarget) return;
    try {
      const payload: CritiqueStepDto = {
        approved: critiqueApproved,
        critiqueComments: critiqueComments.trim() || 'Reviewed by fleet supervisor.',
      };
      await api.adminOps.critiqueExecutionStep(critiqueStepTarget.id, payload);
      showToast(critiqueApproved ? 'Step output approved!' : 'Revision requested from agent.', 'success');
      setCritiqueModal(false);
      setCritiqueStepTarget(null);
      setCritiqueComments('');
      if (selectedExecution) {
        handleSelectExecution(selectedExecution.execution.id);
      }
    } catch (err: any) {
      showToast(`Critique failed: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Global Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bot size={28} color="#6366f1" />
            AI Agent Fleet Orchestration & Collaborative Workflows
          </h2>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '14px' }}>
            Real-time management of specialized autonomous agents, dynamic DAG handoffs, critique loops, and execution traces.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setDispatchModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <Play size={16} />
            Dispatch Pipeline Run
          </button>
        </div>
      </div>

      {/* 4 Telemetry Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {/* Card 1: Total Fleet Agents */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet AI Agents</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={20} color="#6366f1" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            {telemetry ? telemetry.totalAgents : '-'}
          </div>
          <div style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} />
            <span>{telemetry ? `${telemetry.systemAgents} Core System Agents Active` : 'Checking catalog...'}</span>
          </div>
        </div>

        {/* Card 2: Active Workflows */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workflow DAGs</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Workflow size={20} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            {telemetry ? telemetry.activeWorkflows : '-'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{telemetry ? `${telemetry.totalWorkflows} total pipelines configured` : 'Loading...'}</span>
          </div>
        </div>

        {/* Card 3: Running Executions */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Agent Runs</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            {telemetry ? telemetry.runningExecutions : '-'}
          </div>
          <div style={{ fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} />
            <span>{telemetry ? `${telemetry.totalExecutions24h} executions in last 24h` : 'Processing...'}</span>
          </div>
        </div>

        {/* Card 4: Token Throughput & Success */}
        <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Success Rate</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
            {telemetry ? `${telemetry.fleetSuccessRate}%` : '100%'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={14} color="#f59e0b" />
            <span>{telemetry ? `${(telemetry.totalTokens24h / 1000).toFixed(1)}k tokens (24h)` : '-'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', gap: '8px' }}>
        <button
          id="subtab-agent-catalog"
          onClick={() => setSubTab('catalog')}
          style={{
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'catalog' ? '2px solid #6366f1' : '2px solid transparent',
            color: subTab === 'catalog' ? '#6366f1' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bot size={16} />
          Agent Catalog ({agents.length})
        </button>

        <button
          id="subtab-fleet-workflows"
          onClick={() => setSubTab('workflows')}
          style={{
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'workflows' ? '2px solid #6366f1' : '2px solid transparent',
            color: subTab === 'workflows' ? '#6366f1' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Workflow size={16} />
          Workflow Pipelines ({workflows.length})
        </button>

        <button
          id="subtab-fleet-executions"
          onClick={() => setSubTab('executions')}
          style={{
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'executions' ? '2px solid #6366f1' : '2px solid transparent',
            color: subTab === 'executions' ? '#6366f1' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Activity size={16} />
          Execution Monitor ({executions.length})
        </button>

        <button
          id="subtab-step-traces"
          onClick={() => setSubTab('traces')}
          style={{
            padding: '12px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'traces' ? '2px solid #6366f1' : '2px solid transparent',
            color: subTab === 'traces' ? '#6366f1' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CornerDownRight size={16} />
          Step Traces & Replay
        </button>
      </div>

      {/* Sub-Tab 1: Agent Catalog */}
      {subTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search agents by name, role, or slug..."
                  value={searchAgent}
                  onChange={(e) => setSearchAgent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              >
                <option value="">All Roles</option>
                <option value="trend_hunter">Trend Hunter</option>
                <option value="content_architect">Content Architect</option>
                <option value="visual_director">Visual Director</option>
                <option value="compliance_auditor">Compliance Guard</option>
                <option value="growth_strategist">Growth Strategist</option>
                <option value="custom_agent">Custom Agent</option>
              </select>
            </div>

            <button
              id="btn-deploy-agent"
              onClick={() => setDeployAgentModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} />
              Deploy Custom Agent
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {agents.map((agent) => {
              const roleMeta = ROLE_LABELS[agent.role] || ROLE_LABELS.custom_agent;
              return (
                <div
                  key={agent.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: roleMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Bot size={22} color={roleMeta.color} />
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{agent.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{agent.slug}</div>
                        </div>
                      </div>

                      {agent.isSystem ? (
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                          System Core
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteAgent(agent)}
                          title="Retire Agent"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: '8px 0 12px' }}>
                      {agent.description || 'Autonomous collaborative agent worker.'}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: roleMeta.bg, color: roleMeta.color, fontWeight: 600 }}>
                        {roleMeta.label}
                      </span>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
                        {agent.modelName} (t={agent.temperature})
                      </span>
                      <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1' }}>
                        Max {agent.maxTokensPerTurn} tok
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      <strong>Tool Policy:</strong> {agent.toolPermissions.length > 0 ? agent.toolPermissions.join(', ') : 'Standard LLM reasoning'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      Status: {agent.status}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Concurrency: {agent.concurrencyLimit}x
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Workflow DAG Pipelines */}
      {subTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', minWidth: '300px', flex: 1 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search workflows by title or description..."
                value={searchWf}
                onChange={(e) => setSearchWf(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: '#fff',
                  fontSize: '14px',
                }}
              />
            </div>

            <button
              id="btn-create-workflow"
              onClick={() => setCreateWfModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={16} />
              Create Workflow DAG
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="glass-card"
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Workflow size={22} color="#8b5cf6" />
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{wf.name}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                        {wf.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#94a3b8' }}>
                      {wf.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setDispatchWfId(wf.id);
                      setDispatchModal(true);
                    }}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    <Play size={14} />
                    Run Pipeline
                  </button>
                </div>

                {/* Visual DAG Nodes Chain */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  {wf.dagConfig.nodes.map((node, idx) => {
                    const roleMeta = ROLE_LABELS[node.agentRole] || ROLE_LABELS.custom_agent;
                    return (
                      <React.Fragment key={node.id}>
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: roleMeta.bg,
                            border: `1px solid ${roleMeta.color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 700, color: roleMeta.color }}>#{idx + 1}</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{node.stepName}</div>
                            <div style={{ fontSize: '11px', color: roleMeta.color }}>{roleMeta.label}</div>
                          </div>
                          {node.requiresCritique && (
                            <span title="Human/Agent Critique Loop Required" style={{ marginLeft: '4px' }}>
                              <ShieldCheck size={14} color="#10b981" />
                            </span>
                          )}
                        </div>
                        {idx < wf.dagConfig.nodes.length - 1 && (
                          <span style={{ color: '#64748b', fontWeight: 700 }}>➔</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b' }}>
                  <span>Max Budget: {wf.maxBudgetTokens.toLocaleString()} tokens | Timeout: {wf.timeoutSeconds}s</span>
                  <span>Tenant ID: <code style={{ color: '#94a3b8' }}>{wf.tenantId}</code></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Execution Monitor */}
      {subTab === 'executions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden', background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Run ID & Trigger</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Status</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Tokens</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Est. Cost</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Duration</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8' }}>Started</th>
                  <th style={{ padding: '14px 16px', color: '#94a3b8', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => {
                  let statusColor = '#10b981';
                  let statusBg = 'rgba(16, 185, 129, 0.15)';
                  if (ex.status === 'running') {
                    statusColor = '#f59e0b';
                    statusBg = 'rgba(245, 158, 11, 0.15)';
                  } else if (ex.status === 'failed') {
                    statusColor = '#ef4444';
                    statusBg = 'rgba(239, 68, 68, 0.15)';
                  } else if (ex.status === 'aborted') {
                    statusColor = '#94a3b8';
                    statusBg = 'rgba(148, 163, 184, 0.15)';
                  }

                  return (
                    <tr key={ex.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{ex.id.slice(0, 14)}...</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{ex.triggerEvent}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '6px', background: statusBg, color: statusColor, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
                          {ex.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                        {ex.totalTokensUsed.toLocaleString()} tok
                      </td>
                      <td style={{ padding: '14px 16px', color: '#10b981' }}>
                        ${ex.executionCostUsd.toFixed(4)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#cbd5e1' }}>
                        {ex.durationMs ? `${(ex.durationMs / 1000).toFixed(1)}s` : 'In flight'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '12px' }}>
                        {new Date(ex.startedAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {ex.status === 'running' && (
                            <button
                              onClick={() => handleAbortExecution(ex.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
                            >
                              Abort
                            </button>
                          )}
                          <button
                            onClick={() => handleSelectExecution(ex.id)}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Eye size={12} />
                            Traces
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Step Traces & Replay */}
      {subTab === 'traces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedExecution ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                      Execution Run: <span style={{ fontFamily: 'monospace', color: '#818cf8' }}>{selectedExecution.execution.id}</span>
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                      Status: <strong>{selectedExecution.execution.status.toUpperCase()}</strong> | Total Tokens: {selectedExecution.execution.totalTokensUsed.toLocaleString()} | Cost: ${selectedExecution.execution.executionCostUsd.toFixed(4)}
                    </p>
                  </div>

                  {selectedExecution.execution.finalOutput && (
                    <div style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                      Final Payload Synthesized
                    </div>
                  )}
                </div>
              </div>

              {/* Step Sequence Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedExecution.steps.map((step, idx) => {
                  const roleMeta = ROLE_LABELS[step.agentRole] || ROLE_LABELS.custom_agent;
                  return (
                    <div
                      key={step.id}
                      className="glass-card"
                      style={{
                        padding: '18px 20px',
                        borderRadius: '10px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: roleMeta.bg, color: roleMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{step.stepName}</div>
                            <div style={{ fontSize: '12px', color: roleMeta.color, fontWeight: 600 }}>{roleMeta.label}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {step.tokensUsed.toLocaleString()} tokens ({step.latencyMs}ms)
                          </span>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', background: step.status === 'approved' || step.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: step.status === 'approved' || step.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                            {step.status}
                          </span>
                          <button
                            onClick={() => {
                              setCritiqueStepTarget(step);
                              setCritiqueApproved(step.status !== 'revision_requested');
                              setCritiqueModal(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Sliders size={12} />
                            Critique
                          </button>
                        </div>
                      </div>

                      {/* Step JSON outputs */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Input Context</div>
                          <pre style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '120px', overflowY: 'auto' }}>
                            {JSON.stringify(step.inputContext, null, 2)}
                          </pre>
                        </div>

                        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Agent Output Context</div>
                          <pre style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '120px', overflowY: 'auto' }}>
                            {JSON.stringify(step.outputContext, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {step.critiqueFeedback && (
                        <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '12px', color: '#818cf8' }}>
                          <strong>Compliance / Supervisor Critique:</strong> {JSON.stringify(step.critiqueFeedback)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Select an execution run from the Execution Monitor to inspect step traces.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Deploy Custom Agent */}
      {deployAgentModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '580px', width: '100%', padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Deploy Custom Fleet Agent</h3>
              <button onClick={() => setDeployAgentModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleDeployAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Agent Name</label>
                <input
                  type="text"
                  required
                  value={newAgentForm.name}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                  placeholder="e.g. BioTech Narrative Architect"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Role</label>
                  <select
                    value={newAgentForm.role}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, role: e.target.value as AgentFleetRole })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                  >
                    <option value="trend_hunter">Trend Hunter</option>
                    <option value="content_architect">Content Architect</option>
                    <option value="visual_director">Visual Director</option>
                    <option value="compliance_auditor">Compliance Guard</option>
                    <option value="growth_strategist">Growth Strategist</option>
                    <option value="custom_agent">Custom Agent</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Model</label>
                  <select
                    value={newAgentForm.modelName}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, modelName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                  >
                    <option value="gpt-4o">OpenAI GPT-4o</option>
                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="gemini-1-5-pro">Gemini 1.5 Pro</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>System Prompt & Reasoning Directive</label>
                <textarea
                  rows={4}
                  required
                  value={newAgentForm.systemPrompt}
                  onChange={(e) => setNewAgentForm({ ...newAgentForm, systemPrompt: e.target.value })}
                  placeholder="You are an autonomous agent specialized in..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Temperature: {newAgentForm.temperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={newAgentForm.temperature}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Max Concurrency</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newAgentForm.concurrencyLimit}
                    onChange={(e) => setNewAgentForm({ ...newAgentForm, concurrencyLimit: parseInt(e.target.value, 10) || 5 })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setDeployAgentModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600 }}>Deploy Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Workflow DAG */}
      {createWfModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Create Multi-Agent Workflow DAG</h3>
              <button onClick={() => setCreateWfModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateWorkflow} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Tenant ID</label>
                <input
                  type="text"
                  required
                  value={newWfTenantId}
                  onChange={(e) => setNewWfTenantId(e.target.value)}
                  placeholder="Enter tenant UUID"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Workflow Title</label>
                <input
                  type="text"
                  required
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  placeholder="e.g. 3-Agent Flash Campaign Synthesis"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Description</label>
                <textarea
                  rows={3}
                  value={newWfDesc}
                  onChange={(e) => setNewWfDesc(e.target.value)}
                  placeholder="Workflow overview..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '12px', color: '#818cf8' }}>
                <strong>Default DAG Blueprint:</strong> Trend Hunter ➔ Content Architect ➔ Compliance Guardrail Critique.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setCreateWfModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600 }}>Create DAG</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Dispatch Workflow Run */}
      {dispatchModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '100%', padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Dispatch Pipeline Execution</h3>
              <button onClick={() => setDispatchModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleDispatchRun} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Select Target Workflow</label>
                <select
                  required
                  value={dispatchWfId}
                  onChange={(e) => setDispatchWfId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                >
                  <option value="">-- Choose Pipeline --</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} ({wf.dagConfig.nodes.length} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Campaign Subject / Topic Context</label>
                <input
                  type="text"
                  value={dispatchTopic}
                  onChange={(e) => setDispatchTopic(e.target.value)}
                  placeholder="e.g. Longevity Supplements & Morning Focus"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setDispatchModal(false)} className="btn btn-secondary">Cancel</button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Play size={14} />
                  {dispatching ? 'Orchestrating Fleet...' : 'Dispatch Execution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Step Critique & Supervisor Review */}
      {critiqueModal && critiqueStepTarget && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', padding: '24px', borderRadius: '12px', background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>Review & Critique Agent Output</h3>
              <button onClick={() => setCritiqueModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitCritique} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Step Name</label>
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#0f172a', color: '#fff', fontSize: '13px' }}>
                  {critiqueStepTarget.stepName} ({critiqueStepTarget.agentRole})
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Decision</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={critiqueApproved}
                      onChange={() => setCritiqueApproved(true)}
                    />
                    Approve Output
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="decision"
                      checked={!critiqueApproved}
                      onChange={() => setCritiqueApproved(false)}
                    />
                    Request Revision
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Critique Notes & Directive</label>
                <textarea
                  rows={3}
                  value={critiqueComments}
                  onChange={(e) => setCritiqueComments(e.target.value)}
                  placeholder="Provide feedback or revision instructions..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setCritiqueModal(false)} className="btn btn-secondary">Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: critiqueApproved ? '#10b981' : '#f59e0b', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600 }}
                >
                  Submit Critique
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
