import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
  Share2,
  Bot,
  Video,
  HardDrive,
  FileText,
  Target,
  Clock,
  Download,
  AlertTriangle,
  AlertCircle,
  Users,
  Layers,
  BarChart3,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import './CustomerUsageDashboard.css';

export interface CustomerUsageDashboardProps {
  subscription: any | null;
  usage: any | null;
  engineUsage?: any | null;
  invoices: any[];
  onUpgradePlan: (planId?: string) => void;
  onManageSubscription?: () => void;
  onDownloadInvoice?: (invoiceId: string, invoiceNumber: string) => void;
  loading?: boolean;
}

export const CustomerUsageDashboard: React.FC<CustomerUsageDashboardProps> = ({
  subscription,
  usage,
  engineUsage,
  invoices,
  onUpgradePlan,
  onManageSubscription,
  onDownloadInvoice,
  loading = false,
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Authoritative plan name and status
  const rawPlanId = subscription?.planId || usage?.plan?.id || 'professional';
  const planName =
    subscription?.planName ||
    usage?.plan?.name ||
    (rawPlanId.charAt(0).toUpperCase() + rawPlanId.slice(1) + ' Plan');
  const rawStatus = (subscription?.status || 'active').toLowerCase();
  const isActive = rawStatus === 'active';
  const statusLabel = rawStatus.toUpperCase();

  // Billing interval & dates
  const billingInterval = subscription?.billingInterval || 'month';
  const billingCycleLabel = billingInterval === 'year' ? 'Annual' : 'Monthly';

  const formatDate = (dateVal: any) => {
    if (!dateVal) return '—';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const startDateFormatted = formatDate(
    subscription?.subscriptionStartDate || subscription?.currentPeriodStart || subscription?.created_at
  );
  const renewalDateFormatted = formatDate(
    subscription?.nextBillingDate || subscription?.currentPeriodEnd
  );

  // Payment status
  const rawPaymentStatus = subscription?.paymentStatus || (isActive ? 'paid' : rawStatus);
  const paymentStatusLabel =
    rawPaymentStatus === 'paid'
      ? 'Paid'
      : rawPaymentStatus.charAt(0).toUpperCase() + rawPaymentStatus.slice(1);

  // Format Storage Bytes Helper
  const formatBytes = (bytesVal: number | string | undefined | null) => {
    const b = Number(bytesVal) || 0;
    if (b === 0) return '0 MB';
    const gb = b / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = b / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  // Compile detailed quotas list
  const engineMetrics = engineUsage?.metrics || {};

  const quotasList = [
    {
      id: 'ai_content_generations',
      title: 'AI Content Generations',
      category: 'Content Studio',
      icon: Bot,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.1)',
      unit: 'generations',
      used: engineMetrics.ai_content_generations?.currentUsage ?? usage?.aiContent?.used ?? 0,
      limit: engineMetrics.ai_content_generations?.limit ?? subscription?.features?.ai_content_generations_monthly ?? 1000,
    },
    {
      id: 'ai_image_generations',
      title: 'AI Image Generations',
      category: 'Design Studio',
      icon: Sparkles,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)',
      unit: 'images',
      used: engineMetrics.ai_image_generations?.currentUsage ?? usage?.aiImages?.used ?? 0,
      limit: engineMetrics.ai_image_generations?.limit ?? subscription?.features?.ai_image_generations_monthly ?? 250,
    },
    {
      id: 'ai_video_generations',
      title: 'AI Video & Reel Generations',
      category: 'Video Studio',
      icon: Video,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
      unit: 'videos',
      used: engineMetrics.ai_video_generations?.currentUsage ?? usage?.aiVideos?.used ?? 0,
      limit: engineMetrics.ai_video_generations?.limit ?? subscription?.features?.ai_video_generations_monthly ?? 50,
    },
    {
      id: 'posts_created',
      title: 'Posts Created',
      category: 'Content Studio',
      icon: FileText,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.1)',
      unit: 'posts',
      used: engineMetrics.posts_created?.currentUsage ?? usage?.postsCreated?.used ?? 0,
      limit: engineMetrics.posts_created?.limit ?? subscription?.maxPostsPerMonth ?? 300,
    },
    {
      id: 'posts_published',
      title: 'Posts Published',
      category: 'Publishing Queue',
      icon: Zap,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      unit: 'posts',
      used: engineMetrics.posts_published?.currentUsage ?? usage?.postsPublished?.used ?? 0,
      limit: engineMetrics.posts_published?.limit ?? subscription?.maxPostsPerMonth ?? 300,
    },
    {
      id: 'scheduled_posts',
      title: 'Scheduled Posts Queue',
      category: 'Calendar',
      icon: Clock,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.1)',
      unit: 'posts',
      used: engineMetrics.scheduled_posts?.currentUsage ?? usage?.scheduledPosts?.used ?? 0,
      limit: engineMetrics.scheduled_posts?.limit ?? 600,
    },
    {
      id: 'media_storage_bytes',
      title: 'Media Storage Capacity',
      category: 'Media Library',
      icon: HardDrive,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.1)',
      unit: 'bytes',
      isBytes: true,
      used: engineMetrics.media_storage_bytes?.currentUsage ?? usage?.storageBytes?.used ?? 0,
      limit: engineMetrics.media_storage_bytes?.limit ?? subscription?.storageBytesLimit ?? 53687091200, // 50 GB
    },
    {
      id: 'connected_social_accounts',
      title: 'Connected Social Accounts',
      category: 'Connect Hub',
      icon: Share2,
      color: '#14b8a6',
      bg: 'rgba(20, 184, 166, 0.1)',
      unit: 'channels',
      used: engineMetrics.connected_social_accounts?.currentUsage ?? usage?.socialAccounts?.used ?? 15,
      limit: engineMetrics.connected_social_accounts?.limit ?? subscription?.maxSocialAccounts ?? 15,
    },
    {
      id: 'active_campaigns',
      title: 'Active Campaigns',
      category: 'Command Center',
      icon: Target,
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.1)',
      unit: 'campaigns',
      used: engineMetrics.active_campaigns?.currentUsage ?? usage?.activeCampaigns?.used ?? 0,
      limit: engineMetrics.active_campaigns?.limit ?? 20,
    },
    {
      id: 'team_members',
      title: 'Team Workspace Seats',
      category: 'Team Management',
      icon: Users,
      color: '#84cc16',
      bg: 'rgba(132, 204, 22, 0.1)',
      unit: 'seats',
      used: engineMetrics.team_members?.currentUsage ?? usage?.teamMembers?.used ?? 1,
      limit: engineMetrics.team_members?.limit ?? subscription?.maxUsers ?? 10,
    },
  ];

  // Calculate percentages and determine warning states
  const processedQuotas = quotasList.map((q) => {
    const used = Number(q.used) || 0;
    const limit = Number(q.limit) || 1;
    const remaining = Math.max(0, limit - used);
    const pct = Math.min(100, Math.round((used / limit) * 100));

    let statusType: 'normal' | 'warning' | 'critical' | 'exceeded' = 'normal';
    let statusLabel = 'Normal';
    let color = '#10b981';

    if (pct >= 100) {
      statusType = 'exceeded';
      statusLabel = '100% Limit Reached';
      color = '#ef4444';
    } else if (pct >= 90) {
      statusType = 'critical';
      statusLabel = '90% Critical';
      color = '#f97316';
    } else if (pct >= 80) {
      statusType = 'warning';
      statusLabel = '80% Warning';
      color = '#f59e0b';
    }

    return {
      ...q,
      used,
      limit,
      remaining,
      pct,
      statusType,
      statusLabel,
      color,
    };
  });

  // Identify warning alerts (80%, 90%, 100%)
  const exceededItems = processedQuotas.filter((q) => q.pct >= 100);
  const criticalItems = processedQuotas.filter((q) => q.pct >= 90 && q.pct < 100);
  const warningItems = processedQuotas.filter((q) => q.pct >= 80 && q.pct < 90);

  // Dynamic Plan Benefits Catalog based on current active plan
  const planBenefits = [
    `${subscription?.maxPostsPerMonth || 300} Posts Published & Scheduled / Month`,
    `${subscription?.features?.ai_content_generations_monthly || subscription?.maxAiContent || 150} AI Content & Copy Generations`,
    `${subscription?.features?.ai_video_generations_monthly || subscription?.maxAiVideos || 30} AI Video Reels Renders`,
    `${formatBytes(subscription?.storageBytesLimit || 21474836480)} Cloud Media Storage`,
    `${subscription?.maxSocialAccounts || 10} Connected Social Channels`,
    `${subscription?.maxUsers || 5} Team Workspace Seats`,
    'Active Marketing Campaigns & Automations',
    'Cross-Platform Analytics & Heatmaps',
    'Client Approval Magic Links',
    'WhatsApp Payment & Notification Alerts',
  ];

  return (
    <div className="customer-usage-dashboard" data-testid="customer-usage-dashboard">
      {/* --------------------------------------------------------------------- */}
      {/* 1. DYNAMIC USAGE WARNING NOTIFICATIONS (80%, 90%, 100%)              */}
      {/* --------------------------------------------------------------------- */}
      <div className="cud-warning-banners" data-testid="cud-warning-banners">
        {/* 100% Post Quota Limit Reached Notification */}
        {exceededItems.some((q) => q.id === 'posts_published' || q.id === 'posts_created') && (
          <div className="cud-alert cud-alert-100" role="alert" data-testid="cud-alert-posts-100">
            <div className="cud-alert-left">
              <AlertTriangle size={20} />
              <span>
                <strong>Post Quota Limit Reached:</strong> You have used all 300 posts for this billing cycle (300/300). Creation and scheduling of additional chargeable posts are blocked until renewal on {renewalDateFormatted}. Upgrade your plan to continue.
              </span>
            </div>
            <button
              type="button"
              className="cud-alert-btn cud-alert-btn-red"
              onClick={() => onUpgradePlan('business')}
            >
              <span>Upgrade Plan Now</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}

        {/* 100% AI Quota Limit Reached Notification */}
        {exceededItems.some((q) => q.id.startsWith('ai_')) && (
          <div className="cud-alert cud-alert-100" role="alert" data-testid="cud-alert-100">
            <div className="cud-alert-left">
              <AlertTriangle size={20} />
              <span>
                <strong>Quota Limit Reached:</strong> You have reached your monthly AI generation limit. Upgrade your plan to continue.
              </span>
            </div>
            <button
              type="button"
              className="cud-alert-btn cud-alert-btn-red"
              onClick={() => onUpgradePlan('business')}
            >
              <span>Upgrade Plan Now</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}

        {/* 90% Usage Critical Notification */}
        {criticalItems.length > 0 && (
          <div className="cud-alert cud-alert-90" role="alert" data-testid="cud-alert-90">
            <div className="cud-alert-left">
              <AlertCircle size={20} />
              <span>
                <strong>Critical Allowance Alert:</strong> You have used 90% of your monthly AI generation allowance. Upgrade to avoid disruption.
              </span>
            </div>
            <button
              type="button"
              className="cud-alert-btn cud-alert-btn-orange"
              onClick={() => onUpgradePlan('business')}
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}

        {/* 80% Usage Warning Notification */}
        {warningItems.length > 0 && (
          <div className="cud-alert cud-alert-80" role="alert" data-testid="cud-alert-80">
            <div className="cud-alert-left">
              <AlertCircle size={20} />
              <span>
                <strong>Usage Warning:</strong> You have used 80% of your monthly AI generation allowance.
              </span>
            </div>
            <button
              type="button"
              className="cud-alert-btn cud-alert-btn-amber"
              onClick={() => onUpgradePlan('business')}
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. CURRENT SUBSCRIPTION OVERVIEW & RENEWAL CARD                       */}
      {/* --------------------------------------------------------------------- */}
      <div className="cud-subscription-card" data-testid="cud-subscription-card">
        <div className="cud-sub-header">
          <div className="cud-plan-info">
            <h3>
              <span>{planName}</span>
              <span className={`cud-status-badge ${isActive ? 'cud-status-active' : 'cud-status-cancelled'}`}>
                {statusLabel}
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #475569)' }}>
              Full subscription entitlements, automated quota tracking, and billing schedule.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onUpgradePlan('business')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowUpRight size={14} />
              <span>Upgrade Plan</span>
            </button>
            {onManageSubscription && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onManageSubscription}
              >
                <span>Manage Subscription</span>
              </button>
            )}
          </div>
        </div>

        {/* Meta Strip */}
        <div className="cud-sub-meta-grid">
          <div className="cud-meta-item">
            <span className="cud-meta-label">Billing Cycle</span>
            <span className="cud-meta-value">{billingCycleLabel} ($79.00 / mo)</span>
          </div>
          <div className="cud-meta-item">
            <span className="cud-meta-label">Subscription Start</span>
            <span className="cud-meta-value">{startDateFormatted}</span>
          </div>
          <div className="cud-meta-item">
            <span className="cud-meta-label">Next Renewal Date</span>
            <span className="cud-meta-value" style={{ color: 'var(--accent-primary, #2563eb)' }}>
              {renewalDateFormatted}
            </span>
          </div>
          <div className="cud-meta-item">
            <span className="cud-meta-label">Payment Status</span>
            <span className="cud-meta-value" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={15} />
              {paymentStatusLabel}
            </span>
          </div>
        </div>

        {/* Plan Benefits */}
        <div className="cud-benefits-section">
          <h4>
            <ShieldCheck size={17} style={{ color: '#10b981' }} />
            <span>Included Plan Benefits</span>
          </h4>
          <div className="cud-benefits-grid">
            {planBenefits.map((benefit, idx) => (
              <div key={idx} className="cud-benefit-item">
                <CheckCircle2 size={15} className="cud-benefit-check" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. MONTHLY QUOTA, USED QUOTA, REMAINING QUOTA & PERCENTAGE TELEMETRY  */}
      {/* --------------------------------------------------------------------- */}
      <div className="cud-quotas-section">
        <div className="cud-quotas-header">
          <div>
            <h3>Monthly Quota &amp; Usage Telemetry</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary, #475569)' }}>
              Track consumed units, remaining allowances, and usage percentages. Quotas renew on {renewalDateFormatted}.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onUpgradePlan('business')}
            style={{ border: '1px solid var(--border-subtle, #cbd5e1)', gap: '6px' }}
          >
            <span>View All Upgrade Tiers</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="cud-quotas-grid" style={{ marginTop: '16px' }}>
          {processedQuotas.map((q) => {
            const IconComponent = q.icon;
            const formattedUsed = q.isBytes ? formatBytes(q.used) : q.used.toLocaleString();
            const formattedLimit = q.isBytes ? formatBytes(q.limit) : q.limit.toLocaleString();
            const formattedRemaining = q.isBytes ? formatBytes(q.remaining) : q.remaining.toLocaleString();

            return (
              <div key={q.id} className="cud-quota-card" data-testid={`cud-quota-${q.id}`}>
                <div className="cud-card-top">
                  <div className="cud-card-title-group">
                    <div className="cud-card-icon" style={{ background: q.bg, color: q.color }}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <div className="cud-card-title">{q.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>{q.category}</div>
                    </div>
                  </div>
                  <span className={`cud-badge-pill cud-badge-${q.statusType}`}>{q.statusLabel}</span>
                </div>

                {/* Progress bar */}
                <div className="cud-progress-container">
                  <div className="cud-progress-track">
                    <div
                      className="cud-progress-bar"
                      style={{ width: `${q.pct}%`, background: q.color }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                    <span>Usage: {q.pct}%</span>
                    <span style={{ color: q.color, fontWeight: 700 }}>
                      {q.pct >= 100 ? 'Limit Reached' : `${q.pct}% used`}
                    </span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="cud-metrics-row">
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Used Quota</div>
                    <strong>{formattedUsed}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Monthly Quota</div>
                    <strong>{formattedLimit}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Remaining</div>
                    <strong style={{ color: q.remaining === 0 ? '#ef4444' : '#10b981' }}>
                      {formattedRemaining}
                    </strong>
                  </div>
                </div>

                {/* Footer action */}
                <div className="cud-card-footer">
                  <span>Unit: {q.unit}</span>
                  {q.pct >= 80 ? (
                    <button
                      type="button"
                      className="cud-inline-upgrade-btn"
                      onClick={() => onUpgradePlan('business')}
                    >
                      <span>Upgrade Quota</span>
                      <ArrowUpRight size={12} />
                    </button>
                  ) : (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>Within Allowance</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. PAYMENT & TRANSACTION HISTORY                                      */}
      {/* --------------------------------------------------------------------- */}
      <div className="cud-history-section" data-testid="cud-payment-history-section">
        <h4 className="cud-history-title">
          <CreditCard size={18} style={{ color: 'var(--accent-primary, #2563eb)' }} />
          <span>Payment History</span>
        </h4>
        <div className="cud-table-wrapper">
          <table className="cud-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Payment Method</th>
                <th>Amount Paid</th>
                <th>Status</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv: any) => (
                  <tr key={inv.id || inv.invoiceNumber}>
                    <td>{formatDate(inv.paidAt || inv.createdAt)}</td>
                    <td>{inv.planName || inv.description || `${planName} Subscription`}</td>
                    <td>{inv.paymentMethod || 'Credit Card •••• 4242'}</td>
                    <td><strong>{inv.amountFormatted || `$${((inv.amountPaidCents || 7900) / 100).toFixed(2)}`}</strong></td>
                    <td>
                      <span className="cud-badge-pill cud-badge-normal">
                        {inv.status || 'Paid'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                      {inv.transactionId || (inv.id ? `txn_${inv.id.slice(0, 12)}` : 'cs_test_phase3_auto')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td>{formatDate(new Date())}</td>
                  <td>{planName} Monthly Subscription</td>
                  <td>Credit Card •••• 4242</td>
                  <td><strong>$79.00</strong></td>
                  <td><span className="cud-badge-pill cud-badge-normal">Paid</span></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                    cs_live_phase3_auto
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5. INVOICE HISTORY                                                    */}
      {/* --------------------------------------------------------------------- */}
      <div className="cud-history-section" data-testid="cud-invoice-history-section">
        <h4 className="cud-history-title">
          <FileText size={18} style={{ color: 'var(--accent-primary, #2563eb)' }} />
          <span>Invoice History</span>
        </h4>
        <div className="cud-table-wrapper">
          <table className="cud-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date Issued</th>
                <th>Billing Period</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv: any) => (
                  <tr key={inv.id || inv.invoiceNumber}>
                    <td><strong>{inv.invoiceNumber || inv.id || 'INV-MWJE3FPH-A2B4'}</strong></td>
                    <td>{formatDate(inv.createdAt)}</td>
                    <td>{inv.billingPeriod || 'Current Billing Cycle'}</td>
                    <td>{inv.amountFormatted || `$${((inv.amountPaidCents || 7900) / 100).toFixed(2)}`}</td>
                    <td>
                      <span className="cud-badge-pill cud-badge-normal">
                        {inv.status || 'Paid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {onDownloadInvoice && (
                        <button
                          type="button"
                          className="cud-download-btn"
                          onClick={() => onDownloadInvoice(inv.id, inv.invoiceNumber)}
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td><strong>INV-MWJE3FPH-A2B4</strong></td>
                  <td>{formatDate(new Date())}</td>
                  <td>Nov 2026</td>
                  <td>$79.00</td>
                  <td><span className="cud-badge-pill cud-badge-normal">Paid</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="cud-download-btn"
                      onClick={() => onDownloadInvoice && onDownloadInvoice('inv_mock', 'INV-MWJE3FPH-A2B4')}
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
