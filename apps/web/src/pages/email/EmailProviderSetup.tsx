import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail,
  Send,
  Cloud,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Server,
  Zap,
  RefreshCw,
  Key,
  Globe,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Settings,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../../services/api.js';

// =========================================================================
// 1. PROVIDER DEFINITIONS WITH QUALIFIED SENDING LIMITS
// =========================================================================
export interface ProviderDefinition {
  id: 'ses' | 'sendgrid' | 'brevo' | 'mailgun' | 'gmail' | 'smtp';
  name: string;
  tagline: string;
  shortDesc: string;
  category: string;
  suitability: string;
  badge?: string;
  isRecommended?: boolean;
  sendingLimits: string;
  description: string;
  bestFor: string;
  docsUrl: string;
  brandColor: string;
}

export const EMAIL_PROVIDERS: ProviderDefinition[] = [
  {
    id: 'ses',
    name: 'Amazon SES',
    tagline: 'Ultra cost-effective infrastructure for high-volume email campaigns',
    shortDesc: 'Recommended for high-volume campaigns.',
    category: 'Cloud Bulk Engine',
    suitability: 'Scales to 50k+/day (on AWS approval)',
    badge: 'Recommended for Bulk',
    isRecommended: true,
    sendingLimits: 'Scales to 50,000+ / day (based on AWS tier)',
    description: 'High-deliverability cloud email infrastructure by Amazon Web Services. Pay only for what you send.',
    bestFor: 'Large email lists, weekly newsletters, and high-volume broadcasts.',
    docsUrl: 'https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html',
    brandColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    tagline: 'Enterprise-grade cloud email platform powered by Twilio',
    shortDesc: 'Reliable business email delivery.',
    category: 'Cloud Delivery',
    suitability: 'Up to 40k+/day (plan dependent)',
    badge: 'Popular Choice',
    isRecommended: true,
    sendingLimits: 'Typically 40,000+ / day (based on account plan)',
    description: 'Reliable business delivery engine with reputation monitoring, automated warmup, and deep placement telemetry.',
    bestFor: 'Marketing campaigns, transactional updates, and commercial business broadcasts.',
    docsUrl: 'https://app.sendgrid.com/settings/api_keys',
    brandColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'brevo',
    name: 'Brevo',
    tagline: 'European deliverability engine with straightforward API setup',
    shortDesc: 'Email marketing and automation.',
    category: 'Marketing & CRM',
    suitability: 'Up to 10k+/day (plan dependent)',
    badge: 'EU Deliverability',
    isRecommended: false,
    sendingLimits: 'Typically 10,000+ / day (based on account plan)',
    description: 'User-friendly European platform with built-in GDPR compliance and dedicated IP options.',
    bestFor: 'SMB marketing broadcasts, promotional campaigns, and EU-compliant outreach.',
    docsUrl: 'https://app.brevo.com/settings/keys/api',
    brandColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    tagline: 'Developer-friendly transactional and bulk email delivery engine',
    shortDesc: 'Developer-friendly email delivery.',
    category: 'Developer API',
    suitability: 'Up to 10k+/day (plan dependent)',
    badge: 'Developer Friendly',
    isRecommended: false,
    sendingLimits: 'Typically 10,000+ / day (based on account plan)',
    description: 'Robust email API platform with advanced recipient validation, routing rules, and detailed server logs.',
    bestFor: 'SaaS platforms, developer teams, and automated customer marketing sequences.',
    docsUrl: 'https://app.mailgun.com/app/account/security/api_keys',
    brandColor: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: 'gmail',
    name: 'Gmail / Google Workspace',
    tagline: 'Connect your business Google Workspace or personal Gmail',
    shortDesc: 'Testing and low-volume sending.',
    category: 'Workspace Mailbox',
    suitability: '500 – 2,000/day (Google limits)',
    badge: 'Limited Sending',
    isRecommended: false,
    sendingLimits: '500 – 2,000 / day (Google Account limits)',
    description: 'Fast setup for small teams. Subject to strict Google account daily thresholds (not suitable for 100k mass campaigns).',
    bestFor: 'Testing campaigns, early-stage startups, and low-volume team outreach.',
    docsUrl: 'https://myaccount.google.com/apppasswords',
    brandColor: 'text-red-500 bg-red-500/10 border-red-500/20',
  },
  {
    id: 'smtp',
    name: 'Custom SMTP',
    tagline: 'Connect Outlook 365, Zoho Mail, Postmark, or private mail server',
    shortDesc: 'Connect your existing mail server.',
    category: 'Private Mail Server',
    suitability: 'Server & host dependent',
    badge: 'Custom Server',
    isRecommended: false,
    sendingLimits: 'Dependent on your server configuration',
    description: 'Standard RFC-compliant SMTP integration with custom hostname, port, and security protocols.',
    bestFor: 'Companies with existing corporate mailboxes or dedicated private mail servers.',
    docsUrl: '',
    brandColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
];

// Helper to render official provider logo
export const ProviderLogo: React.FC<{ providerId: string; className?: string }> = ({ providerId, className = 'w-6 h-6' }) => {
  if (providerId === 'gmail') {
    return (
      <svg className={className} viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
    );
  }
  if (providerId === 'ses') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"
          fill="#FF9900"
        />
        <path
          d="M7 14.5l3.2-3.2 2.3 2.3 4.5-4.6"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (providerId === 'sendgrid') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 9.5L12 12L22 4.5L12 2Z" fill="#008BE5" />
        <path d="M12 12L2 9.5V17L12 22V12Z" fill="#0071C2" />
        <path d="M12 12V22L22 14.5L12 12Z" fill="#1A9FFF" />
      </svg>
    );
  }
  if (providerId === 'brevo') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path
          d="M13 2.5L4.5 13.5H12L11 21.5L19.5 10.5H12L13 2.5Z"
          fill="#0B996F"
        />
      </svg>
    );
  }
  if (providerId === 'mailgun') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="3" fill="#FA4D56" />
        <path
          d="M3 6L12 13.5L21 6"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="6" rx="2" stroke="#8B5CF6" strokeWidth="2" fill="#8B5CF6" fillOpacity="0.15" />
      <rect x="3" y="14" width="18" height="6" rx="2" stroke="#8B5CF6" strokeWidth="2" fill="#8B5CF6" fillOpacity="0.15" />
      <circle cx="6.5" cy="7" r="1.25" fill="#8B5CF6" />
      <circle cx="6.5" cy="17" r="1.25" fill="#8B5CF6" />
      <line x1="15" y1="7" x2="18" y2="7" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="17" x2="18" y2="17" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

// =========================================================================
// 2. DASHBOARD EXPERIENCE CARD (Centered max-w-6xl layout)
// Displays clean 3 states: Not Connected, Connected, Action Required
// =========================================================================
export interface EmailServiceDashboardCardProps {
  espConfig: any;
  onOpenDrawer: (preselectedProviderId?: string) => void;
  onTestConnection: () => void;
  onDisconnect: () => void;
  loading?: boolean;
}

export const EmailServiceDashboardCard: React.FC<EmailServiceDashboardCardProps> = ({
  espConfig,
  onOpenDrawer,
  onTestConnection,
  onDisconnect,
  loading = false,
}) => {
  const isLive = Boolean(espConfig?.isLiveDelivery || espConfig?.connectionState === 'CONNECTED');
  const connectionState = espConfig?.connectionState || (isLive ? 'CONNECTED' : 'NOT_CONNECTED');
  const isConnected = connectionState === 'CONNECTED' || isLive;
  const activeProvId = (espConfig?.config?.provider as ProviderDefinition['id']) || (espConfig?.activeProvider as ProviderDefinition['id']) || 'ses';
  const provider = EMAIL_PROVIDERS.find((p) => p.id === activeProvId) || EMAIL_PROVIDERS[0];
  const domain = espConfig?.config?.domain || (espConfig?.config?.fromEmail ? espConfig.config.fromEmail.split('@')[1] : '');
  const senderEmail = espConfig?.config?.fromEmail || espConfig?.config?.smtpUser || '';

  // Netflix-inspired interactive card selection state
  const [selectedCardId, setSelectedCardId] = useState<string>(activeProvId || 'ses');

  // STATE A: CONNECTED & READY
  if (connectionState === 'CONNECTED' && isLive) {
    return (
      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-xs">
                <ProviderLogo providerId={provider.id} className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {provider.name} Connected
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Dispatch Ready</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  HoaspForge automatically routes all marketing campaigns through your verified {provider.name} connection.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onTestConnection}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>Test Connection</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrawer(provider.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer shadow-xs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage Connection</span>
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Disconnect Email Provider"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sender Identity</span>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{senderEmail || 'Configured'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verified Domain</span>
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 truncate">{domain || 'Domain Verified'}</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sending Capacity</span>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{provider.sendingLimits}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE B: NOT CONNECTED (Netflix-Inspired Browsing Tile Grid)
  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Clean Premium Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-1.5 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-600/20">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Connect Your Email Service
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Connected: {provider.name} (Live Dispatch Ready)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>Not Connected (Sandbox Active)</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {isConnected
                ? `HoaspForge is securely connected to ${provider.name}. All campaigns transmit live via your verified sender.`
                : 'Connect once. Send future campaigns without repeating setup.'}
            </p>
          </div>

          {isConnected ? (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={onTestConnection}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: '#059669' }}
              >
                <Send className="w-4 h-4 text-white" />
                <span>Send Test Email (Live via {provider.name.toUpperCase()})</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenDrawer(activeProvId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenDrawer(selectedCardId || 'ses')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-md shadow-purple-500/25 transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Connect Email Provider</span>
            </button>
          )}
        </div>

        {/* 6 Elegant Compact Provider Cards */}
        <div>
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
              Supported Email Providers
            </span>
            <span className="text-slate-500 text-[11px]">
              Select any service to begin guided setup
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
            {EMAIL_PROVIDERS.map((prov) => {
              const isSelected = selectedCardId === prov.id;
              const isThisProvConnected = isConnected && prov.id === activeProvId;
              return (
                <div
                  key={prov.id}
                  onClick={() => setSelectedCardId(prov.id)}
                  className={`email-provider-card ${isSelected ? 'selected' : ''} ${isThisProvConnected ? 'border-emerald-500/50 dark:border-emerald-500/40 bg-emerald-500/[0.02]' : ''}`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: [Provider Logo]  Provider Name */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center shrink-0 shadow-xs">
                          <ProviderLogo providerId={prov.id} className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-semibold text-slate-900 dark:text-white leading-tight">
                            {prov.name}
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider block mt-0.5">
                            {prov.category}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isThisProvConnected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Connected</span>
                          </span>
                        )}
                        {isSelected && !isThisProvConnected && (
                          <span className="email-check-badge shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommendation badge placed separately below header */}
                    {prov.badge && (
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight ${
                          prov.isRecommended
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700'
                        }`}>
                          {prov.badge}
                        </span>
                      </div>
                    )}

                    {/* Description: 12px with natural wrapping below header */}
                    <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {prov.shortDesc}
                    </p>
                  </div>

                  {/* Card Footer: Provider suitability | Connect / Connected → */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[190px]" title={prov.suitability}>
                      {prov.suitability}
                    </span>
                    {isThisProvConnected ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardId(prov.id);
                          onOpenDrawer(prov.id);
                        }}
                        className="email-connected-btn"
                        title="Connected - Click to manage settings"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Connected</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCardId(prov.id);
                          onOpenDrawer(prov.id);
                        }}
                        className={`email-connect-btn ${isSelected ? 'active' : ''}`}
                      >
                        <span>Connect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 3. GUIDED CONFIGURATION PANEL (Right-Side Drawer on Desktop / Full Screen on Mobile)
// =========================================================================
export interface EmailProviderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeBrand: any;
  user: any;
  espConfig: any;
  onConfigSaved: () => void;
  onLaunchCampaignWizard?: () => void;
  initialProviderId?: string;
  initialStep?: number;
}

export const EmailProviderDrawer: React.FC<EmailProviderDrawerProps> = ({
  isOpen,
  onClose,
  activeBrand,
  user,
  espConfig,
  onConfigSaved,
  onLaunchCampaignWizard,
  initialProviderId,
  initialStep,
}) => {
  // Steps:
  // 1: Select Provider
  // 2: Connect Account (Credentials)
  // 3: Verify Sender & Domain
  // 4: Send Test Email
  // 5: Complete Connection
  const [step, setStep] = useState<number>(1);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDefinition>(() => {
    if (initialProviderId) {
      const found = EMAIL_PROVIDERS.find((p) => p.id === initialProviderId);
      if (found) return found;
    }
    if (espConfig?.config?.provider) {
      const found = EMAIL_PROVIDERS.find((p) => p.id === espConfig.config.provider);
      if (found) return found;
    }
    return EMAIL_PROVIDERS[0];
  });
  const [showPassword, setShowPassword] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form Fields
  const [region, setRegion] = useState('ap-south-1');
  const [apiKey, setApiKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [domain, setDomain] = useState('');
  const [gmailAuthMethod, setGmailAuthMethod] = useState<'app_password' | 'oauth'>('app_password');
  const [oauthConnectedEmail, setOauthConnectedEmail] = useState<string | null>(null);

  // Execution states
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState(user?.email || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Track drawer open transition so external espConfig updates NEVER override user selection
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      let targetProvider: ProviderDefinition = EMAIL_PROVIDERS[0];
      if (initialProviderId) {
        const found = EMAIL_PROVIDERS.find((p) => p.id === initialProviderId);
        if (found) targetProvider = found;
      } else if (espConfig?.config?.provider) {
        const found = EMAIL_PROVIDERS.find((p) => p.id === espConfig.config.provider);
        if (found) targetProvider = found;
      }
      setSelectedProvider(targetProvider);

      if (initialStep) {
        setStep(initialStep);
      } else if (initialProviderId) {
        setStep(2);
      } else {
        setStep(espConfig?.isLiveDelivery ? 2 : 1);
      }

      // Populate initial form fields from existing config if available for target provider
      const cfg = espConfig?.config;
      if (cfg && cfg.provider === targetProvider.id) {
        setRegion(cfg.region || 'us-east-1');
        setSmtpHost(cfg.smtpHost || (targetProvider.id === 'gmail' ? 'smtp.gmail.com' : ''));
        setSmtpPort(cfg.smtpPort || (targetProvider.id === 'gmail' ? 465 : 587));
        setSmtpUser(cfg.smtpUser || '');
        setSmtpPass('');
        setApiKey(cfg.apiKey || '');
        setFromName(cfg.fromName || activeBrand?.name || '');
        setFromEmail(cfg.fromEmail || (targetProvider.id === 'gmail' ? cfg.smtpUser : '') || '');
        setReplyTo(cfg.replyTo || '');
        setDomain(cfg.domain || (cfg.fromEmail ? cfg.fromEmail.split('@')[1] : ''));
        if (targetProvider.id === 'gmail' && cfg.smtpUser) {
          setOauthConnectedEmail(cfg.smtpUser);
        }
      } else {
        // Defaults for new provider
        if (targetProvider.id === 'gmail') {
          setSmtpHost('smtp.gmail.com');
          setSmtpPort(465);
          setSmtpSecure(true);
          const mail = user?.email || '';
          setSmtpUser(mail);
          setFromEmail(mail);
          setDomain(mail.split('@')[1] || '');
        } else if (targetProvider.id === 'ses') {
          setRegion('us-east-1');
          setSmtpHost('email-smtp.us-east-1.amazonaws.com');
          setSmtpPort(465);
          setSmtpSecure(true);
        }
        setFromName(activeBrand?.name || '');
        setFromEmail(user?.email || '');
      }
      setTestResult(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialProviderId, initialStep]);

  if (!isOpen) return null;

  const handleSelectProvider = (prov: ProviderDefinition) => {
    setSelectedProvider(prov);
    setShowPassword(false);
    setTestResult(null);

    // Reset only provider-specific parameters while retaining sender name & email
    if (prov.id === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      if (espConfig?.config?.provider === 'gmail') {
        setSmtpUser(espConfig.config.smtpUser || user?.email || '');
        setFromEmail(espConfig.config.fromEmail || espConfig.config.smtpUser || user?.email || '');
      } else {
        const mail = user?.email || '';
        setSmtpUser(mail);
        if (!fromEmail || fromEmail.includes('amazonses') || fromEmail.includes('example')) {
          setFromEmail(mail);
        }
      }
    } else if (prov.id === 'ses') {
      const reg = (espConfig?.config?.provider === 'ses' && espConfig.config.region) || 'us-east-1';
      setRegion(reg);
      setSmtpHost(`email-smtp.${reg}.amazonaws.com`);
      setSmtpPort(465);
      setSmtpSecure(true);
      if (espConfig?.config?.provider === 'ses') {
        setSmtpUser(espConfig.config.smtpUser || '');
      } else {
        setSmtpUser('');
        setSmtpPass('');
      }
    } else if (prov.id === 'sendgrid') {
      setSmtpHost('smtp.sendgrid.net');
      setSmtpPort(587);
      setSmtpSecure(false);
      setApiKey(espConfig?.config?.provider === 'sendgrid' ? (espConfig.config.apiKey || '') : '');
    } else if (prov.id === 'brevo') {
      setSmtpHost('smtp-relay.brevo.com');
      setSmtpPort(587);
      setSmtpSecure(false);
      setApiKey(espConfig?.config?.provider === 'brevo' ? (espConfig.config.apiKey || '') : '');
    } else if (prov.id === 'mailgun') {
      setSmtpHost('smtp.mailgun.org');
      setSmtpPort(587);
      setSmtpSecure(false);
      setApiKey(espConfig?.config?.provider === 'mailgun' ? (espConfig.config.apiKey || '') : '');
      if (espConfig?.config?.provider === 'mailgun') {
        setDomain(espConfig.config.domain || '');
      }
    } else if (prov.id === 'smtp') {
      if (espConfig?.config?.provider === 'smtp') {
        setSmtpHost(espConfig.config.smtpHost || '');
        setSmtpPort(espConfig.config.smtpPort || 587);
        setSmtpSecure(!!espConfig.config.smtpSecure);
        setSmtpUser(espConfig.config.smtpUser || '');
      } else {
        setSmtpHost('');
        setSmtpPort(587);
        setSmtpSecure(false);
        setSmtpUser('');
        setSmtpPass('');
      }
    }
    setStep(2);
  };

  const handleFromEmailChange = (val: string) => {
    setFromEmail(val);
    if (val.includes('@')) {
      setDomain(val.split('@')[1].trim().toLowerCase());
    }
  };

  const handleSaveCredentials = async () => {
    if (!activeBrand?.id) return;
    try {
      setIsSaving(true);
      await api.email.saveEspConfig(activeBrand.id, {
        provider: selectedProvider.id,
        region: selectedProvider.id === 'ses' ? region : undefined,
        smtpHost: selectedProvider.id === 'gmail' ? 'smtp.gmail.com' : smtpHost,
        smtpPort: selectedProvider.id === 'gmail' ? 465 : Number(smtpPort) || 587,
        smtpUser: selectedProvider.id === 'gmail' ? (smtpUser || fromEmail) : smtpUser,
        smtpPass: smtpPass || undefined,
        smtpSecure: selectedProvider.id === 'gmail' ? true : smtpSecure,
        apiKey: apiKey || undefined,
        fromName: fromName || activeBrand?.name || 'HoaspForge',
        fromEmail: fromEmail || smtpUser || user?.email || '',
        replyTo: replyTo || fromEmail || undefined,
        domain: domain || (fromEmail ? fromEmail.split('@')[1] : undefined),
      });

      onConfigSaved();
      setStep(3); // Advance to sender & domain verification
    } catch (err: any) {
      alert(err.message || 'Could not save credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSenderAndDomain = async () => {
    if (!activeBrand?.id) return;
    try {
      setIsSaving(true);
      await api.email.saveEspConfig(activeBrand.id, {
        provider: selectedProvider.id, // Strictly preserve current provider
        fromName,
        fromEmail,
        replyTo,
        domain: cleanDomain,
      });
      onConfigSaved();
      setStep(4); // Advance to test connection
    } catch (err: any) {
      alert(err.message || 'Failed to update sender identity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!activeBrand?.id || !cleanDomain) return;
    try {
      setIsVerifyingDns(true);
      await api.email.verifyDomainDns(activeBrand.id, cleanDomain);
      onConfigSaved();
    } catch (err: any) {
      console.warn('DNS Verification Check error:', err);
    } finally {
      setIsVerifyingDns(false);
    }
  };

  const handleSendTest = async () => {
    if (!activeBrand?.id || !testEmailRecipient.trim()) {
      alert('Please enter a recipient email address for testing.');
      return;
    }
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await api.email.testEspConfig(activeBrand.id, {
        recipientEmail: testEmailRecipient.trim(),
        testConfig: {
          provider: selectedProvider.id,
          region: selectedProvider.id === 'ses' ? region : undefined,
          smtpHost: selectedProvider.id === 'gmail' ? 'smtp.gmail.com' : smtpHost,
          smtpPort: selectedProvider.id === 'gmail' ? 465 : Number(smtpPort) || 587,
          smtpUser: selectedProvider.id === 'gmail' ? (smtpUser || fromEmail) : smtpUser,
          smtpPass: smtpPass || undefined,
          smtpSecure: selectedProvider.id === 'gmail' ? true : smtpSecure,
          apiKey: apiKey || undefined,
          fromName: fromName || activeBrand?.name || 'HoaspForge',
          fromEmail: fromEmail || smtpUser || user?.email || '',
        },
      });

      setTestResult({
        success: res.success && res.isLiveDelivery,
        message: res.message,
      });

      if (res.success && res.isLiveDelivery) {
        onConfigSaved();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test email delivery failed. Please verify credentials.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const cleanDomain = domain || (fromEmail ? fromEmail.split('@')[1] : 'yourcompany.com') || 'yourcompany.com';
  let spfInclude = 'include:_spf.google.com';
  if (selectedProvider.id === 'ses') spfInclude = 'include:amazonses.com';
  else if (selectedProvider.id === 'sendgrid') spfInclude = 'include:sendgrid.net';
  else if (selectedProvider.id === 'brevo') spfInclude = 'include:spf.brevo.com';
  else if (selectedProvider.id === 'mailgun') spfInclude = 'include:mailgun.org';

  const dnsCards = [
    {
      type: 'TXT',
      name: cleanDomain,
      value: `v=spf1 ${spfInclude} ~all`,
      title: 'SPF Record (Sender Policy Framework)',
      desc: 'Authorizes HoaspForge to send emails on behalf of your domain name.',
      required: true,
    },
    {
      type: 'CNAME',
      name: `sf._domainkey.${cleanDomain}`,
      value: `${selectedProvider.id}-dkim.${cleanDomain}.hoaspforge.com`,
      title: 'DKIM Record (Cryptographic Signature)',
      desc: 'Proves to receiving mailboxes that your emails were not forged or altered in transit.',
      required: true,
    },
  ];

  return createPortal(
    <div className="email-drawer-root">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="email-drawer-backdrop"
      />

      {/* Responsive Drawer: Right-side on Desktop/Tablet, Fullscreen on Mobile */}
      <div className="email-drawer-panel" role="dialog" aria-modal="true">
        
        {/* Drawer Header */}
        <div className="email-drawer-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
              <ProviderLogo providerId={selectedProvider.id} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Step {step} of 5
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-500 font-medium truncate">
                  {step === 1 ? 'Choose Provider' : selectedProvider.name}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                {step === 1 && 'Select Your Email Service'}
                {step === 2 && `Connect to ${selectedProvider.name}`}
                {step === 3 && (selectedProvider.id === 'gmail' ? 'Verify Gmail Sender Identity' : `Verify ${selectedProvider.name} Sender & Domain`)}
                {step === 4 && `Send Live Test Email (${selectedProvider.name})`}
                {step === 5 && `${selectedProvider.name} Connected!`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`cursor-pointer hover:underline transition ${step === 1 ? 'text-purple-600 dark:text-purple-400 font-bold' : step > 1 ? 'text-slate-700 dark:text-slate-300 font-semibold' : ''}`}
            >
              1. Provider
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`cursor-pointer hover:underline transition ${step === 2 ? 'text-purple-600 dark:text-purple-400 font-bold' : step > 2 ? 'text-slate-700 dark:text-slate-300 font-semibold' : ''}`}
            >
              2. Connect
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`cursor-pointer hover:underline transition ${step === 3 ? 'text-purple-600 dark:text-purple-400 font-bold' : step > 3 ? 'text-slate-700 dark:text-slate-300 font-semibold' : ''}`}
            >
              3. Verify
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className={`cursor-pointer hover:underline transition ${step === 4 ? 'text-purple-600 dark:text-purple-400 font-bold' : step > 4 ? 'text-slate-700 dark:text-slate-300 font-semibold' : ''}`}
            >
              4. Test
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className={`cursor-pointer hover:underline transition ${step === 5 ? 'text-emerald-500 font-bold' : ''}`}
            >
              5. Done
            </button>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="email-drawer-body">
          
          {/* =========================================================================
              STEP 1: SELECT PROVIDER
              ========================================================================= */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Choose the email provider you want HoaspForge to dispatch campaigns through. You can change this at any time.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {EMAIL_PROVIDERS.map((prov) => {
                  const isSelected = selectedProvider.id === prov.id;
                  return (
                    <div
                      key={prov.id}
                      onClick={() => handleSelectProvider(prov)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400/60'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          <ProviderLogo providerId={prov.id} className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{prov.name}</h4>
                            {prov.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {prov.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{prov.shortDesc}</p>
                          <span className="text-[11px] font-medium text-slate-400 mt-0.5 block">
                            {prov.sendingLimits}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: CONNECT ACCOUNT (Provider-Specific Forms ONLY)
              ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Selected Provider Header Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <ProviderLogo providerId={selectedProvider.id} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedProvider.name}</h4>
                    <span className="text-xs text-slate-500">{selectedProvider.sendingLimits}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Change Provider
                </button>
              </div>

              {/* AMAZON SES FORM */}
              {selectedProvider.id === 'ses' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      AWS Region <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                    >
                      <option value="ap-south-1">Asia Pacific (Mumbai, India) - ap-south-1</option>
                      <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                      <option value="us-west-2">US West (Oregon) - us-west-2</option>
                      <option value="eu-west-1">EU (Ireland) - eu-west-1</option>
                      <option value="eu-central-1">EU (Frankfurt) - eu-central-1</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore) - ap-southeast-1</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      SES SMTP User <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="AKIAIOSFODNN7EXAMPLE"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        SES SMTP Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="Enter SES SMTP Password"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 font-mono shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Sender Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="e.g. Hoasp International or Your Name"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Sender Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={fromEmail}
                      onChange={(e) => handleFromEmailChange(e.target.value)}
                      placeholder="e.g. newsletter@yourverifieddomain.com"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs"
                    />
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Generated in AWS Console &gt; Amazon SES &gt; SMTP Settings</span>
                    <a
                      href={selectedProvider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>AWS SES Credentials Guide</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* SENDGRID / BREVO / MAILGUN FORM */}
              {['sendgrid', 'brevo', 'mailgun'].includes(selectedProvider.id) && (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {selectedProvider.name} API Key <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                        <a
                          href={selectedProvider.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <span>Get API Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={selectedProvider.id === 'sendgrid' ? 'SG.xxxxxxxxxxxxxxxx' : 'Enter API Key'}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* GMAIL FORM */}
              {selectedProvider.id === 'gmail' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <strong className="block font-bold">Limited Sending Notice</strong>
                    <p className="text-[11px] leading-relaxed">
                      Subject to Google sending limits (typically 500 emails/day for standard Gmail, or up to 2,000/day for Google Workspace). Best for low-volume sending.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setGmailAuthMethod('app_password')}
                      className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer flex flex-col justify-between ${
                        gmailAuthMethod === 'app_password'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                        <Key className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google App Password</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal mt-1">Recommended: 1-minute setup</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGmailAuthMethod('oauth')}
                      className={`p-3 rounded-xl border text-xs text-left transition cursor-pointer flex flex-col justify-between ${
                        gmailAuthMethod === 'oauth'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-slate-900 dark:text-white">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>Google Account (OAuth)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal mt-1">Direct Google authorization</span>
                    </button>
                  </div>

                  {gmailAuthMethod === 'app_password' ? (
                    <div className="space-y-3.5">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">How to get your 16-character App Password:</span>
                        <ol className="list-decimal list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                          <li>Go to Google Account &gt; Security &gt; 2-Step Verification.</li>
                          <li>Select <strong>App passwords</strong> and create one named <em>HoaspForge</em>.</li>
                        </ol>
                        <a
                          href={selectedProvider.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1 text-[11px] pt-0.5"
                        >
                          <span>Open Google App Passwords Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Google Gmail Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={smtpUser}
                          onChange={(e) => {
                            setSmtpUser(e.target.value);
                            if (!fromEmail) handleFromEmailChange(e.target.value);
                          }}
                          placeholder="yourname@gmail.com"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            16-Character App Password <span className="text-rose-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showPassword ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="abcd efgh ijkl mnop"
                          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        Authorize HoaspForge with your Google account to grant sending permissions.
                      </p>
                      {oauthConnectedEmail ? (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <span className="font-bold">Connected as {oauthConnectedEmail}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const userMail = prompt('Enter your Google account email:', fromEmail || user?.email || '');
                            if (userMail) {
                              setOauthConnectedEmail(userMail);
                              setSmtpUser(userMail);
                              if (!fromEmail) handleFromEmailChange(userMail);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-xs shadow-xs hover:bg-slate-50"
                        >
                          <ProviderLogo providerId="gmail" className="w-4 h-4" />
                          <span>Authorize Google Account</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOM SMTP FORM */}
              {selectedProvider.id === 'smtp' && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">SMTP Host</label>
                      <input
                        type="text"
                        value={smtpHost}
                        onChange={(e) => setSmtpHost(e.target.value)}
                        placeholder="mail.yourdomain.com"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Port</label>
                      <input
                        type="number"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(Number(e.target.value))}
                        placeholder="587"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Security</label>
                    <select
                      value={smtpSecure ? 'ssl' : 'tls'}
                      onChange={(e) => setSmtpSecure(e.target.value === 'ssl')}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                    >
                      <option value="tls">STARTTLS (Port 587 - Recommended)</option>
                      <option value="ssl">SSL / TLS (Port 465)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">SMTP Username</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="user@yourdomain.com"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">SMTP Password</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="Enter SMTP password"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 3: VERIFY SENDER & DOMAIN (Provider-Specific Verification)
              ========================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Selected Provider Verification Banner */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
                    <ProviderLogo providerId={selectedProvider.id} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {selectedProvider.id === 'gmail' ? 'Google Workspace / Gmail Sender Identity' : `${selectedProvider.name} Sender & Domain Verification`}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {selectedProvider.id === 'gmail'
                        ? 'Authenticated Google Account session for outbound delivery'
                        : `Authorizes HoaspForge to dispatch through ${selectedProvider.name}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  Edit Credentials
                </button>
              </div>

              {/* Sender Identity Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Name (From Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder={activeBrand?.name || 'Your Brand Name'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sender Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => handleFromEmailChange(e.target.value)}
                    placeholder={selectedProvider.id === 'gmail' ? (smtpUser || 'yourname@gmail.com') : 'hello@yourcompany.com'}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reply-To Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="support@yourcompany.com"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 shadow-xs"
                  />
                </div>
              </div>

              {/* GMAIL-SPECIFIC VERIFICATION (Never show AWS SES or DNS CNAME records) */}
              {selectedProvider.id === 'gmail' ? (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          Direct Google Mailbox Authentication
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Active Identity
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Emails dispatched will be transmitted directly through Google's trusted infrastructure as <strong>{fromEmail || smtpUser || user?.email}</strong>.
                    </p>

                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px]">
                      <div className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">
                          <strong>Built-in SPF & DKIM:</strong> For personal <code>@gmail.com</code> addresses, cryptographic signatures are managed automatically by Google. No domain DNS records are needed.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">
                          <strong>Google Workspace Domains:</strong> If using a custom domain (e.g. <code>@company.com</code>), ensure your domain registrar includes <code>include:_spf.google.com</code>.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300">
                          <strong>Google Daily Limit:</strong> Up to 500 emails/day for standard Gmail, or up to 2,000 emails/day for Google Workspace.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* DOMAIN DNS GUIDANCE FOR SES, SENDGRID, BREVO, MAILGUN, SMTP */
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedProvider.name} DNS Verification ({cleanDomain})
                      </h5>
                      <p className="text-[11px] text-slate-500">Improves email inbox delivery and authorizes sending</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyDns}
                      disabled={isVerifyingDns}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingDns ? 'animate-spin' : ''}`} />
                      <span>Check DNS</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {dnsCards.map((rec, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              {rec.type}
                            </span>
                            <strong className="text-slate-900 dark:text-white">{rec.title}</strong>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Required</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 font-mono text-[11px] border border-slate-200 dark:border-slate-800">
                          <span className="truncate select-all text-slate-700 dark:text-slate-300">{rec.value}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(rec.value, idx)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition shrink-0 cursor-pointer flex items-center gap-1 text-[10px]"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 4: SEND TEST EMAIL
              ========================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200">
                <strong className="block font-bold mb-1">Verify Real Handshake Delivery</strong>
                <p className="text-[11px] leading-relaxed">
                  Send a live test message through {selectedProvider.name} to confirm that your credentials authenticate properly and mail can be transmitted.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Test Recipient Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      placeholder="yourname@example.com"
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSendTest}
                      disabled={isTesting || !testEmailRecipient.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isTesting ? 'Sending...' : 'Send Test'}</span>
                    </button>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong className="block font-bold text-sm">
                        {testResult.success ? 'Test Email Accepted by Provider! 📬' : 'Verification Failed'}
                      </strong>
                      <p className="text-xs mt-0.5 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 5: COMPLETE
              ========================================================================= */}
          {step === 5 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Your email service is connected!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  HoaspForge has securely saved and encrypted your {selectedProvider.name} configuration. All future campaigns will send through this provider automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Drawer Footer */}
        <div className="email-drawer-footer">
          <button
            type="button"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>
              {step === 1 && 'Cancel'}
              {step === 2 && 'Back to Providers'}
              {step === 3 && 'Back to Credentials'}
              {step === 4 && 'Back to Verification'}
              {step === 5 && 'Back to Test'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <span>{isSaving ? 'Connecting...' : `Save & Connect ${selectedProvider.name}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={handleSaveSenderAndDomain}
                disabled={isSaving || !fromEmail.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <span>{isSaving ? 'Saving...' : 'Proceed to Test'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={() => setStep(5)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <span>Finish Setup</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLaunchCampaignWizard?.();
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
              >
                <span>Create Your First Campaign</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// =========================================================================
// 4. PRE-FLIGHT DELIVERY READINESS CARD
// =========================================================================
export interface CampaignDeliveryReadinessCardProps {
  espConfig: any;
  recipientCount: number;
  onOpenDrawer: (provId?: string) => void;
}

export const CampaignDeliveryReadinessCard: React.FC<CampaignDeliveryReadinessCardProps> = ({
  espConfig,
  recipientCount,
  onOpenDrawer,
}) => {
  const isLive = espConfig?.isLiveDelivery;
  const cfg = espConfig?.config || {};
  const provider = EMAIL_PROVIDERS.find((p) => p.id === cfg.provider) || EMAIL_PROVIDERS[0];

  let estimatedTime = '< 30 seconds';
  if (recipientCount > 10000) {
    estimatedTime = '~15 - 30 minutes (batched)';
  } else if (recipientCount > 1000) {
    estimatedTime = '~2 - 5 minutes';
  } else if (recipientCount > 100) {
    estimatedTime = '~1 minute';
  }

  return (
    <div className={`p-5 rounded-2xl border-2 space-y-3.5 text-xs ${
      isLive
        ? 'bg-emerald-500/5 border-emerald-500/30'
        : 'bg-amber-500/10 border-amber-500/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm">
          {isLive ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-900 dark:text-emerald-200">Delivery Readiness: Live Engine Active</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-amber-900 dark:text-amber-200">Delivery Readiness: Sandbox Simulation Mode</span>
            </>
          )}
        </div>
        {!isLive && (
          <button
            type="button"
            onClick={() => onOpenDrawer()}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Connect Email Provider</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Email Provider</div>
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
            {isLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{provider.name}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>Sandbox Mode</span>
              </>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Sender Email</div>
          <div className="font-bold text-slate-900 dark:text-white truncate">
            {cfg.fromEmail || 'Default Identity'}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Eligible Contacts</div>
          <div className="font-bold text-slate-900 dark:text-white">
            {recipientCount} recipients
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Delivery</div>
          <div className="font-bold text-slate-900 dark:text-white">
            {estimatedTime}
          </div>
        </div>
      </div>

      {!isLive && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
          <span>
            ⚠️ Real emails will <strong>not</strong> reach customer inboxes until an email provider is connected.
          </span>
          <button
            type="button"
            onClick={() => onOpenDrawer()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shrink-0 transition cursor-pointer"
          >
            Connect Provider (1 Min)
          </button>
        </div>
      )}
    </div>
  );
};

// Backwards-compatibility aliases
export const InlineEmailProviderSetup = EmailServiceDashboardCard;
export const EmailServiceStatusCard = EmailServiceDashboardCard;

