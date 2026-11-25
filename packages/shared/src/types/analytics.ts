export type TelemetryPlatform =
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'x'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'youtube_shorts'
  | string;

export interface AnalyticsMetricSnapshot {
  id: string;
  tenantId: string;
  brandId: string;
  platform: string;
  postId?: string | null;
  metricDate: string;
  impressions: number;
  reach: number;
  engagements: number;
  clicks: number;
  shares: number;
  comments: number;
  likes: number;
  rawPayload?: Record<string, unknown>;
  createdAt: Date;
}

export interface NormalizedTelemetry {
  platform: TelemetryPlatform;
  remotePostId: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves?: number;
  videoViews?: number;
  watchTimeSeconds?: number;
  engagement: number;
  engagementRate: number; // e.g. 5.42 (%)
  ctr: number; // e.g. 2.15 (%)
  velocityScore: number; // engagements per hour since published
  roi?: number;
  rawMetrics: Record<string, any>;
}

export type WinnerType =
  | 'statistical_outperformer'
  | 'velocity_surge'
  | 'creative_angle_winner'
  | 'high_conversion';

export interface WinningAttributes {
  hookStyle?: string;
  hookHeadline?: string;
  primaryAngle?: string;
  ctaText?: string;
  tone?: string;
  emojisUsed?: string[];
  hashtags?: string[];
  visualFormat?: string;
  aspectRatio?: string;
  contentLength?: number;
}

export interface BrandBaselineBenchmark {
  brandId: string;
  samplePostCount: number;
  avgEngagementRate: number; // %
  avgImpressions: number;
  avgVelocity: number; // engagements/hour
  avgCtr: number; // %
  platformBaselines: Record<string, { avgEngagementRate: number; avgImpressions: number }>;
  calculatedAt: string;
}

export interface AnalyticsWinner {
  id: string;
  tenantId: string;
  brandId: string;
  postId: string;
  postVariantId: string;
  platform: string;
  remotePostId?: string | null;
  winnerType: WinnerType;
  score: number;
  liftMultiplier: number; // e.g. 2.8x
  baselineBenchmark?: BrandBaselineBenchmark | Record<string, any> | null;
  metricsSnapshot: NormalizedTelemetry | Record<string, any>;
  winningAttributes?: WinningAttributes | null;
  automationDispatched: boolean;
  automationRunId?: string | null;
  detectedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type InsightType =
  | 'hook_strategy'
  | 'creative_angle'
  | 'cta_pattern'
  | 'hashtag_affinity'
  | 'posting_window'
  | 'format_performance';

export interface BrandLearningInsight {
  id: string;
  tenantId: string;
  brandId: string;
  insightType: InsightType;
  title: string;
  summary: string;
  confidence: number;
  sampleSize: number;
  performanceLift: number; // %
  recommendedAction?: string | null;
  metadata?: Record<string, any> | null;
  appliedToBrandBrain: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LearnedPromptContext {
  brandId: string;
  winningHooks: string[];
  winningCTAs: string[];
  highPerformingHashtags: string[];
  toneRecommendations: string[];
  formatInsights: string[];
  summaryGuideline: string;
}
