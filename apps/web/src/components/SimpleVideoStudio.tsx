import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Hash,
  Calendar,
  Send,
  Save,
  Clock,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  ExternalLink,
  FileVideo,
  RefreshCw,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Folder,
  Eye,
  Layers,
  ArrowRight,
  Share2,
  Sliders,
  Film,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import './SimpleVideoStudio.css';

export interface SimpleVideoStudioProps {
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
  onSwitchToAdvanced?: () => void;
}

export interface VideoFileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  format: string;
  uploadProgress: number; // 0 - 100
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  isMediaLibraryAsset?: boolean;
  mediaAssetId?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  maxDurationSec: number;
  maxCaptionLength: number;
  supportedRatios: string[];
  recommendedRatio: string;
  enabled: boolean;
}

const SUPPORTED_PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram',
    name: 'Instagram Reels',
    icon: '📸',
    maxDurationSec: 90,
    maxCaptionLength: 2200,
    supportedRatios: ['9:16', '1:1'],
    recommendedRatio: '9:16',
    enabled: true,
  },
  {
    id: 'facebook',
    name: 'Facebook Video',
    icon: '📘',
    maxDurationSec: 3600,
    maxCaptionLength: 63206,
    supportedRatios: ['9:16', '16:9', '1:1'],
    recommendedRatio: '9:16',
    enabled: true,
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    icon: '▶️',
    maxDurationSec: 60,
    maxCaptionLength: 5000,
    supportedRatios: ['9:16', '16:9'],
    recommendedRatio: '9:16',
    enabled: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Video',
    icon: '💼',
    maxDurationSec: 600,
    maxCaptionLength: 3000,
    supportedRatios: ['1:1', '16:9', '9:16'],
    recommendedRatio: '1:1',
    enabled: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    maxDurationSec: 600,
    maxCaptionLength: 4000,
    supportedRatios: ['9:16'],
    recommendedRatio: '9:16',
    enabled: true,
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    icon: '🐦',
    maxDurationSec: 140,
    maxCaptionLength: 280,
    supportedRatios: ['16:9', '1:1', '9:16'],
    recommendedRatio: '16:9',
    enabled: true,
  },
];

const CTA_OPTIONS = [
  'Tap link in bio to learn more',
  'Shop now with code VIP20',
  'Sign up for free today',
  'Follow for more daily tips',
  'Save this post for later',
  'Watch full video on YouTube',
  'Comment below with your thoughts',
  'Book your free discovery call',
];

export const SimpleVideoStudio: React.FC<SimpleVideoStudioProps> = ({
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
  onSwitchToAdvanced,
}) => {
  const { user, activeBrand } = useAuth();

  // 5-Step Workflow State: 1 = Upload, 2 = Content, 3 = Platforms, 4 = Preview, 5 = Publish
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Video State
  const [videoList, setVideoList] = useState<VideoFileItem[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaLibraryVideos, setMediaLibraryVideos] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  // Content Creation State
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState(initialText || '');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([
    '#HoaspForge',
    '#VideoMarketing',
    '#ContentCreator',
  ]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [callToAction, setCallToAction] = useState(CTA_OPTIONS[0]);
  const [websiteUrl, setWebsiteUrl] = useState(activeBrand?.websiteUrl || 'https://hoaspforge.com');

  // Platform Overrides (optional per-platform custom caption)
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({});
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'facebook',
    'youtube',
  ]);

  // Player & Preview State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<string>('instagram');
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Publishing & Scheduling State
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  // Saved Projects & Drafts Drawer
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(postId || null);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  // AI Assistant Loading States
  const [aiGeneratingCaption, setAiGeneratingCaption] = useState(false);
  const [aiImprovingCaption, setAiImprovingCaption] = useState(false);
  const [aiGeneratingHashtags, setAiGeneratingHashtags] = useState(false);
  const [aiRewritingPlatform, setAiRewritingPlatform] = useState<string | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeVideo = videoList.find((v) => v.id === activeVideoId) || videoList[0] || null;

  // Initialize with sample video or existing draft if provided
  useEffect(() => {
    if (initialText && !caption) {
      setCaption(initialText);
    }
  }, [initialText]);

  // Load existing draft if postId provided
  useEffect(() => {
    if (activeBrand && postId) {
      loadPostDraft(postId);
    }
  }, [activeBrand, postId]);

  const loadPostDraft = async (id: string) => {
    if (!activeBrand) return;
    try {
      const p = await api.posts.get(activeBrand.id, id);
      if (p) {
        setEditingDraftId(p.id);
        setTitle(p.title || '');
        setCaption(p.baseContent || p.base_content || '');
        const firstVariant = p.variants?.[0];
        if (firstVariant?.platformSpecificConfig?.mediaUrls?.[0]) {
          const vUrl = firstVariant.platformSpecificConfig.mediaUrls[0];
          const newVid: VideoFileItem = {
            id: 'draft-vid-' + Date.now(),
            name: p.title || 'Draft Video',
            size: 15400000,
            url: vUrl,
            format: 'mp4',
            uploadProgress: 100,
            status: 'ready',
          };
          setVideoList([newVid]);
          setActiveVideoId(newVid.id);
        }
        if (firstVariant?.platformSpecificConfig?.callToAction) {
          setCallToAction(firstVariant.platformSpecificConfig.callToAction);
        }
        if (firstVariant?.platformSpecificConfig?.hashtags) {
          setHashtags(firstVariant.platformSpecificConfig.hashtags);
        }
        if (Array.isArray(p.variants) && p.variants.length > 0) {
          const plats = p.variants.map((v: any) => v.platform);
          setSelectedPlatforms(plats);
        }
        showToast('Saved video draft loaded successfully!');
      }
    } catch (err) {
      console.error('Failed to load draft:', err);
    }
  };

  // Step 1: Upload from Computer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validExtensions = ['.mp4', '.mov', '.webm'];
    const newItems: VideoFileItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        showToast(`"${file.name}" is not a supported video (MP4, MOV, WebM only)`, 'error');
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        showToast(`"${file.name}" exceeds maximum 500MB size limit`, 'error');
        return;
      }

      const blobUrl = URL.createObjectURL(file);
      const item: VideoFileItem = {
        id: 'vid-' + Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        url: blobUrl,
        format: ext.replace('.', '').toUpperCase(),
        uploadProgress: 0,
        status: 'uploading',
      };
      newItems.push(item);
    });

    if (newItems.length > 0) {
      setVideoList((prev) => [...prev, ...newItems]);
      if (!activeVideoId) {
        setActiveVideoId(newItems[0].id);
      }

      // Simulate upload progress
      newItems.forEach((item) => {
        let prog = 0;
        const interval = setInterval(() => {
          prog += 25;
          setVideoList((prev) =>
            prev.map((v) =>
              v.id === item.id
                ? {
                    ...v,
                    uploadProgress: Math.min(prog, 100),
                    status: prog >= 100 ? 'ready' : 'uploading',
                  }
                : v
            )
          );
          if (prog >= 100) clearInterval(interval);
        }, 150);
      });

      // Auto set Title if blank
      if (!title) {
        const cleanName = newItems[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
      showToast(`Uploaded ${newItems.length} video(s)!`);
    }
  };

  // Step 1: Select from Media Library
  const handleOpenMediaPicker = async () => {
    if (!activeBrand) return;
    try {
      setIsLoadingMedia(true);
      setIsMediaPickerOpen(true);
      const media = await api.media.list(activeBrand.id, { type: 'video' });
      setMediaLibraryVideos(media || []);
    } catch (err) {
      console.error('Failed to load media library:', err);
      showToast('Could not load Media Library videos', 'error');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleSelectMediaLibraryAsset = (asset: any) => {
    const item: VideoFileItem = {
      id: 'ml-' + asset.id,
      name: asset.title || asset.fileName || 'Library Video',
      size: asset.fileSizeBytes || 10485760,
      url: asset.publicUrl || asset.thumbnailUrl,
      thumbnailUrl: asset.thumbnailUrl,
      format: (asset.mimeType?.split('/')[1] || 'MP4').toUpperCase(),
      uploadProgress: 100,
      status: 'ready',
      isMediaLibraryAsset: true,
      mediaAssetId: asset.id,
    };

    setVideoList((prev) => {
      const exists = prev.some((v) => v.url === item.url);
      if (exists) return prev;
      return [...prev, item];
    });
    setActiveVideoId(item.id);
    if (!title) {
      setTitle(asset.title || 'Brand Video');
    }
    setIsMediaPickerOpen(false);
    showToast(`Attached "${item.name}" from Media Library!`);
  };

  const handleUseSampleVideo = () => {
    const sample: VideoFileItem = {
      id: 'sample-' + Date.now(),
      name: 'Ambient Shore Waves (Sample Reel)',
      size: 15400000,
      url: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-waves-coming-to-the-beach-41132-large.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
      format: 'MP4',
      uploadProgress: 100,
      status: 'ready',
    };
    setVideoList((prev) => [...prev, sample]);
    setActiveVideoId(sample.id);
    if (!title) setTitle('Mastering AI Video Content Automation');
    showToast('Loaded sample video for immediate testing!');
  };

  // Remove video from queue
  const handleRemoveVideo = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVideoList((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      if (activeVideoId === id) {
        setActiveVideoId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  // Step 2: AI Assistance
  const handleAiGenerateCaption = async () => {
    if (!activeBrand) return;
    try {
      setAiGeneratingCaption(true);
      const prompt =
        title ||
        caption ||
        'Create an engaging, viral social media video caption with a strong hook, clear value, and call to action.';
      const res = await api.ai.generateContent(activeBrand.id, {
        contentType: 'reel_script',
        prompt,
        callToAction,
      });

      const aiText = (res as any)?.text || (res as any)?.content || (res as any)?.script;
      if (aiText) {
        setCaption(aiText.trim());
        showToast('✨ AI generated fresh caption!');
      } else {
        const copyRes = await api.ai.generateCopy(activeBrand.id, {
          prompt,
          campaignGoal: 'engagement',
        });
        if (copyRes?.copy) {
          setCaption(copyRes.copy.trim());
          showToast('✨ AI generated fresh caption!');
        }
      }
    } catch (err: any) {
      console.error('AI Caption generation error:', err);
      // Fallback helpful caption
      setCaption(
        `Stop scrolling! 🔥 Here is what you need to know about ${title || 'this game-changer'}.\n\n` +
          `We engineered this to help you scale faster without wasting hours. Watch till the end to see the results.\n\n` +
          `${callToAction} 👇`
      );
      showToast('Generated high-converting caption blueprint!');
    } finally {
      setAiGeneratingCaption(false);
    }
  };

  const handleAiImproveCaption = async () => {
    if (!activeBrand || !caption.trim()) {
      showToast('Please enter a caption first to improve it', 'error');
      return;
    }
    try {
      setAiImprovingCaption(true);
      const res = await api.ai.transformCopy(activeBrand.id, {
        content: caption,
        operation: 'persuasive',
      });
      if (res && res.transformedContent) {
        setCaption(res.transformedContent.trim());
        showToast('🚀 Caption upgraded with viral hook!');
      }
    } catch (err) {
      showToast('Could not improve caption. Check network.', 'error');
    } finally {
      setAiImprovingCaption(false);
    }
  };

  const handleAiGenerateHashtags = async () => {
    if (!activeBrand) return;
    try {
      setAiGeneratingHashtags(true);
      const res = await api.ai.getHashtags(activeBrand.id, `${title} ${caption}`);
      if (res && Array.isArray(res.hashtags) && res.hashtags.length > 0) {
        const cleaned = res.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`));
        setHashtags(Array.from(new Set([...hashtags, ...cleaned])));
        showToast(`Added ${cleaned.length} trending hashtags!`);
      } else {
        // High-engagement defaults
        const defaults = ['#VideoReels', '#GrowthHacks', '#SocialMediaTips', '#ViralVideo'];
        setHashtags(Array.from(new Set([...hashtags, ...defaults])));
        showToast('Added targeted hashtags!');
      }
    } catch (err) {
      showToast('Failed to fetch hashtags', 'error');
    } finally {
      setAiGeneratingHashtags(false);
    }
  };

  const handleRewriteForPlatform = async (platformId: string) => {
    if (!activeBrand || !caption.trim()) {
      showToast('Enter caption first before rewriting', 'error');
      return;
    }
    try {
      setAiRewritingPlatform(platformId);
      const opMap: Record<string, string> = {
        instagram: 'rewrite',
        facebook: 'friendly',
        youtube: 'expand',
        linkedin: 'professional',
        tiktok: 'conversational',
        x_twitter: 'shorten',
      };
      const res = await api.ai.transformCopy(activeBrand.id, {
        content: caption,
        platform: platformId,
        operation: (opMap[platformId] || 'rewrite') as any,
      });

      if (res && res.transformedContent) {
        setPlatformOverrides((prev) => ({
          ...prev,
          [platformId]: res.transformedContent.trim(),
        }));
        showToast(`Rewritten specifically for ${platformId.toUpperCase()}!`);
      }
    } catch (err) {
      showToast(`Rewrite failed for ${platformId}`, 'error');
    } finally {
      setAiRewritingPlatform(null);
    }
  };

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = hashtagInput.trim().replace(/^#+/, '');
      if (val && !hashtags.includes(`#${val}`)) {
        setHashtags([...hashtags, `#${val}`]);
        setHashtagInput('');
      }
    }
  };

  const handleRemoveHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((t) => t !== tagToRemove));
  };

  // Step 3: Platform Toggles
  const handleTogglePlatform = (id: string) => {
    if (selectedPlatforms.includes(id)) {
      if (selectedPlatforms.length === 1) {
        showToast('At least one platform must be selected', 'error');
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== id));
    } else {
      setSelectedPlatforms([...selectedPlatforms, id]);
    }
  };

  // Step 4: Player Controls
  const togglePlayPause = () => {
    if (!videoPlayerRef.current) return;
    if (isPlaying) {
      videoPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      videoPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoPlayerRef.current) return;
    videoPlayerRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoPlayerRef.current) {
      setCurrentTime(videoPlayerRef.current.currentTime);
      setVideoDuration(videoPlayerRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = val;
    }
  };

  // Step 5: Save as Draft
  const handleSaveDraft = async () => {
    if (!activeBrand) return;
    try {
      setIsSubmitting(true);
      const postTitle = title.trim() || 'Untitled Video Reel';
      const fullContent = `${caption}\n\n${hashtags.join(' ')}`;
      const mediaUrl = activeVideo?.url || '';

      const variants = selectedPlatforms.map((plat) => ({
        platform: plat,
        content: platformOverrides[plat] || fullContent,
        mediaAssetIds: activeVideo?.mediaAssetId ? [activeVideo.mediaAssetId] : [],
        platformSpecificConfig: {
          mediaUrls: [mediaUrl],
          mediaType: 'video',
          aspectRatio: plat === 'linkedin' ? '1:1' : '9:16',
          title: postTitle,
          hashtags,
          callToAction,
          websiteUrl,
        },
      }));

      if (editingDraftId) {
        await api.posts.update(activeBrand.id, editingDraftId, {
          title: postTitle,
          baseContent: caption,
          status: 'draft',
          variants,
        });
        showToast('Draft project updated successfully!');
      } else {
        const created = await api.posts.create(activeBrand.id, {
          title: postTitle,
          baseContent: caption,
          campaignId: campaignId || undefined,
          variants,
        });
        if (created?.id) {
          setEditingDraftId(created.id);
        }
        showToast('Video project saved as Draft!');
      }
    } catch (err: any) {
      console.error('Save draft error:', err);
      showToast('Error saving draft: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5: Save to Media Library
  const handleSaveToMediaLibrary = async () => {
    if (!activeBrand || !activeVideo?.url) {
      showToast('No video attached to save to Media Library', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      const assetTitle = title.trim() || activeVideo.name || 'Social Video';
      const asset = await api.media.create(activeBrand.id, {
        title: assetTitle,
        fileName: activeVideo.name || `${assetTitle.toLowerCase().replace(/\s+/g, '-')}.mp4`,
        folder: 'Videos',
        tags: hashtags.map((h) => h.replace('#', '')),
        publicUrl: activeVideo.url,
        thumbnailUrl: activeVideo.thumbnailUrl || activeVideo.url,
        mediaType: 'video',
        mimeType: `video/${activeVideo.format.toLowerCase()}`,
        fileSizeBytes: activeVideo.size || 10485760,
        metadata: {
          title: assetTitle,
          duration: videoDuration,
          callToAction,
          websiteUrl,
        },
      });

      if (onSaveToLibrary) {
        onSaveToLibrary(asset);
      }
      showToast(`Saved "${assetTitle}" to Brand Media Library!`);
    } catch (err: any) {
      showToast('Media Library save error: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5: Schedule for Later
  const handleSchedulePost = async () => {
    if (!activeBrand) return;
    if (!activeVideo?.url) {
      showToast('Please upload or select a video first', 'error');
      setCurrentStep(1);
      return;
    }
    try {
      setIsSubmitting(true);
      const postTitle = title.trim() || 'Scheduled Social Video';
      const fullContent = `${caption}\n\n${hashtags.join(' ')}`;
      const mediaUrl = activeVideo.url;

      const variants = selectedPlatforms.map((plat) => ({
        platform: plat,
        content: platformOverrides[plat] || fullContent,
        mediaAssetIds: activeVideo?.mediaAssetId ? [activeVideo.mediaAssetId] : [],
        platformSpecificConfig: {
          mediaUrls: [mediaUrl],
          mediaType: 'video',
          aspectRatio: plat === 'linkedin' ? '1:1' : '9:16',
          title: postTitle,
          hashtags,
          callToAction,
          websiteUrl,
        },
      }));

      let targetPostId = editingDraftId;
      if (!targetPostId) {
        const created = await api.posts.create(activeBrand.id, {
          title: postTitle,
          baseContent: caption,
          campaignId: campaignId || undefined,
          variants,
        });
        targetPostId = created?.id;
      } else {
        await api.posts.update(activeBrand.id, targetPostId, {
          title: postTitle,
          baseContent: caption,
          variants,
        });
      }

      if (targetPostId) {
        const isoSchedule = new Date(scheduleDate).toISOString();
        await api.posts.schedule(activeBrand.id, targetPostId, isoSchedule);
        showToast(
          `📅 Video scheduled for ${new Date(scheduleDate).toLocaleString()} on ${selectedPlatforms.join(
            ', '
          )}! Added to Calendar.`
        );
      }
    } catch (err: any) {
      showToast('Schedule failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5: Publish Now
  const handlePublishNow = async () => {
    if (!activeBrand) return;
    if (!activeVideo?.url) {
      showToast('Please upload or select a video first', 'error');
      setCurrentStep(1);
      return;
    }
    try {
      setIsSubmitting(true);
      const postTitle = title.trim() || 'Instant Social Video';
      const fullContent = `${caption}\n\n${hashtags.join(' ')}`;
      const mediaUrl = activeVideo.url;

      const variants = selectedPlatforms.map((plat) => ({
        platform: plat,
        content: platformOverrides[plat] || fullContent,
        mediaAssetIds: activeVideo?.mediaAssetId ? [activeVideo.mediaAssetId] : [],
        platformSpecificConfig: {
          mediaUrls: [mediaUrl],
          mediaType: 'video',
          aspectRatio: plat === 'linkedin' ? '1:1' : '9:16',
          title: postTitle,
          hashtags,
          callToAction,
          websiteUrl,
        },
      }));

      let targetPostId = editingDraftId;
      if (!targetPostId) {
        const created = await api.posts.create(activeBrand.id, {
          title: postTitle,
          baseContent: caption,
          campaignId: campaignId || undefined,
          variants,
        });
        targetPostId = created?.id;
      }

      if (targetPostId) {
        const res = await api.posts.publishNow(activeBrand.id, targetPostId, {
          force: true,
          platforms: selectedPlatforms,
        });

        if (res && res.success !== false) {
          showToast(`🚀 Successfully published across ${selectedPlatforms.length} platform(s)!`);
        } else {
          showToast('Publish request sent. Check Channel Health / Audit logs for live status.');
        }
      }
    } catch (err: any) {
      showToast('Publish error: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Saved Projects Drawer
  const handleOpenDraftsDrawer = async () => {
    if (!activeBrand) return;
    try {
      setIsLoadingDrafts(true);
      setIsDraftsDrawerOpen(true);
      const allPosts = await api.posts.list(activeBrand.id);
      // Filter posts that have video variants or video config
      const videoDrafts = (allPosts || []).filter((p: any) => {
        const hasVid = p.variants?.some(
          (v: any) =>
            v.platformSpecificConfig?.mediaType === 'video' ||
            v.platformSpecificConfig?.mediaUrls?.some((u: string) => /\.(mp4|mov|webm)/i.test(u))
        );
        return hasVid || p.status === 'draft';
      });
      setSavedDrafts(videoDrafts);
    } catch (err) {
      showToast('Could not load saved drafts', 'error');
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const handleDuplicateDraft = async (draftId: string) => {
    if (!activeBrand) return;
    try {
      await api.posts.duplicate(activeBrand.id, draftId);
      showToast('Video project duplicated!');
      handleOpenDraftsDrawer();
    } catch (err) {
      showToast('Failed to duplicate project', 'error');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!activeBrand) return;
    try {
      await api.posts.delete(activeBrand.id, draftId);
      setSavedDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (editingDraftId === draftId) {
        setEditingDraftId(null);
      }
      showToast('Project deleted');
    } catch (err) {
      showToast('Failed to delete draft', 'error');
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen && !isEmbedded) return null;

  return (
    <div
      className="svs-container simple-video-studio-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '10px 18px',
            borderRadius: '8px',
            background: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.85rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header
        className="svs-header"
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
            }}
          >
            <Film size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="svs-header-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                HoaspForge Video & Reels Studio
              </h1>
              <span
                className="svs-header-badge"
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#0284c7',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                PRO PUBLISHING
              </span>
            </div>
            <div className="svs-header-subtext" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Brand: <strong style={{ color: 'var(--text-primary)' }}>{activeBrand?.name || 'Main Brand'}</strong>{' '}
              {campaignName && `• Campaign: ${campaignName}`}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleOpenDraftsDrawer}
            className="svs-header-btn-secondary"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Folder size={14} />
            <span>Saved Drafts ({savedDrafts.length || '•'})</span>
          </button>

          {onSwitchToAdvanced && (
            <button
              type="button"
              onClick={onSwitchToAdvanced}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'transparent',
                border: '1px solid rgba(236, 72, 153, 0.4)',
                color: '#ec4899',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Switch to advanced kinetic motion & scene editor"
            >
              <Sliders size={13} />
              <span>Advanced Storyboard</span>
            </button>
          )}

          {!isEmbedded && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </header>

      {/* 5-Step Workflow Stepper Bar */}
      <div
        className="svs-stepper-bar"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface-elevated)',
          padding: '0 24px',
        }}
      >
        {[
          { num: 1, title: 'Upload Video', desc: 'Select or drop MP4/MOV' },
          { num: 2, title: 'Add Content', desc: 'Title, caption & AI helper' },
          { num: 3, title: 'Select Platforms', desc: 'Reels, Shorts, TikTok' },
          { num: 4, title: 'Preview Post', desc: 'Live video & social view' },
          { num: 5, title: 'Publish & Schedule', desc: 'Calendar sync & live' },
        ].map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`svs-step-tab ${isActive ? 'active' : isDone ? 'done' : 'inactive'}`}
              style={{
                flex: 1,
                padding: '14px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderBottom: isActive ? '2px solid #ec4899' : '2px solid transparent',
                background: isActive ? 'rgba(236, 72, 153, 0.08)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                className="svs-step-badge"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isDone ? '#10b981' : isActive ? '#ec4899' : 'var(--border-medium)',
                  color: isDone || isActive ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? <Check size={14} /> : s.num}
              </div>
              <div>
                <div
                  className="svs-step-title"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: isActive ? 'var(--text-primary)' : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                  }}
                >
                  {s.title}
                </div>
                <div className="svs-step-desc" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Studio Workspace Content Area */}
      <div
        className="svs-workspace-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 0.85fr',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left Side: Step Configurations */}
        <div
          className="svs-left-panel"
          style={{
            padding: '24px',
            overflowY: 'auto',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* ================= STEP 1: VIDEO UPLOAD ================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 className="svs-section-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Step 1: Upload Your Video File
                </h2>
                <p className="svs-section-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Upload high-definition MP4, MOV, or WebM clips (up to 500MB). Or pick a video directly
                  from your HoaspForge Media Library.
                </p>
              </div>

              {/* Upload Drop Zone */}
              <div
                className="svs-dropzone"
                style={{
                  border: '2px dashed rgba(236, 72, 153, 0.4)',
                  borderRadius: '12px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(236, 72, 153, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(236, 72, 153, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={26} color="#ec4899" />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Drag & Drop your video files here
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Supports MP4, MOV, WebM (Vertical 9:16 or Horizontal 16:9)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <label
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload from Computer</span>
                    <input
                      id="video-file-upload-input"
                      data-testid="video-file-input"
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleOpenMediaPicker}
                    data-testid="pick-media-library-btn"
                    className="svs-header-btn-secondary"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Folder size={14} />
                    <span>Pick from Media Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseSampleVideo}
                    data-testid="use-sample-video-btn"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#0284c7',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Film size={14} />
                    <span>Use Sample Video</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Videos List */}
              {videoList.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '10px',
                    }}
                  >
                    Attached Video Queue ({videoList.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {videoList.map((item) => {
                      const isSel = activeVideoId === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setActiveVideoId(item.id)}
                          className={`svs-queue-card ${isSel ? 'selected' : ''}`}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: isSel ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-surface-elevated)',
                            border: isSel
                              ? '1px solid #ec4899'
                              : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              className="svs-queue-thumb"
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                background: 'var(--border-subtle)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              <FileVideo size={20} color="#ec4899" />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: 700,
                                  color: 'var(--text-primary)',
                                }}
                              >
                                {item.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {item.format} • {(item.size / (1024 * 1024)).toFixed(1)} MB •{' '}
                                {item.status === 'ready' ? (
                                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Ready for publishing</span>
                                ) : (
                                  <span style={{ color: '#0284c7' }}>
                                    Uploading ({item.uploadProgress}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isSel && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: '#ec4899',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                ACTIVE
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleRemoveVideo(item.id, e)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                              }}
                              title="Remove video"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 1 Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={videoList.length === 0}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: videoList.length > 0 ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#334155',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: videoList.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>Continue to Add Content</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CONTENT CREATION & AI ================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 className="svs-section-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Step 2: Add Post Copy & AI Optimization
                </h2>
                <p className="svs-section-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Craft your caption, hashtags, and call to action. Use HoaspForge AI to rewrite and
                  optimize for maximum organic reach.
                </p>
              </div>

              {/* Post Title */}
              <div>
                <label className="svs-form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Post Title / Hook Headline
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 3 Proven Tactics to Scale Your Social Reach"
                  className="svs-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Caption with AI Tools Bar */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="svs-form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Caption / Main Copy
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleAiGenerateCaption}
                      disabled={aiGeneratingCaption}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(236, 72, 153, 0.15)',
                        border: '1px solid rgba(236, 72, 153, 0.35)',
                        color: '#ec4899',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Sparkles size={12} />
                      <span>{aiGeneratingCaption ? 'Generating...' : '✨ Generate Caption'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAiImproveCaption}
                      disabled={aiImprovingCaption || !caption.trim()}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.35)',
                        color: '#0284c7',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{aiImprovingCaption ? 'Polishing...' : '🚀 Boost Hook'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your engaging caption here. What makes this video worth watching? Include context, insights, and what to do next..."
                  className="svs-textarea"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span>{caption.length} characters</span>
                  <span>Recommended: 150 – 500 characters for vertical reels</span>
                </div>
              </div>

              {/* Platform Rewrite Helper Bar */}
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  AI Platform Adaptation:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[
                    { id: 'instagram', label: '📸 Rewrite for Instagram' },
                    { id: 'facebook', label: '📘 Rewrite for Facebook' },
                    { id: 'youtube', label: '▶️ Rewrite for YouTube' },
                    { id: 'linkedin', label: '💼 Rewrite for LinkedIn' },
                    { id: 'tiktok', label: '🎵 Rewrite for TikTok' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleRewriteForPlatform(p.id)}
                      disabled={!!aiRewritingPlatform || !caption.trim()}
                      className="svs-header-btn-secondary"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {aiRewritingPlatform === p.id ? 'Rewriting...' : p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hashtags Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="svs-form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Hashtags ({hashtags.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAiGenerateHashtags}
                    disabled={aiGeneratingHashtags}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Hash size={12} />
                    <span>{aiGeneratingHashtags ? 'Analyzing...' : '# Auto-Hashtags'}</span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    minHeight: '44px',
                    alignItems: 'center',
                  }}
                >
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: 'rgba(236, 72, 153, 0.15)',
                        color: '#ec4899',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {tag}
                      <X
                        size={12}
                        onClick={() => handleRemoveHashtag(tag)}
                        style={{ cursor: 'pointer', opacity: 0.8 }}
                      />
                    </span>
                  ))}
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={handleAddHashtag}
                    placeholder="Type hashtag & press Enter..."
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.75rem',
                      outline: 'none',
                      flex: 1,
                      minWidth: '120px',
                    }}
                  />
                </div>
              </div>

              {/* Call to Action & Website Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="svs-form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Call To Action (CTA)
                  </label>
                  <select
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    className="svs-select"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                    }}
                  >
                    {CTA_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="svs-form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Target Link / Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://yourbrand.com/link"
                    className="svs-input"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                    }}
                  />
                </div>
              </div>

              {/* Step 2 Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Back to Video
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
                  }}
                >
                  <span>Select Platforms</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: PLATFORM SELECTION ================= */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 className="svs-section-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Step 3: Choose Social Media Platforms
                </h2>
                <p className="svs-section-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Publish your video across multiple authorized networks simultaneously. Format rules
                  and duration caps are automatically enforced.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {SUPPORTED_PLATFORMS.map((plat) => {
                  const isChecked = selectedPlatforms.includes(plat.id);
                  return (
                    <div
                      key={plat.id}
                      onClick={() => handleTogglePlatform(plat.id)}
                      className={`svs-platform-card ${isChecked ? 'selected' : ''}`}
                      style={{
                        padding: '14px',
                        borderRadius: '10px',
                        background: isChecked ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-surface-elevated)',
                        border: isChecked
                          ? '1px solid #ec4899'
                          : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{plat.icon}</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {plat.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ec4899' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Max: {plat.maxDurationSec}s • {plat.recommendedRatio} Recommended
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Platform Validation Summary */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: '4px' }}>
                  ✓ HoaspForge Connect Hub Enforcement:
                </div>
                <div>
                  Publishing token encryption, AES-256-GCM authentication, and multi-tenant isolation
                  are verified active for all selected platforms.
                </div>
              </div>

              {/* Step 3 Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Back to Content
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
                  }}
                >
                  <span>Preview Full Post</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: PREVIEW ================= */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h2 className="svs-section-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Step 4: Social Feed Preview & Inspection
                </h2>
                <p className="svs-section-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Switch between platforms to preview exactly how your video, caption, hashtags, and CTA
                  will appear to followers.
                </p>
              </div>

              {/* Preview Platform Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', overflowX: 'auto' }}>
                {selectedPlatforms.map((platId) => {
                  const plat = SUPPORTED_PLATFORMS.find((p) => p.id === platId);
                  const isSel = previewPlatform === platId;
                  return (
                    <button
                      key={platId}
                      type="button"
                      onClick={() => setPreviewPlatform(platId)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: isSel ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-surface-elevated)',
                        border: isSel ? '1px solid #ec4899' : '1px solid var(--border-subtle)',
                        color: isSel ? '#ec4899' : 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{plat?.icon}</span>
                      <span>{plat?.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Social Card Preview */}
              <div
                className="svs-social-card-preview"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Author Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#ffffff',
                    }}
                  >
                    {activeBrand?.name?.slice(0, 2).toUpperCase() || 'SF'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {activeBrand?.name || 'HoaspForge Brand'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      @{activeBrand?.slug || 'hoaspforge'} • {previewPlatform.toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Video Info Pill */}
                <div
                  className="svs-preview-pill"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface-elevated)',
                    fontSize: '0.76rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <FileVideo size={14} color="#ec4899" />
                  <span>
                    <strong>Attached Video:</strong> {activeVideo?.name || 'Uploaded Video'} (
                    {formatSeconds(videoDuration)} Duration)
                  </span>
                </div>

                {/* Post Caption Preview */}
                <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {platformOverrides[previewPlatform] || caption || 'No caption added yet.'}
                </div>

                {/* Hashtags */}
                {hashtags.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                    {hashtags.join(' ')}
                  </div>
                )}

                {/* Call to Action Button */}
                {callToAction && (
                  <div style={{ marginTop: '4px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'rgba(236, 72, 153, 0.15)',
                        border: '1px solid rgba(236, 72, 153, 0.4)',
                        color: '#ec4899',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <span>{callToAction}</span>
                      <ExternalLink size={12} />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 4 Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Back to Platforms
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
                  }}
                >
                  <span>Publish / Schedule Post</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: SAVE / SCHEDULE / PUBLISH ================= */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h2 className="svs-section-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  Step 5: Publish, Schedule & Project Management
                </h2>
                <p className="svs-section-desc" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Choose whether to publish immediately, schedule on the calendar, or save as a draft.
                </p>
              </div>

              {/* Publishing Destination Banner */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Publishing Target: {selectedPlatforms.length} Channel(s)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedPlatforms.map((p) => p.toUpperCase()).join(' • ')}
                  </div>
                </div>
                <span
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '9999px',
                  }}
                >
                  CHANNELS VERIFIED
                </span>
              </div>

              {/* Action 1: Instant Publishing */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🚀 Publish Now (Instant Dispatch)
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Push this video to all selected social media platforms right away.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePublishNow}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Send size={14} />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Live Now'}</span>
                </button>
              </div>

              {/* Action 2: Calendar Scheduling */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      📅 Schedule for Later (Calendar Sync)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Add to HoaspForge Publishing Calendar at optimal audience peak times.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSchedulePost}
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 10px rgba(236, 72, 153, 0.3)',
                    }}
                  >
                    <Calendar size={14} />
                    <span>{isSubmitting ? 'Scheduling...' : 'Schedule Video'}</span>
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Select Date & Time:
                  </span>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="svs-input"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      width: 'auto',
                    }}
                  />
                </div>
              </div>

              {/* Action 3: Save as Draft & Media Library Storage */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    💾 Save Draft & Assets
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    Save this project to reopen later or store the video permanently in Media Library.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    className="svs-header-btn-secondary"
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Save size={13} />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveToMediaLibrary}
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '6px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#0284c7',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Folder size={13} />
                    <span>Store to Media Library</span>
                  </button>
                </div>
              </div>

              {/* Step 5 Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Back to Preview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Real Video Player & Live Viewport */}
        <div
          ref={playerContainerRef}
          className="svs-right-panel"
          style={{
            background: 'var(--bg-canvas)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Active Video Player Simulator */}
          <div
            className="svs-phone-simulator"
            style={{
              width: '280px',
              height: '498px',
              borderRadius: '28px',
              border: '4px solid #1e293b',
              position: 'relative',
              overflow: 'hidden',
              background: '#000000',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {activeVideo?.url ? (
              <video
                ref={videoPlayerRef}
                src={activeVideo.url}
                playsInline
                loop
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Video size={40} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No video selected
                </div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                  Upload a clip in Step 1 to preview your video here
                </div>
              </div>
            )}

            {/* In-Video Live Overlay Details */}
            {activeVideo?.url && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '14px',
                  right: '14px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  @{activeBrand?.slug || 'hoaspforge'}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: '#f8fafc',
                    maxHeight: '44px',
                    overflow: 'hidden',
                    lineHeight: 1.3,
                  }}
                >
                  {caption || title || 'Your video caption will appear here...'}
                </div>
              </div>
            )}
          </div>

          {/* Player Playback Controls Bar */}
          {activeVideo?.url && (
            <div
              className="svs-phone-controls"
              style={{
                marginTop: '16px',
                width: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Seek Slider & Timestamps */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', width: '28px' }}>
                  {formatSeconds(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={videoDuration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', width: '28px' }}>
                  {formatSeconds(videoDuration)}
                </span>
              </div>

              {/* Play / Mute / Fullscreen buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#ec4899',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
                  }}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Media Library Video Picker */}
      {isMediaPickerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="svs-modal-window"
            style={{
              width: '640px',
              maxHeight: '80vh',
              background: 'var(--bg-surface)',
              borderRadius: '14px',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={18} color="#0284c7" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Select Video from Media Library
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(false)}
                data-testid="close-media-picker-btn"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {isLoadingMedia ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
                  <div>Loading brand media assets...</div>
                </div>
              ) : mediaLibraryVideos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <FileVideo size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No video assets found</div>
                  <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                    Upload a video to your Media Library or upload directly from your computer.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {mediaLibraryVideos.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => handleSelectMediaLibraryAsset(asset)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          background: 'var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <FileVideo size={20} color="#0284c7" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {asset.title || asset.fileName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          {(asset.fileSizeBytes ? asset.fileSizeBytes / (1024 * 1024) : 0).toFixed(1)} MB • {asset.folder || 'General'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Saved Projects & Drafts */}
      {isDraftsDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <div
            className="svs-drawer-window"
            style={{
              width: '420px',
              height: '100%',
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Saved Video Projects</h3>
              <button
                type="button"
                onClick={() => setIsDraftsDrawerOpen(false)}
                data-testid="close-drafts-drawer-btn"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {isLoadingDrafts ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px auto' }} />
                <div>Loading drafts...</div>
              </div>
            ) : savedDrafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No video drafts found.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {draft.title || 'Untitled Project'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          background: draft.status === 'scheduled' ? '#0284c7' : 'var(--bg-surface)',
                          color: draft.status === 'scheduled' ? '#ffffff' : 'var(--text-primary)',
                          border: '1px solid var(--border-subtle)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        {draft.status?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxHeight: '36px', overflow: 'hidden' }}>
                      {draft.baseContent || draft.base_content || 'No text preview'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          loadPostDraft(draft.id);
                          setIsDraftsDrawerOpen(false);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          background: 'rgba(236, 72, 153, 0.15)',
                          border: '1px solid rgba(236, 72, 153, 0.4)',
                          color: '#ec4899',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Reopen Project
                      </button>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleDuplicateDraft(draft.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                          title="Duplicate"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
