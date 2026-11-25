export type ChurnRiskTier = 'low' | 'medium' | 'high' | 'critical';

export type PrimaryRiskFactor =
  | 'low_usage'
  | 'payment_delinquency'
  | 'seat_underutilization'
  | 'negative_sentiment'
  | 'inactivity'
  | 'api_quota_saturation';

export type EngagementTrend = 'improving' | 'stable' | 'declining' | 'steep_drop';

export interface TenantChurnScore {
  id: string;
  tenantId: string;
  tenantName?: string;
  churnRiskScore: number; // 0.00 to 100.00
  riskTier: ChurnRiskTier;
  primaryRiskFactor: PrimaryRiskFactor;
  usageVelocityScore: number; // 0.00 to 100.00
  seatUtilizationPercent: number; // 0.00 to 100.00
  billingHealthScore: number; // 0.00 to 100.00
  engagementTrend: EngagementTrend;
  predictedChurnDate?: string | null;
  confidenceScore: number; // 0.00 to 1.00
  signalsJson: Record<string, unknown>;
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpansionTier = 'modest' | 'high' | 'enterprise_transformational';

export interface UpsellRecommendation {
  title: string;
  addonKey: string;
  estimatedMrrImpact: number;
  readinessScore: number; // 0 to 100
  rationale: string;
}

export interface CustomerLtvMetric {
  id: string;
  tenantId: string;
  tenantName?: string;
  currentMrr: number;
  historicalRevenueTotal: number;
  predictedLtvMonths: number;
  projectedLtvTotal: number;
  expansionPotentialScore: number; // 0 to 100
  expansionTier: ExpansionTier;
  upsellRecommendations: UpsellRecommendation[];
  evaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type InterventionPlaybookType =
  | 'executive_sponsor_outreach'
  | 'proactive_training_session'
  | 'discount_incentive'
  | 'usage_remediation'
  | 'feature_walkthrough'
  | 'custom_qbr';

export type InterventionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed';

export type InterventionPriority = 'low' | 'medium' | 'high' | 'urgent';

export type OutcomeEffectiveness = 'retained' | 'expanded' | 'churned_anyway' | 'neutral';

export interface CustomerSuccessIntervention {
  id: string;
  tenantId: string;
  tenantName?: string;
  churnScoreId?: string | null;
  title: string;
  playbookType: InterventionPlaybookType;
  status: InterventionStatus;
  priority: InterventionPriority;
  assignedTo: string;
  triggerReason: string;
  resolutionNotes?: string | null;
  outcomeEffectiveness?: OutcomeEffectiveness | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueIntelligenceTelemetry {
  totalMonitoredTenants: number;
  averageChurnRisk: number;
  criticalRiskTenants: number;
  highRiskTenants: number;
  totalProjectedLtv: number;
  totalCurrentMrr: number;
  netExpansionPipelineMrr: number;
  activeInterventionsCount: number;
  retentionSuccessRate: number;
  riskDistribution: Record<ChurnRiskTier, number>;
  topRiskFactors: Array<{ factor: PrimaryRiskFactor; count: number; impactMrr: number }>;
}

export interface AssessTenantRiskRequest {
  tenantId: string;
  forceReevaluation?: boolean;
}

export interface CreateInterventionRequest {
  tenantId: string;
  churnScoreId?: string | null;
  title: string;
  playbookType: InterventionPlaybookType;
  priority?: InterventionPriority;
  assignedTo: string;
  triggerReason: string;
  dueDate?: string | null;
}

export interface UpdateInterventionRequest {
  status?: InterventionStatus;
  priority?: InterventionPriority;
  assignedTo?: string;
  resolutionNotes?: string | null;
  outcomeEffectiveness?: OutcomeEffectiveness | null;
}

export interface PredictiveSimulationRequest {
  usageVelocityDelta: number; // e.g. -20% or +30%
  seatUtilizationDelta: number;
  billingHealthDelta: number;
  discountIncentiveApplied?: boolean;
  trainingSessionCompleted?: boolean;
}

export interface PredictiveSimulationResponse {
  simulatedRiskScore: number;
  simulatedRiskTier: ChurnRiskTier;
  simulatedLtvMonths: number;
  projectedLtvTotal: number;
  projectedMrrVariance: number;
  preventedChurnProbability: number;
  recommendations: string[];
}
