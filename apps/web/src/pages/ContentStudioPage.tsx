import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Send,
  Calendar as CalendarIcon,
  CheckCircle2,
  Copy,
  Hash,
  Smile,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Eye,
  X,
  Trash2,
  RefreshCw,
  Maximize2,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Instagram,
  Twitter,
  Linkedin,
  PenTool,
  Film,
  Languages,
  Globe,
  Layers,
  Video,
  FileText,
  Wand2,
  Search,
  FolderOpen,
  Edit3,
  Check,
  Plus,
  Grid,
  ExternalLink,
  AlertTriangle,
  Zap,
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { AiContentType, AiTransformOperation } from '@socialforge/shared';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { CanvaStudioModal } from '../components/CanvaStudioModal.js';
import { ReelMotionStudioModal } from '../components/ReelMotionStudioModal.js';
import './ContentStudioPage.css';

// 7. AI CONTENT GENERATOR — Supported Content Formats
export const AI_CONTENT_FORMATS: { id: AiContentType; label: string; icon: string; desc: string; defaultPlat: 'instagram' | 'facebook' | 'x_twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest' }[] = [
  { id: 'instagram_caption', label: 'Instagram Captions', icon: '📸', desc: 'Engaging caption with hooks, value bullets & bio CTA', defaultPlat: 'instagram' },
  { id: 'facebook_post', label: 'Facebook Posts', icon: '📘', desc: 'Storytelling post with conversational prompt & community link', defaultPlat: 'facebook' },
  { id: 'linkedin_post', label: 'LinkedIn Posts', icon: '💼', desc: 'Thought leadership with structured strategic takeaways', defaultPlat: 'linkedin' },
  { id: 'x_post', label: 'X Posts', icon: '🐦', desc: 'High-impact concise tweet with punchy hook & link', defaultPlat: 'x_twitter' },
  { id: 'x_thread', label: 'X Threads', icon: '🧵', desc: '5-part viral narrative thread with framework & CTA', defaultPlat: 'x_twitter' },
  { id: 'carousel_copy', label: 'Carousel Copy', icon: '🎠', desc: '6 swipeable slides with visual prompts & lessons', defaultPlat: 'instagram' },
  { id: 'story_copy', label: 'Story Copy', icon: '📱', desc: '3-frame vertical story with stickers, polls & tap links', defaultPlat: 'instagram' },
  { id: 'reel_script', label: 'Reel Scripts', icon: '🎬', desc: '9:16 vertical 30s video script with visual & audio cues', defaultPlat: 'instagram' },
  { id: 'short_video_script', label: 'Short Video Scripts', icon: '🎥', desc: '45s TikTok/Shorts script with 4 visual scenes & voiceover', defaultPlat: 'tiktok' },
  { id: 'youtube_description', label: 'YouTube Descriptions', icon: '▶️', desc: 'Full description with chapters, links & SEO tags', defaultPlat: 'youtube' },
  { id: 'pinterest_pin', label: 'Pinterest Pins', icon: '📌', desc: 'Search-optimized pin copy with visual appeal & CTAs', defaultPlat: 'pinterest' },
  { id: 'ad_copy', label: 'Ad Copy', icon: '📢', desc: 'High-converting paid social ad with multiple headlines & CTA', defaultPlat: 'instagram' },
];

// 7. AI CONTENT GENERATOR — 11 Supported AI Actions
export const AI_ACTIONS: { id: AiTransformOperation; label: string; icon: string; title: string }[] = [
  { id: 'rewrite', label: 'Rewrite', icon: '🔄', title: 'Rewrite from a fresh creative angle' },
  { id: 'shorten', label: 'Shorten', icon: '⚡', title: 'Cut filler words & make punchy' },
  { id: 'expand', label: 'Expand', icon: '📖', title: 'Elaborate with context, background & steps' },
  { id: 'professional', label: 'Professional', icon: '👔', title: 'Executive, authoritative B2B tone' },
  { id: 'friendly', label: 'Friendly', icon: '😊', title: 'Warm, positive & community-focused' },
  { id: 'funny', label: 'Funny', icon: '😂', title: 'Witty, relatable humor with emojis' },
  { id: 'educational', label: 'Educational', icon: '💡', title: 'Step-by-step masterclass format' },
  { id: 'persuasive', label: 'Persuasive', icon: '🎯', title: 'High-converting with urgency & guarantee' },
  { id: 'luxury', label: 'Luxury', icon: '✨', title: 'Exclusive, sophisticated & elevated' },
  { id: 'conversational', label: 'Conversational', icon: '💬', title: 'Casual 1-on-1 dialogue with questions' },
  { id: 'translate', label: 'Translate', icon: '🌐', title: 'Translate into target global language' },
];

export const TARGET_LANGUAGES = [
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

// Supported live publishing channels configuration
export const LIVE_CHANNELS_CONFIG = [
  {
    id: 'facebook',
    name: 'Facebook Page',
    shortName: 'Facebook',
    icon: '📘',
    color: '#1877f2',
    accent: '#3b82f6',
    desc: 'Feed post on Facebook Page',
  },
  {
    id: 'instagram',
    name: 'Instagram Business',
    shortName: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    accent: '#ec4899',
    desc: 'Feed post & media to Instagram',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Organization',
    shortName: 'LinkedIn',
    icon: '💼',
    color: '#0a66c2',
    accent: '#38bdf8',
    desc: 'Thought leadership post on LinkedIn company feed',
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    shortName: 'X / Twitter',
    icon: '🐦',
    color: '#1da1f2',
    accent: '#60a5fa',
    desc: 'Concise thread or tweet on X profile',
  },
  {
    id: 'tiktok',
    name: 'TikTok For Business',
    shortName: 'TikTok',
    icon: '🎵',
    color: '#fe2c55',
    accent: '#f43f5e',
    desc: 'Short video script & audio to TikTok',
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts & Video',
    shortName: 'YouTube',
    icon: '▶️',
    color: '#ff0000',
    accent: '#ef4444',
    desc: 'Video description, tags & chapters for YouTube',
  },
  {
    id: 'pinterest',
    name: 'Pinterest Business',
    shortName: 'Pinterest',
    icon: '📌',
    color: '#e60023',
    accent: '#f87171',
    desc: 'Rich pin copy, link & tags for Pinterest',
  },
];

interface ContentStudioProps {
  initialPost?: any;
  initialAsset?: any;
  onNavigate?: (tab: string, context?: any) => void;
}

export const ContentStudioPage: React.FC<ContentStudioProps> = ({ initialPost, initialAsset, onNavigate }) => {
  const { activeBrand, brands, setActiveBrand } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'x_twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'>('instagram');
  // Multi-channel selection for live publishing
  const [selectedLiveChannels, setSelectedLiveChannels] = useState<string[]>([
    'facebook',
    'instagram',
    'linkedin',
    'x_twitter',
    'tiktok',
    'youtube',
    'pinterest',
  ]);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLivePublishConfirmModalOpen, setIsLivePublishConfirmModalOpen] = useState(false);
  const [isDeletingPublishedPost, setIsDeletingPublishedPost] = useState(false);
  const [lastPublishedPostId, setLastPublishedPostId] = useState<string | null>(null);

  const toggleLiveChannel = (platformId: string) => {
    setSelectedLiveChannels((prev) =>
      prev.includes(platformId) ? prev.filter((p) => p !== platformId) : [...prev, platformId]
    );
  };

  const selectAllLiveChannels = () => {
    setSelectedLiveChannels(LIVE_CHANNELS_CONFIG.map((c) => c.id));
  };

  const deselectAllLiveChannels = () => {
    setSelectedLiveChannels([]);
  };

  const buildDefaultBrandCopy = (brandName?: string, brandSlug?: string) => {
    const name = brandName || 'Brand';
    const tag = (name || 'Brand').replace(/[^a-zA-Z0-9]/g, '') || 'Brand';
    const slug = brandSlug || tag.toLowerCase();
    return {
      title: `${name} — Featured Spotlight`,
      variants: {
        instagram: `ELEVATE YOUR STANDARD WITH ${name.toUpperCase()} ✨🚀\n\nDiscover how ${name} is redefining excellence, innovation, and measurable impact for our community.\n\n✨ Built for performance and reliability\n✨ Trusted by industry leaders & customers\n✨ Designed for lasting results\n\nTap the link in bio to explore what's new at ${name}!\n\n#${tag} #Innovation #Excellence #Growth #Spotlight`,
        facebook: `ELEVATE YOUR STANDARD WITH ${name.toUpperCase()} ✨🚀\n\nDiscover how ${name} is redefining excellence, innovation, and measurable impact for our community.\n\n✨ Built for performance and reliability\n✨ Trusted by industry leaders & customers\n✨ Designed for lasting results\n\nExplore our latest updates and let us know your thoughts in the comments below!\n\n#${tag} #Innovation #Community #BrandSpotlight`,
        x_twitter: `Big things happening at ${name}. ✨🚀\n\nWe're raising the bar on quality, innovation, and results for our community.\n\nSee what's new: https://${slug}.example.com\n\n#${tag} #Innovation`,
        linkedin: `We are proud to share the latest milestone at ${name}.\n\nOur team has been focused on delivering high-impact solutions and exceptional value to our partners and clients.\n\nKey highlights:\n• Proven quality and measurable outcomes\n• Customer-first innovation across every touchpoint\n• Sustainable, scalable growth\n\nThank you to our team and community for driving this vision forward.\n\n#${tag} #Leadership #Innovation #BusinessGrowth`,
        tiktok: `Behind the scenes at ${name} 🚀✨ Tap the link in bio to see how we make it happen! #${slug} #growth #innovation #fyp`,
        youtube: `⚡️ ${name.toUpperCase()} — Official Launch & Feature Deep Dive\n\nWelcome back to the official ${name} channel! In today's video, we break down our latest breakthrough and show you how to maximize results.\n\n⏱️ TIMESTAMPS:\n0:00 - Intro\n1:00 - The New Breakthrough\n3:20 - Real User Results\n5:00 - How to Get Started\n\n🔗 Links & Resources: https://${slug}.example.com\n\n#${tag} #Innovation #DeepDive #Official`,
        pinterest: `📌 The Complete Guide to ${name}: Transform your daily routine with proven quality and verified results.\n\n✨ Key Highlights:\n✔ Clinically verified & backed by data\n✔ Clean, ethical formulation\n✔ Built for daily consistency\n\n👉 Save this pin to your inspiration board & click through to explore! #${tag} #DailyInspo #CleanLiving #MustHave`,
      },
    };
  };

  const initialBrandDefaults = buildDefaultBrandCopy(activeBrand?.name, activeBrand?.slug);
  const [editingPostId, setEditingPostId] = useState<string | null>(initialPost?.id || null);
  const [editingPostStatus, setEditingPostStatus] = useState<string | null>(initialPost?.status || null);
  const [title, setTitle] = useState(initialBrandDefaults.title);
  const [seedPrompt, setSeedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [aiCopyStyle, setAiCopyStyle] = useState<'promotional_launch' | 'thought_leadership' | 'educational_tips' | 'viral_hook'>('promotional_launch');
  const [brandCompliance, setBrandCompliance] = useState<any | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const [isCanvaStudioOpen, setIsCanvaStudioOpen] = useState(false);
  const [isReelStudioOpen, setIsReelStudioOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<AiContentType>('instagram_caption');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Spanish');
  const [studioConfirmModal, setStudioConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Platform variant texts
  const [variants, setVariants] = useState(initialBrandDefaults.variants);

  // Guided 5-Stage Content Creation Workflow State
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [showAllStages, setShowAllStages] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [isScheduling, setIsScheduling] = useState(false);

  // Direct reference to post textarea for smooth scroll & focus from Live Feed Preview
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Action to jump from Live Feed Preview directly to editing text on the left
  const handleFocusEditCaption = () => {
    setCurrentStage(3);
    setTimeout(() => {
      if (postTextareaRef.current) {
        postTextareaRef.current.focus();
        postTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postTextareaRef.current.classList.add('cs-textarea-highlight-pulse');
        setTimeout(() => {
          postTextareaRef.current?.classList.remove('cs-textarea-highlight-pulse');
        }, 2200);
      }
    }, 120);
  };

  // Prepopulate from initialPost if routed from Campaign Arc or Calendar
  useEffect(() => {
    if (initialPost) {
      // Land directly on Stage 3 so user can immediately edit text and schedule/publish
      setCurrentStage(3);

      if (initialPost.title) {
        setTitle(initialPost.title);
      }
      if (initialPost.baseContent || initialPost.base_content) {
        setSeedPrompt(initialPost.baseContent || initialPost.base_content);
      }
      if (initialPost.variants && Array.isArray(initialPost.variants) && initialPost.variants.length > 0) {
        setVariants((prev) => {
          const next = { ...prev };
          initialPost.variants.forEach((v: any) => {
            const plat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
            if (v.content && plat in next) {
              (next as any)[plat] = v.content;
            }
          });
          return next;
        });
      }

      // Prepopulate media attached to this post
      if (initialPost.media) {
        setAttachedMedia({
          instagram: initialPost.media,
          x_twitter: initialPost.media,
          linkedin: initialPost.media,
          tiktok: initialPost.media,
        });
      } else if (initialPost.variants && Array.isArray(initialPost.variants)) {
        initialPost.variants.forEach((v: any) => {
          const plat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
          if (v.media || v.mediaAsset) {
            setAttachedMedia((prev) => ({
              ...prev,
              [plat]: v.media || v.mediaAsset,
            }));
          }
        });
      }
    }
  }, [initialPost]);

  // Attached Media per platform
  const [attachedMedia, setAttachedMedia] = useState<Record<string, any | null>>({
    instagram: null,
    facebook: null,
    x_twitter: null,
    linkedin: null,
    tiktok: null,
    youtube: null,
    pinterest: null,
  });

  // AI Design Studio Creations & Media Assets (Isolated per Brand)
  const [designCreations, setDesignCreations] = useState<any[]>([]);
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(false);
  const [mediaModalCategory, setMediaModalCategory] = useState<'all' | 'favorites' | 'canva_studio' | 'ai_poster' | 'image' | 'video'>('all');
  const [mediaModalFolder, setMediaModalFolder] = useState<string>('all');
  const [mediaModalSearch, setMediaModalSearch] = useState('');

  const brandFolders = React.useMemo(() => {
    const defaultFolders = ['General', 'Product Launches', 'Promotions', 'Campaigns', 'Evergreen'];
    const set = new Set<string>(defaultFolders);
    designCreations.forEach((d) => {
      const f = d.folder || d.metadata?.folder;
      if (f && typeof f === 'string') set.add(f);
    });
    return Array.from(set);
  }, [designCreations]);

  const loadDesignCreations = async () => {
    if (!activeBrand) return;
    try {
      setIsLoadingDesigns(true);
      const list = await api.media.list(activeBrand.id);
      setDesignCreations(list || []);
      setAvailableMedia(list || []);
    } catch (err) {
      console.error('Failed to load designs for Content Studio:', err);
    } finally {
      setIsLoadingDesigns(false);
    }
  };

  const loadSocialAccounts = async () => {
    if (!activeBrand) return;
    try {
      setIsLoadingAccounts(true);
      const accs = await api.socialAccounts.list(activeBrand.id);
      setSocialAccounts(accs || []);
    } catch (err) {
      console.error('Failed to load social accounts for Content Studio:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    if (activeBrand) {
      if (!initialPost && !isDirty) {
        const defaults = buildDefaultBrandCopy(activeBrand.name, activeBrand.slug);
        setTitle(defaults.title);
        setVariants(defaults.variants);
      }
      // Clear any attached media belonging to another brand so brand libraries remain strictly separate
      setAttachedMedia((prev) => {
        const next = { ...prev };
        (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok'] as const).forEach((p) => {
          if (next[p]?.brandId && next[p].brandId !== activeBrand.id) {
            next[p] = null;
          }
        });
        return next;
      });
      setMediaModalFolder('all');
      loadDesignCreations();
      loadSocialAccounts();
    }
  }, [activeBrand?.id]);

  // Prepopulate from initialAsset if routed from Media Library, Canva Studio or Reel Studio
  useEffect(() => {
    if (initialAsset) {
      setAttachedMedia((prev) => {
        const next = { ...prev, [activePlatform]: initialAsset };
        (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest'] as const).forEach((p) => {
          if (!next[p]) next[p] = initialAsset;
        });
        return next;
      });

      // Automatically jump to Stage 3 (Copywriter) so user can immediately add and edit text
      setCurrentStage(3);

      const designTitle = initialAsset.metadata?.title || initialAsset.title || initialAsset.fileName || 'Media Asset';
      setSaveSuccess(`✨ Attached "${designTitle}" to post! You can now write or edit your copy.`);
      setTimeout(() => setSaveSuccess(null), 3500);
      if (activeBrand) loadDesignCreations();
    }
  }, [initialAsset]);

  // Saved Posts / Drafts Modal State
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false);
  const [savedPostsSearch, setSavedPostsSearch] = useState('');
  const [savedPostsFilter, setSavedPostsFilter] = useState<'all' | 'draft' | 'published' | 'scheduled'>('all');

  const loadSavedPosts = async () => {
    if (!activeBrand) return;
    try {
      const posts = await api.posts.list(activeBrand.id);
      setSavedPosts(posts || []);
    } catch (err) {
      console.error('Failed to load saved posts:', err);
    }
  };

  const handleOpenSavedPosts = async () => {
    if (!activeBrand) return;
    setIsDraftsModalOpen(true);
    setIsLoadingSavedPosts(true);
    try {
      await loadSavedPosts();
    } finally {
      setIsLoadingSavedPosts(false);
    }
  };

  const handleResetToBlankPost = () => {
    setTitle(`${activeBrand?.name || 'Brand'} — New Campaign Post`);
    setSeedPrompt('');
    setEditingPostId(null);
    setEditingPostStatus(null);
    setVariants({
      instagram: '',
      facebook: '',
      x_twitter: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
      pinterest: '',
    });
    setAttachedMedia({
      instagram: null,
      facebook: null,
      x_twitter: null,
      linkedin: null,
      tiktok: null,
      youtube: null,
      pinterest: null,
    });
    setIsDirty(false);
    setIsDraftsModalOpen(false);
    setSaveSuccess('Ready to craft a new post!');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleDeleteSavedPost = (e: React.MouseEvent, post: any) => {
    e.stopPropagation();
    if (!activeBrand || !post?.id) return;
    setStudioConfirmModal({
      title: 'Delete Saved Post',
      message: `Are you sure you want to delete "${post.title || 'Untitled Post'}"?`,
      confirmLabel: 'Delete Post',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.posts.delete(activeBrand.id, post.id);
          setSavedPosts((prev) => prev.filter((item) => item.id !== post.id));
          if (editingPostId === post.id) {
            setEditingPostId(null);
            setEditingPostStatus(null);
          }
          setSaveSuccess(`Deleted "${post.title || 'Post'}" from saved posts.`);
          setTimeout(() => setSaveSuccess(null), 3000);
        } catch (err: any) {
          showToast('Failed to delete post: ' + (err.message || 'Unknown error'), 'error');
        }
      },
    });
  };

  const handleDuplicateSavedPost = async (e: React.MouseEvent, post: any) => {
    e.stopPropagation();
    if (!activeBrand || !post?.id) return;
    try {
      const res = await api.posts.duplicate(activeBrand.id, post.id);
      showToast(`Post "${post.title || 'Post'}" duplicated successfully as draft!`, 'success');
      loadSavedPosts();
    } catch (err: any) {
      showToast('Failed to duplicate post: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleDuplicateSavedPostCurrent = async () => {
    if (!activeBrand || !editingPostId) return;
    try {
      const res = await api.posts.duplicate(activeBrand.id, editingPostId);
      const cloned = res?.data || res;
      if (cloned?.id) {
        setEditingPostId(cloned.id);
        if (cloned.title) setTitle(cloned.title);
      }
      showToast('Post duplicated as new draft!', 'success');
      loadSavedPosts();
    } catch (err: any) {
      showToast('Failed to duplicate post: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleLoadPostIntoComposer = (post: any) => {
    setEditingPostId(post.id);
    setEditingPostStatus(post.status || 'draft');
    if (post.title) setTitle(post.title);
    if (post.base_content || post.baseContent) setSeedPrompt(post.base_content || post.baseContent);
    if (post.variants && Array.isArray(post.variants)) {
      setVariants((prev) => {
        const next = { ...prev };
        post.variants.forEach((v: any) => {
          const plat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
          if (v.content && plat in next) {
            (next as any)[plat] = v.content;
          }
        });
        return next;
      });
      if (post.media) {
        setAttachedMedia({
          instagram: post.media,
          facebook: post.media,
          x_twitter: post.media,
          linkedin: post.media,
          tiktok: post.media,
          youtube: post.media,
          pinterest: post.media,
        });
      } else {
        post.variants.forEach((v: any) => {
          const plat = v.platform === 'twitter' ? 'x_twitter' : v.platform;
          if (v.media || v.mediaAsset) {
            setAttachedMedia((prev) => ({ ...prev, [plat]: v.media || v.mediaAsset }));
          }
        });
      }
    }
    setIsDraftsModalOpen(false);
    setIsDirty(false);
    setSaveSuccess(`Loaded "${post.title}" into Content Studio & Composer!`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Media Selector Modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [availableMedia, setAvailableMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // URL Attachment Input
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Fullscreen / Device Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook' | 'x_twitter' | 'linkedin' | 'tiktok' | 'youtube' | 'pinterest'>('instagram');


  // Poster Designer Studio Modal
  const [isPosterStudioOpen, setIsPosterStudioOpen] = useState(false);
  const [posterTemplate, setPosterTemplate] = useState('stat_highlight');
  const [posterRatio, setPosterRatio] = useState('1:1');
  const [posterFields, setPosterFields] = useState({
    badge: 'FEATURED SPOTLIGHT',
    headline: 'Elevated Performance & Innovation',
    subtext: 'Designed for measurable impact, reliability, and lasting value.',
    quote: 'Excellence is never an accident; it is the result of high intention.',
    author: activeBrand?.name || 'Brand',
    metric: '+340%',
    metricLabel: 'Growth Impact',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0b0f19',
  });
  const [posterPreviewSvg, setPosterPreviewSvg] = useState<string>('');
  const [isRenderingPoster, setIsRenderingPoster] = useState(false);
  const [isAttachingPoster, setIsAttachingPoster] = useState(false);
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [isPublishSuccessModalOpen, setIsPublishSuccessModalOpen] = useState(false);
  const [publishSuccessDetails, setPublishSuccessDetails] = useState<{
    title: string;
    variants: any[];
    post: any;
    postId?: string;
    selectedChannels?: string[];
    error?: string | null;
    metaCode?: string | number | null;
    metaType?: string | null;
    safeMessage?: string | null;
    fbtraceId?: string | null;
  } | null>(null);

  // AI Graphic Generator Modal State
  const [isAiPosterModalOpen, setIsAiPosterModalOpen] = useState(false);
  const [isGeneratingAiPoster, setIsGeneratingAiPoster] = useState(false);
  const [aiPosterStyle, setAiPosterStyle] = useState<string>('modern_gradient');
  const [aiPosterRatio, setAiPosterRatio] = useState<'1:1' | '4:5' | '1.91:1' | '9:16'>('1:1');
  const [aiPosterResult, setAiPosterResult] = useState<any | null>(null);
  const [canvaPreloadData, setCanvaPreloadData] = useState<{
    layers?: any[];
    background?: any;
    aspectRatio?: string;
  } | null>(null);

  // Lock background page scroll whenever any popup/modal is open
  const isAnyModalOpen =
    isMediaModalOpen ||
    isPreviewModalOpen ||
    isAiPosterModalOpen ||
    isDraftsModalOpen ||
    isLivePublishConfirmModalOpen ||
    isPublishSuccessModalOpen ||
    isCanvaStudioOpen ||
    isReelStudioOpen ||
    !!studioConfirmModal;

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsAiPosterModalOpen(false);
          setIsPreviewModalOpen(false);
          setIsDraftsModalOpen(false);
          setIsMediaModalOpen(false);
          setIsLivePublishConfirmModalOpen(false);
          setIsPublishSuccessModalOpen(false);
          setStudioConfirmModal(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isAnyModalOpen]);

  // Generate on-brand graphic with AI
  const handleGenerateAiPoster = async (customStyle?: string, customRatio?: string) => {
    if (!activeBrand) return;
    const styleToUse = customStyle || aiPosterStyle;
    const ratioToUse = customRatio || aiPosterRatio;
    const postCopy = variants[activePlatform];

    try {
      setIsGeneratingAiPoster(true);
      const res = await api.templates.generateAiPoster(activeBrand.id, {
        text: postCopy,
        style: styleToUse,
        aspectRatio: ratioToUse,
        saveToMediaLibrary: false,
      });

      setAiPosterResult(res);
      setAiPosterStyle(res.style || styleToUse);
    } catch (err: any) {
      console.error('Failed to generate AI poster:', err);
      showToast('Failed to synthesize AI graphic: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsGeneratingAiPoster(false);
    }
  };

  const handleOpenAiPosterModal = () => {
    setIsAiPosterModalOpen(true);
    if (!aiPosterResult) {
      handleGenerateAiPoster();
    }
  };

  // One-click "Use in Post"
  const handleUseAiPosterInPost = async () => {
    if (!activeBrand || !aiPosterResult) return;
    try {
      setIsGeneratingAiPoster(true);
      let created: any = null;
      try {
        created = await api.media.create(activeBrand.id, {
          fileName: `ai-poster-${aiPosterResult.topic}-${Date.now()}.svg`,
          publicUrl: aiPosterResult.dataUri,
          thumbnailUrl: aiPosterResult.dataUri,
          mimeType: 'image/svg+xml',
          fileSizeBytes: Math.round((aiPosterResult.dataUri?.length || 1000) * 0.75),
          mediaType: 'image',
          metadata: {
            aspectRatio: aiPosterResult.aspectRatio,
            headline: aiPosterResult.headline,
            badge: aiPosterResult.badge,
            topic: aiPosterResult.topic,
            style: aiPosterResult.style,
            generator: 'HoaspForge AI Graphic Generator',
          },
        });
      } catch (uploadErr) {
        console.warn('API media.create failed, using local poster fallback:', uploadErr);
        created = {
          id: `local-${Date.now()}`,
          fileName: `ai-poster-${aiPosterResult.topic}-${Date.now()}.svg`,
          publicUrl: aiPosterResult.dataUri,
          thumbnailUrl: aiPosterResult.dataUri,
          mimeType: 'image/svg+xml',
          fileSizeBytes: Math.round((aiPosterResult.dataUri?.length || 1000) * 0.75),
          mediaType: 'image',
          metadata: {
            aspectRatio: aiPosterResult.aspectRatio,
            headline: aiPosterResult.headline,
            badge: aiPosterResult.badge,
            topic: aiPosterResult.topic,
            style: aiPosterResult.style,
            generator: 'HoaspForge AI Graphic Generator',
          },
        };
      }

      handleSelectDesignForPost(created);
      setIsDirty(true);
      loadDesignCreations();
      setIsAiPosterModalOpen(false);
      setSaveSuccess(`Branded AI poster attached to post draft!`);
      setTimeout(() => setSaveSuccess(null), 3500);
    } catch (err: any) {
      console.error('Failed to attach AI poster:', err);
      showToast('Failed to attach AI poster: ' + err.message, 'error');
    } finally {
      setIsGeneratingAiPoster(false);
    }
  };

  // Launch Canva Studio with AI layers preloaded
  const handleCustomizeInCanvaStudio = () => {
    if (!aiPosterResult) return;
    setCanvaPreloadData({
      layers: aiPosterResult.layers,
      background: aiPosterResult.background,
      aspectRatio: aiPosterResult.aspectRatio,
    });
    setIsAiPosterModalOpen(false);
    setIsCanvaStudioOpen(true);
  };

  const platformLimits = {
    facebook: 63206,
    x_twitter: 280,
    linkedin: 3000,
    instagram: 2200,
    tiktok: 2200,
    youtube: 5000,
    pinterest: 500,
  };


  const currentCharCount = variants[activePlatform].length;
  const currentLimit = platformLimits[activePlatform];
  const charPercentage = Math.min(100, Math.round((currentCharCount / currentLimit) * 100));

  // 7. AI CONTENT GENERATOR — Generate specific content format
  const handleGenerateFormat = async (format: AiContentType) => {
    if (!activeBrand) return;
    setIsGenerating(true);
    try {
      const res = await api.ai.generateContent(activeBrand.id, {
        contentType: format,
        prompt: seedPrompt || `Featured announcement and value spotlight for ${activeBrand.name} with clear call-to-action.`,
        targetLanguage: selectedLanguage,
      });

      if (res?.content) {
        const matchingFormat = AI_CONTENT_FORMATS.find((f) => f.id === format);
        const targetPlat = matchingFormat?.defaultPlat || activePlatform;
        setActivePlatform(targetPlat);
        setVariants((prev) => ({
          ...prev,
          [targetPlat]: res.content,
        }));

        if (res.title) {
          setTitle(res.title);
        }
        if (res.brandCompliance) {
          setBrandCompliance(res.brandCompliance);
        }
        setSelectedFormat(format);
        setSaveSuccess(`✨ Generated ${matchingFormat?.label || format}!`);
        setTimeout(() => setSaveSuccess(null), 3500);
      }
    } catch (err: any) {
      console.error('Failed to generate content format:', err);
      showToast('Failed to generate content: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!activeBrand) return;
    setIsGenerating(true);
    try {
      const res = await api.ai.generateCopy(activeBrand.id, {
        prompt: seedPrompt || `Featured spotlight announcement for ${activeBrand.name} highlighting key benefits and call-to-action`,
        style: aiCopyStyle,
      });

      if (res.data?.variants) {
        setVariants({
          instagram: res.data.variants.instagram?.content || '',
          facebook: (res.data.variants as any).facebook?.content || res.data.variants.instagram?.content || '',
          x_twitter: res.data.variants.x_twitter?.content || '',
          linkedin: res.data.variants.linkedin?.content || '',
          tiktok: res.data.variants.tiktok?.content || '',
          youtube: (res.data.variants as any).youtube?.content || '',
          pinterest: (res.data.variants as any).pinterest?.content || '',
        });
        if (res.data.suggestedTitle) {
          setTitle(res.data.suggestedTitle);
        }
        setIsDirty(true);
        setBrandCompliance(res.data.brandCompliance);
        setSaveSuccess('✨ Multi-channel copy synthesized with Brand Kit voice compliance!');
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to generate copy:', err);
      showToast('Failed to generate copy: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. AI CONTENT GENERATOR — Smart Quick-Transform Toolbar supporting all 11 AI Actions:
  // Rewrite, Shorten, Expand, Professional, Friendly, Funny, Educational, Persuasive, Luxury, Conversational, Translate
  const handleTransformCopy = async (
    operation: AiTransformOperation,
    targetLang?: string
  ) => {
    if (!activeBrand) return;
    setIsTransforming(true);
    try {
      const res = await api.ai.transformCopy(activeBrand.id, {
        content: variants[activePlatform],
        platform: activePlatform,
        operation,
        targetLanguage: targetLang || selectedLanguage,
      });
      if (res?.transformedContent) {
        setVariants((prev) => ({
          ...prev,
          [activePlatform]: res.transformedContent,
        }));
        setIsDirty(true);
        const actionLabel = AI_ACTIONS.find((a) => a.id === operation)?.label || operation;
        setSaveSuccess(`Applied "${actionLabel}" transformation!`);
        setTimeout(() => setSaveSuccess(null), 2500);
      }
    } catch (err: any) {
      showToast('Failed to transform copy: ' + err.message, 'error');
    } finally {
      setIsTransforming(false);
    }
  };

  // Upload image or video from computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;

    // File validation
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) {
      showToast('Unsupported file type. Please upload an image (JPG, PNG, WebP) or video (MP4, WebM).', 'error');
      return;
    }

    const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast(
        `File exceeds maximum allowed size (${isVideo ? '50MB for video' : '15MB for image'}). Current: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        'error'
      );
      return;
    }

    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        const mediaType = isVideo ? 'video' : 'image';
        const created = await api.media.create(activeBrand.id, {
          fileName: file.name,
          publicUrl: base64Url,
          thumbnailUrl: base64Url,
          mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
          fileSizeBytes: file.size,
          mediaType,
          metadata: {
            originalName: file.name,
            uploadedVia: 'composer_file_input',
            mediaType,
          },
        });

        handleSelectDesignForPost(created);
        setIsDirty(true);
        loadDesignCreations();
        setSaveSuccess(`Attached ${mediaType} "${file.name}" to ${activePlatform.toUpperCase()} post.`);
        setTimeout(() => setSaveSuccess(null), 3000);
      } catch (err: any) {
        showToast('Failed to upload media: ' + err.message, 'error');
      } finally {
        setIsUploadingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Attach online image URL
  const handleAttachUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim() || !activeBrand) return;

    try {
      setIsUploadingFile(true);
      const created = await api.media.create(activeBrand.id, {
        fileName: `web-image-${Date.now()}.jpg`,
        publicUrl: imageUrlInput.trim(),
        thumbnailUrl: imageUrlInput.trim(),
        mimeType: 'image/jpeg',
        fileSizeBytes: 150000,
        mediaType: 'image',
        metadata: { source: 'url_input' },
      });

      handleSelectDesignForPost(created);
      setIsDirty(true);
      loadDesignCreations();
      setImageUrlInput('');
      setIsUrlInputOpen(false);
      setSaveSuccess(`Attached image URL to ${activePlatform.toUpperCase()} post.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      showToast('Failed to attach image URL: ' + err.message, 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Open Media Library Selector
  const openMediaSelector = async () => {
    if (!activeBrand) return;
    setIsMediaModalOpen(true);
    await loadDesignCreations();
  };

  const handleSelectMedia = (asset: any) => {
    handleSelectDesignForPost(asset);
  };

  const handleSelectDesignForPost = (design: any) => {
    setAttachedMedia((prev) => {
      const prevActiveId = prev[activePlatform]?.id;
      const next = { ...prev, [activePlatform]: design };
      (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok'] as const).forEach((p) => {
        if (!next[p] || (prevActiveId && next[p]?.id === prevActiveId)) {
          next[p] = design;
        }
      });
      return next;
    });
    if (activeBrand && design?.id && !String(design.id).startsWith('local-')) {
      api.media.update(activeBrand.id, design.id, { incrementUsage: true }).catch(() => {});
    }
    const designTitle = design.title || design.metadata?.title || design.fileName || 'Design';
    setSaveSuccess(`✨ Selected "${designTitle}" (${activeBrand?.name}) for ${activePlatform.toUpperCase()} preview!`);
    setTimeout(() => setSaveSuccess(null), 3500);
    setIsMediaModalOpen(false);
  };

  const handleSyncMediaToAllChannels = (design: any) => {
    if (!design) return;
    setAttachedMedia({
      instagram: design,
      facebook: design,
      x_twitter: design,
      linkedin: design,
      tiktok: design,
    });
    setIsDirty(true);
    const designTitle = design.title || design.metadata?.title || design.fileName || 'Visual';
    setSaveSuccess(`✨ Synced "${designTitle}" across all 5 social channels!`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleToggleDesignFavorite = async (e: React.MouseEvent, design: any) => {
    e.stopPropagation();
    if (!activeBrand || !design?.id) return;
    const currentFav = Boolean(design.favorite || design.metadata?.favorite);
    const nextFav = !currentFav;
    try {
      const updated = await api.media.update(activeBrand.id, design.id, { favorite: nextFav });
      setDesignCreations((prev) => prev.map((d) => (d.id === design.id ? updated : d)));
      setAttachedMedia((prev) => {
        const next = { ...prev };
        (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok'] as const).forEach((p) => {
          if (next[p]?.id === design.id) next[p] = updated;
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle favorite on design:', err);
    }
  };

  const handleAssignDesignFolder = async (design: any, folderName: string) => {
    if (!activeBrand || !design?.id || !folderName) return;
    try {
      const updated = await api.media.update(activeBrand.id, design.id, { folder: folderName });
      setDesignCreations((prev) => prev.map((d) => (d.id === design.id ? updated : d)));
      setAttachedMedia((prev) => {
        const next = { ...prev };
        (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok'] as const).forEach((p) => {
          if (next[p]?.id === design.id) next[p] = updated;
        });
        return next;
      });
      setSaveSuccess(`Moved image to "${folderName}" folder in ${activeBrand.name} library.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to assign folder on design:', err);
    }
  };

  const handleDuplicateDesignInBrand = async (design: any) => {
    if (!activeBrand || !design?.id) return;
    try {
      const duplicated = await api.media.duplicate(activeBrand.id, design.id);
      setDesignCreations((prev) => [duplicated, ...prev]);
      setSaveSuccess(`Saved reusable copy "${duplicated.title}" in ${activeBrand.name} library.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to duplicate design:', err);
    }
  };

  const handleEditDesignInCanva = (e: React.MouseEvent, design: any) => {
    e.stopPropagation();
    const meta = design.metadata || {};
    let parsedLayers: any[] | undefined = undefined;
    const rawLayers = meta.editableLayers || meta.layers;
    if (rawLayers) {
      try {
        parsedLayers = typeof rawLayers === 'string' ? JSON.parse(rawLayers) : rawLayers;
      } catch {}
    }
    const savedBg = meta.editableBackground || meta.background;
    if (Array.isArray(parsedLayers) && parsedLayers.length > 0) {
      setCanvaPreloadData({
        aspectRatio: meta.aspectRatio || '1:1',
        background: savedBg || {
          type: 'gradient',
          value: 'linear-gradient(135deg, #312e81 0%, #4338ca 45%, #7c3aed 100%)',
          overlayOpacity: 0.2,
        },
        layers: parsedLayers,
      });
    } else {
      const imgUrl = design.publicUrl || design.thumbnailUrl;
      setCanvaPreloadData({
        aspectRatio: meta.aspectRatio || '1:1',
        background: {
          type: 'solid',
          value: '#0f172a',
          overlayOpacity: 0,
        },
        layers: imgUrl
          ? [
              {
                id: `layer-imported-${Date.now()}`,
                type: 'image',
                name: design.title || meta.title || 'Imported Graphic',
                imageUrl: imgUrl,
                x: 50,
                y: 50,
                width: 92,
                height: 92,
                rotation: 0,
                opacity: 1,
                visible: true,
                borderRadius: 8,
                cropAspect: 'free',
              },
            ]
          : undefined,
      });
    }
    setIsCanvaStudioOpen(true);
  };

  const handleDeleteDesign = async (e: React.MouseEvent, designId: string) => {
    e.stopPropagation();
    if (!activeBrand) return;
    setStudioConfirmModal({
      title: 'Delete Design from Library',
      message: 'Are you sure you want to permanently delete this design from your library? Attached posts will detach this graphic.',
      confirmLabel: 'Yes, Delete Design',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await api.media.delete(activeBrand.id, designId);
          setDesignCreations((prev) => prev.filter((d) => d.id !== designId));
          setAvailableMedia((prev) => prev.filter((d) => d.id !== designId));
          setAttachedMedia((prev) => {
            const next = { ...prev };
            (['instagram', 'facebook', 'x_twitter', 'linkedin', 'tiktok'] as const).forEach((p) => {
              if (next[p]?.id === designId) next[p] = null;
            });
            return next;
          });
          setSaveSuccess('Design removed from library.');
          setTimeout(() => setSaveSuccess(null), 3000);
        } catch (err: any) {
          showToast('Failed to delete design: ' + (err.message || 'Unknown error'), 'error');
        }
      },
    });
  };

  const handleRemoveMedia = () => {
    setAttachedMedia({
      ...attachedMedia,
      [activePlatform]: null,
    });
    setIsDirty(true);
  };

  const ensurePersistedAsset = async (asset: any) => {
    if (!asset || !activeBrand) return null;
    if (asset.id && !asset.id.startsWith('local-')) return asset;
    try {
      const created = await api.media.create(activeBrand.id, {
        fileName: asset.fileName || `design-${Date.now()}.png`,
        publicUrl: asset.publicUrl || asset.thumbnailUrl,
        thumbnailUrl: asset.thumbnailUrl || asset.publicUrl,
        mimeType: asset.mimeType || 'image/png',
        mediaType: asset.mediaType || 'image',
        fileSizeBytes: asset.fileSizeBytes || 1024,
        metadata: asset.metadata || {},
      });
      return created;
    } catch (err) {
      console.warn('Failed to persist asset on the fly:', err);
      return asset;
    }
  };

  // Update Poster Studio live preview
  const updatePosterPreview = async () => {
    if (!activeBrand) return;
    try {
      setIsRenderingPoster(true);
      const result = await api.templates.render(activeBrand.id, {
        templateId: posterTemplate as any,
        aspectRatio: posterRatio as any,
        ...posterFields,
        brandName: activeBrand.name,
        brandHandle: `@${activeBrand.slug}`,
        saveToMediaLibrary: false,
      });
      setPosterPreviewSvg(result.svg);
    } catch (err) {
      console.error('Failed to render poster preview:', err);
    } finally {
      setIsRenderingPoster(false);
    }
  };

  useEffect(() => {
    if (isPosterStudioOpen && activeBrand) {
      updatePosterPreview();
    }
  }, [isPosterStudioOpen, posterTemplate, posterRatio, posterFields, activeBrand]);

  // Done Designing Poster -> Save & Attach to Post
  const handleAttachPoster = async () => {
    if (!activeBrand) return;
    try {
      setIsAttachingPoster(true);
      const result = await api.templates.render(activeBrand.id, {
        templateId: posterTemplate as any,
        aspectRatio: posterRatio as any,
        ...posterFields,
        brandName: activeBrand.name,
        brandHandle: `@${activeBrand.slug}`,
        saveToMediaLibrary: true,
      });

      if (result.asset) {
        handleSelectDesignForPost(result.asset);
        setIsDirty(true);
        loadDesignCreations();
      }

      setIsPosterStudioOpen(false);
      setSaveSuccess('Branded poster created and attached to post!');
      setTimeout(() => setSaveSuccess(null), 3500);

      // Open preview modal immediately so user sees the finished post & poster
      setPreviewPlatform(activePlatform);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      showToast('Failed to generate poster: ' + err.message, 'error');
    } finally {
      setIsAttachingPoster(false);
    }
  };

  // Helper to build a validated multi-platform post payload
  const buildPostPayload = async (channelsToInclude?: string[]) => {
    const targetChannels =
      channelsToInclude && channelsToInclude.length > 0
        ? channelsToInclude
        : selectedLiveChannels.length > 0
          ? selectedLiveChannels
          : [activePlatform];

    const igAsset = await ensurePersistedAsset(attachedMedia.instagram);
    const fbAsset = await ensurePersistedAsset(attachedMedia.facebook);
    const xAsset = await ensurePersistedAsset(attachedMedia.x_twitter);
    const liAsset = await ensurePersistedAsset(attachedMedia.linkedin);
    const ttAsset = await ensurePersistedAsset(attachedMedia.tiktok);
    const ytAsset = await ensurePersistedAsset(attachedMedia.youtube);
    const pinAsset = await ensurePersistedAsset(attachedMedia.pinterest);

    const postTitle = (title && title.trim()) ? title.trim() : 'Social Post';
    const computedBaseContent =
      (variants[activePlatform] && variants[activePlatform].trim()) ||
      (variants.facebook && variants.facebook.trim()) ||
      (variants.instagram && variants.instagram.trim()) ||
      (variants.x_twitter && variants.x_twitter.trim()) ||
      (variants.linkedin && variants.linkedin.trim()) ||
      (variants.tiktok && variants.tiktok.trim()) ||
      (variants.youtube && variants.youtube.trim()) ||
      (variants.pinterest && variants.pinterest.trim()) ||
      postTitle;

    const allCandidateVariants = [
      {
        platform: 'facebook',
        content: (variants.facebook && variants.facebook.trim()) || computedBaseContent,
        mediaAssetIds: fbAsset?.id ? [fbAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'instagram',
        content: (variants.instagram && variants.instagram.trim()) || computedBaseContent,
        mediaAssetIds: igAsset?.id ? [igAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'x_twitter',
        content: (variants.x_twitter && variants.x_twitter.trim()) || computedBaseContent,
        mediaAssetIds: xAsset?.id ? [xAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'linkedin',
        content: (variants.linkedin && variants.linkedin.trim()) || computedBaseContent,
        mediaAssetIds: liAsset?.id ? [liAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'tiktok',
        content: (variants.tiktok && variants.tiktok.trim()) || computedBaseContent,
        mediaAssetIds: ttAsset?.id ? [ttAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'youtube',
        content: (variants.youtube && variants.youtube.trim()) || computedBaseContent,
        mediaAssetIds: ytAsset?.id ? [ytAsset.id] : [],
        platformSpecificConfig: {},
      },
      {
        platform: 'pinterest',
        content: (variants.pinterest && variants.pinterest.trim()) || computedBaseContent,
        mediaAssetIds: pinAsset?.id ? [pinAsset.id] : [],
        platformSpecificConfig: {},
      },
    ];

    const filteredVariants = allCandidateVariants.filter((v) => targetChannels.includes(v.platform));

    return {
      title: postTitle,
      baseContent: computedBaseContent,
      variants: filteredVariants.length > 0 ? filteredVariants : allCandidateVariants,
    };
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!activeBrand) return;
    try {
      const payload = await buildPostPayload(selectedLiveChannels);

      if (editingPostId) {
        await api.posts.update(activeBrand.id, editingPostId, {
          title: payload.title,
          baseContent: payload.baseContent,
          variants: payload.variants,
          status: 'draft',
        });
        setIsDirty(false);
        setSaveSuccess(`Updated "${payload.title}" (draft) with ${payload.variants.length} platform variant(s).`);
      } else {
        const created = await api.posts.create(activeBrand.id, payload);
        const newId = created?.data?.id || created?.id;
        if (newId) setEditingPostId(newId);
        setIsDirty(false);
        setSaveSuccess(`Successfully saved "${payload.title}" with ${payload.variants.length} selected platform variant(s) to MySQL.`);
      }
      setTimeout(() => setSaveSuccess(null), 4000);
      loadDesignCreations();
      loadSavedPosts();
    } catch (err: any) {
      showToast('Error saving post: ' + err.message, 'error');
    }
  };

  // Schedule Post for Future Date/Time
  const handleSchedulePost = async () => {
    if (!activeBrand) return;
    setIsScheduling(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      if (isNaN(scheduledDateTime.getTime()) || scheduledDateTime <= new Date()) {
        showToast('Please select a future date and time to schedule this post.', 'error');
        setIsScheduling(false);
        return;
      }
      const payload = await buildPostPayload(selectedLiveChannels);
      let targetPostId = editingPostId;
      if (targetPostId) {
        await api.posts.update(activeBrand.id, targetPostId, {
          title: payload.title,
          baseContent: payload.baseContent,
          variants: payload.variants,
          status: 'draft',
        });
      } else {
        const created = await api.posts.create(activeBrand.id, payload);
        targetPostId = created?.data?.id || created?.id;
        if (targetPostId) setEditingPostId(targetPostId);
      }
      if (targetPostId) {
        await api.posts.schedule(activeBrand.id, targetPostId, scheduledDateTime.toISOString());
        setEditingPostStatus('scheduled');
        setIsDirty(false);
        setSaveSuccess(`Scheduled "${payload.title}" for ${scheduledDateTime.toLocaleString()}!`);
        setTimeout(() => setSaveSuccess(null), 4000);
        loadSavedPosts();
      }
    } catch (err: any) {
      showToast('Failed to schedule post: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  // Direct Publish Live Now
  const handlePublishLiveNow = async (channelsToPublish?: any) => {
    if (!activeBrand) return;
    const targetChannels =
      Array.isArray(channelsToPublish) && channelsToPublish.length > 0
        ? channelsToPublish
        : selectedLiveChannels;

    if (!targetChannels || targetChannels.length === 0) {
      showToast('Please select at least one channel for live publishing.', 'error');
      return;
    }

    setIsPublishingLive(true);
    try {
      const payload = await buildPostPayload(targetChannels);

      let liveTargetPostId = editingPostId;
      if (liveTargetPostId) {
        await api.posts.update(activeBrand.id, liveTargetPostId, {
          title: payload.title,
          baseContent: payload.baseContent,
          variants: payload.variants,
          status: 'draft',
        });
      } else {
        const created = await api.posts.create(activeBrand.id, payload);
        liveTargetPostId = created?.data?.id || created?.id;
        if (liveTargetPostId) setEditingPostId(liveTargetPostId);
      }

      if (liveTargetPostId) {
        try {
          const pubResult = await api.posts.publishNow(activeBrand.id, liveTargetPostId, {
            force: true,
            platforms: targetChannels,
          });
          setPublishSuccessDetails({
            title: payload.title,
            variants: pubResult?.variants || [],
            post: pubResult?.post || { id: liveTargetPostId, title: payload.title },
            postId: liveTargetPostId,
            selectedChannels: targetChannels,
            error: null,
          });
          setIsPublishSuccessModalOpen(true);
          setLastPublishedPostId(liveTargetPostId);
          setIsDirty(false);
          setSaveSuccess(`🚀 "${payload.title}" published live across ${targetChannels.length} selected channel(s)!`);
          setTimeout(() => setSaveSuccess(null), 5000);
          loadDesignCreations();
          loadSavedPosts();
        } catch (pubErr: any) {
          const resultPost = await api.posts.get(activeBrand.id, liveTargetPostId).catch(() => ({ id: liveTargetPostId, title: payload.title }));
          setPublishSuccessDetails({
            title: payload.title,
            variants: pubErr?.data?.variants || resultPost?.variants || [],
            post: pubErr?.data?.post || resultPost,
            postId: liveTargetPostId,
            selectedChannels: targetChannels,
            error: pubErr?.message || 'Publishing notice: One or more channels encountered an issue.',
            metaCode: pubErr?.metaCode,
            metaType: pubErr?.metaType,
            safeMessage: pubErr?.safeMessage,
            fbtraceId: pubErr?.fbtraceId,
          });
          setIsPublishSuccessModalOpen(true);
          setLastPublishedPostId(liveTargetPostId);
          loadDesignCreations();
          loadSavedPosts();
        }
      }
    } catch (err: any) {
      showToast('Error creating post: ' + err.message, 'error');
    } finally {
      setIsPublishingLive(false);
      setIsLivePublishConfirmModalOpen(false);
    }
  };

  // Delete Published Post from modal
  const handleDeletePublishedPost = async () => {
    const postId = publishSuccessDetails?.post?.id || publishSuccessDetails?.postId || lastPublishedPostId;
    if (!activeBrand || !postId) {
      showToast('Unable to identify post ID for deletion.', 'error');
      return;
    }

    const postTitle = publishSuccessDetails?.title || title || 'this post';
    setStudioConfirmModal({
      title: 'Delete Post',
      message: `Are you sure you want to delete "${postTitle}"? This will delete the post and remove it from saved posts.`,
      confirmLabel: 'Yes, Delete Post',
      isDestructive: true,
      onConfirm: async () => {
        try {
          setIsDeletingPublishedPost(true);
          await api.posts.delete(activeBrand.id, postId);
          setIsPublishSuccessModalOpen(false);
          setPublishSuccessDetails(null);
          setLastPublishedPostId(null);
          setSaveSuccess(`🗑️ Post "${postTitle}" was deleted successfully.`);
          setTimeout(() => setSaveSuccess(null), 5000);
          loadDesignCreations();
        } catch (err: any) {
          console.error('Failed to delete post:', err);
          showToast(`Failed to delete post: ${err.message || 'Unknown error'}`, 'error');
        } finally {
          setIsDeletingPublishedPost(false);
        }
      },
    });
  };

  // Done button handler on publish success popup
  const handleDonePublishSuccess = () => {
    setIsPublishSuccessModalOpen(false);
    const postTitle = publishSuccessDetails?.title || title || 'Post';
    const channelCount = publishSuccessDetails?.variants?.length || selectedLiveChannels.length || 1;
    const hasFailures = !!publishSuccessDetails?.error || (publishSuccessDetails?.variants || []).some((v: any) => v.status === 'failed');

    if (hasFailures) {
      setSaveSuccess(`⚠️ Post "${postTitle}" saved with channel notices. Check Saved Posts for status.`);
    } else {
      setSaveSuccess(`✓ Post "${postTitle}" is live across ${channelCount} channel(s)!`);
    }
    setTimeout(() => setSaveSuccess(null), 5000);
    setLastPublishedPostId(publishSuccessDetails?.post?.id || publishSuccessDetails?.postId || null);
    loadDesignCreations();
    loadSavedPosts();
  };

  // Current attached asset for active platform
  const currentAsset = attachedMedia[activePlatform];
  const connectedLiveCount = socialAccounts.filter(
    (a) => (a.isActive ?? a.is_active ?? false) && a.metadata?.isSandbox !== true
  ).length;
  const hashtagCount = (variants[activePlatform].match(/#[a-zA-Z0-9_]+/g) || []).length;

  const quickInspirationPrompts = [
    {
      label: '🚀 Product Spotlight',
      prompt: `Highlight the signature value and flagship capabilities of ${activeBrand?.name || 'our brand'} with a clear call to action`,
    },
    {
      label: '💡 3 Industry Insights',
      prompt: `Share 3 actionable industry insights and strategic takeaways from ${activeBrand?.name || 'our team'}`,
    },
    {
      label: '🎁 Exclusive Offer',
      prompt: `Announce a limited-time VIP offer from ${activeBrand?.name || 'our brand'} with urgency and key benefits`,
    },
    {
      label: '🌟 Client Impact Story',
      prompt: `Showcase measurable customer transformation and real-world results achieved with ${activeBrand?.name || 'our solutions'}`,
    },
  ];

  return (
    <div className="cs-studio-container animate-fade-in">
      {/* ===================================================================== */}
      {/* 1. HEADER & WORKSPACE STATUS BAR                                      */}
      {/* ===================================================================== */}
      <div className="cs-header-bar">
        <div className="cs-header-left">
          <div className="cs-brand-avatar-badge">
            {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
          </div>

          <div className="cs-header-title">
            <h1>
              <span>Content Studio</span>
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

            <div className="cs-header-subtitle">
              {brands && brands.length > 1 && (
                <select
                  className="form-select"
                  value={activeBrand?.id || ''}
                  onChange={(e) => {
                    const found = brands.find((b) => b.id === e.target.value);
                    if (found) setActiveBrand(found);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.74rem',
                    height: '24px',
                    width: 'auto',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                  title="Switch active brand"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      Brand: {b.name}
                    </option>
                  ))}
                </select>
              )}

              {isDirty ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#f59e0b', fontWeight: 600, fontSize: '0.74rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                  Unsaved Draft
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#10b981', fontWeight: 600, fontSize: '0.74rem' }}>
                  <Check size={12} />
                  Changes Saved
                </span>
              )}

              <span>•</span>
              <span style={{ color: connectedLiveCount > 0 ? '#10b981' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.74rem' }}>
                {connectedLiveCount > 0
                  ? `${connectedLiveCount} Live Social Account${connectedLiveCount > 1 ? 's' : ''} Connected`
                  : 'Sandbox / Draft Mode Ready'}
              </span>
            </div>
          </div>
        </div>

        <div className="cs-header-actions">
          {editingPostId && (
            <button
              type="button"
              className="cs-tool-btn"
              onClick={handleDuplicateSavedPostCurrent}
              title="Duplicate current post as a new draft"
            >
              <Copy size={14} color="var(--accent-primary)" />
              <span>Duplicate</span>
            </button>
          )}

          <button
            type="button"
            className="cs-tool-btn"
            onClick={handleResetToBlankPost}
            title="Reset composer to craft a fresh post"
          >
            <Plus size={14} color="var(--accent-primary)" />
            <span>New Post</span>
          </button>

          <button
            type="button"
            className="cs-tool-btn"
            onClick={handleOpenSavedPosts}
          >
            <FolderOpen size={14} color="var(--accent-primary)" />
            <span>Saved Posts</span>
            {savedPosts.length > 0 && (
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'rgba(139, 92, 246, 0.16)',
                  color: 'var(--accent-primary)',
                  fontWeight: 800,
                }}
              >
                {savedPosts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className="cs-tool-btn"
            onClick={() => {
              setPreviewPlatform(activePlatform);
              setIsPreviewModalOpen(true);
            }}
          >
            <Eye size={14} color="var(--accent-primary)" />
            <span>Preview Feed</span>
          </button>
        </div>
      </div>

      {/* Toast & Status Banners */}
      {toastNotification && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            background:
              toastNotification.type === 'error'
                ? 'rgba(239, 68, 68, 0.14)'
                : toastNotification.type === 'success'
                ? 'rgba(16, 185, 129, 0.14)'
                : 'rgba(59, 130, 246, 0.14)',
            color:
              toastNotification.type === 'error'
                ? 'var(--accent-rose)'
                : toastNotification.type === 'success'
                ? 'var(--accent-emerald)'
                : 'var(--accent-tertiary)',
            border: `1px solid ${
              toastNotification.type === 'error'
                ? 'rgba(239, 68, 68, 0.35)'
                : toastNotification.type === 'success'
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(59, 130, 246, 0.35)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontSize: '0.84rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toastNotification.type === 'error' ? (
              <AlertTriangle size={15} />
            ) : toastNotification.type === 'success' ? (
              <CheckCircle2 size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            <span>{toastNotification.message}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setToastNotification(null)}
            style={{ padding: '2px 6px', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {saveSuccess && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            background: 'rgba(16, 185, 129, 0.14)',
            color: 'var(--accent-emerald)',
            border: '1px solid rgba(16, 185, 129, 0.32)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '0.84rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} />
            <span>{saveSuccess}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setSaveSuccess(null)}
            style={{ padding: '2px 6px', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. GUIDED 5-STAGE WORKFLOW STEPPER BAR                                */}
      {/* ===================================================================== */}
      <div className="cs-stepper-wrap">
        {[
          { num: 1, label: 'Idea & Brief', icon: Sparkles },
          { num: 2, label: 'AI Copywriter', icon: Wand2 },
          { num: 3, label: 'Multichannel', icon: Layers },
          { num: 4, label: 'Visuals & Media', icon: ImageIcon },
          { num: 5, label: 'Review & Schedule', icon: CalendarIcon },
        ].map((st) => {
          const isActive = currentStage === st.num;
          const isCompleted = currentStage > st.num;
          const StepIcon = st.icon;
          return (
            <button
              key={st.num}
              type="button"
              className={`cs-step-btn step-${st.num} ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => setCurrentStage(st.num as any)}
            >
              <span className="cs-step-num">
                {isCompleted ? <Check size={10} strokeWidth={3} /> : st.num}
              </span>
              <StepIcon size={12} className="cs-step-icon" />
              <span>{st.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="cs-stepper-toggle"
          onClick={() => setShowAllStages(!showAllStages)}
          title={showAllStages ? 'Switch back to step-by-step guided mode' : 'Expand all 5 stages on one scrollable page'}
        >
          {showAllStages ? (
            <>
              <Layers size={13} color="var(--accent-primary)" />
              <span>Guided Steps Mode</span>
            </>
          ) : (
            <>
              <Grid size={13} color="var(--accent-primary)" />
              <span>Full Page View</span>
            </>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 3. MAIN WORKSPACE: 2-COLUMN GRID (55% EDITOR / 45% STICKY PREVIEW)    */}
      {/* ===================================================================== */}
      <div className="cs-workspace-grid">
        {/* LEFT COLUMN: GUIDED STAGES */}
        <div className="cs-editor-column">
          {/* ----------------------------------------------------------------- */}
          {/* STAGE 1: IDEA & BRIEF                                             */}
          {/* ----------------------------------------------------------------- */}
          {(showAllStages || currentStage === 1) && (
            <div className={`cs-stage-card ${currentStage === 1 ? 'is-active' : ''}`}>
              <div className="cs-stage-header">
                <div className="cs-stage-title-wrap">
                  <span className="cs-stage-badge">Stage 01</span>
                  <div>
                    <h3 className="cs-stage-title">Idea &amp; Campaign Brief</h3>
                    <p className="cs-stage-desc">
                      Set the post title, seed concept, or select an instant inspiration prompt
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '6px', display: 'block', fontWeight: 700 }}>
                    Post / Campaign Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder={`E.g., ${activeBrand?.name || 'Brand'} — Product Launch & Spotlight`}
                    style={{ padding: '9px 12px', fontSize: '0.88rem', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '6px', display: 'block', fontWeight: 700 }}>
                    Seed Topic or Idea Hook
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={seedPrompt}
                    onChange={(e) => setSeedPrompt(e.target.value)}
                    placeholder={`Describe your topic, offer, or hook for ${activeBrand?.name || 'your brand'}...`}
                    style={{ padding: '9px 12px', fontSize: '0.85rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setCurrentStage(2);
                      }
                    }}
                  />
                </div>

                {/* 1-Click Inspiration Chips */}
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Quick Inspiration Prompts:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {quickInspirationPrompts.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="cs-prompt-chip"
                        onClick={() => {
                          setSeedPrompt(item.prompt);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {!showAllStages && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentStage(2)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px' }}
                    >
                      <span>Continue to AI Copywriter</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 2: AI COPYWRITER & CO-PILOT                                 */}
          {/* ----------------------------------------------------------------- */}
          {(showAllStages || currentStage === 2) && (
            <div className={`cs-stage-card ${currentStage === 2 ? 'is-active' : ''}`}>
              <div className="cs-stage-header">
                <div className="cs-stage-title-wrap">
                  <span className="cs-stage-badge">Stage 02</span>
                  <div>
                    <h3 className="cs-stage-title">AI Copywriter &amp; Co-Pilot</h3>
                    <p className="cs-stage-desc">
                      Generate high-converting content with Brand Kit voice compliance
                    </p>
                  </div>
                </div>

                {brandCompliance && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--accent-emerald)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>Brand Voice Verified</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '5px', display: 'block', fontWeight: 700 }}>
                      Copywriting Tone
                    </label>
                    <select
                      className="form-select"
                      value={aiCopyStyle}
                      onChange={(e) => setAiCopyStyle(e.target.value as any)}
                      style={{ padding: '7px 10px', fontSize: '0.8rem', height: '36px', width: '100%', fontWeight: 600 }}
                      title="Select copywriting tone"
                    >
                      <option value="promotional_launch">🛍️ Promotional Launch</option>
                      <option value="thought_leadership">💡 Thought Leadership</option>
                      <option value="educational_tips">📚 Educational Tips</option>
                      <option value="viral_hook">🔥 Viral Hook</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.74rem', marginBottom: '5px', display: 'block', fontWeight: 700 }}>
                      Content Format
                    </label>
                    <select
                      className="form-select"
                      value={selectedFormat}
                      onChange={(e) => {
                        const fmtId = e.target.value as AiContentType;
                        setSelectedFormat(fmtId);
                        const found = AI_CONTENT_FORMATS.find((f) => f.id === fmtId);
                        if (found) setActivePlatform(found.defaultPlat);
                      }}
                      style={{ padding: '7px 10px', fontSize: '0.8rem', height: '36px', width: '100%', fontWeight: 600 }}
                      title="Select content format"
                    >
                      {AI_CONTENT_FORMATS.map((fmt) => (
                        <option key={fmt.id} value={fmt.id}>
                          {fmt.icon} {fmt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleGenerateFormat(selectedFormat)}
                    disabled={isGenerating}
                    style={{ flex: 1, minWidth: '160px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Sparkles size={14} />
                    <span>{isGenerating ? 'Synthesizing...' : `Generate for ${activePlatform.toUpperCase()}`}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAiGenerate}
                    disabled={isGenerating}
                    style={{ flex: 1, minWidth: '160px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                    title="Generate tailored copy for all 5 platforms simultaneously"
                  >
                    <Layers size={14} color="var(--accent-primary)" />
                    <span>Generate All 5 Channels</span>
                  </button>
                </div>

                {!showAllStages && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCurrentStage(1)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ChevronLeft size={14} />
                      <span>Back: Brief</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentStage(3)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px' }}
                    >
                      <span>Continue to Multichannel</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 3: MULTICHANNEL CUSTOMIZATION                               */}
          {/* ----------------------------------------------------------------- */}
          {(showAllStages || currentStage === 3) && (
            <div className={`cs-stage-card ${currentStage === 3 ? 'is-active' : ''}`}>
              <div className="cs-stage-header">
                <div className="cs-stage-title-wrap">
                  <span className="cs-stage-badge">Stage 03</span>
                  <div>
                    <h3 className="cs-stage-title">Multichannel Customization</h3>
                    <p className="cs-stage-desc">
                      Tailor copy per channel with instant character limits &amp; AI transform tools
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform Switcher Tabs Bar */}
              <div className="cs-channel-tabs-bar">
                {(['facebook', 'instagram', 'x_twitter', 'linkedin', 'tiktok', 'youtube', 'pinterest'] as const).map((plat) => {
                  const isActive = activePlatform === plat;
                  const matchedAcc = socialAccounts.find(
                    (a) => a.platform?.toLowerCase() === plat.toLowerCase()
                  );
                  const isLive = Boolean(
                    matchedAcc && (matchedAcc.isActive ?? matchedAcc.is_active ?? false) && matchedAcc.metadata?.isSandbox !== true
                  );
                  const charLen = variants[plat]?.length || 0;
                  const limit = platformLimits[plat];
                  const isOver = charLen > limit;
                  const icon = {
                    facebook: '📘',
                    instagram: '📸',
                    x_twitter: '🐦',
                    linkedin: '💼',
                    tiktok: '🎵',
                    youtube: '▶️',
                    pinterest: '📌',
                  }[plat];
                  const label = {
                    facebook: 'Facebook',
                    instagram: 'Instagram',
                    x_twitter: 'X / Twitter',
                    linkedin: 'LinkedIn',
                    tiktok: 'TikTok',
                    youtube: 'YouTube',
                    pinterest: 'Pinterest',
                  }[plat];

                  return (
                    <button
                      key={plat}
                      type="button"
                      className={`cs-channel-tab channel-${plat} ${isActive ? 'active' : ''}`}
                      onClick={() => setActivePlatform(plat)}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isLive ? '#10b981' : 'rgba(148, 163, 184, 0.4)',
                        }}
                        title={isLive ? 'Live Account Connected' : 'Draft / Sandbox'}
                      />
                      <span
                        className="cs-char-counter-pill"
                        style={{
                          background: isOver ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 0, 0, 0.05)',
                          color: isOver ? 'var(--accent-rose)' : 'var(--text-muted)',
                        }}
                      >
                        {charLen}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Attached Media Notification Banner in Stage 3 */}
              {currentAsset && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    borderRadius: '8px',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.22)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {currentAsset.thumbnailUrl || currentAsset.publicUrl ? (
                      <img
                        src={currentAsset.thumbnailUrl || currentAsset.publicUrl}
                        alt="Attached media"
                        style={{ width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '6px',
                          background: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <ImageIcon size={16} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Attached Media: {currentAsset.metadata?.title || currentAsset.title || currentAsset.fileName || 'Media Asset'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        Add or edit your text below, then Save Draft or Publish.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentStage(4)}
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    title="Change or edit media in Stage 4"
                  >
                    Change Media
                  </button>
                </div>
              )}

              {/* Textarea Editor Box */}
              <div className="cs-textarea-wrap">
                <textarea
                  ref={postTextareaRef}
                  className="cs-post-textarea"
                  value={variants[activePlatform]}
                  onChange={(e) => {
                    setVariants({
                      ...variants,
                      [activePlatform]: e.target.value,
                    });
                    setIsDirty(true);
                  }}
                  placeholder={`Write or customize your ${activePlatform} post caption...`}
                />

                {/* Progress bar */}
                <div style={{ width: '100%', height: '3px', background: 'var(--border-subtle)' }}>
                  <div
                    style={{
                      width: `${charPercentage}%`,
                      height: '100%',
                      background: currentCharCount > currentLimit ? 'var(--accent-rose)' : 'var(--gradient-brand)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>

                {/* Textarea Bottom Toolbar */}
                <div className="cs-textarea-toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'rgba(139, 92, 246, 0.12)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {hashtagCount} Hashtag{hashtagCount === 1 ? '' : 's'}
                    </span>

                    <button
                      type="button"
                      className="cs-ai-action-chip"
                      onClick={() => {
                        const slugTag = (activeBrand?.name || 'Brand').replace(/[^a-zA-Z0-9]/g, '') || 'Brand';
                        const tags = `\n\n#${slugTag} #Innovation #BrandSpotlight`;
                        setVariants({ ...variants, [activePlatform]: variants[activePlatform] + tags });
                        setIsDirty(true);
                      }}
                      title="Append brand hashtags"
                    >
                      <Hash size={12} color="var(--accent-primary)" />
                      <span>+ Brand Tags</span>
                    </button>

                    <button
                      type="button"
                      className="cs-ai-action-chip"
                      onClick={() => {
                        const currentCopy = variants[activePlatform] || '';
                        setVariants({
                          instagram: currentCopy,
                          facebook: currentCopy,
                          x_twitter: currentCopy.slice(0, 280),
                          linkedin: currentCopy,
                          tiktok: currentCopy,
                          youtube: currentCopy,
                          pinterest: currentCopy.slice(0, 500),
                        });
                        setIsDirty(true);
                        setSaveSuccess(`Synced ${activePlatform.toUpperCase()} copy across all channels!`);
                        setTimeout(() => setSaveSuccess(null), 3000);
                      }}
                      title="Sync current text to all channels"
                    >
                      <Layers size={12} color="var(--accent-primary)" />
                      <span>Sync All 5</span>
                    </button>

                    <button
                      type="button"
                      className="cs-ai-action-chip"
                      onClick={() => {
                        navigator.clipboard?.writeText(variants[activePlatform] || '');
                        showToast(`Copied ${activePlatform.toUpperCase()} copy to clipboard!`, 'success');
                      }}
                    >
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>

                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: currentCharCount > currentLimit ? 'var(--accent-rose)' : 'var(--text-secondary)',
                    }}
                  >
                    {currentCharCount.toLocaleString()} / {currentLimit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* AI Quick Polish & Tone Operations */}
              <div className="cs-ai-actions-wrap">
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginRight: '2px',
                  }}
                >
                  <Sparkles size={11} color="var(--accent-primary)" />
                  <span>AI Polish:</span>
                </span>

                {AI_ACTIONS.filter((a) => a.id !== 'translate').map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="cs-ai-action-chip"
                    onClick={() => handleTransformCopy(action.id)}
                    disabled={isTransforming}
                    title={action.title}
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}

                {/* Translate action */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className="cs-ai-action-chip"
                    onClick={() => handleTransformCopy('translate', selectedLanguage)}
                    disabled={isTransforming}
                  >
                    <Globe size={11} color="var(--accent-primary)" />
                    <span>Translate:</span>
                  </button>
                  <select
                    className="form-select"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.72rem',
                      height: '26px',
                      width: 'auto',
                      fontWeight: 600,
                    }}
                  >
                    {TARGET_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!showAllStages && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentStage(2)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Back: Copywriter</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleSaveDraft}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 14px', fontWeight: 700 }}
                      title="Save this post as a draft"
                    >
                      <Bookmark size={13} />
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCurrentStage(4)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 12px' }}
                      title="Adjust media in Visuals Studio"
                    >
                      <span>Media Studio</span>
                      <ImageIcon size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCurrentStage(5)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 18px', fontWeight: 750 }}
                      title="Review post and publish or schedule across social channels"
                    >
                      <span>Review &amp; Publish</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 4: VISUALS & MEDIA STUDIO                                   */}
          {/* ----------------------------------------------------------------- */}
          {(showAllStages || currentStage === 4) && (
            <div className={`cs-stage-card ${currentStage === 4 ? 'is-active' : ''}`}>
              <div className="cs-stage-header">
                <div className="cs-stage-title-wrap">
                  <span className="cs-stage-badge">Stage 04</span>
                  <div>
                    <h3 className="cs-stage-title">Visuals &amp; Creative Studio</h3>
                    <p className="cs-stage-desc">
                      Generate branded graphics, launch Canva/Reel studios, or reuse brand library assets
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsUrlInputOpen(!isUrlInputOpen)}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    <LinkIcon size={12} />
                    <span>URL</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={openMediaSelector}
                    style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                  >
                    <Grid size={12} color="var(--accent-primary)" />
                    <span>Gallery ({designCreations.length})</span>
                  </button>
                </div>
              </div>

              {/* 4 Creative Studio Actions */}
              <div className="cs-creative-actions-grid" style={{ marginBottom: '14px' }}>
                <button
                  type="button"
                  className="cs-creative-action-card featured"
                  onClick={handleOpenAiPosterModal}
                >
                  <div className="cs-creative-icon-box" style={{ background: 'var(--gradient-brand)', color: '#ffffff' }}>
                    <Sparkles size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      AI Magic Poster
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      1-Click Visual
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="cs-creative-action-card"
                  onClick={() => {
                    setCanvaPreloadData(null);
                    setIsCanvaStudioOpen(true);
                  }}
                >
                  <div className="cs-creative-icon-box" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                    <PenTool size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      Design Studio
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Layers &amp; Art
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className="cs-creative-action-card"
                  onClick={() => setIsReelStudioOpen(true)}
                >
                  <div className="cs-creative-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                    <Film size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      9:16 Reel Studio
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Vertical Video
                    </div>
                  </div>
                </button>

                <label className="cs-creative-action-card" style={{ margin: 0, cursor: 'pointer' }}>
                  <div className="cs-creative-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <Upload size={16} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      Upload Media
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      From Computer
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={isUploadingFile}
                  />
                </label>
              </div>

              {/* URL Input Form */}
              {isUrlInputOpen && (
                <form onSubmit={handleAttachUrl} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="Paste image URL (https://...) to attach to brand post"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', height: '34px' }}
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={isUploadingFile}
                    style={{ height: '34px', padding: '0 12px' }}
                  >
                    Attach
                  </button>
                </form>
              )}

              {/* Attached Asset Showcase Card */}
              {currentAsset && (
                <div className="cs-media-attachment-box" style={{ marginBottom: '14px' }}>
                  <img
                    src={currentAsset.thumbnailUrl || currentAsset.publicUrl}
                    alt="Attached Creative"
                    className="cs-media-preview-thumb"
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.64rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.16)', color: 'var(--accent-emerald)' }}>
                          ✓ ATTACHED
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {currentAsset.title || currentAsset.metadata?.title || currentAsset.fileName}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          className="form-select"
                          value={currentAsset.folder || currentAsset.metadata?.folder || 'General'}
                          onChange={(e) => handleAssignDesignFolder(currentAsset, e.target.value)}
                          style={{ padding: '1px 6px', fontSize: '0.7rem', height: '24px', width: 'auto', fontWeight: 600 }}
                        >
                          {brandFolders.map((bf) => (
                            <option key={bf} value={bf}>📁 {bf}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => handleToggleDesignFavorite(e, currentAsset)}
                          style={{ padding: '2px 5px', color: (currentAsset.favorite || currentAsset.metadata?.favorite) ? '#fbbf24' : 'var(--text-muted)' }}
                          title="Favorite in brand library"
                        >
                          <Star size={13} fill={(currentAsset.favorite || currentAsset.metadata?.favorite) ? '#fbbf24' : 'none'} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="cs-ai-action-chip"
                        onClick={(e) => handleEditDesignInCanva(e, currentAsset)}
                      >
                        <PenTool size={11} color="#ec4899" />
                        <span>Customize in Studio</span>
                      </button>

                      <button
                        type="button"
                        className="cs-ai-action-chip"
                        onClick={() => handleDuplicateDesignInBrand(currentAsset)}
                      >
                        <Copy size={11} color="#10b981" />
                        <span>Duplicate</span>
                      </button>

                      <button
                        type="button"
                        className="cs-ai-action-chip"
                        onClick={() => handleSyncMediaToAllChannels(currentAsset)}
                      >
                        <Layers size={11} color="var(--accent-primary)" />
                        <span>Sync All 5</span>
                      </button>

                      <button
                        type="button"
                        className="cs-ai-action-chip"
                        onClick={handleRemoveMedia}
                        style={{ color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={11} />
                        <span>Detach</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-Brand Saved Visuals Carousel */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Saved {activeBrand?.name || 'Brand'} Visuals — Click to Reuse
                  </span>
                  {designCreations.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {designCreations.length} asset{designCreations.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {isLoadingDesigns ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <RefreshCw size={14} className="spin" />
                    <span>Loading brand library...</span>
                  </div>
                ) : designCreations.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '4px',
                      scrollbarWidth: 'thin',
                    }}
                  >
                    {designCreations.map((design) => {
                      const isSelected = Boolean(
                        (currentAsset?.id && currentAsset.id === design.id) ||
                          (currentAsset?.publicUrl && currentAsset.publicUrl === design.publicUrl)
                      );
                      const titleText = design.title || design.metadata?.title || design.fileName || 'Graphic';
                      const folderText = design.folder || design.metadata?.folder || 'General';
                      const isFav = Boolean(design.favorite || design.metadata?.favorite);

                      return (
                        <div
                          key={design.id}
                          onClick={() => handleSelectDesignForPost(design)}
                          style={{
                            width: '110px',
                            minWidth: '110px',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(139, 92, 246, 0.14)' : 'var(--bg-surface-elevated)',
                            border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Click to use "${titleText}" (${folderText})`}
                        >
                          <div style={{ width: '100%', height: '70px', background: '#070a12', position: 'relative', overflow: 'hidden' }}>
                            <img
                              src={design.thumbnailUrl || design.publicUrl}
                              alt={titleText}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {isSelected && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  left: '4px',
                                  padding: '1px 5px',
                                  background: '#10b981',
                                  borderRadius: '3px',
                                  fontSize: '0.55rem',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                }}
                              >
                                ✓ IN USE
                              </span>
                            )}
                            {isFav && (
                              <span style={{ position: 'absolute', top: '4px', right: '4px', color: '#fbbf24' }}>
                                ★
                              </span>
                            )}
                          </div>
                          <div style={{ padding: '4px 6px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {titleText}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              📁 {folderText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border-medium)',
                      textAlign: 'center',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    No saved visuals for <strong>{activeBrand?.name}</strong> yet. Use <strong>AI Magic Poster</strong> or <strong>Design Studio</strong> above to create your first visual!
                  </div>
                )}
              </div>

              {!showAllStages && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentStage(3)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Back: Multichannel</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setCurrentStage(5)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px' }}
                  >
                    <span>Continue to Review &amp; Schedule</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* STAGE 5: REVIEW & SCHEDULE / PUBLISH                              */}
          {/* ----------------------------------------------------------------- */}
          {(showAllStages || currentStage === 5) && (
            <div className={`cs-stage-card ${currentStage === 5 ? 'is-active' : ''}`}>
              <div className="cs-stage-header">
                <div className="cs-stage-title-wrap">
                  <span className="cs-stage-badge">Stage 05</span>
                  <div>
                    <h3 className="cs-stage-title">Review &amp; Schedule Workflow</h3>
                    <p className="cs-stage-desc">
                      Select target publishing channels and choose to save as draft, schedule for later, or publish live
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={selectAllLiveChannels}
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={deselectAllLiveChannels}
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Target Channel Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {(['facebook', 'instagram', 'x_twitter', 'linkedin', 'tiktok'] as const).map((plat) => {
                  const isArmed = selectedLiveChannels.includes(plat);
                  const matchedAcc = socialAccounts.find(
                    (a) => a.platform?.toLowerCase() === plat.toLowerCase()
                  );
                  const isLive = Boolean(
                    matchedAcc && (matchedAcc.isActive ?? matchedAcc.is_active ?? false) && matchedAcc.metadata?.isSandbox !== true
                  );
                  const label = {
                    facebook: 'Facebook',
                    instagram: 'Instagram',
                    x_twitter: 'X / Twitter',
                    linkedin: 'LinkedIn',
                    tiktok: 'TikTok',
                  }[plat];
                  const icon = {
                    facebook: '📘',
                    instagram: '📸',
                    x_twitter: '🐦',
                    linkedin: '💼',
                    tiktok: '🎵',
                  }[plat];

                  return (
                    <div
                      key={plat}
                      onClick={() => toggleLiveChannel(plat)}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: isArmed ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: isArmed ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-surface-elevated)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '1rem' }}>{icon}</span>
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: isLive ? '#10b981' : 'rgba(148, 163, 184, 0.45)',
                          }}
                          title={isLive ? 'Live Account Connected' : 'Draft / Sandbox'}
                        />
                      </div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {label}
                      </div>
                      <div style={{ fontSize: '0.66rem', fontWeight: 800, color: isArmed ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {isArmed ? '✓ SELECTED' : '+ INCLUDE'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule For Later Box */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CalendarIcon size={14} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 750, color: 'var(--text-primary)' }}>
                    Schedule for Future Automated Publishing
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '160px' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date:</label>
                    <input
                      type="date"
                      className="form-input"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.78rem', height: '34px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '130px' }}>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Time:</label>
                    <input
                      type="time"
                      className="form-input"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '0.78rem', height: '34px' }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSchedulePost}
                    disabled={isScheduling}
                    style={{ height: '34px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <Clock size={13} color="var(--accent-primary)" />
                    <span>{isScheduling ? 'Scheduling...' : 'Schedule Post'}</span>
                  </button>
                </div>
              </div>

              {!showAllStages && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCurrentStage(4)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <ChevronLeft size={14} />
                    <span>Back: Visuals</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* RIGHT COLUMN: STICKY REAL-TIME PLATFORM PREVIEW                     */}
        {/* =================================================================== */}
        <div className="cs-preview-column">
          <div className="cs-preview-card">
            {/* Header with Switcher Tabs */}
            <div className="cs-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={15} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Live Feed Preview</span>
                </div>
                <button
                  type="button"
                  className="cs-preview-edit-text-btn"
                  onClick={handleFocusEditCaption}
                  title="Click to edit post caption & copy on the left"
                >
                  <Edit3 size={12} />
                  <span>Edit Text</span>
                </button>
              </div>

              <div className="cs-preview-platform-pills">
                {([
                  { id: 'facebook', label: 'FB' },
                  { id: 'instagram', label: 'IG' },
                  { id: 'x_twitter', label: 'X' },
                  { id: 'linkedin', label: 'IN' },
                  { id: 'tiktok', label: 'TT' },
                  { id: 'youtube', label: 'YT' },
                  { id: 'pinterest', label: 'PIN' },
                ] as const).map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    className={`cs-preview-platform-pill preview-pill-${plat.id} ${activePlatform === plat.id ? 'active' : ''}`}
                    onClick={() => setActivePlatform(plat.id)}
                  >
                    {plat.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setPreviewPlatform(activePlatform);
                    setIsPreviewModalOpen(true);
                  }}
                  style={{ padding: '2px 5px' }}
                  title="Expand Fullscreen"
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>

            {/* Authentic Device Frame */}
            <div className="cs-device-frame">
              {activePlatform === 'tiktok' ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '520px',
                    background: '#05070d',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  {currentAsset ? (
                    (currentAsset.mediaType === 'video' || (currentAsset.mimeType && currentAsset.mimeType.startsWith('video/')) || (currentAsset.publicUrl && (currentAsset.publicUrl.endsWith('.mp4') || currentAsset.publicUrl.endsWith('.webm')))) ? (
                      <video
                        src={currentAsset.publicUrl}
                        controls
                        playsInline
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <img
                        src={currentAsset.thumbnailUrl || currentAsset.publicUrl}
                        alt="Attached TikTok Visual"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, #180b2b 0%, #0d0617 55%, #05020a 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: '10px',
                        padding: '20px',
                        textAlign: 'center',
                      }}
                    >
                      <Film size={28} color="#ff0050" />
                      <div style={{ fontSize: '0.85rem', color: '#ffffff', fontWeight: 800 }}>
                        9:16 Vertical Reel Preview
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setIsReelStudioOpen(true)}
                        style={{ fontSize: '0.72rem', padding: '5px 11px' }}
                      >
                        <Film size={12} />
                        <span>Launch Reel Studio</span>
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'var(--gradient-brand)',
                        border: '2px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: '#fff',
                        fontSize: '0.7rem',
                      }}
                    >
                      {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
                    </div>
                    <Heart size={18} color="#ff0050" fill="#ff0050" />
                    <MessageCircle size={18} color="#ffffff" fill="#ffffff" />
                    <Bookmark size={18} color="#ffffff" fill="#ffffff" />
                  </div>

                  <div style={{ position: 'relative', zIndex: 10, padding: '12px', maxWidth: '85%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#ffffff' }}>
                          @{activeBrand?.slug || 'brand'}
                        </span>
                        <CheckCircle2 size={11} color="#20d5ec" />
                      </div>
                      <button
                        type="button"
                        onClick={handleFocusEditCaption}
                        style={{
                          background: 'rgba(139, 92, 246, 0.85)',
                          border: 'none',
                          borderRadius: '999px',
                          color: '#ffffff',
                          padding: '2px 8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title="Edit TikTok caption on the left"
                      >
                        <Edit3 size={10} />
                        <span>Edit Text</span>
                      </button>
                    </div>
                    <p
                      onClick={handleFocusEditCaption}
                      style={{ margin: 0, fontSize: '0.74rem', color: '#f1f5f9', lineHeight: 1.4, maxHeight: '60px', overflow: 'hidden', cursor: 'pointer' }}
                      title="Click to edit TikTok caption"
                    >
                      {variants.tiktok || <span style={{ opacity: 0.7, fontStyle: 'italic' }}>Click to add caption...</span>}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Author Header */}
                  <div className="cs-device-author-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: 'var(--gradient-brand)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}
                      >
                        {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {activeBrand?.name || 'Brand'}
                          </span>
                          <CheckCircle2 size={12} color="#3b82f6" />
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          @{activeBrand?.slug || 'brand'} • Just now • 🌐
                        </div>
                      </div>
                    </div>
                    <MoreHorizontal size={15} color="var(--text-muted)" />
                  </div>

                  {/* Visual Viewport */}
                  <div className="cs-device-media-stage">
                    {currentAsset ? (
                      <>
                        {(currentAsset.mediaType === 'video' || (currentAsset.mimeType && currentAsset.mimeType.startsWith('video/')) || (currentAsset.publicUrl && (currentAsset.publicUrl.endsWith('.mp4') || currentAsset.publicUrl.endsWith('.webm')))) ? (
                          <video
                            src={currentAsset.publicUrl}
                            controls
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                          />
                        ) : (
                          <img
                            src={currentAsset.thumbnailUrl || currentAsset.publicUrl}
                            alt="Attached Graphic"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            display: 'flex',
                            gap: '5px',
                            alignItems: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={handleFocusEditCaption}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '999px',
                              background: 'var(--gradient-brand)',
                              border: '1px solid rgba(255,255,255,0.3)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backdropFilter: 'blur(8px)',
                              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                            }}
                            title="Edit post text and caption on the left"
                          >
                            <Edit3 size={10} />
                            <span>Edit Text</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleEditDesignInCanva(e, currentAsset)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '999px',
                              background: 'rgba(13, 17, 27, 0.82)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backdropFilter: 'blur(8px)',
                            }}
                            title="Edit visual layers in Canva Studio"
                          >
                            <PenTool size={10} color="#f472b6" />
                            <span>Edit Media</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveMedia}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '999px',
                              background: 'rgba(239, 68, 68, 0.85)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              color: '#ffffff',
                              fontSize: '0.68rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              backdropFilter: 'blur(8px)',
                            }}
                          >
                            <Trash2 size={10} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="cs-media-empty-placeholder">
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(236, 72, 153, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#f472b6',
                          }}
                        >
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Add a Visual
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '240px', marginTop: '2px' }}>
                            Visual posts earn up to 2.3x higher engagement.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleOpenAiPosterModal}
                            style={{ fontSize: '0.7rem', padding: '4px 9px' }}
                          >
                            <Sparkles size={11} />
                            <span>AI Poster</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setCanvaPreloadData(null);
                              setIsCanvaStudioOpen(true);
                            }}
                            style={{ fontSize: '0.7rem', padding: '4px 9px' }}
                          >
                            <PenTool size={11} />
                            <span>Studio</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Social Engagement Bar */}
                  <div className="cs-device-engagement-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                        <Heart size={14} color="#f43f5e" /> Like
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                        <MessageCircle size={14} /> Comment
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                        <Share2 size={14} /> Share
                      </span>
                    </div>
                    <Bookmark size={14} />
                  </div>

                  {/* Post Caption with Click-to-Edit */}
                  <div
                    className="cs-device-caption-box cs-device-caption-interactive"
                    onClick={handleFocusEditCaption}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFocusEditCaption();
                      }
                    }}
                    title="Click anywhere to edit caption on the left"
                  >
                    <div className="cs-device-caption-text">
                      {variants[activePlatform] ? (
                        <span>{variants[activePlatform]}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Your {activePlatform} post caption will appear here... Click to edit.
                        </span>
                      )}
                    </div>
                    <div className="cs-device-caption-edit-badge">
                      <Edit3 size={11} />
                      <span>Edit Text &amp; Caption</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pre-Flight Readiness Summary */}
            <div className="cs-preflight-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Pre-Flight Readiness
                </span>
                <span style={{ color: 'var(--accent-emerald)' }}>
                  {selectedLiveChannels.length} Channel{selectedLiveChannels.length === 1 ? '' : 's'} Ready
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: currentCharCount > 0 && currentCharCount <= currentLimit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: currentCharCount > 0 && currentCharCount <= currentLimit ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                    fontWeight: 700,
                  }}
                >
                  {currentCharCount > 0 && currentCharCount <= currentLimit ? '✓ Length OK' : '⚠ Check Length'}
                </span>

                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: currentAsset ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                    color: currentAsset ? 'var(--accent-emerald)' : 'var(--accent-primary)',
                    fontWeight: 700,
                  }}
                >
                  {currentAsset ? '✓ Media Attached' : '✦ Text-Only'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. UNIFIED BOTTOM ACTION DOCK (DRAFT / SCHEDULE / PUBLISH)            */}
      {/* ===================================================================== */}
      <div className="cs-action-dock">
        <div className="cs-action-dock-left">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Publishing Targets:
          </span>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '999px',
              background: selectedLiveChannels.length > 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)',
              color: selectedLiveChannels.length > 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
            }}
          >
            {selectedLiveChannels.length > 0
              ? `${selectedLiveChannels.length} Social Channel${selectedLiveChannels.length > 1 ? 's' : ''} Selected`
              : 'No Channels Selected'}
          </span>
        </div>

        <div className="cs-action-dock-right">
          {editingPostId && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleDuplicateSavedPostCurrent}
              title="Duplicate current post as a new draft"
              style={{ padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <Copy size={13} />
              <span>Duplicate</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSaveDraft}
            style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700 }}
          >
            {editingPostId ? 'Update Draft' : 'Save Draft'}
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSchedulePost}
            disabled={isScheduling}
            style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={14} color="var(--accent-primary)" />
            <span>{isScheduling ? 'Scheduling...' : 'Schedule Post'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (selectedLiveChannels.length === 0) {
                showToast('Please select at least one target channel for live publishing.', 'error');
                return;
              }
              setIsLivePublishConfirmModalOpen(true);
            }}
            disabled={isPublishingLive}
            style={{
              padding: '8px 18px',
              fontSize: '0.82rem',
              fontWeight: 750,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={14} />
            <span>{isPublishingLive ? 'Publishing...' : `Publish Live Now (${selectedLiveChannels.length})`}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Compact Social Feed Preview Modal (Zero Scroll) */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: 0,
            }}
          >
            {/* Compact Header + Platform Switcher */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Feed Preview</span>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[
                  { id: 'facebook', label: 'FB', icon: '📘' },
                  { id: 'instagram', label: 'IG', icon: '📸' },
                  { id: 'x_twitter', label: 'X', icon: '🐦' },
                  { id: 'linkedin', label: 'IN', icon: '💼' },
                  { id: 'tiktok', label: 'TT', icon: '🎵' },
                ].map((plat) => {
                  const isSelected = previewPlatform === plat.id;
                  return (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => setPreviewPlatform(plat.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'transparent',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{plat.icon}</span>
                      <span>{plat.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setIsPreviewModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Compact Device Body */}
            <div style={{ padding: '14px 16px' }}>
              <div
                style={{
                  width: '100%',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                {/* Author Info Bar */}
                <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                      }}
                    >
                      {(activeBrand?.name || 'B').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                        {activeBrand?.name || 'Brand'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        @{activeBrand?.slug || 'brand'}
                      </div>
                    </div>
                  </div>
                  <MoreHorizontal size={16} color="var(--text-muted)" />
                </div>

                {/* Compact Media Box */}
                <div
                  style={{
                    width: '100%',
                    height: '340px',
                    background: 'var(--bg-canvas, #090d16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderTop: '1px solid var(--border-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  {(attachedMedia[previewPlatform] || currentAsset) ? (
                    <img
                      src={(attachedMedia[previewPlatform] || currentAsset).thumbnailUrl || (attachedMedia[previewPlatform] || currentAsset).publicUrl}
                      alt="Attached Creative"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                      <ImageIcon size={28} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                      <div style={{ fontSize: '0.76rem' }}>No media attached</div>
                    </div>
                  )}
                </div>

                {/* Caption Snippet */}
                <div
                  style={{
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 6,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  <strong style={{ marginRight: '6px', color: 'var(--text-primary)' }}>{activeBrand?.slug || 'brand'}</strong>
                  {variants[previewPlatform]}
                </div>
              </div>
            </div>

            {/* Compact Footer */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <button className="btn btn-secondary btn-sm" onClick={() => setIsPreviewModalOpen(false)}>
                Close
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    handleSaveDraft();
                    setIsPreviewModalOpen(false);
                  }}
                >
                  Save Draft
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setIsPreviewModalOpen(false);
                    setIsLivePublishConfirmModalOpen(true);
                  }}
                >
                  <Send size={13} />
                  <span>Publish Live</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Graphic Generator Modal (Centered, Portal-rendered, Zero Clipping) */}
      {isAiPosterModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsAiPosterModalOpen(false)}
        >
          <div
            className="modal-dialog animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '740px',
              maxHeight: 'min(90vh, 640px)',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface-elevated)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      AI Graphic Generator
                    </h3>
                    <span
                      style={{
                        fontSize: '0.66rem',
                        padding: '2px 8px',
                        background: 'rgba(236, 72, 153, 0.15)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        color: '#f472b6',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {activePlatform}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    Synthesizing brand visual for <strong>{activeBrand?.name || 'Active Brand'}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setIsAiPosterModalOpen(false)}
                title="Close (Esc)"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Two-Column Body with internal scrolling */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 260px) 1fr', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {/* Left Column: Ratio & Style Controls */}
              <div
                style={{
                  padding: '16px 18px',
                  borderRight: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  justifyContent: 'space-between',
                  background: 'var(--bg-surface-elevated)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Aspect Ratio */}
                  <div>
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'block',
                        marginBottom: '8px',
                      }}
                    >
                      Aspect Ratio
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                      {(['1:1', '4:5', '1.91:1', '9:16'] as const).map((r) => {
                        const isSel = aiPosterRatio === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setAiPosterRatio(r);
                              handleGenerateAiPoster(aiPosterStyle, r);
                            }}
                            style={{
                              padding: '6px 2px',
                              borderRadius: '6px',
                              border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                              background: isSel ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-surface)',
                              color: isSel ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visual Style Selection */}
                  <div>
                    <label
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'block',
                        marginBottom: '8px',
                      }}
                    >
                      Visual Aesthetic
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { id: 'modern_gradient', label: 'Modern Gradient', icon: '🌈' },
                        { id: 'minimalist_editorial', label: 'Minimalist Editorial', icon: '📰' },
                        { id: 'bold_impact', label: 'Bold Impact Neon', icon: '⚡' },
                        { id: 'stat_highlight', label: 'Metric Highlight', icon: '📈' },
                        { id: 'dark_luxe', label: 'Obsidian Dark Luxe', icon: '🌌' },
                      ].map((s) => {
                        const isSel = aiPosterStyle === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setAiPosterStyle(s.id);
                              handleGenerateAiPoster(s.id, aiPosterRatio);
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: isSel ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                              background: isSel ? 'rgba(236, 72, 153, 0.12)' : 'var(--bg-surface)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              textAlign: 'left',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {s.icon} {s.label}
                            </span>
                            {isSel && <Check size={14} color="var(--accent-secondary)" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Regenerate Button */}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleGenerateAiPoster()}
                  disabled={isGeneratingAiPoster}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isGeneratingAiPoster ? 'animate-spin' : ''} />
                  <span>{isGeneratingAiPoster ? 'Synthesizing...' : 'Regenerate Graphic'}</span>
                </button>
              </div>

              {/* Right Column: Visual Stage & Actions */}
              <div
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-surface)',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '260px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-medium)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-canvas, #090d16)',
                    position: 'relative',
                  }}
                >
                  {isGeneratingAiPoster ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <RefreshCw size={26} className="animate-spin" color="var(--accent-secondary)" />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Synthesizing brand graphic...</span>
                    </div>
                  ) : aiPosterResult?.dataUri ? (
                    <img
                      src={aiPosterResult.dataUri}
                      alt="AI Poster"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Sparkles size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                      <div>No preview available</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleUseAiPosterInPost}
                      disabled={isGeneratingAiPoster || !aiPosterResult}
                      style={{ flex: 1, padding: '9px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <Sparkles size={14} />
                      <span>Use in Post</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCustomizeInCanvaStudio}
                      disabled={isGeneratingAiPoster || !aiPosterResult}
                      style={{ padding: '9px 14px', fontSize: '0.82rem', fontWeight: 600 }}
                    >
                      <PenTool size={14} color="#f472b6" />
                      <span>Edit in Studio</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setIsAiPosterModalOpen(false)}
                    style={{ fontSize: '0.76rem', color: 'var(--text-muted)', width: '100%' }}
                  >
                    Cancel &amp; Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Canva-like Visual Design Studio Modal */}
      <CanvaStudioModal
        key={isCanvaStudioOpen ? 'canva-open' : 'canva-closed'}
        isOpen={isCanvaStudioOpen}
        onClose={() => {
          setIsCanvaStudioOpen(false);
          setCanvaPreloadData(null);
          loadDesignCreations();
        }}
        initialText={
          (title || (variants[activePlatform] || '').split('\n')[0] || '')
            .replace(/[#*`]/g, '')
            .trim()
            .slice(0, 60)
        }
        initialImageUrl={
          canvaPreloadData
            ? undefined
            : currentAsset?.metadata?.source === 'canva_studio' || currentAsset?.metadata?.generator
              ? undefined
              : currentAsset?.publicUrl || currentAsset?.thumbnailUrl
        }
        initialLayers={canvaPreloadData?.layers || currentAsset?.metadata?.editableLayers || currentAsset?.metadata?.layers}
        initialBackground={canvaPreloadData?.background || currentAsset?.metadata?.editableBackground || currentAsset?.metadata?.background}
        initialAspectRatio={canvaPreloadData?.aspectRatio || currentAsset?.metadata?.aspectRatio}
        onUseInPost={(asset) => {
          handleSelectDesignForPost(asset);
          loadDesignCreations();
          setIsCanvaStudioOpen(false);
          setCanvaPreloadData(null);
        }}
        onCreatePost={(asset) => {
          handleSelectDesignForPost(asset);
          loadDesignCreations();
          setIsCanvaStudioOpen(false);
          setCanvaPreloadData(null);
        }}
        onSaveToLibrary={() => {
          loadDesignCreations();
          setSaveSuccess('Graphic saved to brand Media Library!');
          setTimeout(() => setSaveSuccess(null), 3500);
        }}
      />

      {/* 9:16 Video & Reel Motion Studio Modal */}
      <ReelMotionStudioModal
        isOpen={isReelStudioOpen}
        onClose={() => {
          setIsReelStudioOpen(false);
          loadDesignCreations();
        }}
        initialText={variants[activePlatform]}
        onUseInPost={(asset) => {
          handleSelectDesignForPost(asset);
          loadDesignCreations();
          setPreviewPlatform(activePlatform);
          setIsPreviewModalOpen(true);
        }}
        onSaveToLibrary={() => {
          loadDesignCreations();
          setSaveSuccess('Video Reel saved to brand Media Library!');
          setTimeout(() => setSaveSuccess(null), 3500);
        }}
      />

      {/* Saved Posts & Drafts Picker Modal (Compact) */}
      {isDraftsModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsDraftsModalOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '490px',
              padding: '16px 18px',
            }}
          >
            {/* Single-row Header + Filter Pills + Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <FolderOpen size={17} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Saved Posts ({activeBrand?.name || 'Brand'})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {([
                  { id: 'all', label: 'All' },
                  { id: 'draft', label: 'Drafts' },
                  { id: 'published', label: 'Published' },
                  { id: 'scheduled', label: 'Scheduled' },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-sm ${savedPostsFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSavedPostsFilter(tab.id)}
                    style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', width: '175px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search posts..."
                    value={savedPostsSearch}
                    onChange={(e) => setSavedPostsSearch(e.target.value)}
                    style={{ padding: '4px 8px 4px 26px', fontSize: '0.75rem', height: '28px' }}
                  />
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setIsDraftsModalOpen(false)}
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Compact Posts List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {isLoadingSavedPosts ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <RefreshCw size={18} className="spin" style={{ margin: '0 auto 6px' }} />
                  <div>Loading posts...</div>
                </div>
              ) : savedPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No saved posts yet.
                </div>
              ) : (
                savedPosts
                  .filter((p) => {
                    if (savedPostsFilter !== 'all' && (p.status || 'draft') !== savedPostsFilter) return false;
                    if (!savedPostsSearch.trim()) return true;
                    const q = savedPostsSearch.toLowerCase();
                    return (
                      (p.title && p.title.toLowerCase().includes(q)) ||
                      (p.base_content && p.base_content.toLowerCase().includes(q)) ||
                      (p.variants && p.variants.some((v: any) => v.content && v.content.toLowerCase().includes(q)))
                    );
                  })
                  .map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '9px 12px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title || 'Untitled Post'}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: p.status === 'published' ? 'rgba(16, 185, 129, 0.2)' : p.status === 'scheduled' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                              color: p.status === 'published' ? '#10b981' : p.status === 'scheduled' ? '#3b82f6' : '#eab308',
                              textTransform: 'uppercase',
                              fontWeight: 700,
                            }}
                          >
                            {p.status || 'draft'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                          {p.base_content || p.variants?.[0]?.content || 'No content'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleLoadPostIntoComposer(p)}
                          style={{ padding: '4px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                        >
                          <Edit3 size={11} />
                          <span>Load</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => handleDuplicateSavedPost(e, p)}
                          style={{ padding: '4px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                          title="Duplicate post as new draft"
                        >
                          <Copy size={11} />
                          <span>Duplicate</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => handleDeleteSavedPost(e, p)}
                          style={{ padding: '4px 6px', color: 'var(--accent-rose)' }}
                          title="Delete post"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Compact Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                onClick={handleResetToBlankPost}
              >
                + Blank Post
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '4px 12px' }}
                onClick={() => setIsDraftsModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Live Publishing Pre-Publish Confirmation Modal (Compact, Zero Scroll) */}
      {isLivePublishConfirmModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsLivePublishConfirmModalOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '18px 20px',
              border: '1px solid rgba(16, 185, 129, 0.45)',
              gap: '12px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Send size={15} color="#10b981" />
                <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Publish "{title || 'Post'}"
                </span>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsLivePublishConfirmModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Target Channels & Multi-Account Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LIVE_CHANNELS_CONFIG.map((chan) => {
                const isChecked = selectedLiveChannels.includes(chan.id);
                const matchingAccounts = socialAccounts.filter((a) => a.platform?.toLowerCase() === chan.id.toLowerCase());
                const isMulti = matchingAccounts.length > 1;

                if (isMulti) {
                  return (
                    <div
                      key={chan.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem' }}>{chan.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                            {chan.name}
                          </span>
                          <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {matchingAccounts.length} Accounts Connected
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px' }}>
                        {matchingAccounts.map((acc, aIdx) => {
                          const isAccActive = acc.isActive ?? acc.is_active ?? false;
                          const accName = acc.accountName || acc.account_name || `${chan.name} Account ${aIdx + 1}`;
                          return (
                            <label
                              key={acc.id || aIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleLiveChannel(chan.id)}
                                  style={{ width: '13px', height: '13px', accentColor: '#10b981', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                                  {accName}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.62rem', color: isAccActive ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                {isAccActive ? 'LIVE' : 'RE-AUTH'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Single account view
                const acc = matchingAccounts[0];
                const isActive = acc ? (acc.isActive ?? acc.is_active ?? false) : false;
                const isSandbox = acc ? acc.metadata?.isSandbox === true : true;

                const displayName = acc ? (acc.accountName || acc.account_name || chan.name) : chan.name;
                const badgeText = !acc
                  ? 'SANDBOX'
                  : !isActive
                    ? 'RE-AUTH'
                    : isSandbox
                      ? 'SANDBOX'
                      : 'LIVE';

                const badgeColor = !acc || isSandbox
                  ? '#0ea5e9'
                  : !isActive
                    ? '#f59e0b'
                    : '#10b981';

                return (
                  <label
                    key={chan.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-elevated)',
                      border: isChecked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleLiveChannel(chan.id)}
                        style={{ width: '14px', height: '14px', accentColor: '#10b981', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.95rem' }}>{chan.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: isChecked ? badgeColor : 'var(--text-muted)',
                      }}
                    >
                      {isChecked ? badgeText : 'OFF'}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsLivePublishConfirmModalOpen(false)}
                disabled={isPublishingLive}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handlePublishLiveNow(selectedLiveChannels)}
                disabled={isPublishingLive || selectedLiveChannels.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  fontWeight: 700,
                }}
              >
                <Send size={13} />
                <span>{isPublishingLive ? 'Publishing...' : `Publish (${selectedLiveChannels.length})`}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Published Post Live Confirmation & Status Modal (Compact, Zero Scroll) */}
      {isPublishSuccessModalOpen && publishSuccessDetails && (() => {
        const variantsList = publishSuccessDetails.variants || [];
        const failedVariants = variantsList.filter((v: any) => v.status === 'failed');
        const publishedVariants = variantsList.filter((v: any) => v.status === 'published');
        const hasFailures = !!publishSuccessDetails.error || failedVariants.length > 0;
        const allFailed = variantsList.length > 0 && failedVariants.length === variantsList.length;

        const isVariantSimulated = (v: any) => {
          if (!v) return false;
          if (v.simulated === true || v.isSandbox === true) return true;
          let cfg: any = {};
          if (typeof v.platform_specific_config === 'string') {
            try { cfg = JSON.parse(v.platform_specific_config); } catch { }
          } else if (typeof v.platform_specific_config === 'object') {
            cfg = v.platform_specific_config || {};
          }
          if (cfg.simulated === true || cfg.isSandbox === true) return true;
          if (v.remote_post_url?.includes('mock.hoaspforge') || v.remote_post_url?.includes('mock.socialforge') || v.remote_post_url?.includes('sandbox')) return true;
          if (v.remote_post_id?.startsWith('sb_')) return true;
          if (v.remote_post_id && /^[a-f0-9]{8}-[a-f0-9]{3}$/i.test(String(v.remote_post_id))) return true;
          return false;
        };

        const hasSimulatedVariant = variantsList.some(isVariantSimulated);
        const allSimulated = publishedVariants.length > 0 && publishedVariants.every(isVariantSimulated);
        const isTrulyLiveSuccess = !hasFailures && publishedVariants.length > 0 && publishedVariants.every((v: any) => !isVariantSimulated(v));

        const cardBorderColor = allFailed
          ? 'rgba(239, 68, 68, 0.45)'
          : hasFailures
            ? 'rgba(245, 158, 11, 0.45)'
            : 'rgba(16, 185, 129, 0.4)';

        return createPortal(
          <div
            className="modal-backdrop"
            onClick={() => setIsPublishSuccessModalOpen(false)}
          >
            <div
              className="modal-dialog"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '18px 20px',
                border: `1px solid ${cardBorderColor}`,
                gap: '12px',
              }}
            >
              {/* Compact Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  {isTrulyLiveSuccess ? (
                    <CheckCircle2 size={18} color="#10b981" />
                  ) : allFailed ? (
                    <AlertTriangle size={18} color="#ef4444" />
                  ) : (
                    <Zap size={18} color="#0ea5e9" />
                  )}
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isTrulyLiveSuccess
                      ? `Published Live: "${publishSuccessDetails.title}"`
                      : allSimulated && !hasFailures
                        ? `Simulated: "${publishSuccessDetails.title}"`
                        : allFailed
                          ? `Publish Failed: "${publishSuccessDetails.title}"`
                          : `Dispatched: "${publishSuccessDetails.title}"`}
                  </span>
                </div>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setIsPublishSuccessModalOpen(false)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Error Notice Banner if any */}
              {publishSuccessDetails.error && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    color: 'var(--accent-rose)',
                    lineHeight: 1.4,
                  }}
                >
                  {publishSuccessDetails.safeMessage || publishSuccessDetails.error}
                </div>
              )}

              {/* Compact Channels List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {variantsList.map((v: any) => {
                  const platKey = v.platform === 'twitter' ? 'x_twitter' : v.platform;
                  const platNames: Record<string, string> = {
                    facebook: 'Facebook',
                    instagram: 'Instagram',
                    x_twitter: 'X (Twitter)',
                    linkedin: 'LinkedIn',
                    tiktok: 'TikTok',
                  };
                  const platIcons: Record<string, string> = {
                    facebook: '📘',
                    instagram: '📸',
                    x_twitter: '🐦',
                    linkedin: '💼',
                    tiktok: '🎵',
                  };

                  const isFailed = v.status === 'failed';
                  const isPublished = v.status === 'published';
                  const isSimulated = isVariantSimulated(v);

                  return (
                    <div
                      key={v.id || v.platform}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '0.95rem' }}>{platIcons[platKey] || '🌐'}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {platNames[platKey] || platKey}
                        </span>
                        {isPublished && (
                          <span style={{
                            fontSize: '0.62rem',
                            padding: '1px 6px',
                            background: isSimulated ? 'rgba(6, 182, 212, 0.16)' : 'rgba(16, 185, 129, 0.16)',
                            color: isSimulated ? '#0ea5e9' : '#10b981',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}>
                            {isSimulated ? 'SANDBOX' : 'LIVE ✓'}
                          </span>
                        )}
                        {isFailed && (
                          <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: 'rgba(239, 68, 68, 0.16)', color: 'var(--accent-rose)', borderRadius: '4px', fontWeight: 700 }}>
                            FAILED
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        {v.remote_post_url && !isSimulated && (
                          <a
                            href={v.remote_post_url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <ExternalLink size={11} />
                            <span>Open</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setIsPublishSuccessModalOpen(false);
                            setActivePlatform(platKey);
                            setPreviewPlatform(platKey);
                            setIsPreviewModalOpen(true);
                          }}
                          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={11} />
                          <span>Preview</span>
                        </button>

                        {v.remote_post_url && !isSimulated && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(v.remote_post_url);
                              showToast('Copied URL: ' + v.remote_post_url, 'info');
                            }}
                            style={{ padding: '3px 5px', color: 'var(--text-muted)' }}
                            title="Copy Live URL"
                          >
                            <Copy size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Concise 1-line Sandbox / Re-auth Notice */}
              {(hasSimulatedVariant || hasFailures) && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '0.72rem',
                    color: 'var(--accent-amber)',
                  }}
                >
                  <span>Sandbox channels simulate posts locally. Connect live tokens in Channels.</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setIsPublishSuccessModalOpen(false);
                      onNavigate?.('channels');
                    }}
                    style={{ padding: '2px 8px', fontSize: '0.68rem', whiteSpace: 'nowrap', color: 'var(--accent-amber)' }}
                  >
                    Channels
                  </button>
                </div>
              )}

              {/* Compact Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleDeletePublishedPost}
                  disabled={isDeletingPublishedPost}
                  style={{
                    color: 'var(--accent-rose)',
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                  }}
                >
                  <Trash2 size={13} />
                  <span>{isDeletingPublishedPost ? 'Deleting...' : 'Delete'}</span>
                </button>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {hasFailures && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setIsPublishSuccessModalOpen(false);
                        handlePublishLiveNow(publishSuccessDetails.selectedChannels || selectedLiveChannels);
                      }}
                      disabled={isPublishingLive}
                      style={{ padding: '5px 10px', fontSize: '0.74rem', color: 'var(--accent-amber)' }}
                    >
                      <RefreshCw size={12} />
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDonePublishSuccess}
                    style={{ padding: '5px 16px', fontSize: '0.76rem', fontWeight: 700 }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* AI Design Studio Creations & Media Gallery Modal (Clean, Compact, Zero Page Scroll) */}
      {isMediaModalOpen && createPortal(
        <div
          className="modal-backdrop"
          onClick={() => setIsMediaModalOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '780px',
              maxHeight: '520px',
              padding: '16px 18px',
            }}
          >
            {/* Compact Single-Row Header: Brand Title + Category Pills + Folder Filter + Search + Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <ImageIcon size={17} color="var(--accent-primary)" />
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {activeBrand?.name || 'Brand'} Gallery
                </span>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'favorites', label: '★ Starred' },
                  { id: 'canva_studio', label: 'AI Studio' },
                  { id: 'ai_poster', label: 'Posters' },
                  { id: 'image', label: 'Uploads' },
                  { id: 'video', label: 'Videos' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-sm ${mediaModalCategory === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMediaModalCategory(tab.id as any)}
                    style={{ fontSize: '0.68rem', padding: '3px 7px' }}
                  >
                    {tab.label}
                  </button>
                ))}

                <select
                  className="form-select"
                  value={mediaModalFolder}
                  onChange={(e) => setMediaModalFolder(e.target.value)}
                  style={{ padding: '2px 6px', fontSize: '0.7rem', height: '26px', width: 'auto' }}
                  title="Filter by brand folder"
                >
                  <option value="all">📁 All Folders</option>
                  {brandFolders.map((bf) => (
                    <option key={bf} value={bf}>
                      📁 {bf}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ position: 'relative', width: '145px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search..."
                    value={mediaModalSearch}
                    onChange={(e) => setMediaModalSearch(e.target.value)}
                    style={{ padding: '4px 8px 4px 24px', fontSize: '0.74rem', height: '28px' }}
                  />
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setIsMediaModalOpen(false)}
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Compact 4-Column Grid of Designs */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
              {isLoadingDesigns ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                  <div>Loading {activeBrand?.name} media...</div>
                </div>
              ) : designCreations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem' }}>No saved media assets for {activeBrand?.name} yet.</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setIsMediaModalOpen(false);
                      setIsCanvaStudioOpen(true);
                    }}
                    style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                  >
                    <PenTool size={12} />
                    <span>Open AI Studio</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {designCreations
                    .filter((item) => {
                      if (mediaModalCategory === 'favorites') return Boolean(item.favorite || item.metadata?.favorite);
                      if (mediaModalCategory === 'canva_studio') return item.metadata?.source === 'canva_studio';
                      if (mediaModalCategory === 'ai_poster') return item.metadata?.source === 'ai_poster' || item.metadata?.generator;
                      if (mediaModalCategory === 'image') return item.mediaType === 'image' && item.metadata?.source !== 'canva_studio' && !item.metadata?.generator;
                      if (mediaModalCategory === 'video') return item.mediaType === 'video';
                      return true;
                    })
                    .filter((item) => {
                      if (mediaModalFolder === 'all') return true;
                      const f = item.folder || item.metadata?.folder || 'General';
                      return f.toLowerCase() === mediaModalFolder.toLowerCase();
                    })
                    .filter((item) => {
                      if (!mediaModalSearch.trim()) return true;
                      const q = mediaModalSearch.toLowerCase();
                      const title = (item.title || item.metadata?.title || item.fileName || '').toLowerCase();
                      const folder = (item.folder || item.metadata?.folder || '').toLowerCase();
                      const tags = Array.isArray(item.tags || item.metadata?.tags) ? (item.tags || item.metadata?.tags).join(' ').toLowerCase() : '';
                      return `${title} ${folder} ${tags}`.includes(q);
                    })
                    .map((item) => {
                      const isSelected =
                        (currentAsset?.id && currentAsset.id === item.id) ||
                        (currentAsset?.publicUrl && currentAsset.publicUrl === item.publicUrl);
                      const titleText = item.title || item.metadata?.title || item.fileName || 'Graphic';
                      const itemFolder = item.folder || item.metadata?.folder || 'General';
                      const isFav = Boolean(item.favorite || item.metadata?.favorite);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectDesignForPost(item)}
                          style={{
                            background: isSelected ? 'rgba(139, 92, 246, 0.14)' : 'var(--bg-surface-elevated)',
                            border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ height: '94px', background: 'var(--bg-canvas, #090d16)', position: 'relative', overflow: 'hidden' }}>
                            <img
                              src={item.thumbnailUrl || item.publicUrl}
                              alt={titleText}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                padding: '1px 5px',
                                background: 'rgba(15, 23, 42, 0.85)',
                                borderRadius: '3px',
                                fontSize: '0.58rem',
                                fontWeight: 600,
                                color: '#e2e8f0',
                              }}
                            >
                              📁 {itemFolder}
                            </span>
                            {isSelected ? (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  padding: '1px 5px',
                                  background: '#10b981',
                                  borderRadius: '3px',
                                  fontSize: '0.58rem',
                                  fontWeight: 800,
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Check size={9} strokeWidth={3} />
                                <span>ACTIVE</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleToggleDesignFavorite(e, item)}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  width: '20px',
                                  height: '20px',
                                  padding: 0,
                                  borderRadius: '50%',
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: isFav ? '#fbbf24' : '#94a3b8',
                                }}
                                title="Star image"
                              >
                                <Star size={10} fill={isFav ? '#fbbf24' : 'none'} />
                              </button>
                            )}
                          </div>

                          <div style={{ padding: '7px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {titleText}
                            </div>

                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <button
                                type="button"
                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDesignForPost(item);
                                }}
                                style={{ flex: 1, padding: '3px 0', fontSize: '0.68rem', fontWeight: 700 }}
                              >
                                {isSelected ? 'Selected' : 'Use'}
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMediaModalOpen(false);
                                  handleEditDesignInCanva(e, item);
                                }}
                                style={{ padding: '3px 5px', color: '#f472b6' }}
                                title="Edit in Studio"
                              >
                                <PenTool size={11} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={(e) => handleDeleteDesign(e, item.id)}
                                style={{ padding: '3px 5px', color: 'var(--accent-rose)' }}
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Compact Single-Row Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsMediaModalOpen(false);
                    setCanvaPreloadData(null);
                    setIsCanvaStudioOpen(true);
                  }}
                  style={{ fontSize: '0.73rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <PenTool size={11} color="#f472b6" />
                  <span>+ AI Studio</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsMediaModalOpen(false);
                    handleOpenAiPosterModal();
                  }}
                  style={{ fontSize: '0.73rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Sparkles size={11} color="var(--accent-primary)" />
                  <span>AI Poster</span>
                </button>

                <label
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.73rem', padding: '4px 9px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={11} />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      handleFileUpload(e);
                      setIsMediaModalOpen(false);
                    }}
                  />
                </label>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '4px 12px' }}
                onClick={() => setIsMediaModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Compact Studio Confirmation Modal */}
      {studioConfirmModal && createPortal(
        <div
          className="modal-backdrop"
          style={{ zIndex: 10005 }}
          onClick={() => setStudioConfirmModal(null)}
        >
          <div
            className="modal-dialog"
            style={{
              width: '100%',
              maxWidth: '380px',
              padding: '18px 20px',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              gap: '12px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={18} color="var(--accent-rose)" />
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{studioConfirmModal.title}</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {studioConfirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
              <button
                type="button"
                onClick={() => setStudioConfirmModal(null)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.76rem', padding: '5px 12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = studioConfirmModal.onConfirm;
                  setStudioConfirmModal(null);
                  cb();
                }}
                className={`btn btn-sm ${studioConfirmModal.isDestructive ? 'btn-danger' : 'btn-primary'}`}
                style={{ fontSize: '0.76rem', padding: '5px 12px' }}
              >
                {studioConfirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
