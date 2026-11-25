export interface BrandPerformanceBaseline {
  id: string;
  tenantId: string;
  brandId: string;
  platform: string;
  period: '7d' | '30d' | '90d' | '365d' | string;
  postCount: number;
  avgImpressions: number;
  avgReach: number;
  avgEngagements: number;
  avgEngagementRate: number;
  avgShares: number;
  avgComments: number;
  avgSaves: number;
  avgClicks: number;
  avgVelocityScore: number;
  avgHalfLifeHours: number;
  calculatedAt: Date | string;
  metadata?: Record<string, any>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type GrowthRecommendationCategory =
  | 'hook_optimization'
  | 'timing_window'
  | 'format_adaptation'
  | 'topic_opportunity'
  | 'audience_fatigue'
  | 'cta_optimization'
  | 'cross_channel_repurposing'
  | 'goal_gap';

export type GrowthRecommendationSeverity = 'positive' | 'moderate' | 'critical';
export type GrowthRecommendationStatus = 'active' | 'applied' | 'dismissed';

export interface GrowthRecommendation {
  id: string;
  tenantId: string;
  brandId: string;
  category: GrowthRecommendationCategory;
  title: string;
  description: string;
  suggestedAction: string;
  targetType: 'automation' | 'template' | 'campaign' | 'calendar' | 'repurposing' | string;
  targetId?: string | null;
  confidenceScore: number; // 0.0 - 1.0
  estimatedLiftPct: number; // e.g. 34.5 (%)
  severity: GrowthRecommendationSeverity;
  status: GrowthRecommendationStatus;
  appliedAt?: Date | string | null;
  appliedByUserId?: string | null;
  rationale?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ExperimentVariantType = 'hook' | 'format' | 'timing' | 'cta' | 'creative';
export type ExperimentStatus = 'draft' | 'running' | 'concluded' | 'promoted';

export interface ExperimentVariant {
  id: string;
  tenantId: string;
  brandId: string;
  experimentId: string;
  experimentName: string;
  hypothesis?: string | null;
  variantLetter: string; // 'A', 'B', etc.
  variantType: ExperimentVariantType;
  postVariantId?: string | null;
  sampleSize: number;
  engagements: number;
  impressions: number;
  conversions: number;
  conversionRate: number;
  engagementRate: number;
  liftVsControlPct: number;
  pValue?: number | null;
  confidenceLevel: number;
  isWinner: boolean;
  status: ExperimentStatus;
  concludedAt?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EngagementHalfLifeResult {
  platform: string;
  publishedAt: Date | string;
  currentEngagements: number;
  hoursElapsed: number;
  expectedHalfLifeHours: number;
  decayLambda: number;
  expectedRemainingVelocity: number;
  isVelocityAnomaly: boolean;
  anomalyRatio: number;
}

export interface LiftEstimateResult {
  empiricalLiftPct: number;
  bayesianExpectedLiftPct: number;
  credibleIntervalLowerPct: number;
  credibleIntervalUpperPct: number;
  confidenceScore: number;
  statisticallySignificant: boolean;
}

export interface MultiPeriodBaselineSnapshot {
  brandId: string;
  tenantId: string;
  platform: string;
  allowedRetentionDays: number;
  baselines: Record<string, BrandPerformanceBaseline>;
  calculatedAt: string;
}

// Stage 10: Growth Intelligence Models & Pipeline Types

export interface BrandGoal {
  id: string;
  tenantId: string;
  brandId: string;
  metric: 'impressions' | 'engagements' | 'engagement_rate' | 'reach' | 'clicks' | 'posts_count' | string;
  targetValue: number;
  period: '7d' | '30d' | '90d' | '365d' | 'monthly' | string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type GoalPacingStatus = 'exceeding' | 'on_track' | 'behind' | 'critical_gap';
export type GoalTrajectory = 'improving' | 'stable' | 'declining';

export interface GoalGapItem {
  metric: string;
  target: number;
  actual: number;
  gap: number; // actual - target
  gapPct: number; // ((actual - target) / target) * 100
  status: GoalPacingStatus;
  trajectory: GoalTrajectory;
  projectedPeriodEnd: number;
}

export interface GoalGapAnalysis {
  tenantId: string;
  brandId: string;
  period: string;
  items: GoalGapItem[];
  overallHealth: 'excellent' | 'healthy' | 'at_risk' | 'lagging';
  calculatedAt: string;
}

export interface MetricProvenance {
  provider: string; // 'meta' | 'facebook' | 'instagram' | 'twitter' | 'linkedin'
  providerPostId: string;
  fetchedAt: string;
  rawResponseHash?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
  lastSuccessAt?: string;
  source: 'provider_api' | 'cached_snapshot';
  consecutiveFailures?: number;
}

export interface ContentPerformanceItem {
  postId: string;
  postVariantId: string;
  title: string;
  format: string;
  platform: string;
  publishedAt: string;
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: number;
  velocityScore: number;
  isWinner: boolean;
  provenance?: MetricProvenance;
}

export interface FormatPerformanceBreakdown {
  format: string; // 'static_image' | 'carousel' | 'video_reel' | 'kinetic_reel' | 'text_post' | 'story'
  postCount: number;
  avgImpressions: number;
  avgReach: number;
  avgEngagements: number;
  avgEngagementRate: number;
  liftVsBaselinePct: number;
}

export interface TopicPerformanceBreakdown {
  topic: string; // 'product_promotion' | 'educational_tips' | 'company_culture' | 'industry_news' | 'customer_story'
  postCount: number;
  avgEngagementRate: number;
  avgImpressions: number;
  liftVsBaselinePct: number;
}

export interface HookPerformanceBreakdown {
  hookStyle: string; // 'curiosity_question' | 'bold_claim' | 'how_to' | 'surprising_stat' | 'storytelling' | 'direct_statement'
  postCount: number;
  avgEngagementRate: number;
  decayHalfLifeHours: number;
  liftVsBaselinePct: number;
}

export interface CtaPerformanceBreakdown {
  ctaStyle: string; // 'shop_now' | 'learn_more' | 'comment_below' | 'share_thought' | 'sign_up' | 'save_for_later'
  postCount: number;
  avgClicks: number;
  avgCtr: number;
  avgEngagementRate: number;
  liftVsBaselinePct: number;
}

export interface TimingPerformanceBreakdown {
  dayOfWeek: number; // 0-6
  dayName: string;
  hourOfDay: number; // 0-23
  timeSlot: string; // e.g. "Tuesday 08:30–09:15 AM"
  avgVelocityScore: number;
  avgEngagementRate: number;
  sampleCount: number;
  isPeakWindow: boolean;
}

export interface DimensionPerformanceReport {
  brandId: string;
  tenantId: string;
  period: string;
  content: ContentPerformanceItem[];
  formats: FormatPerformanceBreakdown[];
  topics: TopicPerformanceBreakdown[];
  hooks: HookPerformanceBreakdown[];
  ctas: CtaPerformanceBreakdown[];
  timing: TimingPerformanceBreakdown[];
  calculatedAt: string;
}

export interface MetricForecastRange {
  metric: string;
  period: string;
  historicalValue: number;
  min: number; // lower bound of credible interval (p10)
  expected: number; // 50th percentile / expected value
  max: number; // upper bound of credible interval (p90)
  confidence: number; // 0.0 - 1.0 (e.g. 0.85)
  credibleIntervalLower: number;
  credibleIntervalUpper: number;
  isForecast: true; // Clearly distinguished from actual performance
  horizonDays: number;
  model: string;
}

export interface GrowthForecastReport {
  brandId: string;
  tenantId: string;
  forecasts: MetricForecastRange[];
  generatedAt: string;
}

export interface CrossChannelRepurposingRecommendation {
  id: string;
  tenantId: string;
  brandId: string;
  sourcePostId: string;
  sourceVariantId: string;
  sourcePlatform: string;
  sourceFormat: string;
  targetPlatform: string;
  targetFormat: string;
  winningFactor: string;
  adaptationGuide: string;
  estimatedPotentialLiftPct: number;
  confidenceScore: number;
  status: 'suggested' | 'created' | 'dismissed';
  createdAt: Date | string;
}

export interface AnalyticsPipelineResult {
  publishedPostsProcessed: number;
  snapshotsUpdated: number;
  snapshotsPreservedOnFailure: number;
  timeSeriesMetricsRecorded: number;
  goalGaps: GoalGapAnalysis;
  dimensionPerformance: DimensionPerformanceReport;
  forecastRanges: GrowthForecastReport;
  winnersDetected: number;
  recommendationsGenerated: number;
  repurposingSuggestions: CrossChannelRepurposingRecommendation[];
}
