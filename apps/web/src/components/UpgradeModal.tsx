import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.js';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason?: string;
  currentPlanId?: string;
  onNavigateToBilling?: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title = 'Upgrade Your Workspace Plan',
  reason,
  currentPlanId = 'free_trial',
  onNavigateToBilling,
}) => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCheckout = async (planId: string) => {
    try {
      setLoadingPlan(planId);
      setErrorMessage(null);

      const res = await api.billing.createCheckout({
        planId,
        billingInterval,
        successUrl: window.location.origin + '/?tab=billing&status=success',
        cancelUrl: window.location.origin + '/?tab=billing&status=cancelled',
      });

      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error('No checkout URL received from billing provider.');
      }
    } catch (err: any) {
      console.error('Checkout redirect failed:', err);
      setErrorMessage(err.message || 'Failed to initiate Stripe Checkout session.');
      setLoadingPlan(null);
    }
  };

  const isAnnual = billingInterval === 'year';

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: isAnnual ? '$49' : '$59',
      interval: '/mo',
      annualNote: isAnnual ? 'Billed annually ($588/yr)' : 'Billed monthly',
      badge: 'Solo Creators',
      desc: 'Essential multi-platform publishing and basic CRM for single brands.',
      highlights: ['1 Brand Workspace', '2 Team Seats', '3 Social Accounts', '100 Posts / Month', '5 GB Storage', '3 Automations', 'AI Content & Design', 'L1-L2 Autonomy'],
      isRecommended: false,
    },
    {
      id: 'growth',
      name: 'Growth',
      price: isAnnual ? '$79' : '$99',
      interval: '/mo',
      annualNote: isAnnual ? 'Billed annually ($948/yr)' : 'Billed monthly',
      badge: 'Most Popular',
      desc: 'Powerhouse tier for growing brands & boutique marketing teams.',
      highlights: ['5 Brand Workspaces', '5 Team Seats', '15 Social Accounts', '500 Posts / Month', '20 GB Storage', '10 Automations', 'Full AI Design Studio', 'Video & Reels Studio', 'Client Approval Links', 'L3 Autonomy'],
      isRecommended: true,
    },
    {
      id: 'agency',
      name: 'Agency Pro',
      price: isAnnual ? '$199' : '$249',
      interval: '/mo',
      annualNote: isAnnual ? 'Billed annually ($2,388/yr)' : 'Billed monthly',
      badge: 'Best for Agencies',
      desc: 'Maximum throughput, multi-client brand governance, and API access.',
      highlights: ['25 Brand Workspaces', '20 Team Seats', '100 Social Accounts', '2,500 Posts / Month', '100 GB Storage', '50 Automations', 'Multi-Client Workspaces', 'Multi-Brand Brain', 'Developer API Access', 'L4 Autonomy'],
      isRecommended: false,
    },
    {
      id: 'scale',
      name: 'Scale',
      price: isAnnual ? '$399' : '$499',
      interval: '/mo',
      annualNote: isAnnual ? 'Billed annually ($4,788/yr)' : 'Billed monthly',
      badge: 'High Volume',
      desc: 'High-throughput operating engines with 100 brands and L5 autonomy.',
      highlights: ['100 Brand Workspaces', '50 Team Seats', '250 Social Accounts', '10,000 Posts / Month', '500 GB Storage', '200 Automations', 'L5 Autonomous Growth Agent', 'SCIM & SAML Governance', 'Priority SLA'],
      isRecommended: false,
    },
  ];

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="modal-dialog animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '1080px',
          padding: '32px',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="modal-close"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
          }}
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'var(--accent-primary, #8b5cf6)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={14} />
            <span>Commercial Plan Upgrade</span>
          </div>

          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-heading, inherit)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary, #f8fafc)',
              margin: '0 0 8px 0',
            }}
          >
            {title}
          </h2>

          {reason && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '8px 14px',
                color: '#f59e0b',
                fontSize: '0.86rem',
                fontWeight: 500,
                marginTop: '4px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{reason}</span>
            </div>
          )}

          {/* Billing Interval Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '999px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setBillingInterval('month')}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: !isAnnual ? 'var(--accent-primary, #8b5cf6)' : 'transparent',
                color: !isAnnual ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              }}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('year')}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: isAnnual ? 'var(--accent-primary, #8b5cf6)' : 'transparent',
                color: isAnnual ? '#ffffff' : 'var(--text-muted, #94a3b8)',
              }}
            >
              Annual (Save ~20%)
            </button>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '10px 14px',
              color: '#ef4444',
              fontSize: '0.85rem',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Plan Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                style={{
                  background: plan.isRecommended
                    ? 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, var(--bg-surface-elevated) 100%)'
                    : 'var(--bg-surface)',
                  border: plan.isRecommended
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg, 14px)',
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.isRecommended ? '0 10px 30px rgba(139, 92, 246, 0.25)' : 'none',
                }}
              >
                {plan.isRecommended && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--gradient-brand)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 12px',
                      borderRadius: '999px',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #ffffff)' }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                    {plan.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: '12px', gap: '4px' }}>
                    <span style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary, #ffffff)' }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
                      {plan.interval}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isAnnual ? 'var(--accent-primary, #a855f7)' : 'var(--text-muted, #64748b)', marginTop: '4px', fontWeight: isAnnual ? 600 : 400 }}>
                    {plan.annualNote}
                  </div>
                </div>

                <div style={{ flex: 1, borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))', paddingTop: '14px', marginBottom: '20px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.highlights.map((feat, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary, #cbd5e1)' }}>
                        <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isCurrent || isLoading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isCurrent || isLoading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: isCurrent
                      ? 'rgba(255, 255, 255, 0.08)'
                      : plan.isRecommended
                      ? 'var(--gradient-brand)'
                      : 'rgba(139, 92, 246, 0.2)',
                    color: isCurrent ? 'var(--text-muted, #64748b)' : '#ffffff',
                    boxShadow: plan.isRecommended && !isCurrent ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : isCurrent ? (
                    <span>Current Tier</span>
                  ) : (
                    <>
                      <span>Upgrade Plan</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info & Navigation Link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            paddingTop: '18px',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10b981" />
            <span>Encrypted Stripe checkout. Instant quota activation. Cancel anytime.</span>
          </div>

          {onNavigateToBilling && (
            <button
              onClick={() => {
                onClose();
                onNavigateToBilling();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary, #8b5cf6)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View full billing dashboard</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
