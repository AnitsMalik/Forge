import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, CreditCard, ChevronRight, X, Clock } from 'lucide-react';
import { api } from '../services/api.js';
import type { DunningStatusResponse } from '@socialforge/shared';

interface PastDueBannerProps {
  onNavigate?: (tab: string) => void;
  onRefreshTrigger?: number;
}

export const PastDueBanner: React.FC<PastDueBannerProps> = ({ onNavigate, onRefreshTrigger = 0 }) => {
  const [dunning, setDunning] = useState<DunningStatusResponse | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  const fetchDunningStatus = useCallback(async () => {
    try {
      const res = await api.billing.getDunningStatus();
      if (res) {
        setDunning(res);
      }
    } catch {
      // Gracefully silent if user not logged in or during transition
    }
  }, []);

  useEffect(() => {
    fetchDunningStatus();
  }, [fetchDunningStatus, onRefreshTrigger]);

  if (!dunning || !dunning.isPastDue || isDismissed) {
    return null;
  }

  const isSuspended = !dunning.isInGracePeriod || dunning.subscriptionStatus === 'unpaid';
  const daysRemaining = dunning.daysRemaining;

  const handleUpdatePayment = async () => {
    setLoadingPortal(true);
    try {
      const res = await api.billing.createPortal({
        returnUrl: window.location.origin + '/?tab=billing&status=portal_return',
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
    } catch (err) {
      console.warn('Portal launch failed, falling back to internal billing page:', err);
    } finally {
      setLoadingPortal(false);
    }

    if (onNavigate) {
      onNavigate('billing');
    }
  };

  return (
    <div
      role="alert"
      style={{
        width: '100%',
        padding: '10px 20px',
        background: isSuspended
          ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.22) 0%, rgba(185, 28, 28, 0.28) 100%)'
          : 'linear-gradient(90deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.28) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: isSuspended
          ? '1px solid rgba(239, 68, 68, 0.45)'
          : '1px solid rgba(245, 158, 11, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        zIndex: 99,
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: isSuspended ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            border: isSuspended ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(245, 158, 11, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSuspended ? '#f87171' : '#fbbf24',
            flexShrink: 0,
          }}
        >
          {isSuspended ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: 700,
                color: isSuspended ? '#fca5a5' : '#fde68a',
              }}
            >
              {isSuspended ? 'Action Required: Workspace Publishing Suspended' : 'Payment Past Due — Grace Period Active'}
            </span>

            {!isSuspended && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.25)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fef3c7',
                }}
              >
                <Clock size={11} />
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </span>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #94a3b8)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isSuspended
              ? 'Your 5-day grace period has elapsed. Automatic publishing and new scheduled posts are paused until billing is updated.'
              : `Your last renewal payment failed. You have ${daysRemaining} days left of uninterrupted access before publishing is paused.`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <button
          onClick={handleUpdatePayment}
          disabled={loadingPortal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            background: isSuspended
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            boxShadow: isSuspended
              ? '0 2px 8px rgba(239, 68, 68, 0.35)'
              : '0 2px 8px rgba(245, 158, 11, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <CreditCard size={14} />
          <span>{loadingPortal ? 'Redirecting...' : isSuspended ? 'Reactivate Now' : 'Update Payment Method'}</span>
          <ChevronRight size={14} />
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          title="Dismiss notification"
          aria-label="Dismiss banner"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary, #94a3b8)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
