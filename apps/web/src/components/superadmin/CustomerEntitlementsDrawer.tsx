import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Sparkles,
  Layers,
  Calendar,
  Users,
  Building2,
  HardDrive,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  History,
  Lock,
  Unlock,
  Sliders,
  Save,
  Loader2,
  ExternalLink,
  ChevronRight,
  Clock,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api.js';
import type {
  CustomerSubscriptionDetail,
  EnterpriseCustomEntitlement,
  EntitlementAuditLogEntry,
  QuotaResource,
} from '@socialforge/shared';

interface CustomerEntitlementsDrawerProps {
  tenantId: string;
  onClose: () => void;
  onSubscriptionUpdated?: () => void;
}

export const CustomerEntitlementsDrawer: React.FC<CustomerEntitlementsDrawerProps> = ({
  tenantId,
  onClose,
  onSubscriptionUpdated,
}) => {
  const [data, setData] = useState<CustomerSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'overrides' | 'audit'>('overview');

  // Assign Plan Modal
  const [isAssignPlanOpen, setIsAssignPlanOpen] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState('growth');
  const [assignImmediate, setAssignImmediate] = useState(true);
  const [assignCustomPrice, setAssignCustomPrice] = useState<string>('');
  const [assignReason, setAssignReason] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Add / Edit Custom Override Modal
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideResource, setOverrideResource] = useState<QuotaResource>('brands');
  const [overrideIsEnabled, setOverrideIsEnabled] = useState(true);
  const [overrideLimitValue, setOverrideLimitValue] = useState<string>('50');
  const [overrideIsUnlimited, setOverrideIsUnlimited] = useState(false);
  const [overrideExpiresAt, setOverrideExpiresAt] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Rollback Modal
  const [rollbackAuditEntry, setRollbackAuditEntry] = useState<EntitlementAuditLogEntry | null>(null);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false);

  // Remove Override Confirmation
  const [removingResource, setRemovingResource] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removeSubmitting, setRemoveSubmitting] = useState(false);

  // Search & Filter state for overrides
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideStatusFilter, setOverrideStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const setQuickExpiry = (days: number | null) => {
    if (days === null) {
      setOverrideExpiresAt('');
      return;
    }
    const target = new Date();
    target.setDate(target.getDate() + days);
    setOverrideExpiresAt(target.toISOString().split('T')[0]);
  };

  const setEndOfYearExpiry = () => {
    const year = new Date().getFullYear();
    setOverrideExpiresAt(`${year}-12-31`);
  };

  const applyOverridePreset = (preset: {
    resource: QuotaResource;
    limitValue: string;
    isUnlimited: boolean;
    days: number | null;
    reason: string;
  }) => {
    setOverrideResource(preset.resource);
    setOverrideIsEnabled(true);
    setOverrideIsUnlimited(preset.isUnlimited);
    setOverrideLimitValue(preset.limitValue);
    setQuickExpiry(preset.days);
    setOverrideReason(preset.reason);
  };

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<any>(`/admin/billing/customers/${tenantId}`);
      if (res && res.success !== undefined) {
        setData(res.data || res);
      } else {
        setData(res);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load customer subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerDetails();
  }, [tenantId]);

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignReason.trim()) {
      setNotification({ type: 'error', message: 'Mandatory audit justification reason is required.' });
      return;
    }

    try {
      setAssignSubmitting(true);
      const payload: Record<string, any> = {
        planId: assignPlanId,
        immediate: assignImmediate,
        reason: assignReason.trim(),
      };
      if (assignCustomPrice && !isNaN(Number(assignCustomPrice))) {
        payload.customPriceCents = Math.round(Number(assignCustomPrice) * 100);
      }

      await api.post(`/admin/billing/customers/${tenantId}/assign-plan`, payload);
      setNotification({ type: 'success', message: `Plan '${assignPlanId}' assigned successfully.` });
      setIsAssignPlanOpen(false);
      setAssignReason('');
      setAssignCustomPrice('');
      await loadCustomerDetails();
      if (onSubscriptionUpdated) onSubscriptionUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to assign plan.' });
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setNotification({ type: 'error', message: 'Mandatory justification reason is required for enterprise override.' });
      return;
    }

    try {
      setOverrideSubmitting(true);
      const payload: Record<string, any> = {
        resource: overrideResource,
        isEnabled: overrideIsEnabled,
        limitValue: overrideIsUnlimited ? null : (overrideLimitValue ? Number(overrideLimitValue) : null),
        reason: overrideReason.trim(),
        expiresAt: overrideExpiresAt ? new Date(overrideExpiresAt).toISOString() : null,
      };

      await api.post(`/admin/billing/customers/${tenantId}/entitlements`, payload);
      setNotification({ type: 'success', message: `Custom override for '${overrideResource}' saved.` });
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      setOverrideExpiresAt('');
      await loadCustomerDetails();
      if (onSubscriptionUpdated) onSubscriptionUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to save entitlement override.' });
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleRemoveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingResource || !removeReason.trim()) {
      setNotification({ type: 'error', message: 'Mandatory justification reason is required to remove override.' });
      return;
    }

    try {
      setRemoveSubmitting(true);
      await api.delete(`/admin/billing/customers/${tenantId}/entitlements/${removingResource}`, {
        data: { reason: removeReason.trim() },
      });
      setNotification({ type: 'success', message: `Override '${removingResource}' safely removed. Reverted to standard plan.` });
      setRemovingResource(null);
      setRemoveReason('');
      await loadCustomerDetails();
      if (onSubscriptionUpdated) onSubscriptionUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to remove override.' });
    } finally {
      setRemoveSubmitting(false);
    }
  };

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackAuditEntry || !rollbackReason.trim()) {
      setNotification({ type: 'error', message: 'Mandatory rollback reason is required.' });
      return;
    }

    try {
      setRollbackSubmitting(true);
      await api.post(`/admin/billing/entitlements/${rollbackAuditEntry.id}/rollback`, {
        reason: rollbackReason.trim(),
      });
      setNotification({ type: 'success', message: `Successfully rolled back entitlement '${rollbackAuditEntry.resource}'.` });
      setRollbackAuditEntry(null);
      setRollbackReason('');
      await loadCustomerDetails();
      if (onSubscriptionUpdated) onSubscriptionUpdated();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.response?.data?.error || err.message || 'Failed to rollback entitlement.' });
    } finally {
      setRollbackSubmitting(false);
    }
  };

  const formatResourceName = (res: string) => {
    return res
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          height: '100%',
          background: '#0d131f',
          borderLeft: '1px solid #1f293d',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid #1f293d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: '#111827',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#a78bfa',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                Customer Workspace
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {tenantId}</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              {data?.tenant.name || 'Workspace Subscription'}
            </h2>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
              Slug: <code style={{ color: '#cbd5e1' }}>{data?.tenant.slug}</code> • Contact: {data?.tenant.ownerEmail || '—'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1f293d', background: '#0f172a', padding: '0 28px' }}>
          {[
            { id: 'overview', label: 'Subscription & Limits', icon: Layers },
            { id: 'overrides', label: 'Enterprise Custom Entitlements', icon: Sliders },
            { id: 'audit', label: 'Audit Trail & Governance', icon: History },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: isActive ? '#a78bfa' : '#94a3b8',
                  borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        {notification && (
          <div
            style={{
              margin: '16px 28px 0 28px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: notification.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: notification.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <span>Retrieving customer subscription state &amp; entitlements...</span>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
              {error}
            </div>
          ) : data ? (
            <>
              {/* TAB 1: SUBSCRIPTION & LIMITS OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Active Subscription Card */}
                  <div
                    style={{
                      background: '#131b2e',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                        Current Subscription
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                          {data.plan?.name || 'No Plan'}
                        </h3>
                        <span
                          style={{
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: data.subscription?.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: data.subscription?.status === 'active' ? '#10b981' : '#f59e0b',
                            border: `1px solid ${data.subscription?.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          }}
                        >
                          {data.subscription?.status || 'inactive'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
                        ${data.plan?.price}.00 {data.plan?.currency?.toUpperCase()}/{data.plan?.billingInterval} • Provider: {data.subscription?.provider || 'manual'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setAssignPlanId(data.subscription?.planId || 'growth');
                        setIsAssignPlanOpen(true);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: '#8b5cf6',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Sparkles size={15} />
                      <span>Assign Approved Plan</span>
                    </button>
                  </div>

                  {/* Quotas & Usage Progress */}
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px' }}>
                      Effective Resource Limits &amp; Consumption
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {[
                        { key: 'brands', label: 'Brand Workspaces', icon: Building2 },
                        { key: 'seats', label: 'Team Seats', icon: Users },
                        { key: 'social_accounts', label: 'Social Channels', icon: Zap },
                        { key: 'posts', label: 'Monthly Posts', icon: Calendar },
                        { key: 'storage', label: 'Cloud Storage', icon: HardDrive },
                        { key: 'active_automations', label: 'Active Automations', icon: Cpu },
                      ].map((item) => {
                        const lim = data.effectiveLimits[item.key] || { current: 0, limit: 1, remaining: 1, allowed: true, isOverride: false };
                        const percent = lim.limit > 0 ? Math.min(100, Math.round((lim.current / lim.limit) * 100)) : 0;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.key}
                            style={{
                              background: '#111827',
                              border: lim.isOverride ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid #1f293d',
                              borderRadius: '10px',
                              padding: '16px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Icon size={16} color={lim.isOverride ? '#a78bfa' : '#64748b'} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>{item.label}</span>
                              </div>
                              {lim.isOverride ? (
                                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                  Override
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: '#64748b', borderRadius: '4px' }}>
                                  Plan Default
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                              <span style={{ color: '#94a3b8' }}>{lim.current} used</span>
                              <strong style={{ color: '#f8fafc' }}>{lim.limit >= 999999 ? 'Unlimited' : `${lim.limit} total`}</strong>
                            </div>

                            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: '100%',
                                  background: percent >= 90 ? '#ef4444' : percent >= 75 ? '#f59e0b' : '#10b981',
                                  transition: 'width 0.3s ease',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Zero Data Deletion Guarantee Compliance Badge */}
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '16px 20px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '10px',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <ShieldCheck size={22} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399', margin: 0 }}>
                            Zero Data Deletion Guarantee Active
                          </h5>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '4px' }}>
                            Enterprise Grade
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                          If this customer workspace exceeds quota limits or transitions between commercial tiers, hoaspForge guarantees <strong>100% data preservation</strong>. Historical posts, media assets, connected social tokens, and analytics records remain strictly intact in read-only state. No customer data is ever pruned or destroyed upon plan downgrades.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ENTERPRISE CUSTOM ENTITLEMENTS */}
              {activeTab === 'overrides' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        Custom Enterprise Entitlement Overrides
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Explicit overrides supersede standard plan packaging for this tenant.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsOverrideModalOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        background: '#8b5cf6',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={15} />
                      <span>Add Custom Override</span>
                    </button>
                  </div>

                  {/* Search and Status Filter Controls */}
                  {data.overrides.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#111827', padding: '8px 12px', borderRadius: '8px', border: '1px solid #1f293d' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Search overrides by resource or reason..."
                          value={overrideSearch}
                          onChange={(e) => setOverrideSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 30px',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            color: '#fff',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { id: 'all', label: 'All', count: data.overrides.length },
                          { id: 'active', label: 'Active', count: data.overrides.filter((o) => !o.isExpired).length },
                          { id: 'expired', label: 'Expired', count: data.overrides.filter((o) => o.isExpired).length },
                        ].map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => setOverrideStatusFilter(btn.id as any)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '5px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: overrideStatusFilter === btn.id ? '#8b5cf6' : '#1e293b',
                              color: overrideStatusFilter === btn.id ? '#fff' : '#94a3b8',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>{btn.label}</span>
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '999px', background: 'rgba(0,0,0,0.2)' }}>
                              {btn.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.overrides.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: '#111827', borderRadius: '12px', border: '1px dashed #334155' }}>
                      <Sliders size={28} color="#64748b" style={{ margin: '0 auto 8px auto' }} />
                      <p style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600, margin: '0 0 4px 0' }}>
                        No Custom Overrides Configured
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        This workspace is governed 100% by its standard <strong>{data.plan?.name}</strong> plan entitlements.
                      </p>
                    </div>
                  ) : (() => {
                    const filtered = data.overrides.filter((override) => {
                      if (overrideStatusFilter === 'active' && override.isExpired) return false;
                      if (overrideStatusFilter === 'expired' && !override.isExpired) return false;
                      if (overrideSearch.trim()) {
                        const q = overrideSearch.toLowerCase();
                        const matchRes = override.resource.toLowerCase().includes(q) || formatResourceName(override.resource).toLowerCase().includes(q);
                        const matchReason = (override.reason || '').toLowerCase().includes(q);
                        const matchAdmin = (override.updatedBy || '').toLowerCase().includes(q);
                        if (!matchRes && !matchReason && !matchAdmin) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '30px', textAlign: 'center', background: '#111827', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                          No overrides match "{overrideSearch}" under status "{overrideStatusFilter}".
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filtered.map((override) => {
                          const isExpired = override.isExpired;

                          return (
                            <div
                              key={override.id}
                              style={{
                                background: '#111827',
                                border: isExpired ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '10px',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                opacity: isExpired ? 0.6 : 1,
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <strong style={{ fontSize: '0.95rem', color: '#f8fafc' }}>
                                    {formatResourceName(override.resource)}
                                  </strong>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      padding: '2px 7px',
                                      borderRadius: '999px',
                                      background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                      color: isExpired ? '#ef4444' : '#10b981',
                                    }}
                                  >
                                    {isExpired ? 'Expired' : 'Active Override'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
                                  Value: <strong>{override.limitValue !== null ? override.limitValue.toLocaleString() : 'Unmetered / Enabled'}</strong>
                                  {override.expiresAt && (
                                    <span style={{ color: '#94a3b8', marginLeft: '10px' }}>
                                      • Expires: {new Date(override.expiresAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                                  Reason: <em>"{override.reason || 'Enterprise contractual override'}"</em> • By: {override.updatedBy || 'SuperAdmin'}
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setRemovingResource(override.resource);
                                  setRemoveReason('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 12px',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Revert Override</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL & GOVERNANCE */}
              {activeTab === 'audit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      Administrative Governance &amp; Audit Trail
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Immutable ledger of all plan assignments, entitlement overrides, and rollbacks for this workspace.
                    </p>
                  </div>

                  {data.auditLogs.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No administrative changes recorded for this workspace.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {data.auditLogs.map((log) => {
                        const isRollback = log.action === 'rollback';
                        const isPlan = log.action === 'plan_assigned';
                        const isRemoved = log.action === 'override_removed';
                        const isCreated = log.action === 'override_created';
                        const isUpdated = log.action === 'override_updated';

                        const badgeStyle = isPlan
                          ? { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }
                          : isRollback
                          ? { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
                          : isRemoved
                          ? { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }
                          : isCreated
                          ? { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }
                          : { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };

                        const hasValueDiff =
                          log.previousLimitValue !== undefined ||
                          log.newLimitValue !== undefined ||
                          log.previousIsEnabled !== undefined ||
                          log.newIsEnabled !== undefined;

                        return (
                          <div
                            key={log.id}
                            style={{
                              background: '#111827',
                              border: '1px solid #1f293d',
                              borderRadius: '8px',
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: badgeStyle.bg,
                                    color: badgeStyle.text,
                                    border: badgeStyle.border,
                                  }}
                                >
                                  {log.action.replace(/_/g, ' ')}
                                </span>
                                <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                                  {formatResourceName(log.resource)}
                                </strong>
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {new Date(log.createdAt).toLocaleString()}
                                </span>
                              </div>

                              {/* Visual Change Diffing */}
                              {hasValueDiff && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginTop: '6px' }}>
                                  <span style={{ color: '#94a3b8' }}>State change:</span>
                                  <span style={{ padding: '1px 6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {log.previousIsEnabled === false ? 'Disabled' : log.previousLimitValue !== null && log.previousLimitValue !== undefined ? `${log.previousLimitValue.toLocaleString()} limit` : 'Plan Default / None'}
                                  </span>
                                  <ArrowRight size={12} color="#64748b" />
                                  <span style={{ padding: '1px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    {log.newIsEnabled === false ? 'Disabled' : log.newLimitValue !== null && log.newLimitValue !== undefined ? `${log.newLimitValue.toLocaleString()} limit` : 'Unlimited / Granted'}
                                  </span>
                                </div>
                              )}

                              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '4px' }}>
                                Reason: <em>"{log.reason}"</em>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                Admin: {log.adminEmail}
                              </div>
                            </div>

                            {log.action !== 'rollback' && (
                              <button
                                onClick={() => {
                                  setRollbackAuditEntry(log);
                                  setRollbackReason('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: '#cbd5e1',
                                  border: '1px solid #334155',
                                  cursor: 'pointer',
                                }}
                              >
                                <RotateCcw size={12} />
                                <span>Rollback</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ASSIGN APPROVED PLAN MODAL */}
      {isAssignPlanOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', maxWidth: '520px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 16px 0' }}>
              Assign Approved Subscription Plan
            </h3>
            <form onSubmit={handleAssignPlan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Select Approved Tier</label>
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="starter">Starter — $59/mo (1 Brand, 2 Seats, 3 Accounts, 100 Posts)</option>
                  <option value="growth">Growth — $99/mo (5 Brands, 5 Seats, 15 Accounts, 500 Posts)</option>
                  <option value="agency">Agency Pro — $249/mo (25 Brands, 20 Seats, 100 Accounts, 2.5k Posts)</option>
                  <option value="scale">Scale — $499/mo (100 Brands, 50 Seats, 250 Accounts, 10k Posts)</option>
                  <option value="enterprise">Enterprise — Custom Contract Architecture</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Custom Monthly Rate ($, Optional for Enterprise)</label>
                <input
                  type="number"
                  placeholder="Leave empty for standard catalog price"
                  value={assignCustomPrice}
                  onChange={(e) => setAssignCustomPrice(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Execution Timing</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                    <input type="radio" checked={assignImmediate} onChange={() => setAssignImmediate(true)} />
                    Immediate Activation
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                    <input type="radio" checked={!assignImmediate} onChange={() => setAssignImmediate(false)} />
                    Schedule for Renewal
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Mandatory Audit Reason *</label>
                <textarea
                  required
                  placeholder="e.g. Enterprise pilot expansion agreed per contract #8493"
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAssignPlanOpen(false)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff' }}>
                  Cancel
                </button>
                <button type="submit" disabled={assignSubmitting} style={{ padding: '8px 18px', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600 }}>
                  {assignSubmitting ? 'Assigning...' : 'Confirm Plan Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT CUSTOM OVERRIDE MODAL */}
      {isOverrideModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', maxWidth: '540px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Add Enterprise Entitlement Override
              </h3>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div style={{ marginBottom: '16px', background: '#111827', padding: '12px', borderRadius: '8px', border: '1px solid #1f293d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={13} color="#a78bfa" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Specification Presets
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { label: '+5 Brands (30d)', resource: 'brands' as QuotaResource, limitValue: '5', isUnlimited: false, days: 30, reason: 'Temporary promotional expansion (+5 brands)' },
                  { label: 'Unlimited Posts', resource: 'posts' as QuotaResource, limitValue: '', isUnlimited: true, days: null, reason: 'High-volume launch campaign waiver' },
                  { label: 'L5 Swarm Autonomy', resource: 'autonomy_level' as QuotaResource, limitValue: '5', isUnlimited: false, days: 90, reason: 'Autonomous multi-agent beta trial' },
                  { label: '+100 Automations', resource: 'active_automations' as QuotaResource, limitValue: '100', isUnlimited: false, days: 60, reason: 'Enterprise automation pipeline boost' },
                  { label: '365d Analytics', resource: 'storage' as QuotaResource, limitValue: '100', isUnlimited: false, days: 365, reason: 'Extended compliance audit retention window' },
                  { label: 'WhatsApp API', resource: 'whatsapp' as QuotaResource, limitValue: '1', isUnlimited: false, days: null, reason: 'Direct Meta Cloud API commercial unlock' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyOverridePreset(preset)}
                    style={{
                      padding: '4px 8px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '5px',
                      color: '#cbd5e1',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Resource Dimension</label>
                <select
                  value={overrideResource}
                  onChange={(e) => setOverrideResource(e.target.value as QuotaResource)}
                  style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="brands">Brand Workspaces (brands)</option>
                  <option value="seats">Team Seats (seats)</option>
                  <option value="social_accounts">Connected Social Channels (social_accounts)</option>
                  <option value="active_automations">Active Workflow Automations (active_automations)</option>
                  <option value="storage">Cloud Storage Bytes (storage)</option>
                  <option value="posts">Monthly Published Posts (posts)</option>
                  <option value="autonomy_level">AI Autonomy Level (autonomy_level L1–L5)</option>
                  <option value="api_access">Developer REST API &amp; Webhooks (api_access)</option>
                  <option value="scim_provisioning">SCIM 2.0 Directory Sync (scim_provisioning)</option>
                  <option value="client_approvals">Client Approval Magic Links (client_approvals)</option>
                  <option value="whatsapp">WhatsApp Business API (whatsapp)</option>
                  <option value="multi_brand_brain">Cross-Brand Knowledge Graph (multi_brand_brain)</option>
                  <option value="custom_branding">Custom White-Label Branding (custom_branding)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={overrideIsEnabled} onChange={(e) => setOverrideIsEnabled(e.target.checked)} />
                  Feature Granted / Enabled
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={overrideIsUnlimited} onChange={(e) => setOverrideIsUnlimited(e.target.checked)} />
                  Unlimited / Unmetered
                </label>
              </div>

              {!overrideIsUnlimited && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Explicit Limit Value</label>
                  <input
                    type="number"
                    value={overrideLimitValue}
                    onChange={(e) => setOverrideLimitValue(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Expiration Date (Optional)</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { label: '7d', days: 7 },
                      { label: '30d', days: 30 },
                      { label: '90d', days: 90 },
                      { label: 'End of Year', isEoy: true },
                      { label: 'Permanent', days: null },
                    ].map((pill: any) => (
                      <button
                        key={pill.label}
                        type="button"
                        onClick={() => (pill.isEoy ? setEndOfYearExpiry() : setQuickExpiry(pill.days))}
                        style={{
                          padding: '2px 7px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          borderRadius: '4px',
                          background: '#1e293b',
                          border: '1px solid #334155',
                          color: '#a78bfa',
                          cursor: 'pointer',
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="date"
                  value={overrideExpiresAt}
                  onChange={(e) => setOverrideExpiresAt(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Mandatory Justification Reason *</label>
                <textarea
                  required
                  placeholder="e.g. Enterprise MSA contract addendum clause 4.2"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsOverrideModalOpen(false)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff' }}>
                  Cancel
                </button>
                <button type="submit" disabled={overrideSubmitting} style={{ padding: '8px 18px', background: '#8b5cf6', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600 }}>
                  {overrideSubmitting ? 'Saving...' : 'Apply Custom Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE OVERRIDE CONFIRMATION MODAL */}
      {removingResource && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>
              Remove Custom Override for {formatResourceName(removingResource)}?
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
              The workspace will safely revert to its standard <strong>{data?.plan?.name}</strong> plan entitlement limit. All existing customer assets remain strictly preserved.
            </p>
            <form onSubmit={handleRemoveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Mandatory Audit Reason *</label>
                <textarea
                  required
                  placeholder="e.g. Contract pilot concluded, returning to standard tier"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setRemovingResource(null)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff' }}>
                  Cancel
                </button>
                <button type="submit" disabled={removeSubmitting} style={{ padding: '8px 18px', background: '#ef4444', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600 }}>
                  {removeSubmitting ? 'Removing...' : 'Confirm Reversion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLLBACK MODAL */}
      {rollbackAuditEntry && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '14px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>
              Rollback Entitlement Change #{rollbackAuditEntry.id.slice(0, 8)}?
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
              This will restore the previous entitlement state for <strong>{formatResourceName(rollbackAuditEntry.resource)}</strong> and append an official rollback entry in the audit trail.
            </p>
            <form onSubmit={handleRollback} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>Mandatory Audit Reason *</label>
                <textarea
                  required
                  placeholder="e.g. Reverting accidental change from previous admin session"
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setRollbackAuditEntry(null)} style={{ padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px', color: '#fff' }}>
                  Cancel
                </button>
                <button type="submit" disabled={rollbackSubmitting} style={{ padding: '8px 18px', background: '#f59e0b', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 700 }}>
                  {rollbackSubmitting ? 'Rolling back...' : 'Confirm Rollback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

