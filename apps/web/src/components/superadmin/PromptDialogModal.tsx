import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

export interface PromptDialogModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  minChars?: number;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: (val: string) => void | Promise<void>;
  onCancel: () => void;
}

export const PromptDialogModal: React.FC<PromptDialogModalProps> = ({
  isOpen,
  title,
  description,
  label = 'Justification / Reason',
  placeholder = 'Enter explanation...',
  defaultValue = '',
  minChars = 8,
  confirmText = 'Submit',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const [val, setVal] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVal(defaultValue);
      setError(null);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim().length < minChars) {
      setError(`Must be at least ${minChars} characters (currently ${val.trim().length}).`);
      return;
    }
    setError(null);
    onConfirm(val.trim());
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#f8fafc' }}>
              {title}
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              {description}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
              {label} {minChars > 0 && <span style={{ color: '#94a3b8' }}>(min {minChars} chars)</span>}
            </label>
            <textarea
              rows={3}
              value={val}
              onChange={(e) => {
                setVal(e.target.value);
                if (error && e.target.value.trim().length >= minChars) {
                  setError(null);
                }
              }}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: error ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.8rem' }}>
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#2563eb',
                border: 'none',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
