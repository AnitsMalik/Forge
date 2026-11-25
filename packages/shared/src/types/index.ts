// User & Tenancy Types
export type TenantRole =
  | 'owner'
  | 'admin'
  | 'agency_admin'
  | 'editor'
  | 'brand_manager'
  | 'creator'
  | 'client_approver'
  | 'viewer';
export type BrandRole = 'brand_manager' | 'creator' | 'client_approver' | 'analyst';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: 'trial' | 'standard' | 'agency_pro' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: Date;
  updatedAt: Date;
}

// Brand & Brand Kit Types
export interface Brand {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  industry?: string | null;
  websiteUrl?: string | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface BrandFonts {
  heading: string;
  body: string;
}

export interface ToneOfVoice {
  formality: 'casual' | 'approachable' | 'professional' | 'authoritative' | 'playful';
  descriptors: string[];
}

export interface BrandKit {
  id: string;
  brandId: string;
  toneOfVoice: ToneOfVoice;
  targetAudiences: string[];
  primaryColors: BrandColors;
  fonts: BrandFonts;
  logoUrls: {
    primary?: string | null;
    icon?: string | null;
    darkMode?: string | null;
  };
  hashtagsDefault: string[];
  disclaimers?: string | null;
  tabooWords: string[];
  guidelines?: string | null;
  updatedAt: Date;
}

// ============================================================================
// 16-DIMENSION BRAND BRAIN & WEBSITE EXTRACTION TYPES
// ============================================================================

export interface BrandBrainProduct {
  id?: string;
  name: string;
  description: string;
  price?: string;
  category?: string;
  url?: string;
}

export interface BrandBrainServiceOffering {
  id?: string;
  name: string;
  description: string;
  deliverables?: string[];
}

export interface BrandBrainBusinessProfile {
  name: string;
  tagline?: string;
  description: string;
  industry: string;
  mission?: string;
  websiteUrl?: string;
}

export interface BrandBrainTargetAudience {
  primary: string;
  demographics: string[];
  icpDescription?: string;
}

export interface BrandBrainTone {
  formality: 'casual' | 'approachable' | 'professional' | 'authoritative' | 'playful';
  descriptors: string[];
  personalityTraits?: string[];
}

export interface BrandBrainWritingStyle {
  guidelines: string;
  sentenceStructure?: 'short_punchy' | 'balanced' | 'elaborate';
  vocabularyLevel?: 'accessible' | 'technical' | 'elevated';
  pointOfView?: 'first_person_plural' | 'first_person_singular' | 'second_person' | 'third_person';
}

export interface BrandBrainEmojiPreferences {
  usage: 'none' | 'minimal' | 'moderate' | 'heavy';
  signatureEmojis: string[];
  rules?: string;
}

export interface BrandBrainHashtagPreferences {
  brandTag: string;
  defaultTags: string[];
  bannedTags: string[];
  maxCount: number;
}

export interface BrandBrainVisualIdentity {
  colors: BrandColors;
  fonts: BrandFonts;
  logoUrls: {
    primary?: string | null;
    icon?: string | null;
    darkMode?: string | null;
  };
}

export interface BrandBrainContentPillar {
  id?: string;
  title: string;
  description: string;
  weightPercentage?: number;
  sampleTopics: string[];
}

export interface BrandBrain {
  id?: string;
  brandId: string;
  businessProfile: BrandBrainBusinessProfile;
  products: BrandBrainProduct[];
  services: BrandBrainServiceOffering[];
  usps: string[];
  targetAudience: BrandBrainTargetAudience;
  painPoints: string[];
  brandValues: string[];
  tone: BrandBrainTone;
  writingStyle: BrandBrainWritingStyle;
  languages: string[];
  ctaPreferences: string[];
  emojiPreferences: BrandBrainEmojiPreferences;
  hashtagPreferences: BrandBrainHashtagPreferences;
  topicsToAvoid: string[];
  visualIdentity: BrandBrainVisualIdentity;
  contentPillars: BrandBrainContentPillar[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface WebsiteExtractionRequest {
  url: string;
}

export interface WebsiteExtractionPublicPricing {
  planOrProduct: string;
  price: string;
  billingCycle?: string;
  features?: string[];
}

export interface WebsiteExtractionResult {
  businessDescription: string;
  products: Array<{ name: string; description: string; price?: string; category?: string }>;
  services: Array<{ name: string; description: string }>;
  usps: string[];
  audience: string;
  importantMessaging: string[];
  publicPricing: WebsiteExtractionPublicPricing[];
  brandValues?: string[];
  toneSuggestions?: { formality: string; descriptors: string[] };
  contentPillarsSuggestions?: string[];
  rawMeta: {
    title: string;
    description: string;
    ogImage?: string;
    canonicalUrl?: string;
  };
  extractedAt: string;
  sourceUrl: string;
}

// Media Asset Types
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaAsset {
  id: string;
  tenantId: string;
  brandId: string;
  storageKey: string;
  publicUrl: string;
  thumbnailUrl?: string | null;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  mediaType: MediaType;
  metadata: {
    width?: number;
    height?: number;
    durationSec?: number;
    aspectRatio?: string;
    fps?: number;
  };
  createdAt: Date;
}

// Post & Multi-Platform Types
export type PostStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'partially_failed'
  | 'failed';

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'x_twitter'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'youtube_shorts'
  | 'pinterest'
  | 'mock_sandbox';

export interface PostVariant {
  id: string;
  postId: string;
  platform: SocialPlatform;
  content: string;
  mediaAssetIds: string[];
  platformSpecificConfig: Record<string, unknown>;
  status: 'pending' | 'published' | 'failed';
  remotePostId?: string | null;
  remotePostUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  tenantId: string;
  brandId: string;
  authorId: string;
  campaignId?: string | null;
  title: string;
  baseContent: string;
  status: PostStatus;
  scheduledFor?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  variants?: PostVariant[];
}

// Approval Workflow Types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  postId: string;
  requestedBy: string;
  reviewerId?: string | null;
  status: ApprovalStatus;
  magicToken?: string | null;
  magicTokenExpiresAt?: Date | null;
  createdAt: Date;
  resolvedAt?: Date | null;
}

export interface ApprovalComment {
  id: string;
  approvalRequestId: string;
  userId?: string | null;
  authorName: string;
  isExternalClient: boolean;
  comment: string;
  createdAt: Date;
}

// Publishing & Telemetry Types
export interface PublishLog {
  id: string;
  postVariantId: string;
  attemptNumber: number;
  status: 'success' | 'retryable_failure' | 'permanent_failure' | 'failed';
  httpStatus?: number | null;
  responsePayload: Record<string, any>;
  errorMessage?: string | null;
  createdAt: Date | string;
  platform?: string;
  postTitle?: string;
  remotePostUrl?: string | null;
}

export interface AnalyticsMetric {
  id: string;
  postVariantId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews: number;
  engagementRate: number;
  recordedAt: Date;
}

// Template Rendering Types
export type TemplateCategory =
  | 'promotion'
  | 'educational'
  | 'product'
  | 'announcement'
  | 'testimonial'
  | 'quote'
  | 'event'
  | 'carousel'
  | 'sale';

export interface DesignTemplate {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  aspectRatio: AspectRatioType | string;
  isBuiltIn: boolean;
  isCustom?: boolean;
  brandId?: string | null;
  tenantId?: string | null;
  background: {
    type: 'solid' | 'gradient' | 'image';
    value: string;
    overlayOpacity?: number;
  };
  layers: any[];
  tags?: string[];
  thumbnailUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: TemplateCategory;
  aspectRatio?: string;
  background: {
    type: 'solid' | 'gradient' | 'image';
    value: string;
    overlayOpacity?: number;
  };
  layers: any[];
  tags?: string[];
  thumbnailUrl?: string | null;
}

export type ImageTemplateType =
  | 'quote_card_modern'
  | 'stat_highlight'
  | 'announcement_banner'
  | 'tip_carousel_cover'
  | string;

export type AspectRatioType =
  | '1:1'
  | '4:5'
  | '1.91:1'
  | '9:16'
  | '16:9'
  | 'instagram_square'
  | 'instagram_portrait'
  | 'instagram_story'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'youtube_thumbnail';

export type DesignPreset =
  | 'instagram_square'
  | 'instagram_portrait'
  | 'instagram_story'
  | 'facebook'
  | 'linkedin'
  | 'x'
  | 'youtube_thumbnail';

export interface DesignPresetConfig {
  id: DesignPreset;
  name: string;
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'X' | 'YouTube';
  width: number;
  height: number;
  aspectRatio: string;
  badge: string;
  description: string;
}

export const DESIGN_PRESETS: Record<DesignPreset, DesignPresetConfig> = {
  instagram_square: {
    id: 'instagram_square',
    name: 'Instagram Square',
    platform: 'Instagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    badge: '1:1',
    description: '1080 × 1080 (1:1 Feed Post)',
  },
  instagram_portrait: {
    id: 'instagram_portrait',
    name: 'Instagram Portrait',
    platform: 'Instagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    badge: '4:5',
    description: '1080 × 1350 (4:5 Feed Post)',
  },
  instagram_story: {
    id: 'instagram_story',
    name: 'Instagram Story',
    platform: 'Instagram',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    badge: '9:16',
    description: '1080 × 1920 (9:16 Story / Reel)',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Post',
    platform: 'Facebook',
    width: 1200,
    height: 630,
    aspectRatio: '1.91:1',
    badge: '1.91:1',
    description: '1200 × 630 (Landscape Feed)',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn Post',
    platform: 'LinkedIn',
    width: 1200,
    height: 627,
    aspectRatio: '1.91:1',
    badge: '1.91:1',
    description: '1200 × 627 (Article / Update)',
  },
  x: {
    id: 'x',
    name: 'X Post',
    platform: 'X',
    width: 1200,
    height: 675,
    aspectRatio: '16:9',
    badge: '16:9',
    description: '1200 × 675 (Card / In-feed)',
  },
  youtube_thumbnail: {
    id: 'youtube_thumbnail',
    name: 'YouTube Thumbnail',
    platform: 'YouTube',
    width: 1280,
    height: 720,
    aspectRatio: '16:9',
    badge: '16:9',
    description: '1280 × 720 (HD Video Thumbnail)',
  },
};


export interface TemplateRenderOptions {
  templateId: ImageTemplateType;
  aspectRatio: AspectRatioType;
  headline?: string;
  subtext?: string;
  metric?: string;
  metricLabel?: string;
  quote?: string;
  author?: string;
  badge?: string;
  brandName?: string;
  brandHandle?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
}

export interface RenderedTemplateResult {
  templateId: ImageTemplateType;
  aspectRatio: AspectRatioType;
  svg: string;
  dataUri: string;
  width: number;
  height: number;
}

export type AnalyticsTimeRange = '7d' | '14d' | '30d' | '90d' | 'all';

export interface AnalyticsTimeSeriesPoint {
  date: string;
  timestamp: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews: number;
  engagementRate: number;
}

export interface PlatformMetricStats {
  postsCount: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews: number;
  engagementRate: number;
  shareOfVoice: number; // percentage of total impressions
}

export interface ContentFormatStats {
  format: 'video_reel' | 'image_template' | 'carousel' | 'text';
  label: string;
  postsCount: number;
  impressions: number;
  avgEngagementRate: number;
  totalLikes: number;
}

export interface TopPostMetric {
  postId: string;
  title: string;
  publishedAt: string;
  platforms: string[];
  mediaType?: 'image' | 'video' | 'none';
  thumbnailUrl?: string | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews: number;
  engagementRate: number;
}

export interface AnalyticsOverview {
  overview: {
    totalImpressions: number;
    totalReach: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalClicks: number;
    totalVideoViews: number;
    averageEngagementRate: number;
    totalPublishedVariants: number;
    growthVsLastPeriod: {
      reachPercent: number;
      impressionsPercent: number;
      engagementsPercent: number;
    };
  };
  timeSeries: AnalyticsTimeSeriesPoint[];
  platformBreakdown: Record<string, PlatformMetricStats>;
  formatBreakdown: ContentFormatStats[];
  topPosts: TopPostMetric[];
  timeRange: AnalyticsTimeRange;
}

export interface PostAnalyticsDetail {
  post: {
    id: string;
    brandId: string;
    title: string;
    baseContent: string;
    status: string;
    publishedAt: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
    thumbnailUrl?: string | null;
  };
  aggregate: {
    impressions: number;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    videoViews: number;
    engagementRate: number;
  };
  variants: Array<{
    id: string;
    platform: string;
    status: string;
    remotePostId?: string | null;
    remotePostUrl?: string | null;
    metrics: {
      impressions: number;
      reach: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      videoViews: number;
      engagementRate: number;
    };
  }>;
  funnel: {
    impressions: number;
    reach: number;
    engagements: number;
    clicks: number;
    shares: number;
    conversionRate: number;
  };
}

// API Envelope Interfaces
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: {
    timestamp: string;
    page?: number;
    limit?: number;
    total?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: Array<{ field?: string; issue: string }>;
  };
}

// AI Graphic Generator Types
export type AiPosterStyleType =
  | 'modern_gradient'
  | 'minimalist_editorial'
  | 'bold_impact'
  | 'stat_highlight'
  | 'dark_luxe';

export interface AiPosterLayer {
  id: string;
  type: 'text' | 'image' | 'shape' | 'icon';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  backgroundColor?: string;
  backgroundPadding?: number;
  borderRadius?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  shadowColor?: string;
  shadowBlur?: number;
  imageUrl?: string;
  shapeType?: 'rectangle' | 'circle' | 'pill' | 'star' | 'line';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  iconName?: string;
  iconColor?: string;
}

export interface AiPosterGenerateRequest {
  text: string;
  style?: AiPosterStyleType;
  aspectRatio?: AspectRatioType;
  saveToMediaLibrary?: boolean;
  customTopic?: string;
}

export interface AiPosterGenerateResponse {
  headline: string;
  badge: string;
  subtext: string;
  metric?: string;
  metricLabel?: string;
  topic: string;
  style: AiPosterStyleType;
  aspectRatio: AspectRatioType;
  background: {
    type: 'gradient' | 'solid' | 'image';
    value: string;
    overlayOpacity: number;
  };
  layers: AiPosterLayer[];
  svg?: string;
  dataUri?: string;
  asset?: any;
}

// 9:16 Reel & Motion Video Types
export type MotionCaptionStyle =
  | 'kinetic_pop'
  | 'typewriter'
  | 'cinematic_fade'
  | 'karaoke_highlight'
  | 'slide'
  | 'scale';

export interface ReelScene {
  id: string;
  order: number;
  durationSec: number;
  badge?: string;
  headline: string;
  subtext?: string;
  narrationScript?: string;
  accentIcon?: string;
  transition?: 'cut' | 'fade' | 'wipe' | 'zoom' | 'slide';
  animation?: MotionCaptionStyle;
  bgMediaUrl?: string;
  templateCategory?: TemplateCategory;
}

export interface ReelStoryboardRequest {
  text: string;
  customTopic?: string;
  campaignId?: string;
  goal?: string;
  brandVoice?: string;
  targetDurationSec?: 15 | 30 | 60 | number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  visualStyle?: 'cinematic' | 'vibrant' | 'cyberpunk' | 'minimalist' | 'corporate' | string;
  language?: string;
  voiceoverPersona?: string;
  bgMusicId?: string;
}

export interface ReelStoryboardResponse {
  title: string;
  topic: string;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  visualStyle?: string;
  language?: string;
  voiceoverPersona?: string;
  suggestedMotionStyle: MotionCaptionStyle;
  suggestedBgVideoUrl: string;
  suggestedAudioTrackId: string;
  totalDurationSec: number;
  scenes: ReelScene[];
}

export interface ReelRenderRequest {
  brandId?: string;
  templateId?: string;
  title?: string;
  subtext?: string;
  scenes?: ReelScene[];
  motionStyle?: MotionCaptionStyle;
  bgVideoUrl?: string;
  audioTrackId?: string;
  durationSec?: number;
  aspectRatio?: '9:16' | '1:1' | '16:9';
  qualityPreset?: '720p' | '1080p' | '4k';
  visualStyle?: 'cinematic' | 'vibrant' | 'cyberpunk' | 'minimalist' | 'corporate' | string;
  language?: string;
  voiceoverPersona?: string;
  watermarkUrl?: string;
  includeWatermark?: boolean;
  includeOutro?: boolean;
  outroHeadline?: string;
  outroSubtext?: string;
  voiceoverUrl?: string;
  generateVoiceoverTts?: boolean;
  musicVolume?: number;
  voiceoverVolume?: number;
  duckingIntensity?: number;
  burnSubtitles?: boolean;
  campaignId?: string;
  captionStyleConfig?: {
    fontSize?: number;
    fontFamily?: string;
    primaryColorHex?: string;
    outlineColorHex?: string;
    placement?: 'center' | 'bottom';
  };
}

export interface VideoRenderJob {
  jobId: string;
  brandId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  resultAsset?: any;
  error?: string;
  retries?: number;
  requestPayload?: ReelRenderRequest;
  createdAt: Date | string;
  completedAt?: Date | string;
}

export interface RenderedVideoResult {
  jobId?: string;
  assetId: string;
  fileName: string;
  publicUrl: string;
  thumbnailUrl: string;
  durationSec: number;
  width: number;
  height: number;
  fileSizeBytes: number;
  codec: string;
  engineUsed: 'native_ffmpeg' | 'simulated_pipeline';
  filtersApplied: string[];
}


// AI Copywriting & Multi-Platform Repurposing Types
export type AiCopyStyle =
  | 'promotional_launch'
  | 'thought_leadership'
  | 'educational_tips'
  | 'viral_hook';

export interface AiCopyRequest {
  prompt: string;
  style?: AiCopyStyle;
  campaignGoal?: string;
  customTopic?: string;
  includeHashtags?: boolean;
}

export interface PlatformCopyVariant {
  platform: 'instagram' | 'x_twitter' | 'linkedin' | 'tiktok' | 'facebook';
  content: string;
  characterCount: number;
  characterLimit: number;
  hashtags: string[];
  hookTitle: string;
  callToAction: string;
  onScreenTextIdea?: string;
  audioSuggestion?: string;
}

export interface AiCopyResponse {
  topic: string;
  style: AiCopyStyle;
  suggestedTitle: string;
  brandCompliance: {
    passed: boolean;
    tabooWordsDetected: string[];
    tabooWordsScrubbed: string[];
    brandToneMatched: string[];
    disclaimerAppended: boolean;
  };
  variants: Record<'instagram' | 'x_twitter' | 'linkedin' | 'tiktok' | 'facebook' | 'youtube' | 'pinterest', PlatformCopyVariant> & Record<string, PlatformCopyVariant>;
}

export type AiContentType =
  | 'instagram_caption'
  | 'facebook_post'
  | 'linkedin_post'
  | 'x_post'
  | 'x_thread'
  | 'carousel_copy'
  | 'story_copy'
  | 'reel_script'
  | 'short_video_script'
  | 'youtube_description'
  | 'pinterest_pin'
  | 'ad_copy';

export type AiTransformOperation =
  | 'rewrite'
  | 'shorten'
  | 'expand'
  | 'professional'
  | 'friendly'
  | 'funny'
  | 'educational'
  | 'persuasive'
  | 'luxury'
  | 'conversational'
  | 'translate'
  // Legacy aliases for backward compatibility:
  | 'viral'
  | 'engagement_question'
  | 'optimize_hashtags';

export interface AiTransformRequest {
  content: string;
  platform?: 'instagram' | 'x_twitter' | 'linkedin' | 'tiktok' | 'facebook' | string;
  contentType?: AiContentType | string;
  operation: AiTransformOperation;
  targetLanguage?: string;
  customInstruction?: string;
}

export interface AiTransformResponse {
  originalContent: string;
  transformedContent: string;
  operation: AiTransformOperation;
  platform?: string;
  contentType?: string;
  targetLanguage?: string;
  characterCount: number;
}

export interface AiContentGenerateRequest {
  contentType: AiContentType;
  prompt: string;
  style?: string;
  targetAudience?: string;
  keyPoints?: string[];
  callToAction?: string;
  targetLanguage?: string;
}

export interface AiContentGenerateResponse {
  contentType: AiContentType;
  title?: string;
  content: string;
  characterCount: number;
  hashtags?: string[];
  callToAction?: string;
  slidesOrScenes?: Array<{
    number: number;
    headline?: string;
    body: string;
    visualDirection?: string;
  }>;
  brandCompliance?: {
    passed: boolean;
    tabooWordsDetected: string[];
    brandToneMatched: string[];
  };
}

export interface HashtagItem {
  tag: string;
  category: 'high_reach' | 'niche' | 'branded';
  estimatedReach: string;
}

export interface HashtagRecommendation {
  tags: HashtagItem[];
  highReach: string[];
  niche: string[];
  branded: string[];
  recommendedBundle: string;
}

// Phase 7: Social Platform Integrations, Sandbox & Publishing Types
export interface SocialAccount {
  id: string;
  brandId: string;
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  tokenExpiresAt?: Date | string | null;
  isActive: boolean;
  metadata: {
    handle?: string;
    avatarUrl?: string;
    followerCount?: number;
    isSandbox?: boolean;
    profileUrl?: string;
    [key: string]: any;
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface SocialAccountConnectInput {
  platform: SocialPlatform;
  accountName: string;
  accountId: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresInSeconds?: number;
  isSandbox?: boolean;
  handle?: string;
  avatarUrl?: string;
  followerCount?: number;
}

export interface PublishPayload {
  postVariantId: string;
  postId: string;
  brandId: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  platformConfig?: Record<string, any>;
}

export interface PublishResult {
  success: boolean;
  remotePostId: string;
  remotePostUrl: string;
  publishedAt: Date;
  httpStatus: number;
  platform: SocialPlatform;
  rawResponse: Record<string, any>;
  errorMessage?: string | null;
  metaCode?: number;
  metaType?: string;
  safeMessage?: string;
  fbtraceId?: string;
}

export interface MetricSnapshot {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews?: number;
  engagementRate: number;
}

// ==========================================
// AI Campaign Strategy & Generation Types
// ==========================================
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';

export type CampaignGoal =
  // Core 8 Goals:
  | 'awareness'
  | 'engagement'
  | 'leads'
  | 'sales'
  | 'traffic'
  | 'launch'
  | 'promotion'
  | 'education'
  // Legacy backward compatibility:
  | 'product_launch'
  | 'seasonal_promo'
  | 'brand_awareness'
  | 'thought_leadership'
  | 'lead_generation'
  | 'event_announcement';

export type CampaignDuration =
  // Core Durations:
  | '3_days'
  | '7_days'
  | '14_days'
  | '30_days'
  | 'custom'
  // Legacy backward compatibility:
  | '3_day_sprint'
  | '7_day_arc'
  | '14_day_nurture';

export type CampaignPlatform = 'instagram' | 'facebook' | 'linkedin' | 'x' | 'x_twitter' | 'tiktok';

export type CampaignArcStage =
  | 'hook_teaser'
  | 'problem_solution'
  | 'value_education'
  | 'social_proof'
  | 'urgency_offer'
  | 'community_engagement'
  | 'deep_dive';

export interface CampaignStrategyPost {
  sequenceNumber: number;
  stage: CampaignArcStage;
  stageTitle: string;
  conceptSummary: string;
  targetDayOffset: number;
  suggestedFormat: 'carousel_graphic' | 'reel_video' | 'single_image' | 'thought_text';
  suggestedHeadline: string;
  copyBrief: string;
  callToAction: string;
  platforms?: CampaignPlatform[];
  postId?: string;
}

export interface ContentPillar {
  title: string;
  description: string;
  percentage?: number;
}

export interface ContentMixItem {
  formatOrType: string;
  percentage: number;
}

export interface HashtagStrategyGroup {
  category: 'branded' | 'industry' | 'niche' | 'trending';
  label: string;
  tags: string[];
}

export interface CampaignStrategy {
  businessIdea: string;
  campaignGoal: CampaignGoal;
  duration: CampaignDuration;
  customDays?: number;
  platforms?: CampaignPlatform[];

  // 12 Core Generated Strategy Dimensions:
  campaignName: string;
  campaignObjective: string;
  targetAudience: string;
  coreMessage: string;
  campaignStrategy: string;
  contentPillars: ContentPillar[];
  contentMix: ContentMixItem[];
  postingFrequency: string;
  contentIdeas: string[];
  recommendedFormats: string[];
  ctaStrategy: {
    primary: string;
    secondary?: string;
    funnelOverview?: string;
  };
  hashtagStrategy: HashtagStrategyGroup[];

  // Legacy mappings for backwards compatibility:
  narrativeArc?: string;
  targetAudienceFocus?: string;
  primaryKpi?: string;

  // Generated Content Plan (Multi-Post Sequence)
  posts: CampaignStrategyPost[];
}

export interface Campaign {
  id: string;
  brandId: string;
  brandName?: string;
  name: string;
  description?: string | null;
  goal?: CampaignGoal | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status: CampaignStatus | string;
  campaignType?: 'organic' | 'paid' | 'hybrid' | string;
  strategy?: CampaignStrategy | null;
  postCount?: number;
  publishedCount?: number;
  scheduledCount?: number;
  audience?: any;
  paidConfig?: any;
  kpiTarget?: {
    metric: string;
    target: number;
    actual: number;
    unit?: string;
  };
  forecast?: {
    min: number;
    expected: number;
    max: number;
    confidence: number;
    isForecast?: boolean;
    disclaimer?: string;
  };
  connections?: {
    automationsCount?: number;
    templatesCount?: number;
    approvalRequired?: boolean;
    publishingJobsCount?: number;
    analyticsTracking?: boolean;
    growthRecommendationsLinked?: boolean;
  };
  posts?: any[];
  createdAt: Date | string;
  updatedAt?: Date | string | null;
}

export interface CreateCampaignStrategyInput {
  businessIdea: string;
  campaignGoal: CampaignGoal;
  duration: CampaignDuration;
  customDays?: number;
  platforms?: CampaignPlatform[];
  name?: string;
}

export interface GenerateCampaignInput {
  businessIdea: string;
  campaignGoal: CampaignGoal;
  duration: CampaignDuration;
  customDays?: number;
  platforms?: CampaignPlatform[];
  name?: string;
  startDate?: string;
  strategy?: CampaignStrategy;
}

export interface BatchScheduleCampaignInput {
  startDate: string;
  dailyTime?: string;
}

// ============================================================================
// META GRAPH API INTEGRATION & UNIFIED PUBLISHING TYPES
// ============================================================================

export type MetaConnectionStatus = 'connected' | 'expired' | 'error' | 'disconnected';

export interface MetaConnection {
  id: string;
  tenantId: string;
  brandId: string;
  userId: string;
  provider: 'meta';
  metaUserId?: string | null;
  selectedPageId?: string | null;
  selectedPageName?: string | null;
  instagramAccountId?: string | null;
  instagramUsername?: string | null;
  credentialExpiresAt?: Date | string | null;
  scopes?: string[];
  status: MetaConnectionStatus;
  requireApprovalBeforePublish: boolean;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface MetaFacebookPage {
  id: string;
  name: string;
  category?: string | null;
  pictureUrl?: string | null;
  tasks?: string[];
  hasInstagram: boolean;
  instagramAccount?: {
    id: string;
    username: string;
    name?: string | null;
    profilePictureUrl?: string | null;
    followersCount?: number;
  } | null;
  isSelected?: boolean;
}

export interface MetaInstagramAccount {
  id: string;
  username: string;
  name?: string | null;
  profilePictureUrl?: string | null;
  followersCount?: number;
  isEligible: boolean;
  connectedPageId: string;
  connectedPageName: string;
}

export type PublishingJobStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'sandbox'
  | 'failed'
  | 'cancelled';

export interface PublishingJob {
  id: string;
  tenantId: string;
  brandId: string;
  userId: string;
  connectionId?: string | null;
  platform: SocialPlatform;
  accountId: string;
  contentId?: string | null;
  postId?: string | null;
  scheduledAt?: Date | string | null;
  status: PublishingJobStatus;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt?: Date | string | null;
  externalPostId?: string | null;
  externalPostUrl?: string | null;
  lastError?: string | null;
  payload?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PublishingAuditLog {
  id: string;
  tenantId: string;
  brandId: string;
  userId: string;
  agentId?: string | null;
  platform: string;
  accountId: string;
  action: string;
  contentId?: string | null;
  timestamp: Date | string;
  result: 'success' | 'failure' | 'pending';
  externalId?: string | null;
  error?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date | string;
}

export type MetaErrorCode =
  | 'META_AUTH_REQUIRED'
  | 'META_TOKEN_EXPIRED'
  | 'META_PERMISSION_DENIED'
  | 'META_PAGE_NOT_FOUND'
  | 'META_INSTAGRAM_NOT_CONNECTED'
  | 'META_MEDIA_INVALID'
  | 'META_MEDIA_PROCESSING'
  | 'META_RATE_LIMIT'
  | 'META_API_ERROR'
  | 'META_OWNERSHIP_CONFLICT'
  | 'DUPLICATE_PUBLISHING_ATTEMPT'
  | 'TENANT_ISOLATION_VIOLATION'
  | 'BRAND_NOT_FOUND';

export interface MetaPublishPayload {
  platform: 'facebook' | 'instagram';
  accountId: string;
  text?: string;
  caption?: string;
  mediaUrls?: string[];
  scheduledAt?: Date | string | null;
  requireApproval?: boolean;
  brandId?: string;
  postId?: string;
  postVariantId?: string;
}

export interface MetaPublishResult {
  success: boolean;
  externalPostId?: string;
  externalPostUrl?: string;
  publishedAt: Date;
  status: PublishingJobStatus;
  httpStatus?: number;
  rawResponse?: any;
  errorMessage?: string | null;
  isTransient?: boolean;
  retryAfterSeconds?: number;
  metaCode?: number;
  metaType?: string;
  safeMessage?: string;
  fbtraceId?: string;
}

// SaaS Billing Dunning & Notification Types
export type DunningEventType =
  | 'payment_failed'
  | 'grace_warning_day1'
  | 'grace_warning_day3'
  | 'grace_expired_suspension'
  | 'payment_recovered'
  | 'renewal_receipt'
  | 'cancellation_notice';

export type DunningEventStatus = 'pending' | 'sent' | 'failed' | 'resolved';

export interface BillingDunningEvent {
  id: string;
  tenantId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  eventType: DunningEventType;
  stage: number;
  status: DunningEventStatus;
  recipientEmail: string;
  subject: string;
  payload?: Record<string, any> | null;
  errorMessage?: string | null;
  createdAt: string | Date;
  sentAt?: string | Date | null;
}

export type BillingNotificationType =
  | 'billing_past_due'
  | 'payment_failed'
  | 'renewal_success'
  | 'grace_warning'
  | 'account_suspended'
  | 'usage_limit_warning'
  | 'usage_limit_critical'
  | 'usage_limit_exceeded';

export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'success';

export interface BillingNotification {
  id: string;
  tenantId: string;
  userId?: string | null;
  type: BillingNotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  actionUrl?: string | null;
  actionLabel?: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string | Date;
  expiresAt?: string | Date | null;
}

export interface DunningStatusResponse {
  isPastDue: boolean;
  isInGracePeriod: boolean;
  graceDaysTotal: number;
  daysRemaining: number;
  pastDueSince: string | null;
  graceExpiresAt: string | null;
  currentPlanName: string;
  subscriptionStatus: string;
  latestInvoice?: {
    id: string;
    amount: number;
    currency: string;
    paid: boolean;
    hostedInvoiceUrl?: string | null;
  } | null;
  activeNotifications: BillingNotification[];
}

export * from './connection.js';
export * from './automation.js';
export * from './template.js';
export * from './agent.js';
export * from './campaign.js';
export * from './analytics.js';
export * from './superadmin.js';
export * from './incidentAlerts.js';
export * from './compliance.js';
export * from './socialWebhooks.js';
export * from './slaStatus.js';
export * from './disasterRecovery.js';
export * from './outboundWebhooks.js';
export * from './enterpriseSso.js';
export * from './scim.js';
export * from './revenueIntelligence.js';
export * from './apiGateway.js';
