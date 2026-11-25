import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth,
  size,
  className = '',
}) => {
  const activeOpen = Boolean(open ?? isOpen);
  const activeMaxWidth = size ?? maxWidth ?? 'xl';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeOpen) {
        onClose();
      }
    };
    if (activeOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOpen, onClose]);

  if (!activeOpen) return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
  }[activeMaxWidth];

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          className={`w-screen ${widthClasses} bg-surface border-l border-subtle shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out animate-slide-left ${className}`}
        >
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-subtle flex items-center justify-between shrink-0 bg-surface">
            <div className="flex items-center gap-3 min-w-0 pr-4">
              {icon && (
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-bold text-primary tracking-tight truncate">{title}</h3>
                {subtitle && <p className="text-xs text-secondary mt-0.5 truncate">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-elevated transition cursor-pointer shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-primary text-sm">
            {children}
          </div>

          {/* Drawer Footer */}
          {footer && (
            <div className="px-6 py-4 border-t border-subtle bg-surface-elevated flex items-center justify-end gap-3 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
