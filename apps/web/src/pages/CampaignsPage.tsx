import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Rocket,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Plus,
  Play,
  Share2,
  TrendingUp,
  Tag,
  Lightbulb,
  UserCheck,
  Layers,
  ChevronRight,
  ExternalLink,
  Edit3,
  Trash2,
  RefreshCw,
  Eye,
  Check,
  Copy,
  AlertCircle,
  Video,
  Image as ImageIcon,
  FileText,
  X,
  Target,
  Send,
  CheckSquare,
  Square,
  Hash,
  PieChart,
  Users,
  MessageSquare,
  Compass,
  BarChart2,
  Wand2,
  Globe,
  ShieldCheck,
  Languages,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import type {
  Campaign,
  CampaignGoal,
  CampaignDuration,
  CampaignStrategy,
  CampaignStrategyPost,
  CampaignPlatform,
} from '@socialforge/shared';
import './CampaignsPage.css';

// 7. AI CONTENT GENERATOR — 11 AI Actions for Single Post Transformation
const SINGLE_POST_AI_ACTIONS = [
  { id: 'rewrite', label: 'Rewrite', icon: '🔄', title: 'Rewrite from fresh creative angle' },
  { id: 'shorten', label: 'Shorten', icon: '⚡', title: 'Cut filler words & make punchy' },
  { id: 'expand', label: 'Expand', icon: '📖', title: 'Elaborate with deeper context' },
  { id: 'professional', label: 'Professional', icon: '👔', title: 'Executive B2B tone' },
  { id: 'friendly', label: 'Friendly', icon: '😊', title: 'Warm & community-focused' },
  { id: 'funny', label: 'Funny', icon: '😂', title: 'Witty humor & relatable energy' },
  { id: 'educational', label: 'Educational', icon: '💡', title: 'Step-by-step masterclass' },
  { id: 'persuasive', label: 'Persuasive', icon: '🎯', title: 'High-converting with urgency' },
  { id: 'luxury', label: 'Luxury', icon: '✨', title: 'Exclusive & sophisticated' },
  { id: 'conversational', label: 'Conversational', icon: '💬', title: '1-on-1 dialogue with questions' },
  { id: 'translate', label: 'Translate', icon: '🌐', title: 'Translate into target language' },
];

const TARGET_LANGUAGES = [
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Hindi',
  'Chinese',
  'Arabic',
  'Dutch',
];

interface CampaignsPageProps {
  onNavigate?: (tab: string, context?: any) => void;
  initialContext?: any;
}

const GOAL_OPTIONS: Array<{
  id: CampaignGoal;
  label: string;
  desc: string;
  icon: any;
}> = [
    {
      id: 'awareness',
      label: 'Awareness',
      desc: 'Maximize reach, share-of-voice, and introduce your brand mission',
      icon: Sparkles,
    },
    {
      id: 'engagement',
      label: 'Engagement',
      desc: 'Spark meaningful conversations, comments, saves, and discussions',
      icon: Lightbulb,
    },
    {
      id: 'leads',
      label: 'Leads',
      desc: 'Capture high-intent email signups, demos, and free resource downloads',
      icon: UserCheck,
    },
    {
      id: 'sales',
      label: 'Sales',
      desc: 'Drive direct purchases, launch drops, and high-converting checkouts',
      icon: Rocket,
    },
    {
      id: 'traffic',
      label: 'Traffic',
      desc: 'Funnel organic feed visitors into website, blog, or product pages',
      icon: TrendingUp,
    },
    {
      id: 'launch',
      label: 'Launch',
      desc: 'Full-court milestone launch for a new product, service, or major release',
      icon: Target,
    },
    {
      id: 'promotion',
      label: 'Promotion',
      desc: 'Seasonal urgency, discounts, bundles, and limited-time offers',
      icon: Tag,
    },
    {
      id: 'education',
      label: 'Education',
      desc: 'Masterclass-style how-tos, teardowns, and actionable industry frameworks',
      icon: Layers,
    },
  ];

const DURATION_OPTIONS: Array<{
  id: CampaignDuration;
  label: string;
  posts: string;
  desc: string;
  recommended?: boolean;
}> = [
    {
      id: '3_days',
      label: '3 Days',
      posts: '3 posts',
      desc: 'Hook → Solution → Direct Conversion Sprint',
    },
    {
      id: '7_days',
      label: '7 Days',
      posts: '4 posts',
      desc: 'Hook → Solution → Proof → Launch Offer',
      recommended: true,
    },
    {
      id: '14_days',
      label: '14 Days',
      posts: '6 posts',
      desc: 'Agitation → Education → Trial Proof → Q&A → Conversion',
    },
    {
      id: '30_days',
      label: '30 Days',
      posts: '8 posts',
      desc: 'Comprehensive monthly arc with compounding multi-stage engagement',
    },
    {
      id: 'custom',
      label: 'Custom',
      posts: 'Custom',
      desc: 'Specify your exact duration and optimal posting pacing',
    },
  ];

const PLATFORM_OPTIONS: Array<{
  id: CampaignPlatform;
  label: string;
  badge: string;
  color: string;
}> = [
    { id: 'instagram', label: 'Instagram', badge: 'Reels & Carousels', color: '#E1306C' },
    { id: 'facebook', label: 'Facebook', badge: 'Feed & Groups', color: '#1877F2' },
    { id: 'linkedin', label: 'LinkedIn', badge: 'Thought Leadership', color: '#0A66C2' },
    { id: 'x', label: 'X (Twitter)', badge: 'Threads & Viral Hooks', color: '#1DA1F2' },
  ];

const PROMPT_SUGGESTIONS = [
  'We are launching a new AI accounting product.',
  'Launching our Ultra-Hydrating Botanical Night Serum with 20% early-bird discount',
  'Automated zero-touch B2B expense auditing platform for financial controllers',
  'Autumn Skin Barrier Repair Week with clinical dermatologist tips & bundle offer',
];

export const CampaignsPage: React.FC<CampaignsPageProps> = ({ onNavigate, initialContext }) => {
  const { activeBrand } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // 3 Tabs: 'generator' (Campaign Generator), 'campaigns' (Active Brand Campaigns), 'arc' (Autumn Radiance Sprint Arc / Selected Arc)
  const [activeTab, setActiveTab] = useState<'generator' | 'campaigns' | 'arc'>('generator');

  // Campaign List Filter: 'all' | 'active' | 'scheduled' | 'completed'
  const [campaignListFilter, setCampaignListFilter] = useState<'all' | 'active' | 'scheduled' | 'completed'>('all');

  // 6-step Creation Wizard: 1. Goal -> 2. Audience -> 3. Campaign details -> 4. AI plan -> 5. Review/edit -> 6. Activate
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [businessIdea, setBusinessIdea] = useState('');
  const [campaignGoal, setCampaignGoal] = useState<CampaignGoal>('awareness');

  // Step 2: Audience
  const [targetPersona, setTargetPersona] = useState('Growth-Oriented B2B Leaders & Digital Creators');
  const [audienceSegments, setAudienceSegments] = useState<string[]>(['Early Adopters', 'Enterprise Buyers', 'Brand Champions']);
  const [geography, setGeography] = useState('Global Tier 1 (US, UK, CA, AU, EU)');
  const [painPoints, setPainPoints] = useState('Low social reach predictability, inconsistent posting workflows, fragmented cross-channel conversion');

  // Step 3: Campaign Details
  const [duration, setDuration] = useState<CampaignDuration>('7_days');
  const [customDays, setCustomDays] = useState<number>(10);
  const [selectedPlatforms, setSelectedPlatforms] = useState<CampaignPlatform[]>([
    'instagram',
    'facebook',
    'linkedin',
    'x',
  ]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<'organic' | 'paid' | 'hybrid'>('organic');

  // Paid Campaign Separation Config
  const [adAccountId, setAdAccountId] = useState('act_meta_enterprise_9918');
  const [adBudgetCents, setAdBudgetCents] = useState(50000); // $500.00
  const [adDailyBudgetCents, setAdDailyBudgetCents] = useState(7000); // $70.00/day
  const [adProducts, setAdProducts] = useState<string[]>(['feed_sponsored_post', 'story_placement']);
  const [adPermissionsVerified, setAdPermissionsVerified] = useState(true);

  // Step 4 & 5: AI plan & Review/edit
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyPreview, setStrategyPreview] = useState<CampaignStrategy | null>(null);
  const [generatingCampaign, setGeneratingCampaign] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('Flagship Multi-Channel Launch Arc');
  const [selectedCadence, setSelectedCadence] = useState<'daily' | 'alternate_days' | 'weekdays' | 'twice_daily'>('daily');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Platform selection helper
  const togglePlatform = (plat: CampaignPlatform) => {
    if (selectedPlatforms.includes(plat)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== plat));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, plat]);
    }
  };

  // Reschedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleCadence, setRescheduleCadence] = useState<'daily' | 'alternate_days' | 'weekdays' | 'twice_daily'>('daily');
  const [rescheduling, setRescheduling] = useState(false);

  // Publishing States
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [batchPublishing, setBatchPublishing] = useState(false);
  const [campaignConfirmDialog, setCampaignConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Active Variant Tab inside Drilldown
  const [activePlatformTab, setActivePlatformTab] = useState<Record<string, string>>({});

  // Single-Post AI Assistant & Transform States (Guarantees other campaign posts are untouched)
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | null>(null);
  const [transformingPostId, setTransformingPostId] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<{ postId: string; platform: string; content: string } | null>(null);
  const [singlePostLanguages, setSinglePostLanguages] = useState<Record<string, string>>({});
  const [postActionToast, setPostActionToast] = useState<{ postId: string; message: string } | null>(null);

  useEffect(() => {
    const anyModalOpen = Boolean(scheduleModalOpen || campaignConfirmDialog);
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [scheduleModalOpen, campaignConfirmDialog]);

  useEffect(() => {
    if (activeBrand) {
      loadCampaigns();
    }
  }, [activeBrand]);

  // Handle external navigation context (e.g. from Analytics AI Advisor or Calendar)
  useEffect(() => {
    if (initialContext) {
      if (initialContext.prefillCampaign) {
        const p = initialContext.prefillCampaign;
        setActiveTab('generator');
        setBusinessIdea(p.businessIdea || p.hypothesis || '');
        if (p.campaignName) setCampaignName(p.campaignName);
        if (p.goal || p.suggestedGoal) setCampaignGoal((p.goal || p.suggestedGoal) as CampaignGoal);
        if (p.executionMode || p.suggestedMode) setCampaignType(p.executionMode || p.suggestedMode);
        if (p.targetPersona) setTargetPersona(p.targetPersona);
        setWizardStep(1);
        setSuccessToast(`🎯 Pre-filled strategy from Closed-Loop AI Advisor: "${p.campaignName || 'Recommended Arc'}"`);
        setTimeout(() => setSuccessToast(null), 6000);
      } else if (initialContext.campaignId) {
        setActiveTab('arc');
        handleOpenDrilldown(initialContext.campaignId);
      } else if (initialContext.businessIdea) {
        setActiveTab('generator');
        setBusinessIdea(initialContext.businessIdea);
        if (initialContext.campaignGoal) {
          setCampaignGoal(initialContext.campaignGoal);
        }
        if (initialContext.duration) {
          const mapDuration: Record<string, CampaignDuration> = {
            '3_days': '3_days',
            '7_days': '7_days',
            '14_days': '14_days',
            '30_days': '30_days',
            'custom': 'custom',
            '3_day_sprint': '3_days',
            '7_day_arc': '7_days',
            '14_day_nurture': '14_days',
          };
          setDuration(mapDuration[initialContext.duration] || '7_days');
        }
        setWizardStep(1);
      } else {
        setActiveTab('generator');
        setWizardStep(1);
      }
    } else {
      setActiveTab('generator');
      setWizardStep(1);
    }
  }, [initialContext]);

  const loadCampaigns = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const data = await api.campaigns.list(activeBrand.id);
      setCampaigns(data);
      if (data.length > 0 && !selectedCampaign) {
        handleOpenDrilldown(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrilldown = async (campaignId: string) => {
    if (!activeBrand) return;
    setDrilldownLoading(true);
    try {
      const full = await api.campaigns.get(activeBrand.id, campaignId);
      setSelectedCampaign(full);
      const initialTabs: Record<string, string> = {};
      full.posts?.forEach((p: any) => {
        initialTabs[p.id] = 'instagram';
      });
      setActivePlatformTab(initialTabs);
    } catch (err: any) {
      console.error('Failed to load campaign drilldown:', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handlePreviewStrategy = async () => {
    if (!activeBrand) {
      setErrorMessage('Please select an active brand first.');
      return;
    }
    const promptText = businessIdea.trim();
    if (!promptText) {
      setErrorMessage('Please enter what you are promoting or select one of the example prompts below.');
      const el = document.getElementById('campaign-business-idea-input');
      if (el) el.focus();
      return;
    }
    if (selectedPlatforms.length === 0) {
      setErrorMessage('Please select at least one target platform for your campaign.');
      return;
    }

    setGeneratingStrategy(true);
    setErrorMessage(null);
    try {
      const res = await api.campaigns.previewStrategy(activeBrand.id, {
        businessIdea: promptText,
        campaignGoal,
        duration,
        customDays: duration === 'custom' ? customDays : undefined,
        platforms: selectedPlatforms,
      });
      setStrategyPreview(res);
      setCampaignName(res.campaignName || `${promptText.slice(0, 36).trim()} Campaign`);
      setWizardStep(4); // Advance to Step 4: AI Plan
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Failed to preview strategy:', err);
      setErrorMessage(err.message || 'Failed to synthesize strategy.');
    } finally {
      setGeneratingStrategy(false);
    }
  };

  const handleGenerateFullCampaign = async () => {
    if (!activeBrand || !strategyPreview) return;
    setGeneratingCampaign(true);
    setErrorMessage(null);
    try {
      const isPaidOrHybrid = campaignType === 'paid' || campaignType === 'hybrid';
      const res = await api.campaigns.generate(activeBrand.id, {
        businessIdea,
        campaignGoal,
        duration,
        customDays: duration === 'custom' ? customDays : undefined,
        platforms: selectedPlatforms,
        name: campaignName.trim() || strategyPreview.campaignName || undefined,
        startDate,
        strategy: strategyPreview,
        audience: {
          targetPersona,
          segments: audienceSegments,
          geography,
          painPoints,
        },
        campaignType,
        paidConfig: isPaidOrHybrid ? {
          separatedFromOrganic: true,
          adAccountId,
          budgetCents: adBudgetCents,
          dailyBudgetCents: adDailyBudgetCents,
          currency: 'USD',
          supportedProducts: adProducts,
          permissionsVerified: adPermissionsVerified,
          disclaimer: 'Paid campaigns must remain separated from organic execution and require supported advertising products, budgets and permissions.',
        } : null,
        status: 'scheduled', // Draft/scheduled flight - NEVER silently publish!
        connections: {
          automationsCount: 1,
          templatesCount: 2,
          approvalRequired: true,
          publishingJobsCount: strategyPreview.posts?.length || 0,
          analyticsTracking: true,
          growthRecommendationsLinked: true,
        },
      });

      setSuccessToast(`✨ Campaign "${res.name}" successfully activated in flight! Draft strategy queued safely with approvals.`);
      setTimeout(() => setSuccessToast(null), 6000);

      setWizardStep(1);
      setStrategyPreview(null);
      setBusinessIdea('');

      await loadCampaigns();
      await handleOpenDrilldown(res.id);
      setActiveTab('arc');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate campaign posts.');
    } finally {
      setGeneratingCampaign(false);
    }
  };

  const handleBatchReschedule = async () => {
    if (!activeBrand || !selectedCampaign) return;
    setRescheduling(true);
    try {
      await api.campaigns.schedule(activeBrand.id, selectedCampaign.id, {
        startDate: rescheduleDate,
        dailyTime: rescheduleTime,
        cadence: rescheduleCadence,
      });
      setSuccessToast(`📅 All campaign posts successfully scheduled with "${rescheduleCadence}" cadence starting ${rescheduleDate}!`);
      setTimeout(() => setSuccessToast(null), 5000);
      setScheduleModalOpen(false);
      await loadCampaigns();
      await handleOpenDrilldown(selectedCampaign.id);
    } catch (err: any) {
      setErrorMessage(`Reschedule failed: ${err.message}`);
    } finally {
      setRescheduling(false);
    }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!activeBrand) return;
    const camp = campaigns.find((c) => c.id === campaignId) || selectedCampaign;
    setCampaignConfirmDialog({
      title: 'Delete Campaign',
      message: `Are you sure you want to permanently delete "${camp?.name || 'this campaign'}"? All campaign milestones and linked schedules will be removed.`,
      confirmLabel: 'Yes, Delete Campaign',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.campaigns.delete(activeBrand.id, campaignId);
          if (selectedCampaign?.id === campaignId) {
            setSelectedCampaign(null);
          }
          await loadCampaigns();
          setSuccessToast(`Campaign "${camp?.name || 'Campaign'}" deleted.`);
          setTimeout(() => setSuccessToast(null), 4000);
        } catch (err: any) {
          setErrorMessage(`Delete failed: ${err.message}`);
        }
      },
    });
  };

  const handlePublishPostNow = async (postId: string, postTitle?: string) => {
    if (!activeBrand) return;
    setPublishingPostId(postId);
    try {
      const res = await api.posts.publishNow(activeBrand.id, postId);
      if (res.idempotent) {
        setSuccessToast(`ℹ️ "${postTitle || 'Post'}" is already published live across channels.`);
      } else {
        setSuccessToast(`🚀 "${postTitle || 'Post'}" published live across all social channels!`);
      }
      setTimeout(() => setSuccessToast(null), 5000);

      // Update state locally
      setSelectedCampaign((prev: any) => {
        if (!prev) return prev;
        const updatedPosts = prev.posts?.map((p: any) =>
          p.id === postId ? { ...p, status: 'published', publishedAt: new Date().toISOString() } : p
        );
        const publishedCount = updatedPosts?.filter((p: any) => p.status === 'published').length || 0;
        return { ...prev, posts: updatedPosts, publishedCount };
      });

      loadCampaigns();
    } catch (err: any) {
      setErrorMessage(`Publish failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPublishingPostId(null);
    }
  };

  const handleRetryPost = async (postId: string, postTitle?: string) => {
    if (!activeBrand) return;
    setPublishingPostId(postId);
    try {
      await api.posts.retry(activeBrand.id, postId);
      setSuccessToast(`🔄 "${postTitle || 'Post'}" retried successfully across all channels!`);
      setTimeout(() => setSuccessToast(null), 5000);
      await loadCampaigns();
      if (selectedCampaign?.id) {
        await handleOpenDrilldown(selectedCampaign.id);
      }
    } catch (err: any) {
      setErrorMessage(`Retry failed: ${err.message || 'Unknown error'}`);
    } finally {
      setPublishingPostId(null);
    }
  };

  const handlePublishAllPosts = () => {
    if (!activeBrand || !selectedCampaign?.posts || selectedCampaign.posts.length === 0) return;
    const unpublishedPosts = selectedCampaign.posts.filter((p: any) => p.status !== 'published');
    if (unpublishedPosts.length === 0) {
      setSuccessToast('ℹ️ All posts in this campaign are already published live!');
      setTimeout(() => setSuccessToast(null), 4000);
      return;
    }

    setCampaignConfirmDialog({
      title: 'Publish All Remaining Posts',
      message: `Publish all ${unpublishedPosts.length} remaining posts in "${selectedCampaign.name}" live across channels now?`,
      confirmLabel: 'Publish All Live Now',
      isDestructive: false,
      onConfirm: async () => {
        setBatchPublishing(true);
        try {
          const res = await api.campaigns.publishBatch(activeBrand.id, selectedCampaign.id);
          setSuccessToast(
            `🎉 Batch Publish Complete: ${res.publishedCount} published live! (${res.skippedCount} skipped/already published, ${res.failedCount} failed)`
          );
          setTimeout(() => setSuccessToast(null), 6000);
          await loadCampaigns();
          if (selectedCampaign?.id) {
            await handleOpenDrilldown(selectedCampaign.id);
          }
        } catch (err: any) {
          setErrorMessage(`Batch publishing error: ${err.message}`);
        } finally {
          setBatchPublishing(false);
        }
      },
    });
  };

  // 7. AI CONTENT GENERATOR — Regenerate ONLY this single post (preserves rest of campaign)
  const handleRegenerateSinglePost = async (postId: string, postTitle: string) => {
    if (!activeBrand) return;
    setRegeneratingPostId(postId);
    try {
      const updatedPost = await api.posts.regenerate(activeBrand.id, postId, {
        prompt: postTitle,
      });

      if (updatedPost) {
        setSelectedCampaign((prev: any) => {
          if (!prev || !prev.posts) return prev;
          return {
            ...prev,
            posts: prev.posts.map((p: any) => (p.id === postId ? { ...p, ...updatedPost } : p)),
          };
        });

        setPostActionToast({
          postId,
          message: `✨ Post regenerated! The rest of your campaign remains completely unchanged.`,
        });
        setTimeout(() => setPostActionToast(null), 4000);
      }
    } catch (err: any) {
      setPostActionToast({
        postId,
        message: 'Failed to regenerate single post: ' + (err.message || 'Unknown error'),
      });
      setTimeout(() => setPostActionToast(null), 4000);
    } finally {
      setRegeneratingPostId(null);
    }
  };

  // 7. AI CONTENT GENERATOR — Transform copy on a single post variant using any of the 11 AI Actions
  const handleTransformSinglePost = async (
    postId: string,
    platform: string,
    operation: string,
    targetLanguage?: string
  ) => {
    if (!activeBrand) return;
    setTransformingPostId(postId);
    try {
      const lang = targetLanguage || singlePostLanguages[postId] || 'Spanish';
      const res = await api.posts.transform(activeBrand.id, postId, {
        operation,
        platform,
        targetLanguage: lang,
      });

      if (res?.transformedContent) {
        setSelectedCampaign((prev: any) => {
          if (!prev || !prev.posts) return prev;
          return {
            ...prev,
            posts: prev.posts.map((p: any) => {
              if (p.id !== postId) return p;
              const nextVariants = (p.variants || []).map((v: any) => {
                const vPlat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
                if (vPlat === platform) {
                  return { ...v, content: res.transformedContent };
                }
                return v;
              });
              return {
                ...p,
                variants: nextVariants,
                baseContent: p.baseContent || res.transformedContent,
              };
            }),
          };
        });

        const actionObj = SINGLE_POST_AI_ACTIONS.find((a) => a.id === operation);
        setPostActionToast({
          postId,
          message: `Applied "${actionObj?.label || operation}" to ${platform.toUpperCase()} variant!`,
        });
        setTimeout(() => setPostActionToast(null), 3000);
      }
    } catch (err: any) {
      setPostActionToast({
        postId,
        message: 'Failed to transform post copy: ' + (err.message || 'Unknown error'),
      });
      setTimeout(() => setPostActionToast(null), 4000);
    } finally {
      setTransformingPostId(null);
    }
  };

  // Save manual variant edit
  const handleSavePostVariantEdit = async (postId: string, platform: string, content: string) => {
    if (!activeBrand) return;
    try {
      await api.posts.updateVariant(activeBrand.id, postId, platform, { content });
      setSelectedCampaign((prev: any) => {
        if (!prev || !prev.posts) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p: any) => {
            if (p.id !== postId) return p;
            const nextVariants = (p.variants || []).map((v: any) => {
              const vPlat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
              if (vPlat === platform) {
                return { ...v, content };
              }
              return v;
            });
            return { ...p, variants: nextVariants };
          }),
        };
      });
      setEditingVariant(null);
      setPostActionToast({ postId, message: 'Variant saved successfully!' });
      setTimeout(() => setPostActionToast(null), 3000);
    } catch (err: any) {
      setPostActionToast({
        postId,
        message: 'Failed to save variant edit: ' + (err.message || 'Unknown error'),
      });
      setTimeout(() => setPostActionToast(null), 4000);
    }
  };

  const getFormatIcon = (format?: string) => {
    switch (format) {
      case 'reel_video':
      case 'short_video':
      case 'video':
        return <Video size={14} color="#c084fc" />;
      case 'carousel_graphic':
      case 'carousel':
        return <Layers size={14} color="#34d399" />;
      case 'single_image':
      case 'image':
      case 'infographic':
        return <ImageIcon size={14} color="#60a5fa" />;
      default:
        return <FileText size={14} color="#fbbf24" />;
    }
  };

  return (
    <div className="cp-container animate-fade-in">
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 1. EXECUTIVE PAGE HEADER                                          */}
      {/* ----------------------------------------------------------------- */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-brand-badge">
            {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
          </div>

          <div className="cp-header-title">
            <h1>
              <span>Campaigns &amp; Multi-Post Arcs</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 750,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: 'rgba(139, 92, 246, 0.12)',
                  color: 'var(--accent-primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Sparkles size={11} />
                {activeBrand?.name || 'Active Brand'}
              </span>
            </h1>

            <div className="cp-header-subtitle">
              <span>Omnichannel campaign generation, multi-stage storytelling, and automated calendar flight pacing</span>
              <span>•</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                {campaigns.length} total campaigns
              </span>
            </div>
          </div>
        </div>

        <div className="cp-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('campaigns')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <Layers size={14} color="var(--accent-primary)" />
            <span>Active Campaigns ({campaigns.length})</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setWizardStep(1);
              setActiveTab('generator');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              fontSize: '0.82rem',
              fontWeight: 750,
              background: 'var(--gradient-brand)',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Rocket size={14} />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. COMPACT TAB NAVIGATION                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="cp-tabs-bar">
        <button
          type="button"
          className={`cp-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Rocket size={14} color={activeTab === 'generator' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>AI Campaign Creator</span>
        </button>

        <button
          type="button"
          className={`cp-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          <Layers size={14} color={activeTab === 'campaigns' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>Active Campaigns ({campaigns.length})</span>
        </button>

        <button
          type="button"
          className={`cp-tab-btn ${activeTab === 'arc' ? 'active' : ''}`}
          onClick={() => {
            if (!selectedCampaign && campaigns.length > 0) {
              handleOpenDrilldown(campaigns[0].id);
            }
            setActiveTab('arc');
          }}
        >
          <Sparkles size={14} color={activeTab === 'arc' ? 'var(--accent-primary)' : 'currentColor'} />
          <span>{selectedCampaign?.name ? `${selectedCampaign.name} Arc` : 'Campaign Arc'}</span>
          {selectedCampaign && (
            <span
              style={{
                fontSize: '0.68rem',
                background: activeTab === 'arc' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                color: activeTab === 'arc' ? 'var(--accent-primary)' : 'var(--text-muted)',
                padding: '1px 6px',
                borderRadius: '999px',
                fontWeight: 700,
              }}
            >
              {selectedCampaign.posts?.length || 0}
            </span>
          )}
        </button>
      </div>

      {/* TAB 2 VIEW: Active Brand Campaigns */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Campaign Command Center List & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(() => {
              const allCount = campaigns.length;
              const activeCount = campaigns.filter((c) => c.status === 'active').length;
              const scheduledCount = campaigns.filter((c) => c.status === 'scheduled' || (!c.publishedCount && c.status !== 'completed')).length;
              const completedCount = campaigns.filter((c) => c.status === 'completed' || (c.postCount && c.publishedCount === c.postCount)).length;

              const filteredCampaigns = campaigns.filter((camp) => {
                if (campaignListFilter === 'all') return true;
                if (campaignListFilter === 'active') return camp.status === 'active';
                if (campaignListFilter === 'scheduled') return camp.status === 'scheduled' || (!camp.publishedCount && camp.status !== 'completed');
                if (campaignListFilter === 'completed') return camp.status === 'completed' || (camp.postCount && camp.publishedCount === camp.postCount);
                return true;
              });

              return (
                <>
                  {/* Status Filter Pill Tabs */}
                  <div className="cp-toolbar">
                    <div className="cp-status-pills">
                      {[
                        { id: 'all', label: 'All', count: allCount },
                        { id: 'active', label: 'Active', count: activeCount },
                        { id: 'scheduled', label: 'Scheduled', count: scheduledCount },
                        { id: 'completed', label: 'Completed', count: completedCount },
                      ].map((tab) => {
                        const isCurrent = campaignListFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            className={`cp-status-pill ${isCurrent ? 'active' : ''}`}
                            onClick={() => setCampaignListFilter(tab.id as any)}
                          >
                            <span>{tab.label}</span>
                            <span style={{ opacity: 0.75, marginLeft: '4px' }}>({tab.count})</span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Showing <strong>{filteredCampaigns.length}</strong> of {allCount} campaigns</span>
                    </div>
                  </div>

                  {loading ? (
                    <div
                      className="glass-card"
                      style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}
                    >
                      <RefreshCw size={32} className="animate-spin" color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
                      <p>Loading brand campaigns from MySQL...</p>
                    </div>
                  ) : filteredCampaigns.length === 0 ? (
                    <div
                      className="glass-card"
                      style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        borderStyle: 'dashed',
                        borderWidth: '2px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: 'var(--radius-lg)',
                          background: 'rgba(139, 92, 246, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        <Rocket size={32} />
                      </div>
                      <div style={{ maxWidth: '480px' }}>
                        <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>
                          No {campaignListFilter !== 'all' ? campaignListFilter : ''} campaigns found
                        </h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          Create your first campaign draft or flight using the 6-step Campaign Command Center wizard.
                        </p>
                      </div>
                      <button className="btn btn-primary" onClick={() => { setActiveTab('generator'); setWizardStep(1); }}>
                        <Plus size={16} /> Open Campaign Wizard
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                        gap: '22px',
                      }}
                    >
                      {filteredCampaigns.map((camp) => {
                        const isSelected = selectedCampaign?.id === camp.id;
                        const postCount = camp.postCount || 0;
                        const publishedCount = camp.publishedCount || 0;
                        const scheduledCount = camp.scheduledCount ?? (postCount > publishedCount ? postCount - publishedCount : 0);
                        const progressPercent = postCount > 0 ? Math.round((publishedCount / postCount) * 100) : 0;
                        const executionType = camp.campaignType || 'organic';

                        const kpiActual = camp.kpiTarget?.actual ?? (publishedCount > 0 ? publishedCount * 3200 : 0);
                        const kpiTargetVal = camp.kpiTarget?.target ?? (executionType === 'paid' ? 100000 : 25000);
                        const kpiMetric = camp.kpiTarget?.metric || 'impressions';
                        const kpiPercent = Math.min(100, Math.round((kpiActual / Math.max(1, kpiTargetVal)) * 100));

                        const forecastMin = camp.forecast?.min ?? (executionType === 'paid' ? 95000 : 18500);
                        const forecastExp = camp.forecast?.expected ?? (executionType === 'paid' ? 125000 : 24200);
                        const forecastMax = camp.forecast?.max ?? (executionType === 'paid' ? 160000 : 31000);
                        const forecastConf = Math.round((camp.forecast?.confidence ?? 0.89) * 100);

                        const startDateStr = camp.startDate ? new Date(camp.startDate).toLocaleDateString() : 'Scheduled';
                        const endDateStr = camp.endDate ? new Date(camp.endDate).toLocaleDateString() : 'Ongoing';

                        return (
                          <div
                            key={camp.id}
                            className="glass-card"
                            onClick={() => {
                              handleOpenDrilldown(camp.id);
                              setActiveTab('arc');
                            }}
                            style={{
                              cursor: 'pointer',
                              border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                              boxShadow: isSelected ? '0 0 24px rgba(139, 92, 246, 0.3)' : 'var(--shadow-sm)',
                              padding: '22px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                              transition: 'all var(--transition-fast)',
                              position: 'relative',
                            }}
                          >
                            {/* Card Header: Brand, Goal, Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(59, 130, 246, 0.12)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Globe size={11} />
                                  <span>{camp.brandName || activeBrand?.name || 'Brand'}</span>
                                </span>

                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(139, 92, 246, 0.12)',
                                    color: 'var(--accent-primary)',
                                    border: '1px solid rgba(139, 92, 246, 0.25)',
                                    textTransform: 'capitalize',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Tag size={11} /> {camp.goal ? camp.goal.replace(/_/g, ' ') : 'Campaign'}
                                </span>
                              </div>

                              <span
                                className="badge"
                                style={{
                                  background: camp.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: camp.status === 'active' ? '#34d399' : '#fbbf24',
                                  border: `1px solid ${camp.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                  textTransform: 'capitalize',
                                }}
                              >
                                {camp.status}
                              </span>
                            </div>

                            {/* Campaign Name */}
                            <h3
                              style={{
                                fontSize: '1.18rem',
                                lineHeight: 1.3,
                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                                margin: 0,
                              }}
                            >
                              {camp.name}
                            </h3>

                            {/* Dates & Execution Mode Banner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <Calendar size={13} color="var(--accent-primary)" />
                                <strong>{startDateStr}</strong> – <strong>{endDateStr}</strong>
                              </span>

                              {/* Execution Mode: Organic vs Paid vs Hybrid */}
                              {executionType === 'paid' ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <ShieldCheck size={12} /> Paid Sponsored Flight
                                </span>
                              ) : executionType === 'hybrid' ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    color: '#c084fc',
                                    border: '1px solid rgba(168, 85, 247, 0.35)',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Layers size={12} /> Hybrid (Organic + Paid)
                                </span>
                              ) : (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Sparkles size={12} /> Organic Execution
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            <p
                              style={{
                                fontSize: '0.84rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                margin: 0,
                              }}
                            >
                              {camp.description || 'Coordinated multi-channel marketing campaign'}
                            </p>

                            {/* Content Progress Bar & Count Pills */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Content Progress ({publishedCount}/{postCount} posts)
                                </span>
                                <strong style={{ color: 'var(--accent-emerald)' }}>{progressPercent}%</strong>
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  borderRadius: 'var(--radius-full)',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${progressPercent}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-emerald))',
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '0.75rem' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                                  Published: <strong>{publishedCount}</strong>
                                </span>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)' }}>
                                  Scheduled: <strong>{scheduledCount}</strong>
                                </span>
                                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                                  Total: <strong>{postCount}</strong>
                                </span>
                              </div>
                            </div>

                            {/* KPI Actual vs Target Meter */}
                            <div
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border-subtle)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                                <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <BarChart2 size={12} color="var(--accent-primary)" />
                                  KPI Actual vs Target:
                                </span>
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {kpiActual.toLocaleString()} / {kpiTargetVal.toLocaleString()} {kpiMetric}
                                </strong>
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: '4px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  borderRadius: 'var(--radius-full)',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    width: `${kpiPercent}%`,
                                    height: '100%',
                                    background: 'var(--accent-primary)',
                                  }}
                                />
                              </div>
                            </div>

                            {/* Probabilistic Forecast with Explicit Disclaimer */}
                            <div
                              style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                background: 'rgba(139, 92, 246, 0.05)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <TrendingUp size={12} /> Forecast Range:
                                </span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {forecastMin.toLocaleString()} – {forecastExp.toLocaleString()} – {forecastMax.toLocaleString()}
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginLeft: '4px' }}>({forecastConf}% conf)</span>
                                </span>
                              </div>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.25 }}>
                                * Organic reach targets are probabilistic estimates, not guarantees.
                              </span>
                            </div>

                            {/* Connected Systems Badges */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '0.68rem' }}>
                              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)' }}>
                                ⚡ Automations
                              </span>
                              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)' }}>
                                📐 Templates
                              </span>
                              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24' }}>
                                🛡️ Approvals
                              </span>
                              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                                📦 Publishing Jobs
                              </span>
                              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
                                📊 Analytics
                              </span>
                              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc' }}>
                                💡 Growth Recs
                              </span>
                            </div>

                            {/* Footer View Link */}
                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                View Campaign Flight <ChevronRight size={14} />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 3: Autumn Radiance Sprint Arc (Selected Campaign Detailed Arc & Post Breakdown) */}
      {activeTab === 'arc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {selectedCampaign ? (
            <div
              className="glass-card"
              style={{
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                border: '1px solid var(--border-medium)',
              }}
            >
              {/* Detailed Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '20px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)' }}>{selectedCampaign.name}</h2>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {selectedCampaign.posts?.length || 0} Coordinated Posts
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.5 }}>
                    {selectedCampaign.description}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {onNavigate && (
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        onNavigate('calendar', {
                          campaignId: selectedCampaign.id,
                          startDate: selectedCampaign.startDate,
                        })
                      }
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      title="Open Content Calendar focused on this campaign"
                    >
                      <Calendar size={15} color="#ec4899" />
                      <span>View in Calendar</span>
                    </button>
                  )}

                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setRescheduleDate(
                        selectedCampaign.startDate
                          ? new Date(selectedCampaign.startDate).toISOString().split('T')[0]
                          : new Date().toISOString().split('T')[0]
                      );
                      setScheduleModalOpen(true);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Clock size={15} color="var(--accent-primary)" />
                    <span>1-Click Reschedule</span>
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handlePublishAllPosts}
                    disabled={batchPublishing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 600,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <Send size={15} />
                    <span>{batchPublishing ? 'Publishing Live...' : 'Publish All Live'}</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                    title="Delete Campaign"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Strategy Narrative Arc Ribbon */}
              {selectedCampaign.strategy && (
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.09) 0%, rgba(59, 130, 246, 0.06) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    padding: '18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={15} />
                      AI STRATEGIC NARRATIVE ARC
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Primary Target KPI: <strong style={{ color: 'var(--text-primary)' }}>{selectedCampaign.strategy.primaryKpi}</strong>
                    </span>
                  </div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {selectedCampaign.strategy.narrativeArc}
                  </p>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Audience Focus:</strong> {selectedCampaign.strategy.targetAudienceFocus}
                  </div>
                </div>
              )}

              {/* Coordinated Post Sequence */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--accent-primary)" />
                  <span>Coordinated Campaign Posts</span>
                </h3>

                {drilldownLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="var(--accent-primary)" style={{ margin: '0 auto 8px' }} />
                    <p>Loading posts...</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedCampaign.posts?.map((post: any, idx: number) => {
                      const currentPlatform = activePlatformTab[post.id] || 'instagram';
                      const currentVariant = post.variants?.find((v: any) => v.platform === currentPlatform);
                      const suggestedFormat = currentVariant?.platformSpecificConfig?.suggestedFormat || 'single_image';

                      return (
                        <div
                          key={post.id}
                          style={{
                            borderRadius: 'var(--radius-lg)',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            padding: '22px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            transition: 'border-color var(--transition-fast)',
                          }}
                        >
                          {/* Post Top Row */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: 'var(--radius-md)',
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: 'var(--accent-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.88rem',
                                }}
                              >
                                #{idx + 1}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                                    {post.title}
                                  </strong>
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-subtle)',
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {getFormatIcon(suggestedFormat)}
                                    {suggestedFormat.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                  <Clock size={12} />
                                  Scheduled for:{' '}
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {post.scheduledFor ? new Date(post.scheduledFor).toLocaleString() : 'Unscheduled'}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* Creative Studio Jump Buttons & Publish Live */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {/* 7. AI CONTENT GENERATOR — Regenerate ONLY this single post (preserves rest of campaign) */}
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleRegenerateSinglePost(post.id, post.title)}
                                disabled={regeneratingPostId === post.id}
                                title="Regenerate only this post with AI — preserves all other posts in this campaign!"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  borderColor: 'rgba(139, 92, 246, 0.45)',
                                  background: 'rgba(139, 92, 246, 0.12)',
                                  color: '#c084fc',
                                  fontWeight: 600,
                                }}
                              >
                                {regeneratingPostId === post.id ? (
                                  <>
                                    <RefreshCw size={13} className="spin" />
                                    <span>Regenerating Post...</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 size={13} />
                                    <span>Regenerate Post Only</span>
                                  </>
                                )}
                              </button>

                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onNavigate?.('studio', { post })}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Edit3 size={13} />
                                <span>Edit in Studio</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  onNavigate?.('canva', {
                                    post,
                                    initialText: `${post.title}\n\n${currentVariant?.content?.slice(0, 140) || ''}`,
                                  })
                                }
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <ImageIcon size={13} />
                                <span>Canva Graphic</span>
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() =>
                                  onNavigate?.('reels', {
                                    post,
                                    campaignId: selectedCampaign?.id,
                                    campaignName: selectedCampaign?.name,
                                    initialText: currentVariant?.content || post.baseContent || post.title,
                                  })
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  borderColor: 'rgba(236, 72, 153, 0.45)',
                                  background: 'rgba(236, 72, 153, 0.1)',
                                  color: 'var(--text-primary)',
                                }}
                                title="Open 12. Video Reels & Motion Engine with this post"
                              >
                                <Video size={13} color="#f472b6" />
                                <span>9:16 Reel</span>
                              </button>

                              {post.status === 'published' ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    padding: '4px 10px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                  }}
                                >
                                  <CheckCircle2 size={13} /> Published Live
                                </span>
                              ) : (post.status === 'failed' || post.status === 'partially_failed' || post.status === 'PARTIAL_SUCCESS') ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    className="badge"
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      padding: '4px 10px',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <AlertCircle size={13} /> Failed
                                  </span>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleRetryPost(post.id, post.title)}
                                    disabled={publishingPostId === post.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      color: '#ef4444',
                                      borderColor: 'rgba(239, 68, 68, 0.4)',
                                    }}
                                  >
                                    <RotateCcw size={13} />
                                    <span>{publishingPostId === post.id ? 'Retrying...' : 'Retry'}</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handlePublishPostNow(post.id, post.title)}
                                  disabled={publishingPostId === post.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 600,
                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                  }}
                                >
                                  <Send size={13} />
                                  <span>{publishingPostId === post.id ? 'Publishing...' : 'Publish Live'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Single Post Action Feedback Toast */}
                          {postActionToast?.postId === post.id && (
                            <div
                              style={{
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>{postActionToast?.message}</span>
                            </div>
                          )}

                          {/* Platform Variant Switcher + Single-Post Guarantee */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid var(--border-subtle)',
                              paddingBottom: '10px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {(['instagram', 'x_twitter', 'linkedin', 'tiktok'] as const).map((plat) => (
                                <button
                                  key={plat}
                                  className={`btn btn-sm ${currentPlatform === plat ? 'btn-primary' : 'btn-glass'}`}
                                  onClick={() =>
                                    setActivePlatformTab((prev) => ({
                                      ...prev,
                                      [post.id]: plat,
                                    }))
                                  }
                                  style={{ textTransform: 'capitalize' }}
                                >
                                  {plat.replace('_', ' ')}
                                </button>
                              ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#a78bfa' }}>
                              <ShieldCheck size={14} />
                              <span>Single-Post Safe: AI modifications never alter other campaign posts</span>
                            </div>
                          </div>

                          {/* 7. AI CONTENT GENERATOR — 11 AI Actions Toolbar for This Post */}
                          <div
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={12} color="var(--accent-primary)" />
                                <span>AI Transform Copy ({currentPlatform.toUpperCase()} Variant) — 11 AI Actions</span>
                              </div>
                              {transformingPostId === post.id && (
                                <span style={{ color: 'var(--accent-primary)', fontSize: '0.72rem' }}>
                                  • Transforming...
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {SINGLE_POST_AI_ACTIONS.map((action) => {
                                if (action.id === 'translate') {
                                  const currentLang = singlePostLanguages[post.id] || 'Spanish';
                                  return (
                                    <div
                                      key={action.id}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '2px 4px',
                                        border: '1px solid var(--border-subtle)',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="btn btn-glass btn-sm"
                                        onClick={() =>
                                          handleTransformSinglePost(post.id, currentPlatform, 'translate', currentLang)
                                        }
                                        disabled={transformingPostId === post.id}
                                        style={{ fontSize: '0.72rem', padding: '3px 7px', border: 'none' }}
                                        title="Translate this variant into chosen language"
                                      >
                                        <span>🌐 Translate:</span>
                                      </button>
                                      <select
                                        value={currentLang}
                                        onChange={(e) =>
                                          setSinglePostLanguages((prev) => ({ ...prev, [post.id]: e.target.value }))
                                        }
                                        style={{
                                          background: 'var(--bg-surface-elevated)',
                                          border: '1px solid var(--border-subtle)',
                                          color: 'var(--text-primary)',
                                          fontSize: '0.72rem',
                                          borderRadius: '4px',
                                          padding: '2px 4px',
                                          cursor: 'pointer',
                                          outline: 'none',
                                        }}
                                      >
                                        {TARGET_LANGUAGES.map((lang) => (
                                          <option key={lang} value={lang} style={{ background: '#111827', color: '#fff' }}>
                                            {lang}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={action.id}
                                    type="button"
                                    className="btn btn-glass btn-sm"
                                    onClick={() => handleTransformSinglePost(post.id, currentPlatform, action.id)}
                                    disabled={transformingPostId === post.id}
                                    style={{ fontSize: '0.72rem', padding: '3px 7px' }}
                                    title={action.title}
                                  >
                                    <span>
                                      {action.icon} {action.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Variant Copy Preview & In-place Editor */}
                          {editingVariant?.postId === post.id && editingVariant?.platform === currentPlatform ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <textarea
                                className="form-textarea"
                                style={{ minHeight: '130px', fontSize: '0.88rem', lineHeight: 1.6 }}
                                value={editingVariant.content}
                                onChange={(e) =>
                                  setEditingVariant({ ...editingVariant, content: e.target.value })
                                }
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setEditingVariant(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() =>
                                    handleSavePostVariantEdit(post.id, currentPlatform, editingVariant.content)
                                  }
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  background: 'rgba(0, 0, 0, 0.35)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '14px 18px',
                                  fontSize: '0.88rem',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'var(--font-body)',
                                }}
                              >
                                {currentVariant?.content || post.baseContent}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginTop: '8px',
                                  fontSize: '0.74rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                <span>{(currentVariant?.content || post.baseContent || '').length} characters</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() =>
                                      setEditingVariant({
                                        postId: post.id,
                                        platform: currentPlatform,
                                        content: currentVariant?.content || post.baseContent || '',
                                      })
                                    }
                                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                  >
                                    <Edit3 size={11} />
                                    <span>Quick Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(currentVariant?.content || post.baseContent || '');
                                      setPostActionToast({ postId: post.id, message: 'Copied to clipboard!' });
                                      setTimeout(() => setPostActionToast(null), 2500);
                                    }}
                                    style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                                  >
                                    <Copy size={11} />
                                    <span>Copy</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              className="glass-card"
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                borderStyle: 'dashed',
                borderWidth: '2px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Sparkles size={32} />
              </div>
              <div style={{ maxWidth: '480px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>Autumn Radiance Sprint Arc</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  No campaign narrative arc is currently selected. Choose a campaign from Active Brand Campaigns or generate a new arc in CAMPAIGN GENERATOR.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setActiveTab('campaigns')}>
                  <Layers size={16} /> View Active Campaigns ({campaigns.length})
                </button>
                <button className="btn btn-primary" onClick={() => setActiveTab('generator')}>
                  <Rocket size={16} /> Open Campaign Generator
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: CAMPAIGN GENERATOR (Default View - No Popup Modal) */}
      {activeTab === 'generator' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Header Banner on Campaign Generator Page */}
          <div
            className="glass-card"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.14) 0%, rgba(236, 72, 153, 0.09) 50%, rgba(59, 130, 246, 0.08) 100%)',
              borderColor: 'rgba(139, 92, 246, 0.35)',
              boxShadow: 'var(--shadow-glow)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '20px',
              padding: '24px 30px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.2))',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 18px rgba(139, 92, 246, 0.25)',
                }}
              >
                <Rocket size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
                  CAMPAIGN COMMAND CENTER — 6-STEP STRATEGY BUILDER
                </h1>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Step {wizardStep} of 6 • {
                    wizardStep === 1 ? 'Select Campaign Goal & Concept' :
                    wizardStep === 2 ? 'Define Target Audience & Resonance' :
                    wizardStep === 3 ? 'Flight Details & Execution Mode (Organic/Paid/Hybrid)' :
                    wizardStep === 4 ? 'AI Strategy Arc & Narrative Synthesis' :
                    wizardStep === 5 ? 'Review & Refine Multi-Platform Content' :
                    'Activate Flight & Platform Connections'
                  }
                </p>
              </div>
            </div>

            {/* Requested new button on top of this page */}
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => setActiveTab('campaigns')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 22px',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-medium)',
                background: 'rgba(255, 255, 255, 0.05)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
              }}
            >
              <Layers size={18} color="var(--accent-primary)" />
              <span>Active Brand Campaigns ({campaigns.length})</span>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          </div>

          {/* Generator Form Body */}
          <div
            className="glass-card"
            style={{
              width: '100%',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              border: '1px solid var(--border-medium)',
            }}
          >
            {/* 6-STEP HORIZONTAL STEPPER */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '8px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {[
                { step: 1, label: '1. Goal', icon: Target },
                { step: 2, label: '2. Audience', icon: Users },
                { step: 3, label: '3. Details', icon: Calendar },
                { step: 4, label: '4. AI Plan', icon: Sparkles },
                { step: 5, label: '5. Review/Edit', icon: Edit3 },
                { step: 6, label: '6. Activate', icon: Rocket },
              ].map(({ step, label, icon: Icon }) => {
                const isActive = wizardStep === step;
                const isPassed = wizardStep > step;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      if (step < wizardStep || (strategyPreview && step <= 6)) {
                        setWizardStep(step);
                      }
                    }}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-md)',
                      border: isActive
                        ? '1px solid var(--accent-primary)'
                        : isPassed
                          ? '1px solid rgba(16, 185, 129, 0.4)'
                          : '1px solid var(--border-subtle)',
                      background: isActive
                        ? 'rgba(139, 92, 246, 0.15)'
                        : isPassed
                          ? 'rgba(16, 185, 129, 0.08)'
                          : 'rgba(255, 255, 255, 0.02)',
                      color: isActive
                        ? 'var(--accent-primary)'
                        : isPassed
                          ? '#34d399'
                          : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: isActive || isPassed ? 700 : 500,
                      cursor: isPassed || isActive || (strategyPreview && step <= 6) ? 'pointer' : 'default',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: GOAL */}
            {wizardStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} color="var(--accent-primary)" />
                    Step 1: Campaign Goal & Concept
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Define the core objective and what you are promoting
                  </span>
                </div>

                {/* What are you promoting? */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.92rem', fontWeight: 600 }}>
                    <Sparkles size={16} color="var(--accent-primary)" />
                    What are you promoting?
                  </label>
                  <textarea
                    id="campaign-business-idea-input"
                    rows={3}
                    className="form-textarea"
                    value={businessIdea}
                    onChange={(e) => setBusinessIdea(e.target.value)}
                    placeholder="e.g. We are launching a new AI accounting product for modern finance teams."
                    style={{ fontSize: '0.95rem', minHeight: '85px' }}
                  />

                  {/* Suggestion Chips */}
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Example Prompts:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {PROMPT_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-glass btn-sm"
                          onClick={() => setBusinessIdea(suggestion)}
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            textAlign: 'left',
                            whiteSpace: 'normal',
                          }}
                        >
                          "{suggestion.slice(0, 52)}..."
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Goal Selection (8 Options) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Select Campaign Goal
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                    {GOAL_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = campaignGoal === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`campaign-goal-card ${isSelected ? 'selected' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setCampaignGoal(opt.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setCampaignGoal(opt.id);
                            }
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            boxShadow: isSelected ? '0 0 14px rgba(139, 92, 246, 0.25)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icon size={16} color={isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                            <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {opt.label}
                            </strong>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.35, margin: 0 }}>
                            {opt.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Metric Rationale Card */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.06)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <BarChart2 size={20} color="#60a5fa" />
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <strong>Expected Benchmark Metric:</strong> {
                      campaignGoal === 'sales' ? 'Direct Purchases & Checkout Conversions' :
                      campaignGoal === 'leads' ? 'Qualified Leads & High-Intent Opt-ins' :
                      campaignGoal === 'engagement' ? 'Comments, Shares, Saves & Discussion' :
                      'Impressions, Reach & Multi-Platform Share-of-Voice'
                    }
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('campaigns')}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!businessIdea.trim()) {
                        setErrorMessage('Please specify what you are promoting before proceeding.');
                        return;
                      }
                      setErrorMessage(null);
                      setWizardStep(2);
                    }}
                    style={{ padding: '10px 22px' }}
                  >
                    <span>Next: Define Audience</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: AUDIENCE */}
            {wizardStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--accent-primary)" />
                    Step 2: Target Audience & Persona
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Tailor messaging to exact customer segments and pain points
                  </span>
                </div>

                {/* Target Persona */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Target Customer Persona
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={targetPersona}
                    onChange={(e) => setTargetPersona(e.target.value)}
                    placeholder="e.g. Growth-Oriented B2B Leaders, Founders & Digital Creators"
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {['B2B Founders & Executives', 'Eco-Conscious Gen-Z Consumers', 'E-commerce Shoppers', 'Freelancers & Creators'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => setTargetPersona(p)}
                        style={{ fontSize: '0.74rem', padding: '2px 8px' }}
                      >
                        + {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audience Segments */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Audience Segments & Cohorts
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {['Early Adopters', 'Enterprise Buyers', 'Brand Champions', 'High Intent Seekers', 'Community Followers'].map((seg) => {
                      const isSelected = audienceSegments.includes(seg);
                      return (
                        <button
                          key={seg}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAudienceSegments(audienceSegments.filter((s) => s !== seg));
                            } else {
                              setAudienceSegments([...audienceSegments, seg]);
                            }
                          }}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-glass'} btn-sm`}
                          style={{ fontSize: '0.8rem', padding: '5px 12px', borderRadius: 'var(--radius-full)' }}
                        >
                          {isSelected ? '✓ ' : '+ '} {seg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Geography */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Target Geography & Market Reach
                  </label>
                  <select
                    className="form-input"
                    value={geography}
                    onChange={(e) => setGeography(e.target.value)}
                  >
                    <option value="Global Tier 1 (US, UK, CA, AU, EU)">Global Tier 1 (US, UK, CA, AU, EU)</option>
                    <option value="North America (US & Canada)">North America (US & Canada)</option>
                    <option value="Europe & UK (EMEA)">Europe & UK (EMEA)</option>
                    <option value="Asia-Pacific (APAC)">Asia-Pacific (APAC)</option>
                    <option value="Latin America (LATAM)">Latin America (LATAM)</option>
                  </select>
                </div>

                {/* Pain Points & Core Desires */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Key Pain Points & Core Customer Desires
                  </label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={painPoints}
                    onChange={(e) => setPainPoints(e.target.value)}
                    placeholder="What specific problem is your audience facing that this campaign directly addresses?"
                  />
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(1)}>
                    ← Back to Goal
                  </button>
                  <button className="btn btn-primary" onClick={() => setWizardStep(3)} style={{ padding: '10px 22px' }}>
                    <span>Next: Campaign Details</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: CAMPAIGN DETAILS & EXECUTION MODE */}
            {wizardStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} color="var(--accent-primary)" />
                    Step 3: Campaign Details & Execution Mode
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Configure duration, platforms, and organic vs. paid separation
                  </span>
                </div>

                {/* Campaign Name & Start Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                      Campaign Name
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder={businessIdea ? `${businessIdea.slice(0, 36).trim()} Campaign` : 'e.g. Q4 Growth Sprint Arc'}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                      Flight Start Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Duration Selection (5 Options) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Duration & Arc Pacing
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                    {DURATION_OPTIONS.map((dur) => {
                      const isSelected = duration === dur.id;
                      return (
                        <div
                          key={dur.id}
                          className={`campaign-duration-card ${isSelected ? 'selected' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDuration(dur.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setDuration(dur.id);
                            }
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            boxShadow: isSelected ? '0 0 14px rgba(139, 92, 246, 0.25)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.88rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {dur.label}
                            </strong>
                            {dur.recommended && (
                              <span className="badge badge-active" style={{ fontSize: '0.64rem', padding: '2px 5px' }}>
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {dur.posts} • {dur.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Platforms Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                    Target Platforms
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    {PLATFORM_OPTIONS.map((plat) => {
                      const isSelected = selectedPlatforms.includes(plat.id);
                      return (
                        <div
                          key={plat.id}
                          className={`campaign-platform-chip ${isSelected ? 'selected' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => togglePlatform(plat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              togglePlatform(plat.id);
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? `1px solid ${plat.color}` : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isSelected ? (
                              <CheckSquare size={16} color={plat.color} />
                            ) : (
                              <Square size={16} color="var(--text-muted)" />
                            )}
                            <span style={{ fontSize: '0.88rem', fontWeight: isSelected ? 600 : 400, color: 'var(--text-primary)' }}>
                              {plat.label}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: plat.color,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${plat.color}15`,
                            }}
                          >
                            {plat.badge}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* EXECUTION MODE: Organic vs. Paid vs. Hybrid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="var(--accent-primary)" />
                    Execution Mode: Organic vs. Paid Execution
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                      {
                        id: 'organic',
                        title: 'Organic Execution',
                        badge: 'Pure Organic',
                        color: '#34d399',
                        bg: 'rgba(16, 185, 129, 0.12)',
                        desc: 'Native algorithm reach, audience resonance, zero advertising spend.',
                      },
                      {
                        id: 'paid',
                        title: 'Paid Sponsored Flight',
                        badge: 'Paid Advertising',
                        color: '#fbbf24',
                        bg: 'rgba(245, 158, 11, 0.12)',
                        desc: 'Requires verified ad account, strict budget limits, and ad products.',
                      },
                      {
                        id: 'hybrid',
                        title: 'Hybrid (Organic + Paid)',
                        badge: 'Coordinated Dual',
                        color: '#c084fc',
                        bg: 'rgba(168, 85, 247, 0.12)',
                        desc: 'Organic narrative arc reinforced with targeted paid sponsored bursts.',
                      },
                    ].map((mode) => {
                      const isSelected = campaignType === mode.id;
                      return (
                        <div
                          key={mode.id}
                          onClick={() => setCampaignType(mode.id as any)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? `1px solid ${mode.color}` : '1px solid var(--border-subtle)',
                            background: isSelected ? mode.bg : 'rgba(255, 255, 255, 0.02)',
                            boxShadow: isSelected ? `0 0 16px ${mode.color}30` : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.9rem', color: isSelected ? mode.color : 'var(--text-primary)' }}>
                              {mode.title}
                            </strong>
                            <span className="badge" style={{ fontSize: '0.66rem', background: `${mode.color}20`, color: mode.color }}>
                              {mode.badge}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                            {mode.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* PAID SEPARATION REQUIREMENT & AD CONFIG */}
                  {(campaignType === 'paid' || campaignType === 'hybrid') && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '16px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ShieldCheck size={20} color="#fbbf24" />
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#fbbf24' }}>
                            Mandatory Paid Execution Separation Guard
                          </strong>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            Paid campaigns must remain separated from organic execution and require supported advertising products, budgets and permissions.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Connected Ad Account
                          </label>
                          <select
                            className="form-input"
                            value={adAccountId}
                            onChange={(e) => setAdAccountId(e.target.value)}
                            style={{ fontSize: '0.84rem' }}
                          >
                            <option value="act_meta_enterprise_9918">Meta Ads: Enterprise Hub (act_9918) — Verified</option>
                            <option value="act_linkedin_b2b_4421">LinkedIn Ads: Global B2B (act_4421) — Verified</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Total Budget (USD)
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={adBudgetCents / 100}
                            onChange={(e) => setAdBudgetCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                            style={{ fontSize: '0.84rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Daily Budget Cap (USD)
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={adDailyBudgetCents / 100}
                            onChange={(e) => setAdDailyBudgetCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                            style={{ fontSize: '0.84rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#34d399' }}>
                        <span>✓ Ad Account Permissions Verified</span>
                        <span>•</span>
                        <span>✓ Supported Ad Products: Sponsored Feed Post, Story Ad Placement</span>
                        <span>•</span>
                        <span>✓ Isolated from Organic Publishing Queue</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(2)}>
                    ← Back to Audience
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={generatingStrategy}
                    onClick={handlePreviewStrategy}
                    style={{ padding: '10px 24px' }}
                  >
                    {generatingStrategy ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Synthesizing AI Plan...</span>
                      </>
                    ) : (
                      <>
                        <span>Next: Synthesize AI Plan</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: AI STRATEGIC BLUEPRINT & NARRATIVE ARC */}
            {wizardStep === 4 && strategyPreview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={20} color="var(--accent-primary)" />
                    Step 4: AI Strategic Blueprint & Narrative Arc
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Multi-dimensional strategy synthesized to match Brand Brain guidelines
                  </span>
                </div>
                {/* 1. Campaign Name (Editable) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Rocket size={15} color="var(--accent-primary)" />
                    1. Campaign Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    style={{ fontSize: '1rem', fontWeight: 600 }}
                  />
                </div>

                {/* Dimensions 2, 3, 4: Objective, Target Audience, Core Message */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {/* 2. Campaign Objective */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={14} /> 2. Campaign Objective
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {strategyPreview.campaignObjective || strategyPreview.primaryKpi}
                    </strong>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Primary Metric: {strategyPreview.primaryKpi}
                    </span>
                  </div>

                  {/* 3. Target Audience */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} /> 3. Target Audience
                    </span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {strategyPreview.targetAudience || strategyPreview.targetAudienceFocus}
                    </strong>
                  </div>

                  {/* 4. Core Message */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> 4. Core Message
                    </span>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                      "{strategyPreview.coreMessage || strategyPreview.narrativeArc}"
                    </p>
                  </div>
                </div>

                {/* 5. Campaign Strategy */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Compass size={15} /> 5. Campaign Strategy & Rollout Plan
                  </span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.45 }}>
                    {strategyPreview.campaignStrategy || strategyPreview.narrativeArc}
                  </p>
                </div>

                {/* Dimensions 6 & 7: Content Pillars & Content Mix */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  {/* 6. Content Pillars */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={15} color="var(--accent-primary)" /> 6. Content Pillars
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(strategyPreview.contentPillars || []).map((pillar, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{pillar.title}</strong>
                            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>{pillar.description}</p>
                          </div>
                          {pillar.percentage !== undefined && (
                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', fontSize: '0.74rem' }}>
                              {pillar.percentage}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7. Content Mix & 8. Posting Frequency */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 7. Content Mix */}
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PieChart size={15} color="#34d399" /> 7. Content Mix
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(strategyPreview.contentMix || []).map((mix, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.76rem',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(52, 211, 153, 0.12)',
                              border: '1px solid rgba(52, 211, 153, 0.25)',
                              color: '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <strong>{mix.formatOrType}:</strong> {mix.percentage}%
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 8. Posting Frequency */}
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={15} color="#60a5fa" /> 8. Posting Frequency
                      </span>
                      <strong style={{ fontSize: '0.86rem', color: '#60a5fa' }}>
                        {strategyPreview.postingFrequency || '1 post every 1-2 days across active channels'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Dimensions 9 & 10: Content Ideas & Recommended Formats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  {/* 9. Content Ideas */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lightbulb size={15} color="#fbbf24" /> 9. Content Ideas
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(strategyPreview.contentIdeas || []).map((idea, idx) => (
                        <li key={idx} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          {idea}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 10. Recommended Formats & 11. CTA Strategy */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 10. Recommended Formats */}
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ImageIcon size={15} color="#c084fc" /> 10. Recommended Formats
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(strategyPreview.recommendedFormats || []).map((fmt, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.76rem',
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(192, 132, 252, 0.12)',
                              color: '#c084fc',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            {getFormatIcon(fmt)}
                            {fmt.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 11. CTA Strategy */}
                    <div
                      style={{
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowRight size={15} color="#f43f5e" /> 11. CTA Strategy
                      </span>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.35 }}>
                        {strategyPreview.ctaStrategy?.funnelOverview && (
                          <span style={{ display: 'block', marginBottom: '2px' }}>
                            <strong>Funnel:</strong> {strategyPreview.ctaStrategy.funnelOverview}
                          </span>
                        )}
                        <strong>Primary CTA:</strong> {strategyPreview.ctaStrategy?.primary || 'Explore & Sign Up'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 12. Hashtag Strategy */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash size={15} color="var(--accent-primary)" /> 12. Hashtag Strategy
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {(strategyPreview.hashtagStrategy || []).map((grp, gIdx) => (
                      <div key={gIdx}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          {grp.label || `${grp.category.toUpperCase()} Tags`}:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(grp.tags || []).map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="badge"
                              style={{
                                fontSize: '0.72rem',
                                background:
                                  grp.category === 'branded'
                                    ? 'rgba(139, 92, 246, 0.15)'
                                    : grp.category === 'industry'
                                      ? 'rgba(59, 130, 246, 0.15)'
                                      : grp.category === 'niche'
                                        ? 'rgba(52, 211, 153, 0.15)'
                                        : 'rgba(251, 191, 36, 0.15)',
                                color:
                                  grp.category === 'branded'
                                    ? 'var(--accent-primary)'
                                    : grp.category === 'industry'
                                      ? '#60a5fa'
                                      : grp.category === 'niche'
                                        ? '#34d399'
                                        : '#fbbf24',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CAMPAIGN CONTENT PLAN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="var(--accent-primary)" />
                      Campaign Content Plan ({strategyPreview.posts.length} Coordinated Posts)
                    </label>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Target Channels: {selectedPlatforms.map((p) => p.toUpperCase()).join(' • ')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                    {strategyPreview.posts.map((post) => (
                      <div
                        key={post.sequenceNumber}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          padding: '14px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.75rem',
                              }}
                            >
                              Post {post.sequenceNumber} (Day +{post.targetDayOffset})
                            </span>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {post.stageTitle}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {getFormatIcon(post.suggestedFormat)}
                              {post.suggestedFormat.replace(/_/g, ' ')}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {selectedPlatforms.map((plat) => (
                                <span
                                  key={plat}
                                  style={{
                                    fontSize: '0.64rem',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {plat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          "{post.suggestedHeadline}"
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                          {post.conceptSummary}
                        </p>
                        <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>
                          <strong>CTA:</strong> {post.callToAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Probabilistic Reach Disclaimer */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <BarChart2 size={16} color="#60a5fa" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Probabilistic Reach Guidance:</strong> Organic reach targets are probabilistic estimates, not guarantees. Algorithmic delivery reflects audience resonance and real-time network conditions.
                  </span>
                </div>

                {/* Step 4 Navigation Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '18px',
                  }}
                >
                  <button className="btn btn-secondary" onClick={() => setWizardStep(3)}>
                    ← Back to Details
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setWizardStep(5);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ padding: '10px 24px' }}
                  >
                    <span>Next: Review & Edit Posts</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW / EDIT BLUEPRINTS & TEMPLATES */}
            {wizardStep === 5 && strategyPreview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Edit3 size={20} color="var(--accent-primary)" />
                    Step 5: Review & Edit Campaign Blueprint
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Customize post blueprints, scheduling cadence, and template frameworks
                  </span>
                </div>

                {/* Framework / Template Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="var(--accent-primary)" />
                    Connected Template Blueprint
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                    {[
                      { id: 'Flagship Multi-Channel Launch Arc', label: 'Flagship Multi-Channel Arc', desc: 'Balanced 3-phase narrative with hook, proof, and conversion peaks.', recommended: true },
                      { id: 'Product Velocity Arc', label: 'Product Velocity Arc', desc: 'Fast-paced feature breakdowns, benchmark comparisons, and early-bird CTA.' },
                      { id: 'Educational Authority Arc', label: 'Educational Authority Arc', desc: 'Deep-dive tactical guides, carousels, and founder takeaways.' },
                      { id: 'High-Conversion Promotional Flight', label: 'Promotional Flight Arc', desc: 'Urgency-driven discount, testimonials, and countdown alerts.' },
                    ].map((tpl) => {
                      const isSelected = selectedTemplate === tpl.id;
                      return (
                        <div
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'all var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.86rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                              {tpl.label}
                            </strong>
                            {tpl.recommended && (
                              <span className="badge badge-active" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                            {tpl.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Posting Cadence Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--accent-primary)" />
                    Posting Cadence
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    {[
                      { id: 'daily', label: '📅 Daily (1 post / day)', desc: 'Consistent continuous flight pacing' },
                      { id: 'alternate_days', label: '⚡ Alternate Days (Every 2 days)', desc: 'High breathing room for algorithm indexing' },
                      { id: 'weekdays', label: '💼 Weekdays Only (Mon-Fri)', desc: 'Optimal for B2B executive attention' },
                      { id: 'twice_daily', label: '🔥 Twice Daily (AM & PM)', desc: 'High-velocity launch sprint pressure' },
                    ].map((cad) => {
                      const isSelected = selectedCadence === cad.id;
                      return (
                        <div
                          key={cad.id}
                          onClick={() => setSelectedCadence(cad.id as any)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                          }}
                        >
                          <strong style={{ fontSize: '0.84rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {cad.label}
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {cad.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Post Blueprints (Editable) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} color="var(--accent-primary)" />
                      Review & Edit Post Blueprints ({strategyPreview.posts.length} Posts)
                    </label>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Click on any headline or concept to customize before flight activation
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {strategyPreview.posts.map((post, pIdx) => (
                      <div
                        key={post.sequenceNumber}
                        style={{
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              className="badge"
                              style={{
                                background: 'rgba(139, 92, 246, 0.18)',
                                color: 'var(--accent-primary)',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                              }}
                            >
                              Post {post.sequenceNumber} • Day +{post.targetDayOffset}
                            </span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {post.stageTitle}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {getFormatIcon(post.suggestedFormat)}
                              {post.suggestedFormat.replace(/_/g, ' ')}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {selectedPlatforms.map((plat) => (
                                <span
                                  key={plat}
                                  style={{
                                    fontSize: '0.62rem',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {plat}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Editable Headline */}
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                            Post Headline / Hook
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={post.suggestedHeadline}
                            onChange={(e) => {
                              const updated = [...strategyPreview.posts];
                              updated[pIdx] = { ...updated[pIdx], suggestedHeadline: e.target.value };
                              setStrategyPreview({ ...strategyPreview, posts: updated });
                            }}
                            style={{ fontSize: '0.86rem', fontWeight: 600 }}
                          />
                        </div>

                        {/* Editable Concept */}
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                            Content Concept & Narrative Arc
                          </label>
                          <textarea
                            rows={2}
                            className="form-textarea"
                            value={post.conceptSummary}
                            onChange={(e) => {
                              const updated = [...strategyPreview.posts];
                              updated[pIdx] = { ...updated[pIdx], conceptSummary: e.target.value };
                              setStrategyPreview({ ...strategyPreview, posts: updated });
                            }}
                            style={{ fontSize: '0.82rem', minHeight: '50px' }}
                          />
                        </div>

                        {/* Editable CTA */}
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                            Call To Action (CTA)
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={post.callToAction}
                            onChange={(e) => {
                              const updated = [...strategyPreview.posts];
                              updated[pIdx] = { ...updated[pIdx], callToAction: e.target.value };
                              setStrategyPreview({ ...strategyPreview, posts: updated });
                            }}
                            style={{ fontSize: '0.82rem' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 5 Navigation Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '18px',
                  }}
                >
                  <button className="btn btn-secondary" onClick={() => setWizardStep(4)}>
                    ← Back to AI Plan
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setWizardStep(6);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{ padding: '10px 24px' }}
                  >
                    <span>Next: Flight Activation</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: ACTIVATE (STRATEGY / DRAFT CREATION & SAFEGUARDS) */}
            {wizardStep === 6 && strategyPreview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Rocket size={20} color="var(--accent-primary)" />
                    Step 6: Flight Activation & Governance Review
                  </h2>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Review flight safeguards, connected platform systems, and schedule activation
                  </span>
                </div>

                {/* Campaign Summary Card */}
                <div
                  style={{
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    padding: '20px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Brand: {activeBrand?.name || 'Selected Brand'}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                        {campaignName || strategyPreview.campaignName}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)' }}>
                        Goal: {campaignGoal.toUpperCase()}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: campaignType === 'organic' ? 'rgba(52, 211, 153, 0.15)' : campaignType === 'paid' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(192, 132, 252, 0.15)',
                          color: campaignType === 'organic' ? '#34d399' : campaignType === 'paid' ? '#fbbf24' : '#c084fc',
                        }}
                      >
                        Mode: {campaignType.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Start Date</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{startDate}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Duration</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{duration.replace(/_/g, ' ')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Cadence</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{selectedCadence.replace(/_/g, ' ')}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Posts In Flight</span>
                      <strong style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{strategyPreview.posts.length} Posts</strong>
                    </div>
                  </div>
                </div>

                {/* 3 CORE GOVERNANCE & SAFETY INVARIANTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* SAFEGUARD 1: NON-SILENT PUBLISHING INVARIANT */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <ShieldCheck size={22} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#34d399' }}>
                        Non-Silent Publishing Invariant Enforced
                      </strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Creating this campaign creates a <strong>draft and strategy flight</strong>. It will <strong>NOT silently publish</strong>. All posts and platform variants are saved in <code>scheduled</code> / <code>pending</code> status, with pending governance approval requests created for review.
                      </p>
                    </div>
                  </div>

                  {/* SAFEGUARD 2: ORGANIC REACH TARGETS ARE PROBABILISTIC DISCLAIMER */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <TrendingUp size={22} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#60a5fa' }}>
                        Organic Reach Targets Are Probabilistic Estimates
                      </strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                        Organic reach targets are probabilistic estimates, not guarantees. Reach and impressions fluctuate based on real-time algorithm shifts, audience engagement velocity, and network competition.
                      </p>
                    </div>
                  </div>

                  {/* SAFEGUARD 3: PAID CAMPAIGN SEPARATION (IF PAID OR HYBRID) */}
                  {(campaignType === 'paid' || campaignType === 'hybrid') && (
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        display: 'flex',
                        gap: '14px',
                        alignItems: 'flex-start',
                      }}
                    >
                      <ShieldCheck size={22} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
                          Mandatory Paid Execution Separation Guard
                        </strong>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                          Paid campaigns remain strictly separated from organic execution. Linked to verified ad account <code>{adAccountId}</code> with daily cap <strong>${adDailyBudgetCents / 100}</strong> and total budget <strong>${adBudgetCents / 100}</strong>. Only supported ad products are enabled.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CONNECTED PLATFORM SYSTEMS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={16} color="var(--accent-primary)" />
                    Connected Platform Systems
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {[
                      { name: 'Automations', status: 'Active', desc: '1 flight trigger attached', color: '#c084fc' },
                      { name: 'Templates', status: 'Linked', desc: selectedTemplate, color: '#60a5fa' },
                      { name: 'Approvals', status: 'Pending', desc: 'Approval request queued', color: '#fbbf24' },
                      { name: 'Publishing Jobs', status: 'Scheduled', desc: `${strategyPreview.posts.length} jobs created`, color: '#34d399' },
                      { name: 'Analytics', status: 'Armed', desc: 'Flight goal vs actual tracking', color: '#38bdf8' },
                      { name: 'Growth Recommendations', status: 'Connected', desc: 'Growth intelligence linked', color: '#f43f5e' },
                    ].map((conn, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{conn.name}</strong>
                          <span className="badge" style={{ fontSize: '0.66rem', background: `${conn.color}20`, color: conn.color }}>
                            {conn.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{conn.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 6 Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '18px',
                  }}
                >
                  <button className="btn btn-secondary" onClick={() => setWizardStep(5)}>
                    ← Back to Review & Edit
                  </button>

                  <button
                    className="btn btn-primary"
                    disabled={generatingCampaign}
                    onClick={handleGenerateFullCampaign}
                    style={{ padding: '12px 28px', fontSize: '0.96rem', fontWeight: 700 }}
                  >
                    {generatingCampaign ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Activating Strategy Flight & Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Rocket size={18} />
                        <span>Activate Strategy & Schedule Flight</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATCH RESCHEDULE MODAL */}
      {scheduleModalOpen && selectedCampaign && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setScheduleModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', margin: 0 }}>Reschedule Campaign</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setScheduleModalOpen(false)} title="Close">
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Schedule {selectedCampaign.posts?.length || 0} posts ({activeBrand?.timezone || 'Asia/Kolkata'}).
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.74rem' }}>Post Time ({activeBrand?.timezone || 'IST'})</label>
                <input
                  type="time"
                  className="form-input"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  style={{ padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.74rem' }}>Posting Cadence</label>
              <select
                className="form-input"
                value={rescheduleCadence}
                onChange={(e) =>
                  setRescheduleCadence(
                    e.target.value as 'daily' | 'alternate_days' | 'weekdays' | 'twice_daily'
                  )
                }
                style={{ padding: '7px 10px', fontSize: '0.82rem' }}
              >
                <option value="daily">📅 Daily (1 post / day)</option>
                <option value="alternate_days">⚡ Alternate Days (Every 2 days)</option>
                <option value="weekdays">💼 Weekdays Only (Mon - Fri)</option>
                <option value="twice_daily">🔥 Twice Daily (Morning & Afternoon)</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setScheduleModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" disabled={rescheduling} onClick={handleBatchReschedule}>
                {rescheduling ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Apply Schedule</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal */}
      {campaignConfirmDialog && createPortal(
        <div className="modal-backdrop" onClick={() => setCampaignConfirmDialog(null)}>
          <div className="modal-dialog animate-scale-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: campaignConfirmDialog.isDestructive ? '#f87171' : 'var(--accent-primary)' }}>
                {campaignConfirmDialog.isDestructive ? <Trash2 size={18} /> : <Rocket size={18} />}
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{campaignConfirmDialog.title}</h3>
              </div>
              <button type="button" className="modal-close" onClick={() => setCampaignConfirmDialog(null)} title="Close">
                <X size={15} />
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '0 0 14px 0' }}>
              {campaignConfirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCampaignConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-sm ${campaignConfirmDialog.isDestructive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  const cb = campaignConfirmDialog.onConfirm;
                  setCampaignConfirmDialog(null);
                  cb();
                }}
              >
                {campaignConfirmDialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CampaignsPage;
