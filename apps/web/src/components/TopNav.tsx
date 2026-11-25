import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ChevronDown,
  CreditCard,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { WorkspaceSwitcher } from './WorkspaceSwitcher.js';

interface TopNavProps {
  onNewPostClick: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  onNewPostClick,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onNavigate,
}) => {
  const { user, tenant, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isProfileOpen]);

  const handleMenuNavigate = (tab: string) => {
    setIsProfileOpen(false);
    onNavigate?.(tab);
  };

  return (
    <header className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label="Toggle sidebar"
            className="nav-toggle-btn"
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {onNavigate && (
          <button
            onClick={() => onNavigate('billing')}
            title="Manage workspace plan and quotas"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Sparkles size={13} color="var(--accent-primary)" />
            <span style={{ textTransform: 'capitalize' }}>
              {tenant?.subscriptionTier ? `${tenant.subscriptionTier.replace(/_/g, ' ')}` : 'Billing'}
            </span>
          </button>
        )}

        <button className="btn btn-primary btn-sm top-nav-create-btn" onClick={onNewPostClick}>
          <Plus size={16} />
          <span className="top-nav-create-btn-text">Create Post</span>
        </button>

        {user && (
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            {/* Clickable Profile Trigger Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isProfileOpen}
              aria-label="User account and workspace menu"
              className="top-nav-profile-trigger"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px 4px 4px',
                borderRadius: '999px',
                background: isProfileOpen ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                border: isProfileOpen
                  ? '1px solid rgba(139, 92, 246, 0.45)'
                  : '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--gradient-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.35)',
                  flexShrink: 0,
                }}
              >
                {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
              </div>

              <div
                className="top-nav-profile-name"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.2,
                }}
              >
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user.fullName || 'User'}
                </span>
                {user.emailVerified && (
                  <span title="Verified Account" style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                    <CheckCircle size={12} />
                  </span>
                )}
              </div>

              <ChevronDown
                size={14}
                style={{
                  color: 'var(--text-secondary)',
                  transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Profile & Agency Workspace Dropdown Menu */}
            {isProfileOpen && (
              <div
                className="top-nav-profile-dropdown animate-fade-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '320px',
                  maxWidth: 'calc(100vw - 24px)',
                  background: 'var(--bg-surface-elevated, #0e121e)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.12))',
                  borderRadius: 'var(--radius-lg, 16px)',
                  boxShadow: '0 20px 48px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(139, 92, 246, 0.15)',
                  padding: '16px',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* 1. User Profile Details */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--gradient-brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {user.fullName || 'User'}
                      </span>
                      {user.emailVerified ? (
                        <span title="Verified Account" style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                          <CheckCircle size={14} />
                        </span>
                      ) : (
                        <span title="Email Unverified" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                          <AlertCircle size={14} />
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                        }}
                      >
                        {user.role ? user.role.replace(/_/g, ' ') : 'Member'}
                      </span>
                      {user.isSuperAdmin && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          Superadmin
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Agency Workspace Switcher */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Agency Workspace
                    </span>
                  </div>
                  <WorkspaceSwitcher
                    isCollapsed={false}
                    onWorkspaceSwitched={() => setIsProfileOpen(false)}
                  />
                </div>

                {/* 3. Navigation Links */}
                {onNavigate && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '10px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleMenuNavigate('billing')}
                      className="profile-menu-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={15} color="var(--accent-primary)" />
                        <span>Billing &amp; Subscription</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {tenant?.subscriptionTier ? tenant.subscriptionTier.replace(/_/g, ' ') : 'Plan'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMenuNavigate('team')}
                      className="profile-menu-item"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <Users size={15} color="var(--accent-primary)" />
                      <span>Team Members &amp; Roles</span>
                    </button>

                    {user.isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleMenuNavigate('admin-operations')}
                        className="profile-menu-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm, 6px)',
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          color: '#f59e0b',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'left',
                          marginTop: '2px',
                        }}
                      >
                        <ShieldCheck size={15} color="#f59e0b" />
                        <span>Superadmin Operations</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Sign Out */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsProfileOpen(false);
                      try {
                        await logout();
                      } finally {
                        window.location.href = '/login';
                      }
                    }}
                    className="profile-menu-item profile-logout-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
