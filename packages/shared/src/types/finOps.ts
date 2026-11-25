export type CloudProvider =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'cloudflare'
  | 'openai_anthropic';

export type FinOpsResourceType =
  | 'compute_container'
  | 'database_aurora'
  | 'vector_database'
  | 'redis_cache'
  | 'storage_s3'
  | 'cdn_egress'
  | 'ai_tokens';

export type CostCategory =
  | 'core_platform'
  | 'tenant_workload'
  | 'ai_inference'
  | 'media_storage'
  | 'edge_traffic';

export type RightsizingAction =
  | 'downsize_instance'
  | 'reserve_commitments'
  | 'idle_termination'
  | 'storage_tiering'
  | 'cache_ttl_expansion';

export type RightsizingStatus =
  | 'pending'
  | 'applied'
  | 'dismissed';

export interface CloudCostAccount {
  id: string;
  provider: CloudProvider;
  account_id: string;
  account_name: string;
  currency: string;
  monthly_budget: number;
  current_month_spend: number;
  status: 'active' | 'warning_budget' | 'exceeded_budget';
  created_at: string;
  updated_at: string;
}

export interface TenantCostAttribution {
  id: string;
  tenant_id: string;
  tenant_name: string;
  reporting_period: string;
  total_spend: number;
  ai_spend: number;
  compute_spend: number;
  storage_spend: number;
  egress_spend: number;
  cost_per_post: number;
  gross_margin_percent: number;
  cost_trend: 'increasing' | 'stable' | 'decreasing';
  created_at: string;
}

export interface FinOpsResourceRightsizing {
  id: string;
  resource_identifier: string;
  provider: CloudProvider;
  resource_type: FinOpsResourceType;
  current_cost_monthly: number;
  projected_savings_monthly: number;
  recommendation_action: RightsizingAction;
  rationale: string;
  confidence_score: number;
  status: RightsizingStatus;
  applied_at: string | null;
  created_at: string;
}

export interface FinOpsTelemetry {
  totalMonthlySpend: number;
  totalMonthlyBudget: number;
  budgetUtilizationPercent: number;
  projectedMonthEndSpend: number;
  activeAccountsCount: number;
  totalRightsizingSavingsMonthly: number;
  averageTenantGrossMarginPercent: number;
  spendByProvider: Record<CloudProvider, number>;
  spendByCategory: Record<CostCategory, number>;
  topSpendingTenants: Array<{
    tenantId: string;
    tenantName: string;
    totalSpend: number;
    costPerPost: number;
    marginPercent: number;
  }>;
  activeRightsizingCount: number;
}

export interface FinOpsCostSimulationResult {
  simulated: boolean;
  targetTenantId?: string;
  simulatedPostGrowthPercent: number;
  simulatedAiTokenGrowthPercent: number;
  currentMonthlyCost: number;
  projectedMonthlyCost: number;
  projectedGrossMarginPercent: number;
  estimatedUnitCostPerPost: number;
  recommendations: string[];
}
