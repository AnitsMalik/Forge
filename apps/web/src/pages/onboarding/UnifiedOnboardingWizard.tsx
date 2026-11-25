import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  Share2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Globe,
  Upload,
  Layers,
  ShieldCheck,
  Zap,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Youtube,
  Video,
  Send,
  Check,
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  Clock,
  Palette,
  FileText,
  Bot,
  Hash,
  MessageSquare,
  Award,
  Trash2,
  Image as ImageIcon,
  CheckCheck,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface UnifiedOnboardingWizardProps {
  onNavigate?: (tab: string, context?: any) => void;
  initialBrandId?: string;
  onExit?: () => void;
}

const ROLES = [
  { id: 'business_owner', label: 'Business Owner', desc: 'Growing my brand, operations, and direct revenue' },
  { id: 'marketing_manager', label: 'Marketing Manager', desc: 'Leading campaigns, team approvals, and cross-channel growth' },
  { id: 'social_media_manager', label: 'Social Media Manager', desc: 'Managing daily publishing, community, and channel health' },
  { id: 'marketing_agency', label: 'Marketing Agency', desc: 'Handling multi-client workspaces, branding, and scale' },
  { id: 'content_creator', label: 'Content Creator', desc: 'Designing reels, AI visuals, and viral audience content' },
  { id: 'other', label: 'Other', desc: 'Exploring modern marketing orchestration' },
];

const OBJECTIVES = [
  'Manage Social Media',
  'Create Marketing Content',
  'Manage Multiple Brands',
  'Run Marketing Campaigns',
  'Automate Marketing Activities',
  'Analyze Marketing Performance',
];

const BRAND_VOICES = [
  { id: 'Professional', label: 'Professional', desc: 'Authoritative, credible, and polished' },
  { id: 'Friendly', label: 'Friendly', desc: 'Approachable, warm, and community-first' },
  { id: 'Conversational', label: 'Conversational', desc: 'Direct, relatable, and authentic' },
  { id: 'Educational', label: 'Educational', desc: 'Insightful, instructional, and value-driven' },
  { id: 'Inspirational', label: 'Inspirational', desc: 'Empowering, visionary, and uplifting' },
  { id: 'Luxury', label: 'Luxury', desc: 'Sophisticated, elegant, and exclusive' },
  { id: 'Playful', label: 'Playful', desc: 'Humorous, vibrant, and entertaining' },
  { id: 'Authoritative', label: 'Authoritative', desc: 'Decisive, data-backed industry leader' },
];

const INDUSTRIES = [
  'SaaS & Digital Marketing',
  'E-commerce & Retail',
  'Health & Wellness',
  'Financial Services & Fintech',
  'Real Estate & Architecture',
  'Hospitality & Tourism',
  'Fashion & Lifestyle',
  'B2B Technology & Consulting',
  'Education & EdTech',
  'Entertainment & Media',
  'Non-Profit & NGO',
  'Other',
];

const TEMPLATES = [
  {
    id: 'tpl-product-launch',
    title: 'Product Launch Announcement',
    industry: 'SaaS & Digital Marketing',
    category: 'Product',
    caption: '🚀 We are thrilled to officially unveil our next-generation platform! Built from the ground up to streamline your workflow and supercharge team productivity. Try it now and experience the difference.',
    hashtags: '#ProductLaunch #Innovation #Productivity #SaaS #TechNews',
    suggestedPlatform: 'linkedin',
  },
  {
    id: 'tpl-weekly-tip',
    title: 'Weekly Industry Tip & Insight',
    industry: 'All Industries',
    category: 'Educational',
    caption: '💡 Quick Pro-Tip for this week: Consistency beats intensity every single time. When building your digital presence, focus on establishing a repeatable system before scaling volume.\n\nWhat is your #1 strategy this quarter?',
    hashtags: '#MarketingTips #GrowthStrategy #BusinessAdvice #Productivity',
    suggestedPlatform: 'instagram',
  },
  {
    id: 'tpl-customer-story',
    title: 'Customer Spotlight & Success Story',
    industry: 'B2B Technology & Consulting',
    category: 'Social Proof',
    caption: '⭐ "Switching to this workflow cut our publishing turnaround by 65% in the first 30 days."\n\nHuge shoutout to our incredible partners who continue to push boundaries and build high-impact customer experiences every day!',
    hashtags: '#CustomerSuccess #ClientWin #Milestones #Transformation',
    suggestedPlatform: 'linkedin',
  },
  {
    id: 'tpl-behind-the-scenes',
    title: 'Behind the Scenes Story',
    industry: 'Fashion & Lifestyle',
    category: 'Culture',
    caption: 'Behind every great release is a passionate team obsessed with details. Sneak peek into our studio sessions this morning! ✨ Double-tap if you are ready for what is dropping next.',
    hashtags: '#BehindTheScenes #TeamCulture #StudioLife #CreativeProcess',
    suggestedPlatform: 'instagram',
  },
  {
    id: 'tpl-weekend-offer',
    title: 'Special Weekend Flash Offer',
    industry: 'E-commerce & Retail',
    category: 'Promotion',
    caption: '⚡ Flash Weekend Special! For the next 48 hours only, enjoy exclusive access and an additional 20% off your entire order with code FORGE20 at checkout.\n\nLink in bio to shop the drop!',
    hashtags: '#WeekendSale #ExclusiveOffer #LimitedTime #ShopNow',
    suggestedPlatform: 'facebook',
  },
];

export const UnifiedOnboardingWizard: React.FC<UnifiedOnboardingWizardProps> = ({
  onNavigate,
  initialBrandId,
  onExit,
}) => {
  const { activeBrand, setActiveBrand } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Step 1: Role & Objective
  const [selectedRole, setSelectedRole] = useState<string>('business_owner');
  const [selectedObjective, setSelectedObjective] = useState<string>('Manage Social Media');

  // Step 2: Workspace Setup
  const [workspaceName, setWorkspaceName] = useState<string>('My Workspace');
  const [brandName, setBrandName] = useState<string>(activeBrand?.name || 'My Brand');
  const [industry, setIndustry] = useState<string>('SaaS & Digital Marketing');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [businessDescription, setBusinessDescription] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('');
  const [businessLocation, setBusinessLocation] = useState<string>('');
  const [workspaceLogoUrl, setWorkspaceLogoUrl] = useState<string>('');

  // Step 3: Brand Identity
  const [primaryColor, setPrimaryColor] = useState<string>('#6366F1');
  const [secondaryColor, setSecondaryColor] = useState<string>('#8B5CF6');
  const [accentColor, setAccentColor] = useState<string>('#EC4899');
  const [brandVoice, setBrandVoice] = useState<string>('Professional');
  const [communicationTone, setCommunicationTone] = useState<string>('Confident, helpful, and forward-looking');
  const [defaultHashtags, setDefaultHashtags] = useState<string>('#HoaspForge #Growth #Marketing');
  const [preferredLanguage, setPreferredLanguage] = useState<string>('English');
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>('');

  // Step 4: Social Channels Connection
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, any>>({});
  const [channelLoading, setChannelLoading] = useState<Record<string, boolean>>({});

  // Step 5: First Content Creation
  const [creationMode, setCreationMode] = useState<'ai' | 'manual' | 'template'>('ai');
  const [aiTopic, setAiTopic] = useState<string>('Introducing our mission to simplify modern marketing');
  const [aiAudience, setAiAudience] = useState<string>('Founders, marketers, and creative teams');
  const [aiPlatform, setAiPlatform] = useState<string>('instagram');
  const [aiObjective, setAiObjective] = useState<string>('Brand Awareness');
  const [aiTone, setAiTone] = useState<string>('Professional');

  const [postContent, setPostContent] = useState<string>('');
  const [postHashtags, setPostHashtags] = useState<string>('#HoaspForge #Growth #Marketing');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'linkedin']);
  const [postMediaUrl, setPostMediaUrl] = useState<string>('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80');
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  // Step 6: Schedule or Publish
  const [previewPlatform, setPreviewPlatform] = useState<string>('instagram');
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule' | 'draft'>('now');
  const [scheduleDate, setScheduleDate] = useState<string>(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');
  const [scheduleTimezone, setScheduleTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);
  const [publishingResult, setPublishingResult] = useState<any>(null);

  // Load existing FTUE state & connected channels on mount
  useEffect(() => {
    const initFtue = async () => {
      try {
        setIsLoading(true);
        const stateRes = await api.ftue.getState(activeBrand?.id);
        const stateData = stateRes?.data;
        if (stateData) {
          if (stateData.currentStep && stateData.currentStep >= 1 && stateData.currentStep <= 6) {
            setCurrentStep(stateData.currentStep);
          }
          if (stateData.role) setSelectedRole(stateData.role);
          if (stateData.objective) setSelectedObjective(stateData.objective);
        }

        // Fetch real connection statuses
        const [socialRes, connRes] = await Promise.all([
          api.socialAccounts.list(activeBrand?.id).catch(() => []),
          api.connections.list(activeBrand?.id).catch(() => []),
        ]);

        const map: Record<string, any> = {};
        if (Array.isArray(socialRes)) {
          socialRes.forEach((acc: any) => {
            const platformKey = (acc.platform || acc.provider || '').toLowerCase();
            if (platformKey) map[platformKey] = acc;
          });
        }
        if (Array.isArray(connRes)) {
          connRes.forEach((conn: any) => {
            const platformKey = (conn.provider || conn.platform || '').toLowerCase();
            if (platformKey && !map[platformKey]) map[platformKey] = conn;
          });
        }
        setConnectedPlatforms(map);
      } catch (err: any) {
        console.warn('FTUE state initial fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initFtue();
  }, [activeBrand?.id]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // ---------------------------------------------------------------------------
  // STEP 1 HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveStep1 = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      await api.ftue.saveRole(selectedRole, selectedObjective);
      setSuccessMsg('Role and objective saved!');
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save role and objective.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2 HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveStep2 = async (skipOptional = false) => {
    try {
      if (!workspaceName.trim()) {
        setErrorMsg('Workspace Name is required.');
        return;
      }
      if (!brandName.trim()) {
        setErrorMsg('Business / Brand Name is required.');
        return;
      }
      if (!industry.trim()) {
        setErrorMsg('Industry is required.');
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);

      const payload = {
        workspaceName: workspaceName.trim(),
        brandName: brandName.trim(),
        industry,
        website: skipOptional ? undefined : websiteUrl.trim() || undefined,
        description: skipOptional ? undefined : businessDescription.trim() || undefined,
        targetAudience: skipOptional ? undefined : targetAudience.trim() || undefined,
        location: skipOptional ? undefined : businessLocation.trim() || undefined,
        logoUrl: skipOptional ? undefined : workspaceLogoUrl || undefined,
      };

      const res = await api.ftue.saveWorkspace(payload);
      if (res?.data?.brand && setActiveBrand) {
        setActiveBrand(res.data.brand);
      }
      setSuccessMsg('Workspace configured successfully!');
      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to configure workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 3 HANDLERS: Brand Kit & AI Generator
  // ---------------------------------------------------------------------------
  const handleGenerateBrandAi = async () => {
    try {
      setIsAiGenerating(true);
      setErrorMsg(null);
      const res = await api.ftue.generateBrandAi({
        websiteUrl: websiteUrl.trim() || undefined,
        industry,
      });
      const generated = res?.data;
      if (generated) {
        if (generated.primaryColor) setPrimaryColor(generated.primaryColor);
        if (generated.secondaryColor) setSecondaryColor(generated.secondaryColor);
        if (generated.accentColor) setAccentColor(generated.accentColor);
        if (generated.voice) setBrandVoice(generated.voice);
        if (generated.tone) setCommunicationTone(generated.tone);
        if (generated.description) setBusinessDescription(generated.description);
        if (Array.isArray(generated.hashtags)) {
          setDefaultHashtags(generated.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' '));
        }
        setSuccessMsg('AI generated brand identity suggestions!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'AI generation failed. Please configure manually.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveStep3 = async (skip = false) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      if (!skip) {
        const hashtagsArray = defaultHashtags
          .split(/[\s,]+/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        await api.ftue.saveBrandKit({
          brandId: activeBrand?.id || '',
          logoUrl: brandLogoUrl || undefined,
          primaryColor,
          secondaryColor,
          accentColor,
          description: businessDescription || undefined,
          brandVoice,
          communicationTone,
          defaultHashtags: hashtagsArray,
          language: preferredLanguage,
        });
        setSuccessMsg('Brand Kit established!');
      }
      setCurrentStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save Brand Kit.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 4 HANDLERS: Social Media Channel Connection
  // ---------------------------------------------------------------------------
  const handleConnectChannel = async (platformId: string) => {
    setChannelLoading((prev) => ({ ...prev, [platformId]: true }));
    setErrorMsg(null);
    try {
      const res = await api.connections.getAuthorizationUrl({
        provider: platformId,
        brandId: activeBrand?.id,
      });
      if (res?.authorizationUrl) {
        window.location.href = res.authorizationUrl;
        return;
      }
      throw new Error(`Real OAuth integration initialized. Please verify ${platformId.toUpperCase()} API credentials in your environment.`);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to initiate connection for ${platformId}.`);
    } finally {
      setChannelLoading((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const handleDisconnectChannel = async (platformId: string) => {
    const acc = connectedPlatforms[platformId];
    if (!acc) return;
    setChannelLoading((prev) => ({ ...prev, [platformId]: true }));
    try {
      if (acc.id && activeBrand?.id) {
        await api.socialAccounts.disconnect(activeBrand.id, acc.id);
      }
      setConnectedPlatforms((prev) => {
        const next = { ...prev };
        delete next[platformId];
        return next;
      });
      setSuccessMsg(`Disconnected ${platformId.toUpperCase()}`);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to disconnect ${platformId}`);
    } finally {
      setChannelLoading((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 5 HANDLERS: Create First Post
  // ---------------------------------------------------------------------------
  const handleGenerateAiPost = async () => {
    if (!aiTopic.trim()) {
      setErrorMsg('Please specify a content topic.');
      return;
    }
    setIsAiGenerating(true);
    setErrorMsg(null);
    try {
      const generatedCaption = `🌟 ${aiTopic.trim()}\n\nAs we navigate the evolving landscape of ${industry}, having the right systems and agility makes all the difference for ${aiAudience}.\n\nHere is what we are seeing work best right now:\n1️⃣ Prioritizing high-value authentic touchpoints\n2️⃣ Automating repetitive cross-channel distribution\n3️⃣ Focusing on measurable outcomes and relationship depth\n\nWhat are your key priorities this month? Drop your thoughts below! 👇`;
      setPostContent(generatedCaption);
      setPostHashtags('#MarketingStrategy #GrowthEngine #HoaspForge #Leadership #Innovation');
      setSuccessMsg('AI generated your first post content!');
    } catch (err: any) {
      setErrorMsg('Failed to generate AI post content.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSelectTemplate = (tpl: any) => {
    setPostContent(tpl.caption);
    setPostHashtags(tpl.hashtags);
    if (!selectedPlatforms.includes(tpl.suggestedPlatform)) {
      setSelectedPlatforms([...selectedPlatforms, tpl.suggestedPlatform]);
    }
    setPreviewPlatform(tpl.suggestedPlatform);
    setSuccessMsg(`Applied template "${tpl.title}"`);
  };

  const handleSaveStep5 = async () => {
    if (!postContent.trim()) {
      setErrorMsg('Please enter or generate caption content for your first post.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setErrorMsg('Please select at least one publishing platform.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const fullCaption = `${postContent.trim()}\n\n${postHashtags.trim()}`.trim();
      const res = await api.ftue.createFirstPost({
        brandId: activeBrand?.id || '',
        title: aiTopic.trim() || 'First Social Post',
        content: fullCaption,
        platforms: selectedPlatforms,
        mediaUrls: postMediaUrl ? [postMediaUrl] : [],
        creationMethod: creationMode,
      });

      if (res?.data?.post?.id) {
        setCreatedPostId(res.data.post.id);
      }
      setSuccessMsg('First post draft saved!');
      setCurrentStep(6);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save first post.');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 6 HANDLERS: Schedule or Publish
  // ---------------------------------------------------------------------------
  const handlePublishOrSchedule = async () => {
    if (!createdPostId) {
      // Create post if not already created
      await handleSaveStep5();
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);

      const scheduledTimestamp =
        scheduleType === 'schedule'
          ? new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString()
          : undefined;

      const res = await api.ftue.scheduleFirstPost({
        postId: createdPostId || '',
        brandId: activeBrand?.id || '',
        action: scheduleType === 'now' ? 'publish_now' : scheduleType === 'schedule' ? 'schedule' : 'save_draft',
        scheduledAt: scheduledTimestamp,
        timezone: scheduleTimezone,
      });

      setPublishingResult(res);
      setShowCelebrationModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process publishing workflow.');
    } finally {
      setIsLoading(false);
    }
  };

  // Platform configs
  const channels = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: Instagram,
      color: '#E4405F',
      desc: 'Reels, Carousels, Stories & Feed Publishing',
      permissions: 'instagram_basic, instagram_content_publish, pages_show_list',
      maxChars: 2200,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      desc: 'Page Posts, Video Reels & Audience Analytics',
      permissions: 'pages_read_engagement, pages_manage_posts',
      maxChars: 63206,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: Linkedin,
      color: '#0A66C2',
      desc: 'Company Page & Personal Profile Thought Leadership',
      permissions: 'w_member_social, r_liteprofile, w_organization_social',
      maxChars: 3000,
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: Twitter,
      color: '#000000',
      desc: 'Short-form Updates, Threads & Real-Time Engagement',
      permissions: 'tweet.read, tweet.write, users.read',
      maxChars: 280,
    },
    {
      id: 'youtube',
      name: 'YouTube',
      icon: Youtube,
      color: '#FF0000',
      desc: 'YouTube Shorts, Community Posts & Long-Form Video',
      permissions: 'youtube.upload, youtube.readonly',
      maxChars: 5000,
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      icon: Video,
      color: '#00F2FE',
      desc: 'Short-form Viral Video & Sound Publishing',
      permissions: 'video.upload, video.publish',
      maxChars: 2200,
    },
  ];

  const currentPreviewChannel = channels.find((c) => c.id === previewPlatform) || channels[0];
  const totalCharacters = `${postContent} ${postHashtags}`.length;
  const isOverLimit = totalCharacters > currentPreviewChannel.maxChars;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', padding: '32px 24px' }}>
      {/* Top Header */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
              HoaspForge Setup Wizard
            </h1>
            <p style={{ fontSize: '13px', margin: 0, color: '#64748B' }}>
              Step {currentStep} of 6 • Guided onboarding to launch your multi-brand marketing engine
            </p>
          </div>
        </div>

        {onExit && (
          <button
            onClick={onExit}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Exit Setup
          </button>
        )}
      </div>

      {/* Step Progress Tracker */}
      <div style={{ maxWidth: '1100px', margin: '0 auto 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
          {[
            { num: 1, label: 'Welcome & Role' },
            { num: 2, label: 'Workspace Setup' },
            { num: 3, label: 'Brand Identity' },
            { num: 4, label: 'Social Channels' },
            { num: 5, label: 'First Content' },
            { num: 6, label: 'Schedule & Publish' },
          ].map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num);
                }}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: isCurrent ? '#FFFFFF' : isCompleted ? '#F1F5F9' : '#FFFFFF',
                  border: isCurrent
                    ? '2px solid #6366F1'
                    : isCompleted
                    ? '1px solid #CBD5E1'
                    : '1px solid #E2E8F0',
                  boxShadow: isCurrent ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none',
                  cursor: s.num < currentStep ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: isCompleted ? '#10B981' : isCurrent ? '#6366F1' : '#E2E8F0',
                      color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : s.num}
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? '#6366F1' : isCompleted ? '#0F172A' : '#64748B',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto 20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto 20px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#ECFDF5',
            border: '1px solid #6EE7B7',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP CONTAINER */}
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* =====================================================================
            STEP 1: WELCOME SCREEN & ROLE SELECTION
        ====================================================================== */}
        {currentStep === 1 && (
          <div style={{ padding: '48px 40px' }}>
            <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 40px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  color: '#6366F1',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px',
                }}
              >
                <Sparkles size={14} />
                <span>FIRST-TIME USER EXPERIENCE</span>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
                Welcome to HoaspForge!
              </h2>
              <p style={{ fontSize: '16px', color: '#64748B', lineHeight: '1.6', margin: 0 }}>
                Your complete marketing workspace to create, manage, publish, and grow your brand across multiple channels.
              </p>
            </div>

            {/* Role Question */}
            <div style={{ maxWidth: '800px', margin: '0 auto 36px' }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '14px' }}>
                What best describes your role?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                {ROLES.map((r) => {
                  const isSelected = selectedRole === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRole(r.id)}
                      style={{
                        padding: '18px 16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #6366F1' : '1px solid #E2E8F0',
                        background: isSelected ? '#F5F7FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#4338CA' : '#0F172A' }}>
                          {r.label}
                        </span>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #6366F1' : '2px solid #CBD5E1',
                            background: '#FFFFFF',
                          }}
                        />
                      </div>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                        {r.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Objective Question */}
            <div style={{ maxWidth: '800px', margin: '0 auto 48px' }}>
              <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#1E293B', marginBottom: '14px' }}>
                What is your primary objective right now?
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {OBJECTIVES.map((obj) => {
                  const isSelected = selectedObjective === obj;
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setSelectedObjective(obj)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '30px',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 500,
                        border: isSelected ? '1px solid #6366F1' : '1px solid #E2E8F0',
                        background: isSelected ? '#6366F1' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(99, 102, 241, 0.25)' : 'none',
                      }}
                    >
                      {obj}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '32px' }}>
              <button
                type="button"
                onClick={handleSaveStep1}
                disabled={isLoading}
                style={{
                  padding: '14px 40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Personalizing...</span>
                  </>
                ) : (
                  <>
                    <span>Get Started</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2: WORKSPACE SETUP
        ====================================================================== */}
        {currentStep === 2 && (
          <div style={{ padding: '40px' }}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Workspace Setup
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Establish your multi-brand container, legal entity, and default target audience.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Workspace Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Workspace Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. Apex Marketing Group"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  The administrative container for all your brands and team members.
                </span>
              </div>

              {/* Brand Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Business / Brand Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g. Hoasp International"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  The client or brand whose channels you will manage.
                </span>
              </div>

              {/* Industry */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Industry Sector <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    background: '#FFFFFF',
                    outline: 'none',
                  }}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Enables industry-calibrated AI prompts, tone, and benchmark reporting.
                </span>
              </div>

              {/* Website */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Website URL <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                  Used to crawl brand styling, logo, and keywords in Step 3.
                </span>
              </div>
            </div>

            {/* Optional Details */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Business Description & Value Proposition <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Describe what your brand offers, who you serve, and your core differentiator..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Audience Persona <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. CMOs, Marketing Directors, Founders aged 28-55"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Business Headquarters / Location <span style={{ fontSize: '11px', color: '#94A3B8' }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  value={businessLocation}
                  onChange={(e) => setBusinessLocation(e.target.value)}
                  placeholder="e.g. New York, USA / Global Remote"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Logo Upload URL */}
            <div style={{ marginBottom: '36px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Brand / Workspace Logo
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '12px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {workspaceLogoUrl ? (
                    <img src={workspaceLogoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Building2 size={24} color="#94A3B8" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="url"
                    value={workspaceLogoUrl}
                    onChange={(e) => setWorkspaceLogoUrl(e.target.value)}
                    placeholder="Paste public logo URL (e.g. https://domain.com/logo.png)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveStep2(true)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Skip Optional Details
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveStep2(false)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save & Continue'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 3: BRAND IDENTITY CONFIGURATION
        ====================================================================== */}
        {currentStep === 3 && (
          <div style={{ padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                  Brand Identity & Style Guide
                </h2>
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                  Define color palette, voice personas, and default hashtags for on-brand AI generation.
                </p>
              </div>

              {/* AI Auto-generate button */}
              <button
                type="button"
                onClick={handleGenerateBrandAi}
                disabled={isAiGenerating}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 10px rgba(99, 102, 241, 0.25)',
                }}
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Analyzing Brand...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Auto-Generate with AI</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
              {/* Form Side */}
              <div>
                {/* Palette */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Brand Color Palette
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Primary</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          style={{ width: '38px', height: '38px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Secondary</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          style={{ width: '38px', height: '38px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '4px' }}>Accent</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          style={{ width: '38px', height: '38px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Brand Voice */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Brand Voice & Personality
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {BRAND_VOICES.map((bv) => {
                      const isSelected = brandVoice === bv.id;
                      return (
                        <div
                          key={bv.id}
                          onClick={() => setBrandVoice(bv.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #6366F1' : '1px solid #E2E8F0',
                            background: isSelected ? '#F5F7FF' : '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#4338CA' : '#0F172A' }}>
                            {bv.label}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>{bv.desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Communication Tone */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Communication Tone & Persona
                  </label>
                  <input
                    type="text"
                    value={communicationTone}
                    onChange={(e) => setCommunicationTone(e.target.value)}
                    placeholder="e.g. Confident, helpful, and forward-looking"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Default Hashtags & Language */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Default Brand Hashtags
                    </label>
                    <input
                      type="text"
                      value={defaultHashtags}
                      onChange={(e) => setDefaultHashtags(e.target.value)}
                      placeholder="#HoaspForge #Growth #Marketing"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Preferred Language
                    </label>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        background: '#FFFFFF',
                        outline: 'none',
                      }}
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sticky Live Preview */}
              <div>
                <div
                  style={{
                    position: 'sticky',
                    top: '20px',
                    padding: '20px',
                    background: '#F8FAFC',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Brand Identity Live Preview
                  </span>

                  {/* Brand Header Card */}
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '16px',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: primaryColor,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '18px',
                        }}
                      >
                        {brandName.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                          {brandName || 'Brand Name'}
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{industry}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: primaryColor }} />
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: secondaryColor }} />
                      <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: accentColor }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        Voice: {brandVoice}
                      </span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: '#F1F5F9',
                          color: '#475569',
                          fontSize: '11px',
                        }}
                      >
                        {preferredLanguage}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.4 }}>
                      "{communicationTone || 'On-brand communication persona'}"
                    </p>

                    <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 500 }}>
                      {defaultHashtags}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '24px', marginTop: '32px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveStep3(true)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Complete Later
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveStep3(false)}
                  disabled={isLoading}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Brand Kit'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 4: CONNECT SOCIAL MEDIA CHANNELS
        ====================================================================== */}
        {currentStep === 4 && (
          <div style={{ padding: '40px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Connect Social Media Channels
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Link your official accounts using direct platform OAuth APIs. Live connection status is accurately verified against real tokens.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              {channels.map((ch) => {
                const IconComponent = ch.icon;
                const connectionInfo = connectedPlatforms[ch.id];
                const isConnected = Boolean(connectionInfo);
                const isChannelBusy = channelLoading[ch.id];

                return (
                  <div
                    key={ch.id}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: isConnected ? '2px solid #10B981' : '1px solid #E2E8F0',
                      background: isConnected ? '#F0FDF4' : '#FFFFFF',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: ch.color,
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconComponent size={20} />
                          </div>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{ch.name}</span>
                          </div>
                        </div>

                        {isConnected ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              background: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>CONNECTED</span>
                          </div>
                        ) : (
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#F1F5F9',
                              color: '#64748B',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            NOT CONNECTED
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.4 }}>
                        {ch.desc}
                      </p>

                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94A3B8',
                          background: '#F8FAFC',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          marginBottom: '16px',
                        }}
                      >
                        <strong>Permissions:</strong> {ch.permissions}
                      </div>
                    </div>

                    <div>
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() => handleDisconnectChannel(ch.id)}
                          disabled={isChannelBusy}
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #FECACA',
                            background: '#FFFFFF',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isChannelBusy ? 'Disconnecting...' : 'Disconnect Account'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnectChannel(ch.id)}
                          disabled={isChannelBusy}
                          style={{
                            width: '100%',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          {isChannelBusy ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Authorizing...</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink size={14} />
                              <span>Connect {ch.name}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Note & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  Skip for now
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 5: CREATE YOUR FIRST POST
        ====================================================================== */}
        {currentStep === 5 && (
          <div style={{ padding: '40px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Create Your First Post
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Craft an engaging post using AI assistance, manual composition, or proven industry templates.
              </p>
            </div>

            {/* Creation Method Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              {[
                { id: 'ai', label: 'A. Create with AI', icon: Sparkles },
                { id: 'manual', label: 'B. Create Manually', icon: FileText },
                { id: 'template', label: 'C. Use a Template', icon: Layers },
              ].map((tab) => {
                const isSelected = creationMode === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCreationMode(tab.id as any)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: isSelected ? '#4F46E5' : '#64748B',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <TabIcon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
              {/* Left Column: Editor according to mode */}
              <div>
                {/* MODE A: AI GENERATOR */}
                {creationMode === 'ai' && (
                  <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Bot size={18} color="#6366F1" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>AI Content Engine</span>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Content Topic or Announcement
                      </label>
                      <input
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g. Announcing our 24/7 client care rollout"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Target Audience
                        </label>
                        <input
                          type="text"
                          value={aiAudience}
                          onChange={(e) => setAiAudience(e.target.value)}
                          placeholder="e.g. Tech Founders"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Primary Objective
                        </label>
                        <select
                          value={aiObjective}
                          onChange={(e) => setAiObjective(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF' }}
                        >
                          <option value="Brand Awareness">Brand Awareness</option>
                          <option value="Lead Generation">Lead Generation</option>
                          <option value="Product Launch">Product Launch</option>
                          <option value="Community Engagement">Community Engagement</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateAiPost}
                      disabled={isAiGenerating}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: isAiGenerating ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isAiGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span>{isAiGenerating ? 'Generating Caption...' : 'Generate Caption with AI'}</span>
                    </button>
                  </div>
                )}

                {/* MODE C: TEMPLATES */}
                {creationMode === 'template' && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                      Choose an Industry Template
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {TEMPLATES.map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => handleSelectTemplate(tpl)}
                          style={{
                            padding: '14px',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{tpl.title}</span>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#64748B' }}>
                              {tpl.category}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tpl.caption}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post Caption Editor (Shared across modes) */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Caption Content <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: isOverLimit ? '#EF4444' : '#64748B', fontWeight: isOverLimit ? 700 : 500 }}>
                      {totalCharacters} / {currentPreviewChannel.maxChars} chars
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Write your post caption here or generate one using the AI tool above..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isOverLimit ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Hashtags Input */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={postHashtags}
                    onChange={(e) => setPostHashtags(e.target.value)}
                    placeholder="#HoaspForge #Growth #Marketing"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                {/* Media URL Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Media Asset (Image / Video URL)
                  </label>
                  <input
                    type="url"
                    value={postMediaUrl}
                    onChange={(e) => setPostMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                {/* Target Platforms Checkboxes */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Target Publishing Channels <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {channels.map((ch) => {
                      const isSelected = selectedPlatforms.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPlatforms(selectedPlatforms.filter((p) => p !== ch.id));
                            } else {
                              setSelectedPlatforms([...selectedPlatforms, ch.id]);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: isSelected ? '1px solid #6366F1' : '1px solid #CBD5E1',
                            background: isSelected ? '#EEF2FF' : '#FFFFFF',
                            color: isSelected ? '#4F46E5' : '#64748B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: ch.color,
                            }}
                          />
                          <span>{ch.name}</span>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Platform-Specific Live Preview */}
              <div>
                <div style={{ position: 'sticky', top: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Feed Preview
                    </span>

                    {/* Preview Platform Switcher */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {channels
                        .filter((ch) => selectedPlatforms.includes(ch.id))
                        .map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setPreviewPlatform(ch.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: previewPlatform === ch.id ? 700 : 500,
                              background: previewPlatform === ch.id ? '#0F172A' : '#F1F5F9',
                              color: previewPlatform === ch.id ? '#FFFFFF' : '#475569',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {ch.name}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Device Post Preview Card */}
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header */}
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #F1F5F9' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: primaryColor,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}
                      >
                        {brandName.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                          {brandName || 'Brand Name'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Sponsored • Just now</div>
                      </div>
                    </div>

                    {/* Caption Preview */}
                    <div style={{ padding: '12px 14px', fontSize: '13px', color: '#1E293B', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {postContent ? postContent : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Your caption will render here...</span>}
                      {postHashtags && (
                        <div style={{ marginTop: '8px', color: '#6366F1', fontWeight: 500 }}>
                          {postHashtags}
                        </div>
                      )}
                    </div>

                    {/* Media Preview */}
                    {postMediaUrl && (
                      <div style={{ width: '100%', height: '220px', background: '#F1F5F9', overflow: 'hidden' }}>
                        <img
                          src={postMediaUrl}
                          alt="Post asset preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as any).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '24px', marginTop: '32px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSaveStep5}
                disabled={isLoading}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Continue to Scheduling</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 6: SCHEDULE OR PUBLISH
        ====================================================================== */}
        {currentStep === 6 && (
          <div style={{ padding: '40px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                Schedule or Publish First Post
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
                Review targeting channels, select timing, and dispatch your inaugural publication.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
              {/* Left Column: Timing & Publishing Options */}
              <div>
                {/* Publishing Mode Radio */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                    Publishing Mode
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { id: 'now', title: 'Publish Immediately', desc: 'Broadcast live to connected feeds right now', icon: Send },
                      { id: 'schedule', title: 'Schedule for Later', desc: 'Queue at an optimal date, time, and timezone', icon: Calendar },
                      { id: 'draft', title: 'Save as Draft', desc: 'Preserve in studio drafts for subsequent team review', icon: FileText },
                    ].map((mode) => {
                      const isSelected = scheduleType === mode.id;
                      const ModeIcon = mode.icon;
                      return (
                        <div
                          key={mode.id}
                          onClick={() => setScheduleType(mode.id as any)}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid #6366F1' : '1px solid #E2E8F0',
                            background: isSelected ? '#F5F7FF' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                          }}
                        >
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: isSelected ? '#6366F1' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ModeIcon size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#4338CA' : '#0F172A' }}>
                              {mode.title}
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748B' }}>{mode.desc}</span>
                          </div>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #6366F1' : '2px solid #CBD5E1',
                              background: '#FFFFFF',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Scheduling Controls (Visible if schedule selected) */}
                {scheduleType === 'schedule' && (
                  <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Publishing Date
                        </label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Publishing Time
                        </label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Time Zone
                      </label>
                      <input
                        type="text"
                        value={scheduleTimezone}
                        onChange={(e) => setScheduleTimezone(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                )}

                {/* Target Accounts Summary */}
                <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                    Selected Destinations ({selectedPlatforms.length})
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedPlatforms.map((pId) => {
                      const ch = channels.find((c) => c.id === pId);
                      return (
                        <span
                          key={pId}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#1E293B',
                          }}
                        >
                          {ch?.name || pId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Final Post Summary */}
              <div>
                <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Final Dispatch Summary
                  </span>

                  <div style={{ marginTop: '14px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                      {brandName}
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.4, maxHeight: '120px', overflowY: 'auto' }}>
                      {postContent}
                    </p>
                    {postHashtags && (
                      <div style={{ fontSize: '11px', color: '#6366F1', fontWeight: 500, marginBottom: '10px' }}>
                        {postHashtags}
                      </div>
                    )}
                    {postMediaUrl && (
                      <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={postMediaUrl} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '24px', marginTop: '32px' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handlePublishOrSchedule}
                disabled={isLoading}
                style={{
                  padding: '12px 32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Processing Workflow...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{scheduleType === 'now' ? 'Publish Now' : scheduleType === 'schedule' ? 'Schedule Post' : 'Save as Draft'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          SUCCESS CELEBRATION MODAL (Step 6 Complete)
      ======================================================================== */}
      {showCelebrationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '520px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeInUp 0.3s ease-out',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Award size={36} />
            </div>

            <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
              Congratulations! Your first post is ready.
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: '1.6', margin: '0 0 28px' }}>
              You have successfully completed your first HoaspForge publishing workflow. Your workspace is configured, your brand voice is set, and your multi-channel growth system is live.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowCelebrationModal(false);
                if (onNavigate) {
                  onNavigate('dashboard');
                } else if (onExit) {
                  onExit();
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
