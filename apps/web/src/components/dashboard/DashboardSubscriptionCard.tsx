import React from 'react';
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
  ExternalLink,
} from 'lucide-react';
import './DashboardSubscriptionCard.css';

interface DashboardSubscriptionCardProps {
  subscription: any | null;
  usage: any | null;
  onNavigate: (tab: string, context?: any) => void;
  loading?: boolean;
}

export const DashboardSubscriptionCard: React.FC<DashboardSubscriptionCardProps> = ({
  subscription,
  usage,
  onNavigate,
  loading = false,
}) => {
  if (loading && !subscription) {
    return (
      <div className="dashboard-subscription-card skeleton-card">
        <div className="dashboard-sub-skeleton-header" />
        <div className="dashboard-sub-skeleton-body" />
      </div>
    );
  }

  // Authoritative plan name and status
  const rawPlanId = subscription?.planId || usage?.plan?.id || 'free';
  const planName = subscription?.planName || usage?.plan?.name || (rawPlanId.charAt(0).toUpperCase() + rawPlanId.slice(1));
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
  const paymentStatusLabel = rawPaymentStatus === 'paid' ? 'Paid' : rawPaymentStatus.charAt(0).toUpperCase() + rawPaymentStatus.slice(1);
  const isPaymentPaid = rawPaymentStatus === 'paid' || isActive;

  // Format Storage Bytes Helper
  const formatBytes = (bytesVal: number | string | undefined | null) => {
    const b = Number(bytesVal) || 0;
    if (b === 0) return '0 MB';
    const gb = b / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = b / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  // Quota Metrics
  const quotas = [
    {
      id: 'monthly_posts',
      title: 'Monthly Posts',
      icon: FileText,
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.08)',
      used: usage?.postsPublished?.used ?? usage?.used ?? 0,
      limit: subscription?.maxPostsPerMonth ?? usage?.postsPublished?.limit ?? usage?.limit ?? 100,
      unit: 'Posts',
    },
    {
      id: 'ai_content',
      title: 'AI Content Generations',
      icon: Bot,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.08)',
      used: usage?.metrics?.aiUsage?.used ? Math.round(usage.metrics.aiUsage.used / 100) : 0,
      limit: subscription?.maxAiContent ?? 1000,
      unit: 'Generations',
    },
    {
      id: 'ai_videos',
      title: 'AI Video Generations',
      icon: Video,
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.08)',
      used: usage?.videoRendering?.used ? Math.round(usage.videoRendering.used / 60) : 0,
      limit: subscription?.maxAiVideos ?? 30,
      unit: 'Videos',
    },
    {
      id: 'social_accounts',
      title: 'Social Accounts',
      icon: Share2,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.08)',
      used: usage?.socialAccounts?.used ?? 0,
      limit: subscription?.maxSocialAccounts ?? usage?.socialAccounts?.limit ?? 15,
      unit: 'Accounts',
    },
    {
      id: 'active_campaigns',
      title: 'Active Campaigns',
      icon: Target,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.08)',
      used: usage?.automations?.used ?? 0,
      limit: subscription?.maxActiveCampaigns ?? 20,
      unit: 'Campaigns',
    },
    {
      id: 'scheduled_posts',
      title: 'Scheduled Posts',
      icon: Clock,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.08)',
      used: 0,
      limit: subscription?.maxScheduledPosts ?? 500,
      unit: 'Posts',
    },
    {
      id: 'storage',
      title: 'Media Storage',
      icon: HardDrive,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.08)',
      usedFormatted: formatBytes(usage?.storage?.used ?? 0),
      limitFormatted: formatBytes(subscription?.storageBytesLimit ?? usage?.storage?.limit ?? 53687091200),
      isStorage: true,
      usedRaw: usage?.storage?.used ?? 0,
      limitRaw: subscription?.storageBytesLimit ?? usage?.storage?.limit ?? 53687091200,
    },
  ];

  return (
    <div className="dashboard-subscription-card" id="dashboard-subscription-overview">
      {/* Top Header Row */}
      <div className="dashboard-sub-header">
        <div className="dashboard-sub-header-left">
          <div className="dashboard-sub-icon-badge">
            <Zap size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="dashboard-sub-title">Workspace Subscription &amp; Quotas</h2>
              <span className={`dashboard-plan-badge badge-${rawPlanId}`}>
                <Sparkles size={12} />
                <span>{planName} Plan</span>
              </span>
              <span className={`dashboard-status-pill status-${rawStatus}`}>
                <span className="sub-status-dot" />
                <span>{statusLabel}</span>
              </span>
            </div>
            <p className="dashboard-sub-desc">
              Authoritative plan entitlements, billing cycle renewal, and real-time resource allocations.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dashboard-sub-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm dashboard-btn-manage"
            onClick={() => onNavigate('billing', { section: 'overview' })}
            title="Manage payment methods, invoices, and billing contact"
          >
            <span>Manage Subscription</span>
            <ExternalLink size={13} />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm dashboard-btn-upgrade"
            onClick={() => onNavigate('billing', { section: 'plans' })}
            title="Explore higher tiers or switch to annual billing for 20% savings"
          >
            <Sparkles size={13} />
            <span>Upgrade Plan</span>
          </button>
        </div>
      </div>

      {/* 5-Item Metadata Bar */}
      <div className="dashboard-sub-meta-strip">
        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Active Plan</span>
          <span className="meta-val highlight">{planName}</span>
        </div>

        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Subscription Status</span>
          <span className="meta-val status-text">
            <ShieldCheck size={14} className="text-emerald-500" style={{ display: 'inline', marginRight: '4px' }} />
            {statusLabel}
          </span>
        </div>

        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Billing Cycle</span>
          <span className="meta-val">
            <Calendar size={13} style={{ display: 'inline', marginRight: '4px', color: 'var(--text-muted)' }} />
            {billingCycleLabel}
          </span>
        </div>

        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Subscription Start</span>
          <span className="meta-val">{startDateFormatted}</span>
        </div>

        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Next Renewal</span>
          <span className="meta-val renewal-date">{renewalDateFormatted}</span>
        </div>

        <div className="dashboard-sub-meta-item">
          <span className="meta-label">Payment Status</span>
          <span className="meta-val payment-status">
            {isPaymentPaid ? (
              <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                <span>{paymentStatusLabel}</span>
              </span>
            ) : (
              <span style={{ color: '#D97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CreditCard size={13} />
                <span>{paymentStatusLabel}</span>
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Quota & Usage Progress Grid */}
      <div className="dashboard-quotas-container">
        <div className="dashboard-quotas-header">
          <span className="dashboard-quotas-title">Current Usage &amp; Available Quotas</span>
          <span className="dashboard-quotas-period">
            Billing Period: {usage?.period || new Date().toISOString().slice(0, 7)}
          </span>
        </div>

        <div className="dashboard-quotas-grid">
          {quotas.map((q) => {
            let percentage = 0;
            let availableText = '';

            if (q.isStorage) {
              const u = Number(q.usedRaw) || 0;
              const lim = Number(q.limitRaw) || 1;
              percentage = Math.min(100, Math.round((u / lim) * 100));
              const availBytes = Math.max(0, lim - u);
              availableText = `${formatBytes(availBytes)} available`;
            } else {
              const u = Number(q.used) || 0;
              const lim = Number(q.limit) || 1;
              percentage = Math.min(100, Math.round((u / lim) * 100));
              const avail = Math.max(0, lim - u);
              availableText = `${avail.toLocaleString()} available`;
            }

            const IconComp = q.icon;

            return (
              <div key={q.id} className="dashboard-quota-item-card">
                <div className="dashboard-quota-top">
                  <div className="dashboard-quota-icon-wrap" style={{ background: q.bg, color: q.color }}>
                    <IconComp size={15} />
                  </div>
                  <div className="dashboard-quota-label-wrap">
                    <span className="dashboard-quota-name">{q.title}</span>
                    <span className="dashboard-quota-val">
                      {q.isStorage ? (
                        <>
                          <strong>{q.usedFormatted}</strong> / {q.limitFormatted}
                        </>
                      ) : (
                        <>
                          <strong>{q.used?.toLocaleString()}</strong> / {q.limit?.toLocaleString()} {q.unit}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="dashboard-quota-progress-track">
                  <div
                    className="dashboard-quota-progress-fill"
                    style={{
                      width: `${Math.max(percentage, 3)}%`,
                      background: percentage >= 90 ? '#EF4444' : percentage >= 75 ? '#F59E0B' : q.color,
                    }}
                  />
                </div>

                <div className="dashboard-quota-bottom">
                  <span className="dashboard-quota-avail">{availableText}</span>
                  <span className="dashboard-quota-percent">{percentage}% used</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
