import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

export interface ConfirmDialogModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
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

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return createPortal(
    <div
      className="modal-backdrop"
      style={{ zIndex: 10005 }}
      onClick={onCancel}
    >
      <div
        className="modal-dialog animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              background: isDanger
                ? 'rgba(239, 68, 68, 0.15)'
                : isWarning
                ? 'rgba(245, 158, 11, 0.15)'
                : 'rgba(59, 130, 246, 0.15)',
              color: isDanger ? 'var(--accent-rose, #ef4444)' : isWarning ? 'var(--accent-amber, #f59e0b)' : 'var(--accent-primary, #3b82f6)',
              flexShrink: 0,
            }}
          >
            {isDanger || isWarning ? <AlertTriangle size={22} /> : <Info size={22} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {description}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={loading}
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isDanger ? 'btn-danger' : isWarning ? 'btn-secondary' : 'btn-primary'}`}
            disabled={loading}
            onClick={onConfirm}
            style={{
              padding: '7px 18px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isWarning ? 'var(--accent-amber, #d97706)' : undefined,
              color: isWarning ? '#ffffff' : undefined,
            }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
