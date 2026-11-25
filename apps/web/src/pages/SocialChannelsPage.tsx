import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Zap,
  ExternalLink,
  Trash2,
  Activity,
  Key,
  Globe,
  Radio,
  Clock,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  X,
  Settings,
  AlertTriangle,
  ArrowRight,
  Check,
  Info,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { MetaIntegrationCard } from '../components/MetaIntegrationCard.js';

export interface SocialAccountUI {
  id: string;
  brandId: string;
  platform: string;
  accountName: string;
  accountId: string;
  tokenExpiresAt?: string | null;
  isActive: boolean;
  tokenMasked?: string;
  status: 'connected' | 'reauth_required' | 'permission_required' | 'disconnected' | 'sandbox';
  statusLabel: string;
  statusMessage?: string | null;
  lastVerifiedAt?: string;
  pendingJobsCount?: number;
  historyCount?: number;
  scopes?: string[];
  metadata: {
    handle?: string;
    avatarUrl?: string;
    followerCount?: number;
    isSandbox?: boolean;
    profileUrl?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PublishLogUI {
  id: string;
  postVariantId: string;
  attemptNumber: number;
  status: string;
  httpStatus?: number | null;
  responsePayload: Record<string, any>;
  errorMessage?: string | null;
  createdAt: string;
  platform?: string;
  postTitle?: string;
  remotePostUrl?: string | null;
}

const PLATFORM_CONFIGS: Record<
  string,
  {
    name: string;
    brandColor: string;
    bgGradient: string;
    iconChar: string;
    category: string;
    requiredPermissions: string[];
    description: string;
  }
> = {
  meta: {
    name: 'Meta (Facebook & Instagram)',
    brandColor: '#1877F2',
    bgGradient: 'linear-gradient(135deg, rgba(24, 119, 242, 0.25) 0%, rgba(225, 48, 108, 0.25) 100%)',
    iconChar: '♾️',
    category: 'Pages & Professional',
    requiredPermissions: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish',
    ],
    description:
      'Publish feed posts, reels, photos, and stories to Facebook Pages and linked Instagram Professional accounts.',
  },
  facebook: {
    name: 'Facebook Pages',
    brandColor: '#1877F2',
    bgGradient: 'linear-gradient(135deg, rgba(24, 119, 242, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
    iconChar: '📘',
    category: 'Pages',
    requiredPermissions: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    description: 'Publish updates, photos, and engagement posts directly to your official Facebook Pages.',
  },
  instagram: {
    name: 'Instagram Business / Creator',
    brandColor: '#E1306C',
    bgGradient: 'linear-gradient(135deg, rgba(225, 48, 108, 0.2) 0%, rgba(131, 58, 180, 0.2) 100%)',
    iconChar: '📸',
    category: 'Professional',
    requiredPermissions: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
    description: 'Publish single photos, carousels, and Reels to your verified Instagram Professional account.',
  },
  x_twitter: {
    name: 'X (Twitter)',
    brandColor: '#1DA1F2',
    bgGradient: 'linear-gradient(135deg, rgba(29, 161, 242, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
    iconChar: '𝕏',
    category: 'Microblogging',
    requiredPermissions: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    description: 'Publish tweets, threads, and media directly to your X brand account via OAuth 2.0 PKCE.',
  },
  linkedin: {
    name: 'LinkedIn Company & Profile',
    brandColor: '#0A66C2',
    bgGradient: 'linear-gradient(135deg, rgba(10, 102, 194, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
    iconChar: '💼',
    category: 'Professional Network',
    requiredPermissions: ['r_liteprofile', 'w_member_social', 'w_organization_social'],
    description: 'Distribute corporate news, articles, and thought-leadership updates to LinkedIn followers.',
  },
  tiktok: {
    name: 'TikTok For Business',
    brandColor: '#FE2C55',
    bgGradient: 'linear-gradient(135deg, rgba(254, 44, 85, 0.2) 0%, rgba(37, 244, 238, 0.15) 100%)',
    iconChar: '🎵',
    category: 'Short Video',
    requiredPermissions: ['video.upload', 'video.publish', 'user.info.basic'],
    description: 'Upload and schedule viral short-form video content to TikTok Creator & Business accounts.',
  },
  youtube_shorts: {
    name: 'YouTube Shorts',
    brandColor: '#FF0000',
    bgGradient: 'linear-gradient(135deg, rgba(255, 0, 0, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
    iconChar: '▶️',
    category: 'Video',
    requiredPermissions: ['https://www.googleapis.com/auth/youtube.upload'],
    description: 'Publish high-engagement vertical short video assets directly to your YouTube channel.',
  },
};

export const SocialChannelsPage: React.FC = () => {
  const { activeBrand } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccountUI[]>([]);
  const [logs, setLogs] = useState<PublishLogUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePlatformFilter, setActivePlatformFilter] = useState<string>('all');

  // Modal States
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProviderToConnect, setSelectedProviderToConnect] = useState<string>('meta');
  const [connectMode, setConnectMode] = useState<'oauth' | 'sandbox'>('oauth');
  const [manageAccount, setManageAccount] = useState<SocialAccountUI | null>(null);
  const [accountToDisconnect, setAccountToDisconnect] = useState<SocialAccountUI | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [healthTestingId, setHealthTestingId] = useState<string | null>(null);
  const [healthResult, setHealthResult] = useState<any | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Meta Discovered Pages Modal State (after OAuth redirect)
  const [discoveredPagesModalOpen, setDiscoveredPagesModalOpen] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [selectedDiscoveredPageId, setSelectedDiscoveredPageId] = useState<string>('');
  const [isSelectingPage, setIsSelectingPage] = useState(false);

  useEffect(() => {
    const isAnyModalOpen = Boolean(discoveredPagesModalOpen || connectModalOpen || manageAccount || accountToDisconnect);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [discoveredPagesModalOpen, connectModalOpen, manageAccount, accountToDisconnect]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const [accs, publishLogs] = await Promise.all([
        api.socialAccounts.list(activeBrand.id),
        api.socialAccounts.getLogs(activeBrand.id),
      ]);
      setAccounts(accs || []);
      setLogs(publishLogs || []);
    } catch (err: any) {
      console.error('Failed to load social accounts or logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check if returning from Meta OAuth discovery callback
    const searchParams = new URLSearchParams(window.location.search);
    const metaStatus = searchParams.get('meta_status');
    if (metaStatus === 'discovered' && activeBrand?.id) {
      api.meta.getPages(activeBrand.id).then((pages) => {
        if (pages && pages.length > 0) {
          setDiscoveredPages(pages);
          setSelectedDiscoveredPageId(pages[0].id);
          setDiscoveredPagesModalOpen(true);
        }
      }).catch((e) => console.error('Error fetching discovered pages:', e));
    }
  }, [activeBrand]);

  const handleSeedSandbox = async () => {
    if (!activeBrand) return;
    setIsSeeding(true);
    try {
      const res = await api.socialAccounts.seedSandbox(activeBrand.id);
      showToast(res.message || '⚡ 4 Sandbox Channels Connected Successfully!');
      await loadData();
    } catch (err: any) {
      showToast('❌ Error seeding sandbox: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleInitiateOAuth = async (provider: string) => {
    if (!activeBrand) return;
    setIsReconnecting(true);
    try {
      if (['meta', 'facebook', 'instagram'].includes(provider.toLowerCase())) {
        const res = await api.meta.reconnect(activeBrand.id);
        if (res.authorizationUrl) {
          window.location.href = res.authorizationUrl;
          return;
        }
      }

      // Generic OAuth fallback or sandbox
      showToast(`Redirecting to official ${provider.toUpperCase()} OAuth dialog...`);
      setConnectModalOpen(false);
    } catch (err: any) {
      showToast('❌ Failed to initiate OAuth: ' + (err.message || 'Unknown error'));
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleTestConnection = async (accountId: string) => {
    if (!activeBrand) return;
    setHealthTestingId(accountId);
    try {
      const res = await api.socialAccounts.test(activeBrand.id, accountId);
      setHealthResult(res.data);
      showToast('✓ Token Validated & Health Check Passed!');
      await loadData();
    } catch (err: any) {
      showToast('❌ Health check failed: ' + (err.message || 'Unknown error'));
    } finally {
      setHealthTestingId(null);
    }
  };

  const handleReconnect = async (acc: SocialAccountUI) => {
    if (!activeBrand) return;
    setIsReconnecting(true);
    try {
      if (['facebook', 'instagram'].includes(acc.platform.toLowerCase())) {
        const res = await api.meta.reconnect(activeBrand.id);
        if (res.authorizationUrl) {
          window.location.href = res.authorizationUrl;
          return;
        }
      }

      const res = await api.socialAccounts.reconnect(activeBrand.id, acc.id);
      if (res.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        showToast(res.message || 'Reconnect flow initiated.');
      }
    } catch (err: any) {
      showToast('❌ Reconnect failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsReconnecting(false);
    }
  };

  const executeDisconnect = async () => {
    if (!activeBrand || !accountToDisconnect) return;
    const acc = accountToDisconnect;
    setIsDisconnecting(true);
    try {
      const res = await api.socialAccounts.disconnect(activeBrand.id, acc.id);
      showToast(
        `Account "${acc.accountName}" disconnected. ${res.cancelledJobsCount ? `${res.cancelledJobsCount} pending publishing jobs cancelled.` : 'Post history preserved.'}`
      );
      setAccountToDisconnect(null);
      setManageAccount(null);
      await loadData();
    } catch (err: any) {
      showToast('❌ Failed to disconnect: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConfirmSelectPage = async () => {
    if (!activeBrand || !selectedDiscoveredPageId) return;
    setIsSelectingPage(true);
    try {
      const res = await api.meta.selectPage(activeBrand.id, selectedDiscoveredPageId);
      showToast(`✓ Linked Facebook Page "${res.selectedPageName}" and verified permissions!`);
      setDiscoveredPagesModalOpen(false);
      // Clean query params
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      await loadData();
    } catch (err: any) {
      showToast('❌ Error linking Page: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSelectingPage(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (activePlatformFilter === 'all') return true;
    if (activePlatformFilter === 'meta') {
      return acc.platform === 'facebook' || acc.platform === 'instagram';
    }
    return acc.platform === activePlatformFilter;
  });

  const successLogsCount = logs.filter((l) => l.status === 'success' || l.status === 'published').length;
  const successRate = logs.length > 0 ? Math.round((successLogsCount / logs.length) * 100) : 100;

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--accent-primary)',
            boxShadow: '0 8px 32px rgba(139, 92, 246, 0.35)',
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

      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.25) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Share2 size={20} />
              </div>
              <h1 className="page-title" style={{ margin: 0 }}>
                Social Channels &amp; Integrations
              </h1>
            </div>
            <p className="page-subtitle" style={{ margin: 0 }}>
              Connect, manage, and verify official social networks with AES-256-GCM encrypted token storage and isolated sandbox environments.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSeedSandbox}
              disabled={isSeeding}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.25) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontWeight: 700,
              }}
              title="Instantly seed 4 realistic sandbox channels (Instagram, X, LinkedIn, TikTok)"
            >
              <Zap size={15} />
              <span>{isSeeding ? 'Seeding...' : '⚡ Seed Sandbox Channels'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedProviderToConnect('meta');
                setConnectMode('oauth');
                setConnectModalOpen(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>Connect Channel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics & Security Guarantee Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Channels</span>
            <Globe size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{accounts.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {accounts.filter((a) => a.status === 'sandbox').length} Sandbox • {accounts.filter((a) => a.status !== 'sandbox').length} Live Channels
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Vault Security</span>
            <ShieldCheck size={16} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={16} />
            <span>AES-256-GCM</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Encrypted tokens; zero plain passwords stored
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Publishing Reliability</span>
            <Activity size={16} style={{ color: '#ec4899' }} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{successRate}%</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {successLogsCount} / {logs.length} dispatches recorded
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sandbox Isolation</span>
            <Radio size={16} style={{ color: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>Explicit Sandbox</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Zero false live publishing guarantee
          </div>
        </div>
      </div>

      {/* Meta Official Integration Card */}
      {activeBrand && (
        <MetaIntegrationCard
          brandId={activeBrand.id}
          brandName={activeBrand.name}
          onRefresh={loadData}
        />
      )}

      {/* Channel Platform Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'all', label: `All Channels (${accounts.length})` },
          { id: 'meta', label: `Meta / FB & IG (${accounts.filter((a) => a.platform === 'facebook' || a.platform === 'instagram').length})` },
          { id: 'x_twitter', label: `X (Twitter) (${accounts.filter((a) => a.platform === 'x_twitter').length})` },
          { id: 'linkedin', label: `LinkedIn (${accounts.filter((a) => a.platform === 'linkedin').length})` },
          { id: 'tiktok', label: `TikTok (${accounts.filter((a) => a.platform === 'tiktok').length})` },
          { id: 'youtube_shorts', label: `YouTube Shorts (${accounts.filter((a) => a.platform === 'youtube_shorts').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`btn btn-sm ${activePlatformFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActivePlatformFilter(tab.id)}
            style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', fontWeight: activePlatformFilter === tab.id ? 700 : 500 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connected Channels Grid */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Connected Channel Accounts</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing {filteredAccounts.length} of {accounts.length} configured publishing endpoints
          </span>
        </div>

        {loading ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--accent-primary)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading connected channels...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.01)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(139, 92, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--accent-primary)',
              }}
            >
              <Share2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Channels Match Filter</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.85rem' }}>
              Connect a new channel for this platform or use Mock Sandbox Mode to safely test multi-platform publishing.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedProviderToConnect('meta');
                setConnectModalOpen(true);
              }}
              style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Connect Channel</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
              gap: '16px',
            }}
          >
            {filteredAccounts.map((acc) => {
              const cfg = PLATFORM_CONFIGS[acc.platform] || {
                name: acc.platform.toUpperCase(),
                brandColor: 'var(--accent-primary)',
                bgGradient: 'rgba(255, 255, 255, 0.03)',
                iconChar: '🌐',
                category: 'Social',
                requiredPermissions: [],
                description: '',
              };

              const isReauth = acc.status === 'reauth_required';
              const isSandbox = acc.status === 'sandbox';

              return (
                <div
                  key={acc.id}
                  className="card"
                  style={{
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: isReauth
                      ? '1px solid rgba(245, 158, 11, 0.5)'
                      : isSandbox
                        ? '1px solid rgba(56, 189, 248, 0.35)'
                        : '1px solid var(--border-subtle)',
                    background: isReauth ? 'rgba(245, 158, 11, 0.02)' : 'rgba(255, 255, 255, 0.02)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {/* Top Ambient Glow Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: isReauth ? '#f59e0b' : cfg.brandColor,
                    }}
                  />

                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>{cfg.iconChar}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{cfg.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {acc.status === 'sandbox' ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                          }}
                        >
                          ⚡ SANDBOX
                        </span>
                      ) : acc.status === 'reauth_required' ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(245, 158, 11, 0.18)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.45)',
                          }}
                        >
                          ⚠️ RECONNECT REQUIRED
                        </span>
                      ) : acc.status === 'permission_required' ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                          }}
                        >
                          PERMISSIONS MISSING
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          ✓ CONNECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Account Profile Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <img
                      src={acc.metadata?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'}
                      alt={acc.accountName}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: `2px solid ${cfg.brandColor}`,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {acc.accountName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {acc.metadata?.handle || `@${acc.accountName.toLowerCase().replace(/\s+/g, '_')}`}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ID: <code style={{ fontSize: '0.7rem' }}>{acc.accountId}</code>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis Alert if Re-auth is required */}
                  {isReauth && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        marginBottom: '12px',
                        fontSize: '0.75rem',
                        color: '#fbbf24',
                        lineHeight: 1.4,
                      }}
                    >
                      {acc.statusMessage || 'Meta OAuth Error 190: token session expired. Re-authorize to publish live.'}
                    </div>
                  )}

                  {/* Token & Verification Metadata Bar */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '16px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)' }}>Verified:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {acc.lastVerifiedAt ? new Date(acc.lastVerifiedAt).toLocaleDateString() : 'Active'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={12} style={{ color: '#10b981' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {acc.tokenMasked || '••••••••'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {isReauth ? (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => handleReconnect(acc)}
                        disabled={isReconnecting}
                        style={{
                          flex: 1,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 700,
                        }}
                      >
                        <RefreshCw size={13} className={isReconnecting ? 'animate-spin' : ''} />
                        <span>Reconnect</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTestConnection(acc.id)}
                        disabled={healthTestingId === acc.id}
                        style={{
                          flex: 1,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Activity size={13} className={healthTestingId === acc.id ? 'spin' : ''} />
                        <span>{healthTestingId === acc.id ? 'Testing...' : 'Test Health'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setManageAccount(acc)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontWeight: 600,
                      }}
                      title="Manage account details, permissions, and history"
                    >
                      <Settings size={13} />
                      <span>Manage</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setAccountToDisconnect(acc)}
                      style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '6px 10px' }}
                      title="Disconnect Account & Purge Tokens"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discovered Pages Modal (After Meta OAuth Discovery) */}
      {discoveredPagesModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setDiscoveredPagesModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              border: '1px solid var(--accent-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>📘</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Select Facebook Page</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Meta returned {discoveredPages.length} authorized Page(s) for your account.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDiscoveredPagesModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select the Facebook Page you want to publish from. If an Instagram Professional account is linked to the Page, HoaspForge will automatically enable Instagram publishing.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', maxHeight: '280px', overflowY: 'auto' }}>
              {discoveredPages.map((page) => {
                const pageId = page.pageId || page.id;
                const isSelected = selectedDiscoveredPageId === pageId;
                const hasIg = Boolean(page.instagramBusinessAccount || page.instagram_business_account_id);

                return (
                  <div
                    key={pageId}
                    onClick={() => setSelectedDiscoveredPageId(pageId)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {page.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Page ID: <code>{pageId}</code> {page.category ? `• ${page.category}` : ''}
                      </div>
                      <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                        {hasIg ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Linked Instagram Professional Account</span>
                        ) : (
                          <span style={{ color: '#fbbf24' }}>ℹ️ No Instagram linked (Facebook Page publishing only)</span>
                        )}
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="discoveredPage"
                      checked={isSelected}
                      onChange={() => setSelectedDiscoveredPageId(pageId)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDiscoveredPagesModalOpen(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSelectPage}
                disabled={isSelectingPage || !selectedDiscoveredPageId}
                style={{ flex: 1, fontWeight: 700 }}
              >
                {isSelectingPage ? 'Verifying & Saving...' : 'Confirm & Connect Page'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Connect Channel Modal (Requirement 2 & 3) */}
      {connectModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setConnectModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Connect Social Channel</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setConnectModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select a provider to connect using its official OAuth flow. HoaspForge never asks for or stores your social media passwords.
            </p>

            {/* Provider Grid Selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                marginBottom: '20px',
              }}
            >
              {[
                { id: 'meta', name: 'Meta', icon: '♾️', sub: 'FB & Instagram' },
                { id: 'x_twitter', name: 'X', icon: '𝕏', sub: 'Twitter Feed' },
                { id: 'linkedin', name: 'LinkedIn', icon: '💼', sub: 'Company & Profile' },
                { id: 'tiktok', name: 'TikTok', icon: '🎵', sub: 'Short Video' },
                { id: 'youtube_shorts', name: 'YouTube', icon: '▶️', sub: 'Shorts' },
                { id: 'sandbox', name: 'Mock Sandbox', icon: '⚡', sub: 'Developer Test' },
              ].map((p) => {
                const isSelected = selectedProviderToConnect === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProviderToConnect(p.id);
                      setConnectMode(p.id === 'sandbox' ? 'sandbox' : 'oauth');
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{p.icon}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{p.sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Provider Details & Permission Explanation Card */}
            {selectedProviderToConnect !== 'sandbox' ? (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Official OAuth 2.0 Integration
                  </span>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {PLATFORM_CONFIGS[selectedProviderToConnect]?.description ||
                    'Authorizes HoaspForge to publish updates and fetch performance metrics on your behalf.'}
                </p>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                  REQUESTED PERMISSION SCOPES:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {(PLATFORM_CONFIGS[selectedProviderToConnect]?.requiredPermissions || ['content.publish']).map((sc) => (
                    <span
                      key={sc}
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 6px',
                        background: 'rgba(139, 92, 246, 0.12)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '4px',
                        color: '#c4b5fd',
                      }}
                    >
                      {sc}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    fontSize: '0.74rem',
                    color: '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Lock size={12} />
                  <span>Passwords are never shared with HoaspForge. Tokens stored with AES-256-GCM.</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Zap size={16} style={{ color: '#38bdf8' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>
                    Mock Sandbox Simulator
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Provisions simulated social channels without requiring live external platform credentials. Generates realistic latency and organic metrics curves. Simulated posts are explicitly labeled as Sandbox.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConnectModalOpen(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>

              {selectedProviderToConnect !== 'sandbox' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleInitiateOAuth(selectedProviderToConnect)}
                  disabled={isReconnecting}
                  style={{ flex: 1.4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <ExternalLink size={15} />
                  <span>
                    {isReconnecting ? 'Opening OAuth...' : `Continue with ${PLATFORM_CONFIGS[selectedProviderToConnect]?.name.split(' ')[0] || 'Platform'}`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    setConnectModalOpen(false);
                    await handleSeedSandbox();
                  }}
                  disabled={isSeeding}
                  style={{ flex: 1.4, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Zap size={15} />
                  <span>{isSeeding ? 'Provisioning...' : 'Provision Sandbox Channels'}</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manage Account Modal (Requirement 5) */}
      {manageAccount && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setManageAccount(null)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: '26px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.4rem' }}>{PLATFORM_CONFIGS[manageAccount.platform]?.iconChar || '🌐'}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>{manageAccount.accountName}</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {manageAccount.metadata?.handle || `@${manageAccount.accountName.toLowerCase().replace(/\s+/g, '_')}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setManageAccount(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Health / Status Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONNECTION STATUS</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: manageAccount.isActive ? '#10b981' : '#f59e0b', marginTop: '2px' }}>
                  {manageAccount.statusLabel}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ENCRYPTION VAULT</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', marginTop: '2px' }}>
                  AES-256-GCM
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PENDING DISPATCHES</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {manageAccount.pendingJobsCount || 0} queued jobs
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PUBLISHED POSTS</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {manageAccount.historyCount || 0} lifetime posts
                </div>
              </div>
            </div>

            {/* Scopes Badges */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                GRANTED PERMISSIONS:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(manageAccount.scopes || ['content.publish']).map((sc) => (
                  <span
                    key={sc}
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      padding: '3px 8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {sc}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setAccountToDisconnect(manageAccount);
                }}
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={14} />
                <span>Disconnect</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTestConnection(manageAccount.id)}
                  disabled={healthTestingId === manageAccount.id}
                >
                  <Activity size={13} className={healthTestingId === manageAccount.id ? 'spin' : ''} />
                  <span>{healthTestingId === manageAccount.id ? 'Testing...' : 'Test Health'}</span>
                </button>

                {manageAccount.status === 'reauth_required' && (
                  <button
                    type="button"
                    className="btn btn-warning btn-sm"
                    onClick={() => handleReconnect(manageAccount)}
                    disabled={isReconnecting}
                  >
                    <RefreshCw size={13} className={isReconnecting ? 'animate-spin' : ''} />
                    <span>Reconnect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Disconnect Channel Confirmation Modal (Requirement 5) */}
      {accountToDisconnect && createPortal(
        <div className="modal-backdrop" onClick={() => setAccountToDisconnect(null)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                <Trash2 size={20} />
                <h3 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Disconnect Channel Account</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setAccountToDisconnect(null)} aria-label="Close modal">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                Are you sure you want to disconnect <strong style={{ color: 'var(--text-primary)' }}>"{accountToDisconnect.accountName}"</strong> ({accountToDisconnect.platform})?
              </p>

              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>What happens upon disconnect:</div>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>All stored access tokens and credentials are securely purged from the vault.</li>
                  <li>Any scheduled or pending publishing jobs will be safely cancelled.</li>
                  <li>Existing published posts and historical telemetry will remain permanently preserved.</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAccountToDisconnect(null)} disabled={isDisconnecting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={executeDisconnect} disabled={isDisconnecting}>
                {isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect Account'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Real-Time Publishing Audit Logs Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Publishing Telemetry &amp; Audit Logs</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              Live audit trail recorded in MySQL publish_logs with HTTP status codes and responses.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}
          >
            <RefreshCw size={13} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No publishing logs recorded yet. Publish a post from Content Studio to see live audit logs.
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Platform</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>HTTP Code</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 15).map((log) => {
                  const isSuccess = log.status === 'success' || log.status === 'published';
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', background: 'transparent' }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isSuccess ? '#34d399' : '#f87171',
                            border: isSuccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                        >
                          {isSuccess ? 'PUBLISHED' : 'FAILED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                        {log.platform || 'Social'}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                        {log.httpStatus || 200}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.errorMessage || 'Dispatched successfully'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
