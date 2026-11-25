import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Download,
  Save,
  Check,
  RefreshCw,
  Film,
  Music,
  Sliders,
  Upload,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  AlertCircle,
  Eye,
  Mic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import type { MotionCaptionStyle, ReelScene, TemplateCategory } from '@socialforge/shared';
import { SimpleVideoStudio } from './SimpleVideoStudio.js';

interface ReelMotionStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  campaignId?: string;
  campaignName?: string;
  postId?: string;
  onSaveToLibrary?: (asset: any) => void;
  onUseInPost?: (asset: any) => void;
  onCreatePost?: () => void;
  isEmbedded?: boolean;
}

const BROLL_PRESETS = [
  {
    id: 'ocean_waves',
    name: 'Ambient Shore Waves',
    category: 'Nature / Calm',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-waves-coming-to-the-beach-41132-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'botanical_breeze',
    name: 'Botanical Sunlight Breeze',
    category: 'Luxury / Clean',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'ink_swirl',
    name: 'Liquid Ink Swirl',
    category: 'Abstract / Flow',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-ink-swirling-in-water-43384-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'neon_city',
    name: 'Cyberpunk Seashore Aerial',
    category: 'Tech / Energy',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-top-aerial-shot-of-seashore-with-rocks-1090-large.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
  },
];

const AUDIO_TRACKS = [
  { id: 'lofi_groove', name: 'Lofi Chill Morning', genre: 'Lofi / Calm', bpm: '82 BPM' },
  { id: 'synth_drive', name: 'Cyberpunk Synth Drive', genre: 'Electronic / Tech', bpm: '124 BPM' },
  { id: 'acoustic_bloom', name: 'Acoustic Botanical Bloom', genre: 'Acoustic / Warm', bpm: '95 BPM' },
  { id: 'future_bass', name: 'Dynamic Future Bass', genre: 'Punchy / Viral', bpm: '130 BPM' },
];

// Directive 11 Canonical Video Storyboard Templates
const DIRECTIVE_11_TEMPLATES: Array<{
  id: string;
  category: TemplateCategory;
  name: string;
  badge: string;
  description: string;
  motionStyle: MotionCaptionStyle;
  brollId: string;
  audioTrackId: string;
  scenes: ReelScene[];
}> = [
  {
    id: 'tpl-v-promo',
    category: 'promotion',
    name: 'VIP Perks & Exclusive Offer',
    badge: 'PROMOTION',
    description: '4-beat high-converting promo with VIP badge, perks breakdown, and code CTA.',
    motionStyle: 'kinetic_pop',
    brollId: 'botanical_breeze',
    audioTrackId: 'future_bass',
    scenes: [
      { id: 'sc-p1', order: 1, durationSec: 2.0, badge: '✦ VIP EXCLUSIVE', headline: 'Unlock Member Privileges', subtext: 'Early access is officially open for 48 hours.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-p2', order: 2, durationSec: 2.5, badge: '💎 TIER 1 PERKS', headline: 'Priority Dispatch & Concierge', subtext: 'Engineered for seamless elevated performance.', animation: 'scale', transition: 'fade' },
      { id: 'sc-p3', order: 3, durationSec: 2.0, badge: '⚡ 30% OFF NOW', headline: 'Apply Promo Code VIP30', subtext: 'Limited allocation remaining.', animation: 'kinetic_pop', transition: 'zoom' },
      { id: 'sc-p4', order: 4, durationSec: 2.0, badge: '👉 CLAIM ACCESS', headline: 'Tap Link in Bio Today', subtext: 'Offer expires midnight Sunday.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-edu',
    category: 'educational',
    name: 'Step-by-Step Framework Masterclass',
    badge: 'EDUCATIONAL',
    description: 'Structured vertical masterclass breaking down complex ideas into 4 actionable steps.',
    motionStyle: 'typewriter',
    brollId: 'ink_swirl',
    audioTrackId: 'lofi_groove',
    scenes: [
      { id: 'sc-e1', order: 1, durationSec: 2.0, badge: '📚 MASTERCLASS', headline: 'The 3-Step Growth Framework', subtext: 'How top teams execute campaigns without burnout.', animation: 'typewriter', transition: 'cut' },
      { id: 'sc-e2', order: 2, durationSec: 2.5, badge: '01 / BLUEPRINT', headline: 'Centralize Brand Voice & Assets', subtext: 'Turn 1 core business idea into multi-platform arcs.', animation: 'slide', transition: 'fade' },
      { id: 'sc-e3', order: 3, durationSec: 2.5, badge: '02 / MOMENTUM', headline: 'Batch Schedule & Automate', subtext: 'Consistent publishing with zero guesswork.', animation: 'kinetic_pop', transition: 'wipe' },
      { id: 'sc-e4', order: 4, durationSec: 2.0, badge: '03 / PLAYBOOK', headline: 'Download The Free Protocol', subtext: 'Full PDF playbook linked in bio.', animation: 'scale', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-product',
    category: 'product',
    name: 'Flagship Product Showcase',
    badge: 'PRODUCT',
    description: 'Dynamic product reel highlighting core formulation, clinical metrics, and order CTA.',
    motionStyle: 'kinetic_pop',
    brollId: 'botanical_breeze',
    audioTrackId: 'acoustic_bloom',
    scenes: [
      { id: 'sc-pr1', order: 1, durationSec: 2.0, badge: '✨ FLAGSHIP REVEAL', headline: 'Engineered For Noticeable Radiance', subtext: 'The newly formulated clinical drop is here.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-pr2', order: 2, durationSec: 2.0, badge: '🔬 100% CLINICAL', headline: '15% Active L-Ascorbic Acid', subtext: 'Dermatologist tested with zero fillers.', animation: 'scale', transition: 'fade' },
      { id: 'sc-pr3', order: 3, durationSec: 2.0, badge: '📈 +340% GLOW', headline: 'Noticeable Results In 14 Days', subtext: 'Backed by independent clinical trials.', animation: 'cinematic_fade', transition: 'zoom' },
      { id: 'sc-pr4', order: 4, durationSec: 2.0, badge: '🛍️ ORDER NOW', headline: 'Secure Your Bottle Today', subtext: 'Complimentary shipping on orders over $50.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-announcement',
    category: 'announcement',
    name: 'Breaking News & Feature Release',
    badge: 'ANNOUNCEMENT',
    description: 'High-contrast electric announcement reel with tag badge and launch date.',
    motionStyle: 'kinetic_pop',
    brollId: 'neon_city',
    audioTrackId: 'synth_drive',
    scenes: [
      { id: 'sc-a1', order: 1, durationSec: 2.0, badge: '🚀 MAJOR UPDATE', headline: 'Something Big Just Dropped', subtext: 'The feature you requested is officially live.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-a2', order: 2, durationSec: 2.5, badge: '⚡ VERSION 2.0', headline: 'AI Campaign Arc Studio', subtext: '1-click strategy and multi-post synthesis.', animation: 'typewriter', transition: 'fade' },
      { id: 'sc-a3', order: 3, durationSec: 1.5, badge: '✦ AVAILABLE NOW', headline: 'Live Across All Workspaces', subtext: 'No waitlist required.', animation: 'scale', transition: 'zoom' },
      { id: 'sc-a4', order: 4, durationSec: 2.0, badge: '👉 TRY IT TODAY', headline: 'Experience HoaspForge V2', subtext: 'Tap link in bio to start.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-testimonial',
    category: 'testimonial',
    name: 'Customer Proof & 5-Star Review',
    badge: 'TESTIMONIAL',
    description: 'Social validation reel with glowing quote, star rating, and customer authority.',
    motionStyle: 'cinematic_fade',
    brollId: 'ocean_waves',
    audioTrackId: 'lofi_groove',
    scenes: [
      { id: 'sc-t1', order: 1, durationSec: 2.0, badge: '★★★★★ 5.0 RATING', headline: 'Real Results From Real Creators', subtext: 'See why teams switch to HoaspForge.', animation: 'cinematic_fade', transition: 'cut' },
      { id: 'sc-t2', order: 2, durationSec: 2.5, badge: '💬 VERIFIED REVIEW', headline: '“Cut Our Production Time By 80%”', subtext: '— Elena Rostova, VP of Growth', animation: 'typewriter', transition: 'fade' },
      { id: 'sc-t3', order: 3, durationSec: 2.0, badge: '📈 10X OUTPUT', headline: 'From 2 Posts To 20 Posts Weekly', subtext: 'With zero compromise on quality.', animation: 'scale', transition: 'zoom' },
      { id: 'sc-t4', order: 4, durationSec: 2.0, badge: '⚡ JOIN TODAY', headline: 'Start Your 14-Day Free Trial', subtext: 'Instant access linked in bio.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-quote',
    category: 'quote',
    name: 'Modern Editorial Thought Leadership',
    badge: 'QUOTE',
    description: 'Serene ambient video with flowing typographic motion for thought leadership.',
    motionStyle: 'cinematic_fade',
    brollId: 'ink_swirl',
    audioTrackId: 'lofi_groove',
    scenes: [
      { id: 'sc-q1', order: 1, durationSec: 2.5, badge: '💡 THOUGHT LEADERSHIP', headline: '“The Best Marketing Doesn’t Feel Like Marketing.”', subtext: '— Tom Fishburne', animation: 'cinematic_fade', transition: 'cut' },
      { id: 'sc-q2', order: 2, durationSec: 2.5, badge: '✦ PERSPECTIVE', headline: 'Focus on Value, Authenticity & Clarity', subtext: 'Audience loyalty follows genuine connection.', animation: 'typewriter', transition: 'fade' },
      { id: 'sc-q3', order: 3, durationSec: 3.0, badge: '👉 JOIN THE CONVERSATION', headline: 'What’s Your Take? Comment Below', subtext: 'Save and share with your team.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-event',
    category: 'event',
    name: 'Live Masterclass & Webinar RSVP',
    badge: 'EVENT',
    description: 'Event invitation with speaker badges, calendar date, and RSVP call to action.',
    motionStyle: 'kinetic_pop',
    brollId: 'neon_city',
    audioTrackId: 'synth_drive',
    scenes: [
      { id: 'sc-ev1', order: 1, durationSec: 2.0, badge: '🔴 LIVE WEBINAR', headline: 'Mastering AI Social Media Workflows', subtext: 'Join industry leaders this Thursday.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-ev2', order: 2, durationSec: 2.5, badge: '📅 THURSDAY 2PM EST', headline: 'Exclusive Live Demonstration', subtext: 'Real-time teardowns and live Q&A.', animation: 'slide', transition: 'fade' },
      { id: 'sc-ev3', order: 3, durationSec: 2.0, badge: '🎟️ FREE PASS', headline: 'Limited To 500 Attendees', subtext: 'Claim your seat before it fills up.', animation: 'scale', transition: 'zoom' },
      { id: 'sc-ev4', order: 4, durationSec: 2.0, badge: '👉 RSVP NOW', headline: 'Tap Link In Bio To Register', subtext: 'Instant calendar invite included.', animation: 'slide', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-carousel',
    category: 'carousel',
    name: 'Swipe Hook & Narrative Arc',
    badge: 'CAROUSEL',
    description: 'Fast-paced viral hook building curiosity and momentum.',
    motionStyle: 'kinetic_pop',
    brollId: 'botanical_breeze',
    audioTrackId: 'future_bass',
    scenes: [
      { id: 'sc-c1', order: 1, durationSec: 2.0, badge: '👉 DON’T MISS THIS', headline: '5 Signs Your Strategy Needs An Update', subtext: 'Swipe through to diagnose bottlenecks.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-c2', order: 2, durationSec: 2.0, badge: 'NUMBER 1', headline: 'Spending 3+ Hours Per Post', subtext: 'Manual creation doesn’t scale.', animation: 'scale', transition: 'fade' },
      { id: 'sc-c3', order: 3, durationSec: 2.0, badge: 'NUMBER 2', headline: 'Inconsistent Brand Voice', subtext: 'Confusing your audience across channels.', animation: 'slide', transition: 'zoom' },
      { id: 'sc-c4', order: 4, durationSec: 2.0, badge: '💡 THE SOLUTION', headline: 'Automate With Brand Governance', subtext: 'Tap link in bio to read full breakdown.', animation: 'kinetic_pop', transition: 'slide' },
    ],
  },
  {
    id: 'tpl-v-sale',
    category: 'sale',
    name: 'Flash Sale & Limited Drop',
    badge: 'SALE',
    description: 'Urgency-driven promotional sequence with promo code and countdown styling.',
    motionStyle: 'kinetic_pop',
    brollId: 'neon_city',
    audioTrackId: 'future_bass',
    scenes: [
      { id: 'sc-s1', order: 1, durationSec: 2.0, badge: '🔥 FLASH SALE', headline: 'Our Biggest Drop Of The Season', subtext: 'Prices slashed for 48 hours only.', animation: 'kinetic_pop', transition: 'cut' },
      { id: 'sc-s2', order: 2, durationSec: 2.0, badge: '⚡ 40% OFF', headline: 'Site-Wide Savings Active Now', subtext: 'No minimum order required.', animation: 'scale', transition: 'fade' },
      { id: 'sc-s3', order: 3, durationSec: 2.0, badge: '🏷️ CODE: FLASH40', headline: 'Enter Code At Checkout', subtext: 'While inventory lasts.', animation: 'typewriter', transition: 'zoom' },
      { id: 'sc-s4', order: 4, durationSec: 2.0, badge: '🛒 SHOP DROP', headline: 'Tap Link In Bio Before It Sells Out', subtext: 'Sale ends midnight Sunday.', animation: 'slide', transition: 'slide' },
    ],
  },
];

export const ReelMotionStudioModal: React.FC<ReelMotionStudioModalProps> = ({
  isOpen,
  onClose,
  initialText,
  campaignId,
  campaignName,
  postId,
  onSaveToLibrary,
  onUseInPost,
  onCreatePost,
  isEmbedded = false,
}) => {
  const { activeBrand } = useAuth();

  // Video playback refs & states
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceoverInputRef = useRef<HTMLInputElement>(null);

  // Simplified Video Studio vs Advanced Storyboard Mode
  const [studioMode, setStudioMode] = useState<'simple' | 'advanced'>('simple');

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);

  // Phase 2 & 3: Prompt-to-Video Workflow Configuration
  const [selectedDuration, setSelectedDuration] = useState<15 | 30 | 60 | 'custom'>(30);
  const [customDurationVal, setCustomDurationVal] = useState<number>(30);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [visualStyle, setVisualStyle] = useState<'cinematic' | 'vibrant' | 'cyberpunk' | 'minimalist' | 'corporate'>('corporate');
  const [language, setLanguage] = useState<string>('en');
  const [voiceoverPersona, setVoiceoverPersona] = useState<'david' | 'hazel' | 'zira' | 'none'>('david');
  const [qualityPreset, setQualityPreset] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [regeneratingSceneIdx, setRegeneratingSceneIdx] = useState<number | null>(null);

  // Studio tabs & configuration
  const [activeTab, setActiveTab] = useState<'storyboard' | 'templates' | 'captions' | 'broll' | 'audio' | 'ffmpeg'>('storyboard');
  const [motionStyle, setMotionStyle] = useState<MotionCaptionStyle>('kinetic_pop');
  const [selectedBroll, setSelectedBroll] = useState(BROLL_PRESETS[0]);
  const [customBrollUrl, setCustomBrollUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);

  // Audio Controls
  const [selectedAudio, setSelectedAudio] = useState(AUDIO_TRACKS[0]);
  const [musicVolume, setMusicVolume] = useState(0.35);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [voiceoverVolume, setVoiceoverVolume] = useState(0.9);
  const [enableDucking, setEnableDucking] = useState(true);

  // Phase 8: FFmpeg Pipeline Configuration
  const [burnSubtitles, setBurnSubtitles] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [includeOutro, setIncludeOutro] = useState(true);
  const [outroHeadline, setOutroHeadline] = useState(activeBrand?.name || 'HoaspForge');
  const [outroSubtext, setOutroSubtext] = useState('Tap link in bio to explore more.');

  // Async Job & Export States
  const [renderedAsset, setRenderedAsset] = useState<any | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStage, setRenderStage] = useState('Initializing FFmpeg Engine...');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  // AI Storyboard scenes state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copyInput, setCopyInput] = useState(initialText || '');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 4000);
  };

  // Primary 30-Second Workflow Scenes (5 Beats totaling 30.0s)
  const [scenes, setScenes] = useState<ReelScene[]>([
    {
      id: 'scene-1',
      order: 1,
      durationSec: 5.0,
      badge: '✦ SCROLL STOPPER',
      headline: 'Experience High-Velocity Content',
      subtext: 'Stop wasting hours manually formatting video clips.',
      narrationScript: 'Stop scrolling. Experience high-velocity content that elevates your brand.',
      accentIcon: 'Sparkles',
      animation: 'kinetic_pop',
      transition: 'cut',
    },
    {
      id: 'scene-2',
      order: 2,
      durationSec: 6.0,
      badge: '⚠️ THE PROBLEM',
      headline: 'Creating Quality Video Takes Too Long',
      subtext: 'Manual editing and subtitle syncing drain creative momentum.',
      narrationScript: 'Creating quality video takes too long when done manually scene by scene.',
      accentIcon: 'AlertCircle',
      animation: 'typewriter',
      transition: 'fade',
    },
    {
      id: 'scene-3',
      order: 3,
      durationSec: 7.0,
      badge: '💡 THE SOLUTION',
      headline: 'Centralize Brand Voice & Assets',
      subtext: 'Turn 1 business idea into complete multi-platform campaigns.',
      narrationScript: 'Centralize your brand voice and visual assets to generate complete campaigns in seconds.',
      accentIcon: 'Layers',
      animation: 'scale',
      transition: 'zoom',
    },
    {
      id: 'scene-4',
      order: 4,
      durationSec: 6.0,
      badge: '📈 +340% ENGAGEMENT',
      headline: 'Clinically Engineered Clean Efficacy',
      subtext: 'Proven results backed by continuous verified performance.',
      narrationScript: 'Proven to deliver 340% higher engagement with automated kinetic motion graphics.',
      accentIcon: 'TrendingUp',
      animation: 'cinematic_fade',
      transition: 'wipe',
    },
    {
      id: 'scene-5',
      order: 5,
      durationSec: 6.0,
      badge: '⚡ CLAIM YOUR DROP',
      headline: 'Use Code GLOW20 For 20% Off',
      subtext: 'Tap link in bio to secure yours before launch batch sells out.',
      narrationScript: 'Use code GLOW20 for 20% off. Tap link in bio to secure yours today.',
      accentIcon: 'ArrowRight',
      animation: 'slide',
      transition: 'slide',
    },
  ]);

  // Compute total duration
  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSec || 2.0), 0);

  // 11. Reliability: Draft Autosave & Recovery
  useEffect(() => {
    if (!activeBrand) return;
    const draftKey = `hoaspforge_reel_draft_${activeBrand.id}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && !initialText) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          setScenes(parsed.scenes);
          if (parsed.motionStyle) setMotionStyle(parsed.motionStyle);
          if (parsed.copyInput) setCopyInput(parsed.copyInput);
        }
      }
    } catch {}
  }, [activeBrand]);

  useEffect(() => {
    if (!activeBrand) return;
    const draftKey = `hoaspforge_reel_draft_${activeBrand.id}`;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ scenes, motionStyle, copyInput }));
    } catch {}
  }, [scenes, motionStyle, copyInput, activeBrand]);

  // Sync copy input if initialText changes
  useEffect(() => {
    if (initialText) {
      setCopyInput(initialText);
    }
  }, [initialText]);

  // Lock background page scroll when Reel Studio modal is open
  useEffect(() => {
    if (isOpen && !isEmbedded) {
      document.body.style.overflow = 'hidden';
    } else if (!isEmbedded) {
      document.body.style.overflow = '';
    }
    return () => {
      if (!isEmbedded) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, isEmbedded]);

  // Fetch recent render jobs on load
  const loadRecentJobs = async () => {
    if (!activeBrand) return;
    try {
      const jobs = await api.videos.listJobs(activeBrand.id);
      setRecentJobs(jobs || []);
    } catch {}
  };

  useEffect(() => {
    if (activeBrand && activeTab === 'ffmpeg') {
      loadRecentJobs();
    }
  }, [activeBrand, activeTab]);

  // Video time update handler
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      // Loop within totalDuration
      if (time >= totalDuration) {
        if (isLooping) {
          videoRef.current.currentTime = 0;
          setCurrentTime(0);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        setCurrentTime(time);
      }
    }
  };

  // Determine active scene based on currentTime
  let accumulatedTime = 0;
  let activeSceneIndex = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sceneDur = scenes[i].durationSec || 2.0;
    if (currentTime >= accumulatedTime && currentTime < accumulatedTime + sceneDur) {
      activeSceneIndex = i;
      break;
    }
    accumulatedTime += sceneDur;
  }
  const activeScene = scenes[activeSceneIndex] || scenes[0];

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Seek time
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Playback speed control
  const handleSetPlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Scene navigation controls
  const handleJumpToScene = (index: number) => {
    let targetTime = 0;
    for (let i = 0; i < index && i < scenes.length; i++) {
      targetTime += scenes[i].durationSec || 2.0;
    }
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  const handlePrevScene = () => {
    if (activeSceneIndex > 0) {
      handleJumpToScene(activeSceneIndex - 1);
    } else {
      handleJumpToScene(0);
    }
  };

  const handleNextScene = () => {
    if (activeSceneIndex < scenes.length - 1) {
      handleJumpToScene(activeSceneIndex + 1);
    }
  };

  // Handle local video upload
  const handleCustomVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setCustomBrollUrl(url);
      setSuccessToast('Custom video background loaded!');
      setTimeout(() => setSuccessToast(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  // Handle custom voiceover narration upload
  const handleVoiceoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setVoiceoverUrl(url);
      setSuccessToast('Narration voiceover track attached!');
      setTimeout(() => setSuccessToast(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  // 1. AI Storyboard generation with dynamic duration & aspect ratio scaling
  const handleGenerateAiStoryboard = async () => {
    if (!activeBrand) return;
    try {
      setIsGeneratingAi(true);
      const targetSec = selectedDuration === 'custom' ? customDurationVal : selectedDuration;
      const res = await api.videos.generateStoryboard(activeBrand.id, {
        text: copyInput.trim() || initialText || 'Transform your social presence with unmistakable AI-powered precision.',
        campaignId,
        targetDurationSec: targetSec,
        aspectRatio,
        visualStyle,
        language,
        voiceoverPersona,
      });

      if (res && res.scenes && res.scenes.length > 0) {
        setScenes(res.scenes);
        if (res.aspectRatio) setAspectRatio(res.aspectRatio as any);
        if (res.suggestedMotionStyle) {
          setMotionStyle(res.suggestedMotionStyle as MotionCaptionStyle);
        }
        if (res.suggestedAudioTrackId) {
          const matchedAudio = AUDIO_TRACKS.find((a) => a.id === res.suggestedAudioTrackId);
          if (matchedAudio) setSelectedAudio(matchedAudio);
        }
        setSuccessToast(`✨ AI Storyboard synthesized: ${res.scenes.length} Scenes (${res.totalDurationSec.toFixed(1)}s total)!`);
        setTimeout(() => setSuccessToast(null), 3500);

        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err: any) {
      console.error('Failed to generate storyboard:', err);
      showError('AI Storyboard error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Single Scene AI Regeneration
  const handleRegenerateSingleScene = async (index: number) => {
    if (!activeBrand) return;
    try {
      setRegeneratingSceneIdx(index);
      const targetScene = scenes[index];
      const res = await api.videos.regenerateScene(activeBrand.id, {
        sceneIndex: index,
        currentScene: targetScene,
        prompt: copyInput,
        topic: 'business',
        visualStyle,
      });
      if (res && res.scene) {
        setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...res.scene } : s)));
        setSuccessToast(`🪄 Scene #${index + 1} regenerated!`);
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (err: any) {
      showError('Failed to regenerate scene: ' + err.message);
    } finally {
      setRegeneratingSceneIdx(null);
    }
  };

  // Preview / Test Voiceover via TTS engine
  const handleTestVoiceover = async () => {
    if (!activeBrand) return;
    try {
      setIsTestingVoice(true);
      const sampleText = scenes[0]?.narrationScript || scenes[0]?.headline || 'Welcome to HoaspForge AI Video Reels Studio.';
      const res = await api.videos.synthesizeSpeech(activeBrand.id, {
        text: sampleText,
        voicePersona: voiceoverPersona,
        language,
      });
      if (res && res.publicUrl) {
        if (!audioPreviewRef.current) {
          audioPreviewRef.current = new Audio();
        }
        audioPreviewRef.current.src = res.publicUrl;
        audioPreviewRef.current.play();
        setSuccessToast(`🔊 Previewing ${voiceoverPersona.toUpperCase()} voice!`);
        setTimeout(() => setSuccessToast(null), 3500);
      }
    } catch (err: any) {
      showError('Voice test error: ' + err.message);
    } finally {
      setIsTestingVoice(false);
    }
  };

  // 2. Scene Editor Handlers
  const handleUpdateScene = (index: number, updates: Partial<ReelScene>) => {
    setScenes((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const handleAddScene = () => {
    const newOrder = scenes.length + 1;
    const newScene: ReelScene = {
      id: `scene-${Date.now()}`,
      order: newOrder,
      durationSec: 2.0,
      badge: '✦ SPOTLIGHT',
      headline: 'Add Your Core Message',
      subtext: 'Supporting context or explanation goes here.',
      accentIcon: 'Sparkles',
      animation: motionStyle,
      transition: 'fade',
    };
    setScenes([...scenes, newScene]);
    setSuccessToast(`Added Scene ${newOrder}!`);
    setTimeout(() => setSuccessToast(null), 2000);
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) {
      showError('A reel must have at least one scene.');
      return;
    }
    const updated = scenes.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setScenes(updated);
    setSuccessToast(`Deleted Scene ${index + 1}`);
    setTimeout(() => setSuccessToast(null), 2000);
  };

  const handleDuplicateScene = (index: number) => {
    const target = scenes[index];
    const clone: ReelScene = {
      ...target,
      id: `scene-${Date.now()}`,
      order: index + 2,
      headline: `${target.headline} (Copy)`,
    };
    const updated = [...scenes.slice(0, index + 1), clone, ...scenes.slice(index + 1)].map((s, i) => ({ ...s, order: i + 1 }));
    setScenes(updated);
    setSuccessToast(`Duplicated Scene ${index + 1}!`);
    setTimeout(() => setSuccessToast(null), 2000);
  };

  const handleMoveScene = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === scenes.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...scenes];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setScenes(copy.map((s, i) => ({ ...s, order: i + 1 })));
  };

  // 5. Apply Directive 11 Template
  const handleApplyTemplate = (tpl: (typeof DIRECTIVE_11_TEMPLATES)[0]) => {
    setScenes(tpl.scenes);
    setMotionStyle(tpl.motionStyle);
    const matchedBroll = BROLL_PRESETS.find((b) => b.id === tpl.brollId);
    if (matchedBroll) {
      setSelectedBroll(matchedBroll);
      setCustomBrollUrl(null);
    }
    const matchedAudio = AUDIO_TRACKS.find((a) => a.id === tpl.audioTrackId);
    if (matchedAudio) setSelectedAudio(matchedAudio);

    setSuccessToast(`Applied "${tpl.name}" template!`);
    setTimeout(() => setSuccessToast(null), 3000);
    setActiveTab('storyboard');
  };

  // 6. Save / Render reel via native FFmpeg pipeline with status tracking & retries
  const handleSaveReel = async (attachToPost: boolean = false) => {
    if (!activeBrand) return;
    try {
      setIsExporting(true);
      setRenderError(null);
      setRenderProgress(15);
      setRenderStage('1/4 Normalizing 9:16 Aspect & Dual-Stream Backdrop...');

      const bgUrl = customBrollUrl || selectedBroll.url;

      const progressTimer = setInterval(() => {
        setRenderProgress((prev) => {
          if (prev < 40) {
            setRenderStage('2/4 Compiling Brand Styled Subtitles (ASS Engine)...');
            return prev + 15;
          }
          if (prev < 70) {
            setRenderStage('3/4 Audio Sidechain Ducking & Filtergraph Composition...');
            return prev + 12;
          }
          if (prev < 90) {
            setRenderStage('4/4 Encoding H.264 MP4 & Extracting 1080x1920 Poster Frame...');
            return prev + 6;
          }
          return prev;
        });
      }, 500);

      const res = await api.videos.render(activeBrand.id, {
        title: `${scenes[0]?.headline || 'Social Video'} (${aspectRatio})`,
        subtext: scenes[0]?.subtext || 'AI Generated Video',
        durationSec: totalDuration,
        scenes,
        motionStyle,
        bgVideoUrl: bgUrl,
        audioTrackId: selectedAudio.id,
        burnSubtitles,
        includeOutro,
        outroHeadline,
        outroSubtext,
        voiceoverUrl: voiceoverUrl || undefined,
        voiceoverPersona,
        generateVoiceoverTts: voiceoverPersona !== 'none',
        aspectRatio,
        qualityPreset,
        visualStyle,
        language,
        musicVolume,
        voiceoverVolume,
        duckingIntensity: enableDucking ? 6 : 0,
        campaignId,
      });

      clearInterval(progressTimer);
      setRenderProgress(100);
      setRenderStage('100% Video Render Complete!');

      const finalAsset = res?.asset || res?.renderResult;
      if (finalAsset) {
        setRenderedAsset(finalAsset);

        // Switch preview video source to the rendered MP4
        if (videoRef.current && finalAsset.publicUrl) {
          videoRef.current.src = finalAsset.publicUrl;
          videoRef.current.load();
          videoRef.current.play().catch(() => {});
        }

        if (attachToPost && onUseInPost) {
          onUseInPost(finalAsset);
          onClose();
        } else if (onSaveToLibrary) {
          onSaveToLibrary(finalAsset);
          setSuccessToast('✨ Native FFmpeg 9:16 Video Reel saved to Media Library!');
          setTimeout(() => setSuccessToast(null), 4000);
        } else {
          setSuccessToast('✨ Video Reel rendered and ready in Media Library!');
          setTimeout(() => setSuccessToast(null), 4000);
        }
      }
    } catch (err: any) {
      console.error('Failed to render reel:', err);
      setRenderError(err.message || 'Render failed');
      showError('Failed to save reel: ' + err.message);
    } finally {
      setIsExporting(false);
      loadRecentJobs();
    }
  };

  // Retry job
  const handleRetryJob = async (jobId: string) => {
    if (!activeBrand) return;
    try {
      setIsExporting(true);
      setRenderError(null);
      setRenderProgress(20);
      setRenderStage('Retrying render job in engine...');
      await api.videos.retryJob(activeBrand.id, jobId);
      setSuccessToast('Render job retry initiated!');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      showError('Retry error: ' + err.message);
    } finally {
      setIsExporting(false);
      loadRecentJobs();
    }
  };

  if (!isOpen) return null;

  if (studioMode === 'simple') {
    return (
      <SimpleVideoStudio
        isOpen={isOpen}
        onClose={onClose}
        initialText={initialText}
        campaignId={campaignId}
        campaignName={campaignName}
        postId={postId}
        onSaveToLibrary={onSaveToLibrary}
        onUseInPost={onUseInPost}
        onCreatePost={onCreatePost}
        isEmbedded={isEmbedded}
        onSwitchToAdvanced={() => setStudioMode('advanced')}
      />
    );
  }

  const currentVideoSrc = customBrollUrl || selectedBroll.url;

  const modalContent = (
    <div
      className={isEmbedded ? 'canva-embedded-container' : 'canva-modal-backdrop'}
      style={isEmbedded ? { height: '100%', width: '100%', position: 'relative' } : {}}
    >
      <div
        className={isEmbedded ? 'canva-studio-window canva-studio-embedded' : 'canva-studio-window'}
        style={{
          width: isFullscreen ? '100vw' : 'min(97vw, 1720px)',
          height: isFullscreen ? '100vh' : 'min(95vh, 1020px)',
          maxWidth: isFullscreen ? '100vw' : '1720px',
          maxHeight: isFullscreen ? '100vh' : '96vh',
          borderRadius: isFullscreen ? '0' : undefined,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
        }}
      >
        {/* Header Bar */}
        <header
          style={{
            height: '56px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            background: 'var(--bg-surface-elevated)',
            flexShrink: 0,
          }}
        >
          {/* Studio Brand & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(236, 72, 153, 0.4)',
              }}
            >
              <Film size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
                  Video Reels & Motion Engine
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    background: 'rgba(236, 72, 153, 0.22)',
                    color: '#f472b6',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                  }}
                >
                  9:16 VERTICAL FFmpeg
                </span>
                {campaignName && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                    }}
                  >
                    Campaign: {campaignName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                4-Beat Storyboard (Hook → Value → Proof → CTA) • Kinetic Typography • Sidechain Audio Ducking • Native H.264
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {successToast && (
              <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Check size={14} /> {successToast}
              </span>
            )}

            {errorToast && (
              <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertCircle size={14} /> {errorToast}
              </span>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setStudioMode('simple')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.4)', color: '#f472b6' }}
              title="Switch to simplified 5-step video publishing studio"
            >
              <Film size={14} />
              <span>Simple Studio</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm reel-export-btn"
              onClick={() => handleSaveReel(false)}
              disabled={isExporting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Render with FFmpeg and store in Media Library"
            >
              <Save size={14} />
              <span>{isExporting ? 'Encoding...' : 'Export to Library'}</span>
            </button>

            {onUseInPost && (
              <button
                type="button"
                className="btn btn-secondary btn-sm reel-attach-post-btn"
                onClick={() => handleSaveReel(true)}
                disabled={isExporting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  borderColor: 'rgba(236, 72, 153, 0.5)',
                  background: 'rgba(236, 72, 153, 0.12)',
                  color: 'var(--text-primary)',
                }}
              >
                <Sparkles size={14} color="#f472b6" />
                <span>Attach to Post</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (onCreatePost) {
                  onCreatePost();
                } else if (onUseInPost) {
                  handleSaveReel(true);
                } else {
                  onClose();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                background: 'var(--gradient-brand)',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
              }}
              title="Create new social post with this Reel"
            >
              <Plus size={14} />
              <span>Create Post</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {!isEmbedded && (
              <button
                type="button"
                className="modal-close"
                onClick={onClose}
                title="Close Studio (Esc)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </header>

        {/* Main Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel: Tabs & Controls */}
          <div
            style={{
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(255, 255, 255, 0.01)',
              overflowY: 'auto',
            }}
          >
            {/* Control Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)' }}>
              {[
                { id: 'storyboard', label: 'Storyboard', icon: Layers },
                { id: 'templates', label: 'Templates', icon: BookmarkPlus },
                { id: 'captions', label: 'Kinetic Text', icon: Sparkles },
                { id: 'broll', label: 'B-Roll & Video', icon: Film },
                { id: 'audio', label: 'Audio & Ducking', icon: Music },
                { id: 'ffmpeg', label: 'FFmpeg Engine', icon: Sliders },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSel = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`reel-tab-btn reel-tab-${tab.id} ${isSel ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      flex: 1,
                      padding: '12px 4px',
                      background: isSel ? 'rgba(236, 72, 153, 0.12)' : 'transparent',
                      border: 'none',
                      borderBottom: isSel ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                      color: isSel ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.74rem',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Icon size={13} color={isSel ? 'var(--accent-secondary)' : 'currentColor'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TAB 1: STORYBOARD (AI Generator & Scene Editor) */}
              {activeTab === 'storyboard' && (
                <>
                  {/* 1. AI Video Generator Configuration Bar */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                      border: '1px solid rgba(236, 72, 153, 0.35)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={15} color="#f472b6" />
                        <span>1. AI Text-to-Video Generator</span>
                      </span>
                      {initialText && (
                        <button
                          type="button"
                          onClick={() => setCopyInput(initialText)}
                          style={{
                            background: 'rgba(236, 72, 153, 0.2)',
                            border: '1px solid rgba(236, 72, 153, 0.4)',
                            color: '#f472b6',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                          }}
                        >
                          Load Post Copy
                        </button>
                      )}
                    </div>

                    {/* Natural Language Video Prompt */}
                    <textarea
                      rows={3}
                      value={copyInput}
                      onChange={(e) => setCopyInput(e.target.value)}
                      placeholder="Enter natural-language video prompt (e.g. 30-second high-energy promotional launch video spotlighting limited perks)..."
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        fontSize: '0.78rem',
                        color: 'var(--text-primary)',
                        lineHeight: 1.4,
                        resize: 'none',
                        marginBottom: '10px',
                      }}
                    />

                    {/* Controls Grid: Duration & Aspect Ratio & Style */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      {/* Video Duration Selector */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Video Duration:
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: 15, label: '15s' },
                            { id: 30, label: '30s ★', highlight: true },
                            { id: 60, label: '60s' },
                          ].map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedDuration(d.id as any)}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                border: selectedDuration === d.id ? '1px solid var(--accent-secondary)' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: selectedDuration === d.id ? 'rgba(236, 72, 153, 0.25)' : 'rgba(0, 0, 0, 0.25)',
                                color: selectedDuration === d.id ? '#ffffff' : 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                              title={d.highlight ? 'Primary Supported 30s Workflow' : `${d.id} seconds`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Aspect Ratio Selector */}
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Aspect Ratio:
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { id: '9:16', label: '9:16 Reel' },
                            { id: '16:9', label: '16:9 Land' },
                            { id: '1:1', label: '1:1 Sq' },
                          ].map((ar) => (
                            <button
                              key={ar.id}
                              type="button"
                              onClick={() => setAspectRatio(ar.id as any)}
                              style={{
                                flex: 1,
                                padding: '4px 6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: '4px',
                                border: aspectRatio === ar.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: aspectRatio === ar.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.25)',
                                color: aspectRatio === ar.id ? '#ffffff' : 'var(--text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {ar.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Controls: Style & AI Voice */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Visual Style:
                        </div>
                        <select
                          className="form-select"
                          value={visualStyle}
                          onChange={(e) => setVisualStyle(e.target.value as any)}
                          style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px', width: '100%' }}
                        >
                          <option value="corporate">Corporate / Clean</option>
                          <option value="cinematic">Cinematic Moody</option>
                          <option value="vibrant">Vibrant / High Sat</option>
                          <option value="cyberpunk">Cyberpunk Neon</option>
                          <option value="minimalist">Minimalist Dark</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          AI Voiceover:
                        </div>
                        <select
                          className="form-select"
                          value={voiceoverPersona}
                          onChange={(e) => setVoiceoverPersona(e.target.value as any)}
                          style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px', width: '100%' }}
                        >
                          <option value="david">David (Deep Male)</option>
                          <option value="hazel">Hazel (Warm Female)</option>
                          <option value="zira">Zira (Crisp Female)</option>
                          <option value="none">None (Music Only)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm reel-generate-btn"
                      onClick={handleGenerateAiStoryboard}
                      disabled={isGeneratingAi}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        background: 'var(--gradient-brand)',
                      }}
                    >
                      <Sparkles size={14} />
                      <span>
                        {isGeneratingAi
                          ? 'Synthesizing AI Video Storyboard...'
                          : `🪄 Generate Video Storyboard (${selectedDuration === 'custom' ? customDurationVal + 's' : selectedDuration + 's'} • ${aspectRatio})`}
                      </span>
                    </button>
                  </div>

                  {/* 2. Scene Editor Controls Header */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          2. Scene Editor
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {scenes.length} Scenes • <strong style={{ color: '#38bdf8' }}>{totalDuration.toFixed(1)}s Total Duration</strong> ({aspectRatio})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddScene}
                        className="btn btn-secondary btn-sm reel-add-scene-btn"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', padding: '4px 10px' }}
                      >
                        <Plus size={13} />
                        <span>Add Scene</span>
                      </button>
                    </div>

                    {/* Scene Cards List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {scenes.map((scene, idx) => {
                        const isActive = activeSceneIndex === idx;
                        const arcLabels = ['Hook & Attention', 'Problem & Agitation', 'Solution & Value', 'Proof & Validation', 'Call To Action'];
                        const arcLabel = arcLabels[idx] || `Scene Beat ${idx + 1}`;

                        return (
                          <div
                            key={scene.id}
                            className={`reel-scene-card ${isActive ? 'active' : ''}`}
                            style={{
                              padding: '14px',
                              borderRadius: 'var(--radius-md)',
                              background: isActive ? 'rgba(236, 72, 153, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                              border: isActive ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {/* Scene Top Bar: Order, Arc Label, Move/Dup/Delete Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: isActive ? 'var(--accent-secondary)' : 'rgba(255, 255, 255, 0.1)',
                                    color: '#ffffff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  #{idx + 1}
                                </span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isActive ? '#f472b6' : 'var(--text-primary)' }}>
                                  {arcLabel}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleJumpToScene(idx)}
                                  title="Jump preview to this scene"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '3px 6px', borderRadius: '4px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Eye size={12} /> Jump
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateSingleScene(idx)}
                                  disabled={regeneratingSceneIdx === idx}
                                  title="AI Regenerate this scene beat"
                                  style={{ background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', color: '#f472b6', cursor: 'pointer', padding: '3px 6px', borderRadius: '4px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                                >
                                  <Sparkles size={11} /> {regeneratingSceneIdx === idx ? 'Regenerating...' : 'AI Rewrite'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveScene(idx, 'up')}
                                  disabled={idx === 0}
                                  title="Move Up"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                >
                                  <ChevronUp size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveScene(idx, 'down')}
                                  disabled={idx === scenes.length - 1}
                                  title="Move Down"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                >
                                  <ChevronDown size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateScene(idx)}
                                  title="Duplicate Scene"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteScene(idx)}
                                  title="Delete Scene"
                                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer', padding: '2px' }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Inputs: Badge, Headline, Subtext */}
                            <input
                              className="form-input"
                              value={scene.badge || ''}
                              onChange={(e) => handleUpdateScene(idx, { badge: e.target.value })}
                              placeholder="Badge (e.g. ✦ EXCLUSIVE LAUNCH)"
                              style={{ fontSize: '0.74rem', padding: '6px 8px', marginBottom: '6px' }}
                            />

                            <input
                              className="form-input"
                              value={scene.headline}
                              onChange={(e) => handleUpdateScene(idx, { headline: e.target.value })}
                              placeholder="Scene Headline"
                              style={{ fontSize: '0.82rem', fontWeight: 700, padding: '6px 8px', marginBottom: '6px' }}
                            />

                            <input
                              className="form-input"
                              value={scene.subtext || ''}
                              onChange={(e) => handleUpdateScene(idx, { subtext: e.target.value })}
                              placeholder="Supporting Subtext"
                              style={{ fontSize: '0.74rem', padding: '6px 8px', marginBottom: '6px' }}
                            />

                            <input
                              className="form-input"
                              value={scene.narrationScript || ''}
                              onChange={(e) => handleUpdateScene(idx, { narrationScript: e.target.value })}
                              placeholder="AI Voiceover Narration Script (spoken aloud)"
                              style={{ fontSize: '0.72rem', padding: '5px 8px', marginBottom: '8px', background: 'rgba(56, 189, 248, 0.05)', borderColor: 'rgba(56, 189, 248, 0.2)' }}
                            />

                            {/* Scene Settings: Duration Slider & Transition & Animation */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', alignItems: 'center' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                  <span>Duration</span>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{scene.durationSec}s</span>
                                </div>
                                <input
                                  type="range"
                                  min={1.5}
                                  max={10.0}
                                  step={0.5}
                                  value={scene.durationSec}
                                  onChange={(e) => handleUpdateScene(idx, { durationSec: parseFloat(e.target.value) })}
                                  style={{ width: '100%', height: '4px' }}
                                />
                              </div>

                              <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Transition</div>
                                <select
                                  value={scene.transition || 'fade'}
                                  onChange={(e) => handleUpdateScene(idx, { transition: e.target.value as any })}
                                  className="form-select"
                                  style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px' }}
                                >
                                  <option value="cut">Cut</option>
                                  <option value="fade">Fade</option>
                                  <option value="wipe">Wipe</option>
                                  <option value="zoom">Zoom</option>
                                  <option value="slide">Slide</option>
                                </select>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Animation</div>
                                <select
                                  value={scene.animation || motionStyle}
                                  onChange={(e) => handleUpdateScene(idx, { animation: e.target.value as any })}
                                  className="form-select"
                                  style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px' }}
                                >
                                  <option value="kinetic_pop">Pop</option>
                                  <option value="typewriter">Typewriter</option>
                                  <option value="cinematic_fade">Fade</option>
                                  <option value="karaoke_highlight">Karaoke</option>
                                  <option value="slide">Slide</option>
                                  <option value="scale">Scale</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: DIRECTIVE 11 TEMPLATES */}
              {activeTab === 'templates' && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      5. Directive 11 Video Templates
                    </span>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      Apply pre-configured 4-beat scene storyboards matching the 9 canonical content categories.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {DIRECTIVE_11_TEMPLATES.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="reel-template-item"
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                background: 'rgba(139, 92, 246, 0.2)',
                                color: '#a78bfa',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {tpl.badge}
                            </span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                              {tpl.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleApplyTemplate(tpl)}
                            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                          >
                            Apply Template
                          </button>
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {tpl.description}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                          {tpl.scenes.length} Scenes • Motion: {tpl.motionStyle}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: KINETIC TYPOGRAPHIC MOTION STYLES */}
              {activeTab === 'captions' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                    3. Kinetic Typography Preset (Applies To All Scenes)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      {
                        id: 'kinetic_pop',
                        label: '💥 Kinetic Pop & Bounce',
                        desc: 'Words pop in with dynamic spring scale and high-energy brand glow.',
                      },
                      {
                        id: 'typewriter',
                        label: '⌨️ Typewriter Teleprompter',
                        desc: 'Real-time typing letter-by-letter with glowing cursor.',
                      },
                      {
                        id: 'cinematic_fade',
                        label: '🎬 Cinematic Smooth Dissolve',
                        desc: 'Floating words gently dissolve with soft upward vertical drift.',
                      },
                      {
                        id: 'karaoke_highlight',
                        label: '🎤 Karaoke Word Highlight',
                        desc: 'Words illuminate sequentially in glowing brand primary gradient.',
                      },
                      {
                        id: 'slide',
                        label: '📐 Slide Up & Glide',
                        desc: 'Smooth vertical kinetic slide-in with subtle motion blur.',
                      },
                      {
                        id: 'scale',
                        label: '🔍 Dynamic Scale Pulse',
                        desc: 'Smooth expanding zoom pulse creating immediate focal depth.',
                      },
                    ].map((style) => {
                      const isSel = motionStyle === style.id;
                      return (
                        <div
                          key={style.id}
                          className="reel-caption-style-card"
                          onClick={() => setMotionStyle(style.id as MotionCaptionStyle)}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            background: isSel ? 'rgba(236, 72, 153, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                            border: isSel ? '1px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: isSel ? '#ffffff' : 'var(--text-primary)' }}>
                              {style.label}
                            </span>
                            {isSel && <CheckCircle2 size={16} color="var(--accent-secondary)" />}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            {style.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: B-ROLL VIDEO */}
              {activeTab === 'broll' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      9:16 Vertical B-Roll Presets
                    </label>
                    <label
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--accent-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Upload size={13} />
                      <span>Upload Video</span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={handleCustomVideoUpload}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {BROLL_PRESETS.map((preset) => {
                      const isSel = selectedBroll.id === preset.id && !customBrollUrl;
                      return (
                        <div
                          key={preset.id}
                          className="reel-broll-item"
                          onClick={() => {
                            setCustomBrollUrl(null);
                            setSelectedBroll(preset);
                          }}
                          style={{
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            border: isSel ? '2px solid var(--accent-secondary)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            position: 'relative',
                            height: '110px',
                            background: '#040711',
                          }}
                        >
                          <img
                            src={preset.thumbnail}
                            alt={preset.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 60%)',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#ffffff' }}>{preset.name}</span>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{preset.category}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contrast Tint Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>Dark Contrast Overlay</span>
                      <span>{Math.round(overlayOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.8}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIO & DUCKING */}
              {activeTab === 'audio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Music Track Presets */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      4. Background Soundtrack
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {AUDIO_TRACKS.map((track) => {
                        const isSel = selectedAudio.id === track.id;
                        return (
                          <div
                            key={track.id}
                            className="reel-audio-item"
                            onClick={() => setSelectedAudio(track)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              background: isSel ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSel ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isSel ? '#ffffff' : 'var(--text-primary)' }}>
                                🎵 {track.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {track.genre} • {track.bpm}
                              </div>
                            </div>
                            {isSel && <Check size={16} color="var(--accent-primary)" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Music Volume Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Music Track Volume</span>
                      <span>{Math.round(musicVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.0}
                      step={0.05}
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* AI Voiceover Persona Selection & Synthesis */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mic size={15} color="#38bdf8" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>AI Voiceover Persona (TTS)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestVoiceover}
                        disabled={isTestingVoice || voiceoverPersona === 'none'}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Volume2 size={12} />
                        <span>{isTestingVoice ? 'Generating...' : '🔊 Test Voice'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>Voice Persona</div>
                        <select
                          className="form-select"
                          value={voiceoverPersona}
                          onChange={(e) => setVoiceoverPersona(e.target.value as any)}
                          style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px' }}
                        >
                          <option value="david">David (Deep Male)</option>
                          <option value="hazel">Hazel (Warm Female)</option>
                          <option value="zira">Zira (Crisp Female)</option>
                          <option value="none">None (Music Only)</option>
                        </select>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>Language</div>
                        <select
                          className="form-select"
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          style={{ fontSize: '0.72rem', padding: '3px 6px', height: '28px' }}
                        >
                          <option value="en">English (US/UK)</option>
                          <option value="es">Spanish (Español)</option>
                          <option value="fr">French (Français)</option>
                          <option value="de">German (Deutsch)</option>
                          <option value="hi">Hindi (हिंदी)</option>
                          <option value="ja">Japanese (日本語)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Voiceover / Narration Upload */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Upload size={14} color="var(--accent-secondary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>Custom Audio Track / Narration</span>
                      </div>
                      <label
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--accent-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Upload size={12} />
                        <span>Upload Audio</span>
                        <input
                          type="file"
                          ref={voiceoverInputRef}
                          accept="audio/*"
                          style={{ display: 'none' }}
                          onChange={handleVoiceoverUpload}
                        />
                      </label>
                    </div>

                    {voiceoverUrl ? (
                      <div style={{ fontSize: '0.74rem', color: '#34d399', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={13} /> Custom audio loaded and attached.
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                        Optional custom audio track or narration. Automatically triggers dynamic audio ducking.
                      </p>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Voiceover Volume</span>
                      <span>{Math.round(voiceoverVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.0}
                      step={0.05}
                      value={voiceoverVolume}
                      onChange={(e) => setVoiceoverVolume(parseFloat(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Audio Ducking Toggle */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEnableDucking(!enableDucking)}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                        Dynamic Audio Ducking (-12dB)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Attenuates background music volume automatically during spoken dialogue.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableDucking}
                      onChange={(e) => setEnableDucking(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: FFMPEG PIPELINE CONTROLS */}
              {activeTab === 'ffmpeg' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sliders size={15} />
                        <span>6. FFmpeg Native Video Pipeline</span>
                      </span>
                      <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>1080×1920 MP4/H.264</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      Background render jobs with real-time status tracking and idempotent retries.
                    </div>
                  </div>

                  {/* Subtitle Burn-In Toggle */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setBurnSubtitles(!burnSubtitles)}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                        Burn Brand Subtitles (ASS Engine)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Hardcodes styled typography with primary brand color and shadow outline.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={burnSubtitles}
                      onChange={(e) => setBurnSubtitles(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>

                  {/* Brand Watermark Toggle */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                    onClick={() => setIncludeWatermark(!includeWatermark)}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
                        Brand Watermark Bug
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Embeds @{activeBrand?.slug || 'brand'} safe margin watermark.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeWatermark}
                      onChange={(e) => setIncludeWatermark(e.target.checked)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                  </div>

                  {/* Outro Bumper Card */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                        Call-to-Action Outro Card (+2.5s)
                      </span>
                      <input
                        type="checkbox"
                        checked={includeOutro}
                        onChange={(e) => setIncludeOutro(e.target.checked)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </div>
                    {includeOutro && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                        <input
                          className="form-input"
                          style={{ fontSize: '0.76rem', padding: '6px 8px' }}
                          placeholder="Outro Headline"
                          value={outroHeadline}
                          onChange={(e) => setOutroHeadline(e.target.value)}
                        />
                        <input
                          className="form-input"
                          style={{ fontSize: '0.76rem', padding: '6px 8px' }}
                          placeholder="Outro Subtext / CTA"
                          value={outroSubtext}
                          onChange={(e) => setOutroSubtext(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Recent Render Jobs List */}
                  {recentJobs.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Recent Render Jobs ({recentJobs.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {recentJobs.slice(0, 5).map((job) => (
                          <div
                            key={job.jobId}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.72rem',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, color: '#ffffff' }}>
                                Job {job.jobId.slice(0, 8)}...
                              </div>
                              <div style={{ color: 'var(--text-muted)' }}>
                                {job.stage} ({job.progress}%)
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                className={`badge ${
                                  job.status === 'completed'
                                    ? 'badge-green'
                                    : job.status === 'failed'
                                    ? 'badge-failed'
                                    : 'badge-scheduled'
                                }`}
                                style={{ fontSize: '0.64rem' }}
                              >
                                {job.status}
                              </span>
                              {job.status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryJob(job.jobId)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Interactive 9:16 Phone Canvas Player */}
          <div
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#040711',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Rendered Asset Status Header */}
            {renderedAsset && (
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.74rem' }}>
                  <CheckCircle2 size={13} /> Native FFmpeg 9:16 (1080×1920 MP4)
                </span>
                <a
                  href={renderedAsset.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={renderedAsset.fileName}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={12} /> Download MP4
                </a>
              </div>
            )}

            {/* Error Banner */}
            {renderError && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#fb7185',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={14} />
                <span>{renderError}</span>
                <button
                  type="button"
                  onClick={() => handleSaveReel(false)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', marginLeft: 'auto' }}
                >
                  Retry Render
                </button>
              </div>
            )}

            {/* 7. Adaptive Phone & Widescreen Bezel Simulator */}
            <div
              style={{
                width: aspectRatio === '16:9' ? '480px' : (aspectRatio === '1:1' ? '330px' : '264px'),
                height: aspectRatio === '16:9' ? '270px' : (aspectRatio === '1:1' ? '330px' : '468px'),
                borderRadius: aspectRatio === '16:9' ? '18px' : (aspectRatio === '1:1' ? '22px' : '34px'),
                border: '5px solid #232733',
                boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 35px rgba(236, 72, 153, 0.2)',
                position: 'relative',
                overflow: 'hidden',
                background: '#000000',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Native FFmpeg Render Progress Overlay */}
              {isExporting && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(3, 7, 18, 0.88)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 50,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ position: 'relative', marginBottom: '16px' }}>
                    <RefreshCw size={36} className="spin" color="var(--accent-secondary)" />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#ffffff', marginBottom: '6px' }}>
                    Composing {aspectRatio} Video
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px', maxWidth: '240px' }}>
                    {renderStage}
                  </div>
                  <div
                    style={{
                      width: '200px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${renderProgress}%`,
                        background: 'var(--gradient-brand)',
                        borderRadius: '9999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                    {renderProgress}% • FFmpeg {aspectRatio} • libx264/AAC
                  </span>
                </div>
              )}

              {/* Dynamic Island Notch (Only for vertical 9:16 mobile mockup) */}
              {aspectRatio === '9:16' && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '90px',
                    height: '22px',
                    background: '#000000',
                    borderRadius: '16px',
                    zIndex: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a1020', marginRight: '6px' }} />
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#071530' }} />
                </div>
              )}

              {/* Background Video */}
              <video
                ref={videoRef}
                src={currentVideoSrc}
                playsInline
                autoPlay
                loop={isLooping}
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              {/* Contrast Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `rgba(0, 0, 0, ${overlayOpacity})`,
                  pointerEvents: 'none',
                }}
              />

              {/* 3. Kinetic Text Overlay Viewport */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: aspectRatio === '16:9' ? '20px 30px' : '40px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                {/* Top Badge */}
                {activeScene.badge && (
                  <div
                    key={`badge-${activeScene.id}`}
                    style={{
                      background: 'rgba(236, 72, 153, 0.9)',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                      animation: 'reelPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}
                  >
                    {activeScene.badge}
                  </div>
                )}

                {/* Center Headline & Subtext with chosen kinetic motion style */}
                <div style={{ width: '100%' }}>
                  <h2
                    key={`headline-${activeScene.id}-${activeScene.animation || motionStyle}`}
                    style={{
                      fontSize: aspectRatio === '16:9' ? '1.35rem' : '1.40rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      lineHeight: 1.25,
                      fontFamily: "'Outfit', sans-serif",
                      textShadow: '0 3px 12px rgba(0,0,0,0.85)',
                      marginBottom: '8px',
                      animation:
                        (activeScene.animation || motionStyle) === 'kinetic_pop'
                          ? 'reelPop 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                          : (activeScene.animation || motionStyle) === 'typewriter'
                          ? 'reelTypewriter 0.6s steps(20, end)'
                          : (activeScene.animation || motionStyle) === 'cinematic_fade'
                          ? 'reelFadeUp 0.6s ease'
                          : (activeScene.animation || motionStyle) === 'slide'
                          ? 'reelSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                          : (activeScene.animation || motionStyle) === 'scale'
                          ? 'reelScale 0.5s ease'
                          : 'reelKaraoke 0.8s ease',
                    }}
                  >
                    {activeScene.headline}
                  </h2>

                  {activeScene.subtext && (
                    <p
                      key={`subtext-${activeScene.id}`}
                      style={{
                        fontSize: '0.80rem',
                        color: '#e2e8f0',
                        lineHeight: 1.4,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        textShadow: '0 2px 8px rgba(0,0,0,0.85)',
                        animation: 'reelFadeUp 0.5s ease',
                      }}
                    >
                      {activeScene.subtext}
                    </p>
                  )}
                </div>

                {/* Bottom Watermark */}
                {includeWatermark && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#cbd5e1',
                      letterSpacing: '1px',
                      textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                    }}
                  >
                    @{activeBrand?.slug || 'hoaspforge'} • {activeBrand?.name || 'HoaspForge'}
                  </div>
                )}
              </div>
            </div>

            {/* 7. Video Controls Bar (Play/Pause, Prev/Next Beat, Seek, Speed, Mute, Time) */}
            <div
              style={{
                width: aspectRatio === '16:9' ? '480px' : (aspectRatio === '1:1' ? '330px' : '264px'),
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                transition: 'width 0.3s ease',
              }}
            >
              {/* Scrubber Bar */}
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                style={{ width: '100%', cursor: 'pointer' }}
              />

              {/* Navigation, Play/Pause, Speed & Soundwave */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handlePrevScene}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px' }}
                    title="Previous Scene Beat"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <button
                    type="button"
                    className="reel-play-toggle-btn"
                    onClick={togglePlay}
                    style={{
                      background: 'var(--gradient-brand)',
                      border: 'none',
                      color: '#ffffff',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextScene}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px' }}
                    title="Next Scene Beat"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px' }}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        setCurrentTime(0);
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px' }}
                    title="Restart"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>

                {/* Speed Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSetPlaybackSpeed(s)}
                      style={{
                        padding: '2px 5px',
                        fontSize: '0.66rem',
                        fontWeight: playbackSpeed === s ? 800 : 500,
                        borderRadius: '3px',
                        border: 'none',
                        background: playbackSpeed === s ? 'rgba(236, 72, 153, 0.3)' : 'transparent',
                        color: playbackSpeed === s ? '#f472b6' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Animated Audio Soundwave & Time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    {[10, 16, 12, 20, 8].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: '2px',
                          height: isPlaying ? `${h}px` : '3px',
                          background: 'var(--accent-secondary)',
                          borderRadius: '1px',
                          transition: 'height 0.2s ease',
                        }}
                      />
                    ))}
                  </div>

                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return isEmbedded ? modalContent : createPortal(modalContent, document.body);
};
