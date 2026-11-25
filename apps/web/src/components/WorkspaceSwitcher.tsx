import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  Shield,
  Loader2,
  X,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  planId: string;
  planName: string;
  subscriptionStatus: string;
  isActive: boolean;
}

interface WorkspaceSwitcherProps {
  onWorkspaceSwitched?: () => void;
  isCollapsed?: boolean;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  onWorkspaceSwitched,
  isCollapsed = false,
}) => {
  const { tenant, refreshTenant, refreshBrands } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const res = await api.workspaces.list();
      if (res?.workspaces) {
        setWorkspaces(res.workspaces);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSwitch = async (targetTenantId: string) => {
    if (targetTenantId === tenant?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setSwitchingId(targetTenantId);
      setErrorMsg(null);
      const res = await api.workspaces.switch(targetTenantId);
      if (res?.accessToken) {
        api.setToken(res.accessToken);
        await refreshTenant();
        await refreshBrands();
        setIsOpen(false);
        if (onWorkspaceSwitched) {
          onWorkspaceSwitched();
        } else {
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to switch workspace: ' + (err.message || 'Unknown error'));
    } finally {
      setSwitchingId(null);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      setCreating(true);
      setErrorMsg(null);
      const res = await api.workspaces.create({ name: newWorkspaceName.trim() });
      if (res?.id) {
        // Automatically switch to the newly created workspace
        const switchRes = await api.workspaces.switch(res.id);
        if (switchRes?.accessToken) {
          api.setToken(switchRes.accessToken);
          await refreshTenant();
          await refreshBrands();
          setIsCreateOpen(false);
          setNewWorkspaceName('');
          window.location.reload();
        }
      }
    } catch (err: any) {
      setErrorMsg('Failed to create workspace: ' + (err.message || 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const activeWorkspace = workspaces.find((w) => w.isActive) || {
    id: tenant?.id || '',
    name: tenant?.name || 'Workspace',
    slug: tenant?.slug || '',
    role: 'owner',
    planName: 'Starter',
  };

  if (isCollapsed) {
    return (
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={`Active Workspace: ${tenant?.name || 'Workspace'}`}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))',
            border: '1px solid rgba(139, 92, 246, 0.45)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Building2 size={20} color="var(--accent-primary)" />
        </button>

        {isOpen && (
          <div
            className="sidebar-hover-flyout"
            style={{
              position: 'absolute',
              left: '54px',
              top: '0',
              zIndex: 9999,
              width: '260px',
              background: 'var(--bg-surface-elevated, #111522)',
              border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.15))',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
            }}
          >
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
              Workspaces ({workspaces.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleSwitch(w.id)}
                  disabled={switchingId === w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: w.isActive ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                    color: w.isActive ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: w.isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.name}
                  </span>
                  {w.isActive && <Check size={14} color="#10b981" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Plus size={13} />
              <span>New Workspace</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={dropdownRef}>
      {/* Workspace Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              flexShrink: 0,
            }}
          >
            <Building2 size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {tenant?.name || 'My Workspace'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ textTransform: 'capitalize' }}>
                {tenant?.subscriptionTier ? tenant.subscriptionTier.replace(/_/g, ' ') : 'Starter'}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'var(--bg-surface-elevated, #111522)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
            padding: '10px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '6px 10px',
                marginBottom: '8px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontWeight: 700,
              padding: '4px 6px 8px 6px',
              letterSpacing: '0.04em',
            }}
          >
            Workspaces ({workspaces.length || 1})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '220px', overflowY: 'auto' }}>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => handleSwitch(w.id)}
                disabled={switchingId === w.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: w.isActive ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                  color: w.isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: w.isActive ? 700 : 500, color: w.isActive ? 'var(--text-primary)' : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{w.planName}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'capitalize' }}>{w.role}</span>
                  </div>
                </div>
                {switchingId === w.id ? (
                  <Loader2 size={14} className="animate-spin" color="var(--accent-primary)" />
                ) : w.isActive ? (
                  <Check size={14} color="#10b981" />
                ) : null}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '8px', paddingTop: '8px' }}>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--border-subtle)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={14} />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 13, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--bg-surface-elevated, #111522)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Create Workspace
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: '0 0 20px 0' }}>
              Create an isolated agency workspace for a new client, subsidiary, or marketing team.
            </p>

            {errorMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  marginBottom: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.8rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Workspace / Agency Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Marketing Studio"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newWorkspaceName.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {creating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Workspace</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
