import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Activity,
  Zap,
  RotateCcw,
  AlertOctagon,
  Eye,
  Trash2,
  X,
  ExternalLink,
  Inbox,
  Copy,
  Check,
  Sliders,
  History,
  Tag,
  Key,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { CustomerEntitlementsDrawer } from '../components/superadmin/CustomerEntitlementsDrawer.js';
import { PlanManagementSection } from '../components/superadmin/PlanManagementSection.js';
import type {
  SuperadminBillingMetrics,
  SuperadminRevenueHistoryPoint,
  SuperadminTenantSubscriptionRow,
  BillingAuditLog,
  BillingWebhookDelivery,
  WebhookDlqStats,
  EntitlementAuditLogEntry,
} from '@socialforge/shared';

export const AdminBillingPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SuperAdmin Tab & Entitlements State
  const [activeMainTab, setActiveMainTab] = useState<'subscriptions' | 'plans' | 'kpis' | 'governance' | 'dlq' | 'invoices' | 'usage-disputes' | 'communications'>('subscriptions');
  const [selectedManageTenantId, setSelectedManageTenantId] = useState<string | null>(null);

  // Invoices & Transactions State
  const [adminInvoices, setAdminInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesStatusFilter, setInvoicesStatusFilter] = useState('');
  const [invoicesSearchTerm, setInvoicesSearchTerm] = useState('');
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);

  // Platform Quota Monitoring & Dispute Resolution State
  const [usageOverview, setUsageOverview] = useState<any[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageSearchTerm, setUsageSearchTerm] = useState('');
  const [disputeModalTenant, setDisputeModalTenant] = useState<any | null>(null);
  const [disputeResource, setDisputeResource] = useState('posts');
  const [disputeAction, setDisputeAction] = useState<'grant_bonus' | 'reset_counter' | 'custom_limit'>('grant_bonus');
  const [disputeAmount, setDisputeAmount] = useState<number>(500);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeProcessing, setDisputeProcessing] = useState(false);
  const [disputeNotice, setDisputeNotice] = useState<string | null>(null);

  // Communications Delivery Logs State
  const [adminEmails, setAdminEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsSearchTerm, setEmailsSearchTerm] = useState('');
  const [emailsTemplateFilter, setEmailsTemplateFilter] = useState('');

  // Platform-wide Entitlement Audit Logs
  const [platformAuditLogs, setPlatformAuditLogs] = useState<EntitlementAuditLogEntry[]>([]);
  const [platformAuditLoading, setPlatformAuditLoading] = useState(false);
  const [platformAuditPage, setPlatformAuditPage] = useState(1);
  const [platformAuditTotalPages, setPlatformAuditTotalPages] = useState(1);
  const [auditFilterResource, setAuditFilterResource] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState('');
  const [governanceSearchTerm, setGovernanceSearchTerm] = useState('');
  const [rollbackTarget, setRollbackTarget] = useState<EntitlementAuditLogEntry | null>(null);
  const [rollbackInputReason, setRollbackInputReason] = useState('');
  const [rollbackProcessing, setRollbackProcessing] = useState(false);
  const [governanceNotice, setGovernanceNotice] = useState<string | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<SuperadminBillingMetrics | null>(null);
  const [revenueHistory, setRevenueHistory] = useState<SuperadminRevenueHistoryPoint[]>([]);
  const [subscriptions, setSubscriptions] = useState<SuperadminTenantSubscriptionRow[]>([]);
  const [totalSubscriptions, setTotalSubscriptions] = useState(0);
  const [auditLogs, setAuditLogs] = useState<Array<BillingAuditLog & { tenantName?: string; tenantSlug?: string }>>([]);

  // Table filters & pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // DLQ Recovery & Webhook Delivery states
  const [dlqStats, setDlqStats] = useState<WebhookDlqStats | null>(null);
  const [dlqDeliveries, setDlqDeliveries] = useState<BillingWebhookDelivery[]>([]);
  const [dlqTotal, setDlqTotal] = useState(0);
  const [dlqPage, setDlqPage] = useState(1);
  const [dlqTotalPages, setDlqTotalPages] = useState(1);
  const [dlqStatusFilter, setDlqStatusFilter] = useState<string>('');
  const [dlqSearchTerm, setDlqSearchTerm] = useState<string>('');
  const [selectedPayloadDelivery, setSelectedPayloadDelivery] = useState<BillingWebhookDelivery | null>(null);
  const [replayingDeliveryId, setReplayingDeliveryId] = useState<string | null>(null);
  const [replayingAll, setReplayingAll] = useState(false);
  const [dlqMessage, setDlqMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [dlqConfirmDialog, setDlqConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const isAnyModalOpen = Boolean(selectedPayloadDelivery || dlqConfirmDialog);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedPayloadDelivery, dlqConfirmDialog]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [metricsRes, historyRes, subsRes, logsRes] = await Promise.allSettled([
          api.adminBilling.getMetrics(),
          api.adminBilling.getRevenueHistory(6),
          api.adminBilling.listSubscriptions({
            page,
            limit: 10,
            search: searchTerm.trim() || undefined,
            status: statusFilter || undefined,
          }),
          api.adminBilling.listAuditLogs(30),
        ]);

        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value);
        if (historyRes.status === 'fulfilled') setRevenueHistory(historyRes.value);
        if (subsRes.status === 'fulfilled') {
          setSubscriptions(subsRes.value.items || []);
          setTotalSubscriptions(subsRes.value.total || 0);
          setTotalPages(subsRes.value.totalPages || 1);
        }
        if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value || []);

        if (metricsRes.status === 'rejected') {
          throw new Error(metricsRes.reason?.message || 'Failed to fetch financial metrics');
        }
      } catch (err: any) {
        console.error('[AdminBillingPage] Error loading admin billing data:', err);
        setError(err.message || 'Access denied or server error while loading admin metrics.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, searchTerm, statusFilter]
  );

  const loadDlqData = useCallback(async () => {
    try {
      const [statsRes, listRes] = await Promise.allSettled([
        api.adminBilling.getDlqStats(),
        api.adminBilling.listDlqDeliveries({
          page: dlqPage,
          limit: 10,
          status: dlqStatusFilter || undefined,
          search: dlqSearchTerm.trim() || undefined,
        }),
      ]);

      if (statsRes.status === 'fulfilled') {
        setDlqStats(statsRes.value);
      }
      if (listRes.status === 'fulfilled') {
        setDlqDeliveries(listRes.value.items || []);
        setDlqTotal(listRes.value.total || 0);
        setDlqTotalPages(listRes.value.totalPages || 1);
      }
    } catch (err) {
      console.error('[AdminBillingPage] Error loading DLQ data:', err);
    }
  }, [dlqPage, dlqStatusFilter, dlqSearchTerm]);

  useEffect(() => {
    loadData();
    loadDlqData();
  }, [loadData, loadDlqData]);

  const handleReplaySingle = async (delivery: BillingWebhookDelivery) => {
    try {
      setReplayingDeliveryId(delivery.id);
      setDlqMessage(null);
      const res = await api.adminBilling.replayDlqDelivery(delivery.id, true);
      if (res.success) {
        setDlqMessage({
          type: 'success',
          text: `Webhook delivery (${delivery.eventType}) replayed and processed successfully.`,
        });
      } else {
        setDlqMessage({
          type: 'error',
          text: `Replay failed for delivery ${delivery.id.slice(0, 8)}.`,
        });
      }
      await Promise.all([loadDlqData(), loadData(true)]);
    } catch (err: any) {
      setDlqMessage({ type: 'error', text: err.message || 'Failed to replay webhook delivery' });
    } finally {
      setReplayingDeliveryId(null);
    }
  };

  const handleReplayAllDeadLetters = () => {
    setDlqConfirmDialog({
      title: 'Replay Dead-Letter Queue',
      message: 'Replay all dead-lettered webhook deliveries? This will re-attempt processing across all pending events.',
      confirmLabel: 'Replay All Events',
      isDestructive: false,
      onConfirm: async () => {
        try {
          setReplayingAll(true);
          setDlqMessage(null);
          const res = await api.adminBilling.replayAllDeadLetters();
          setDlqMessage({
            type: 'success',
            text: `Batch replay completed: ${res.replayed} replayed (${res.succeeded} succeeded, ${res.failed} failed).`,
          });
          await Promise.all([loadDlqData(), loadData(true)]);
        } catch (err: any) {
          setDlqMessage({ type: 'error', text: err.message || 'Failed to replay dead letters' });
        } finally {
          setReplayingAll(false);
        }
      },
    });
  };

  const handleDiscardSingle = (id: string) => {
    setDlqConfirmDialog({
      title: 'Discard Webhook Delivery',
      message: 'Discard this webhook delivery from the retry queue? It will be marked as discarded and removed from active replay.',
      confirmLabel: 'Yes, Discard Delivery',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.adminBilling.discardDlqDelivery(id);
          setDlqMessage({ type: 'success', text: 'Webhook delivery marked as discarded.' });
          await loadDlqData();
        } catch (err: any) {
          setDlqMessage({ type: 'error', text: err.message || 'Failed to discard delivery' });
        }
      },
    });
  };

  const handleCopyPayload = (payload: Record<string, any> | string) => {
    try {
      const formatted =
        typeof payload === 'string'
          ? JSON.stringify(JSON.parse(payload), null, 2)
          : JSON.stringify(payload, null, 2);
      navigator.clipboard.writeText(formatted);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      navigator.clipboard.writeText(String(payload));
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  const loadPlatformAuditLogs = useCallback(async () => {
    try {
      setPlatformAuditLoading(true);
      const res = await api.adminBilling.listEntitlementAuditLogs({
        page: platformAuditPage,
        limit: 20,
        resource: auditFilterResource || undefined,
        action: auditFilterAction || undefined,
        adminEmail: governanceSearchTerm.trim() || undefined,
      });
      setPlatformAuditLogs(res.items || []);
      setPlatformAuditTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('[AdminBillingPage] Error loading entitlement audit logs:', err);
    } finally {
      setPlatformAuditLoading(false);
    }
  }, [platformAuditPage, auditFilterResource, auditFilterAction, governanceSearchTerm]);

  useEffect(() => {
    if (activeMainTab === 'governance') {
      loadPlatformAuditLogs();
    } else if (activeMainTab === 'invoices') {
      loadAdminInvoices();
    } else if (activeMainTab === 'usage-disputes') {
      loadPlatformUsage();
    } else if (activeMainTab === 'communications') {
      loadAdminEmails();
    }
  }, [activeMainTab, loadPlatformAuditLogs]);

  const loadAdminInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);
      const res = await api.adminBilling.listInvoices({
        page: invoicesPage,
        limit: 15,
        status: invoicesStatusFilter || undefined,
        search: invoicesSearchTerm.trim() || undefined,
      });
      setAdminInvoices(res.items || []);
      setInvoicesTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('[AdminBillingPage] Error loading admin invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [invoicesPage, invoicesStatusFilter, invoicesSearchTerm]);

  const loadPlatformUsage = useCallback(async () => {
    try {
      setUsageLoading(true);
      const res = await api.adminBilling.getPlatformUsageOverview({
        limit: 25,
        search: usageSearchTerm.trim() || undefined,
      });
      setUsageOverview(res.items || []);
    } catch (err: any) {
      console.error('[AdminBillingPage] Error loading platform usage:', err);
    } finally {
      setUsageLoading(false);
    }
  }, [usageSearchTerm]);

  const loadAdminEmails = useCallback(async () => {
    try {
      setEmailsLoading(true);
      const res = await api.adminBilling.listAllEmails({
        limit: 25,
        template: emailsTemplateFilter || undefined,
        search: emailsSearchTerm.trim() || undefined,
      });
      setAdminEmails(res.items || []);
    } catch (err: any) {
      console.error('[AdminBillingPage] Error loading admin emails:', err);
    } finally {
      setEmailsLoading(false);
    }
  }, [emailsTemplateFilter, emailsSearchTerm]);

  const handleResolveDispute = async () => {
    if (!disputeModalTenant || !disputeReason.trim()) return;
    try {
      setDisputeProcessing(true);
      setDisputeNotice(null);
      const res = await api.adminBilling.resolveQuotaDispute({
        tenantId: disputeModalTenant.tenantId,
        resource: disputeResource,
        action: disputeAction,
        bonusAmount: disputeAmount,
        newLimit: disputeAction === 'custom_limit' ? disputeAmount : undefined,
        reason: disputeReason.trim(),
      });
      if (res.success) {
        setDisputeNotice(`Dispute resolved: ${res.message}`);
        setTimeout(() => {
          setDisputeModalTenant(null);
          setDisputeReason('');
          setDisputeNotice(null);
        }, 1500);
        await Promise.all([loadPlatformUsage(), loadData(true)]);
      }
    } catch (err: any) {
      setDisputeNotice(`Error resolving dispute: ${err.message || 'Unknown error'}`);
    } finally {
      setDisputeProcessing(false);
    }
  };

  const handleRollbackEntitlement = async () => {
    if (!rollbackTarget || !rollbackInputReason.trim()) return;
    try {
      setRollbackProcessing(true);
      setGovernanceNotice(null);
      const res = await api.adminBilling.rollbackEntitlement(rollbackTarget.id, rollbackInputReason.trim());
      if (res.success) {
        setGovernanceNotice(`Successfully rolled back override on ${rollbackTarget.resource} for workspace.`);
        setRollbackTarget(null);
        setRollbackInputReason('');
        await loadPlatformAuditLogs();
        await loadData(true);
      }
    } catch (err: any) {
      setGovernanceNotice(`Rollback error: ${err.message || 'Failed to rollback'}`);
    } finally {
      setRollbackProcessing(false);
    }
  };

  // Max revenue for bar chart normalization
  const maxRevenue = Math.max(...revenueHistory.map((r) => r.revenueCents), 100);

  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <RefreshCw size={36} className="animate-spin" style={{ color: 'var(--accent-primary, #8b5cf6)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Loading platform revenue metrics & subscriptions...</p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Superadmin Access Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
            {error}
          </p>
          <button
            onClick={() => loadData(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              background: 'var(--accent-primary, #8b5cf6)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Retry Verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(139, 92, 246, 0.35)',
              }}
            >
              <Sparkles size={12} />
              Platform Superadmin
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Multi-Tenant Commercial Overview</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Revenue & Subscription Intelligence
          </h1>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 600,
            background: 'var(--bg-glass-card, #111827)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium, #374151)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* SuperAdmin Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--border-medium, #2d3748)',
          marginBottom: '28px',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMainTab('subscriptions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'subscriptions' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'subscriptions' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'subscriptions' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Building2 size={16} />
          <span>Customer Subscriptions ({totalSubscriptions})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('plans')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'plans' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'plans' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'plans' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Sliders size={16} />
          <span>Plans & Commercial Packaging (5 Tiers)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('governance');
            loadPlatformAuditLogs();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'governance' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'governance' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'governance' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldAlert size={16} />
          <span>Override Governance & Audit Trail</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('kpis')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'kpis' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'kpis' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'kpis' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <TrendingUp size={16} />
          <span>Revenue Analytics & Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('dlq')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'dlq' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'dlq' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'dlq' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <RotateCcw size={16} />
          <span>DLQ Webhooks & Failure Recovery</span>
          {Boolean(dlqStats?.deadLetter) && (
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
              }}
            >
              {dlqStats?.deadLetter}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('invoices');
            loadAdminInvoices();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'invoices' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'invoices' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'invoices' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <CreditCard size={16} />
          <span>Invoices & Transactions</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('usage-disputes');
            loadPlatformUsage();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'usage-disputes' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'usage-disputes' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'usage-disputes' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Activity size={16} />
          <span>Quota Telemetry & Disputes</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMainTab('communications');
            loadAdminEmails();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.9rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: activeMainTab === 'communications' ? '2px solid #8b5cf6' : '2px solid transparent',
            background: activeMainTab === 'communications' ? 'rgba(139, 92, 246, 0.12)' : 'transparent',
            color: activeMainTab === 'communications' ? '#a78bfa' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Inbox size={16} />
          <span>Delivery Logs (Email & WhatsApp)</span>
        </button>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      {(activeMainTab === 'subscriptions' || activeMainTab === 'kpis') && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* Card 1: MRR */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 17, 27, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Monthly Recurring Revenue</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {metrics?.mrrFormatted || '$0.00'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <span>Active contracted monthly run rate</span>
          </div>
        </div>

        {/* Card 2: ARR */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(13, 17, 27, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Annual Run Rate (ARR)</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a78bfa',
              }}
            >
              <Calendar size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#c4b5fd', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {metrics?.arrFormatted || '$0.00'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} style={{ color: '#a78bfa' }} />
            <span>Annualized projection (MRR × 12)</span>
          </div>
        </div>

        {/* Card 3: Active Paid Subscribers */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, rgba(13, 17, 27, 0.95) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Paying Workspaces</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Building2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#60a5fa', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {metrics?.activeSubscriptions || 0}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              / {metrics?.totalTenants || 0} total
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#93c5fd',
              }}
            >
              {metrics?.paidConversionRate || 0}% Conversion
            </span>
            <span>across platform</span>
          </div>
        </div>

        {/* Card 4: Churn & Unit Economics */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.08) 0%, rgba(13, 17, 27, 0.95) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Monthly Churn Rate</span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(236, 72, 153, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f472b6',
              }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#f472b6', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {metrics?.churnRate || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ARPU: <strong>{metrics?.arpuFormatted || '$0.00'}</strong></span>
            <span>•</span>
            <span>LTV: <strong>{metrics?.ltvFormatted || '$0.00'}</strong></span>
          </div>
        </div>
      </div>

      )}

      {/* Two Column Layout: Plan Distribution & 6-Month Realized Revenue */}
      {activeMainTab === 'kpis' && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '36px' }}>
        {/* Plan Distribution */}
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Revenue & Subscribers by Plan
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Distribution across commercial subscription tiers
              </p>
            </div>
            <Layers size={18} style={{ color: 'var(--accent-primary, #8b5cf6)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {metrics?.planDistribution.map((tier) => (
              <div key={tier.planId}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tier.planName}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {tier.count} sub{tier.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10b981' }}>
                      {tier.mrrFormatted}/mo
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({tier.percentage}%)</span>
                  </div>
                </div>
                <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(tier.percentage, tier.count > 0 ? 4 : 0)}%`,
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-Month Realized Revenue Trend */}
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Realized Revenue History
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Actual settled invoices collected over the last 6 months
              </p>
            </div>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              height: '180px',
              paddingTop: '20px',
              borderBottom: '1px solid var(--border-subtle, #1f2937)',
              marginBottom: '16px',
            }}
          >
            {revenueHistory.map((point) => {
              const heightPct = Math.max(8, (point.revenueCents / maxRevenue) * 100);
              return (
                <div
                  key={point.month}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981' }}>
                    {point.revenueCents > 0 ? point.revenueFormatted : '$0'}
                  </span>
                  <div
                    title={`${point.monthLabel}: ${point.revenueFormatted} (${point.invoiceCount} invoices)`}
                    style={{
                      width: '100%',
                      maxWidth: '42px',
                      height: `${heightPct}%`,
                      background: 'linear-gradient(180deg, #10b981 0%, rgba(16, 185, 129, 0.25) 100%)',
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {point.monthLabel.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <span>Verified Stripe & Provider Collections</span>
            <span>Total 6-Month Volume: <strong>{metrics?.mrrFormatted || '$0.00'}</strong></span>
          </div>
        </div>
      </div>

      )}

      {/* Global Tenant Subscriptions Roster */}
      {activeMainTab === 'subscriptions' && (
      <div
        style={{
          background: 'var(--bg-glass-card, #0d111b)',
          border: '1px solid var(--border-medium, #2d3748)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              All Workspaces & Subscriptions
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Full cross-tenant commercial subscriptions database ({totalSubscriptions} workspaces)
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search workspace..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-medium, #374151)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-medium, #374151)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="trialing">Trialing</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-medium, #374151)', textAlign: 'left' }}>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Workspace</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Owner</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Current Plan</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Monthly Price</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Renewal Date</th>
                <th style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Provider</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No matching workspace subscriptions found.
                  </td>
                </tr>
              ) : (
                subscriptions.map((row) => {
                  const isActive = row.status === 'active';
                  const isPastDue = row.status === 'past_due';
                  const renewalDate = row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : 'N/A';

                  return (
                    <tr
                      key={row.tenantId}
                      style={{
                        borderBottom: '1px solid var(--border-subtle, #1f2937)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.tenantName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>slug: {row.tenantSlug}</div>
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                        <div>{row.ownerName || 'Admin'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.ownerEmail || '—'}</div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: 'rgba(139, 92, 246, 0.12)',
                            color: '#a78bfa',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                          }}
                        >
                          {row.planName}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ${row.price}.00 {row.currency.toUpperCase()}/{row.billingInterval}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: isActive
                              ? 'rgba(16, 185, 129, 0.12)'
                              : isPastDue
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(245, 158, 11, 0.12)',
                            color: isActive ? '#10b981' : isPastDue ? '#ef4444' : '#f59e0b',
                            border: `1px solid ${
                              isActive
                                ? 'rgba(16, 185, 129, 0.3)'
                                : isPastDue
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          }}
                        >
                          {isActive ? <CheckCircle2 size={11} /> : isPastDue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                          <span>{row.status}</span>
                        </span>
                        {row.cancelAtPeriodEnd && (
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>Cancels at period end</div>
                        )}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                        {renewalDate}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {row.provider}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedManageTenantId(row.tenantId)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#a78bfa',
                              border: '1px solid rgba(139, 92, 246, 0.35)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Sliders size={12} />
                            <span>Manage</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      )}

      {/* Plans & Commercial Packaging Tab */}
      {activeMainTab === 'plans' && <PlanManagementSection />}

      {/* Override Governance & Audit Trail Tab */}
      {activeMainTab === 'governance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '32px' }}>
          {governanceNotice && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} />
                <span>{governanceNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setGovernanceNotice(null)}
                style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div
            style={{
              background: 'var(--bg-glass-card, #0d111b)',
              border: '1px solid var(--border-medium, #2d3748)',
              borderRadius: '16px',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Platform-Wide Override Governance & Audit Trail
                </h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Immutable audit records tracking administrator identity, workspace, previous and new limits, mandatory justifications, and safe rollbacks.
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search admin email..."
                    value={governanceSearchTerm}
                    onChange={(e) => {
                      setGovernanceSearchTerm(e.target.value);
                      setPlatformAuditPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-medium, #374151)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <select
                  value={auditFilterAction}
                  onChange={(e) => {
                    setAuditFilterAction(e.target.value);
                    setPlatformAuditPage(1);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-medium, #374151)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="">All Actions</option>
                  <option value="override_created">Override Created</option>
                  <option value="override_updated">Override Updated</option>
                  <option value="override_removed">Override Removed</option>
                  <option value="plan_assigned">Plan Assigned</option>
                  <option value="rollback">Rollback Executed</option>
                </select>

                <button
                  type="button"
                  onClick={loadPlatformAuditLogs}
                  disabled={platformAuditLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    cursor: platformAuditLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={platformAuditLoading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-medium, #2d3748)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 14px' }}>Timestamp</th>
                    <th style={{ padding: '12px 14px' }}>Workspace</th>
                    <th style={{ padding: '12px 14px' }}>Resource</th>
                    <th style={{ padding: '12px 14px' }}>Action</th>
                    <th style={{ padding: '12px 14px' }}>Limit Change</th>
                    <th style={{ padding: '12px 14px' }}>Mandatory Justification</th>
                    <th style={{ padding: '12px 14px' }}>Authorized Admin</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Rollback</th>
                  </tr>
                </thead>
                <tbody>
                  {platformAuditLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                        Loading platform governance trail...
                      </td>
                    </tr>
                  ) : platformAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No governance records match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    platformAuditLogs.map((log) => {
                      const isRollback = log.action === 'rollback';
                      const isCreated = log.action === 'override_created';
                      const isRemoved = log.action === 'override_removed';

                      return (
                        <tr
                          key={log.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle, #1f2937)',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <code>{log.tenantId.slice(0, 10)}...</code>
                            </div>
                            {log.brandId && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Brand: {log.brandId.slice(0, 8)}...</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#a78bfa' }}>
                            {log.resource}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: isCreated
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : isRollback
                                  ? 'rgba(139, 92, 246, 0.15)'
                                  : isRemoved
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                                color: isCreated
                                  ? '#10b981'
                                  : isRollback
                                  ? '#a78bfa'
                                  : isRemoved
                                  ? '#ef4444'
                                  : '#60a5fa',
                              }}
                            >
                              {log.action.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-muted)' }}>
                                {log.previousLimitValue !== null && log.previousLimitValue !== undefined ? log.previousLimitValue : log.previousIsEnabled !== null && log.previousIsEnabled !== undefined ? String(log.previousIsEnabled) : '—'}
                              </span>
                              <span>&rarr;</span>
                              <strong style={{ color: 'var(--text-primary)' }}>
                                {log.newLimitValue !== null && log.newLimitValue !== undefined ? log.newLimitValue : log.newIsEnabled !== null && log.newIsEnabled !== undefined ? String(log.newIsEnabled) : '—'}
                              </strong>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                            <em>&ldquo;{log.reason}&rdquo;</em>
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                            {log.adminEmail || 'admin@hoaspforge.com'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            {log.action !== 'rollback' && (
                              <button
                                type="button"
                                onClick={() => setRollbackTarget(log)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: 'rgba(245, 158, 11, 0.12)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.3)',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <RotateCcw size={12} />
                                <span>Revert</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {platformAuditTotalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  disabled={platformAuditPage <= 1}
                  onClick={() => setPlatformAuditPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    color: platformAuditPage <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: platformAuditPage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {platformAuditPage} of {platformAuditTotalPages}
                </span>
                <button
                  type="button"
                  disabled={platformAuditPage >= platformAuditTotalPages}
                  onClick={() => setPlatformAuditPage((p) => Math.min(platformAuditTotalPages, p + 1))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    color: platformAuditPage >= platformAuditTotalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: platformAuditPage >= platformAuditTotalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices & Payment Transactions Panel */}
      {activeMainTab === 'invoices' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Platform Invoices & Transactions
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Audit all cross-tenant billing transactions, payment successes, failed invoices, refunds, and disputes.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search invoice # or tenant..."
                value={invoicesSearchTerm}
                onChange={(e) => setInvoicesSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <select
                value={invoicesStatusFilter}
                onChange={(e) => setInvoicesStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#1a202c',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="open">Open (Failed/Pending)</option>
                <option value="refunded">Refunded</option>
                <option value="disputed">Disputed</option>
              </select>
              <button
                type="button"
                onClick={() => loadAdminInvoices()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={invoicesLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Invoice #</th>
                  <th style={{ padding: '12px' }}>Customer Workspace</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Provider</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No invoices found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  adminInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{inv.tenantName}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.tenantId?.slice(0, 8)}...</span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inv.amountDueFormatted}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              inv.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : inv.status === 'open'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : inv.status === 'refunded'
                                ? 'rgba(139, 92, 246, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              inv.status === 'paid'
                                ? '#10b981'
                                : inv.status === 'open'
                                ? '#ef4444'
                                : inv.status === 'refunded'
                                ? '#a78bfa'
                                : '#f59e0b',
                            border: `1px solid ${
                              inv.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : inv.status === 'open'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : inv.status === 'refunded'
                                ? 'rgba(139, 92, 246, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{inv.provider || 'Stripe'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#c4b5fd',
                              textDecoration: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Telemetry & Dispute Resolution Panel */}
      {activeMainTab === 'usage-disputes' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Platform Quota Monitoring & Dispute Resolution
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Monitor live usage telemetry across all customer workspaces and resolve quota disputes with immediate audit-backed overrides.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search tenant name..."
                value={usageSearchTerm}
                onChange={(e) => setUsageSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="button"
                onClick={() => loadPlatformUsage()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={usageLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Workspace</th>
                  <th style={{ padding: '12px' }}>Plan / Status</th>
                  <th style={{ padding: '12px' }}>Posts Usage</th>
                  <th style={{ padding: '12px' }}>AI Content</th>
                  <th style={{ padding: '12px' }}>AI Images</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Dispute Actions</th>
                </tr>
              </thead>
              <tbody>
                {usageOverview.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No workspace usage telemetry available.
                    </td>
                  </tr>
                ) : (
                  usageOverview.map((item) => (
                    <tr key={item.tenantId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{item.tenantName}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.tenantId.slice(0, 8)}...</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{item.planName}</div>
                        <span style={{ fontSize: '0.75rem', color: item.subscriptionStatus === 'active' ? '#10b981' : '#f59e0b' }}>
                          {item.subscriptionStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.usage.postsPercent}%`,
                                height: '100%',
                                background: item.usage.postsPercent >= 100 ? '#ef4444' : item.usage.postsPercent >= 80 ? '#f59e0b' : '#10b981',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                            {item.usage.postsCreated} / {item.usage.maxPosts}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                        {item.usage.aiContent} / {item.usage.maxAiContent}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                        {item.usage.aiImages} / {item.usage.maxAiImages}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeModalTenant(item);
                            setDisputeReason('');
                            setDisputeNotice(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c4b5fd',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          Resolve Dispute
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

      {/* Communications & Delivery Logs Panel */}
      {activeMainTab === 'communications' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Billing Delivery Logs (Email & WhatsApp)
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track delivery of payment receipts, grace period warnings, renewal reminders, and chargeback notifications.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search email or template..."
                value={emailsSearchTerm}
                onChange={(e) => setEmailsSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="button"
                onClick={() => loadAdminEmails()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={emailsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Recipient</th>
                  <th style={{ padding: '12px' }}>Template</th>
                  <th style={{ padding: '12px' }}>Subject</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Dispatched At</th>
                </tr>
              </thead>
              <tbody>
                {adminEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No email delivery logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  adminEmails.map((em) => (
                    <tr key={em.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {em.recipientEmail}
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                        <code>{em.template}</code>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {em.subject}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              em.status === 'sent'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : em.status === 'failed'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color:
                              em.status === 'sent'
                                ? '#10b981'
                                : em.status === 'failed'
                                ? '#ef4444'
                                : '#c4b5fd',
                          }}
                        >
                          {em.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(em.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Dispute Resolution Modal */}
      {disputeModalTenant && createPortal(
        <div className="modal-backdrop" onClick={() => setDisputeModalTenant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} style={{ color: '#8b5cf6' }} />
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Resolve Quota Dispute: {disputeModalTenant.tenantName}
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setDisputeModalTenant(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {disputeNotice && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: disputeNotice.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: disputeNotice.includes('Error') ? '#ef4444' : '#10b981',
                    fontSize: '0.85rem',
                  }}
                >
                  {disputeNotice}
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Target Resource
                </label>
                <select
                  value={disputeResource}
                  onChange={(e) => setDisputeResource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a202c',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="posts">Posts Created</option>
                  <option value="ai_content">AI Content Generations</option>
                  <option value="ai_images">AI Image Generations</option>
                  <option value="storage">Media Storage</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Resolution Action
                </label>
                <select
                  value={disputeAction}
                  onChange={(e) => setDisputeAction(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a202c',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="grant_bonus">Grant Custom Quota Override</option>
                  <option value="reset_counter">Adjust/Reset Usage Counter</option>
                  <option value="custom_limit">Assign Bespoke High Limit</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {disputeAction === 'reset_counter' ? 'New Usage Count Value' : 'Override Limit Value'}
                </label>
                <input
                  type="number"
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this dispute resolution or adjustment is being granted..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDisputeModalTenant(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={disputeProcessing || !disputeReason.trim()}
                onClick={handleResolveDispute}
                style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
              >
                {disputeProcessing ? 'Applying...' : 'Apply Dispute Resolution'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

        {/* Webhook Dead-Letter Queue (DLQ) & Resilience Console */}
        {activeMainTab === 'dlq' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <AlertOctagon size={11} />
                  DLQ Resilience Engine
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Webhook Delivery & Dead-Letter Recovery
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                Automated exponential backoff retries (1–5 attempts) and manual operator replay console for failed billing webhooks
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={loadDlqData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} />
                Refresh DLQ
              </button>

              <button
                onClick={handleReplayAllDeadLetters}
                disabled={replayingAll || !dlqStats || dlqStats.deadLetter === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background:
                    dlqStats && dlqStats.deadLetter > 0
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                  color: dlqStats && dlqStats.deadLetter > 0 ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  cursor: dlqStats && dlqStats.deadLetter > 0 && !replayingAll ? 'pointer' : 'not-allowed',
                  boxShadow: dlqStats && dlqStats.deadLetter > 0 ? '0 4px 14px rgba(239, 68, 68, 0.3)' : 'none',
                }}
              >
                <RotateCcw size={13} className={replayingAll ? 'animate-spin' : ''} />
                {replayingAll ? 'Replaying...' : `Replay All Dead Letters (${dlqStats?.deadLetter || 0})`}
              </button>
            </div>
          </div>

          {/* DLQ Status Notification Banner */}
          {dlqMessage && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background:
                  dlqMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.12)'
                    : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${
                  dlqMessage.type === 'success'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
                color: dlqMessage.type === 'success' ? '#10b981' : '#ef4444',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {dlqMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{dlqMessage.text}</span>
              </div>
              <button
                onClick={() => setDlqMessage(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* DLQ Metrics Summary Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Ingested
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                {dlqStats?.total || 0}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.18)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>
                Processed
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                {dlqStats?.processed || 0}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.04)',
                border: '1px solid rgba(245, 158, 11, 0.18)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 600 }}>
                Retrying (Backoff)
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                {dlqStats?.failed || 0}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.22)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 600 }}>
                Dead Letters
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
                {dlqStats?.deadLetter || 0}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Success Rate
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '4px' }}>
                {dlqStats ? `${dlqStats.successRate}%` : '100%'}
              </div>
            </div>
          </div>

          {/* DLQ Filter & Search Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '260px' }}>
              <div
                style={{
                  position: 'relative',
                  flex: '1',
                  maxWidth: '380px',
                }}
              >
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by event type, ID, or tenant..."
                  value={dlqSearchTerm}
                  onChange={(e) => {
                    setDlqSearchTerm(e.target.value);
                    setDlqPage(1);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
              </div>

              <select
                value={dlqStatusFilter}
                onChange={(e) => {
                  setDlqStatusFilter(e.target.value);
                  setDlqPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#111827',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '0.84rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">All Delivery Statuses</option>
                <option value="dead_letter">Dead Letters (Needs Action)</option>
                <option value="failed">Failed / Retrying</option>
                <option value="processed">Processed</option>
                <option value="discarded">Discarded</option>
              </select>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {dlqDeliveries.length} of {dlqTotal} deliveries
            </div>
          </div>

          {/* Deliveries Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Event & Provider</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Delivery Status</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Attempts</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Latency</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Last Attempt / Scheduled</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dlqDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Inbox size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                      <div>No webhook deliveries match the selected filters.</div>
                    </td>
                  </tr>
                ) : (
                  dlqDeliveries.map((deliv) => {
                    const isDeadLetter = deliv.status === 'dead_letter';
                    const isFailed = deliv.status === 'failed';
                    const isProcessed = deliv.status === 'processed';
                    const isProcessing = deliv.status === 'processing';
                    const isDiscarded = deliv.status === 'discarded';

                    return (
                      <tr
                        key={deliv.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Event & Provider */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: '#c4b5fd',
                                fontFamily: 'monospace',
                              }}
                            >
                              {deliv.eventType}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              via {deliv.provider}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px', fontFamily: 'monospace' }}>
                            {deliv.providerEventId || deliv.id.slice(0, 12)}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: isProcessed
                                ? 'rgba(16, 185, 129, 0.12)'
                                : isDeadLetter
                                ? 'rgba(239, 68, 68, 0.12)'
                                : isFailed
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'rgba(255, 255, 255, 0.05)',
                              color: isProcessed
                                ? '#10b981'
                                : isDeadLetter
                                ? '#ef4444'
                                : isFailed
                                ? '#f59e0b'
                                : 'var(--text-secondary)',
                              border: `1px solid ${
                                isProcessed
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : isDeadLetter
                                  ? 'rgba(239, 68, 68, 0.3)'
                                  : isFailed
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : 'var(--border-subtle)'
                              }`,
                            }}
                          >
                            {isProcessed ? (
                              <CheckCircle2 size={11} />
                            ) : isDeadLetter ? (
                              <AlertOctagon size={11} />
                            ) : isFailed ? (
                              <Clock size={11} />
                            ) : isProcessing ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : null}
                            <span>{deliv.status}</span>
                          </span>

                          {deliv.lastError && (
                            <div
                              style={{
                                fontSize: '0.72rem',
                                color: '#f87171',
                                marginTop: '4px',
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={deliv.lastError}
                            >
                              {deliv.lastError}
                            </div>
                          )}
                        </td>

                        {/* Attempts */}
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: isDeadLetter ? '#ef4444' : isFailed ? '#f59e0b' : 'var(--text-primary)',
                            }}
                          >
                            {deliv.attempts}/{deliv.maxAttempts}
                          </span>
                        </td>

                        {/* Latency */}
                        <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {deliv.processingTimeMs != null ? `${deliv.processingTimeMs}ms` : '—'}
                        </td>

                        {/* Last Attempt / Scheduled Retry */}
                        <td style={{ padding: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <div>{deliv.lastAttemptAt ? new Date(deliv.lastAttemptAt).toLocaleTimeString() : 'Never'}</div>
                          {deliv.nextRetryAt && (
                            <div style={{ color: '#f59e0b', fontSize: '0.72rem', marginTop: '2px' }}>
                              Retry: {new Date(deliv.nextRetryAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => setSelectedPayloadDelivery(deliv)}
                              title="Inspect Raw Payload"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-medium)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                              }}
                            >
                              <Eye size={12} />
                              Payload
                            </button>

                            <button
                              onClick={() => handleReplaySingle(deliv)}
                              disabled={replayingDeliveryId === deliv.id}
                              title="Replay Webhook"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                background: isDeadLetter
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(139, 92, 246, 0.15)',
                                color: isDeadLetter ? '#f87171' : '#c4b5fd',
                                border: `1px solid ${
                                  isDeadLetter ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                                }`,
                                cursor: replayingDeliveryId === deliv.id ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <RotateCcw
                                size={12}
                                className={replayingDeliveryId === deliv.id ? 'animate-spin' : ''}
                              />
                              Replay
                            </button>

                            {!isDiscarded && (
                              <button
                                onClick={() => handleDiscardSingle(deliv.id)}
                                title="Discard Delivery"
                                style={{
                                  padding: '5px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  color: 'var(--text-muted)',
                                  border: '1px solid var(--border-subtle)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* DLQ Pagination */}
          {dlqTotalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {dlqPage} of {dlqTotalPages}
              </span>
              <button
                onClick={() => setDlqPage((p) => Math.max(1, p - 1))}
                disabled={dlqPage <= 1}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  cursor: dlqPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={() => setDlqPage((p) => Math.min(dlqTotalPages, p + 1))}
                disabled={dlqPage >= dlqTotalPages}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-medium)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  cursor: dlqPage >= dlqTotalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoices & Payment Transactions Panel */}
      {activeMainTab === 'invoices' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Platform Invoices & Transactions
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Audit all cross-tenant billing transactions, payment successes, failed invoices, refunds, and disputes.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search invoice # or tenant..."
                value={invoicesSearchTerm}
                onChange={(e) => setInvoicesSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <select
                value={invoicesStatusFilter}
                onChange={(e) => setInvoicesStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: '#1a202c',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="open">Open (Failed/Pending)</option>
                <option value="refunded">Refunded</option>
                <option value="disputed">Disputed</option>
              </select>
              <button
                type="button"
                onClick={() => loadAdminInvoices()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={invoicesLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Invoice #</th>
                  <th style={{ padding: '12px' }}>Customer Workspace</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Provider</th>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No invoices found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  adminInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div>{inv.tenantName}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.tenantId?.slice(0, 8)}...</span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {inv.amountDueFormatted}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              inv.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : inv.status === 'open'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : inv.status === 'refunded'
                                ? 'rgba(139, 92, 246, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              inv.status === 'paid'
                                ? '#10b981'
                                : inv.status === 'open'
                                ? '#ef4444'
                                : inv.status === 'refunded'
                                ? '#a78bfa'
                                : '#f59e0b',
                            border: `1px solid ${
                              inv.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : inv.status === 'open'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : inv.status === 'refunded'
                                ? 'rgba(139, 92, 246, 0.3)'
                                : 'rgba(245, 158, 11, 0.3)'
                            }`,
                          }}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>{inv.provider || 'Stripe'}</td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#c4b5fd',
                              textDecoration: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Telemetry & Dispute Resolution Panel */}
      {activeMainTab === 'usage-disputes' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Platform Quota Monitoring & Dispute Resolution
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Monitor live usage telemetry across all customer workspaces and resolve quota disputes with immediate audit-backed overrides.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search tenant name..."
                value={usageSearchTerm}
                onChange={(e) => setUsageSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="button"
                onClick={() => loadPlatformUsage()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={usageLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Workspace</th>
                  <th style={{ padding: '12px' }}>Plan / Status</th>
                  <th style={{ padding: '12px' }}>Posts Usage</th>
                  <th style={{ padding: '12px' }}>AI Content</th>
                  <th style={{ padding: '12px' }}>AI Images</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Dispute Actions</th>
                </tr>
              </thead>
              <tbody>
                {usageOverview.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No workspace usage telemetry available.
                    </td>
                  </tr>
                ) : (
                  usageOverview.map((item) => (
                    <tr key={item.tenantId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{item.tenantName}</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.tenantId.slice(0, 8)}...</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{item.planName}</div>
                        <span style={{ fontSize: '0.75rem', color: item.subscriptionStatus === 'active' ? '#10b981' : '#f59e0b' }}>
                          {item.subscriptionStatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${item.usage.postsPercent}%`,
                                height: '100%',
                                background: item.usage.postsPercent >= 100 ? '#ef4444' : item.usage.postsPercent >= 80 ? '#f59e0b' : '#10b981',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                            {item.usage.postsCreated} / {item.usage.maxPosts}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                        {item.usage.aiContent} / {item.usage.maxAiContent}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                        {item.usage.aiImages} / {item.usage.maxAiImages}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setDisputeModalTenant(item);
                            setDisputeReason('');
                            setDisputeNotice(null);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c4b5fd',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          Resolve Dispute
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

      {/* Communications & Delivery Logs Panel */}
      {activeMainTab === 'communications' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                Billing Delivery Logs (Email & WhatsApp)
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Track delivery of payment receipts, grace period warnings, renewal reminders, and chargeback notifications.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search email or template..."
                value={emailsSearchTerm}
                onChange={(e) => setEmailsSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="button"
                onClick={() => loadAdminEmails()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={14} className={emailsLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Recipient</th>
                  <th style={{ padding: '12px' }}>Template</th>
                  <th style={{ padding: '12px' }}>Subject</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Dispatched At</th>
                </tr>
              </thead>
              <tbody>
                {adminEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No email delivery logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  adminEmails.map((em) => (
                    <tr key={em.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {em.recipientEmail}
                      </td>
                      <td style={{ padding: '12px', textTransform: 'capitalize' }}>
                        <code>{em.template}</code>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                        {em.subject}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background:
                              em.status === 'sent'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : em.status === 'failed'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(139, 92, 246, 0.15)',
                            color:
                              em.status === 'sent'
                                ? '#10b981'
                                : em.status === 'failed'
                                ? '#ef4444'
                                : '#c4b5fd',
                          }}
                        >
                          {em.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {new Date(em.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Dispute Resolution Modal */}
      {disputeModalTenant && createPortal(
        <div className="modal-backdrop" onClick={() => setDisputeModalTenant(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Activity size={20} style={{ color: '#8b5cf6' }} />
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>
                  Resolve Quota Dispute: {disputeModalTenant.tenantName}
                </h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setDisputeModalTenant(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {disputeNotice && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    background: disputeNotice.includes('Error') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: disputeNotice.includes('Error') ? '#ef4444' : '#10b981',
                    fontSize: '0.85rem',
                  }}
                >
                  {disputeNotice}
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Target Resource
                </label>
                <select
                  value={disputeResource}
                  onChange={(e) => setDisputeResource(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a202c',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="posts">Posts Created</option>
                  <option value="ai_content">AI Content Generations</option>
                  <option value="ai_images">AI Image Generations</option>
                  <option value="storage">Media Storage</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Resolution Action
                </label>
                <select
                  value={disputeAction}
                  onChange={(e) => setDisputeAction(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a202c',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="grant_bonus">Grant Custom Quota Override</option>
                  <option value="reset_counter">Adjust/Reset Usage Counter</option>
                  <option value="custom_limit">Assign Bespoke High Limit</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {disputeAction === 'reset_counter' ? 'New Usage Count Value' : 'Override Limit Value'}
                </label>
                <input
                  type="number"
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this dispute resolution or adjustment is being granted..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDisputeModalTenant(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={disputeProcessing || !disputeReason.trim()}
                onClick={handleResolveDispute}
                style={{ background: '#8b5cf6', borderColor: '#8b5cf6' }}
              >
                {disputeProcessing ? 'Applying...' : 'Apply Dispute Resolution'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

        {/* Payload Inspector Modal */}
        {selectedPayloadDelivery && createPortal(
          <div
            className="modal-backdrop"
            onClick={() => setSelectedPayloadDelivery(null)}
          >
            <div
              className="modal-dialog animate-scale-up"
              style={{
                maxWidth: '750px',
                width: '100%',
                maxHeight: '85vh',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c4b5fd',
                        fontFamily: 'monospace',
                      }}
                    >
                      {selectedPayloadDelivery.eventType}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      Webhook Payload Diagnostics
                    </h4>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Delivery ID: {selectedPayloadDelivery.id} • Attempts: {selectedPayloadDelivery.attempts}/
                    {selectedPayloadDelivery.maxAttempts}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleCopyPayload(selectedPayloadDelivery.payload)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    {copiedPayload ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                    {copiedPayload ? 'Copied' : 'Copy JSON'}
                  </button>

                  <button
                    onClick={() => setSelectedPayloadDelivery(null)}
                    className="modal-close"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px', overflowY: 'auto', flex: '1' }}>
                {selectedPayloadDelivery.lastError && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>
                      LAST ERROR ENCOUNTERED:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#fca5a5', fontFamily: 'monospace' }}>
                      {selectedPayloadDelivery.lastError}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  RAW EVENT PAYLOAD:
                </div>
                <pre
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '14px',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)',
                    overflowX: 'auto',
                    fontFamily: 'monospace',
                    margin: 0,
                  }}
                >
                  {(() => {
                    const raw = selectedPayloadDelivery.payload;
                    if (typeof raw === 'object' && raw !== null) {
                      return JSON.stringify(raw, null, 2);
                    }
                    try {
                      return JSON.stringify(JSON.parse(String(raw)), null, 2);
                    } catch {
                      return String(raw);
                    }
                  })()}
                </pre>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--border-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                }}
              >
                <button
                  onClick={() => setSelectedPayloadDelivery(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-medium)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    handleReplaySingle(selectedPayloadDelivery);
                    setSelectedPayloadDelivery(null);
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary, #8b5cf6)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RotateCcw size={13} />
                  Replay Event Now
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Global Billing Audit Feed */}
        {activeMainTab === 'governance' && (
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium, #2d3748)',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Global Platform Billing Audit Feed
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Real-time subscription and webhook events across all agency workspaces
            </p>
          </div>
          <Activity size={18} style={{ color: 'var(--accent-primary, #8b5cf6)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No billing audit events recorded yet.</p>
          ) : (
            auditLogs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle, #1f2937)',
                  fontSize: '0.84rem',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: 'rgba(139, 92, 246, 0.15)',
                      color: '#c4b5fd',
                      fontFamily: 'monospace',
                    }}
                  >
                    {log.eventType}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.tenantName || log.tenantId || 'Platform'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '0.78rem', flexShrink: 0 }}>
                  <span>via {log.provider}</span>
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        )}

      {/* DLQ Confirmation Modal */}
      {dlqConfirmDialog && createPortal(
        <div className="modal-backdrop" onClick={() => setDlqConfirmDialog(null)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: dlqConfirmDialog.isDestructive ? '#f87171' : 'var(--accent-primary)' }}>
                {dlqConfirmDialog.isDestructive ? <Trash2 size={20} /> : <RotateCcw size={20} />}
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>{dlqConfirmDialog.title}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setDlqConfirmDialog(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {dlqConfirmDialog.message}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDlqConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${dlqConfirmDialog.isDestructive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  const cb = dlqConfirmDialog.onConfirm;
                  setDlqConfirmDialog(null);
                  cb();
                }}
              >
                {dlqConfirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Rollback Entitlement Modal */}
      {rollbackTarget && createPortal(
        <div className="modal-backdrop" onClick={() => setRollbackTarget(null)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <RotateCcw size={20} />
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Revert Entitlement Override</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setRollbackTarget(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                Reverting this override will immediately restore the previous quota / access configuration on <strong>{rollbackTarget.resource}</strong> for workspace <code>{rollbackTarget.tenantId.slice(0, 12)}...</code>.
              </p>
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>Target Override Record</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  Action: <code>{rollbackTarget.action}</code> | Reason: <em>&ldquo;{rollbackTarget.reason}&rdquo;</em>
                </div>
              </div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Mandatory Audit Justification Reason *
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this entitlement override is being reverted or rolled back..."
                value={rollbackInputReason}
                onChange={(e) => setRollbackInputReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRollbackTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={rollbackProcessing || !rollbackInputReason.trim()}
                onClick={handleRollbackEntitlement}
                style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
              >
                {rollbackProcessing ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customer Subscription & Entitlements Management Drawer */}
      {selectedManageTenantId && (
        <CustomerEntitlementsDrawer
          tenantId={selectedManageTenantId}
          onClose={() => setSelectedManageTenantId(null)}
          onSubscriptionUpdated={() => loadData(true)}
        />
      )}
    </div>
  );
};
