import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Sparkles,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Loader2,
  Building2,
  Settings,
  X,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { UpgradeModal } from '../components/UpgradeModal.js';
import { ConfirmDialogModal } from '../components/superadmin/ConfirmDialogModal.js';

interface Member {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  joinedAt: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  inviteUrl: string;
}

interface TeamPageProps {
  onNavigate?: (tab: string) => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  const { tenant, user, refreshTenant } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [workspaceData, setWorkspaceData] = useState<any>(null);
  const [quota, setQuota] = useState<any>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  // Member Removal Confirmation
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const isAnyModalOpen = Boolean(isInviteModalOpen || isUpgradeModalOpen || memberToRemove);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isInviteModalOpen, isUpgradeModalOpen, memberToRemove]);

  // Workspace Settings State
  const [workspaceName, setWorkspaceName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [membersRes, invitesRes, wsRes, quotaRes] = await Promise.allSettled([
        api.workspaces.listMembers(),
        api.workspaces.listInvites(),
        api.workspaces.getCurrent(),
        api.workspaces.getQuota(),
      ]);

      if (membersRes.status === 'fulfilled') setMembers(membersRes.value || []);
      if (invitesRes.status === 'fulfilled') setInvites(invitesRes.value || []);
      if (wsRes.status === 'fulfilled') {
        setWorkspaceData(wsRes.value);
        setWorkspaceName(wsRes.value?.name || '');
      }
      if (quotaRes.status === 'fulfilled') setQuota(quotaRes.value);
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setNotification(null);

      const res = await api.workspaces.inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (res?.inviteUrl) {
        setCreatedInviteUrl(res.inviteUrl);
        await loadData(true);
      }
    } catch (err: any) {
      if (err.code === 'PLAN_LIMIT_EXCEEDED' || err.message?.includes('limit') || err.message?.includes('quota')) {
        setIsInviteModalOpen(false);
        setUpgradeReason(err.message || 'You have reached the team seat limit for your current plan.');
        setIsUpgradeModalOpen(true);
      } else {
        setNotification({ type: 'error', message: err.message || 'Failed to send invitation.' });
      }
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await api.workspaces.cancelInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      setNotification({ type: 'success', message: 'Invitation revoked.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to cancel invitation.' });
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: string) => {
    try {
      await api.workspaces.updateMemberRole(targetUserId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === targetUserId ? { ...m, role: newRole } : m))
      );
      setNotification({ type: 'success', message: 'Role updated successfully.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update role.' });
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    setMemberToRemove({ id: targetUserId, name: targetName });
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;
    const targetUserId = memberToRemove.id;
    setMemberToRemove(null);

    try {
      await api.workspaces.removeMember(targetUserId);
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
      setNotification({ type: 'success', message: 'Member removed from workspace.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to remove member.' });
    }
  };

  const handleSaveWorkspaceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    try {
      setSavingSettings(true);
      await api.workspaces.updateCurrent({ name: workspaceName.trim() });
      setSettingsSuccess(true);
      await refreshTenant();
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const userSeatsLimit = quota?.users?.limit || 2;
  const userSeatsUsed = members.length;
  const isSeatsExceeded = userSeatsUsed >= userSeatsLimit;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <Loader2 size={36} className="animate-spin" color="var(--accent-primary, #8b5cf6)" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading workspace members and team permissions...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Team & Permissions
            </h1>
            <span
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: 'var(--accent-primary)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              Workspace Governance
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
            Manage agency team member access, role hierarchies, and workspace invitation links.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          <button
            onClick={() => {
              setCreatedInviteUrl(null);
              setIsInviteModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: notification.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Top Cards: Workspace Overview & Seat Quota */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Workspace Identity Card */}
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Active Agency Workspace
              </span>
              <span
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3b82f6',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {workspaceData?.plan?.name || 'Growth'} Plan
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
              {workspaceData?.name || tenant?.name}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Identifier: <code style={{ color: 'var(--accent-primary)', fontSize: '0.8rem' }}>{workspaceData?.slug || tenant?.slug}</code>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Your Role: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{workspaceData?.role || 'owner'}</strong>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('billing')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: 'auto',
                }}
              >
                <span>Billing & Quotas</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Team Seats Quota Meter */}
        <div
          style={{
            background: 'var(--bg-glass-card, #0d111b)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                Seat Quota Allocation
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: isSeatsExceeded ? '#ef4444' : '#10b981',
                }}
              >
                {Math.round((userSeatsUsed / userSeatsLimit) * 100)}% Used
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {userSeatsUsed}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                / {userSeatsLimit} seats occupied
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min((userSeatsUsed / userSeatsLimit) * 100, 100)}%`,
                  height: '100%',
                  background: isSeatsExceeded ? '#ef4444' : 'var(--gradient-brand)',
                  borderRadius: '999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {userSeatsLimit - userSeatsUsed > 0
                ? `${userSeatsLimit - userSeatsUsed} seat(s) remaining on current tier`
                : 'Seat limit reached'}
            </span>
            {isSeatsExceeded && (
              <button
                onClick={() => {
                  setUpgradeReason('You have reached the maximum seat limit for your current subscription.');
                  setIsUpgradeModalOpen(true);
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.78rem', color: 'var(--accent-primary)' }}
              >
                <Sparkles size={12} />
                <span>Add Seats</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Team Members Table */}
      <div
        style={{
          background: 'var(--bg-glass-card, #0d111b)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Active Workspace Members ({members.length})
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Users with authenticated access to this agency workspace and associated brand kits.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>User</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Role Hierarchy</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Joined Date</th>
                <th style={{ padding: '12px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const isOwner = member.role === 'owner';

                return (
                  <tr key={member.membershipId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--gradient-brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            flexShrink: 0,
                          }}
                        >
                          {member.fullName ? member.fullName.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{member.fullName || 'Team Member'}</span>
                            {isCurrentUser && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px' }}>
                      {isOwner ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            background: 'rgba(236, 72, 153, 0.15)',
                            color: '#ec4899',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          <Shield size={12} />
                          <span>Owner</span>
                        </span>
                      ) : (
                        <select
                          className="form-select"
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.82rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="admin">Admin (Full Access)</option>
                          <option value="editor">Editor (Create & Edit)</option>
                          <option value="client_approver">Client Approver</option>
                          <option value="viewer">Viewer (Read Only)</option>
                        </select>
                      )}
                    </td>

                    <td style={{ padding: '14px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                      {new Date(member.joinedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      {!isOwner && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.fullName || member.email)}
                          title="Remove user from workspace"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '6px',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ef4444')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Table */}
      <div
        style={{
          background: 'var(--bg-glass-card, #0d111b)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Pending Invitations ({invites.length})
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
              Invited colleagues who have not yet accepted their invitation token.
            </p>
          </div>
        </div>

        {invites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
            <Mail size={30} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No pending invitations for this workspace.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Invited Email</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Assigned Role</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600 }}>Expires At</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {inv.email}
                    </td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {inv.role}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => copyToClipboard(inv.inviteUrl)}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Copy size={13} />
                          <span>Copy Link</span>
                        </button>
                        <button
                          onClick={() => handleCancelInvite(inv.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#ef4444', fontSize: '0.78rem' }}
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workspace Settings Section */}
      <div
        style={{
          background: 'var(--bg-glass-card, #0d111b)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Agency Workspace Settings
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
            Update the workspace display name and configuration defaults.
          </p>
        </div>

        <form onSubmit={handleSaveWorkspaceSettings} style={{ maxWidth: '480px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              disabled={savingSettings || !workspaceName.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
              <span>Save Workspace Details</span>
            </button>
            {settingsSuccess && (
              <span style={{ color: '#10b981', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)' }}>
                  <UserPlus size={20} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Invite Team Member
                </h3>
              </div>
              <button className="modal-close" onClick={() => setIsInviteModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {createdInviteUrl ? (
              <div>
                <div style={{ textAlign: 'center', padding: '12px 0 20px 0' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    <Check size={24} />
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    Invitation Created!
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    Share this unique onboarding link with your colleague:
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '20px',
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value={createdInviteUrl}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(createdInviteUrl)}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedUrl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInvite}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="colleague@agency.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Assigned Workspace Role
                  </label>
                  <select
                    className="form-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="editor">Editor — Can draft, edit & schedule posts</option>
                    <option value="admin">Admin — Full management & brand kit access</option>
                    <option value="client_approver">Client Approver — Review & approve queue</option>
                    <option value="viewer">Viewer — Read only access to calendar & stats</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {inviting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Generating Invite...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Generate Invitation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Upgrade Modal for User Seats Limit */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade to Add More Team Seats"
        reason={upgradeReason || 'Your current plan seat limit has been reached.'}
        currentPlanId={tenant?.subscriptionTier || 'starter'}
        onNavigateToBilling={() => {
          setIsUpgradeModalOpen(false);
          if (onNavigate) onNavigate('billing');
        }}
      />

      <ConfirmDialogModal
        isOpen={!!memberToRemove}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${memberToRemove?.name} from this workspace? They will lose all access to connected social accounts and campaign workflows.`}
        confirmText="Remove Member"
        variant="danger"
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
};
