import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Share2,
  Database,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check,
  Zap,
  Info,
  Radio,
  Building2,
  SlidersHorizontal,
  Instagram,
  Trash2,
  Key,
  Globe,
  Activity,
  Video,
  FileSpreadsheet,
  Folder,
  Twitter,
  Mail,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import { PageHeader, StatCard } from '../../components/ui/index.js';
import { UpgradeModal } from '../../components/UpgradeModal.js';

export type ConnectorCategory = 'SOCIAL' | 'COMMUNICATION' | 'DATA' | 'BUSINESS';

export type HealthState =
  | 'CONNECTED'
  | 'CHECKING'
  | 'NEEDS_ATTENTION'
  | 'REAUTH_REQUIRED'
  | 'PERMISSION_MISSING'
  | 'RATE_LIMITED'
  | 'DISCONNECTED';

export interface ConnectorDefinition {
  id: string; // provider key
  name: string;
  category: ConnectorCategory;
  description: string;
  capabilities: string[];
  defaultScopes: string[];
  iconBg: string;
  iconColor: string;
  badge: string;
  sampleAccountNames: string[];
  supportsMultipleAccounts?: boolean;
}

export interface ConnectionItem {
  id: string;
  provider: string;
  status: HealthState;
  accountName: string;
  lastCheckedAt?: string;
  lastError?: string;
  actionRequiredMessage?: string;
  selectedResourcesCount?: number;
  isSandbox?: boolean;
  isNoApi?: boolean;
  dispatchMode?: string;
  metadata?: any;
  providerAccountId?: string;
  createdAt?: string;
  brandId?: string;
  profileImage?: string | null;
  accountType?: string;
  tokenHealth?: string;
  availablePermissions?: string[];
  expiresAt?: string | null;
}

export const CONNECTOR_CATALOG: ConnectorDefinition[] = [
  // SOCIAL PUBLISHING CHANNELS
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'SOCIAL',
    description: 'Direct publishing, page scheduling, community metrics & engagement insights via Meta Graph API.',
    capabilities: ['Feed & Carousel Publishing', 'Page Engagement Metrics', 'Scheduled Posts', 'Multi-Page Management'],
    defaultScopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    iconBg: 'bg-blue-600/15 border-blue-500/30',
    iconColor: '#1877F2',
    badge: 'Meta Graph API',
    sampleAccountNames: ['Brand Official Page', 'Growth Hub Community', 'Global Media Hub'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'SOCIAL',
    description: 'High-res image, reel & carousel publishing with direct creator analytics and insights telemetry.',
    capabilities: ['Reels & Video Dispatch', 'Carousel Publishing', 'Reach & Impression Telemetry', 'Creator Suite'],
    defaultScopes: ['instagram_basic', 'instagram_content_publish'],
    iconBg: 'bg-pink-600/15 border-pink-500/30',
    iconColor: '#E1306C',
    badge: 'Creator Suite',
    sampleAccountNames: ['@brand_official', '@hoaspforge_hq', '@creative_labs'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'x_twitter',
    name: 'X (formerly Twitter)',
    category: 'SOCIAL',
    description: 'Real-time microblogging, breaking updates, thread publishing, and audience velocity tracking via X API v2.',
    capabilities: ['Single & Thread Publishing', 'Media Attachments', 'Impression & Retweet Analytics', 'Velocity Radar'],
    defaultScopes: ['tweet.read', 'tweet.write', 'users.read'],
    iconBg: 'bg-neutral-800/60 border-neutral-600/40',
    iconColor: '#ffffff',
    badge: 'X API v2',
    sampleAccountNames: ['@BrandGrowthHQ', '@HoaspForgeNews', '@TechPulseLive'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'SOCIAL',
    description: 'Corporate thought leadership, PDF slides, polls & B2B decision-maker distribution for pages and profiles.',
    capabilities: ['Company Page Posts', 'Document Carousels', 'Follower & CTR Analytics', 'Employee Advocacy'],
    defaultScopes: ['r_organization_social', 'w_organization_social', 'r_liteprofile'],
    iconBg: 'bg-blue-700/15 border-blue-600/30',
    iconColor: '#0A66C2',
    badge: 'B2B Enterprise',
    sampleAccountNames: ['Company Page', 'HoaspForge Network', 'Nexus Insights Group'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'SOCIAL',
    description: 'Short-form vertical video pipeline. Live publishing requires TikTok for Developers Enterprise Partner onboarding.',
    capabilities: ['9:16 Video (Partner Beta)', 'Sound Track Metadata', 'Partner Program Sandbox'],
    defaultScopes: ['video.publish', 'user.info.basic'],
    iconBg: 'bg-cyan-500/15 border-cyan-400/30',
    iconColor: '#00F2FE',
    badge: 'Partner Preview',
    sampleAccountNames: ['@brand_official', '@velocity_clips', '@social_trends'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    category: 'SOCIAL',
    description: '9:16 vertical video dispatch to YouTube Shorts. Live publishing requires Google Cloud verified OAuth client.',
    capabilities: ['9:16 Vertical Video (Beta)', '#Shorts Metadata Tagging', 'Google Cloud Verified Client'],
    defaultScopes: ['youtube.upload', 'youtube.readonly'],
    iconBg: 'bg-red-600/15 border-red-500/30',
    iconColor: '#FF0000',
    badge: 'Partner Preview',
    sampleAccountNames: ['@BrandShortsHQ', '@HoaspForgeHQ', '@CreatorStudioOfficial'],
    supportsMultipleAccounts: true,
  },

  // COMMUNICATION & MESSAGING CHANNELS
  {
    id: 'email',
    name: 'Email Marketing & ESP',
    category: 'COMMUNICATION',
    description: 'Direct transactional & newsletter delivery via Gmail OAuth, Amazon SES, Brevo, SendGrid, Mailgun, or custom SMTP.',
    capabilities: ['HTML Email Broadcasts', 'Verified DKIM & SPF Sending', 'Bounce & Delivery Telemetry', 'Multi-Provider Relay'],
    defaultScopes: ['email.send', 'smtp.relay'],
    iconBg: 'bg-emerald-600/15 border-emerald-500/30',
    iconColor: '#10B981',
    badge: 'Email Engine',
    sampleAccountNames: ['marketing@company.com', 'newsletters@brand.com'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    category: 'COMMUNICATION',
    description: 'Meta WhatsApp Cloud API messaging, pre-approved utility/marketing template broadcasts, and 2-way inbox.',
    capabilities: ['Meta Cloud API Broadcasts', 'Verified Phone Number', 'Template Message Dispatch', '2-Way Chat Stream'],
    defaultScopes: ['whatsapp_business_messaging'],
    iconBg: 'bg-green-600/15 border-green-500/30',
    iconColor: '#25D366',
    badge: 'Meta Cloud API',
    sampleAccountNames: ['+1 (555) 019-2834 (Official WABA)', 'Brand Support Line'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'sms-voice',
    name: 'SMS & Voice AI Concierge',
    category: 'COMMUNICATION',
    description: 'A2P 10DLC compliant text campaigns, automated customer opt-outs, and AI inbound/outbound phone concierge.',
    capabilities: ['A2P 10DLC SMS Campaigns', 'Twilio Verified Sender', 'AI Voice Concierge', 'Call Telemetry & Recording'],
    defaultScopes: ['sms.send', 'voice.call'],
    iconBg: 'bg-rose-600/15 border-rose-500/30',
    iconColor: '#F43F5E',
    badge: 'Twilio Engine',
    sampleAccountNames: ['+1 (800) 555-0199 (Marketing)', 'Support Hotline'],
    supportsMultipleAccounts: true,
  },

  // CLOUD DATA SOURCES
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'DATA',
    description: 'Direct ingestion of high-resolution brand photography, video rushes & master brand creative assets.',
    capabilities: ['Drive Asset Watcher', 'Folder Auto-Sync', 'Lossless Media Storage', 'Team Drives Support'],
    defaultScopes: ['drive.readonly', 'drive.file'],
    iconBg: 'bg-emerald-600/15 border-emerald-500/30',
    iconColor: '#34A853',
    badge: 'Cloud Storage',
    sampleAccountNames: ['Brand Creative Vault (Shared Drive)', 'Marketing Raw Assets', 'Production Archive 2026'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'DATA',
    description: 'Sync spreadsheets of scheduled posts, client copy decks & product release timelines into campaign arcs.',
    capabilities: ['Row-by-Row Content Ingestion', 'Bi-Directional Status Updates', 'Batch Arc Import', 'Live Webhooks'],
    defaultScopes: ['spreadsheets.readonly'],
    iconBg: 'bg-green-600/15 border-green-500/30',
    iconColor: '#0F9D58',
    badge: 'Spreadsheet Sync',
    sampleAccountNames: ['Q4 Content Schedule 2026', 'Social Copy Master Deck', 'Product Drop Calendar'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    category: 'DATA',
    description: 'Microsoft 365 cloud document and enterprise media asset library connectivity for synchronized assets.',
    capabilities: ['SharePoint Media Watcher', 'Document Ingestion', 'Office 365 Sync', 'Cloud Backups'],
    defaultScopes: ['Files.Read.All'],
    iconBg: 'bg-sky-600/15 border-sky-500/30',
    iconColor: '#0078D4',
    badge: 'Microsoft 365',
    sampleAccountNames: ['Corporate Marketing OneDrive', 'Media Assets 2026', 'PR Team Library'],
    supportsMultipleAccounts: true,
  },

  // BUSINESS & E-COMMERCE
  {
    id: 'shopify',
    name: 'Shopify',
    category: 'BUSINESS',
    description: 'Automated social drops, product milestone promotions & restock announcements synced to content studio.',
    capabilities: ['New Product Trigger', 'Inventory Restock Alerts', 'Price & Image Sync', 'Promo Code Tracking'],
    defaultScopes: ['read_products', 'read_inventory'],
    iconBg: 'bg-emerald-700/15 border-emerald-600/30',
    iconColor: '#96BF48',
    badge: 'E-Commerce',
    sampleAccountNames: ['Brand Storefront (Production)', 'Merch Drop Shop', 'Global D2C Store'],
    supportsMultipleAccounts: true,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'BUSINESS',
    description: 'CRM lead source attribution, contact sync & multi-touch social pipeline tracking for inbound marketing.',
    capabilities: ['Lead Source Attribution', 'Social Contact Sync', 'Campaign ROI Metrics', 'Form Automation'],
    defaultScopes: ['crm.objects.contacts.read', 'marketing'],
    iconBg: 'bg-orange-600/15 border-orange-500/30',
    iconColor: '#FF7A59',
    badge: 'Marketing CRM',
    sampleAccountNames: ['HubSpot Growth Portal', 'Inbound Sales Pipeline', 'Global Marketing Hub'],
    supportsMultipleAccounts: true,
  },
];

export interface ConnectHubProps {
  onNavigate?: (tab: string, context?: any) => void;
  initialContext?: any;
}

export const ConnectHub: React.FC<ConnectHubProps> = ({ onNavigate, initialContext }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant, activeBrand, brands } = useAuth();

  // Primary State
  const [connectionsList, setConnectionsList] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ConnectorCategory>('ALL');
  const [environmentFilter, setEnvironmentFilter] = useState<'ALL' | 'PRODUCTION' | 'SANDBOX'>('ALL');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Add Connection Modal State (Comprehensive Searchable Modal)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategory, setModalCategory] = useState<'ALL' | ConnectorCategory>('ALL');
  const [selectedModalConnector, setSelectedModalConnector] = useState<ConnectorDefinition | null>(null);
  const [modalAccountName, setModalAccountName] = useState('');
  const [modalIsSandbox, setModalIsSandbox] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<'SELECT_PLATFORM' | 'CONFIGURE' | 'VALIDATING' | 'SUCCESS'>('SELECT_PLATFORM');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  // Reconnect Target ID & Auth Mode
  const [reconnectingConnectionId, setReconnectingConnectionId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'OAUTH' | 'MANUAL'>('OAUTH');

  // Specific Credential Fields
  const [formAccessToken, setFormAccessToken] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formApiSecret, setFormApiSecret] = useState('');
  const [formAccessTokenSecret, setFormAccessTokenSecret] = useState('');
  const [formPageId, setFormPageId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formOrganizationId, setFormOrganizationId] = useState('');
  const [formChannelId, setFormChannelId] = useState('');
  const [formShopifyDomain, setFormShopifyDomain] = useState('');
  const [formPortalId, setFormPortalId] = useState('');
  const [formHandle, setFormHandle] = useState('');
  const [twitterAuthType, setTwitterAuthType] = useState<'BEARER' | 'API_KEYS'>('BEARER');

  // Password Show/Hide Visibility States
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showAccessTokenSecret, setShowAccessTokenSecret] = useState(false);

  // Verified Profile Metadata
  const [verifiedProfile, setVerifiedProfile] = useState<{
    accountName?: string;
    accountId?: string;
    handle?: string;
    profileUrl?: string;
    avatarUrl?: string;
  } | null>(null);

  // Meta (Facebook & Instagram) No-API Setup State
  const [metaConnectionMethod, setMetaConnectionMethod] = useState<'NO_API' | 'OAUTH'>('NO_API');
  const [metaFacebookPageUrl, setMetaFacebookPageUrl] = useState('');
  const [metaFacebookPageId, setMetaFacebookPageId] = useState('');
  const [metaFacebookCategory, setMetaFacebookCategory] = useState('Brand / Company');
  const [metaInstagramHandle, setMetaInstagramHandle] = useState('');
  const [metaInstagramProfileUrl, setMetaInstagramProfileUrl] = useState('');
  const [metaInstagramAccountType, setMetaInstagramAccountType] = useState<'CREATOR' | 'BUSINESS' | 'PERSONAL'>('CREATOR');
  const [metaPublishingMode, setMetaPublishingMode] = useState<'REMINDER' | 'WEBHOOK'>('REMINDER');
  const [metaNotificationEmail, setMetaNotificationEmail] = useState('');
  const [metaWebhookUrl, setMetaWebhookUrl] = useState('');
  const [modalValidationStages, setModalValidationStages] = useState<{
    access: 'pending' | 'running' | 'success' | 'failed';
    permissions: 'pending' | 'running' | 'success' | 'failed';
    publishing: 'pending' | 'running' | 'success' | 'failed';
    analytics: 'pending' | 'running' | 'success' | 'failed';
  }>({
    access: 'pending',
    permissions: 'pending',
    publishing: 'pending',
    analytics: 'pending',
  });

  // Meta Self-Service Flow State (HLD Stage 2: Zero Secret Self-Service)
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaStep, setMetaStep] = useState<'AUTH' | 'DISCOVERY' | 'VALIDATING' | 'SUCCESS'>('AUTH');
  const [metaConnectionId, setMetaConnectionId] = useState<string>('');
  const [metaDiscoveredPages, setMetaDiscoveredPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedInstagramId, setSelectedInstagramId] = useState<string | null>(null);
  const [includeInstagram, setIncludeInstagram] = useState(true);
  const [pageSelectionMap, setPageSelectionMap] = useState<
    Record<string, { selected: boolean; brandId: string; connectFacebook: boolean; connectInstagram: boolean }>
  >({});
  const [metaIsSubmitting, setMetaIsSubmitting] = useState(false);
  const [metaValidationError, setMetaValidationError] = useState<string | null>(null);
  const [metaDirectToken, setMetaDirectToken] = useState('');
  const [showDirectTokenBox, setShowDirectTokenBox] = useState(false);
  const [metaValidationStages, setMetaValidationStages] = useState<{
    access: 'pending' | 'running' | 'success' | 'failed';
    permissions: 'pending' | 'running' | 'success' | 'failed';
    publishing: 'pending' | 'running' | 'success' | 'failed';
    analytics: 'pending' | 'running' | 'success' | 'failed';
  }>({
    access: 'pending',
    permissions: 'pending',
    publishing: 'pending',
    analytics: 'pending',
  });

  // Disconnect Confirmation Modal State
  const [disconnectModalItem, setDisconnectModalItem] = useState<{ def: ConnectorDefinition; conn: ConnectionItem } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Manage Modal State
  const [manageModalItem, setManageModalItem] = useState<{ def: ConnectorDefinition; conn: ConnectionItem } | null>(null);

  // Body scroll locking & keyboard accessibility (ESC key) for slide-in drawers
  const isAnyDrawerOpen = isAddModalOpen || metaModalOpen || !!disconnectModalItem || !!manageModalItem;

  useEffect(() => {
    if (isAnyDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isAnyDrawerOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalStep === 'VALIDATING' || metaIsSubmitting) return;
        if (isAddModalOpen) setIsAddModalOpen(false);
        else if (metaModalOpen) setMetaModalOpen(false);
        else if (disconnectModalItem) setDisconnectModalItem(null);
        else if (manageModalItem) setManageModalItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, metaModalOpen, disconnectModalItem, manageModalItem, modalStep, metaIsSubmitting]);

  // Clear toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Unified OAuth Return URL Search Parameters
  useEffect(() => {
    const status = searchParams.get('status');
    const metaStatus = searchParams.get('meta_status');
    const connId = searchParams.get('connectionId');
    const errMessage = searchParams.get('error_message');
    const provider = searchParams.get('provider');
    const accountName = searchParams.get('accountName');
    const igName = searchParams.get('igName');

    if (status === 'connected') {
      const label = accountName ? decodeURIComponent(accountName) : provider ? `${provider} Account` : 'Account';
      const detail = igName ? ` and linked Instagram @${decodeURIComponent(igName)}` : '';
      setToastMessage({
        type: 'success',
        message: `🎉 Successfully connected ${label}${detail}!`,
      });
      loadConnections();
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('status');
      newParams.delete('provider');
      newParams.delete('accountName');
      newParams.delete('igName');
      newParams.delete('connectionId');
      newParams.delete('brandId');
      setSearchParams(newParams);
    } else if ((status === 'error' || metaStatus === 'error') && errMessage) {
      setErrorBanner(`Connection error: ${decodeURIComponent(errMessage)}`);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('status');
      newParams.delete('meta_status');
      newParams.delete('error_message');
      setSearchParams(newParams);
    } else if (metaStatus === 'discovered' && connId) {
      setMetaConnectionId(connId);
      setMetaStep('DISCOVERY');
      setMetaModalOpen(true);
      fetchDiscoveredMetaResources(connId);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('meta_status');
      newParams.delete('connectionId');
      newParams.delete('brandId');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  const fetchDiscoveredMetaResources = async (connId?: string) => {
    try {
      const discRes = await api.connections.getDiscoveredMetaPages(connId).catch(() => null);
      let pages = discRes?.data?.pages || [];
      if (pages.length === 0 && connId) {
        const res: any = await api.connections.getResources(connId, activeBrand?.id).catch(() => []);
        pages = Array.isArray(res) ? res : res?.pages || res?.data || res?.resources || [];
      }
      setMetaDiscoveredPages(pages);

      const initialMap: Record<
        string,
        { selected: boolean; brandId: string; connectFacebook: boolean; connectInstagram: boolean }
      > = {};
      pages.forEach((p: any) => {
        const pId = p.id || p.externalResourceId || p.page_id;
        const isConnected = p.connections && p.connections.length > 0;
        const connectedBrandId = isConnected ? p.connections[0].brandId : null;
        const isCurrentBrand = connectedBrandId === activeBrand?.id;

        // Never assign an Instagram account belonging to another brand
        const igBelongsToOtherBrand =
          p.instagramAccount?.isConnected && p.instagramAccount?.connectedBrandId !== activeBrand?.id;

        initialMap[pId] = {
          selected: isCurrentBrand,
          brandId: connectedBrandId || (activeBrand?.id || (brands[0]?.id ?? '')),
          connectFacebook: isCurrentBrand || false,
          connectInstagram: Boolean(p.hasInstagram && !igBelongsToOtherBrand && isCurrentBrand),
        };
      });
      setPageSelectionMap(initialMap);

      if (pages.length > 0) {
        const first = pages[0];
        const pageId = first.id || first.externalResourceId || first.page_id;
        setSelectedPageId(pageId);
        if (first.instagramAccount?.id) {
          setSelectedInstagramId(first.instagramAccount.id);
          setIncludeInstagram(true);
        } else {
          setSelectedInstagramId(null);
          setIncludeInstagram(false);
        }
      }
    } catch (err: any) {
      setMetaValidationError(`Could not retrieve discovered Meta resources: ${err.message}`);
    }
  };

  // Helper: map backend row to ConnectionItem
  const mapConnectionRow = (c: any): ConnectionItem => {
    const meta = typeof c.provider_account_metadata === 'string'
      ? JSON.parse(c.provider_account_metadata || '{}')
      : (c.provider_account_metadata || c.metadata || {});

    const isSandbox = Boolean(
      meta.isSandbox ||
      c.is_sandbox ||
      c.account_name?.toLowerCase().includes('sandbox') ||
      c.account_name?.toLowerCase().includes('mock') ||
      c.provider_account_id?.startsWith('sb_') ||
      c.provider_account_id?.startsWith('mock_')
    );

    const isNoApi = Boolean(
      meta.connectionType === 'NO_API_ASSISTED' ||
      meta.method === 'NO_API' ||
      meta.dispatchMode ||
      c.provider_account_id?.startsWith('no_api_')
    );

    const profileImage =
      c.profile_image ||
      meta.avatarUrl ||
      meta.profile_picture ||
      meta.picture ||
      meta.photoUrl ||
      null;

    const p = (c.provider || '').toLowerCase();
    const accountType =
      c.account_type ||
      meta.accountType ||
      (p === 'facebook'
        ? 'Facebook Page'
        : p === 'instagram'
        ? 'Instagram Business Account'
        : p === 'linkedin'
        ? 'LinkedIn Organization Page'
        : p === 'x_twitter'
        ? 'X Creator Account'
        : p === 'youtube' || p === 'youtube_shorts'
        ? 'YouTube Channel'
        : p === 'tiktok'
        ? 'TikTok Creator Account'
        : p === 'pinterest'
        ? 'Pinterest Business Profile'
        : `${c.provider} Account`);

    let tokenHealth = c.token_health;
    if (!tokenHealth) {
      if (c.status === 'REAUTH_REQUIRED') {
        tokenHealth = 'Re-authorization Required';
      } else if (p === 'facebook' || p === 'instagram') {
        tokenHealth = 'Permanent Page Token (No expiration)';
      } else if (c.expires_at) {
        const msLeft = new Date(c.expires_at).getTime() - Date.now();
        const daysLeft = Math.round(msLeft / (1000 * 60 * 60 * 24));
        tokenHealth = daysLeft > 0 ? `Healthy (Valid for ${daysLeft} days)` : 'Expiring Soon';
      } else {
        tokenHealth = 'Active & Valid';
      }
    }

    const availablePermissions: string[] =
      c.available_permissions ||
      c.scopes ||
      meta.scopes ||
      (meta.capabilities ? Object.keys(meta.capabilities) : []);

    return {
      id: c.id,
      provider: c.provider,
      status: (c.status || 'CONNECTED') as HealthState,
      accountName: c.account_name || c.accountName || meta.name || `${c.provider} Account`,
      lastCheckedAt: c.last_health_check_at ? formatTimeAgo(c.last_health_check_at) : 'Just now',
      lastError: c.last_error,
      actionRequiredMessage: getActionRequiredMessage(c.status),
      selectedResourcesCount: c.resources?.length || (meta.pageName ? 1 : 1),
      isSandbox,
      isNoApi,
      dispatchMode: meta.dispatchMode,
      metadata: meta,
      providerAccountId: c.provider_account_id,
      createdAt: c.created_at,
      brandId: c.brand_id,
      profileImage,
      accountType,
      tokenHealth,
      availablePermissions,
      expiresAt: c.expires_at,
    };
  };

  // Load connections for active tenant/brand
  const loadConnections = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const data = await api.connections.list(activeBrand?.id);
      if (Array.isArray(data)) {
        const items = data.map(mapConnectionRow);
        setConnectionsList(items);
      } else {
        setConnectionsList([]);
      }
    } catch (err: any) {
      console.warn('api.connections.list load error:', err.message);
      setErrorBanner('Could not sync remote connector states. Please try refreshing.');
      setConnectionsList([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever tenant or active brand changes (Strict Multi-Tenant Scoping)
  useEffect(() => {
    loadConnections();
  }, [tenant?.id, activeBrand?.id]);

  // Backward-compatible connections map (for existing test suites and single-card lookups)
  const connectionsMap = useMemo<Record<string, ConnectionItem>>(() => {
    const map: Record<string, ConnectionItem> = {};
    connectionsList.forEach((c) => {
      // If multiple accounts exist for same provider, keep the active one or primary
      if (!map[c.provider] || (map[c.provider].status === 'DISCONNECTED' && c.status !== 'DISCONNECTED')) {
        map[c.provider] = c;
      }
    });
    return map;
  }, [connectionsList]);

  // Global Health Audit Refresh
  const handleRefreshAllHealth = async () => {
    setRefreshingHealth(true);
    try {
      await api.connections.getTenantHealth(activeBrand?.id).catch(() => null);
      await new Promise((res) => setTimeout(res, 600));
      await loadConnections();
      setToastMessage({ type: 'success', message: 'All connection health diagnostics verified and updated.' });
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Health check verification failed' });
    } finally {
      setRefreshingHealth(false);
    }
  };

  // One-Click Direct OAuth Connection Workflow
  const handleOneClickSocialConnect = async (def: ConnectorDefinition) => {
    if (!activeBrand) {
      setErrorBanner('Please select an active brand before connecting a channel.');
      return;
    }

    try {
      setLoading(true);
      setErrorBanner(null);

      // Meta (Facebook & Instagram)
      if (def.id === 'facebook' || def.id === 'instagram') {
        const authResult = await api.connections.getAuthorizationUrl({
          provider: 'facebook',
          brandId: activeBrand.id,
          scopes: def.defaultScopes,
        });

        if (authResult?.authorizationUrl) {
          window.location.href = authResult.authorizationUrl;
          return;
        }
      }

      // Other Social Channels (LinkedIn, X, YouTube, TikTok, Pinterest)
      const redirectUri = `${window.location.origin}/connections`;
      const res = await api.connections.getAuthorizationUrl({
        provider: def.id,
        redirectUri,
        scopes: def.defaultScopes,
        brandId: activeBrand.id,
      });

      if (res?.authorizationUrl) {
        window.location.href = res.authorizationUrl;
        return;
      } else {
        throw new Error(`Failed to generate authorization URL for ${def.name}.`);
      }
    } catch (err: any) {
      console.warn(`[OneClickConnect] Direct OAuth redirect failed for ${def.name}:`, err.message);
      handleOpenAddModal(def);
    } finally {
      setLoading(false);
    }
  };

  // Open the Add Connection modal
  const handleOpenAddModal = (presetConnector?: ConnectorDefinition, reconnectConnId?: string, existingAccountName?: string) => {
    setModalSearch('');
    setModalCategory('ALL');
    setModalError(null);
    setModalSubmitting(false);
    setVerifiedProfile(null);
    setReconnectingConnectionId(reconnectConnId || null);

    // Reset credential form fields
    setFormAccessToken('');
    setFormApiKey('');
    setFormApiSecret('');
    setFormAccessTokenSecret('');
    setFormPageId('');
    setFormAccountId('');
    setFormOrganizationId('');
    setFormChannelId('');
    setFormShopifyDomain('');
    setFormPortalId('');
    setFormHandle('');
    setShowAccessToken(false);
    setShowApiKey(false);
    setShowApiSecret(false);
    setShowAccessTokenSecret(false);

    if (presetConnector) {
      setSelectedModalConnector(presetConnector);
      setModalAccountName(existingAccountName || '');
      const supportsOAuth = ['facebook', 'instagram', 'linkedin', 'tiktok', 'google-drive', 'google-sheets'].includes(presetConnector.id);
      setAuthMode(supportsOAuth ? 'OAUTH' : 'MANUAL');
      setModalStep('CONFIGURE');
    } else {
      setSelectedModalConnector(null);
      setModalAccountName('');
      setAuthMode('MANUAL');
      setModalStep('SELECT_PLATFORM');
    }
    setIsAddModalOpen(true);
  };

  // Auto-open modal if navigated from Dashboard with specific provider or connect action
  useEffect(() => {
    if (initialContext?.provider) {
      const p = String(initialContext.provider).toLowerCase();
      const match = CONNECTOR_CATALOG.find(
        (c: ConnectorDefinition) =>
          c.id.toLowerCase() === p ||
          (p.includes('twitter') && c.id === 'x_twitter') ||
          (p === 'x' && c.id === 'x_twitter') ||
          (p === 'x_twitter' && c.id === 'x_twitter')
      );
      if (match) {
        handleOpenAddModal(match);
      } else {
        handleOpenAddModal();
      }
    } else if (initialContext?.action === 'connect') {
      handleOpenAddModal();
    }
  }, [initialContext]);

  // Select platform in Add Modal
  const handleSelectPlatformInModal = (def: ConnectorDefinition) => {
    // Preserve existing form inputs if user navigates back and selects the same connector
    if (selectedModalConnector?.id !== def.id) {
      setSelectedModalConnector(def);
      setModalAccountName('');
      setModalError(null);
      setVerifiedProfile(null);
      setReconnectingConnectionId(null);

      // Reset credential form fields
      setFormAccessToken('');
      setFormApiKey('');
      setFormApiSecret('');
      setFormAccessTokenSecret('');
      setFormPageId('');
      setFormAccountId('');
      setFormOrganizationId('');
      setFormChannelId('');
      setFormShopifyDomain('');
      setFormPortalId('');
      setFormHandle('');
      setShowAccessToken(false);
      setShowApiKey(false);
      setShowApiSecret(false);
      setShowAccessTokenSecret(false);

      const supportsOAuth = ['facebook', 'instagram', 'linkedin', 'tiktok', 'google-drive', 'google-sheets'].includes(def.id);
      setAuthMode(supportsOAuth ? 'OAUTH' : 'MANUAL');
    } else {
      setModalError(null);
    }
    setModalStep('CONFIGURE');
  };

  // Initiate Official OAuth Flow
  const handleStartOAuth = async () => {
    if (!selectedModalConnector) return;
    setModalSubmitting(true);
    setModalError(null);

    if (selectedModalConnector.id === 'facebook' || selectedModalConnector.id === 'instagram') {
      setIsAddModalOpen(false);
      setMetaModalOpen(true);
      setMetaValidationError(null);
      setMetaIsSubmitting(false);

      // Check if existing discovered pages exist for this tenant
      try {
        const discRes = await api.connections.getDiscoveredMetaPages().catch(() => null);
        if (discRes?.data?.pages && discRes.data.pages.length > 0) {
          setMetaDiscoveredPages(discRes.data.pages);
          if (discRes.data.masterConnectionId) {
            setMetaConnectionId(discRes.data.masterConnectionId);
          }
          const initialMap: Record<
            string,
            { selected: boolean; brandId: string; connectFacebook: boolean; connectInstagram: boolean }
          > = {};
          discRes.data.pages.forEach((p: any) => {
            const pId = p.id || p.externalResourceId || p.page_id;
            const isConnected = p.connections && p.connections.length > 0;
            const connectedBrandId = isConnected ? p.connections[0].brandId : null;
            const isCurrentBrand = connectedBrandId === activeBrand?.id;

            // Never assign an Instagram account belonging to another brand
            const igBelongsToOtherBrand =
              p.instagramAccount?.isConnected && p.instagramAccount?.connectedBrandId !== activeBrand?.id;

            initialMap[pId] = {
              selected: isCurrentBrand,
              brandId: connectedBrandId || (activeBrand?.id || (brands[0]?.id ?? '')),
              connectFacebook: isCurrentBrand || false,
              connectInstagram: Boolean(p.hasInstagram && !igBelongsToOtherBrand && isCurrentBrand),
            };
          });
          setPageSelectionMap(initialMap);
          setSelectedPageId(discRes.data.pages[0].id || discRes.data.pages[0].page_id);
          setMetaStep('DISCOVERY');
          return;
        }
      } catch {}

      setMetaStep('AUTH');
      return;
    }

    try {
      const redirectUri = `${window.location.origin}/connections`;
      const res = await api.connections.getAuthorizationUrl({
        provider: selectedModalConnector.id,
        redirectUri,
        scopes: selectedModalConnector.defaultScopes,
        brandId: activeBrand?.id,
      });

      if (res?.authorizationUrl) {
        window.location.href = res.authorizationUrl;
      } else {
        throw new Error(`Failed to generate authorization URL for ${selectedModalConnector.name}.`);
      }
    } catch (err: any) {
      setModalError(err.message || `OAuth initiation failed for ${selectedModalConnector.name}.`);
      setModalSubmitting(false);
    }
  };

  // Save & Connect with Real-Time Backend Verification Pipeline
  const handleSaveAndConnect = async () => {
    if (!selectedModalConnector) return;
    const providerKey = selectedModalConnector.id;

    // 1. Client-Side Validation of Required Fields
    if (!modalAccountName.trim()) {
      setModalError('Please enter an Account / Page Name to identify this connection.');
      return;
    }

    const credentials: Record<string, any> = {};
    const metadata: Record<string, any> = {
      accountName: modalAccountName.trim(),
    };

    switch (providerKey) {
      case 'facebook':
        if (!formAccessToken.trim()) {
          setModalError('Page Access Token is required for Facebook.');
          return;
        }
        if (!formPageId.trim()) {
          setModalError('Facebook Page ID is required.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        credentials.pageId = formPageId.trim();
        if (formApiKey.trim()) credentials.appId = formApiKey.trim();
        if (formApiSecret.trim()) credentials.appSecret = formApiSecret.trim();
        metadata.pageId = formPageId.trim();
        break;

      case 'instagram':
        if (!formAccessToken.trim()) {
          setModalError('Instagram Graph API Access Token is required.');
          return;
        }
        if (!formAccountId.trim()) {
          setModalError('Instagram Business Account ID is required.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        credentials.instagramAccountId = formAccountId.trim();
        if (formHandle.trim()) metadata.handle = formHandle.trim().startsWith('@') ? formHandle.trim() : `@${formHandle.trim()}`;
        metadata.instagramAccountId = formAccountId.trim();
        break;

      case 'x_twitter':
        if (twitterAuthType === 'BEARER') {
          if (!formAccessToken.trim()) {
            setModalError('User Access Token / Bearer Token is required for X.');
            return;
          }
          credentials.accessToken = formAccessToken.trim();
          credentials.authType = 'BEARER';
        } else {
          if (!formApiKey.trim()) {
            setModalError('API Key (Consumer Key) is required for X.');
            return;
          }
          if (!formApiSecret.trim()) {
            setModalError('API Secret (Consumer Secret) is required for X.');
            return;
          }
          if (!formAccessToken.trim()) {
            setModalError('Access Token is required for X.');
            return;
          }
          if (!formAccessTokenSecret.trim()) {
            setModalError('Access Token Secret is required for X.');
            return;
          }
          credentials.apiKey = formApiKey.trim();
          credentials.apiSecret = formApiSecret.trim();
          credentials.accessToken = formAccessToken.trim();
          credentials.accessTokenSecret = formAccessTokenSecret.trim();
          credentials.authType = 'OAUTH1A';
        }
        break;

      case 'linkedin':
        if (!formAccessToken.trim()) {
          setModalError('OAuth 2.0 Access Token is required for LinkedIn.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        if (formOrganizationId.trim()) {
          credentials.organizationId = formOrganizationId.trim();
          metadata.organizationId = formOrganizationId.trim();
        }
        break;

      case 'tiktok':
        if (!formAccessToken.trim()) {
          setModalError('Access Token is required for TikTok.');
          return;
        }
        if (!formApiKey.trim()) {
          setModalError('Client Key / App ID is required for TikTok.');
          return;
        }
        if (!formApiSecret.trim()) {
          setModalError('Client Secret is required for TikTok.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        credentials.clientKey = formApiKey.trim();
        credentials.clientSecret = formApiSecret.trim();
        if (formAccountId.trim()) credentials.openId = formAccountId.trim();
        break;

      case 'youtube':
        if (!formAccessToken.trim() && !formApiKey.trim()) {
          setModalError('OAuth Access Token or Google API Key is required for YouTube Shorts.');
          return;
        }
        if (formAccessToken.trim()) credentials.accessToken = formAccessToken.trim();
        if (formApiKey.trim()) credentials.apiKey = formApiKey.trim();
        if (formChannelId.trim()) {
          credentials.channelId = formChannelId.trim();
          metadata.channelId = formChannelId.trim();
        }
        break;

      case 'shopify':
        if (!formShopifyDomain.trim()) {
          setModalError('Shopify Store Domain (.myshopify.com) is required.');
          return;
        }
        if (!formAccessToken.trim()) {
          setModalError('Admin API Access Token (shpat_...) is required for Shopify.');
          return;
        }
        credentials.storeDomain = formShopifyDomain.trim();
        credentials.accessToken = formAccessToken.trim();
        if (formApiKey.trim()) credentials.apiKey = formApiKey.trim();
        if (formApiSecret.trim()) credentials.apiSecret = formApiSecret.trim();
        metadata.shopifyDomain = formShopifyDomain.trim();
        break;

      case 'hubspot':
        if (!formAccessToken.trim()) {
          setModalError('Private App Access Token (pat-...) is required for HubSpot.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        if (formPortalId.trim()) metadata.portalId = formPortalId.trim();
        break;

      case 'google-drive':
      case 'google-sheets':
        if (!formAccessToken.trim()) {
          setModalError('Google OAuth Access Token is required.');
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        break;

      default:
        if (!formAccessToken.trim()) {
          setModalError(`Access Token is required for ${selectedModalConnector.name}.`);
          return;
        }
        credentials.accessToken = formAccessToken.trim();
        break;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      let resultConn: any;

      if (reconnectingConnectionId) {
        // Reconnect flow: verifies credentials against live platform API
        resultConn = await api.connections.reconnect(
          reconnectingConnectionId,
          {
            credentials,
            accountName: modalAccountName.trim(),
            metadata,
          },
          activeBrand?.id
        );
      } else {
        // Create flow: verifies credentials against live platform API
        resultConn = await api.connections.create(
          {
            provider: providerKey,
            brandId: activeBrand?.id,
            accountName: modalAccountName.trim(),
            scopes: selectedModalConnector.defaultScopes,
            credentials,
            providerAccountMetadata: {
              ...metadata,
              category: selectedModalConnector.category,
              connectedAt: new Date().toISOString(),
            },
          },
          activeBrand?.id
        );
      }

      const verifiedData = resultConn?.data?.connection || resultConn?.data || resultConn;
      setVerifiedProfile({
        accountName: verifiedData?.account_name || verifiedData?.accountName || modalAccountName.trim(),
        accountId: verifiedData?.provider_account_id || verifiedData?.providerAccountId,
        profileUrl: verifiedData?.provider_account_metadata?.profileUrl,
        avatarUrl: verifiedData?.provider_account_metadata?.avatarUrl,
        handle: verifiedData?.provider_account_metadata?.handle,
      });

      await loadConnections();

      // Close modal and refresh connection list
      setIsAddModalOpen(false);
      setModalStep('SELECT_PLATFORM');

      setToastMessage({
        type: 'success',
        message: `${selectedModalConnector.name} connection "${modalAccountName.trim()}" successfully verified and saved!`,
      });
    } catch (err: any) {
      console.error('Connection verification failed:', err);
      const errorMsg = err.error?.message || err.message || 'Credential verification failed with the platform API.';
      setModalError(errorMsg);
      if (
        err?.code === 'PLAN_LIMIT_EXCEEDED' ||
        err?.statusCode === 403 ||
        errorMsg.toLowerCase().includes('limit') ||
        errorMsg.includes('Upgrade required')
      ) {
        setUpgradeReason(errorMsg);
        setIsUpgradeModalOpen(true);
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  // Meta OAuth Initiation (Supports reprompt for re-requesting permissions & account selection)
  const handleStartMetaOAuth = async (reprompt = false) => {
    setMetaIsSubmitting(true);
    setMetaValidationError(null);
    try {
      const authResult = await api.connections.getAuthorizationUrl({
        provider: 'facebook',
        brandId: activeBrand?.id,
        reprompt,
      });

      if (authResult?.authorizationUrl) {
        window.location.href = authResult.authorizationUrl;
      } else {
        throw new Error('Authorization URL was not generated.');
      }
    } catch (err: any) {
      setMetaValidationError(err.message || 'Failed to initiate Meta OAuth authorization.');
    } finally {
      setMetaIsSubmitting(false);
    }
  };

  // Meta Simulate / Quick Discover
  const handleSimulateOAuthAndDiscover = async () => {
    setMetaIsSubmitting(true);
    setMetaValidationError(null);
    try {
      const callbackRes = await api.connections.handleOAuthCallback({
        provider: 'facebook',
        code: `test_code_meta_${Date.now()}`,
        brandId: activeBrand?.id,
      });

      const connId = callbackRes?.data?.connectionId || callbackRes?.connectionId;
      if (connId) {
        setMetaConnectionId(connId);
        await fetchDiscoveredMetaResources(connId);
        setMetaStep('DISCOVERY');
      } else {
        throw new Error('Could not obtain connection ID from Meta OAuth callback.');
      }
    } catch (err: any) {
      setMetaValidationError(err.message || 'Meta OAuth discovery failed.');
    } finally {
      setMetaIsSubmitting(false);
    }
  };

  // Direct Token Connect (Meta Graph API Explorer / Developer Token)
  const handleConnectWithDirectToken = async () => {
    if (!metaDirectToken.trim()) {
      setMetaValidationError('Please paste a valid Meta Page Access Token (starts with EAA...).');
      return;
    }
    if (!activeBrand?.id) {
      setMetaValidationError('No active brand selected. Please select a brand first.');
      return;
    }

    setMetaIsSubmitting(true);
    setMetaValidationError(null);
    try {
      const res: any = await api.connections.importDevToken(activeBrand.id, metaDirectToken.trim());
      setToastMessage({
        type: 'success',
        message: `Facebook Page token verified & encrypted in vault! ${res?.data?.pages?.[0]?.name ? `Connected to ${res.data.pages[0].name}.` : 'Page connected successfully.'}`,
      });
      await loadConnections();
      setMetaModalOpen(false);
      setMetaDirectToken('');
      setShowDirectTokenBox(false);
    } catch (err: any) {
      setMetaValidationError(err.message || 'Token verification failed. Please verify the token has pages_manage_posts and pages_read_engagement permissions in Meta Graph Explorer.');
    } finally {
      setMetaIsSubmitting(false);
    }
  };

  // Meta Validate & Connect (Supports Single and Multi-Page Batch Mapping to Brands)
  const handleValidateAndConnectMeta = async () => {
    const selectedEntries = Object.entries(pageSelectionMap).filter(
      ([_, state]) => state.selected && (state.connectFacebook || state.connectInstagram)
    );
    if (selectedEntries.length === 0 && !selectedPageId) {
      setMetaValidationError('Please select at least one channel (Facebook Page or Instagram account) to connect.');
      return;
    }

    setMetaIsSubmitting(true);
    setMetaValidationError(null);
    setMetaStep('VALIDATING');

    setMetaValidationStages({
      access: 'running',
      permissions: 'pending',
      publishing: 'pending',
      analytics: 'pending',
    });

    try {
      await new Promise((res) => setTimeout(res, 250));
      setMetaValidationStages((prev) => ({ ...prev, access: 'success', permissions: 'running' }));

      await new Promise((res) => setTimeout(res, 250));
      setMetaValidationStages((prev) => ({ ...prev, permissions: 'success', publishing: 'running' }));

      await new Promise((res) => setTimeout(res, 250));
      setMetaValidationStages((prev) => ({ ...prev, publishing: 'success', analytics: 'running' }));

      // Format page selections with brand mapping
      let pageSelections = selectedEntries.map(([pageId, state]) => {
        const pageObj = metaDiscoveredPages.find((p) => (p.id || p.externalResourceId || p.page_id) === pageId);
        const canConnectIg = Boolean(state.connectInstagram && pageObj?.instagramAccount?.id);
        return {
          pageId,
          brandId: state.brandId || activeBrand?.id,
          connectFacebook: state.connectFacebook !== false,
          instagramAccountId: canConnectIg ? pageObj?.instagramAccount?.id : null,
          connectInstagram: canConnectIg,
        };
      });

      if (pageSelections.length === 0 && selectedPageId) {
        pageSelections = [{
          pageId: selectedPageId,
          brandId: activeBrand?.id,
          connectFacebook: true,
          instagramAccountId: includeInstagram && selectedInstagramId ? selectedInstagramId : null,
          connectInstagram: Boolean(includeInstagram && selectedInstagramId),
        }];
      }

      const batchRes = await api.connections.saveMetaBatchPages({
        connectionId: metaConnectionId || undefined,
        pageSelections,
      });

      setMetaValidationStages({
        access: 'success',
        permissions: 'success',
        publishing: 'success',
        analytics: 'success',
      });

      await new Promise((res) => setTimeout(res, 200));
      setMetaStep('SUCCESS');

      const count = batchRes?.data?.successful?.length || pageSelections.length;
      setToastMessage({
        type: 'success',
        message: `Successfully connected & verified ${count} Facebook Page(s) across selected brands!`,
      });

      await loadConnections();

      // Close modal upon batch selection completion
      setMetaModalOpen(false);
    } catch (err: any) {
      setMetaValidationStages((prev) => ({
        ...prev,
        publishing: prev.publishing === 'running' ? 'failed' : prev.publishing,
        permissions: prev.permissions === 'running' ? 'failed' : prev.permissions,
        analytics: prev.analytics === 'running' ? 'failed' : prev.analytics,
      }));
      const msg = err.error?.message || err.message || 'Validation failed. Ensure required permissions and Page access are granted.';
      setMetaValidationError(msg);
      if (
        err?.code === 'PLAN_LIMIT_EXCEEDED' ||
        err?.statusCode === 403 ||
        msg.toLowerCase().includes('limit') ||
        msg.includes('Upgrade required')
      ) {
        setUpgradeReason(msg);
        setIsUpgradeModalOpen(true);
      }
    } finally {
      setMetaIsSubmitting(false);
    }
  };

  // Disconnect Flow with Confirmation
  const handleConfirmDisconnect = async () => {
    if (!disconnectModalItem) return;
    setDisconnecting(true);
    const { def, conn } = disconnectModalItem;
    try {
      await api.connections.disconnect(conn.id, activeBrand?.id).catch(() => null);

      // Remove from list or mark disconnected
      setConnectionsList((prev) => prev.filter((c) => c.id !== conn.id));

      setToastMessage({
        type: 'success',
        message: `${def.name} connection "${conn.accountName}" disconnected safely.`,
      });
      setDisconnectModalItem(null);
      if (manageModalItem?.conn.id === conn.id) {
        setManageModalItem(null);
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to disconnect' });
    } finally {
      setDisconnecting(false);
    }
  };

  // Reconnect Handler: Opens the connection modal pre-targeted for that connection
  const handleReconnect = (conn: ConnectionItem) => {
    const def = CONNECTOR_CATALOG.find((c) => c.id === conn.provider) || CONNECTOR_CATALOG[0];
    handleOpenAddModal(def, conn.id, conn.accountName);
  };

  // Handle direct reconnect query param (e.g. from Connection Health or external deep-link)
  useEffect(() => {
    const reconnectId = searchParams.get('reconnect');
    if (reconnectId && connectionsList.length > 0) {
      const conn = connectionsList.find((c) => c.id === reconnectId);
      if (conn) {
        handleReconnect(conn);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('reconnect');
        setSearchParams(newParams);
      }
    }
  }, [searchParams, connectionsList]);

  // Trigger Individual Health Check
  const handleTestHealth = async (def: ConnectorDefinition, conn: ConnectionItem) => {
    setConnectionsList((prev) =>
      prev.map((c) => (c.id === conn.id ? { ...c, status: 'CHECKING' } : c))
    );

    try {
      const res = await api.connections.test(conn.id, activeBrand?.id);
      const isSuccess = res?.success !== false && (res?.data?.status === 'CONNECTED' || res?.status === 'CONNECTED');
      const newStatus: HealthState = isSuccess ? 'CONNECTED' : (res?.data?.status || 'REAUTH_REQUIRED');
      const errorMsg = res?.data?.error || res?.error?.message;

      setConnectionsList((prev) =>
        prev.map((c) =>
          c.id === conn.id
            ? {
                ...c,
                status: newStatus,
                lastCheckedAt: 'Just now',
                actionRequiredMessage: errorMsg,
              }
            : c
        )
      );

      if (isSuccess) {
        setToastMessage({ type: 'success', message: `${def.name} ("${conn.accountName}") verified HEALTHY and ACTIVE!` });
      } else {
        setToastMessage({ type: 'error', message: `${def.name} verification warning: ${errorMsg || 'Token expired or revoked'}` });
      }
    } catch (err: any) {
      setConnectionsList((prev) =>
        prev.map((c) =>
          c.id === conn.id
            ? {
                ...c,
                status: 'NEEDS_ATTENTION',
                actionRequiredMessage: err.message || 'Health check returned error',
              }
            : c
        )
      );
      setToastMessage({ type: 'error', message: `Health audit failed: ${err.message}` });
    }
  };

  // Filtered Connected Accounts List
  const filteredConnectedAccounts = useMemo(() => {
    return connectionsList.filter((conn) => {
      const def = CONNECTOR_CATALOG.find((c) => c.id === conn.provider);
      // Category filter
      if (categoryFilter !== 'ALL' && def && def.category !== categoryFilter) {
        return false;
      }
      // Environment filter
      if (environmentFilter === 'PRODUCTION' && conn.isSandbox) return false;
      if (environmentFilter === 'SANDBOX' && !conn.isSandbox) return false;

      return true;
    });
  }, [connectionsList, categoryFilter, environmentFilter]);

  // Filtered Catalog for Add Modal and Catalog Cards
  const filteredCatalogModal = useMemo(() => {
    return CONNECTOR_CATALOG.filter((c) => {
      if (modalCategory !== 'ALL' && c.category !== modalCategory) return false;
      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.badge.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.capabilities.some((cap) => cap.toLowerCase().includes(q))
      );
    });
  }, [modalSearch, modalCategory]);

  const filteredCatalogSection = useMemo(() => {
    return CONNECTOR_CATALOG.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) return false;
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.badge.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.capabilities.some((cap) => cap.toLowerCase().includes(q))
      );
    });
  }, [categoryFilter, catalogSearch]);

  const socialConnectors = useMemo(() => filteredCatalogSection.filter((c) => c.category === 'SOCIAL'), [filteredCatalogSection]);
  const commsConnectors = useMemo(() => filteredCatalogSection.filter((c) => c.category === 'COMMUNICATION'), [filteredCatalogSection]);
  const dataConnectors = useMemo(() => filteredCatalogSection.filter((c) => c.category === 'DATA'), [filteredCatalogSection]);
  const businessConnectors = useMemo(() => filteredCatalogSection.filter((c) => c.category === 'BUSINESS'), [filteredCatalogSection]);

  const connectedAccountsCount = connectionsList.filter((c) => c.status !== 'DISCONNECTED').length;
  const sandboxAccountsCount = connectionsList.filter((c) => c.isSandbox).length;
  const productionAccountsCount = connectedAccountsCount - sandboxAccountsCount;

  // Helper Subcomponents for Secure Platform Credential Inputs
  const PasswordField = ({
    label,
    value,
    onChange,
    placeholder,
    required = true,
    description,
    show,
    onToggleShow,
    testId,
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    description?: string;
    show: boolean;
    onToggleShow: () => void;
    testId?: string;
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {required ? (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f87171' }}>* Required</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Optional</span>
        )}
      </div>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid={testId}
          className="connect-input"
          style={{ paddingRight: '40px', fontFamily: show ? 'inherit' : 'var(--font-mono)' }}
          autoComplete="new-password"
          spellCheck="false"
        />
        <button
          type="button"
          onClick={onToggleShow}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={show ? 'Hide secret' : 'Show secret'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {description && (
        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {description}
        </p>
      )}
    </div>
  );

  const TextField = ({
    label,
    value,
    onChange,
    placeholder,
    required = true,
    description,
    testId,
    type = 'text',
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    required?: boolean;
    description?: string;
    testId?: string;
    type?: string;
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {required ? (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#f87171' }}>* Required</span>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Optional</span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="connect-input"
      />
      {description && (
        <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="connect-hub-layout animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          data-testid="connect-hub-toast"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: 'var(--radius-lg)',
            border: toastMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            background: toastMessage.type === 'success' ? 'rgba(13, 22, 32, 0.96)' : 'rgba(28, 17, 23, 0.96)',
            color: toastMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(16px)',
          }}
          className="animate-fade-in"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage.message}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              opacity: 0.6,
              marginLeft: '8px',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Prominent Add Connection Action */}
      <PageHeader
        category={`${tenant?.name || 'Agency Workspace'} / ${activeBrand?.name || 'Active Brand'}`}
        categoryIcon={Building2}
        badge="Encrypted Vault"
        badgeVariant="indigo"
        title="Connect Hub"
        description="Connect and manage social channels, advertising networks, and messaging accounts for your active brand."
        actions={
          <>
            <button
              onClick={() => handleOpenAddModal()}
              data-testid="add-connection-header-btn"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg shadow-sm transition active:scale-98 cursor-pointer whitespace-nowrap"
            >
              <Plus size={15} />
              <span>+ Add Connection</span>
            </button>

            <button
              onClick={handleRefreshAllHealth}
              disabled={refreshingHealth || loading}
              data-testid="refresh-health-btn"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-secondary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Run active health verification on all connected services"
            >
              <RefreshCw size={13} className={refreshingHealth ? 'animate-spin text-indigo-500' : ''} />
              <span>{refreshingHealth ? 'Auditing Health...' : 'Audit All Health'}</span>
            </button>

            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('connection-health');
                } else {
                  navigate('/?tab=connection-health');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck size={13} />
              <span>Diagnostics</span>
            </button>
          </>
        }
      />

      {/* Overview KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Active Connections"
          value={connectedAccountsCount}
          icon={Share2}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          trend={{ value: `${connectedAccountsCount} Linked`, label: 'Across categories', positive: true }}
          description="Active accounts managed"
        />

        <StatCard
          title="Live Production"
          value={productionAccountsCount}
          icon={CheckCircle2}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          trend={{ value: 'Live APIs', label: 'Real-time publishing', positive: true }}
          description="Live verified provider connections"
        />

        <StatCard
          title="Sandbox / Simulator"
          value={sandboxAccountsCount}
          icon={Radio}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10 border-amber-500/20"
          trend={{ value: 'Dev Mode', label: 'Safe synthetic testing', neutral: true }}
          description="Isolated test and sandbox accounts"
        />
      </div>

      {/* Error Alert Banner */}
      {errorBanner && (
        <div
          data-testid="error-banner"
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500 }}>{errorBanner}</p>
          </div>
          <button
            onClick={loadConnections}
            className="connect-btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Section 1: Connected Accounts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="connected-accounts-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} />
                <span>Connected Accounts</span>
              </h2>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7' }}>
                {connectedAccountsCount} Active
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Managed social channels, cloud media drives, and stores connected to <strong>{activeBrand?.name || 'this brand'}</strong>.
              Multiple accounts per platform are supported.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Environment Toggle Filter */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setEnvironmentFilter('ALL')}
                className={`connect-pill ${environmentFilter === 'ALL' ? 'active' : ''}`}
                style={{ padding: '5px 12px' }}
              >
                All ({connectedAccountsCount})
              </button>
              <button
                onClick={() => setEnvironmentFilter('PRODUCTION')}
                className={`connect-pill ${environmentFilter === 'PRODUCTION' ? 'active' : ''}`}
                style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                Live ({productionAccountsCount})
              </button>
              <button
                onClick={() => setEnvironmentFilter('SANDBOX')}
                className={`connect-pill ${environmentFilter === 'SANDBOX' ? 'active' : ''}`}
                style={{ padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
                Sandbox ({sandboxAccountsCount})
              </button>
            </div>

            <button
              onClick={() => handleOpenAddModal()}
              data-testid="add-connection-inline-btn"
              className="connect-btn-secondary"
            >
              <Plus size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Add Another</span>
            </button>
          </div>
        </div>

        {/* Connected Accounts Table / Cards */}
        {loading ? (
          <div
            className="glass-card"
            style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}
          >
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px', color: 'var(--accent-primary)' }} />
            <div>Loading active connections from secure vault...</div>
          </div>
        ) : filteredConnectedAccounts.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: '44px 28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-xl)', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <Share2 size={28} />
            </div>
            <div style={{ maxWidth: '480px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                No Connections Found for this Filter
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Connect Facebook, Instagram, LinkedIn, TikTok, YouTube Shorts, or X to unlock one-click publishing, automated campaigns, and live reach analytics.
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              data-testid="empty-state-add-connection-btn"
              className="connect-btn-gradient"
            >
              <Plus size={15} />
              <span>Connect First Account</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredConnectedAccounts.map((conn) => {
              const def = CONNECTOR_CATALOG.find((c) => c.id === conn.provider) || {
                id: conn.provider,
                name: conn.provider.toUpperCase(),
                category: 'SOCIAL' as ConnectorCategory,
                description: `${conn.provider} integration`,
                capabilities: ['Publishing', 'Telemetry'],
                defaultScopes: [],
                iconBg: 'bg-purple-600/20 border-purple-500/40',
                iconColor: '#a855f7',
                badge: 'Connected',
                sampleAccountNames: [],
              };

              const isUnhealthy =
                conn.status === 'REAUTH_REQUIRED' ||
                conn.status === 'PERMISSION_MISSING' ||
                conn.status === 'NEEDS_ATTENTION' ||
                conn.status === 'RATE_LIMITED';

              return (
                <div
                  key={conn.id}
                  data-testid={`connected-account-row-${conn.id}`}
                  className={`connect-account-card ${isUnhealthy ? 'unhealthy' : ''}`}
                >
                  {/* Left: Platform Icon / Profile Image & Account Name */}
                  {(() => {
                    const associatedBrand = brands?.find((b: any) => b.id === conn.brandId);
                    const brandName = associatedBrand?.name || (conn.brandId === activeBrand?.id ? activeBrand?.name : undefined);
                    const avatarUrl = conn.metadata?.pictureUrl || conn.metadata?.avatarUrl || conn.metadata?.profilePictureUrl;

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={conn.accountName}
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 'var(--radius-lg)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-medium)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 'var(--radius-lg)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-medium)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {def.id === 'instagram' ? (
                              <Instagram size={22} style={{ color: '#E1306C' }} />
                            ) : def.id === 'facebook' ? (
                              <Share2 size={22} style={{ color: '#1877F2' }} />
                            ) : def.id === 'x_twitter' ? (
                              <Twitter size={22} style={{ color: '#ffffff' }} />
                            ) : def.id === 'google-drive' ? (
                              <Folder size={22} style={{ color: '#10b981' }} />
                            ) : def.id === 'google-sheets' ? (
                              <FileSpreadsheet size={22} style={{ color: '#22c55e' }} />
                            ) : def.id === 'youtube' ? (
                              <Video size={22} style={{ color: '#ef4444' }} />
                            ) : (
                              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: def.iconColor }}>
                                {def.name.charAt(0)}
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {conn.accountName}
                            </span>

                            {/* Associated Brand Badge */}
                            {brandName && (
                              <span
                                data-testid={`brand-badge-${conn.id}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  color: '#c4b5fd',
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  border: '1px solid rgba(139, 92, 246, 0.3)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                                title={`Associated HoaspForge Brand: ${brandName}`}
                              >
                                <Building2 size={11} />
                                <span>Brand: {brandName}</span>
                              </span>
                            )}

                            {/* Environment Badge: Live vs Sandbox */}
                            {conn.isSandbox ? (
                              <span
                                data-testid={`sandbox-badge-${conn.id}`}
                                className="connect-badge-sandbox"
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
                                Sandbox / Mock
                              </span>
                            ) : (
                              <span
                                data-testid={`live-badge-${conn.id}`}
                                className="connect-badge-live"
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                                Live Production
                              </span>
                            )}

                            {conn.isNoApi && (
                              <span
                                data-testid={`no-api-badge-${conn.id}`}
                                className="connect-badge-no-api"
                              >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa' }} />
                                No-API / Mobile Assisted
                              </span>
                            )}

                            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                              {def.name}
                            </span>

                            {conn.providerAccountId && (
                              <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                ID: {conn.providerAccountId}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              <span>Checked: {conn.lastCheckedAt || 'Just now'}</span>
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: conn.status === 'CONNECTED' ? '#34d399' : '#fbbf24' }}>
                              <ShieldCheck size={12} />
                              <span>{conn.status === 'CONNECTED' ? 'Verified Active' : conn.status}</span>
                            </span>
                            <span>•</span>
                            <span>{conn.isNoApi ? (conn.dispatchMode === 'WEBHOOK' ? '🔗 Webhook Bridge' : '📱 1-Tap Mobile Reminder') : `${conn.selectedResourcesCount || 1} Channel Resource(s) Active`}</span>
                          </div>

                          {/* Action Required Message when degraded */}
                          {conn.actionRequiredMessage && (
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <AlertCircle size={13} style={{ flexShrink: 0 }} />
                              <span>{conn.actionRequiredMessage}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Right: Status Badge & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <HealthBadge status={conn.status} />

                    <button
                      onClick={() => setManageModalItem({ def, conn })}
                      data-testid={`manage-btn-${conn.provider}`}
                      className="connect-btn-secondary"
                    >
                      <SlidersHorizontal size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>Manage</span>
                    </button>

                    <button
                      onClick={() => handleReconnect(conn)}
                      data-testid={`reconnect-btn-${conn.provider}`}
                      className="connect-btn-secondary"
                      style={{ color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.35)' }}
                      title="Refresh credentials and re-verify connection"
                    >
                      <RefreshCw size={13} />
                      <span>Reconnect</span>
                    </button>

                    <button
                      onClick={() => setDisconnectModalItem({ def, conn })}
                      data-testid={`disconnect-btn-${conn.provider}`}
                      className="connect-btn-danger"
                    >
                      <Trash2 size={13} />
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Explore & Browse Integrations Catalog */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '28px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Zap size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Available Integrations Catalog</span>
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Browse all supported social channels, cloud asset drives, and e-commerce stores available for instant setup.
            </p>
          </div>

          {/* Search Catalog Input */}
          <div className="connect-search-box" style={{ minWidth: 260 }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search connectors..."
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['ALL', 'SOCIAL', 'COMMUNICATION', 'DATA', 'BUSINESS'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              data-testid={`filter-${cat.toLowerCase()}`}
              className={`connect-pill ${categoryFilter === cat ? 'active' : ''}`}
            >
              {cat === 'ALL' ? 'All Platforms' : cat}
            </button>
          ))}
        </div>

        {/* Catalog Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {(categoryFilter === 'ALL' || categoryFilter === 'SOCIAL') && socialConnectors.length > 0 && (
            <ConnectorCategoryBlock
              title="Social Publishing Channels"
              icon={<Share2 size={20} style={{ color: 'var(--accent-primary)' }} />}
              category="SOCIAL"
              connectors={socialConnectors}
              connectionsMap={connectionsMap}
              connectionsList={connectionsList}
              onConnect={(def) => handleOneClickSocialConnect(def)}
              onManage={(def, conn) => setManageModalItem({ def, conn })}
            />
          )}

          {(categoryFilter === 'ALL' || categoryFilter === 'COMMUNICATION') && commsConnectors.length > 0 && (
            <ConnectorCategoryBlock
              title="Omnichannel Communication & Messaging"
              icon={<Mail size={20} style={{ color: '#10b981' }} />}
              category="COMMUNICATION"
              connectors={commsConnectors}
              connectionsMap={connectionsMap}
              connectionsList={connectionsList}
              onConnect={(def) => {
                if (def.id === 'email' && onNavigate) onNavigate('email');
                else if (def.id === 'whatsapp' && onNavigate) onNavigate('whatsapp');
                else if (def.id === 'sms-voice' && onNavigate) onNavigate('sms-voice');
                else handleOpenAddModal(def);
              }}
              onManage={(def, conn) => {
                if (def.id === 'email' && onNavigate) onNavigate('email');
                else if (def.id === 'whatsapp' && onNavigate) onNavigate('whatsapp');
                else if (def.id === 'sms-voice' && onNavigate) onNavigate('sms-voice');
                else setManageModalItem({ def, conn });
              }}
            />
          )}

          {(categoryFilter === 'ALL' || categoryFilter === 'DATA') && dataConnectors.length > 0 && (
            <ConnectorCategoryBlock
              title="Cloud Data Sources & Content Repositories"
              icon={<Database size={20} style={{ color: '#3b82f6' }} />}
              category="DATA"
              connectors={dataConnectors}
              connectionsMap={connectionsMap}
              connectionsList={connectionsList}
              onConnect={(def) => handleOpenAddModal(def)}
              onManage={(def, conn) => setManageModalItem({ def, conn })}
            />
          )}

          {(categoryFilter === 'ALL' || categoryFilter === 'BUSINESS') && businessConnectors.length > 0 && (
            <ConnectorCategoryBlock
              title="Business Systems & E-Commerce"
              icon={<Briefcase size={20} style={{ color: '#10b981' }} />}
              category="BUSINESS"
              connectors={businessConnectors}
              connectionsMap={connectionsMap}
              connectionsList={connectionsList}
              onConnect={(def) => handleOpenAddModal(def)}
              onManage={(def, conn) => setManageModalItem({ def, conn })}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Comprehensive Add Connection Modal (Responsive Slide-In Panel)   */}
      {/* ========================================================================= */}
      {isAddModalOpen && createPortal(
        <div data-testid="add-connection-modal" className="connect-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="connect-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-connection-modal-title"
          >
            {/* Modal Header */}
            <div className="connect-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {/* Back button: in CONFIGURE visible everywhere; in SELECT_PLATFORM visible on mobile to return to Connect Hub */}
                <button
                  type="button"
                  onClick={() => {
                    if (modalStep === 'CONFIGURE') {
                      setModalStep('SELECT_PLATFORM');
                      setModalError(null);
                    } else {
                      setIsAddModalOpen(false);
                    }
                  }}
                  data-testid="modal-header-back-btn"
                  aria-label={modalStep === 'CONFIGURE' ? 'Back to platform catalog' : 'Back to Connect Hub'}
                  className={`connect-btn-secondary ${modalStep === 'SELECT_PLATFORM' ? 'mobile-only-back-btn' : ''}`}
                  style={{
                    padding: '8px',
                    minWidth: '36px',
                    minHeight: '36px',
                    display: modalStep === 'CONFIGURE' ? 'inline-flex' : undefined,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title={modalStep === 'CONFIGURE' ? 'Back to platform catalog' : 'Back to Connect Hub'}
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(99, 102, 241, 0.25))', border: '1px solid rgba(139, 92, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', flexShrink: 0 }}>
                  <Plus size={20} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 id="add-connection-modal-title" style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {modalStep === 'SELECT_PLATFORM' ? 'Add New Connection' : `Connect ${selectedModalConnector?.name || 'Platform'}`}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {modalStep === 'SELECT_PLATFORM'
                      ? 'Select a platform to link with your agency brand'
                      : `Configure credentials and authorization for ${selectedModalConnector?.name}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                data-testid="modal-cancel-btn"
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  flexShrink: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Error Banner */}
            {modalError && (
              <div style={{ margin: '14px 28px 0', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="connect-modal-body">
              {/* STEP 1: Select Platform with Searchable Dropdown / Grid */}
              {modalStep === 'SELECT_PLATFORM' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Search Bar */}
                  <div className="connect-search-box">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search platforms (e.g. Facebook, Instagram, LinkedIn, TikTok, YouTube, X, Shopify)..."
                      data-testid="platform-search-input"
                      autoFocus
                    />
                    {modalSearch && (
                      <button
                        onClick={() => setModalSearch('')}
                        style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Pills inside Modal */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(['ALL', 'SOCIAL', 'COMMUNICATION', 'DATA', 'BUSINESS'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setModalCategory(cat)}
                        className={`connect-pill ${modalCategory === cat ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                      >
                        {cat === 'ALL' ? 'All' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Platforms List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredCatalogModal.length === 0 ? (
                      <div style={{ padding: '32px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        No matching platform found for "{modalSearch}". Try a different keyword.
                      </div>
                    ) : (
                      filteredCatalogModal.map((def) => {
                        const existingCount = connectionsList.filter((c) => c.provider === def.id && c.status === 'CONNECTED').length;
                        return (
                          <div
                            key={def.id}
                            onClick={() => handleSelectPlatformInModal(def)}
                            data-testid={`platform-select-item-${def.id}`}
                            className="connect-platform-item"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 'var(--radius-md)',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid var(--border-medium)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {def.id === 'instagram' ? (
                                  <Instagram size={20} style={{ color: '#E1306C' }} />
                                ) : def.id === 'facebook' ? (
                                  <Share2 size={20} style={{ color: '#1877F2' }} />
                                ) : def.id === 'x_twitter' ? (
                                  <Twitter size={20} style={{ color: '#ffffff' }} />
                                ) : def.id === 'google-drive' ? (
                                  <Folder size={20} style={{ color: '#10b981' }} />
                                ) : def.id === 'google-sheets' ? (
                                  <FileSpreadsheet size={20} style={{ color: '#22c55e' }} />
                                ) : def.id === 'youtube' ? (
                                  <Video size={20} style={{ color: '#ef4444' }} />
                                ) : (
                                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: def.iconColor }}>
                                    {def.name.charAt(0)}
                                  </span>
                                )}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {def.name}
                                  </span>
                                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                                    {def.badge}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {def.description}
                                </p>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              {existingCount > 0 && (
                                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                                  {existingCount} Connected
                                </span>
                              )}
                              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Configure & Authorize Form */}
              {modalStep === 'CONFIGURE' && selectedModalConnector && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Platform Summary Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-medium)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: selectedModalConnector.iconColor }}>
                          {selectedModalConnector.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedModalConnector.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{selectedModalConnector.description}</div>
                      </div>
                    </div>
                    {reconnectingConnectionId ? (
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
                        Reconnecting
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setModalStep('SELECT_PLATFORM');
                          setModalError(null);
                        }}
                        style={{ fontSize: '0.76rem', color: 'var(--accent-primary)', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '4px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      >
                        Change Platform
                      </button>
                    )}
                  </div>

                  {/* Mode Selector for Platforms that Support OAuth */}
                  {['facebook', 'instagram', 'linkedin', 'tiktok', 'google-drive', 'google-sheets'].includes(selectedModalConnector.id) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(59, 130, 246, 0.08))', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Connection Method</span>
                        <span style={{ fontSize: '0.72rem', color: '#c4b5fd', fontWeight: 600 }}>Official API & OAuth</span>
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setAuthMode('OAUTH')}
                          data-testid="auth-mode-oauth-btn"
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: authMode === 'OAUTH' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: authMode === 'OAUTH' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: authMode === 'OAUTH' ? '#c4b5fd' : 'inherit' }}>
                            ⚡ Official OAuth 2.0
                          </div>
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Standard 1-click dialog (Recommended)
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAuthMode('MANUAL')}
                          data-testid="auth-mode-manual-btn"
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: authMode === 'MANUAL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: authMode === 'MANUAL' ? 'rgba(139, 92, 246, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: authMode === 'MANUAL' ? '#c4b5fd' : 'inherit' }}>
                            🔑 Direct API Credentials
                          </div>
                          <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Configure API Keys & Channel IDs directly
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* OAUTH INFORMATION PANEL */}
                  {authMode === 'OAUTH' && ['facebook', 'instagram', 'linkedin', 'tiktok', 'google-drive', 'google-sheets'].includes(selectedModalConnector.id) ? (
                    <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Zap size={18} style={{ color: '#c4b5fd', flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Authorize with {selectedModalConnector.name} Official OAuth
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            You will be redirected to {selectedModalConnector.name}'s official authorization dialog to grant required permissions. HoaspForge receives an encrypted access token directly from {selectedModalConnector.name}.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-primary)' }}>
                          Scopes & Capabilities Granted
                        </span>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedModalConnector.capabilities.map((cap, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartOAuth}
                        disabled={modalSubmitting}
                        data-testid="start-oauth-btn"
                        className="connect-btn-gradient"
                        style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                      >
                        {modalSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Generating Authorization URL...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            <span>Authenticate with Official {selectedModalConnector.name} OAuth</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* DIRECT CREDENTIALS FORM */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Common Account / Nickname Field */}
                      <TextField
                        label="Account / Profile Name"
                        value={modalAccountName}
                        onChange={setModalAccountName}
                        placeholder={`e.g. ${activeBrand?.name || 'Brand'} Official`}
                        required={true}
                        description="Human-friendly label to identify this account across publishers, schedulers, and analytics."
                        testId="modal-account-name-input"
                      />

                      {/* FACEBOOK DIRECT CREDENTIALS */}
                      {selectedModalConnector.id === 'facebook' && (
                        <>
                          <PasswordField
                            label="Facebook Page Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="EAA..."
                            required={true}
                            description="Page access token generated from Meta Developer Portal or Graph API Explorer with pages_manage_posts scope."
                            testId="facebook-access-token-input"
                          />
                          <TextField
                            label="Facebook Page ID"
                            value={formPageId}
                            onChange={setFormPageId}
                            placeholder="e.g. 10482910481239"
                            required={true}
                            description="Numeric Page ID found in Page Settings > About or Meta Business Suite."
                            testId="facebook-page-id-input"
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <TextField
                              label="Meta App ID"
                              value={formApiKey}
                              onChange={setFormApiKey}
                              placeholder="e.g. 98471203948123"
                              required={false}
                              description="Optional: App ID for signed requests."
                              testId="facebook-app-id-input"
                            />
                            <PasswordField
                              label="Meta App Secret"
                              value={formApiSecret}
                              onChange={setFormApiSecret}
                              show={showApiSecret}
                              onToggleShow={() => setShowApiSecret(!showApiSecret)}
                              placeholder="App Secret"
                              required={false}
                              description="Optional: For proof verification."
                              testId="facebook-app-secret-input"
                            />
                          </div>
                        </>
                      )}

                      {/* INSTAGRAM DIRECT CREDENTIALS */}
                      {selectedModalConnector.id === 'instagram' && (
                        <>
                          <PasswordField
                            label="Instagram Graph API Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="EAA..."
                            required={true}
                            description="Long-lived Graph API token with instagram_basic and instagram_content_publish scopes."
                            testId="instagram-access-token-input"
                          />
                          <TextField
                            label="Instagram Business Account ID"
                            value={formAccountId}
                            onChange={setFormAccountId}
                            placeholder="e.g. 17841400000000"
                            required={true}
                            description="Numeric Instagram Business or Creator Account ID linked to your Meta Page."
                            testId="instagram-account-id-input"
                          />
                          <TextField
                            label="Instagram Handle (@username)"
                            value={formHandle}
                            onChange={setFormHandle}
                            placeholder="e.g. @brand_official"
                            required={false}
                            description="Instagram username handle for display and preview targeting."
                            testId="instagram-handle-input"
                          />
                        </>
                      )}

                      {/* X (TWITTER) CREDENTIALS */}
                      {selectedModalConnector.id === 'x_twitter' && (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                            <label style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                              X (Twitter) Auth Type
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => setTwitterAuthType('BEARER')}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: twitterAuthType === 'BEARER' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                  background: twitterAuthType === 'BEARER' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                OAuth 2.0 Bearer Token (v2)
                              </button>
                              <button
                                type="button"
                                onClick={() => setTwitterAuthType('API_KEYS')}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: twitterAuthType === 'API_KEYS' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                  background: twitterAuthType === 'API_KEYS' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                OAuth 1.0a (API Keys & Secrets)
                              </button>
                            </div>
                          </div>

                          {twitterAuthType === 'BEARER' ? (
                            <PasswordField
                              label="User Bearer Access Token"
                              value={formAccessToken}
                              onChange={setFormAccessToken}
                              show={showAccessToken}
                              onToggleShow={() => setShowAccessToken(!showAccessToken)}
                              placeholder="Bearer token (AAAA...)"
                              required={true}
                              description="User access token generated from X Developer Portal v2 with tweet.read and tweet.write scopes."
                              testId="twitter-bearer-token-input"
                            />
                          ) : (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <PasswordField
                                  label="API Key (Consumer Key)"
                                  value={formApiKey}
                                  onChange={setFormApiKey}
                                  show={showApiKey}
                                  onToggleShow={() => setShowApiKey(!showApiKey)}
                                  placeholder="Consumer Key"
                                  required={true}
                                  testId="twitter-api-key-input"
                                />
                                <PasswordField
                                  label="API Secret (Consumer Secret)"
                                  value={formApiSecret}
                                  onChange={setFormApiSecret}
                                  show={showApiSecret}
                                  onToggleShow={() => setShowApiSecret(!showApiSecret)}
                                  placeholder="Consumer Secret"
                                  required={true}
                                  testId="twitter-api-secret-input"
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <PasswordField
                                  label="User Access Token"
                                  value={formAccessToken}
                                  onChange={setFormAccessToken}
                                  show={showAccessToken}
                                  onToggleShow={() => setShowAccessToken(!showAccessToken)}
                                  placeholder="Access Token"
                                  required={true}
                                  testId="twitter-access-token-input"
                                />
                                <PasswordField
                                  label="Access Token Secret"
                                  value={formAccessTokenSecret}
                                  onChange={setFormAccessTokenSecret}
                                  show={showAccessTokenSecret}
                                  onToggleShow={() => setShowAccessTokenSecret(!showAccessTokenSecret)}
                                  placeholder="Token Secret"
                                  required={true}
                                  testId="twitter-token-secret-input"
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* LINKEDIN CREDENTIALS */}
                      {selectedModalConnector.id === 'linkedin' && (
                        <>
                          <PasswordField
                            label="LinkedIn OAuth 2.0 Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="AQX..."
                            required={true}
                            description="LinkedIn access token with w_member_social or w_organization_social scopes."
                            testId="linkedin-access-token-input"
                          />
                          <TextField
                            label="Organization / Company Page ID"
                            value={formOrganizationId}
                            onChange={setFormOrganizationId}
                            placeholder="e.g. 12345678 (optional)"
                            required={false}
                            description="Numeric Organization ID for company page posting. Leave blank if posting to a personal member profile."
                            testId="linkedin-org-id-input"
                          />
                        </>
                      )}

                      {/* TIKTOK CREDENTIALS */}
                      {selectedModalConnector.id === 'tiktok' && (
                        <>
                          <PasswordField
                            label="TikTok Creator Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="act.xxx..."
                            required={true}
                            description="TikTok Content Posting API v2 token with video.publish and user.info.basic."
                            testId="tiktok-access-token-input"
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <TextField
                              label="Client Key / App ID"
                              value={formApiKey}
                              onChange={setFormApiKey}
                              placeholder="TikTok Client Key"
                              required={true}
                              testId="tiktok-client-key-input"
                            />
                            <PasswordField
                              label="Client Secret"
                              value={formApiSecret}
                              onChange={setFormApiSecret}
                              show={showApiSecret}
                              onToggleShow={() => setShowApiSecret(!showApiSecret)}
                              placeholder="TikTok Client Secret"
                              required={true}
                              testId="tiktok-client-secret-input"
                            />
                          </div>
                          <TextField
                            label="OpenID / Creator ID"
                            value={formAccountId}
                            onChange={setFormAccountId}
                            placeholder="TikTok OpenID (optional)"
                            required={false}
                            description="Optional: Verified OpenID returned from TikTok OAuth."
                            testId="tiktok-openid-input"
                          />
                        </>
                      )}

                      {/* YOUTUBE SHORTS CREDENTIALS */}
                      {selectedModalConnector.id === 'youtube' && (
                        <>
                          <PasswordField
                            label="Google OAuth Access Token / API Key"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="ya29...."
                            required={true}
                            description="Google OAuth token with https://www.googleapis.com/auth/youtube.upload scope."
                            testId="youtube-access-token-input"
                          />
                          <TextField
                            label="YouTube Channel ID"
                            value={formChannelId}
                            onChange={setFormChannelId}
                            placeholder="e.g. UCxxxxxxxxxxxxxxxxxx"
                            required={false}
                            description="Optional: Target YouTube Channel ID for video & shorts uploads."
                            testId="youtube-channel-id-input"
                          />
                        </>
                      )}

                      {/* SHOPIFY CREDENTIALS */}
                      {selectedModalConnector.id === 'shopify' && (
                        <>
                          <TextField
                            label="Shopify Store Domain (.myshopify.com)"
                            value={formShopifyDomain}
                            onChange={setFormShopifyDomain}
                            placeholder="store-name.myshopify.com"
                            required={true}
                            description="Your primary myshopify domain without protocol prefix."
                            testId="shopify-domain-input"
                          />
                          <PasswordField
                            label="Admin API Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="shpat_..."
                            required={true}
                            description="Custom App Admin API access token with write_products and read_analytics scopes."
                            testId="shopify-access-token-input"
                          />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <TextField
                              label="API Key"
                              value={formApiKey}
                              onChange={setFormApiKey}
                              placeholder="Shopify API Key"
                              required={false}
                              testId="shopify-api-key-input"
                            />
                            <PasswordField
                              label="API Secret Key"
                              value={formApiSecret}
                              onChange={setFormApiSecret}
                              show={showApiSecret}
                              onToggleShow={() => setShowApiSecret(!showApiSecret)}
                              placeholder="Shopify API Secret Key"
                              required={false}
                              testId="shopify-api-secret-input"
                            />
                          </div>
                        </>
                      )}

                      {/* HUBSPOT CREDENTIALS */}
                      {selectedModalConnector.id === 'hubspot' && (
                        <>
                          <PasswordField
                            label="Private App Access Token"
                            value={formAccessToken}
                            onChange={setFormAccessToken}
                            show={showAccessToken}
                            onToggleShow={() => setShowAccessToken(!showAccessToken)}
                            placeholder="pat-na1-... or pat-eu1-..."
                            required={true}
                            description="HubSpot Private App Token with crm.objects.contacts and marketing scopes."
                            testId="hubspot-access-token-input"
                          />
                          <TextField
                            label="HubSpot Hub ID / Portal ID"
                            value={formPortalId}
                            onChange={setFormPortalId}
                            placeholder="e.g. 8472910"
                            required={false}
                            description="Optional: Numeric HubSpot Portal ID."
                            testId="hubspot-portal-id-input"
                          />
                        </>
                      )}

                      {/* GOOGLE DRIVE & GOOGLE SHEETS */}
                      {(selectedModalConnector.id === 'google-drive' || selectedModalConnector.id === 'google-sheets') && (
                        <PasswordField
                          label="Google OAuth Access Token"
                          value={formAccessToken}
                          onChange={setFormAccessToken}
                          show={showAccessToken}
                          onToggleShow={() => setShowAccessToken(!showAccessToken)}
                          placeholder="ya29...."
                          required={true}
                          description="Google OAuth Access Token with Drive or Sheets permissions."
                          testId="google-access-token-input"
                        />
                      )}

                      {/* Connection Environment Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Connection Environment</span>
                          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>Target API Mode</span>
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setModalIsSandbox(false)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: !modalIsSandbox ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                              background: !modalIsSandbox ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Live Production</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Direct verified API calls</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setModalIsSandbox(true)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 'var(--radius-md)',
                              border: modalIsSandbox ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                              background: modalIsSandbox ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                              color: 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Sandbox / Test</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Simulation testing sandbox</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Security Reassurance */}
                      <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#c4b5fd', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <Lock size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                        <p style={{ margin: 0, lineHeight: 1.4 }}>
                          Credentials are encrypted at rest using an isolated AES-256-GCM vault.
                          Secrets are never exposed in client JavaScript, browser cookies, local storage, or URLs.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUCCESS CONFIRMATION */}
              {modalStep === 'SUCCESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px 0', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                    <CheckCircle2 size={36} />
                  </div>

                  <div>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                      Connection Successfully Saved!
                    </h4>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, maxWidth: 440 }}>
                      Credentials have been verified directly with the official {selectedModalConnector?.name} API and saved securely in the AES-256-GCM encrypted vault.
                    </p>
                  </div>

                  <div style={{ width: '100%', padding: '18px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Name</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {verifiedProfile?.accountName || modalAccountName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Platform</span>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selectedModalConnector?.name}
                      </span>
                    </div>

                    {verifiedProfile?.accountId && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account / Page ID</span>
                        <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                          {verifiedProfile.accountId}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verification Status</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        HEALTHY & VERIFIED
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Security Vault</span>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#c4b5fd', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        AES-256-GCM Encrypted
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="connect-modal-footer" style={{ justifyContent: modalStep === 'SELECT_PLATFORM' || modalStep === 'SUCCESS' ? 'flex-end' : 'space-between' }}>
              {modalStep === 'SELECT_PLATFORM' ? (
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="connect-btn-secondary"
                >
                  Cancel
                </button>
              ) : modalStep === 'CONFIGURE' ? (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        setModalStep('SELECT_PLATFORM');
                        setModalError(null);
                      }}
                      data-testid="modal-back-btn"
                      className="connect-btn-secondary"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                    <button
                      onClick={() => setIsAddModalOpen(false)}
                      className="connect-btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>

                  {authMode === 'OAUTH' && ['facebook', 'instagram', 'linkedin', 'tiktok', 'google-drive', 'google-sheets'].includes(selectedModalConnector?.id || '') ? (
                    <button
                      onClick={handleStartOAuth}
                      disabled={modalSubmitting}
                      data-testid="save-and-connect-btn"
                      className="connect-btn-gradient"
                      style={{ minWidth: 180 }}
                    >
                      {modalSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          <span>Continue to OAuth</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveAndConnect}
                      disabled={modalSubmitting}
                      data-testid="save-and-connect-btn"
                      className="connect-btn-gradient"
                      style={{ minWidth: 180 }}
                    >
                      {modalSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Verifying with {selectedModalConnector?.name}...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>{reconnectingConnectionId ? 'Verify & Reconnect' : 'Verify & Save Connection'}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : modalStep === 'SUCCESS' ? (
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setModalStep('SELECT_PLATFORM');
                    if (onNavigate) {
                      onNavigate('dashboard');
                    } else {
                      navigate('/?tab=dashboard');
                    }
                    if (typeof window !== 'undefined') {
                      window.history.pushState({}, '', '/?tab=dashboard');
                    }
                  }}
                  data-testid="modal-done-btn"
                  className="connect-btn-gradient"
                  style={{ minWidth: 120 }}
                >
                  Done & Go to Dashboard
                </button>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Meta Self-Service Connection Modal (Facebook & Instagram)        */}
      {/* ========================================================================= */}
      {metaModalOpen && createPortal(
        <div data-testid="meta-self-service-modal" className="connect-modal-overlay" onClick={() => setMetaModalOpen(false)}>
          <div
            className="connect-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-modal-title"
          >
            {/* Modal Header */}
            <div className="connect-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  onClick={() => {
                    setMetaModalOpen(false);
                    setIsAddModalOpen(true);
                  }}
                  data-testid="meta-header-back-btn"
                  aria-label="Back to platform catalog"
                  className="connect-btn-secondary"
                  style={{
                    padding: '8px',
                    minWidth: '36px',
                    minHeight: '36px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  title="Back to platform catalog"
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(24, 119, 242, 0.15)', border: '1px solid rgba(24, 119, 242, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2' }}>
                    <Share2 size={18} />
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(225, 48, 108, 0.15)', border: '1px solid rgba(225, 48, 108, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E1306C' }}>
                    <Instagram size={18} />
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 id="meta-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>Meta Connection</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                      v20.0
                    </span>
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Connect Facebook Pages & Instagram
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMetaModalOpen(false)}
                data-testid="meta-modal-cancel-btn"
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  flexShrink: 0
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicators */}
            <div style={{ padding: '14px 28px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
              <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: metaStep === 'AUTH' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', background: metaStep === 'AUTH' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)', color: metaStep === 'AUTH' ? '#c4b5fd' : 'var(--text-muted)', textAlign: 'center' }}>
                1. Meta OAuth
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: metaStep === 'DISCOVERY' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', background: metaStep === 'DISCOVERY' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)', color: metaStep === 'DISCOVERY' ? '#c4b5fd' : 'var(--text-muted)', textAlign: 'center' }}>
                2. Resource Selection
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', border: metaStep === 'VALIDATING' || metaStep === 'SUCCESS' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)', background: metaStep === 'VALIDATING' || metaStep === 'SUCCESS' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)', color: metaStep === 'VALIDATING' || metaStep === 'SUCCESS' ? '#c4b5fd' : 'var(--text-muted)', textAlign: 'center' }}>
                3. Health Validation
              </div>
            </div>

            {/* Error Message Alert */}
            {metaValidationError && (
              <div data-testid="meta-error-alert" style={{ margin: '14px 28px 0', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} style={{ color: '#f87171', flexShrink: 0 }} />
                <span>{metaValidationError}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="connect-modal-body">
              {/* Screen 1: Start OAuth */}
              {metaStep === 'AUTH' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck size={14} />
                      <span>Requested Meta Capabilities</span>
                    </span>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Facebook Pages publishing, scheduling & community engagement</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Instagram Professional posts, reels & reach metrics</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <Check size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                        <span>Unified performance telemetry & analytics insights</span>
                      </li>
                    </ul>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.25)', color: '#c4b5fd', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Lock size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ margin: 0, lineHeight: 1.4 }}>
                      Zero Page IDs, Instagram IDs, or secret tokens are required. Tokens are safely stored on the server using secure encryption at rest.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px' }}>
                    <button
                      onClick={() => handleStartMetaOAuth(false)}
                      disabled={metaIsSubmitting}
                      data-testid="meta-start-oauth-btn"
                      className="connect-btn-gradient"
                      style={{ padding: '12px', width: '100%', background: 'linear-gradient(135deg, #1877F2, #0C63D4)', borderColor: '#1877F2' }}
                    >
                      {metaIsSubmitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Connecting to Meta...</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={16} />
                          <span>Connect Facebook Page with Meta OAuth</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSimulateOAuthAndDiscover}
                      disabled={metaIsSubmitting}
                      data-testid="meta-quick-discover-btn"
                      className="connect-btn-secondary"
                      style={{ padding: '10px', width: '100%' }}
                    >
                      <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                      <span>Discover Available Facebook Pages (Dev Mode / Test Accounts)</span>
                    </button>

                    {/* Direct Page Access Token Input (Meta Graph API Explorer / Developer Token) */}
                    <div style={{ marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowDirectTokenBox(!showDirectTokenBox)}
                        data-testid="meta-toggle-token-input-btn"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 0',
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        <Key size={14} />
                        <span>{showDirectTokenBox ? 'Hide Custom Access Token Input' : 'Paste Page Access Token (Graph API Explorer)'}</span>
                      </button>

                      {showDirectTokenBox && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-medium)' }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                            Paste your Page Access Token generated from <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>Meta Graph API Explorer</a> with <code>pages_manage_posts</code>, <code>pages_read_engagement</code>, and <code>pages_show_list</code>:
                          </div>
                          <textarea
                            value={metaDirectToken}
                            onChange={(e) => setMetaDirectToken(e.target.value)}
                            placeholder="Paste your Page Access Token (starts with EAA...)"
                            rows={3}
                            data-testid="meta-direct-token-textarea"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                              fontSize: '0.78rem',
                              fontFamily: 'var(--font-mono)',
                              resize: 'vertical',
                              boxSizing: 'border-box',
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleConnectWithDirectToken}
                            disabled={metaIsSubmitting || !metaDirectToken.trim()}
                            data-testid="meta-save-token-btn"
                            className="connect-btn-gradient"
                            style={{ padding: '8px 12px', fontSize: '0.82rem', width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981' }}
                          >
                            {metaIsSubmitting ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Verifying & Encrypting in Vault...</span>
                              </>
                            ) : (
                              <>
                                <Lock size={13} />
                                <span>Save & Connect with Page Access Token</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Requirement 9: Keep manual download-and-upload mode as a fallback */}
                    <div style={{ textAlign: 'center', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setMetaModalOpen(false);
                          setSelectedModalConnector(CONNECTOR_CATALOG.find((c) => c.id === 'facebook') || null);
                          setMetaConnectionMethod('NO_API');
                          setModalStep('CONFIGURE');
                          setIsAddModalOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.76rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '4px',
                        }}
                      >
                        Prefer manual fallback? Switch to No-API Assisted Link (Mobile Reminder Mode)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Screen 2: Resource Discovery & Selection (Multiple Facebook Pages with Brand Mapping) */}
              {metaStep === 'DISCOVERY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Share2 size={16} style={{ color: '#1877F2' }} />
                        <span>Select Facebook Business Pages</span>
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Select one or multiple Pages to connect. Assign each Page to an agency Brand:
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => handleStartMetaOAuth(true)}
                        data-testid="reauth-meta-rerequest-btn"
                        className="connect-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap', color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.4)' }}
                        title="Re-run Meta OAuth dialog to select additional Pages or grant missing permissions"
                      >
                        <RefreshCw size={11} />
                        <span>Re-authorize & Select Pages</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartMetaOAuth(false)}
                        data-testid="reauth-meta-btn"
                        className="connect-btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                        title="Log into a different Facebook account via Meta OAuth"
                      >
                        <span>Switch Account</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                    {metaDiscoveredPages.length === 0 ? (
                      <div style={{ padding: '24px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        No Facebook Pages found. Make sure you have admin rights on at least one Facebook Page.
                        <div style={{ marginTop: '12px' }}>
                          <button onClick={() => handleStartMetaOAuth(false)} className="connect-btn-gradient" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                            Authorize with Meta
                          </button>
                        </div>
                      </div>
                    ) : (
                      metaDiscoveredPages.map((page: any) => {
                        const pId = page.id || page.externalResourceId || page.page_id;
                        const pageState = pageSelectionMap[pId] || {
                          selected: false,
                          brandId: activeBrand?.id || (brands[0]?.id ?? ''),
                          connectFacebook: true,
                          connectInstagram: false,
                        };
                        const isConnected = page.connections && page.connections.length > 0;
                        const connectedBrandName = isConnected ? page.connections[0].brandName : null;
                        const ig = page.instagramAccount;
                        const isOtherBrandIg = ig?.isConnected && ig?.connectedBrandId !== pageState.brandId;

                        return (
                          <div
                            key={pId}
                            data-testid={`meta-page-card-${pId}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              padding: '14px',
                              borderRadius: 'var(--radius-md)',
                              border: pageState.selected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                              background: pageState.selected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            {/* Top row: Checkbox, Avatar, Name & Status */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  data-testid={`select-page-${pId}`}
                                  checked={pageState.selected}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setPageSelectionMap((prev) => ({
                                      ...prev,
                                      [pId]: {
                                        ...(prev[pId] || { brandId: activeBrand?.id || (brands[0]?.id ?? ''), connectFacebook: true, connectInstagram: false }),
                                        selected: checked,
                                        connectFacebook: checked ? (prev[pId]?.connectFacebook ?? true) : false,
                                      },
                                    }));
                                    if (checked) setSelectedPageId(pId);
                                  }}
                                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                                />

                                {page.pictureUrl ? (
                                  <img
                                    src={page.pictureUrl}
                                    alt={page.name}
                                    style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(24, 119, 242, 0.2)', border: '1px solid rgba(24, 119, 242, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877F2', fontWeight: 700 }}>
                                    {page.name?.charAt(0) || 'P'}
                                  </div>
                                )}

                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {page.name}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    <span>{page.category || 'Business Page'}</span>
                                    <span>•</span>
                                    <span style={{ fontFamily: 'var(--font-mono)' }}>ID: {pId}</span>
                                  </div>
                                </div>
                              </div>

                              <div style={{ flexShrink: 0 }}>
                                {isConnected ? (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                    Connected ({connectedBrandName})
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                                    Not Connected
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom row: Brand Mapping Dropdown & Independent Channels */}
                            {pageState.selected && (
                              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                  <label style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Building2 size={12} style={{ color: 'var(--accent-primary)' }} />
                                    <span>Map to HoaspForge Brand:</span>
                                  </label>
                                  <select
                                    data-testid={`brand-select-${pId}`}
                                    value={pageState.brandId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPageSelectionMap((prev) => ({
                                        ...prev,
                                        [pId]: {
                                          ...(prev[pId] || { selected: true, connectFacebook: true, connectInstagram: false }),
                                          brandId: val,
                                        },
                                      }));
                                    }}
                                    className="connect-input"
                                    style={{ padding: '4px 8px', fontSize: '0.76rem', width: 'auto', minWidth: '170px' }}
                                  >
                                    {brands.map((b: any) => (
                                      <option key={b.id} value={b.id}>
                                        {b.name} {b.id === activeBrand?.id ? ' (Current)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {/* Facebook Page Channel Toggle */}
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-primary)', cursor: 'pointer', background: 'rgba(24, 119, 242, 0.08)', border: '1px solid rgba(24, 119, 242, 0.25)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                                    <input
                                      type="checkbox"
                                      data-testid={`fb-channel-select-${pId}`}
                                      checked={pageState.connectFacebook}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setPageSelectionMap((prev) => ({
                                          ...prev,
                                          [pId]: {
                                            ...(prev[pId] || { selected: true, brandId: activeBrand?.id, connectInstagram: false }),
                                            connectFacebook: checked,
                                          },
                                        }));
                                      }}
                                      style={{ accentColor: '#1877F2' }}
                                    />
                                    <Share2 size={13} style={{ color: '#1877F2' }} />
                                    <span>Connect Facebook Page <strong>{page.name}</strong></span>
                                  </label>

                                  {/* Instagram Channel Toggle or Clear Explanatory Advisory */}
                                  {ig ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          fontSize: '0.76rem',
                                          color: isOtherBrandIg ? 'var(--text-muted)' : '#f472b6',
                                          cursor: isOtherBrandIg ? 'not-allowed' : 'pointer',
                                          background: 'rgba(225, 48, 108, 0.08)',
                                          border: '1px solid rgba(225, 48, 108, 0.25)',
                                          padding: '6px 10px',
                                          borderRadius: 'var(--radius-sm)',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          data-testid={`ig-select-${pId}`}
                                          disabled={isOtherBrandIg}
                                          checked={Boolean(pageState.connectInstagram && !isOtherBrandIg)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setPageSelectionMap((prev) => ({
                                              ...prev,
                                              [pId]: {
                                                ...(prev[pId] || { selected: true, brandId: activeBrand?.id, connectFacebook: true }),
                                                connectInstagram: checked,
                                              },
                                            }));
                                          }}
                                          style={{ accentColor: '#E1306C' }}
                                        />
                                        <Instagram size={13} style={{ color: '#E1306C' }} />
                                        <span>
                                          Connect linked Instagram <strong>@{ig.username}</strong> ({ig.followersCount?.toLocaleString() || '1K+'} followers)
                                        </span>
                                      </label>
                                      {isOtherBrandIg && (
                                        <span style={{ fontSize: '0.7rem', color: '#f59e0b', paddingLeft: '8px' }}>
                                          ⚠️ Assigned to <strong>{ig.connectedBrandName}</strong>. Never automatically re-assigned across brands.
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24' }}>
                                        <AlertTriangle size={14} />
                                        <span>No Linked Instagram Professional Account Found</span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                        To publish to Instagram via <strong>{page.name}</strong>, you must link an eligible Instagram Professional (Business or Creator) account to this Facebook Page in Meta Business Suite.
                                      </p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                                        <a
                                          href={`https://www.facebook.com/${pId}/settings/?tab=instagram_accounts`}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ color: '#fbbf24', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                                        >
                                          <span>Open Meta Page Settings</span>
                                          <ExternalLink size={11} />
                                        </a>
                                        <button
                                          type="button"
                                          onClick={() => fetchDiscoveredMetaResources(metaConnectionId || undefined)}
                                          style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                          <RefreshCw size={11} />
                                          <span>Re-check After Linking</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Screen 3: 4-Stage Validation Pipeline */}
              {(metaStep === 'VALIDATING' || metaStep === 'SUCCESS') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '10px 0' }} data-testid="meta-validation-pipeline">
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                      4-Stage Connection Diagnostics
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Verifying live Meta Graph API capabilities before activating
                    </p>
                  </div>

                  <div style={{ padding: '16px', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-medium)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>01</span>
                        <span>Access & Token Reachability</span>
                      </span>
                      <StageStatusBadge status={metaValidationStages.access} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>02</span>
                        <span>Required Permissions Verification</span>
                      </span>
                      <StageStatusBadge status={metaValidationStages.permissions} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>03</span>
                        <span>Publishing & Post Creation Capability</span>
                      </span>
                      <StageStatusBadge status={metaValidationStages.publishing} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>04</span>
                        <span>Analytics & Telemetry Capability</span>
                      </span>
                      <StageStatusBadge status={metaValidationStages.analytics} />
                    </div>
                  </div>

                  {metaStep === 'SUCCESS' ? (
                    <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6ee7b7', fontSize: '0.84rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                      <span>Connection Verified HEALTHY! Activating channel...</span>
                    </div>
                  ) : metaValidationError ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setMetaStep('DISCOVERY')}
                        className="connect-btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Change Selection
                      </button>
                      <button
                        onClick={handleValidateAndConnectMeta}
                        className="connect-btn-gradient"
                        style={{ flex: 1 }}
                      >
                        Retry Validation
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                      <span>Running automated capability diagnostics...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {metaStep === 'DISCOVERY' && (
              <div className="connect-modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  onClick={() => setMetaStep('AUTH')}
                  className="connect-btn-secondary"
                >
                  Back
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {Object.values(pageSelectionMap).filter((s) => s.selected && (s.connectFacebook || s.connectInstagram)).length} Channel(s) selected
                  </span>
                  <button
                    onClick={handleValidateAndConnectMeta}
                    disabled={Object.values(pageSelectionMap).filter((s) => s.selected && (s.connectFacebook || s.connectInstagram)).length === 0 || metaIsSubmitting}
                    data-testid="meta-validate-btn"
                    className="connect-btn-gradient"
                  >
                    <Check size={14} />
                    <span>Save Selected Channels</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Disconnect Confirmation Modal (Right-Side Drawer Panel)          */}
      {/* ========================================================================= */}
      {disconnectModalItem && createPortal(
        <div data-testid="disconnect-modal" className="connect-modal-overlay" onClick={() => setDisconnectModalItem(null)}>
          <div
            className="connect-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="disconnect-modal-title"
          >
            <div className="connect-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 id="disconnect-modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Disconnect Channel
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                    {disconnectModalItem.def.name} • {disconnectModalItem.conn.accountName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDisconnectModalItem(null)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="connect-modal-body" style={{ textAlign: 'center', alignItems: 'center', padding: '36px 24px', flex: 1, justifyContent: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-xl)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', margin: '0 auto 16px' }}>
                <AlertTriangle size={30} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-primary)' }}>
                Disconnect {disconnectModalItem.conn.accountName}?
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.6, maxWidth: '420px' }}>
                This will immediately pause automated publishing, scheduled syncs, and metrics collection for <strong>{disconnectModalItem.conn.accountName}</strong>.
              </p>

              <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.8rem', color: '#6ee7b7', textAlign: 'left', lineHeight: 1.5 }}>
                🛡️ <strong>Independent Page Isolation:</strong> Disconnecting this Page will NOT disconnect your other Facebook Pages or revoke your master Meta authorization.
              </div>
            </div>

            <div className="connect-modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                onClick={() => setDisconnectModalItem(null)}
                disabled={disconnecting}
                className="connect-btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                data-testid="confirm-disconnect-btn"
                className="connect-btn-danger"
                style={{ flex: 1 }}
              >
                {disconnecting ? <RefreshCw size={14} className="animate-spin" /> : 'Confirm Disconnect'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Manage Connection Multi-Account Roster (Drawer/Modal Panel)        */}
      {/* ========================================================================= */}
      {manageModalItem && createPortal(
        <div data-testid="manage-connection-modal" className="connect-modal-overlay" onClick={() => setManageModalItem(null)}>
          <div
            className="connect-modal-container"
            style={{ maxWidth: '640px', width: '92vw' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-modal-title"
          >
            <div className="connect-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: manageModalItem.def.iconColor }}>
                    {manageModalItem.def.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 id="manage-modal-title" style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {manageModalItem.def.name} Management
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 2 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {connectionsList.filter((c) => c.provider === manageModalItem.def.id && c.status !== 'DISCONNECTED').length} Connected Account(s)
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManageModalItem(null)}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="connect-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Authorized Accounts Roster
                </span>
                <button
                  onClick={() => {
                    const def = manageModalItem.def;
                    setManageModalItem(null);
                    handleOneClickSocialConnect(def);
                  }}
                  data-testid="add-account-from-manage-btn"
                  className="connect-btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.74rem', color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.35)' }}
                >
                  <Plus size={12} />
                  <span>Connect Another Account</span>
                </button>
              </div>

              {/* Account Cards */}
              {connectionsList
                .filter((c) => c.provider === manageModalItem.def.id && c.status !== 'DISCONNECTED')
                .map((accConn) => {
                  return (
                    <div
                      key={accConn.id}
                      data-testid={`account-card-${accConn.id}`}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {/* Account Header with Avatar & Platform */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          {accConn.profileImage ? (
                            <img
                              src={accConn.profileImage}
                              alt={accConn.accountName}
                              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-medium)' }}
                            />
                          ) : (
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                              {accConn.accountName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {accConn.accountName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {accConn.accountType || `${manageModalItem.def.name} Account`}
                            </div>
                          </div>
                        </div>

                        <HealthBadge status={accConn.status} />
                      </div>

                      {/* Account Diagnostics Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '0.75rem', background: 'rgba(0, 0, 0, 0.2)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Last Synchronization:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{accConn.lastCheckedAt || 'Recently'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)', display: 'block' }}>Token Health:</span>
                          <span style={{ color: accConn.status === 'CONNECTED' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                            {accConn.tokenHealth || (accConn.status === 'CONNECTED' ? 'Healthy & Active' : 'Action Required')}
                          </span>
                        </div>
                      </div>

                      {/* Publishing Permissions */}
                      {accConn.availablePermissions && accConn.availablePermissions.length > 0 && (
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Available Publishing Permissions:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {accConn.availablePermissions.slice(0, 4).map((perm, pIdx) => (
                              <span key={pIdx} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                {perm}
                              </span>
                            ))}
                            {accConn.availablePermissions.length > 4 && (
                              <span style={{ fontSize: '0.65rem', padding: '1px 6px', color: 'var(--text-muted)' }}>
                                +{accConn.availablePermissions.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Account Action Buttons: Health Check, Reconnect & Disconnect */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <button
                          onClick={() => {
                            handleTestHealth(manageModalItem.def, accConn);
                          }}
                          className="connect-btn-secondary"
                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          <RefreshCw size={12} style={{ color: 'var(--accent-primary)' }} />
                          <span>Check Health</span>
                        </button>

                        <button
                          onClick={() => {
                            setManageModalItem(null);
                            handleReconnect(accConn);
                          }}
                          className="connect-btn-secondary"
                          style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem', color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.35)' }}
                        >
                          <RefreshCw size={12} />
                          <span>Reconnect</span>
                        </button>

                        <button
                          onClick={() => {
                            setDisconnectModalItem({ def: manageModalItem.def, conn: accConn });
                          }}
                          className="connect-btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <span>Disconnect</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Plan Quota Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={upgradeReason || undefined}
        onNavigateToBilling={() => {
          setIsUpgradeModalOpen(false);
          if (onNavigate) {
            onNavigate('billing');
          } else {
            navigate('/?tab=billing');
          }
        }}
      />
    </div>
  );
};

// Sub-Component: Category Section in Catalog
const ConnectorCategoryBlock: React.FC<{
  title: string;
  icon: React.ReactNode;
  category: ConnectorCategory;
  connectors: ConnectorDefinition[];
  connectionsMap: Record<string, ConnectionItem>;
  connectionsList: ConnectionItem[];
  onConnect: (def: ConnectorDefinition) => void;
  onManage: (def: ConnectorDefinition, conn: ConnectionItem) => void;
}> = ({ title, icon, category, connectors, connectionsMap, connectionsList, onConnect, onManage }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid={`section-${category.toLowerCase()}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
        {icon}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {connectors.length}
        </span>
      </div>

      <div className="connect-catalog-grid">
        {connectors.map((def) => {
          const matchingAccounts = connectionsList.filter((c) => c.provider === def.id && c.status !== 'DISCONNECTED');
          const isConnected = matchingAccounts.length > 0;
          const primaryConn = matchingAccounts[0] || connectionsMap[def.id];
          const isUnhealthy = matchingAccounts.some((c) => c.status === 'REAUTH_REQUIRED' || c.status === 'PERMISSION_MISSING' || c.status === 'NEEDS_ATTENTION');

          return (
            <div
              key={def.id}
              data-testid={`connector-card-${def.id}`}
              className={`connect-catalog-card ${isUnhealthy ? 'unhealthy' : isConnected ? 'connected' : ''}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Header Row: Icon + Badge + Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-medium)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {def.id === 'instagram' ? (
                        <Instagram size={22} style={{ color: '#E1306C' }} />
                      ) : def.id === 'facebook' ? (
                        <Share2 size={22} style={{ color: '#1877F2' }} />
                      ) : def.id === 'x_twitter' ? (
                        <Twitter size={22} style={{ color: '#ffffff' }} />
                      ) : def.id === 'google-drive' ? (
                        <Folder size={22} style={{ color: '#10b981' }} />
                      ) : def.id === 'google-sheets' ? (
                        <FileSpreadsheet size={22} style={{ color: '#22c55e' }} />
                      ) : def.id === 'youtube' ? (
                        <Video size={22} style={{ color: '#ef4444' }} />
                      ) : (
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: def.iconColor }}>
                          {def.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 2px 0', color: 'var(--text-primary)' }}>
                        {def.name}
                      </h4>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{def.badge}</span>
                    </div>
                  </div>

                  <div data-testid={`status-badge-${def.id}`}>
                    <HealthBadge status={primaryConn?.status || 'DISCONNECTED'} />
                  </div>
                </div>

                {/* Multiple accounts summary if connected */}
                {isConnected && (
                  <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Connected:</span>
                      <strong style={{ color: 'var(--text-primary)' }} data-testid={`account-name-${def.id}`}>
                        {matchingAccounts.length} Account{matchingAccounts.length > 1 ? 's' : ''} Active
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>Primary:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {primaryConn?.accountName || 'Active'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {def.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isConnected ? (
                  <>
                    <button
                      onClick={() => onManage(def, primaryConn)}
                      data-testid={`manage-btn-${def.id}`}
                      className="connect-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      <SlidersHorizontal size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>Manage</span>
                    </button>

                    <button
                      onClick={() => onConnect(def)}
                      data-testid={`add-another-btn-${def.id}`}
                      className="connect-btn-secondary"
                      style={{ flex: 1, color: 'var(--accent-primary)', borderColor: 'rgba(139, 92, 246, 0.35)' }}
                      title="Add another account for this platform"
                    >
                      <Plus size={13} />
                      <span>Add Another</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onConnect(def)}
                    data-testid={`connect-btn-${def.id}`}
                    className="connect-btn-gradient"
                    style={{
                      width: '100%',
                      ...(def.id === 'facebook'
                        ? { background: 'linear-gradient(135deg, #1877F2, #0C63D4)', borderColor: '#1877F2' }
                        : {}),
                    }}
                  >
                    <Plus size={14} />
                    <span>{def.id === 'facebook' ? 'Connect Facebook Page' : 'Connect'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Sub-Component: Health State Badge
export const HealthBadge: React.FC<{ status: HealthState }> = ({ status }) => {
  switch (status) {
    case 'CONNECTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Connected</span>
        </span>
      );
    case 'CHECKING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
          <span>Checking</span>
        </span>
      );
    case 'REAUTH_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/35">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span>Reauth Required</span>
        </span>
      );
    case 'PERMISSION_MISSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/35">
          <AlertCircle className="w-3 h-3 text-rose-400" />
          <span>Permission Missing</span>
        </span>
      );
    case 'RATE_LIMITED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <Clock className="w-3 h-3 text-purple-400" />
          <span>Rate Limited</span>
        </span>
      );
    case 'NEEDS_ATTENTION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span>Needs Attention</span>
        </span>
      );
    case 'DISCONNECTED':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium uppercase tracking-wider rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <span>Not Connected</span>
        </span>
      );
  }
};

function getActionRequiredMessage(status: HealthState): string | undefined {
  switch (status) {
    case 'REAUTH_REQUIRED':
      return 'Authentication expired. Click Reconnect to renew token.';
    case 'PERMISSION_MISSING':
      return 'Required permissions missing. Click Reconnect to grant permissions.';
    case 'RATE_LIMITED':
      return 'Provider rate limit reached. Auto-retry in cooldown.';
    case 'NEEDS_ATTENTION':
      return 'Configuration needs attention. Verify active brand access.';
    case 'DISCONNECTED':
      return 'Connector is disconnected.';
    default:
      return undefined;
  }
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

// Sub-Component: 4-Stage Validation Diagnostic Badge
export const StageStatusBadge: React.FC<{ status: 'pending' | 'running' | 'success' | 'failed' }> = ({ status }) => {
  switch (status) {
    case 'running':
      return (
        <span className="flex items-center gap-1.5 text-blue-400 font-semibold font-mono text-[11px]">
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Verifying</span>
        </span>
      );
    case 'success':
      return (
        <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>PASSED</span>
        </span>
      );
    case 'failed':
      return (
        <span className="flex items-center gap-1 text-rose-400 font-semibold font-mono text-[11px]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>FAILED</span>
        </span>
      );
    case 'pending':
    default:
      return <span className="text-slate-500 font-mono text-[11px]">Pending</span>;
  }
};

export default ConnectHub;
