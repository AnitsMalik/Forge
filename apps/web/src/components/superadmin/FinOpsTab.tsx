/**
 * Enterprise Multi-Cloud Infrastructure FinOps, Real-Time Cost Attribution & Resource Rightsizing Engine Tab
 * HoaspForge Platform v5.5.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Cpu,
  Activity,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Layers,
  ChevronRight,
  ShieldCheck,
  Play,
  Zap,
  Cloud,
  PieChart,
  Sliders,
  Check,
  X,
  Trash2,
  Edit2,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { ConfirmDialogModal } from './ConfirmDialogModal.js';
import type {
  CloudCostAccount,
  TenantCostAttribution,
  FinOpsResourceRightsizing,
  FinOpsTelemetry,
  FinOpsCostSimulationResult,
  CloudProvider,
  RightsizingStatus,
} from '@socialforge/shared';

interface Props {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

type SubTab = 'accounts' | 'attribution' | 'rightsizing' | 'simulator';

export const FinOpsTab: React.FC<Props> = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<SubTab>('accounts');

  // Telemetry
  const [telemetry, setTelemetry] = useState<FinOpsTelemetry | null>(null);

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

  // Cloud Cost Accounts
  const [accounts, setAccounts] = useState<CloudCostAccount[]>([]);
  const [searchAccount, setSearchAccount] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Tenant Cost Attributions
  const [attributions, setAttributions] = useState<TenantCostAttribution[]>([]);
  const [periodFilter, setPeriodFilter] = useState('2026-10');

  // Rightsizing Recommendations
  const [rightsizingList, setRightsizingList] = useState<FinOpsResourceRightsizing[]>([]);
  const [rightsizingStatusFilter, setRightsizingStatusFilter] = useState('');

  // Modals
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CloudCostAccount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createAccountForm, setCreateAccountForm] = useState<{
    provider: CloudProvider;
    account_id: string;
    account_name: string;
    monthly_budget: number;
    current_month_spend: number;
    currency: string;
  }>({
    provider: 'aws',
    account_id: '',
    account_name: '',
    monthly_budget: 5000,
    current_month_spend: 0,
    currency: 'USD',
  });

  // Edit Form State
  const [editAccountForm, setEditAccountForm] = useState<{
    account_name: string;
    monthly_budget: number;
    current_month_spend: number;
  }>({
    account_name: '',
    monthly_budget: 0,
    current_month_spend: 0,
  });

  // Simulation State
  const [simPostGrowth, setSimPostGrowth] = useState(50);
  const [simAiGrowth, setSimAiGrowth] = useState(75);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<FinOpsCostSimulationResult | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [telRes, accRes, attrRes, rightRes] = await Promise.all([
        api.adminOps.getFinOpsTelemetry(),
        api.adminOps.listCloudAccounts(),
        api.adminOps.listTenantCostAttributions(),
        api.adminOps.listRightsizingRecommendations(),
      ]);
      setTelemetry(telRes);
      setAccounts(accRes);
      setAttributions(attrRes);
      setRightsizingList(rightRes);
    } catch (err: any) {
      showToast(`Failed to load FinOps data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountForm.account_name.trim() || !createAccountForm.account_id.trim()) {
      showToast('Account name and ID are required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await api.adminOps.createCloudAccount(createAccountForm);
      showToast(`Cloud account "${createAccountForm.account_name}" created successfully`, 'success');
      setShowCreateAccountModal(false);
      setCreateAccountForm({
        provider: 'aws',
        account_id: '',
        account_name: '',
        monthly_budget: 5000,
        current_month_spend: 0,
        currency: 'USD',
      });
      loadData();
    } catch (err: any) {
      showToast(`Account creation failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Account
  const handleEditAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setActionLoading(true);
    try {
      await api.adminOps.updateCloudAccount(editingAccount.id, editAccountForm);
      showToast(`Cloud account "${editAccountForm.account_name}" updated`, 'success');
      setEditingAccount(null);
      loadData();
    } catch (err: any) {
      showToast(`Account update failed: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = (account: CloudCostAccount) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Cloud Cost Account',
      description: `Are you sure you want to delete cloud account "${account.account_name}"? Cost attribution and historical invoice tracking for this account will be detached.`,
      confirmText: 'Delete Account',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(true);
        try {
          await api.adminOps.deleteCloudAccount(account.id);
          showToast(`Account "${account.account_name}" deleted`, 'success');
          loadData();
        } catch (err: any) {
          showToast(`Deletion failed: ${err.message}`, 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Handle Apply Rightsizing
  const handleApplyRightsizing = async (id: string, actionName: string) => {
    setActionLoading(true);
    try {
      await api.adminOps.applyRightsizingRecommendation(id);
      showToast(`Rightsizing optimization "${actionName}" applied successfully`, 'success');
      loadData();
    } catch (err: any) {
      showToast(`Failed to apply optimization: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Dismiss Rightsizing
  const handleDismissRightsizing = async (id: string) => {
    setActionLoading(true);
    try {
      await api.adminOps.dismissRightsizingRecommendation(id);
      showToast('Rightsizing recommendation dismissed', 'info');
      loadData();
    } catch (err: any) {
      showToast(`Failed to dismiss recommendation: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Run Simulation
  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await api.adminOps.simulateFinOpsGrowth({
        target_tenant_id: '0842e532-e6cf-4cc1-b8ce-4c4546a10a97',
        post_growth_percent: simPostGrowth,
        ai_token_growth_percent: simAiGrowth,
      });
      setSimResult(res);
      showToast('What-if growth simulation evaluated successfully', 'success');
    } catch (err: any) {
      showToast(`Simulation failed: ${err.message}`, 'error');
    } finally {
      setSimLoading(false);
    }
  };

  // Filtered Accounts
  const filteredAccounts = accounts.filter((a) => {
    if (providerFilter && a.provider !== providerFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (searchAccount) {
      const q = searchAccount.toLowerCase();
      return (
        a.account_name.toLowerCase().includes(q) ||
        a.account_id.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Rightsizing
  const filteredRightsizing = rightsizingList.filter((r) => {
    if (rightsizingStatusFilter && r.status !== rightsizingStatusFilter) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div
        className="glass-card"
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: '1.4rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span title="FinOps Engine" style={{ display: 'inline-flex' }}>
              <DollarSign size={24} color="#10b981" />
            </span>
            Enterprise Multi-Cloud FinOps & Cost Attribution
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Continuous multi-cloud expenditure observability, tenant-level unit economics, automated rightsizing recommendations, and what-if growth forecasting sandbox.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span title="Refresh" style={{ display: 'inline-flex' }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
            </span>
            Refresh
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowCreateAccountModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span title="Add Account" style={{ display: 'inline-flex' }}>
              <Plus size={16} />
            </span>
            Connect Cloud Account
          </button>
        </div>
      </div>

      {/* 4 KPI Telemetry Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Total Cloud Spend */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Current Month Cloud Spend
            </span>
            <span title="Cloud Spend" style={{ display: 'inline-flex' }}>
              <DollarSign size={18} color="#10b981" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#10b981' }}>
            ${telemetry ? telemetry.totalMonthlySpend.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '...'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Budget: ${telemetry ? telemetry.totalMonthlyBudget.toLocaleString() : '...'} ({telemetry?.budgetUtilizationPercent ?? 0}% utilized)
          </div>
        </div>

        {/* Projected Month-End Spend */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Projected Month-End Spend
            </span>
            <span title="Month-End Run Rate" style={{ display: 'inline-flex' }}>
              <TrendingUp size={18} color="#3b82f6" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#60a5fa' }}>
            ${telemetry ? telemetry.projectedMonthEndSpend.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '...'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across {telemetry?.activeAccountsCount ?? 0} active cloud providers
          </div>
        </div>

        {/* Rightsizing Savings */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Rightsizing Savings Available
            </span>
            <span title="Rightsizing Savings" style={{ display: 'inline-flex' }}>
              <Cpu size={18} color="#8b5cf6" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#a78bfa' }}>
            ${telemetry ? telemetry.totalRightsizingSavingsMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}/mo
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {telemetry?.activeRightsizingCount ?? 0} actionable optimization recommendations
          </div>
        </div>

        {/* Average Gross Margin */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tenant Gross Margin
            </span>
            <span title="Gross Margin" style={{ display: 'inline-flex' }}>
              <Activity size={18} color="#f59e0b" />
            </span>
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fbbf24' }}>
            {telemetry?.averageTenantGrossMarginPercent ?? 88.5}%
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            SaaS Unit Economics SLA target: &ge; 85.0%
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setSubTab('accounts')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'accounts' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'accounts' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'accounts' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Accounts" style={{ display: 'inline-flex' }}>
            <Cloud size={16} />
          </span>
          Cloud Accounts ({accounts.length})
        </button>

        <button
          onClick={() => setSubTab('attribution')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'attribution' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'attribution' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'attribution' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Attribution" style={{ display: 'inline-flex' }}>
            <PieChart size={16} />
          </span>
          Tenant Cost Attribution ({attributions.length})
        </button>

        <button
          onClick={() => setSubTab('rightsizing')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'rightsizing' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'rightsizing' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'rightsizing' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Rightsizing" style={{ display: 'inline-flex' }}>
            <Cpu size={16} />
          </span>
          Rightsizing Advisor ({rightsizingList.filter((r) => r.status === 'pending').length} Pending)
        </button>

        <button
          onClick={() => setSubTab('simulator')}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'simulator' ? '2px solid #10b981' : '2px solid transparent',
            color: subTab === 'simulator' ? '#10b981' : 'var(--text-secondary)',
            fontWeight: subTab === 'simulator' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span title="Growth Simulator" style={{ display: 'inline-flex' }}>
            <Sliders size={16} />
          </span>
          What-If Growth Simulator
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CLOUD COST ACCOUNTS                                            */}
      {/* ========================================================================= */}
      {subTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters */}
          <div
            className="glass-card"
            style={{
              padding: '14px 20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search accounts by name, ID or provider..."
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="select-custom"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All Providers</option>
              <option value="aws">AWS</option>
              <option value="gcp">Google Cloud (GCP)</option>
              <option value="azure">Microsoft Azure</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="openai_anthropic">OpenAI & Anthropic LLMs</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-custom"
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active (Within Budget)</option>
              <option value="warning_budget">Warning (&gt;85% Budget)</option>
              <option value="exceeded_budget">Exceeded Budget</option>
            </select>
          </div>

          {/* Accounts Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredAccounts.map((account) => {
              const utilPercent = account.monthly_budget > 0
                ? Math.round((account.current_month_spend / account.monthly_budget) * 100)
                : 0;
              const isOver = account.status === 'exceeded_budget';
              const isWarning = account.status === 'warning_budget';

              return (
                <div
                  key={account.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    borderLeft: `4px solid ${
                      isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981'
                    }`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#93c5fd',
                        }}
                      >
                        {account.provider}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isOver
                            ? 'rgba(239, 68, 68, 0.15)'
                            : isWarning
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                          color: isOver ? '#fca5a5' : isWarning ? '#fde047' : '#86efac',
                        }}
                      >
                        {account.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 600 }}>
                      {account.account_name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ID: {account.account_id}
                    </div>
                  </div>

                  {/* Spend vs Budget Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Spend: ${account.current_month_spend.toLocaleString()}</span>
                      <span style={{ fontWeight: 600, color: isOver ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--text-primary)' }}>
                        Budget: ${account.monthly_budget.toLocaleString()} ({utilPercent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '7px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(utilPercent, 100)}%`,
                          height: '100%',
                          background: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setEditingAccount(account);
                        setEditAccountForm({
                          account_name: account.account_name,
                          monthly_budget: account.monthly_budget,
                          current_month_spend: account.current_month_spend,
                        });
                      }}
                      style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span title="Edit" style={{ display: 'inline-flex' }}>
                        <Edit2 size={13} />
                      </span>
                      Adjust Budget
                    </button>
                    {!['acc-aws-prod-01', 'acc-gcp-ai-02', 'acc-cf-edge-03', 'acc-openai-tokens-04'].includes(account.id) && (
                      <button
                        className="btn-secondary"
                        onClick={() => handleDeleteAccount(account)}
                        disabled={actionLoading}
                        style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        <span title="Delete" style={{ display: 'inline-flex' }}>
                          <Trash2 size={13} />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: TENANT COST ATTRIBUTION                                        */}
      {/* ========================================================================= */}
      {subTab === 'attribution' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Tenant Unit Economics & Margin Attribution
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Real-time breakdown of compute, media storage, AI token inference, and edge egress per tenant.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Period:</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="2026-10">October 2026 (Current)</option>
                <option value="2026-09">September 2026</option>
              </select>
            </div>
          </div>

          {/* Attributions Table */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Tenant</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Spend</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>AI Tokens</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Compute & Storage</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Unit Cost / Post</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Gross Margin</th>
                    <th style={{ padding: '14px 18px', color: 'var(--text-muted)', fontWeight: 600 }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {attributions.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.tenant_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {row.tenant_id}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, color: '#10b981' }}>
                        ${row.total_spend.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-primary)' }}>
                        ${row.ai_spend.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                        ${(row.compute_spend + row.storage_spend).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#93c5fd' }}>
                        ${row.cost_per_post.toFixed(4)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background:
                              row.gross_margin_percent >= 85
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color: row.gross_margin_percent >= 85 ? '#86efac' : '#fde047',
                          }}
                        >
                          {row.gross_margin_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {row.cost_trend === 'increasing' ? (
                            <>
                              <ArrowUpRight size={15} color="#ef4444" />
                              <span style={{ color: '#fca5a5', fontSize: '0.78rem' }}>Increasing</span>
                            </>
                          ) : row.cost_trend === 'decreasing' ? (
                            <>
                              <ArrowDownRight size={15} color="#10b981" />
                              <span style={{ color: '#86efac', fontSize: '0.78rem' }}>Decreasing</span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Stable</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: RESOURCE RIGHTSIZING ADVISOR                                   */}
      {/* ========================================================================= */}
      {subTab === 'rightsizing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            className="glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
                Automated Infrastructure Rightsizing & Savings Advisor
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Algorithmic detection of underutilized instances, uncommitted AI token pipelines, and idle database replicas.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Status Filter:</span>
              <select
                value={rightsizingStatusFilter}
                onChange={(e) => setRightsizingStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">All Recommendations</option>
                <option value="pending">Pending Review</option>
                <option value="applied">Applied</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {/* Recommendations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredRightsizing.map((rec) => {
              const isPending = rec.status === 'pending';
              const isApplied = rec.status === 'applied';

              return (
                <div
                  key={rec.id}
                  className="glass-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    borderLeft: `4px solid ${
                      isApplied ? '#10b981' : isPending ? '#8b5cf6' : 'var(--text-muted)'
                    }`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#93c5fd',
                        }}
                      >
                        {rec.provider}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {rec.resource_type}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isApplied
                            ? 'rgba(16, 185, 129, 0.15)'
                            : isPending
                            ? 'rgba(139, 92, 246, 0.15)'
                            : 'rgba(255, 255, 255, 0.05)',
                          color: isApplied ? '#86efac' : isPending ? '#c4b5fd' : 'var(--text-muted)',
                        }}
                      >
                        {rec.status.toUpperCase()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.02rem', fontWeight: 600 }}>
                      {rec.recommendation_action}
                    </h4>
                    <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {rec.rationale}
                    </p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      Target: {rec.resource_identifier} &bull; Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Monthly Savings</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>
                        +${rec.projected_savings_monthly.toFixed(2)}/mo
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Current cost: ${rec.current_cost_monthly.toFixed(2)}
                      </div>
                    </div>

                    {isPending && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleApplyRightsizing(rec.id, rec.recommendation_action)}
                          disabled={actionLoading}
                          style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span title="Apply" style={{ display: 'inline-flex' }}>
                            <Check size={14} />
                          </span>
                          Apply Optimization
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleDismissRightsizing(rec.id)}
                          disabled={actionLoading}
                          style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span title="Dismiss" style={{ display: 'inline-flex' }}>
                            <X size={13} />
                          </span>
                          Dismiss
                        </button>
                      </div>
                    )}

                    {isApplied && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.82rem' }}>
                        <span title="Applied" style={{ display: 'inline-flex' }}>
                          <CheckCircle2 size={16} />
                        </span>
                        Optimized
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: WHAT-IF GROWTH & MARGIN SIMULATOR                             */}
      {/* ========================================================================= */}
      {subTab === 'simulator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Controls Panel */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span title="Simulator" style={{ display: 'inline-flex' }}>
                  <Sliders size={18} color="#10b981" />
                </span>
                What-If Growth & Margin Simulation Sandbox
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Forecast SaaS gross margin and multi-cloud infrastructure unit costs as tenant publishing and AI usage surge.
              </p>
            </div>

            {/* Slider 1: Post Volume Growth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Simulated Post Volume Growth</label>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981' }}>+{simPostGrowth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={simPostGrowth}
                onChange={(e) => setSimPostGrowth(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Baseline (0%)</span>
                <span>+150% Surge</span>
                <span>+300% Enterprise Scale</span>
              </div>
            </div>

            {/* Slider 2: AI Token Growth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Simulated AI Token Inference Growth</label>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#3b82f6' }}>+{simAiGrowth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="25"
                value={simAiGrowth}
                onChange={(e) => setSimAiGrowth(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Baseline (0%)</span>
                <span>+250% Heavy Copilot</span>
                <span>+500% Agent Fleet</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={handleRunSimulation}
              disabled={simLoading}
              style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontWeight: 600 }}
            >
              <span title="Run" style={{ display: 'inline-flex' }}>
                <Play size={16} />
              </span>
              {simLoading ? 'Simulating Multi-Cloud Telemetry...' : 'Run What-If Simulation'}
            </button>
          </div>

          {/* Results Panel */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span title="Results" style={{ display: 'inline-flex' }}>
                <PieChart size={18} color="#3b82f6" />
              </span>
              Simulation Projection Matrix
            </h3>

            {simResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Cost</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fca5a5' }}>
                      ${simResult.projectedMonthlyCost.toFixed(2)}/mo
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Baseline: ${simResult.currentMonthlyCost.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Projected Gross Margin</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#86efac' }}>
                      {simResult.projectedGrossMarginPercent.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Target: &ge; 85.0%
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Unit Cost / Post</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#93c5fd' }}>
                      ${simResult.estimatedUnitCostPerPost.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Scale economics
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Algorithmic FinOps Architectural Guidance:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
                    {simResult.recommendations.map((rec, i) => (
                      <li key={i} style={{ color: 'var(--text-primary)' }}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <span title="Pending" style={{ display: 'inline-flex', marginBottom: '12px' }}>
                  <Activity size={32} />
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem' }}>
                  Adjust growth parameters on the left and click "Run What-If Simulation" to generate real-time cloud margin projections.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONNECT CLOUD COST ACCOUNT                                         */}
      {/* ========================================================================= */}
      {showCreateAccountModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateAccountModal(false);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Connect Cloud Cost Account</h3>
              <button
                onClick={() => setShowCreateAccountModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Cloud Provider
                </label>
                <select
                  value={createAccountForm.provider}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, provider: e.target.value as CloudProvider })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="aws">Amazon Web Services (AWS)</option>
                  <option value="gcp">Google Cloud Platform (GCP)</option>
                  <option value="azure">Microsoft Azure</option>
                  <option value="cloudflare">Cloudflare Edge</option>
                  <option value="openai_anthropic">OpenAI & Anthropic LLMs</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Account / Subscription Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Production Workloads"
                  value={createAccountForm.account_name}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, account_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Cloud Account ID / ARN
                </label>
                <input
                  type="text"
                  placeholder="e.g. 140558874263"
                  value={createAccountForm.account_id}
                  onChange={(e) => setCreateAccountForm({ ...createAccountForm, account_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Monthly Budget ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={createAccountForm.monthly_budget}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, monthly_budget: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Current Spend ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={createAccountForm.current_month_spend}
                    onChange={(e) => setCreateAccountForm({ ...createAccountForm, current_month_spend: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateAccountModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Connecting...' : 'Connect Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADJUST CLOUD BUDGET                                                */}
      {/* ========================================================================= */}
      {editingAccount && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAccount(null);
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                Adjust Cloud Account Parameters
              </h3>
              <button
                onClick={() => setEditingAccount(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={editAccountForm.account_name}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, account_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Monthly Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editAccountForm.monthly_budget}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, monthly_budget: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Current Month Spend ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={editAccountForm.current_month_spend}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, current_month_spend: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingAccount(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Parameters'}
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
