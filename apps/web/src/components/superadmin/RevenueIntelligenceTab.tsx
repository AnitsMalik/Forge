/**
 * Enterprise Predictive Churn, Customer Lifetime Value & Revenue Expansion Intelligence Tab
 * HoaspForge Platform v5.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Users,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Plus,
  PlayCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Sliders,
  Award,
  Zap,
  Trash2,
  Edit3,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  TenantChurnScore,
  CustomerLtvMetric,
  CustomerSuccessIntervention,
  RevenueIntelligenceTelemetry,
  ChurnRiskTier,
  PrimaryRiskFactor,
  InterventionPlaybookType,
  InterventionStatus,
  InterventionPriority,
  OutcomeEffectiveness,
  PredictiveSimulationResponse,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'churn_matrix' | 'ltv_expansion' | 'interventions' | 'simulator';

export const RevenueIntelligenceTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('churn_matrix');

  // Telemetry
  const [telemetry, setTelemetry] = useState<RevenueIntelligenceTelemetry | null>(null);

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

  // Churn Scores
  const [churnScores, setChurnScores] = useState<TenantChurnScore[]>([]);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [factorFilter, setFactorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // LTV Metrics
  const [ltvMetrics, setLtvMetrics] = useState<CustomerLtvMetric[]>([]);

  // Interventions
  const [interventions, setInterventions] = useState<CustomerSuccessIntervention[]>([]);
  const [interventionStatusFilter, setInterventionStatusFilter] = useState<string>('');

  // Modals
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    tenantId: '',
    title: '',
    playbookType: 'executive_sponsor_outreach' as InterventionPlaybookType,
    priority: 'high' as InterventionPriority,
    assignedTo: 'success@hoaspforge.com',
    triggerReason: '',
  });

  const [assessModalOpen, setAssessModalOpen] = useState(false);
  const [assessForm, setAssessForm] = useState({
    tenantId: '',
    usageVelocityScore: 75,
    seatUtilizationPercent: 80,
    billingHealthScore: 100,
  });

  const [editInterventionModalOpen, setEditInterventionModalOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<CustomerSuccessIntervention | null>(null);
  const [editForm, setEditForm] = useState({
    status: 'in_progress' as InterventionStatus,
    resolutionNotes: '',
    outcomeEffectiveness: 'retained' as OutcomeEffectiveness,
  });

  // What-If Simulator
  const [simForm, setSimForm] = useState({
    usageVelocityDelta: 15,
    seatUtilizationDelta: 10,
    billingHealthDelta: 0,
    discountIncentiveApplied: false,
    trainingSessionCompleted: true,
  });
  const [simResult, setSimResult] = useState<PredictiveSimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Load telemetry and initial datasets
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await api.adminOps.getRevenueIntelligenceOverview();
      setTelemetry(res);
    } catch {
      showToast('Failed to fetch revenue intelligence telemetry', 'error');
    }
  }, [showToast]);

  const fetchChurnScores = useCallback(async () => {
    try {
      const res = await api.adminOps.listChurnScores({
        tier: tierFilter || undefined,
        primaryRiskFactor: factorFilter || undefined,
      });
      setChurnScores(res);
    } catch {
      showToast('Failed to load tenant churn scores', 'error');
    }
  }, [tierFilter, factorFilter, showToast]);

  const fetchLtvMetrics = useCallback(async () => {
    try {
      const res = await api.adminOps.listLtvMetrics();
      setLtvMetrics(res);
    } catch {
      showToast('Failed to load customer LTV metrics', 'error');
    }
  }, [showToast]);

  const fetchInterventions = useCallback(async () => {
    try {
      const res = await api.adminOps.listInterventions({
        status: interventionStatusFilter || undefined,
      });
      setInterventions(res);
    } catch {
      showToast('Failed to load CS interventions', 'error');
    }
  }, [interventionStatusFilter, showToast]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchTelemetry(),
      fetchChurnScores(),
      fetchLtvMetrics(),
      fetchInterventions(),
    ]);
    setLoading(false);
  }, [fetchTelemetry, fetchChurnScores, fetchLtvMetrics, fetchInterventions]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  // Run initial simulation
  const runSimulation = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulatePredictiveScenario(simForm);
      setSimResult(res);
    } catch {
      showToast('Simulation calculation failed', 'error');
    } finally {
      setSimLoading(false);
    }
  }, [simForm, showToast]);

  useEffect(() => {
    if (subTab === 'simulator') {
      runSimulation();
    }
  }, [subTab, runSimulation]);

  // Handlers
  const handleDispatchIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.tenantId || !dispatchForm.title) {
      showToast('Tenant and Title are required', 'error');
      return;
    }
    try {
      await api.adminOps.createIntervention(dispatchForm);
      showToast('Customer success intervention dispatched successfully', 'success');
      setDispatchModalOpen(false);
      setDispatchForm({
        tenantId: '',
        title: '',
        playbookType: 'executive_sponsor_outreach',
        priority: 'high',
        assignedTo: 'success@hoaspforge.com',
        triggerReason: '',
      });
      reloadAll();
    } catch (err: any) {
      showToast(err?.message || 'Failed to dispatch intervention', 'error');
    }
  };

  const handleAssessRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessForm.tenantId) {
      showToast('Select a tenant to assess', 'error');
      return;
    }
    try {
      await api.adminOps.evaluateTenantRisk(assessForm);
      showToast('Predictive churn risk and LTV recalculated', 'success');
      setAssessModalOpen(false);
      reloadAll();
    } catch (err: any) {
      showToast(err?.message || 'Failed to evaluate tenant risk', 'error');
    }
  };

  const handleUpdateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntervention) return;
    try {
      await api.adminOps.updateIntervention(selectedIntervention.id, editForm);
      showToast('Intervention updated successfully', 'success');
      setEditInterventionModalOpen(false);
      setSelectedIntervention(null);
      fetchInterventions();
      fetchTelemetry();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update intervention', 'error');
    }
  };

  const handleDeleteIntervention = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Customer Success Intervention',
      description: 'Are you sure you want to delete this intervention? Telemetry and churn risk history for the tenant will remain intact.',
      confirmText: 'Delete Intervention',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.adminOps.deleteIntervention(id);
          showToast('Intervention deleted', 'info');
          fetchInterventions();
          fetchTelemetry();
        } catch (err: any) {
          showToast(err?.message || 'Failed to delete intervention', 'error');
        }
      },
    });
  };

  const getTierColor = (tier: ChurnRiskTier) => {
    switch (tier) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
      default:
        return '#22c55e';
    }
  };

  const filteredChurnScores = churnScores.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.tenantName && s.tenantName.toLowerCase().includes(q)) ||
      s.tenantId.toLowerCase().includes(q) ||
      s.primaryRiskFactor.toLowerCase().includes(q)
    );
  });

  return (
    <div id="tab-revenue_intelligence" style={{ padding: '24px', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={26} color="#38bdf8" />
            Enterprise Predictive Churn, LTV & Revenue Intelligence
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Multi-factor behavioral churn scoring, Customer Lifetime Value modeling & automated retention playbooks
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
            Refresh Intelligence
          </button>

          <button
            id="btn-open-assess-modal"
            onClick={() => {
              if (churnScores.length > 0) {
                setAssessForm((prev) => ({ ...prev, tenantId: churnScores[0].tenantId }));
              }
              setAssessModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={16} color="#38bdf8" />
            Assess Tenant Risk
          </button>

          <button
            id="btn-open-dispatch-modal"
            onClick={() => {
              if (churnScores.length > 0) {
                setDispatchForm((prev) => ({ ...prev, tenantId: churnScores[0].tenantId }));
              }
              setDispatchModalOpen(true);
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
            Dispatch CS Playbook
          </button>
        </div>
      </div>

      {/* 4 Telemetry Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Average Churn Risk</span>
            <AlertTriangle size={18} color={telemetry && telemetry.averageChurnRisk > 35 ? '#f97316' : '#22c55e'} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: telemetry ? getTierColor(telemetry.averageChurnRisk > 50 ? 'high' : telemetry.averageChurnRisk > 25 ? 'medium' : 'low') : '#f8fafc' }}>
            {telemetry ? `${telemetry.averageChurnRisk}%` : '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Monitored: <strong style={{ color: '#f8fafc' }}>{telemetry?.totalMonitoredTenants ?? 0} tenants</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>High & Critical Risk</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>
            {telemetry ? telemetry.criticalRiskTenants + telemetry.highRiskTenants : '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Critical: <strong style={{ color: '#ef4444' }}>{telemetry?.criticalRiskTenants ?? 0}</strong> | High: <strong style={{ color: '#f97316' }}>{telemetry?.highRiskTenants ?? 0}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Projected Lifetime Value</span>
            <DollarSign size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#38bdf8' }}>
            ${telemetry ? (telemetry.totalProjectedLtv).toLocaleString() : '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Current MRR: <strong style={{ color: '#f8fafc' }}>${telemetry?.totalCurrentMrr.toLocaleString() ?? '0'}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>Active CS Interventions</span>
            <Award size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a855f7' }}>
            {telemetry?.activeInterventionsCount ?? '--'}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Retention Rate: <strong style={{ color: '#22c55e' }}>{telemetry?.retentionSuccessRate ?? 100}%</strong>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '20px', gap: '8px' }}>
        {[
          { id: 'churn_matrix', label: 'Churn Risk Matrix & Cohorts', icon: AlertTriangle },
          { id: 'ltv_expansion', label: 'LTV & Expansion Radar', icon: TrendingUp },
          { id: 'interventions', label: 'Customer Success Playbooks', icon: ShieldAlert },
          { id: 'simulator', label: 'Predictive What-If Simulator', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`subtab-${tab.id}`}
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

      {/* Subtab 1: Churn Risk Matrix */}
      {subTab === 'churn_matrix' && (
        <div id="panel-churn-matrix">
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search tenant or risk factor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
              }}
            >
              <option value="">All Risk Tiers</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>

            <select
              value={factorFilter}
              onChange={(e) => setFactorFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
              }}
            >
              <option value="">All Primary Risk Factors</option>
              <option value="low_usage">Low Usage Velocity</option>
              <option value="seat_underutilization">Seat Underutilization</option>
              <option value="payment_delinquency">Payment Delinquency</option>
              <option value="negative_sentiment">Negative Sentiment</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Tenant</th>
                  <th style={{ padding: '12px 16px' }}>Churn Risk</th>
                  <th style={{ padding: '12px 16px' }}>Risk Tier</th>
                  <th style={{ padding: '12px 16px' }}>Primary Factor</th>
                  <th style={{ padding: '12px 16px' }}>Usage Velocity</th>
                  <th style={{ padding: '12px 16px' }}>Seat Util %</th>
                  <th style={{ padding: '12px 16px' }}>Trend</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChurnScores.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No tenant churn evaluations match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredChurnScores.map((score) => (
                    <tr key={score.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{score.tenantName || score.tenantId}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{score.tenantId}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: getTierColor(score.riskTier) }}>
                          {score.churnRiskScore}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            backgroundColor: `${getTierColor(score.riskTier)}20`,
                            color: getTierColor(score.riskTier),
                            border: `1px solid ${getTierColor(score.riskTier)}`,
                          }}
                        >
                          {score.riskTier}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {score.primaryRiskFactor.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#334155', borderRadius: '3px', width: '80px' }}>
                            <div
                              style={{
                                width: `${score.usageVelocityScore}%`,
                                height: '100%',
                                backgroundColor: score.usageVelocityScore > 50 ? '#22c55e' : '#f97316',
                                borderRadius: '3px',
                              }}
                            />
                          </div>
                          <span>{score.usageVelocityScore}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {score.seatUtilizationPercent}%
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: score.engagementTrend === 'improving' ? '#22c55e' : score.engagementTrend === 'stable' ? '#38bdf8' : '#ef4444',
                            fontSize: '12px',
                          }}
                        >
                          {score.engagementTrend === 'improving' ? <ArrowUpRight size={14} /> : score.engagementTrend === 'stable' ? <Activity size={14} /> : <TrendingDown size={14} />}
                          {score.engagementTrend}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => {
                            setAssessForm({
                              tenantId: score.tenantId,
                              usageVelocityScore: score.usageVelocityScore,
                              seatUtilizationPercent: score.seatUtilizationPercent,
                              billingHealthScore: score.billingHealthScore,
                            });
                            setAssessModalOpen(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#334155',
                            color: '#f8fafc',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            marginRight: '6px',
                          }}
                        >
                          Recalculate
                        </button>
                        <button
                          onClick={() => {
                            setDispatchForm((prev) => ({
                              ...prev,
                              tenantId: score.tenantId,
                              title: `Retention Outreach: ${score.tenantName || 'Tenant'} (${score.primaryRiskFactor})`,
                              triggerReason: `Elevated ${score.riskTier} churn risk of ${score.churnRiskScore}% due to ${score.primaryRiskFactor}.`,
                            }));
                            setDispatchModalOpen(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Intervene
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

      {/* Subtab 2: LTV & Expansion Radar */}
      {subTab === 'ltv_expansion' && (
        <div id="panel-ltv-expansion">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {ltvMetrics.map((ltv) => (
              <div
                key={ltv.id}
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#f8fafc' }}>
                      {ltv.tenantName || ltv.tenantId}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#0284c720',
                        color: '#38bdf8',
                        border: '1px solid #0284c7',
                      }}
                    >
                      {ltv.expansionTier.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Projected LTV</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>
                      ${ltv.projectedLtvTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Current MRR</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>${ltv.currentMrr.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Predicted Longevity</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{ltv.predictedLtvMonths} Months</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Expansion Score</div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#22c55e' }}>{ltv.expansionPotentialScore}/100</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Historical Total</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>${ltv.historicalRevenueTotal.toLocaleString()}</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                  Recommended Expansion Opportunities:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ltv.upsellRecommendations.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>No active expansion signals detected.</div>
                  ) : (
                    ltv.upsellRecommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>{rec.title}</span>
                          <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '12px' }}>
                            +${rec.estimatedMrrImpact}/mo
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>{rec.rationale}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Customer Success Interventions */}
      {subTab === 'interventions' && (
        <div id="panel-interventions">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['', 'pending', 'in_progress', 'completed', 'dismissed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setInterventionStatusFilter(status)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: interventionStatusFilter === status ? '#2563eb' : '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {status || 'All'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setDispatchModalOpen(true)}
              style={{
                padding: '6px 14px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              New Intervention
            </button>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 16px' }}>Title & Playbook</th>
                  <th style={{ padding: '12px 16px' }}>Tenant</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Assignee</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Outcome</th>
                  <th style={{ padding: '12px 16px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {interventions.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                      No CS interventions found.
                    </td>
                  </tr>
                ) : (
                  interventions.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{item.title}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.playbookType.replace(/_/g, ' ')}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                        {item.tenantName || item.tenantId}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.priority === 'urgent' ? '#ef444420' : item.priority === 'high' ? '#f9731620' : '#334155',
                            color: item.priority === 'urgent' ? '#ef4444' : item.priority === 'high' ? '#f97316' : '#cbd5e1',
                          }}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '13px' }}>
                        {item.assignedTo}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.status === 'completed' ? '#22c55e20' : item.status === 'in_progress' ? '#38bdf820' : '#334155',
                            color: item.status === 'completed' ? '#22c55e' : item.status === 'in_progress' ? '#38bdf8' : '#cbd5e1',
                          }}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {item.outcomeEffectiveness ? (
                          <span style={{ fontSize: '12px', color: item.outcomeEffectiveness === 'retained' || item.outcomeEffectiveness === 'expanded' ? '#22c55e' : '#ef4444' }}>
                            {item.outcomeEffectiveness}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '12px' }}>--</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => {
                            setSelectedIntervention(item);
                            setEditForm({
                              status: item.status,
                              resolutionNotes: item.resolutionNotes || '',
                              outcomeEffectiveness: item.outcomeEffectiveness || 'retained',
                            });
                            setEditInterventionModalOpen(true);
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
                          onClick={() => handleDeleteIntervention(item.id)}
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

      {/* Subtab 4: What-If Simulator */}
      {subTab === 'simulator' && (
        <div id="panel-simulator" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Controls */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={20} color="#38bdf8" />
              Behavioral Parameter Adjustments
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Usage Velocity Delta</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: simForm.usageVelocityDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                  {simForm.usageVelocityDelta >= 0 ? `+${simForm.usageVelocityDelta}%` : `${simForm.usageVelocityDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={simForm.usageVelocityDelta}
                onChange={(e) => setSimForm({ ...simForm, usageVelocityDelta: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Seat Utilization Delta</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: simForm.seatUtilizationDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                  {simForm.seatUtilizationDelta >= 0 ? `+${simForm.seatUtilizationDelta}%` : `${simForm.seatUtilizationDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={simForm.seatUtilizationDelta}
                onChange={(e) => setSimForm({ ...simForm, seatUtilizationDelta: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Billing Health Delta</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: simForm.billingHealthDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                  {simForm.billingHealthDelta >= 0 ? `+${simForm.billingHealthDelta}%` : `${simForm.billingHealthDelta}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={simForm.billingHealthDelta}
                onChange={(e) => setSimForm({ ...simForm, billingHealthDelta: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={simForm.discountIncentiveApplied}
                  onChange={(e) => setSimForm({ ...simForm, discountIncentiveApplied: e.target.checked })}
                />
                Apply Annual Prepayment Incentive (-8% Churn Risk)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={simForm.trainingSessionCompleted}
                  onChange={(e) => setSimForm({ ...simForm, trainingSessionCompleted: e.target.checked })}
                />
                Brand Knowledge Graph Training Completed (+12.5% Retention Lift)
              </label>
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
              {simLoading ? 'Calculating Projection...' : 'Recalculate Predictive Forecast'}
            </button>
          </div>

          {/* Results Preview */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#a855f7" />
              Simulated Forecast & Financial Impact
            </h3>

            {simResult ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Simulated Churn Risk</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: getTierColor(simResult.simulatedRiskTier) }}>
                      {simResult.simulatedRiskScore}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                      {simResult.simulatedRiskTier} Tier
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Prevented Churn Prob.</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                      +{simResult.preventedChurnProbability}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Relative to baseline</div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Projected LTV Total</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8' }}>
                      ${simResult.projectedLtvTotal.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {simResult.simulatedLtvMonths} months lifespan
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Financial Variance</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: simResult.projectedMrrVariance >= 0 ? '#22c55e' : '#ef4444' }}>
                      {simResult.projectedMrrVariance >= 0 ? `+$${simResult.projectedMrrVariance.toLocaleString()}` : `-$${Math.abs(simResult.projectedMrrVariance).toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Net lifetime revenue impact</div>
                  </div>
                </div>

                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#cbd5e1' }}>
                  Model-Generated Strategic Directives:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {simResult.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#0f172a',
                        borderLeft: '3px solid #38bdf8',
                        borderRadius: '0 4px 4px 0',
                        fontSize: '13px',
                        color: '#f8fafc',
                      }}
                    >
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                Adjust parameters to simulate predictive outcomes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Dispatch CS Intervention */}
      {dispatchModalOpen && (
        <div
          id="modal-dispatch-intervention"
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
            <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Dispatch Proactive Customer Success Playbook</h3>
            <form onSubmit={handleDispatchIntervention}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Tenant</label>
                <select
                  value={dispatchForm.tenantId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, tenantId: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  required
                >
                  <option value="">Select Tenant...</option>
                  {churnScores.map((s) => (
                    <option key={s.tenantId} value={s.tenantId}>
                      {s.tenantName || s.tenantId} ({s.churnRiskScore}% risk)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Intervention Title</label>
                <input
                  type="text"
                  value={dispatchForm.title}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  placeholder="e.g. Executive Sponsor Roadmap Check-in"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Playbook Type</label>
                  <select
                    value={dispatchForm.playbookType}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, playbookType: e.target.value as InterventionPlaybookType })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  >
                    <option value="executive_sponsor_outreach">Executive Sponsor Outreach</option>
                    <option value="proactive_training_session">Proactive Training Session</option>
                    <option value="discount_incentive">Discount Incentive</option>
                    <option value="usage_remediation">Usage Remediation</option>
                    <option value="feature_walkthrough">Feature Walkthrough</option>
                    <option value="custom_qbr">Custom QBR</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Priority</label>
                  <select
                    value={dispatchForm.priority}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, priority: e.target.value as InterventionPriority })}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Assigned CS Agent</label>
                <input
                  type="email"
                  value={dispatchForm.assignedTo}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, assignedTo: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Trigger Reason & Notes</label>
                <textarea
                  value={dispatchForm.triggerReason}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, triggerReason: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', height: '60px' }}
                  placeholder="Context on why this intervention was triggered"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Dispatch Playbook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Assess Tenant Risk */}
      {assessModalOpen && (
        <div
          id="modal-assess-risk"
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
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '480px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Assess Tenant Predictive Churn Risk</h3>
            <form onSubmit={handleAssessRisk}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Target Tenant</label>
                <select
                  value={assessForm.tenantId}
                  onChange={(e) => setAssessForm({ ...assessForm, tenantId: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                  required
                >
                  {churnScores.map((s) => (
                    <option key={s.tenantId} value={s.tenantId}>
                      {s.tenantName || s.tenantId}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Usage Velocity Score</span>
                  <strong>{assessForm.usageVelocityScore}/100</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={assessForm.usageVelocityScore}
                  onChange={(e) => setAssessForm({ ...assessForm, usageVelocityScore: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Seat Utilization Percent</span>
                  <strong>{assessForm.seatUtilizationPercent}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={assessForm.seatUtilizationPercent}
                  onChange={(e) => setAssessForm({ ...assessForm, seatUtilizationPercent: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                  <span>Billing Health Score</span>
                  <strong>{assessForm.billingHealthScore}/100</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={assessForm.billingHealthScore}
                  onChange={(e) => setAssessForm({ ...assessForm, billingHealthScore: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssessModalOpen(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Execute Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Update Intervention Status */}
      {editInterventionModalOpen && selectedIntervention && (
        <div
          id="modal-edit-intervention"
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
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', width: '480px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc' }}>Update Customer Success Playbook</h3>
            <form onSubmit={handleUpdateIntervention}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as InterventionStatus })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Outcome Effectiveness</label>
                <select
                  value={editForm.outcomeEffectiveness}
                  onChange={(e) => setEditForm({ ...editForm, outcomeEffectiveness: e.target.value as OutcomeEffectiveness })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc' }}
                >
                  <option value="retained">Retained (Account Stabilized)</option>
                  <option value="expanded">Expanded (Upsold Additional Add-ons)</option>
                  <option value="neutral">Neutral (No Measurable Change)</option>
                  <option value="churned_anyway">Churned Anyway</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Resolution Notes</label>
                <textarea
                  value={editForm.resolutionNotes}
                  onChange={(e) => setEditForm({ ...editForm, resolutionNotes: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px', color: '#f8fafc', height: '80px' }}
                  placeholder="Record call summary, client feedback, or next steps"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditInterventionModalOpen(false)}
                  style={{ padding: '8px 16px', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Save Changes
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
