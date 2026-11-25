import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Key,
  Lock,
  Clock,
  ChevronDown,
  Check,
  X,
  Zap,
  RotateCcw,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api.js';
import type { MetaFacebookPage, PublishingJob, PublishingAuditLog } from '@socialforge/shared';

interface MetaIntegrationCardProps {
  brandId: string;
  brandName: string;
  onRefresh?: () => void;
}

export const MetaIntegrationCard: React.FC<MetaIntegrationCardProps> = ({
  brandId,
  brandName,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(true);
  const [metaStatus, setMetaStatus] = useState<any>(null);
  const [pages, setPages] = useState<MetaFacebookPage[]>([]);
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [auditLogs, setAuditLogs] = useState<PublishingAuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'pages' | 'jobs' | 'audit'>('overview');

  // Modals & Drawers
  const [devTokenModalOpen, setDevTokenModalOpen] = useState(false);
  const [devTokenInput, setDevTokenInput] = useState('');
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);

  const [pageSelectModalOpen, setPageSelectModalOpen] = useState(false);
  const [isSelectingPage, setIsSelectingPage] = useState(false);

  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  useEffect(() => {
    const isAnyModalOpen = Boolean(devTokenModalOpen || pageSelectModalOpen || disconnectConfirmOpen);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [devTokenModalOpen, pageSelectModalOpen, disconnectConfirmOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadMetaState = async () => {
    if (!brandId) return;
    setLoading(true);
    try {
      const statusRes = await api.meta.getStatus(brandId);
      setMetaStatus(statusRes);

      if (statusRes.connected) {
        const [pagesRes, jobsRes, logsRes] = await Promise.all([
          api.meta.getPages(brandId).catch(() => []),
          api.meta.getJobs(brandId).catch(() => []),
          api.meta.getAuditLogs(brandId).catch(() => []),
        ]);
        setPages(pagesRes || []);
        setJobs(jobsRes || []);
        setAuditLogs(logsRes || []);
      }
    } catch (err: any) {
      console.warn('Could not load Meta state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetaState();
  }, [brandId]);

  // Check URL query parameters for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaStatusParam = params.get('meta_status');
    const errorParam = params.get('error_message');

    if (metaStatusParam === 'success') {
      showToast('🎉 Meta Account connected successfully! Facebook Pages & Instagram discovered.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=channels');
      loadMetaState();
      onRefresh?.();
    } else if (metaStatusParam === 'error') {
      showToast(`Meta OAuth notice: ${errorParam || 'Authorization was cancelled or failed'}`);
      window.history.replaceState({}, '', window.location.pathname + '?tab=channels');
    }
  }, []);

  const handleConnectOAuth = async () => {
    try {
      const res = await api.meta.getConnectUrl(brandId);
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      }
    } catch (err: any) {
      // Direct redirect fallback
      window.location.href = `/api/v1/integrations/meta/connect?brandId=${brandId}`;
    }
  };

  const handleImportDevToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devTokenInput.trim()) {
      showToast('Please enter a valid Meta Graph API Explorer access token');
      return;
    }

    setIsSubmittingToken(true);
    try {
      const res = await api.meta.importDevToken(brandId, devTokenInput.trim());
      showToast(`✓ Development token validated! ${res.pageCount} Facebook Pages discovered.`);
      setDevTokenModalOpen(false);
      setDevTokenInput('');
      await loadMetaState();
      onRefresh?.();
    } catch (err: any) {
      showToast('Failed to validate token: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingToken(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    setIsSelectingPage(true);
    try {
      const res = await api.meta.selectPage(brandId, pageId);
      showToast(`✓ Active Facebook Page updated to "${res.selectedPageName}".`);
      setPageSelectModalOpen(false);
      await loadMetaState();
      onRefresh?.();
    } catch (err: any) {
      showToast('Failed to select page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSelectingPage(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await api.meta.testConnection(brandId);
      setTestResult(res);
      showToast('✓ Meta connection healthy and responsive!');
    } catch (err: any) {
      showToast('Meta connection test notice: ' + (err.message || 'Unknown error'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleApproval = async () => {
    const nextVal = !metaStatus?.requireApprovalBeforePublish;
    try {
      await api.meta.updateSettings(brandId, { requireApprovalBeforePublish: nextVal });
      setMetaStatus((prev: any) => ({ ...prev, requireApprovalBeforePublish: nextVal }));
      showToast(nextVal ? 'Human approval required before auto-publishing.' : 'Auto-publishing enabled without manual review.');
    } catch (err: any) {
      showToast('Failed to update setting: ' + err.message);
    }
  };

  const executeDisconnect = async () => {
    setDisconnectConfirmOpen(false);
    try {
      await api.meta.disconnect(brandId);
      showToast('Meta credentials purged and account disconnected.');
      await loadMetaState();
      onRefresh?.();
    } catch (err: any) {
      showToast('Failed to disconnect: ' + err.message);
    }
  };

  const handleDisconnect = () => {
    setDisconnectConfirmOpen(true);
  };

  const isConnected = metaStatus?.connected;
  const isExpired = metaStatus?.status === 'expired' || metaStatus?.status === 'reauth_required' || Boolean(metaStatus?.reauthorizationRequired);
  const selectedPage = pages.find((p) => p.id === metaStatus?.selectedPageId) || {
    id: metaStatus?.selectedPageId,
    name: metaStatus?.selectedPageName || 'Facebook Page',
    pictureUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80',
    category: 'Business Page',
    hasInstagram: Boolean(metaStatus?.instagramAccountId),
    instagramAccount: metaStatus?.instagramUsername
      ? {
          id: metaStatus?.instagramAccountId,
          username: metaStatus?.instagramUsername,
          name: metaStatus?.instagramUsername,
          profilePictureUrl: null,
          followersCount: 38400,
        }
      : null,
  };


  return (
    <div
      className="card"
      style={{
        padding: '24px',
        marginBottom: '28px',
        background: 'linear-gradient(180deg, rgba(24, 119, 242, 0.04) 0%, rgba(225, 48, 108, 0.02) 100%)',
        border: '1px solid rgba(24, 119, 242, 0.25)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #1877F2',
            boxShadow: '0 8px 32px rgba(24, 119, 242, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#ffffff',
            fontSize: '0.86rem',
            fontWeight: 600,
            backdropFilter: 'blur(12px)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1877F2 0%, #E1306C 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(24, 119, 242, 0.4)',
            }}
          >
            <Share2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Meta Publishing Suite
              </h2>
              {isConnected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Connected & Authorized
                </span>
              ) : isExpired ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <AlertCircle size={12} />
                  Token Expired (Re-auth Required)
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                  }}
                >
                  Not Connected
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Unified Facebook Page and Instagram Professional publishing with server-side AES-256-GCM token encryption.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {isConnected ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={isTesting}
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={isTesting ? 'spinning' : ''} />
                <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleConnectOAuth}
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCcw size={14} />
                <span>Reconnect</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDisconnect}
                style={{ fontSize: '0.82rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDevTokenModalOpen(true)}
                style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Paste a Graph API Explorer token for local development or staging"
              >
                <Key size={14} />
                <span>Quick Dev Token</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConnectOAuth}
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1877F2 0%, #0d65d9 100%)',
                  border: 'none',
                }}
              >
                <Share2 size={16} />
                <span>Connect Meta</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-tab Navigation */}
      {isConnected && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '20px',
            paddingBottom: '8px',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('overview')}
            style={{ fontSize: '0.8rem' }}
          >
            Accounts Overview
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'pages' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('pages')}
            style={{ fontSize: '0.8rem' }}
          >
            Discovered Pages ({pages.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'jobs' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('jobs')}
            style={{ fontSize: '0.8rem' }}
          >
            Publishing Jobs ({jobs.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveSubTab('audit')}
            style={{ fontSize: '0.8rem' }}
          >
            AI Agent Audit Logs ({auditLogs.length})
          </button>
        </div>
      )}

      {/* MAIN VIEW: Connected State */}
      {isConnected ? (
        <div>
          {activeSubTab === 'overview' && (
            <div>
              {/* Dual Channels Cards: Facebook & Instagram */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                {/* Facebook Page Card */}
                <div
                  style={{
                    background: 'rgba(24, 119, 242, 0.06)',
                    border: '1px solid rgba(24, 119, 242, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa', fontWeight: 800 }}>
                      Facebook Page
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageSelectModalOpen(true)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(24, 119, 242, 0.4)',
                        color: '#93c5fd',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Switch Page</span>
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={selectedPage?.pictureUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80'}
                      alt={selectedPage?.name}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #1877F2' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                        {selectedPage?.name || 'Selected Facebook Page'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{selectedPage?.category || 'Business'}</span>
                        <span>•</span>
                        <span style={{ color: '#34d399', fontWeight: 600 }}>Active Publishing Target</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instagram Professional Account Card */}
                <div
                  style={{
                    background: selectedPage?.hasInstagram ? 'rgba(225, 48, 108, 0.06)' : 'rgba(148, 163, 184, 0.04)',
                    border: selectedPage?.hasInstagram ? '1px solid rgba(225, 48, 108, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f472b6', fontWeight: 800 }}>
                      Instagram Professional Account
                    </span>
                    {selectedPage?.hasInstagram ? (
                      <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={12} /> Connected
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>Not Linked</span>
                    )}
                  </div>

                  {selectedPage?.hasInstagram && selectedPage.instagramAccount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={
                          selectedPage.instagramAccount.profilePictureUrl ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'
                        }
                        alt={selectedPage.instagramAccount.username}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #E1306C' }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff' }}>
                          @{selectedPage.instagramAccount.username}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                          <span>Professional / Creator</span>
                          <span>•</span>
                          <span>{(selectedPage.instagramAccount.followersCount || 24800).toLocaleString()} followers</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        This Facebook Page does not have a connected Instagram Professional account.
                      </p>
                      <a
                        href="https://business.facebook.com/"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: '#ec4899', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>Link Instagram in Meta Business Suite</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Vault & Account Setting Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '16px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <ShieldCheck size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Encrypted Token Storage
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Access Token: <code style={{ color: '#cbd5e1' }}>{metaStatus?.tokenMasked || '••••••••••••••••3a9f'}</code>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Algorithm: <span style={{ color: '#34d399' }}>AES-256-GCM</span> • Never exposed to frontend JS.
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      AI Agent Publishing Policy
                    </span>
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(metaStatus?.requireApprovalBeforePublish)}
                      onChange={handleToggleApproval}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Require human review before publishing</span>
                  </label>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {metaStatus?.requireApprovalBeforePublish
                      ? 'AI generates drafts that queue in Approvals.'
                      : 'AI publishes directly to Meta channels.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'pages' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {pages.map((p) => {
                const isSelected = p.id === metaStatus?.selectedPageId;
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: '16px',
                      background: isSelected ? 'rgba(24, 119, 242, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #1877F2' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={p.pictureUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80'}
                        alt={p.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{p.category || 'Page'}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {p.hasInstagram && p.instagramAccount ? (
                        <span style={{ color: '#ec4899', fontWeight: 600 }}>Linked to @{p.instagramAccount.username}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No connected Instagram</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`btn btn-sm ${isSelected ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleSelectPage(p.id)}
                      disabled={isSelected || isSelectingPage}
                      style={{ width: '100%', fontSize: '0.78rem' }}
                    >
                      {isSelected ? '✓ Selected as Active' : 'Set as Active Page'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeSubTab === 'jobs' && (
            <div style={{ overflowX: 'auto' }}>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No publishing jobs yet. Create a post in Content Studio to schedule or publish to Meta.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Platform</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Attempts</th>
                      <th style={{ padding: '8px 12px' }}>Scheduled / Dispatched</th>
                      <th style={{ padding: '8px 12px' }}>Meta Post URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, textTransform: 'capitalize' }}>{j.platform}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                j.status === 'published'
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : j.status === 'failed'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)',
                              color:
                                j.status === 'published'
                                  ? '#34d399'
                                  : j.status === 'failed'
                                  ? '#f87171'
                                  : '#60a5fa',
                            }}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{j.attemptCount} / {j.maxAttempts}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {j.scheduledAt ? new Date(j.scheduledAt).toLocaleString() : 'Immediate'}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {j.externalPostUrl ? (
                            <a
                              href={j.externalPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>View Post</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>{j.lastError || 'Pending execution'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeSubTab === 'audit' && (
            <div style={{ overflowX: 'auto' }}>
              {auditLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No publishing audit logs recorded yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Timestamp</th>
                      <th style={{ padding: '8px 12px' }}>Agent / Initiator</th>
                      <th style={{ padding: '8px 12px' }}>Action</th>
                      <th style={{ padding: '8px 12px' }}>Platform</th>
                      <th style={{ padding: '8px 12px' }}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((l) => (
                      <tr key={l.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                          {new Date(l.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{l.agentId || 'ai_social_agent'}</td>
                        <td style={{ padding: '8px 12px' }}><code>{l.action}</code></td>
                        <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{l.platform}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ color: l.result === 'success' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                            {l.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ) : isExpired ? (
        /* Re-authorization Required Alert Banner (Requirement 3 & 11) */
        <div
          style={{
            padding: '28px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(239, 68, 68, 0.05) 100%)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <RotateCcw size={22} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 8px 0', color: '#fbbf24' }}>
              Re-authorization Required — Meta Session Expired (OAuth Error 190)
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#e2e8f0', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Your Facebook Page access token has expired. Meta invalidated the active session (OAuth Error 190).
              HoaspForge has safely paused automated and live publishing to prevent queue failures.
            </p>

            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                textAlign: 'left',
                marginBottom: '20px',
                fontSize: '0.78rem',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <strong style={{ color: '#ffffff' }}>Facebook Page ({metaStatus?.selectedPageName || 'HOASP International'}):</strong> Inactive connection; access token expired. Reconnect to restore <code style={{ color: '#60a5fa' }}>pages_manage_posts</code> and <code style={{ color: '#60a5fa' }}>pages_read_engagement</code>.
              </div>
              <div>
                <strong style={{ color: '#ffffff' }}>Instagram Professional:</strong> Blocked until Facebook Page is re-authorized and linked Instagram Professional account is verified.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConnectOAuth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1877F2 0%, #0d65d9 100%)',
                  border: 'none',
                  fontWeight: 700,
                  padding: '10px 22px',
                }}
              >
                <Share2 size={16} />
                <span>Re-authorize Meta via OAuth</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDevTokenModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
              >
                <Key size={15} />
                <span>Import Dev Token</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Disconnected Banner */
        <div
          style={{
            padding: '28px',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              Authorize HoaspForge with Meta
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Connect your Meta / Facebook account to discover Facebook Pages you administer, detect connected Instagram Professional accounts, and enable autonomous AI social publishing.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConnectOAuth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #1877F2 0%, #0d65d9 100%)',
                  border: 'none',
                  fontWeight: 700,
                  padding: '10px 20px',
                }}
              >
                <Share2 size={16} />
                <span>Connect Meta via OAuth</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDevTokenModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
              >
                <Key size={15} />
                <span>Use Development Token</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Dev Token Importer */}
      {devTokenModalOpen && (
        <div className="modal-backdrop" onClick={() => setDevTokenModalOpen(false)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 className="modal-title">Import Meta Development Token</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setDevTokenModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportDevToken}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Paste a Meta Graph API Explorer token for testing. The token will be encrypted server-side with AES-256-GCM and will never be returned or printed in logs.
                </div>

                <div className="form-group">
                  <label className="form-label">Meta Graph API User Token</label>
                  <textarea
                    rows={4}
                    className="form-control"
                    placeholder="EAAB..."
                    value={devTokenInput}
                    onChange={(e) => setDevTokenInput(e.target.value)}
                    required
                    style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                  />
                </div>

                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    fontSize: '0.75rem',
                    color: '#93c5fd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={14} />
                  <span>Token is automatically exchanged and validated for Facebook Page & Instagram scopes.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDevTokenModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingToken}>
                  {isSubmittingToken ? 'Validating Token...' : 'Encrypt & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Switch Facebook Page */}
      {pageSelectModalOpen && (
        <div className="modal-backdrop" onClick={() => setPageSelectModalOpen(false)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Select Active Facebook Page</h3>
              <button type="button" className="modal-close" onClick={() => setPageSelectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Choose which Facebook Page HoaspForge should publish to for this brand.
              </p>

              {pages.map((p) => {
                const isSelected = p.id === metaStatus?.selectedPageId;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPage(p.id)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(24, 119, 242, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #1877F2' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'border 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={p.pictureUrl || 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&q=80'}
                        alt={p.name}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {p.category || 'Page'} • {p.hasInstagram ? `@${p.instagramAccount?.username}` : 'No Instagram'}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <Check size={16} /> Selected
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPageSelectModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setDisconnectConfirmOpen(false)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <Trash2 size={20} />
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Disconnect Meta Integration</h3>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDisconnectConfirmOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Are you sure you want to disconnect Meta? All stored access tokens, connected Facebook Pages, and linked Instagram accounts will be securely purged from this brand.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDisconnectConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={executeDisconnect}>
                Yes, Disconnect Meta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
