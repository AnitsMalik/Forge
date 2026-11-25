import React from 'react';

export type StatusType =
  | 'ACTIVE'
  | 'CONNECTED'
  | 'APPROVED'
  | 'SENT'
  | 'PASSED'
  | 'COMPLETED'
  | 'LIVE'
  | 'PENDING'
  | 'SCHEDULED'
  | 'CHECKING'
  | 'RUNNING'
  | 'PAUSED'
  | 'DRAFT'
  | 'NEEDS_ATTENTION'
  | 'CHANGES_REQUESTED'
  | 'REAUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'RATE_LIMITED'
  | 'REJECTED'
  | 'FAILED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'INACTIVE'
  | 'ARCHIVED';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  pulse = false,
  className = '',
}) => {
  const normStatus = status?.toUpperCase().replace(/\s+/g, '_') as StatusType;

  const getStyle = () => {
    switch (normStatus) {
      case 'ACTIVE':
      case 'CONNECTED':
      case 'APPROVED':
      case 'SENT':
      case 'PASSED':
      case 'COMPLETED':
      case 'LIVE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500',
        };
      case 'PENDING':
      case 'SCHEDULED':
      case 'CHECKING':
      case 'RUNNING':
        return {
          bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          dot: 'bg-sky-500',
        };
      case 'PAUSED':
      case 'DRAFT':
      case 'NEEDS_ATTENTION':
      case 'CHANGES_REQUESTED':
        return {
          bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500',
        };
      case 'REJECTED':
      case 'FAILED':
      case 'DISCONNECTED':
      case 'ERROR':
      case 'REAUTH_REQUIRED':
      case 'PERMISSION_MISSING':
      case 'RATE_LIMITED':
        return {
          bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500',
        };
      case 'INACTIVE':
      case 'ARCHIVED':
      default:
        return {
          bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-500',
        };
    }
  };

  const style = getStyle();

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }[size];

  const displayLabel = label || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border whitespace-nowrap shrink-0 ${sizeClasses} ${style.bg} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot} ${pulse ? 'animate-ping' : ''}`}
      />
      <span>{displayLabel}</span>
    </span>
  );
};

