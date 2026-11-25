import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Send,
  Users,
  LayoutTemplate,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  MousePointerClick,
  ArrowRight,
  Trash2,
  ExternalLink,
  Smartphone,
  Monitor,
  UploadCloud,
  FileText,
  Check,
  Download,
  GitBranch,
  Play,
  Pause,
  Layers,
  BarChart3,
  Filter,
  Zap,
  Clock,
  ShieldCheck,
  Tag,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Code,
  FileCode,
  Sliders,
  Copy,
  AlertTriangle,
  Building,
  UserCheck,
  Calendar,
  Settings,
  Server,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';
import {
  PageHeader,
  StatCard,
  SegmentedTabs,
  Modal,
  StatusBadge,
  EmptyState,
} from '../../components/ui/index.js';
import {
  EmailServiceDashboardCard,
  EmailServiceStatusCard,
  EmailProviderDrawer,
  CampaignDeliveryReadinessCard,
  InlineEmailProviderSetup,
} from './EmailProviderSetup.js';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  previewText?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
  htmlContent?: string;
}

interface Subscriber {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  status: string;
  source: string;
  tags?: string[];
  subscribedAt: string;
  createdAt?: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  subject?: string;
  htmlContent: string;
  blocksJson?: any;
  isSystem: boolean;
  createdAt?: string;
}

interface DeliveryLog {
  id: string;
  email: string;
  status: string;
  espMessageId?: string;
  openedAt?: string;
  clickedAt?: string;
  errorMessage?: string;
  createdAt: string;
}

interface CrmContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  lifecycleStage?: string;
}

export const EmailMarketingPage: React.FC = () => {
  const { activeBrand, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'TEMPLATES' | 'SUBSCRIBERS' | 'JOURNEYS'>('CAMPAIGNS');

  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('ALL');
  const [inspectCampaign, setInspectCampaign] = useState<Campaign | null>(null);
  const [campaignDeliveries, setCampaignDeliveries] = useState<DeliveryLog[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Subscribers State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberStatusFilter, setSubscriberStatusFilter] = useState('ALL');
  const [totalSubscribers, setTotalSubscribers] = useState(0);

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // Single Template Upload Drawer
  const [isTemplateDrawerOpen, setIsTemplateDrawerOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('newsletter');
  const [tplSubject, setTplSubject] = useState('');
  const [tplHtml, setTplHtml] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Single & Bulk Add Subscriber Modal
  const [isAddSubscriberOpen, setIsAddSubscriberOpen] = useState(false);
  const [subAddMode, setSubAddMode] = useState<'single' | 'bulk'>('single');
  const [subBulkInput, setSubBulkInput] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subFirstName, setSubFirstName] = useState('');
  const [subLastName, setSubLastName] = useState('');
  const [subCompany, setSubCompany] = useState('');
  const [subTags, setSubTags] = useState('');
  const [subSaveToCrm, setSubSaveToCrm] = useState(false);
  const [addingSubscriber, setAddingSubscriber] = useState(false);

  // =========================================================================
  // CAMPAIGN CREATION WIZARD STATE (5 Steps)
  // =========================================================================
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Campaign Details
  const [wizName, setWizName] = useState('');
  const [wizSubject, setWizSubject] = useState('');
  const [wizPreviewText, setWizPreviewText] = useState('');
  const [wizFromName, setWizFromName] = useState('');
  const [wizFromEmail, setWizFromEmail] = useState('');
  const [wizReplyTo, setWizReplyTo] = useState('');

  // Step 2: Recipients Selection (4 Options)
  const [wizRecipientSource, setWizRecipientSource] = useState<'ALL_ACTIVE' | 'MANUAL' | 'CSV' | 'CRM'>('ALL_ACTIVE');
  const [wizManualInput, setWizManualInput] = useState('');
  const [wizCsvFileName, setWizCsvFileName] = useState('');
  const [wizCsvParsedContacts, setWizCsvParsedContacts] = useState<Array<{ email: string; firstName?: string; lastName?: string; company?: string }>>([]);
  const [crmContacts, setCrmContacts] = useState<CrmContact[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [selectedCrmContactIds, setSelectedCrmContactIds] = useState<string[]>([]);
  const [crmSearch, setCrmSearch] = useState('');

  // Step 3: Content Creation (4 Options)
  const [wizContentType, setWizContentType] = useState<'UPLOAD_HTML' | 'PASTE_CODE' | 'VISUAL_BUILDER' | 'AI_GENERATOR'>('UPLOAD_HTML');
  const [wizHtmlContent, setWizHtmlContent] = useState('');
  const [wizSelectedTemplateId, setWizSelectedTemplateId] = useState<string>('');
  const [wizSaveAsTemplate, setWizSaveAsTemplate] = useState(false);
  const [wizNewTemplateName, setWizNewTemplateName] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'promotional' | 'urgent' | 'friendly'>('promotional');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Step 4: Preview & Test
  const [wizardPreviewDevice, setWizardPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [showPersonalizedPreview, setShowPersonalizedPreview] = useState(false);

  // Step 5: Schedule or Send
  const [sendOption, setSendOption] = useState<'NOW' | 'SCHEDULE' | 'DRAFT'>('NOW');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

  // General Toast Feedback
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    desc: string;
  } | null>(null);

  // ESP & SMTP Configuration State
  const [espConfig, setEspConfig] = useState<any>(null);
  const [isProviderDrawerOpen, setIsProviderDrawerOpen] = useState(false);
  const [drawerInitialStep, setDrawerInitialStep] = useState<number | undefined>(undefined);
  const [drawerInitialProviderId, setDrawerInitialProviderId] = useState<string | undefined>(undefined);
  const [loadingEsp, setLoadingEsp] = useState(false);

  const handleDisconnectEsp = async () => {
    if (!activeBrand?.id) return;
    if (window.confirm('Are you sure you want to disconnect your email service provider? Future campaigns will revert to sandbox simulation mode.')) {
      try {
        await api.email.disconnectEspConfig(activeBrand.id);
        showToast('Email Service Disconnected', 'Your brand email setup has reverted to Sandbox simulation.', 'info');
        await loadEspConfig();
      } catch (err: any) {
        showToast('Disconnect Failed', err?.message || 'Could not disconnect email provider', 'error');
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // =========================================================================
  // DATA LOADING
  // =========================================================================
  const loadCampaigns = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingCampaigns(true);
      const res = await api.email.listCampaigns(activeBrand.id);
      setCampaigns(res.campaigns || []);
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadSubscribers = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingSubscribers(true);
      const res = await api.email.listSubscribers(activeBrand.id, {
        search: subscriberSearch.trim() || undefined,
        status: subscriberStatusFilter !== 'ALL' ? subscriberStatusFilter : undefined,
      });
      setSubscribers(res.subscribers || []);
      setTotalSubscribers(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  const loadTemplates = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingTemplates(true);
      const res = await api.email.listTemplates(activeBrand.id);
      setTemplates(res.templates || []);
      if (res.templates && res.templates.length > 0 && !wizSelectedTemplateId) {
        setWizSelectedTemplateId(res.templates[0].id);
        setWizHtmlContent(res.templates[0].htmlContent);
      }
    } catch (err: any) {
      console.error('Failed to load email templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadCrmContacts = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingCrm(true);
      const res = await api.crm.listContacts(activeBrand.id);
      const eligible = (res.contacts || []).filter((c: any) => c.email && c.email.includes('@'));
      setCrmContacts(eligible);
      setSelectedCrmContactIds(eligible.map((c: any) => c.id));
    } catch (err: any) {
      console.error('Failed to load CRM contacts:', err);
    } finally {
      setLoadingCrm(false);
    }
  };

  const loadEspConfig = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoadingEsp(true);
      const res = await api.email.getEspConfig(activeBrand.id);
      setEspConfig(res);
      if (res?.config) {
        try {
          localStorage.setItem(`sf_esp_config_${activeBrand.id}`, JSON.stringify(res));
        } catch (e) {}
        if (res.config.fromName) setWizFromName(res.config.fromName);
        if (res.config.fromEmail) {
          setWizFromEmail(res.config.fromEmail);
          setTestEmailAddress(res.config.fromEmail);
        } else if (res.config.smtpUser) {
          setTestEmailAddress(res.config.smtpUser);
        }
      }
    } catch (err) {
      console.warn('Could not load ESP config:', err);
    } finally {
      setLoadingEsp(false);
    }
  };

  useEffect(() => {
    if (activeBrand?.id) {
      // Immediate localStorage hydration so browser never asks to connect again
      try {
        const cached = localStorage.getItem(`sf_esp_config_${activeBrand.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.config) {
            setEspConfig(parsed);
            if (parsed.config.fromEmail) setTestEmailAddress(parsed.config.fromEmail);
            else if (parsed.config.smtpUser) setTestEmailAddress(parsed.config.smtpUser);
          }
        }
      } catch (e) {}

      loadCampaigns();
      loadSubscribers();
      loadTemplates();
      loadEspConfig();
      setWizFromName(activeBrand.name || 'Brand Growth Team');
      setWizFromEmail(`broadcast@${(activeBrand.name || 'hoaspforge').toLowerCase().replace(/[^a-z0-9]/g, '')}.com`);
      if (!testEmailAddress) {
        setTestEmailAddress(user?.email || 'admin@hoaspforge.com');
      }
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    if (activeBrand?.id && activeTab === 'SUBSCRIBERS') {
      const timer = setTimeout(() => {
        loadSubscribers();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [subscriberSearch, subscriberStatusFilter, activeTab]);

  // Load deliveries when inspecting a campaign
  useEffect(() => {
    if (inspectCampaign && activeBrand?.id) {
      setLoadingDeliveries(true);
      api.email
        .getCampaignDeliveries(activeBrand.id, inspectCampaign.id)
        .then((res: any) => {
          setCampaignDeliveries(res.deliveries || []);
        })
        .catch((err) => {
          console.error('Failed to fetch campaign deliveries:', err);
          setCampaignDeliveries([]);
        })
        .finally(() => {
          setLoadingDeliveries(false);
        });
    }
  }, [inspectCampaign, activeBrand?.id]);

  // =========================================================================
  // ACTIONS: CRM SYNC & CSV EXPORT
  // =========================================================================
  const [syncingCrm, setSyncingCrm] = useState(false);
  const handleSyncCrm = async () => {
    if (!activeBrand?.id) return;
    try {
      setSyncingCrm(true);
      const res = await api.email.syncCrmContacts(activeBrand.id);
      showToast('CRM Sync Complete', `Synced ${res.synced} contacts into verified email audience.`, 'success');
      await loadSubscribers();
    } catch (err: any) {
      showToast('Sync Failed', err?.message || 'Could not sync CRM contacts', 'error');
    } finally {
      setSyncingCrm(false);
    }
  };

  const [seedingDemo, setSeedingDemo] = useState(false);
  const handleQuickSeedSampleSubscribers = async () => {
    if (!activeBrand?.id) return;
    try {
      setSeedingDemo(true);
      const demoContacts = [
        { email: 'alex.morgan@enterprise.com', firstName: 'Alex', lastName: 'Morgan', company: 'Enterprise Global', tags: ['VIP Client', 'Demo Seed'] },
        { email: 'sarah.chen@techcorp.io', firstName: 'Sarah', lastName: 'Chen', company: 'TechCorp Solutions', tags: ['Product Lead', 'Demo Seed'] },
        { email: 'david.kim@innovate.co', firstName: 'David', lastName: 'Kim', company: 'Innovate Digital', tags: ['Growth Partner', 'Demo Seed'] },
        { email: 'elena.rostova@globalventures.com', firstName: 'Elena', lastName: 'Rostova', company: 'Global Ventures', tags: ['Enterprise', 'Demo Seed'] },
        { email: 'jordan.lee@growthscale.com', firstName: 'Jordan', lastName: 'Lee', company: 'GrowthScale Labs', tags: ['Partner', 'Demo Seed'] },
      ];
      await api.email.bulkImportSubscribers(activeBrand.id, demoContacts as any);
      showToast('Demo Subscribers Seeded 🎉', 'Added 5 verified test subscribers to your brand audience list.', 'success');
      await loadSubscribers();
    } catch (err: any) {
      showToast('Seed Failed', err?.message || 'Could not seed demo subscribers', 'error');
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleExportCsv = () => {
    if (subscribers.length === 0) {
      showToast('Export Notice', 'No subscribers available to export.', 'info');
      return;
    }
    const headers = ['Email', 'First Name', 'Last Name', 'Company', 'Status', 'Source', 'Subscribed At'];
    const rows = subscribers.map((s) => [
      s.email,
      s.firstName || '',
      s.lastName || '',
      s.company || '',
      s.status,
      s.source,
      new Date(s.subscribedAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(activeBrand?.name || 'audience').toLowerCase().replace(/\s+/g, '_')}_subscribers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export Initiated', 'Audience exported successfully as CSV.', 'success');
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `email,firstName,lastName,company,tags\nalex.chen@enterprise.io,Alex,Chen,Acme Corp,VIP;Enterprise\nsarah.connor@cybertech.com,Sarah,Connor,Cybertech,Customer;Q4\nmarcus.aurelius@stoic.org,Marcus,Aurelius,Stoic Labs,Prospect\n`;
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + sampleCsv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_email_recipients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // PARSING MANUAL RECIPIENTS & CSV IN WIZARD
  // =========================================================================
  const parsedManualRecipients = useMemo(() => {
    if (!wizManualInput.trim()) return { valid: [], invalid: [], duplicates: 0 };
    const rawTokens = wizManualInput.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seen = new Set<string>();
    const valid: Array<{ email: string; name?: string }> = [];
    const invalid: string[] = [];
    let duplicates = 0;

    for (const raw of rawTokens) {
      let email = raw;
      let name = '';
      if (raw.includes('<') && raw.includes('>')) {
        const match = raw.match(/^(.*?)\s*<([^>]+)>/);
        if (match) {
          name = match[1].trim();
          email = match[2].trim();
        }
      }
      email = email.toLowerCase();
      if (!emailRegex.test(email)) {
        invalid.push(raw);
        continue;
      }
      if (seen.has(email)) {
        duplicates++;
        continue;
      }
      seen.add(email);
      valid.push({ email, name });
    }

    return { valid, invalid, duplicates };
  }, [wizManualInput]);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWizCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showToast('Invalid CSV', 'File must contain headers and at least one contact row.', 'error');
        return;
      }
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const emailIdx = headers.findIndex((h) => h.includes('email'));
      const fnIdx = headers.findIndex((h) => h.includes('first') || h === 'name');
      const lnIdx = headers.findIndex((h) => h.includes('last'));
      const compIdx = headers.findIndex((h) => h.includes('company') || h.includes('org'));

      if (emailIdx === -1) {
        showToast('Missing Email Column', 'CSV must have a column with "email" in the header.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const parsed: Array<{ email: string; firstName?: string; lastName?: string; company?: string }> = [];
      const seen = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
        const email = (cols[emailIdx] || '').toLowerCase().trim();
        if (email && emailRegex.test(email) && !seen.has(email)) {
          seen.add(email);
          parsed.push({
            email,
            firstName: fnIdx !== -1 ? cols[fnIdx] : undefined,
            lastName: lnIdx !== -1 ? cols[lnIdx] : undefined,
            company: compIdx !== -1 ? cols[compIdx] : undefined,
          });
        }
      }

      setWizCsvParsedContacts(parsed);
      showToast('CSV Parsed', `Extracted ${parsed.length} verified contact records from ${file.name}.`, 'success');
    };
    reader.readAsText(file);
  };

  // Handle Upload of HTML File in Step 3
  const handleHtmlTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHtmlFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setWizHtmlContent(content);
        showToast('HTML Loaded', `Successfully loaded ${file.name} (${Math.round(content.length / 1024)} KB).`, 'success');
      }
    };
    reader.readAsText(file);
  };

  // AI Content Generator Mock/Live Helper
  const handleGenerateAiEmail = () => {
    if (!aiPrompt.trim()) {
      showToast('Missing Prompt', 'Please enter a topic or campaign objective for the AI.', 'error');
      return;
    }
    setIsGeneratingAi(true);
    setTimeout(() => {
      const generatedHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; padding: 36px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6366f1; font-weight: 700;">Special Announcement</span>
      <h1 style="color: #ffffff; margin: 10px 0 16px; font-size: 26px; font-weight: 800;">${aiPrompt}</h1>
    </div>
    <div style="padding: 20px 0; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); line-height: 1.6; color: #cbd5e1; font-size: 15px;">
      <p>Hello {{firstName}},</p>
      <p>We are thrilled to bring you our latest updates curated specifically for {{company}}. Designed for modern teams who demand excellence and velocity.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{{ctaUrl}}" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">Explore Now →</a>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 11px;">
      <p style="margin: 4px 0;">© {{brandName}}. All rights reserved.</p>
      <p style="margin: 4px 0;"><a href="{{unsubscribeUrl}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
      setWizHtmlContent(generatedHtml);
      setIsGeneratingAi(false);
      showToast('AI Email Generated', 'Modern responsive template synthesized successfully.', 'success');
    }, 800);
  };

  // Interpolated Preview for Step 4
  const interpolatedPreviewHtml = useMemo(() => {
    if (!wizHtmlContent) return '<p style="color:#64748b;text-align:center;padding:40px;">No HTML content loaded.</p>';
    if (!showPersonalizedPreview) return wizHtmlContent;

    return wizHtmlContent
      .replace(/{{firstName}}/g, 'Elena')
      .replace(/{{first_name}}/g, 'Elena')
      .replace(/{{lastName}}/g, 'Rostova')
      .replace(/{{last_name}}/g, 'Rostova')
      .replace(/{{email}}/g, 'elena.rostova@acme.com')
      .replace(/{{company}}/g, 'Acme Global Ventures')
      .replace(/{{brandName}}/g, wizFromName || activeBrand?.name || 'HoaspForge')
      .replace(/{{brand_name}}/g, wizFromName || activeBrand?.name || 'HoaspForge')
      .replace(/{{ctaUrl}}/g, 'https://hoaspforge.com')
      .replace(/{{cta_url}}/g, 'https://hoaspforge.com')
      .replace(/{{unsubscribeUrl}}/g, 'https://hoaspforge.com/unsubscribe?subId=preview');
  }, [wizHtmlContent, showPersonalizedPreview, wizFromName, activeBrand?.name]);

  // Memoized parsed test emails (supporting comma, semicolon, newline, space separation)
  const parsedTestEmails = useMemo(() => {
    if (!testEmailAddress.trim()) return [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const tokens = testEmailAddress
      .split(/[\s,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => emailRegex.test(t));
    return Array.from(new Set(tokens));
  }, [testEmailAddress]);

  // Send Test Email Action (Bulk or Single)
  const handleSendTestEmail = async () => {
    if (!activeBrand?.id) return;
    if (parsedTestEmails.length === 0) {
      showToast('Invalid Email', 'Please specify at least one valid destination email address for the test.', 'error');
      return;
    }
    if (!wizHtmlContent.trim()) {
      showToast('Missing Content', 'No email content exists to send.', 'error');
      return;
    }

    try {
      setSendingTestEmail(true);
      const dispatches = [];
      for (const email of parsedTestEmails) {
        const res = await api.email.sendTestEmail(activeBrand.id, {
          recipientEmail: email,
          subject: wizSubject ? `[TEST] ${wizSubject}` : '[TEST] Preview Email Broadcast',
          htmlContent: wizHtmlContent,
          fromName: wizFromName,
          fromEmail: wizFromEmail,
        });
        dispatches.push({ email, success: res.success, messageId: res.messageId });
      }

      showToast(
        'Test Email Dispatched',
        `Successfully sent live test email${dispatches.length > 1 ? 's' : ''} to ${dispatches.length} recipient${dispatches.length > 1 ? 's' : ''} (${parsedTestEmails.join(', ')}).`,
        'success'
      );
    } catch (err: any) {
      showToast('Test Failed', err?.message || 'Could not send test email', 'error');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Submit / Launch Campaign
  const handleLaunchCampaign = async () => {
    if (!activeBrand?.id) return;
    if (!wizName.trim() || !wizSubject.trim() || !wizFromEmail.trim()) {
      showToast('Missing Details', 'Campaign Name, Subject, and Sender Email are required.', 'error');
      return;
    }

    // Pre-flight check on audience count
    const effectiveCount =
      wizRecipientSource === 'ALL_ACTIVE'
        ? activeSubscribersCount
        : wizRecipientSource === 'MANUAL'
          ? parsedManualRecipients.valid.length
          : wizRecipientSource === 'CSV'
            ? wizCsvParsedContacts.length
            : selectedCrmContactIds.length;

    if (effectiveCount === 0) {
      showToast(
        'No Recipients Selected',
        'Your target recipient list is empty. Please add subscribers, paste email addresses, or upload a CSV in Step 2.',
        'error'
      );
      setWizardStep(2);
      return;
    }

    try {
      setIsSubmittingCampaign(true);

      // If recipients was manual, CSV, or CRM, import them into brand audience
      if (wizRecipientSource === 'MANUAL' && parsedManualRecipients.valid.length > 0) {
        await api.email.bulkImportSubscribers(
          activeBrand.id,
          parsedManualRecipients.valid.map((v) => ({ email: v.email, firstName: v.name }))
        );
      } else if (wizRecipientSource === 'CSV' && wizCsvParsedContacts.length > 0) {
        await api.email.bulkImportSubscribers(activeBrand.id, wizCsvParsedContacts);
      } else if (wizRecipientSource === 'CRM' && selectedCrmContactIds.length > 0) {
        const selectedContacts = crmContacts.filter((c) => c.email && selectedCrmContactIds.includes(c.id));
        if (selectedContacts.length > 0) {
          await api.email.bulkImportSubscribers(
            activeBrand.id,
            selectedContacts.map((c) => ({
              email: c.email!,
              firstName: c.firstName || '',
              lastName: c.lastName || '',
              company: c.company || '',
              tags: ['CRM Contact', ...(c.lifecycleStage ? [c.lifecycleStage] : [])],
            }))
          );
        }
      }

      // If user chose to save design as template
      if (wizSaveAsTemplate && wizHtmlContent) {
        await api.email.createTemplate(activeBrand.id, {
          name: wizNewTemplateName.trim() || `${wizName} Template`,
          category: 'custom',
          subject: wizSubject,
          htmlContent: wizHtmlContent,
        }).catch((e) => console.warn('Could not save template:', e));
      }

      // 1. Create campaign record
      const createdCampaign = await api.email.createCampaign(activeBrand.id, {
        name: wizName.trim(),
        subject: wizSubject.trim(),
        previewText: wizPreviewText.trim() || undefined,
        fromName: wizFromName.trim(),
        fromEmail: wizFromEmail.trim(),
        replyTo: wizReplyTo.trim() || undefined,
        htmlContent: wizHtmlContent,
        scheduledAt: sendOption === 'SCHEDULE' && scheduledDateTime ? new Date(scheduledDateTime).toISOString() : undefined,
      });

      const campId = createdCampaign.campaign?.id || createdCampaign.id;

      // 2. If Send Now, immediately dispatch
      if (sendOption === 'NOW' && campId) {
        const sendRes = await api.email.sendCampaign(activeBrand.id, campId);
        if (sendRes.isLiveDelivery) {
          showToast(
            'Live Campaign Dispatched 🚀',
            `Successfully delivered "${wizName}" live across Google/SMTP to ${sendRes.recipientCount || 'all'} subscribers!`,
            'success'
          );
        } else {
          showToast(
            'Campaign Simulated in Sandbox ⚠️',
            `Recorded ${sendRes.recipientCount || 0} simulated deliveries. Real emails were NOT sent because Gmail/SMTP is not connected yet. Click "ESP & Mail Server" to deliver live to inboxes!`,
            'info'
          );
        }
      } else if (sendOption === 'SCHEDULE') {
        showToast('Campaign Scheduled ⏰', `"${wizName}" is scheduled for transmission on ${new Date(scheduledDateTime).toLocaleString()}.`, 'success');
      } else {
        showToast('Draft Saved 💾', `"${wizName}" has been safely saved to your campaign drafts.`, 'success');
      }

      // Refresh data and close wizard
      await loadCampaigns();
      await loadSubscribers();
      setIsWizardOpen(false);
      resetWizardForm();
    } catch (err: any) {
      showToast('Submission Failed', err?.message || 'Failed to submit campaign', 'error');
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const resetWizardForm = () => {
    setWizardStep(1);
    setWizName(`${activeBrand?.name || 'Brand'} Broadcast - ${new Date().toLocaleDateString()}`);
    setWizSubject(`Exclusive Updates from ${activeBrand?.name || 'our team'} ⚡`);
    setWizPreviewText('Check out our latest product and marketing updates inside.');
    setWizManualInput('');
    setWizCsvFileName('');
    setWizCsvParsedContacts([]);
    setWizSaveAsTemplate(false);
    setSendOption('NOW');
  };

  // Parsed bulk subscribers from modal
  const parsedBulkSubscribers = useMemo(() => {
    if (!subBulkInput.trim()) return [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lines = subBulkInput.split(/[\n,;]+/);
    const valid: Array<{ email: string; firstName?: string }> = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const namedMatch = trimmed.match(/^([^<]+)<([^>]+)>$/);
      if (namedMatch) {
        const name = namedMatch[1].trim();
        const em = namedMatch[2].trim().toLowerCase();
        if (emailRegex.test(em) && !seen.has(em)) {
          seen.add(em);
          valid.push({ email: em, firstName: name });
        }
      } else {
        const em = trimmed.toLowerCase();
        if (emailRegex.test(em) && !seen.has(em)) {
          seen.add(em);
          valid.push({ email: em });
        }
      }
    }
    return valid;
  }, [subBulkInput]);

  // Add individual or bulk contact handler
  const handleAddSubscriberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand?.id) return;

    if (subAddMode === 'bulk') {
      if (parsedBulkSubscribers.length === 0) {
        showToast('No Valid Emails', 'Please paste at least one valid email address.', 'error');
        return;
      }

      try {
        setAddingSubscriber(true);
        const res = await api.email.bulkImportSubscribers(
          activeBrand.id,
          parsedBulkSubscribers.map((s) => ({
            email: s.email,
            firstName: s.firstName,
            tags: subTags ? subTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          }))
        );

        showToast(
          'Bulk Subscribers Added',
          `Successfully added ${res?.imported || parsedBulkSubscribers.length} subscribers to your audience.`,
          'success'
        );
        setSubBulkInput('');
        setSubTags('');
        setIsAddSubscriberOpen(false);
        await loadSubscribers();
      } catch (err: any) {
        showToast('Bulk Import Failed', err?.message || 'Could not import subscribers', 'error');
      } finally {
        setAddingSubscriber(false);
      }
      return;
    }

    if (!subEmail.trim()) return;

    try {
      setAddingSubscriber(true);
      await api.email.createSubscriber(activeBrand.id, {
        email: subEmail.trim(),
        firstName: subFirstName.trim() || undefined,
        lastName: subLastName.trim() || undefined,
        company: subCompany.trim() || undefined,
        tags: subTags ? subTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });

      // Optionally save to CRM as well
      if (subSaveToCrm) {
        await api.crm.createContact(activeBrand.id, {
          email: subEmail.trim(),
          firstName: subFirstName.trim() || undefined,
          lastName: subLastName.trim() || undefined,
          company: subCompany.trim() || undefined,
          status: 'prospect',
        }).catch((e) => console.warn('CRM sync warning:', e));
      }

      showToast('Subscriber Added', `${subEmail.trim()} was successfully added to your audience.`, 'success');
      setSubEmail('');
      setSubFirstName('');
      setSubLastName('');
      setSubCompany('');
      setSubTags('');
      setIsAddSubscriberOpen(false);
      await loadSubscribers();
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not add subscriber', 'error');
    } finally {
      setAddingSubscriber(false);
    }
  };

  // Save new custom template handler
  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBrand?.id || !tplName.trim() || !tplHtml.trim()) return;

    try {
      setSavingTemplate(true);
      await api.email.createTemplate(activeBrand.id, {
        name: tplName.trim(),
        category: tplCategory,
        subject: tplSubject.trim() || undefined,
        htmlContent: tplHtml,
      });
      showToast('Template Saved', `"${tplName}" is now available in your Template Studio.`, 'success');
      setTplName('');
      setTplSubject('');
      setTplHtml('');
      setIsTemplateDrawerOpen(false);
      await loadTemplates();
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not save template', 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Calculations for genuine statistics (Zero Fabricated Data!)
  const totalSentCampaigns = campaigns.filter((c) => c.status === 'SENT').length;
  const totalDraftCampaigns = campaigns.filter((c) => c.status === 'DRAFT').length;
  const activeSubscribersCount = subscribers.filter((s) => s.status === 'SUBSCRIBED').length;

  const effectiveRecipientCount =
    wizRecipientSource === 'ALL_ACTIVE'
      ? activeSubscribersCount
      : wizRecipientSource === 'MANUAL'
        ? parsedManualRecipients.valid.length
        : wizRecipientSource === 'CSV'
          ? wizCsvParsedContacts.length
          : selectedCrmContactIds.length;

  const avgOpenRate =
    totalSentCampaigns > 0
      ? Math.round(
        campaigns.filter((c) => c.status === 'SENT').reduce((acc, curr) => acc + (curr.openRate || 0), 0) /
        totalSentCampaigns
      )
      : 0;

  const avgClickRate =
    totalSentCampaigns > 0
      ? Math.round(
        campaigns.filter((c) => c.status === 'SENT').reduce((acc, curr) => acc + (curr.clickRate || 0), 0) /
        totalSentCampaigns
      )
      : 0;

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
        c.subject.toLowerCase().includes(campaignSearch.toLowerCase());
      const matchStatus = campaignStatusFilter === 'ALL' || c.status === campaignStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, campaignSearch, campaignStatusFilter]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (templateCategoryFilter === 'ALL') return true;
      return tpl.category.toUpperCase() === templateCategoryFilter;
    });
  }, [templates, templateCategoryFilter]);

  const openWizardAt = (
    step: 1 | 2 | 3 | 4 | 5 = 1,
    contentType?: 'UPLOAD_HTML' | 'PASTE_CODE' | 'VISUAL_BUILDER' | 'AI_GENERATOR',
    recipientSource?: 'ALL_ACTIVE' | 'MANUAL' | 'CSV' | 'CRM'
  ) => {
    resetWizardForm();
    setWizardStep(step);
    if (contentType) setWizContentType(contentType);
    if (recipientSource) setWizRecipientSource(recipientSource);
    setIsWizardOpen(true);
  };

  const validateWizardStep = (step: number): boolean => {
    if (step === 1) {
      if (!wizName.trim() || !wizSubject.trim() || !wizFromEmail.trim()) {
        showToast('Required Fields', 'Please complete Campaign Name, Subject, and Sender Email.', 'error');
        return false;
      }
    }
    if (step === 2) {
      if (wizRecipientSource === 'ALL_ACTIVE' && activeSubscribersCount === 0) {
        showToast(
          'Audience Empty (0 Subscribers)',
          'Your brand currently has 0 active subscribers. Please switch to "Paste Emails Manually", "Upload CSV", "Select from CRM", or seed demo contacts.',
          'error'
        );
        return false;
      }
      if (wizRecipientSource === 'MANUAL' && parsedManualRecipients.valid.length === 0) {
        showToast('No Recipients', 'Please enter at least one valid recipient email address.', 'error');
        return false;
      }
      if (wizRecipientSource === 'CRM' && selectedCrmContactIds.length === 0) {
        showToast('No CRM Contacts Selected', 'Please select at least one contact from CRM.', 'error');
        return false;
      }
      if (wizRecipientSource === 'CSV' && wizCsvParsedContacts.length === 0) {
        showToast('No CSV Contacts', 'Please upload a CSV file with valid recipient email addresses.', 'error');
        return false;
      }
    }
    if (step === 3) {
      if (!wizHtmlContent.trim()) {
        showToast('Missing HTML Content', 'Please upload or generate HTML content for your email.', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateWizardStep(wizardStep)) {
      setWizardStep((prev) => Math.min(prev + 1, 5) as any);
    }
  };

  const handlePrevStep = () => {
    setWizardStep((prev) => Math.max(prev - 1, 1) as any);
  };

  // =========================================================================
  // IN-APPLICATION STUDIO VIEW (Replaces Cramped Right Slide-over Popup Drawer)
  // Opens directly in the application page with zero vertical squishing
  // =========================================================================
  if (isWizardOpen) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in text-primary max-w-7xl mx-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
            <div
              className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border shadow-2xl max-w-md ${toastMessage.type === 'success'
                ? 'bg-surface border-emerald-500/40 text-primary shadow-emerald-950/20'
                : toastMessage.type === 'error'
                  ? 'bg-surface border-rose-500/40 text-primary shadow-rose-950/20'
                  : 'bg-surface border-indigo-500/40 text-primary shadow-indigo-950/20'
                }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : toastMessage.type === 'error' ? (
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h4 className="font-bold text-sm tracking-tight">{toastMessage.title}</h4>
                <p className="text-xs text-secondary mt-0.5 leading-relaxed">{toastMessage.desc}</p>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-muted hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Studio Top Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsWizardOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-xl transition cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Mail className="w-4 h-4" />
                </span>
                <h1 className="text-lg font-bold text-primary">Email Campaign Studio</h1>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Step {wizardStep} of 5
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {wizardStep === 1 && 'Configure sender identity, subject line, and preheader snippet.'}
                {wizardStep === 2 && 'Select target recipients: All Active, Paste Emails, 1 Lakh+ CSV, or Brand CRM.'}
                {wizardStep === 3 && 'Upload custom responsive .HTML, edit code, use visual template, or generate with AI.'}
                {wizardStep === 4 && 'Preview layout across Desktop and Mobile devices and send a single inbox test email.'}
                {wizardStep === 5 && 'Verify pre-flight compliance check and broadcast bulk marketing campaign.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsWizardOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-secondary hover:text-primary bg-surface border border-subtle rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            {wizardStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 active:from-indigo-700 active:to-purple-700 rounded-xl shadow-md shadow-indigo-500/25 transition cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : effectiveRecipientCount === 0 && sendOption === 'NOW' ? (
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>Add Recipients in Step 2</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={isSubmittingCampaign}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 rounded-xl shadow-md shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCampaign ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Broadcast...</span>
                  </>
                ) : sendOption === 'NOW' ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Launch Campaign Now 🚀</span>
                  </>
                ) : sendOption === 'SCHEDULE' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Schedule Transmission</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Save as Draft</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Single-Line Step Navigation Toolbar: 5 wide buttons across top in a strict single row */}
        <div className="w-full overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-2.5 p-2 bg-surface-elevated rounded-2xl border border-subtle shadow-xs min-w-[760px]">
            {[
              { num: 1, label: '1. Details & Sender', icon: FileText, desc: 'Identity & Headers' },
              { num: 2, label: '2. Recipients (1 Lakh CSV)', icon: Users, desc: 'Audience Selection' },
              { num: 3, label: '3. Body & HTML Content', icon: Code, desc: 'Template & Design' },
              { num: 4, label: '4. Preview & Test', icon: Eye, desc: 'Desktop / Mobile' },
              { num: 5, label: '5. Review & Launch', icon: Send, desc: 'Pre-flight & Broadcast' },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = wizardStep === s.num;
              const isCompleted = wizardStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < wizardStep || validateWizardStep(wizardStep)) {
                      setWizardStep(s.num as any);
                    }
                  }}
                  className={`flex-1 min-w-[140px] flex items-center gap-2.5 p-3 rounded-xl text-left transition-all cursor-pointer ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-500/30'
                    : isCompleted
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-2 border-emerald-500/40 shadow-xs'
                      : 'text-secondary hover:text-primary hover:bg-surface-hover border border-transparent'
                    }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${isActive
                      ? 'bg-white/20 text-white border border-white/20'
                      : isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-surface-hover text-muted border border-subtle'
                      }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4 text-white stroke-[3]" /> : s.num}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold truncate block">{s.label}</span>
                    <span className={`text-[10px] truncate block ${isActive ? 'text-white/80' : 'text-muted'}`}>
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Step Studio Card */}
        <div className="rounded-2xl bg-surface border border-subtle p-6 sm:p-8 shadow-xs space-y-6">
          {/* =========================================================================
              STEP 1: CAMPAIGN DETAILS & SENDER IDENTITY
              ========================================================================= */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary">Campaign Identity & Sender Configuration</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Define your internal campaign reference, subject line seen in recipients' inboxes, and verified sender mailbox.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Campaign Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wizName}
                      onChange={(e) => setWizName(e.target.value)}
                      placeholder="e.g. Q4 Flagship Product Announcement"
                      className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Internal reference name for your analytics and reporting.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Email Subject Line <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wizSubject}
                      onChange={(e) => setWizSubject(e.target.value)}
                      placeholder="e.g. Exclusive First Look: The New Collection is Live ⚡"
                      className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">First impression in recipient inbox. Keep under 60 characters for best mobile view.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Preview Text / Preheader (Optional)
                    </label>
                    <input
                      type="text"
                      value={wizPreviewText}
                      onChange={(e) => setWizPreviewText(e.target.value)}
                      placeholder="Brief preview snippet visible in inbox before opening"
                      className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Displays next to the subject line in Gmail, Outlook, and Apple Mail.</p>
                  </div>
                </div>

                <div className="space-y-4 bg-surface-elevated/40 p-5 rounded-2xl border border-subtle">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Verified Sender Mailbox ({espConfig?.isLiveDelivery ? (espConfig.activeProvider || 'smtp').toUpperCase() : 'Sandbox Simulation'})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerInitialStep(1);
                        setIsProviderDrawerOpen(true);
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{espConfig?.isLiveDelivery ? 'Change ESP/SMTP' : 'Connect Gmail / SMTP'}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Sender Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={wizFromName}
                      onChange={(e) => setWizFromName(e.target.value)}
                      placeholder="e.g. Sarah from HoaspForge"
                      className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Sender Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={wizFromEmail}
                      onChange={(e) => setWizFromEmail(e.target.value)}
                      placeholder="broadcast@brand.com"
                      className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Must match your verified sending domain (SPF / DKIM / DMARC enabled).</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Reply-To Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={wizReplyTo}
                      onChange={(e) => setWizReplyTo(e.target.value)}
                      placeholder="support@brand.com"
                      className="w-full bg-surface border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <p className="text-[11px] text-muted mt-1">Where recipient direct replies are routed if different from sender address.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 2: TARGET AUDIENCE & RECIPIENTS (4 Prominent Button Cards)
              ========================================================================= */}
          {wizardStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary">Target Audience & Recipient Source</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Choose how to source your recipients. Select all active subscribers, paste emails manually, stream 100,000+ CSV contacts, or select from Brand CRM.
                </p>
              </div>

              {/* 4 Prominent Button Cards in a 4-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: All Active Subscribers */}
                <button
                  type="button"
                  onClick={() => setWizRecipientSource('ALL_ACTIVE')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizRecipientSource === 'ALL_ACTIVE'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizRecipientSource === 'ALL_ACTIVE' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {activeSubscribersCount} Active
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizRecipientSource === 'ALL_ACTIVE' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizRecipientSource === 'ALL_ACTIVE' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">All Active Subscribers</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Target all opted-in, verified contacts in your brand audience list.
                  </p>
                </button>

                {/* Card 2: Paste Emails Manually */}
                <button
                  type="button"
                  onClick={() => setWizRecipientSource('MANUAL')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizRecipientSource === 'MANUAL'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizRecipientSource === 'MANUAL' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                      }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        {parsedManualRecipients.valid.length > 0 ? `${parsedManualRecipients.valid.length} Ready` : 'Quick Bulk'}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizRecipientSource === 'MANUAL' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizRecipientSource === 'MANUAL' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">Paste Emails Manually</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Quickly paste a comma or line-separated list of raw email addresses.
                  </p>
                </button>

                {/* Card 3: Upload CSV (1 Lakh+) */}
                <button
                  type="button"
                  onClick={() => setWizRecipientSource('CSV')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizRecipientSource === 'CSV'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizRecipientSource === 'CSV' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {wizCsvParsedContacts.length > 0 ? `${wizCsvParsedContacts.length} Loaded` : '1 Lakh+ Stream'}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizRecipientSource === 'CSV' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizRecipientSource === 'CSV' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">Upload CSV (1 Lakh+)</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Import contact spreadsheets with up to 100,000+ rows and instant batching.
                  </p>
                </button>

                {/* Card 4: Select from Brand CRM */}
                <button
                  type="button"
                  onClick={() => {
                    setWizRecipientSource('CRM');
                    loadCrmContacts();
                  }}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizRecipientSource === 'CRM'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizRecipientSource === 'CRM' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }`}>
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {selectedCrmContactIds.length > 0 ? `${selectedCrmContactIds.length} Selected` : `${crmContacts.length || 'CRM'} Leads`}
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizRecipientSource === 'CRM' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizRecipientSource === 'CRM' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">Select from Brand CRM</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Directly broadcast to verified leads & customer contacts in HoaspForge CRM.
                  </p>
                </button>
              </div>

              {/* OPTION A PANEL: ALL ACTIVE SUBSCRIBERS */}
              {wizRecipientSource === 'ALL_ACTIVE' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-4">
                  {activeSubscribersCount === 0 ? (
                    <div className="p-5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>No Active Subscribed Recipients Found for "{activeBrand?.name || 'this brand'}"</span>
                      </div>
                      <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                        Your brand audience currently has <strong>0 subscribed contacts</strong>. Email broadcasts require at least one verified recipient before dispatching. You can paste email addresses directly, upload a CSV spreadsheet, import from your Brand CRM, or seed 5 demo test subscribers with one click below:
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setWizRecipientSource('MANUAL')}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Paste Emails Manually</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizRecipientSource('CSV')}
                          className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-subtle text-primary font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <UploadCloud className="w-4 h-4 text-amber-500" />
                          <span>Upload CSV Spreadsheet</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSyncCrm}
                          disabled={syncingCrm}
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <UserCheck className={`w-4 h-4 ${syncingCrm ? 'animate-spin' : ''}`} />
                          <span>{syncingCrm ? 'Syncing...' : 'Sync CRM Contacts'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickSeedSampleSubscribers}
                          disabled={seedingDemo}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className={`w-4 h-4 ${seedingDemo ? 'animate-spin' : ''}`} />
                          <span>{seedingDemo ? 'Seeding...' : 'Quick Seed 5 Demo Contacts'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Targeting All Opted-In Verified Brand Subscribers</span>
                      </div>
                      <p className="text-xs text-secondary leading-relaxed max-w-3xl">
                        This broadcast will be dispatched to all <strong>{activeSubscribersCount}</strong> active contacts in your brand audience. Unsubscribed and bounced recipients are automatically suppressed per CAN-SPAM regulations.
                      </p>
                      <div className="flex items-center gap-3 pt-2 text-xs font-mono text-muted">
                        <span>• Status: SUBSCRIBED only</span>
                        <span>• Auto-Suppression: Active</span>
                        <span>• Unsubscribe Token: Mandatory</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* OPTION B PANEL: MANUAL ENTRY */}
              {wizRecipientSource === 'MANUAL' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold text-primary">
                        Paste Email Addresses (Comma, Semicolon, or Line Separated)
                      </label>
                      <p className="text-[11px] text-muted mt-0.5">
                        Accepts raw emails e.g. <code>user@example.com</code> or named format <code>Alex &lt;alex@example.com&gt;</code>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                        {parsedManualRecipients.valid.length} Valid
                      </span>
                      {parsedManualRecipients.invalid.length > 0 && (
                        <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                          {parsedManualRecipients.invalid.length} Invalid
                        </span>
                      )}
                      {parsedManualRecipients.duplicates > 0 && (
                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                          {parsedManualRecipients.duplicates} Duplicates
                        </span>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={8}
                    value={wizManualInput}
                    onChange={(e) => setWizManualInput(e.target.value)}
                    placeholder="alex@example.com&#10;Sarah Connor <sarah@cybertech.com>&#10;team@enterprise.org&#10;sales@startup.io"
                    className="w-full bg-surface border border-subtle rounded-xl p-4 text-xs font-mono text-primary focus:outline-none focus:border-indigo-500 shadow-xs resize-none"
                  />
                </div>
              )}

              {/* OPTION C PANEL: CSV FILE UPLOAD (1 Lakh+) */}
              {wizRecipientSource === 'CSV' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-5">
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3 text-xs text-primary">
                    <Zap className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sm">Enterprise High-Capacity 1 Lakh (100,000+) Email Streaming Engine</span>
                      <p className="text-secondary text-xs mt-1 leading-relaxed">
                        Upload contact files with up to 100,000+ rows. The delivery engine automatically chunks contacts into rate-safe batches of 50 to ensure 99.8% inbox deliverability without ESP throttling.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">Import CSV / Excel Contact File</span>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV Template</span>
                    </button>
                  </div>

                  <div
                    onClick={() => csvFileInputRef.current?.click()}
                    className="p-10 border-2 border-dashed border-subtle hover:border-indigo-500/60 rounded-2xl bg-surface text-center cursor-pointer transition space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {wizCsvFileName ? `Selected: ${wizCsvFileName}` : 'Click or drop .CSV contact spreadsheet here'}
                    </div>
                    <p className="text-xs text-muted">
                      Header columns recognized: <code>email</code>, <code>firstName</code>, <code>lastName</code>, <code>company</code>, <code>tags</code>
                    </p>
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileUpload}
                      className="hidden"
                    />
                  </div>

                  {wizCsvParsedContacts.length > 0 && (
                    <div className="p-4 rounded-xl bg-surface border border-subtle text-xs space-y-3">
                      <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                        <span>Extracted Contacts Preview</span>
                        <span className="font-mono">{wizCsvParsedContacts.length} Contacts Ready</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto font-mono text-xs divide-y divide-subtle">
                        {wizCsvParsedContacts.slice(0, 10).map((c, i) => (
                          <div key={i} className="py-1.5 flex justify-between text-secondary">
                            <span className="font-semibold text-primary">{c.email}</span>
                            <span>{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.company || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPTION D PANEL: SELECT FROM CRM */}
              {wizRecipientSource === 'CRM' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-primary">
                        Eligible CRM Contacts ({selectedCrmContactIds.length} of {crmContacts.length} selected)
                      </span>
                      <p className="text-[11px] text-muted">Verified customer contacts and leads from your Brand CRM database.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedCrmContactIds.length === crmContacts.length) {
                          setSelectedCrmContactIds([]);
                        } else {
                          setSelectedCrmContactIds(crmContacts.map((c) => c.id));
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {selectedCrmContactIds.length === crmContacts.length ? 'Deselect All' : 'Select All Eligible'}
                    </button>
                  </div>

                  {loadingCrm ? (
                    <div className="py-12 text-center text-xs text-secondary">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Loading CRM contacts...
                    </div>
                  ) : crmContacts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-subtle">
                      No eligible CRM contacts with valid email addresses found. Please sync your CRM.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-subtle border border-subtle rounded-xl bg-surface">
                      {crmContacts.map((c) => (
                        <div key={c.id} className="p-3 flex items-center justify-between text-xs hover:bg-surface-elevated transition">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center transition-all ${selectedCrmContactIds.includes(c.id)
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'border border-subtle bg-surface'
                                }`}
                            >
                              {selectedCrmContactIds.includes(c.id) && (
                                <Check className="w-3 h-3 stroke-[3] text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedCrmContactIds.includes(c.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCrmContactIds([...selectedCrmContactIds, c.id]);
                                else setSelectedCrmContactIds(selectedCrmContactIds.filter((id) => id !== c.id));
                              }}
                              className="hidden"
                            />
                            <div>
                              <div className="font-semibold text-primary">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}</div>
                              <div className="text-[11px] font-mono text-muted">{c.email}</div>
                            </div>
                          </label>
                          <span className="text-[11px] text-secondary font-mono">{c.company || 'Direct Contact'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 3: BODY & HTML CONTENT (4 Prominent Button Cards)
              ========================================================================= */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary">Email Content & HTML Design</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Upload an existing .html template file, edit raw HTML/CSS code directly, pick from Template Studio, or generate with AI.
                </p>
              </div>

              {/* 4 Prominent Content Mode Button Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => setWizContentType('UPLOAD_HTML')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizContentType === 'UPLOAD_HTML'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizContentType === 'UPLOAD_HTML' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                      }`}>
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        .HTML File
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizContentType === 'UPLOAD_HTML' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizContentType === 'UPLOAD_HTML' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">Upload .HTML Template</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Upload responsive email templates designed in Figma, Beefree, or Stripo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWizContentType('PASTE_CODE')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizContentType === 'PASTE_CODE'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizContentType === 'PASTE_CODE' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }`}>
                      <Code className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        Editor
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizContentType === 'PASTE_CODE' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizContentType === 'PASTE_CODE' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">HTML Code Editor</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Directly write, paste, and modify responsive HTML code with inline CSS.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWizContentType('VISUAL_BUILDER')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizContentType === 'VISUAL_BUILDER'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizContentType === 'VISUAL_BUILDER' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                      <LayoutTemplate className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {templates.length} Templates
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizContentType === 'VISUAL_BUILDER' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizContentType === 'VISUAL_BUILDER' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">Template Studio</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Select from verified, responsive templates saved in your brand library.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setWizContentType('AI_GENERATOR')}
                  className={`flex flex-col text-left p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${wizContentType === 'AI_GENERATOR'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                    : 'border-subtle bg-surface hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className={`p-2.5 rounded-xl ${wizContentType === 'AI_GENERATOR' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'
                      }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                        AI Powered
                      </span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${wizContentType === 'AI_GENERATOR' ? 'bg-indigo-600 text-white shadow-xs' : 'border-2 border-subtle bg-surface'
                        }`}>
                        {wizContentType === 'AI_GENERATOR' ? (
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary">AI Generator ⚡</span>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    Generate copy, headline, CTA, and HTML template layout from a brief.
                  </p>
                </button>
              </div>

              {/* 1. UPLOAD HTML FILE */}
              {wizContentType === 'UPLOAD_HTML' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-10 border-2 border-dashed border-subtle hover:border-indigo-500/60 rounded-2xl bg-surface text-center cursor-pointer transition space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {htmlFileName ? `Loaded Template: ${htmlFileName}` : 'Click or drop .HTML email template here'}
                    </div>
                    <p className="text-xs text-muted">Supports embedded styles, responsive layout tables, and hosted images</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm"
                      onChange={handleHtmlTemplateFileUpload}
                      className="hidden"
                    />
                  </div>

                  {wizHtmlContent && (
                    <div className="p-4 rounded-xl bg-surface border border-subtle flex items-center justify-between text-xs">
                      <span className="font-bold text-primary">HTML Code Size: {Math.round(wizHtmlContent.length / 1024)} KB</span>
                      <button
                        type="button"
                        onClick={() => setWizContentType('PASTE_CODE')}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        Inspect / Edit Source Code →
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 2. PASTE CODE */}
              {wizContentType === 'PASTE_CODE' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-primary">HTML Source Code Editor</label>
                    <button
                      type="button"
                      onClick={() => {
                        const sample = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;background:#0f172a;color:#fff;"><div style="max-width:600px;margin:0 auto;background:#1e293b;padding:24px;border-radius:12px;"><h2>{{brandName}} Announcement</h2><p>Hello {{firstName}},</p><p>We are excited to share our updates with {{company}}!</p><p><a href="{{ctaUrl}}" style="background:#6366f1;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Learn More</a></p><hr style="border:0;border-top:1px solid #334155;margin:24px 0;"/><p style="font-size:11px;color:#94a3b8;"><a href="{{unsubscribeUrl}}" style="color:#94a3b8;">Unsubscribe</a></p></div></body></html>`;
                        setWizHtmlContent(sample);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                    >
                      Insert Starter Responsive HTML
                    </button>
                  </div>
                  <textarea
                    rows={14}
                    value={wizHtmlContent}
                    onChange={(e) => setWizHtmlContent(e.target.value)}
                    placeholder="<!DOCTYPE html><html><body>...</body></html>"
                    className="w-full bg-slate-950 text-indigo-300 border border-subtle rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-indigo-500 shadow-xs"
                  />
                </div>
              )}

              {/* 3. VISUAL TEMPLATES SELECTOR */}
              {wizContentType === 'VISUAL_BUILDER' && (
                <div className="p-6 rounded-2xl bg-surface-elevated border border-subtle space-y-4">
                  <label className="block text-xs font-bold text-primary">Choose Template from Studio</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-72 overflow-y-auto pr-1">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setWizSelectedTemplateId(tpl.id);
                          setWizHtmlContent(tpl.htmlContent);
                          if (tpl.subject && !wizSubject) setWizSubject(tpl.subject);
                        }}
                        className={`p-4 rounded-xl border-2 text-xs cursor-pointer transition flex items-center justify-between ${wizSelectedTemplateId === tpl.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                          : 'border-subtle bg-surface hover:bg-surface-hover'
                          }`}
                      >
                        <div>
                          <div className="font-bold text-primary">{tpl.name}</div>
                          <div className="text-[10px] text-muted uppercase mt-1">{tpl.category}</div>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${wizSelectedTemplateId === tpl.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'border border-subtle bg-surface'
                          }`}>
                          {wizSelectedTemplateId === tpl.id && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. AI GENERATOR */}
              {wizContentType === 'AI_GENERATOR' && (
                <div className="space-y-4 p-6 rounded-2xl bg-surface-elevated border border-subtle">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1.5">
                      Campaign Objective or Brief
                    </label>
                    <textarea
                      rows={4}
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. Announce our weekend flash sale offering 30% off all marketing automation plans..."
                      className="w-full bg-surface border border-subtle rounded-xl p-4 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-secondary">Tone:</span>
                      {(['promotional', 'professional', 'urgent', 'friendly'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAiTone(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs capitalize transition cursor-pointer ${aiTone === t ? 'bg-indigo-600 text-white font-bold' : 'bg-surface text-secondary hover:text-primary'
                            }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiEmail}
                      disabled={isGeneratingAi}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-4 h-4 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAi ? 'Synthesizing...' : 'Generate Email Layout & Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Personalization Variable Tags Reference */}
              <div className="p-4 bg-surface-elevated border border-subtle rounded-xl text-xs space-y-2">
                <span className="font-bold text-primary block">Available Dynamic Personalization Tags:</span>
                <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                  {['{{firstName}}', '{{lastName}}', '{{email}}', '{{company}}', '{{brandName}}', '{{ctaUrl}}', '{{unsubscribeUrl}}'].map(
                    (tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded-lg bg-surface border border-subtle text-indigo-500 font-semibold">
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Save as Reusable Template Checkbox */}
              <label htmlFor="saveTplCheck" className="flex items-center gap-2.5 pt-2 cursor-pointer">
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center transition-all ${wizSaveAsTemplate ? 'bg-indigo-600 text-white shadow-xs' : 'border border-subtle bg-surface'
                    }`}
                >
                  {wizSaveAsTemplate && <Check className="w-3 h-3 stroke-[3] text-white" />}
                </div>
                <input
                  type="checkbox"
                  id="saveTplCheck"
                  checked={wizSaveAsTemplate}
                  onChange={(e) => setWizSaveAsTemplate(e.target.checked)}
                  className="hidden"
                />
                <span className="text-xs text-primary font-medium">
                  Save this design to reusable Template Studio
                </span>
              </label>

              {wizSaveAsTemplate && (
                <input
                  type="text"
                  value={wizNewTemplateName}
                  onChange={(e) => setWizNewTemplateName(e.target.value)}
                  placeholder="Template Name e.g. Black Friday 2026 Layout"
                  className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              )}
            </div>
          )}

          {/* =========================================================================
              STEP 4: PREVIEW & TEST EMAIL
              ========================================================================= */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              {/* Sender Details Summary Card */}
              <div className="p-5 rounded-2xl bg-surface-elevated border border-subtle text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted uppercase text-[10px] font-bold">Campaign Details:</span>
                  <span className="text-indigo-500 font-bold">{wizName}</span>
                </div>
                <div>
                  <strong>From:</strong> {wizFromName} &lt;{wizFromEmail}&gt;
                </div>
                <div>
                  <strong>Subject:</strong> {wizSubject}
                </div>
                <div>
                  <strong>Audience:</strong>{' '}
                  {wizRecipientSource === 'ALL_ACTIVE'
                    ? `${activeSubscribersCount} Active Subscribers`
                    : wizRecipientSource === 'MANUAL'
                      ? `${parsedManualRecipients.valid.length} Manual Recipients`
                      : wizRecipientSource === 'CSV'
                        ? `${wizCsvParsedContacts.length} CSV Imported Recipients`
                        : `${selectedCrmContactIds.length} CRM Contacts`}
                </div>
              </div>

              {/* Responsive Device Frame Preview Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWizardPreviewDevice('desktop')}
                    style={{
                      backgroundColor: wizardPreviewDevice === 'desktop' ? '#4f46e5' : '#f8fafc',
                      color: wizardPreviewDevice === 'desktop' ? '#ffffff' : '#334155',
                      borderColor: wizardPreviewDevice === 'desktop' ? '#4f46e5' : '#cbd5e1',
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-xs"
                  >
                    <Monitor className="w-3.5 h-3.5" style={{ color: wizardPreviewDevice === 'desktop' ? '#ffffff' : '#475569' }} />
                    <span style={{ color: wizardPreviewDevice === 'desktop' ? '#ffffff' : '#334155' }}>Desktop (600px)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardPreviewDevice('mobile')}
                    style={{
                      backgroundColor: wizardPreviewDevice === 'mobile' ? '#4f46e5' : '#f8fafc',
                      color: wizardPreviewDevice === 'mobile' ? '#ffffff' : '#334155',
                      borderColor: wizardPreviewDevice === 'mobile' ? '#4f46e5' : '#cbd5e1',
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-xs"
                  >
                    <Smartphone className="w-3.5 h-3.5" style={{ color: wizardPreviewDevice === 'mobile' ? '#ffffff' : '#475569' }} />
                    <span style={{ color: wizardPreviewDevice === 'mobile' ? '#ffffff' : '#334155' }}>Mobile (375px)</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer">
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${showPersonalizedPreview ? 'bg-indigo-600 text-white shadow-xs' : 'border border-subtle bg-surface'
                      }`}
                  >
                    {showPersonalizedPreview && <Check className="w-3 h-3 stroke-[3] text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={showPersonalizedPreview}
                    onChange={(e) => setShowPersonalizedPreview(e.target.checked)}
                    className="hidden"
                  />
                  <span>Show with Sample Contact Data</span>
                </label>
              </div>

              {/* Sandboxed HTML Iframe Frame - Full Template Scrollable View */}
              <div
                className="p-6 bg-slate-950 rounded-2xl border border-subtle flex justify-center overflow-x-auto"
                style={{ minHeight: '660px', width: '100%' }}
              >
                <div
                  style={{
                    width: wizardPreviewDevice === 'desktop' ? '680px' : '375px',
                    height: '640px',
                    maxHeight: '75vh',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  <iframe
                    srcDoc={interpolatedPreviewHtml}
                    title="Live Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '640px',
                      flex: 1,
                      border: 0,
                      backgroundColor: '#ffffff',
                    }}
                  />
                </div>
              </div>

              {/* Send Live Test Email Box (Supports Bulk Emails) */}
              <div className="p-5 rounded-2xl bg-surface-elevated border border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-primary">
                      Send Test Email{' '}
                      {espConfig?.isLiveDelivery || espConfig?.connectionState === 'CONNECTED'
                        ? `(Live via ${(espConfig?.config?.provider || espConfig?.activeProvider || 'GMAIL').toUpperCase()})`
                        : '(Live via GMAIL)'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connected
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerInitialStep(4);
                      setIsProviderDrawerOpen(true);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>ESP Settings</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter test recipient email(s), comma or space separated: e.g. hoasptech@gmail.com, team@brand.com"
                      className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                      style={{ backgroundColor: '#059669', color: '#ffffff' }}
                    >
                      {sendingTestEmail ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-white" />
                      )}
                      <span>
                        {sendingTestEmail
                          ? 'Sending...'
                          : parsedTestEmails.length > 1
                          ? `Send Test (${parsedTestEmails.length} Recipients)`
                          : 'Send Test'}
                      </span>
                    </button>
                  </div>

                  {/* Bulk test recipient chips preview */}
                  {parsedTestEmails.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                      <span className="text-secondary font-semibold">
                        {parsedTestEmails.length} recipient{parsedTestEmails.length !== 1 ? 's' : ''} detected:
                      </span>
                      {parsedTestEmails.map((email, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-[10px]"
                        >
                          {email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              STEP 5: REVIEW & LAUNCH
              ========================================================================= */}
          {wizardStep === 5 && (
            <div className="space-y-6">
              {/* Pre-Flight Checklist */}
              {effectiveRecipientCount === 0 ? (
                <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3 text-xs">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Pre-Flight Readiness Check Failed: 0 Target Recipients Selected</span>
                  </div>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    This broadcast currently targets <strong>0 recipients</strong>. Email broadcast systems require at least one verified contact before initiating delivery. Please return to Step 2 to add subscribers, paste email addresses, or import from CRM.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    <span>Return to Step 2 (Recipients)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Campaign Delivery Readiness Card */}
                  <CampaignDeliveryReadinessCard
                    espConfig={espConfig}
                    recipientCount={effectiveRecipientCount}
                    onOpenDrawer={() => setIsProviderDrawerOpen(true)}
                  />

                  {/* Pre-Flight Checklist */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-subtle space-y-2 text-xs">
                    <div className="font-bold text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Pre-Flight Readiness Verified</span>
                    </div>
                    <ul className="space-y-1 text-secondary text-xs pl-6 list-disc">
                      <li>Sender identity verified: <strong>{wizFromName} &lt;{wizFromEmail}&gt;</strong></li>
                      <li>Subject line: <strong>{wizSubject}</strong></li>
                      <li>Dynamic CAN-SPAM / GDPR unsubscribe compliance token confirmed</li>
                      <li>Responsive HTML cross-client layout compiled</li>
                      <li>Target Audience: <strong>{effectiveRecipientCount}</strong> recipient{effectiveRecipientCount !== 1 ? 's' : ''} ({wizRecipientSource === 'ALL_ACTIVE' ? `${activeSubscribersCount} Active Subscribers` : wizRecipientSource === 'MANUAL' ? `${parsedManualRecipients.valid.length} Manual Recipients` : wizRecipientSource === 'CSV' ? `${wizCsvParsedContacts.length} CSV Contacts` : `${selectedCrmContactIds.length} CRM Contacts`})</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Delivery Timing Options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-primary">Transmission Timing</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => setSendOption('NOW')}
                    className={`p-5 rounded-2xl border-2 text-xs cursor-pointer transition flex flex-col justify-between ${sendOption === 'NOW'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                      : 'border-subtle bg-surface text-secondary hover:text-primary hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-primary">Send Immediately</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${sendOption === 'NOW'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border-2 border-subtle bg-surface'
                        }`}>
                        {sendOption === 'NOW' && <Check className="w-4 h-4 stroke-[3] text-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-2">Dispatches bulk broadcast across queue right now.</p>
                  </div>

                  <div
                    onClick={() => setSendOption('SCHEDULE')}
                    className={`p-5 rounded-2xl border-2 text-xs cursor-pointer transition flex flex-col justify-between ${sendOption === 'SCHEDULE'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                      : 'border-subtle bg-surface text-secondary hover:text-primary hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-500" />
                        <span className="text-primary">Schedule Later</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${sendOption === 'SCHEDULE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border-2 border-subtle bg-surface'
                        }`}>
                        {sendOption === 'SCHEDULE' && <Check className="w-4 h-4 stroke-[3] text-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-2">Sets delivery for a specific date and time.</p>
                  </div>

                  <div
                    onClick={() => setSendOption('DRAFT')}
                    className={`p-5 rounded-2xl border-2 text-xs cursor-pointer transition flex flex-col justify-between ${sendOption === 'DRAFT'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 ring-2 ring-indigo-500/25 shadow-md'
                      : 'border-subtle bg-surface text-secondary hover:text-primary hover:bg-surface-elevated hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-bold text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-primary">Save as Draft</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${sendOption === 'DRAFT'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border-2 border-subtle bg-surface'
                        }`}>
                        {sendOption === 'DRAFT' && <Check className="w-4 h-4 stroke-[3] text-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mt-2">Preserves settings without transmitting.</p>
                  </div>
                </div>

                {sendOption === 'SCHEDULE' && (
                  <div className="pt-3">
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Choose Transmission Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="flex items-center justify-between pt-4 border-t border-subtle">
          {wizardStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-xl transition cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back Step</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsWizardOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            {wizardStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 active:from-indigo-700 active:to-purple-700 rounded-xl shadow-md shadow-indigo-500/25 transition cursor-pointer"
              >
                <span>Continue to Step {wizardStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : effectiveRecipientCount === 0 && sendOption === 'NOW' ? (
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-500" />
                <span>Add Recipients in Step 2 to Launch</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunchCampaign}
                disabled={isSubmittingCampaign}
                className="inline-flex items-center gap-2 px-7 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 rounded-xl shadow-lg shadow-indigo-500/30 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCampaign ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Broadcast...</span>
                  </>
                ) : sendOption === 'NOW' ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Launch Bulk Campaign Now 🚀</span>
                  </>
                ) : sendOption === 'SCHEDULE' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Schedule Transmission</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Save as Draft</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border shadow-2xl max-w-md ${toastMessage.type === 'success'
              ? 'bg-surface border-emerald-500/40 text-primary shadow-emerald-950/20'
              : toastMessage.type === 'error'
                ? 'bg-surface border-rose-500/40 text-primary shadow-rose-950/20'
                : 'bg-surface border-indigo-500/40 text-primary shadow-indigo-950/20'
              }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h4 className="font-bold text-sm tracking-tight">{toastMessage.title}</h4>
              <p className="text-xs text-secondary mt-0.5 leading-relaxed">{toastMessage.desc}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-muted hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header with High-Impact Primary Actions */}
      <PageHeader
        category="Omnichannel Email Marketing Suite"
        categoryIcon={Mail}
        badge={espConfig?.isLiveDelivery ? `Live ESP (${(espConfig.activeProvider || 'smtp').toUpperCase()})` : 'ESP in Sandbox Mode'}
        badgeVariant={espConfig?.isLiveDelivery ? 'success' : 'amber'}
        title="Email Marketing & Broadcast Studio"
        description="Compose high-impact HTML emails, import verified customer audiences, upload custom templates, and dispatch high-deliverability bulk marketing campaigns."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                const el = document.getElementById('email-provider-setup-studio');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  setIsProviderDrawerOpen(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer whitespace-nowrap ${espConfig?.isLiveDelivery
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              title="Configure Amazon SES, SendGrid, Brevo, Mailgun, Gmail or SMTP"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{espConfig?.isLiveDelivery ? `ESP: ${(espConfig.activeProvider || 'smtp').toUpperCase()} (Connected)` : 'Connect Email Provider'}</span>
            </button>

            <button
              onClick={handleSyncCrm}
              disabled={syncingCrm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Import all valid customer leads and email contacts from Brand CRM"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 ${syncingCrm ? 'animate-spin' : ''}`} />
              <span>{syncingCrm ? 'Syncing...' : 'Sync CRM'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Download full audience contact list as CSV"
            >
              <Download className="w-3.5 h-3.5 text-muted" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => openWizardAt(3, 'UPLOAD_HTML')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition shadow-xs cursor-pointer whitespace-nowrap"
              title="Upload an HTML file and prepare for dispatch"
            >
              <FileCode className="w-3.5 h-3.5 text-indigo-500" />
              <span>Upload HTML</span>
            </button>

            <button
              onClick={() => openWizardAt(1)}
              data-testid="create-campaign-header-btn"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>+ Create Campaign</span>
            </button>
          </div>
        }
      />

      {/* 2026 SaaS Fast-Action Launchpad Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </span>
              <h2 className="text-base font-bold text-primary tracking-tight">
                Bulk Email Marketing & HTML Dispatch Studio
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ESP Rate-Safe Batches of 50
              </span>
            </div>
            <p className="text-secondary text-xs sm:text-sm leading-relaxed">
              Upload custom responsive HTML templates, import contacts via CSV or Brand CRM, and broadcast bulk campaigns with automated CAN-SPAM compliance, 1x1 open pixel tracking, and click telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => openWizardAt(3, 'UPLOAD_HTML')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Upload .HTML File</span>
            </button>

            <button
              onClick={() => openWizardAt(2, undefined, 'CSV')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl transition shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import CSV Audience</span>
            </button>

            <button
              onClick={() => openWizardAt(1)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-md shadow-indigo-500/20 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>+ Create Campaign</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2026 SaaS Centered Email Service Connection Dashboard (Max 1200px Width) */}
      <EmailServiceDashboardCard
        espConfig={espConfig}
        onOpenDrawer={(providerId) => {
          setDrawerInitialProviderId(providerId);
          setDrawerInitialStep(providerId ? 2 : 1);
          setIsProviderDrawerOpen(true);
        }}
        onTestConnection={() => {
          setDrawerInitialProviderId(espConfig?.config?.provider);
          setDrawerInitialStep(4);
          setIsProviderDrawerOpen(true);
        }}
        onDisconnect={handleDisconnectEsp}
        loading={loadingEsp}
      />

      {/* KPI Ribbon - Genuine Data Only (No Fabrications!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Verified Audience"
          value={totalSubscribers.toLocaleString()}
          icon={Users}
          iconColor="text-indigo-500"
          iconBg="bg-indigo-500/10 border-indigo-500/20"
          trend={{
            value: `${activeSubscribersCount} Active`,
            label: 'Subscribed contacts',
            positive: activeSubscribersCount > 0,
            neutral: activeSubscribersCount === 0,
          }}
          description="Total opted-in subscriber audience"
        />

        <StatCard
          title="Campaigns Sent"
          value={totalSentCampaigns.toLocaleString()}
          icon={Send}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10 border-purple-500/20"
          trend={{ value: `${totalDraftCampaigns} Drafts`, label: 'In creation', neutral: true }}
          description="Dispatched marketing broadcasts"
        />

        <StatCard
          title="Average Open Rate"
          value={totalSentCampaigns > 0 ? `${avgOpenRate}%` : '—'}
          icon={Eye}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10 border-emerald-500/20"
          progress={
            totalSentCampaigns > 0
              ? { percent: avgOpenRate, color: 'bg-emerald-500', label: `${avgOpenRate}% Verified` }
              : undefined
          }
          description="Unique inbox open rate"
        />

        <StatCard
          title="Click-Through Rate (CTR)"
          value={totalSentCampaigns > 0 ? `${avgClickRate}%` : '—'}
          icon={MousePointerClick}
          iconColor="text-pink-500"
          iconBg="bg-pink-500/10 border-pink-500/20"
          progress={
            totalSentCampaigns > 0
              ? { percent: avgClickRate * 2, color: 'bg-pink-500', label: `${avgClickRate}% CTR` }
              : undefined
          }
          description="Audience engagement & clicks"
        />
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-subtle pb-4">
        <SegmentedTabs
          tabs={[
            { id: 'CAMPAIGNS', label: 'Broadcasts & Campaigns', icon: Send, count: campaigns.length },
            { id: 'TEMPLATES', label: 'Template Studio', icon: LayoutTemplate, count: templates.length },
            { id: 'SUBSCRIBERS', label: 'Audience & Leads', icon: Users, count: totalSubscribers },
            { id: 'JOURNEYS', label: 'Automated Drips', icon: GitBranch, count: '4 Active', countVariant: 'emerald' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* Tab Contextual Toolbar */}
        {activeTab === 'CAMPAIGNS' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Search campaigns..."
                className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-primary placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            <select
              value={campaignStatusFilter}
              onChange={(e) => setCampaignStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-primary focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SENT">Delivered</option>
              <option value="DRAFT">Drafts</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
          </div>
        )}

        {activeTab === 'TEMPLATES' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsTemplateDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              <UploadCloud className="w-3.5 h-3.5 text-white" />
              <span>Upload HTML Template</span>
            </button>
          </div>
        )}

        {activeTab === 'SUBSCRIBERS' && (
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={subscriberSearch}
                onChange={(e) => setSubscriberSearch(e.target.value)}
                placeholder="Search email, name..."
                className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-surface border border-subtle rounded-lg text-primary placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            <button
              onClick={() => setIsAddSubscriberOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Subscriber</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: CAMPAIGNS & BROADCASTS
          ========================================================================= */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" />
                <span>Campaign History & Broadcast Schedule</span>
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Track delivery confirmations, real open telemetry, and subscriber click performance.
              </p>
            </div>

            <button
              onClick={() => openWizardAt(1)}
              data-testid="create-campaign-card-header-btn"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              <span>+ Create Campaign</span>
            </button>
          </div>

          {loadingCampaigns ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-xs text-secondary font-medium">Loading campaign records...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-subtle bg-surface/50 max-w-3xl mx-auto my-4 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 mx-auto shadow-md shadow-indigo-500/10">
                <Mail className="w-7 h-7 text-indigo-500" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-lg font-bold text-primary tracking-tight">
                  No Email Campaigns Created Yet
                </h3>
                <p className="text-secondary text-xs sm:text-sm leading-relaxed">
                  Upload your responsive HTML newsletter or import a customer audience from CRM or CSV to send your first bulk email blast.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => openWizardAt(1)}
                  data-testid="empty-state-create-campaign-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-500/25 transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                  <span>+ Create First Campaign</span>
                </button>
              </div>

              {/* 3 Quick-Action Interactive Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 text-left border-t border-subtle">
                <button
                  onClick={() => openWizardAt(3, 'UPLOAD_HTML')}
                  className="p-3.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-subtle hover:border-indigo-500/40 transition group cursor-pointer text-left space-y-1.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-primary group-hover:text-indigo-500 transition">
                    Upload .HTML Template
                  </h4>
                  <p className="text-[11px] text-secondary leading-snug">
                    Drag and drop a custom responsive HTML newsletter.
                  </p>
                </button>

                <button
                  onClick={() => openWizardAt(2, undefined, 'CSV')}
                  className="p-3.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-subtle hover:border-emerald-500/40 transition group cursor-pointer text-left space-y-1.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-primary group-hover:text-emerald-500 transition">
                    Import Audience CSV
                  </h4>
                  <p className="text-[11px] text-secondary leading-snug">
                    Upload customer contacts with names, tags, and company.
                  </p>
                </button>

                <button
                  onClick={() => openWizardAt(2, undefined, 'CRM')}
                  className="p-3.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-subtle hover:border-purple-500/40 transition group cursor-pointer text-left space-y-1.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-105 transition">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-primary group-hover:text-purple-500 transition">
                    Target CRM Leads
                  </h4>
                  <p className="text-[11px] text-secondary leading-snug">
                    Directly broadcast to verified leads in HoaspForge CRM.
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-subtle text-muted uppercase tracking-wider text-[10px]">
                    <th className="pb-3.5 font-semibold">Campaign Name & Subject</th>
                    <th className="pb-3.5 font-semibold">Status</th>
                    <th className="pb-3.5 font-semibold">Audience</th>
                    <th className="pb-3.5 font-semibold">Delivered</th>
                    <th className="pb-3.5 font-semibold">Open Rate</th>
                    <th className="pb-3.5 font-semibold">Click Rate</th>
                    <th className="pb-3.5 font-semibold">Date Transmitted</th>
                    <th className="pb-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {filteredCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-hover transition group">
                      <td className="py-4 pr-3">
                        <div className="font-bold text-primary group-hover:text-indigo-500 transition">
                          {c.name}
                        </div>
                        <div className="text-secondary text-[11px] truncate max-w-sm mt-0.5">
                          {c.subject}
                        </div>
                      </td>
                      <td className="py-4">
                        <StatusBadge
                          status={c.status === 'SENT' ? 'ACTIVE' : c.status === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT'}
                          label={c.status}
                          size="sm"
                        />
                      </td>
                      <td className="py-4 font-mono font-medium text-secondary">
                        {c.recipientCount.toLocaleString()}
                      </td>
                      <td className="py-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {c.deliveredCount.toLocaleString()}
                      </td>
                      <td className="py-4">
                        {c.status === 'SENT' ? (
                          <span className="font-mono text-primary font-semibold">{c.openRate}%</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-4">
                        {c.status === 'SENT' ? (
                          <span className="font-mono text-primary font-semibold">{c.clickRate}%</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="py-4 text-muted text-[11px] font-mono">
                        {c.sentAt ? new Date(c.sentAt).toLocaleDateString() : c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : 'Draft'}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setInspectCampaign(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-secondary hover:text-primary bg-surface-elevated hover:bg-surface-hover border border-subtle rounded-md transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Logs</span>
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
      )}

      {/* =========================================================================
          TAB 2: TEMPLATE STUDIO
          ========================================================================= */}
      {activeTab === 'TEMPLATES' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-indigo-500" />
                <span>Responsive Template Studio</span>
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Preview, manage, and upload reusable HTML layouts with dynamic brand interpolation.
              </p>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['ALL', 'NEWSLETTER', 'PROMOTION', 'WELCOME', 'CUSTOM'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition cursor-pointer whitespace-nowrap ${templateCategoryFilter === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-surface-elevated text-secondary hover:text-primary border border-subtle'
                    }`}
                >
                  {cat.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-xl bg-surface-elevated border border-subtle hover:border-slate-300 dark:hover:border-slate-700 transition overflow-hidden flex flex-col justify-between group shadow-xs"
              >
                {/* HTML Iframe Preview Snippet */}
                <div className="h-44 bg-slate-900 border-b border-subtle relative overflow-hidden pointer-events-none">
                  <iframe
                    srcDoc={tpl.htmlContent}
                    title={tpl.name}
                    className="w-[600px] h-[440px] transform scale-[0.45] origin-top-left border-0 bg-white"
                  />
                  <div className="absolute inset-0 bg-transparent" />
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase font-mono">
                        {tpl.category}
                      </span>
                      {tpl.isSystem ? (
                        <span className="text-[10px] text-muted font-medium">System Template</span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium">Custom Design</span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-primary mt-2 group-hover:text-indigo-500 transition">
                      {tpl.name}
                    </h3>
                    {tpl.subject && (
                      <p className="text-secondary text-xs truncate mt-0.5">Subject: {tpl.subject}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-subtle mt-4">
                    <button
                      onClick={() => setPreviewTemplate(tpl)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Preview</span>
                    </button>

                    <button
                      onClick={() => {
                        setWizHtmlContent(tpl.htmlContent);
                        setWizSelectedTemplateId(tpl.id);
                        if (tpl.subject) setWizSubject(tpl.subject);
                        setWizardStep(3);
                        setIsWizardOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <span>Use in Campaign</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SUBSCRIBERS & AUDIENCE LEADS
          ========================================================================= */}
      {activeTab === 'SUBSCRIBERS' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-subtle">
            <div>
              <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>Audience Database & Consent Registry</span>
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Manage contact subscriptions, CRM synchronized profiles, and opt-out preferences.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={subscriberStatusFilter}
                onChange={(e) => setSubscriberStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-surface-elevated border border-subtle rounded-lg text-primary focus:outline-none focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBSCRIBED">Subscribed</option>
                <option value="UNSUBSCRIBED">Opted Out</option>
              </select>
            </div>
          </div>

          {loadingSubscribers ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-xs text-secondary font-medium">Loading audience records...</p>
            </div>
          ) : subscribers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Subscribers Found"
              description="Import customer contacts from your CRM or add email addresses directly to begin building your audience."
              action={
                <button
                  onClick={() => setIsAddSubscriberOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-white" />
                  <span>Add First Subscriber</span>
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-subtle text-muted uppercase tracking-wider text-[10px]">
                    <th className="pb-3.5 font-semibold">Subscriber & Name</th>
                    <th className="pb-3.5 font-semibold">Company</th>
                    <th className="pb-3.5 font-semibold">Consent Status</th>
                    <th className="pb-3.5 font-semibold">Acquisition Source</th>
                    <th className="pb-3.5 font-semibold">Subscribed Date</th>
                    <th className="pb-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover transition">
                      <td className="py-3.5">
                        <div className="font-semibold text-primary">{s.fullName}</div>
                        <div className="text-secondary text-[11px] font-mono mt-0.5">{s.email}</div>
                      </td>
                      <td className="py-3.5 text-secondary">{s.company || '—'}</td>
                      <td className="py-3.5">
                        <StatusBadge
                          status={s.status === 'SUBSCRIBED' ? 'ACTIVE' : 'FAILED'}
                          label={s.status}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-elevated border border-subtle text-secondary uppercase font-mono">
                          {s.source.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 text-muted text-[11px] font-mono">
                        {new Date(s.subscribedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right">
                        {s.status === 'SUBSCRIBED' && (
                          <button
                            onClick={async () => {
                              if (!activeBrand?.id) return;
                              await api.email.unsubscribe(activeBrand.id, s.id);
                              showToast('Unsubscribed', `${s.email} has been unsubscribed.`, 'info');
                              await loadSubscribers();
                            }}
                            className="text-xs text-rose-500 hover:underline cursor-pointer"
                          >
                            Unsubscribe
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: SUBSCRIBER JOURNEYS
          ========================================================================= */}
      {activeTab === 'JOURNEYS' && (
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-subtle shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-500" />
              <span>Automated Drip Sequences & Customer Journeys</span>
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Multi-step trigger workflows transmitting targeted emails upon CRM lead creation, sign-up, or catalog views.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              {
                title: 'New Lead Onboarding Flow',
                trigger: 'When lead created in CRM',
                steps: 3,
                active: true,
                desc: 'Instant welcome note, followed by portfolio case study 2 days later.',
              },
              {
                title: 'VIP Client Retention Drip',
                trigger: 'Tag: VIP added',
                steps: 4,
                active: true,
                desc: 'Quarterly executive check-in and exclusive product previews.',
              },
            ].map((j, i) => (
              <div key={i} className="p-4 rounded-xl bg-surface-elevated border border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">{j.title}</span>
                  <StatusBadge status="ACTIVE" label="Active Sequence" size="sm" />
                </div>
                <p className="text-xs text-secondary leading-relaxed">{j.desc}</p>
                <div className="flex items-center justify-between text-[11px] text-muted pt-2 border-t border-subtle">
                  <span>Trigger: {j.trigger}</span>
                  <span className="font-semibold text-indigo-500">{j.steps} Steps</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CAMPAIGN INSPECTION & DELIVERY LOGS (Spacious In-Page Modal)
          ========================================================================= */}
      <Modal
        isOpen={!!inspectCampaign}
        onClose={() => setInspectCampaign(null)}
        title={inspectCampaign?.name || 'Campaign Details'}
        subtitle={`Subject: "${inspectCampaign?.subject || ''}"`}
        maxWidth="xl"
      >
        {inspectCampaign && (
          <div className="space-y-5 text-xs">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-surface-elevated p-3 rounded-xl border border-subtle">
                <span className="text-secondary text-[11px]">Audience</span>
                <span className="text-lg font-bold text-primary block mt-0.5">
                  {inspectCampaign.recipientCount.toLocaleString()}
                </span>
              </div>
              <div className="bg-surface-elevated p-3 rounded-xl border border-subtle">
                <span className="text-emerald-500 text-[11px]">Delivered</span>
                <span className="text-lg font-bold text-emerald-500 block mt-0.5">
                  {inspectCampaign.deliveredCount.toLocaleString()}
                </span>
              </div>
              <div className="bg-surface-elevated p-3 rounded-xl border border-subtle">
                <span className="text-sky-500 text-[11px]">Opened</span>
                <span className="text-lg font-bold text-sky-500 block mt-0.5">
                  {inspectCampaign.openedCount.toLocaleString()}
                </span>
              </div>
              <div className="bg-surface-elevated p-3 rounded-xl border border-subtle">
                <span className="text-pink-500 text-[11px]">Clicks</span>
                <span className="text-lg font-bold text-pink-500 block mt-0.5">
                  {inspectCampaign.clickedCount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Delivery Logs Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">Individual Recipient Delivery Logs</span>
                <span className="text-muted text-[11px] font-mono">{campaignDeliveries.length} Records</span>
              </div>

              {loadingDeliveries ? (
                <div className="py-12 text-center text-secondary">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading delivery log records...
                </div>
              ) : campaignDeliveries.length === 0 ? (
                <div className="p-6 text-center text-muted bg-surface-elevated rounded-xl border border-subtle">
                  No individual recipient delivery logs recorded yet.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-subtle border border-subtle rounded-xl bg-surface-elevated">
                  {campaignDeliveries.map((d) => (
                    <div key={d.id} className="p-3 flex items-center justify-between hover:bg-surface transition">
                      <div className="font-mono text-secondary">{d.email}</div>
                      <div className="flex items-center gap-3">
                        <StatusBadge
                          status={d.status === 'DELIVERED' ? 'ACTIVE' : d.status === 'OPENED' ? 'SCHEDULED' : 'FAILED'}
                          label={d.status}
                          size="sm"
                        />
                        <span className="text-muted text-[10px] font-mono">
                          {new Date(d.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rendered HTML Preview */}
            {inspectCampaign.htmlContent && (
              <div className="space-y-2 pt-2 border-t border-subtle">
                <span className="font-bold text-primary">Transmitted HTML Layout Preview</span>
                <div className="bg-slate-900 p-4 rounded-xl border border-subtle">
                  <iframe
                    srcDoc={inspectCampaign.htmlContent}
                    title="Campaign HTML"
                    className="w-full h-80 border-0 bg-white rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: PREVIEW TEMPLATE STUDIO ITEM (Spacious Centered Modal)
          ========================================================================= */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name || 'Template Preview'}
        subtitle={`Category: ${previewTemplate?.category.toUpperCase()}`}
        maxWidth="xl"
      >
        {previewTemplate && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDeviceMode('desktop')}
                  style={{
                    backgroundColor: previewDeviceMode === 'desktop' ? '#4f46e5' : '#f8fafc',
                    color: previewDeviceMode === 'desktop' ? '#ffffff' : '#334155',
                    borderColor: previewDeviceMode === 'desktop' ? '#4f46e5' : '#cbd5e1',
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-xs"
                >
                  <Monitor className="w-3.5 h-3.5" style={{ color: previewDeviceMode === 'desktop' ? '#ffffff' : '#475569' }} />
                  <span style={{ color: previewDeviceMode === 'desktop' ? '#ffffff' : '#334155' }}>Desktop (600px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDeviceMode('mobile')}
                  style={{
                    backgroundColor: previewDeviceMode === 'mobile' ? '#4f46e5' : '#f8fafc',
                    color: previewDeviceMode === 'mobile' ? '#ffffff' : '#334155',
                    borderColor: previewDeviceMode === 'mobile' ? '#4f46e5' : '#cbd5e1',
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5" style={{ color: previewDeviceMode === 'mobile' ? '#ffffff' : '#475569' }} />
                  <span style={{ color: previewDeviceMode === 'mobile' ? '#ffffff' : '#334155' }}>Mobile (375px)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWizHtmlContent(previewTemplate.htmlContent);
                  setWizSelectedTemplateId(previewTemplate.id);
                  if (previewTemplate.subject) setWizSubject(previewTemplate.subject);
                  setPreviewTemplate(null);
                  setWizardStep(3);
                  setIsWizardOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition cursor-pointer"
                style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}
              >
                <span>Use in Campaign</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <div
              className="p-6 bg-slate-950 rounded-2xl border border-subtle flex justify-center overflow-x-auto"
              style={{ minHeight: '660px', width: '100%' }}
            >
              <div
                style={{
                  width: previewDeviceMode === 'desktop' ? '680px' : '375px',
                  height: '640px',
                  maxHeight: '75vh',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                <iframe
                  srcDoc={previewTemplate.htmlContent}
                  title="Template Preview Frame"
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '640px',
                    flex: 1,
                    border: 0,
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: UPLOAD NEW TEMPLATE (Spacious Centered Modal)
          ========================================================================= */}
      <Modal
        isOpen={isTemplateDrawerOpen}
        onClose={() => setIsTemplateDrawerOpen(false)}
        title="Upload HTML Template to Studio"
        subtitle="Add a custom HTML design to your brand's reusable email templates library."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <button
              type="button"
              onClick={() => setIsTemplateDrawerOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCustomTemplate}
              disabled={savingTemplate || !tplName.trim() || !tplHtml.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingTemplate ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">
              Template Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="e.g. VIP Product Drop Layout"
              className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Category</label>
              <select
                value={tplCategory}
                onChange={(e) => setTplCategory(e.target.value)}
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-3 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs cursor-pointer"
              >
                <option value="newsletter">Newsletter</option>
                <option value="promotion">Promotion</option>
                <option value="welcome">Welcome</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Default Subject (Optional)</label>
              <input
                type="text"
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
                placeholder="Subject line"
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-secondary">
                HTML Content <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => templateFileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
                <span>Upload .HTML File</span>
              </button>
              <input
                ref={templateFileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const content = evt.target?.result as string;
                    if (content) setTplHtml(content);
                  };
                  reader.readAsText(file);
                }}
                className="hidden"
              />
            </div>
            <textarea
              rows={10}
              value={tplHtml}
              onChange={(e) => setTplHtml(e.target.value)}
              placeholder="Paste HTML source code here or upload .html file..."
              className="w-full bg-slate-950 text-indigo-300 font-mono border border-subtle rounded-xl p-4 text-xs focus:outline-none focus:border-indigo-500 shadow-xs"
            />
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: ADD SUBSCRIBER (Single & Bulk Paste Support)
          ========================================================================= */}
      <Modal
        isOpen={isAddSubscriberOpen}
        onClose={() => setIsAddSubscriberOpen(false)}
        title={subAddMode === 'bulk' ? 'Add Bulk Subscribers' : 'Add Single Subscriber'}
        subtitle={
          subAddMode === 'bulk'
            ? 'Paste multiple email addresses at once to rapidly expand your audience.'
            : 'Opt-in a single customer email address to your brand audience.'
        }
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 p-1 bg-surface-elevated rounded-xl border border-subtle">
              <button
                type="button"
                onClick={() => setSubAddMode('single')}
                style={{
                  backgroundColor: subAddMode === 'single' ? '#4f46e5' : 'transparent',
                  color: subAddMode === 'single' ? '#ffffff' : '#64748b',
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Single Contact
              </button>
              <button
                type="button"
                onClick={() => setSubAddMode('bulk')}
                style={{
                  backgroundColor: subAddMode === 'bulk' ? '#4f46e5' : 'transparent',
                  color: subAddMode === 'bulk' ? '#ffffff' : '#64748b',
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Bulk Paste
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddSubscriberOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-secondary hover:text-primary transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubscriberSubmit}
                disabled={addingSubscriber || (subAddMode === 'bulk' ? parsedBulkSubscribers.length === 0 : !subEmail.trim())}
                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>
                  {addingSubscriber
                    ? 'Adding...'
                    : subAddMode === 'bulk'
                    ? `Add ${parsedBulkSubscribers.length} Subscriber${parsedBulkSubscribers.length !== 1 ? 's' : ''}`
                    : 'Add Contact'}
                </span>
              </button>
            </div>
          </div>
        }
      >
        {subAddMode === 'bulk' ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-primary">
                  Paste Email Addresses <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {parsedBulkSubscribers.length} valid email{parsedBulkSubscribers.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              <textarea
                rows={8}
                value={subBulkInput}
                onChange={(e) => setSubBulkInput(e.target.value)}
                placeholder="hoasptech@gmail.com&#10;Elena Rostova <elena@acme.com>&#10;sales@brand.io&#10;client@enterprise.com"
                className="w-full bg-surface-elevated border border-subtle rounded-xl p-3.5 text-xs text-primary font-mono focus:outline-none focus:border-indigo-500 shadow-xs resize-none"
              />
              <p className="text-[11px] text-muted mt-1">
                Accepts comma, newline, or semicolon separated emails or <code>Name &lt;email@domain.com&gt;</code> format.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Assign Tags to Bulk Contacts</label>
              <input
                type="text"
                value={subTags}
                onChange={(e) => setSubTags(e.target.value)}
                placeholder="BulkImport, VIP, Summer2026"
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={subEmail}
                onChange={(e) => setSubEmail(e.target.value)}
                placeholder="e.g. client@company.com"
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">First Name</label>
                <input
                  type="text"
                  value={subFirstName}
                  onChange={(e) => setSubFirstName(e.target.value)}
                  placeholder="Elena"
                  className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={subLastName}
                  onChange={(e) => setSubLastName(e.target.value)}
                  placeholder="Rostova"
                  className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Company / Organization</label>
              <input
                type="text"
                value={subCompany}
                onChange={(e) => setSubCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Tags (Comma-separated)</label>
              <input
                type="text"
                value={subTags}
                onChange={(e) => setSubTags(e.target.value)}
                placeholder="VIP, Summer2026, Wholesale"
                className="w-full bg-surface-elevated border border-subtle rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-subtle">
              <input
                type="checkbox"
                id="subSaveCrmCheck"
                checked={subSaveToCrm}
                onChange={(e) => setSubSaveToCrm(e.target.checked)}
                className="rounded text-indigo-600 w-4 h-4"
              />
              <label htmlFor="subSaveCrmCheck" className="text-xs text-primary font-medium cursor-pointer">
                Also save this contact in HoaspForge CRM
              </label>
            </div>
          </div>
        )}
      </Modal>

      {/* Guided 5-Step Email Provider Connection Slide-Over Drawer */}
      <EmailProviderDrawer
        isOpen={isProviderDrawerOpen}
        onClose={() => {
          setIsProviderDrawerOpen(false);
          setDrawerInitialStep(undefined);
          setDrawerInitialProviderId(undefined);
        }}
        activeBrand={activeBrand}
        user={user}
        espConfig={espConfig}
        onConfigSaved={loadEspConfig}
        onLaunchCampaignWizard={() => openWizardAt(1)}
        initialStep={drawerInitialStep}
        initialProviderId={drawerInitialProviderId}
      />
    </div>
  );
};
