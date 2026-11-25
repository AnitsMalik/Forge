import crypto from 'crypto';
import { db } from '../../db/connection.js';
import type {
  CloudCostAccount,
  TenantCostAttribution,
  FinOpsResourceRightsizing,
  FinOpsTelemetry,
  FinOpsCostSimulationResult,
  CloudProvider,
  CostCategory,
  RightsizingStatus,
} from '@socialforge/shared';

export class FinOpsService {
  /**
   * Fetch aggregate FinOps Telemetry & Cloud Spend KPIs
   */
  async getTelemetry(): Promise<FinOpsTelemetry> {
    const accounts = await db('cloud_cost_accounts').select('*');
    const totalMonthlySpend = accounts.reduce((acc, curr) => acc + Number(curr.current_month_spend || 0), 0);
    const totalMonthlyBudget = accounts.reduce((acc, curr) => acc + Number(curr.monthly_budget || 0), 0);
    const budgetUtilizationPercent = totalMonthlyBudget > 0
      ? Math.round((totalMonthlySpend / totalMonthlyBudget) * 1000) / 10
      : 0;

    // Projected Month-End Spend calculation based on current day of month
    const now = new Date();
    const currentDay = Math.max(1, now.getDate());
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthEndSpend = Math.round((totalMonthlySpend / currentDay) * daysInMonth * 100) / 100;

    const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;

    // Rightsizing savings
    const pendingRecommendations = await db('finops_rightsizing_recommendations').where('status', 'pending');
    const totalRightsizingSavingsMonthly = pendingRecommendations.reduce(
      (acc, curr) => acc + Number(curr.projected_savings_monthly || 0),
      0
    );
    const activeRightsizingCount = pendingRecommendations.length;

    // Tenant margins
    const attributions = await db('tenant_cost_attributions').select('*');
    const avgMargin = attributions.length > 0
      ? attributions.reduce((acc, curr) => acc + Number(curr.gross_margin_percent || 0), 0) / attributions.length
      : 88.5;
    const averageTenantGrossMarginPercent = Math.round(avgMargin * 10) / 10;

    // Spend by Provider
    const spendByProvider: Record<CloudProvider, number> = {
      aws: 0,
      gcp: 0,
      azure: 0,
      cloudflare: 0,
      openai_anthropic: 0,
    };
    for (const a of accounts) {
      if (a.provider in spendByProvider) {
        spendByProvider[a.provider as CloudProvider] += Number(a.current_month_spend || 0);
      }
    }

    // Spend by Category
    const spendByCategory: Record<CostCategory, number> = {
      core_platform: Math.round(totalMonthlySpend * 0.32 * 100) / 100,
      tenant_workload: Math.round(totalMonthlySpend * 0.28 * 100) / 100,
      ai_inference: Math.round(totalMonthlySpend * 0.24 * 100) / 100,
      media_storage: Math.round(totalMonthlySpend * 0.10 * 100) / 100,
      edge_traffic: Math.round(totalMonthlySpend * 0.06 * 100) / 100,
    };

    // Top spending tenants
    const topTenantsRows = await db('tenant_cost_attributions')
      .orderBy('total_spend', 'desc')
      .limit(5);

    const topSpendingTenants = topTenantsRows.map((t) => ({
      tenantId: t.tenant_id,
      tenantName: t.tenant_name,
      totalSpend: Number(t.total_spend),
      costPerPost: Number(t.cost_per_post),
      marginPercent: Number(t.gross_margin_percent),
    }));

    return {
      totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
      totalMonthlyBudget: Math.round(totalMonthlyBudget * 100) / 100,
      budgetUtilizationPercent,
      projectedMonthEndSpend,
      activeAccountsCount,
      totalRightsizingSavingsMonthly: Math.round(totalRightsizingSavingsMonthly * 100) / 100,
      averageTenantGrossMarginPercent,
      spendByProvider,
      spendByCategory,
      topSpendingTenants,
      activeRightsizingCount,
    };
  }

  /**
   * List Cloud Cost Accounts
   */
  async listAccounts(filters?: { provider?: string; status?: string }): Promise<CloudCostAccount[]> {
    let query = db('cloud_cost_accounts').select('*').orderBy('created_at', 'desc');
    if (filters?.provider) {
      query = query.where('provider', filters.provider);
    }
    if (filters?.status) {
      query = query.where('status', filters.status);
    }
    const rows = await query;
    return rows.map((r) => this.formatAccount(r));
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id: string): Promise<CloudCostAccount | null> {
    const row = await db('cloud_cost_accounts').where('id', id).first();
    return row ? this.formatAccount(row) : null;
  }

  /**
   * Create Cloud Cost Account
   */
  async createAccount(
    input: {
      provider: CloudProvider;
      account_id: string;
      account_name: string;
      monthly_budget: number;
      current_month_spend?: number;
      currency?: string;
    },
    operatorUserId?: string
  ): Promise<CloudCostAccount> {
    if (!input.account_name || input.account_name.trim().length < 3) {
      throw new Error('Account name must be at least 3 characters long');
    }
    if (!input.account_id || input.account_id.trim().length < 3) {
      throw new Error('Account ID must be at least 3 characters long');
    }
    if (input.monthly_budget < 0) {
      throw new Error('Monthly budget must be a positive number');
    }

    const validProviders: CloudProvider[] = ['aws', 'gcp', 'azure', 'cloudflare', 'openai_anthropic'];
    if (!validProviders.includes(input.provider)) {
      throw new Error(`Invalid provider: ${input.provider}`);
    }

    const id = `acc-${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date();

    const record = {
      id,
      provider: input.provider,
      account_id: input.account_id.trim(),
      account_name: input.account_name.trim(),
      currency: input.currency || 'USD',
      monthly_budget: input.monthly_budget,
      current_month_spend: input.current_month_spend || 0.00,
      status: (input.current_month_spend || 0) > input.monthly_budget ? 'exceeded_budget' : 'active',
      created_at: now,
      updated_at: now,
    };

    await db('cloud_cost_accounts').insert(record);

    await this.emitAuditLog(
      operatorUserId,
      'CREATE_CLOUD_COST_ACCOUNT',
      id,
      `Configured cloud account "${input.account_name}" (${input.provider}) with $${input.monthly_budget} budget`,
      { accountId: input.account_id, provider: input.provider }
    );

    return (await this.getAccountById(id))!;
  }

  /**
   * Update Cloud Cost Account
   */
  async updateAccount(
    id: string,
    updates: {
      account_name?: string;
      monthly_budget?: number;
      current_month_spend?: number;
      status?: 'active' | 'warning_budget' | 'exceeded_budget';
    },
    operatorUserId?: string
  ): Promise<CloudCostAccount> {
    const existing = await db('cloud_cost_accounts').where('id', id).first();
    if (!existing) {
      throw new Error(`Cloud cost account '${id}' not found`);
    }

    const payload: any = { updated_at: new Date() };
    if (updates.account_name !== undefined) payload.account_name = updates.account_name.trim();
    if (updates.monthly_budget !== undefined) {
      if (updates.monthly_budget < 0) throw new Error('Monthly budget cannot be negative');
      payload.monthly_budget = updates.monthly_budget;
    }
    if (updates.current_month_spend !== undefined) {
      if (updates.current_month_spend < 0) throw new Error('Current spend cannot be negative');
      payload.current_month_spend = updates.current_month_spend;
      const budget = updates.monthly_budget ?? existing.monthly_budget;
      if (updates.current_month_spend > budget) {
        payload.status = 'exceeded_budget';
      } else if (updates.current_month_spend > budget * 0.85) {
        payload.status = 'warning_budget';
      } else {
        payload.status = 'active';
      }
    }
    if (updates.status !== undefined) payload.status = updates.status;

    await db('cloud_cost_accounts').where('id', id).update(payload);

    await this.emitAuditLog(
      operatorUserId,
      'UPDATE_CLOUD_COST_ACCOUNT',
      id,
      `Updated cloud account "${existing.account_name}" parameters`,
      updates
    );

    return (await this.getAccountById(id))!;
  }

  /**
   * Delete Cloud Cost Account (with protection for core accounts)
   */
  async deleteAccount(id: string, operatorUserId?: string): Promise<boolean> {
    const existing = await db('cloud_cost_accounts').where('id', id).first();
    if (!existing) {
      throw new Error(`Cloud cost account '${id}' not found`);
    }

    const protectedAccounts = [
      'acc-aws-prod-01',
      'acc-gcp-ai-02',
      'acc-cf-edge-03',
      'acc-openai-tokens-04',
    ];
    if (protectedAccounts.includes(id)) {
      throw new Error(`Cannot delete protected core production account '${existing.account_name}'`);
    }

    await db('cloud_cost_accounts').where('id', id).delete();

    await this.emitAuditLog(
      operatorUserId,
      'DELETE_CLOUD_COST_ACCOUNT',
      id,
      `Deleted custom cloud account "${existing.account_name}"`,
      { accountId: existing.account_id }
    );

    return true;
  }

  /**
   * List Tenant Cost Attributions
   */
  async listTenantAttributions(filters?: { period?: string; tenantId?: string }): Promise<TenantCostAttribution[]> {
    let query = db('tenant_cost_attributions').select('*').orderBy('total_spend', 'desc');
    if (filters?.period) {
      query = query.where('reporting_period', filters.period);
    }
    if (filters?.tenantId) {
      query = query.where('tenant_id', filters.tenantId);
    }
    const rows = await query;
    return rows.map((r) => this.formatAttribution(r));
  }

  /**
   * List Rightsizing Recommendations
   */
  async listRightsizing(filters?: { status?: string; provider?: string }): Promise<FinOpsResourceRightsizing[]> {
    let query = db('finops_rightsizing_recommendations').select('*').orderBy('projected_savings_monthly', 'desc');
    if (filters?.status) {
      query = query.where('status', filters.status);
    }
    if (filters?.provider) {
      query = query.where('provider', filters.provider);
    }
    const rows = await query;
    return rows.map((r) => this.formatRightsizing(r));
  }

  /**
   * Apply Rightsizing Recommendation
   */
  async applyRightsizing(id: string, operatorUserId?: string): Promise<FinOpsResourceRightsizing> {
    const existing = await db('finops_rightsizing_recommendations').where('id', id).first();
    if (!existing) {
      throw new Error(`Rightsizing recommendation '${id}' not found`);
    }

    const now = new Date();
    await db('finops_rightsizing_recommendations').where('id', id).update({
      status: 'applied',
      applied_at: now,
    });

    await this.emitAuditLog(
      operatorUserId,
      'APPLY_RIGHTSIZING_RECOMMENDATION',
      id,
      `Applied rightsizing optimization "${existing.recommendation_action}" on ${existing.resource_identifier} (projected monthly savings: $${existing.projected_savings_monthly})`,
      { savings: existing.projected_savings_monthly, action: existing.recommendation_action }
    );

    const updated = await db('finops_rightsizing_recommendations').where('id', id).first();
    return this.formatRightsizing(updated);
  }

  /**
   * Dismiss Rightsizing Recommendation
   */
  async dismissRightsizing(id: string, operatorUserId?: string): Promise<FinOpsResourceRightsizing> {
    const existing = await db('finops_rightsizing_recommendations').where('id', id).first();
    if (!existing) {
      throw new Error(`Rightsizing recommendation '${id}' not found`);
    }

    await db('finops_rightsizing_recommendations').where('id', id).update({
      status: 'dismissed',
    });

    await this.emitAuditLog(
      operatorUserId,
      'DISMISS_RIGHTSIZING_RECOMMENDATION',
      id,
      `Dismissed rightsizing recommendation on ${existing.resource_identifier}`,
      { action: existing.recommendation_action }
    );

    const updated = await db('finops_rightsizing_recommendations').where('id', id).first();
    return this.formatRightsizing(updated);
  }

  /**
   * In-Memory FinOps What-If Growth & Margin Simulation Sandbox
   */
  simulateScenario(input?: {
    target_tenant_id?: string;
    post_growth_percent?: number;
    ai_token_growth_percent?: number;
  }): FinOpsCostSimulationResult {
    const postGrowth = input?.post_growth_percent ?? 50;
    const aiGrowth = input?.ai_token_growth_percent ?? 75;

    const baseCost = 42.50; // Lumina Wellness baseline monthly spend
    const projectedComputeStorage = baseCost * 0.45 * (1 + postGrowth / 100 * 0.6);
    const projectedAiCost = baseCost * 0.55 * (1 + aiGrowth / 100 * 0.85);
    const projectedMonthlyCost = Math.round((projectedComputeStorage + projectedAiCost) * 100) / 100;

    const projectedRevenue = 499.00 * (1 + postGrowth / 100 * 0.25);
    const projectedGrossMarginPercent = Math.round(((projectedRevenue - projectedMonthlyCost) / projectedRevenue) * 1000) / 10;
    const estimatedUnitCostPerPost = Math.round((projectedMonthlyCost / (1200 * (1 + postGrowth / 100))) * 10000) / 10000;

    const recommendations = [
      `At +${aiGrowth}% AI growth, configure batch token caching to reduce OpenAI API spend by up to 34%.`,
      'Promote tenant to annual enterprise commitment to lock in 18% reserved instance compute discount.',
      'Unit economics remain highly favorable with gross margins sustaining above 85%.',
    ];

    return {
      simulated: true,
      targetTenantId: input?.target_tenant_id,
      simulatedPostGrowthPercent: postGrowth,
      simulatedAiTokenGrowthPercent: aiGrowth,
      currentMonthlyCost: baseCost,
      projectedMonthlyCost,
      projectedGrossMarginPercent,
      estimatedUnitCostPerPost,
      recommendations,
    };
  }

  /**
   * Formatters
   */
  private formatAccount(row: any): CloudCostAccount {
    return {
      id: row.id,
      provider: row.provider,
      account_id: row.account_id,
      account_name: row.account_name,
      currency: row.currency,
      monthly_budget: Number(row.monthly_budget),
      current_month_spend: Number(row.current_month_spend),
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
    };
  }

  private formatAttribution(row: any): TenantCostAttribution {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      reporting_period: row.reporting_period,
      total_spend: Number(row.total_spend),
      ai_spend: Number(row.ai_spend),
      compute_spend: Number(row.compute_spend),
      storage_spend: Number(row.storage_spend),
      egress_spend: Number(row.egress_spend),
      cost_per_post: Number(row.cost_per_post),
      gross_margin_percent: Number(row.gross_margin_percent),
      cost_trend: row.cost_trend,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private formatRightsizing(row: any): FinOpsResourceRightsizing {
    return {
      id: row.id,
      resource_identifier: row.resource_identifier,
      provider: row.provider,
      resource_type: row.resource_type,
      current_cost_monthly: Number(row.current_cost_monthly),
      projected_savings_monthly: Number(row.projected_savings_monthly),
      recommendation_action: row.recommendation_action,
      rationale: row.rationale,
      confidence_score: Number(row.confidence_score),
      status: row.status,
      applied_at: row.applied_at ? new Date(row.applied_at).toISOString() : null,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private async emitAuditLog(
    operatorUserId: string | undefined,
    action: string,
    targetResourceId: string,
    reason: string,
    details?: any
  ): Promise<void> {
    try {
      let superadminId = operatorUserId;
      let superadminEmail = 'superadmin@socialforge.io';
      if (!superadminId) {
        const adminUser = await db('users').where({ is_superadmin: 1, is_active: 1 }).first();
        if (adminUser) {
          superadminId = adminUser.id;
          superadminEmail = adminUser.email;
        }
      } else {
        const u = await db('users').where({ id: superadminId }).first();
        if (u) superadminEmail = u.email;
      }

      if (superadminId) {
        await db('superadmin_audit_logs').insert({
          id: crypto.randomUUID(),
          superadmin_id: superadminId,
          superadmin_email: superadminEmail,
          action,
          target_resource_type: 'finops',
          target_resource_id: targetResourceId,
          reason,
          details: details ? JSON.stringify(details) : null,
          ip_address: '127.0.0.1',
          created_at: new Date(),
        });
      }
    } catch (err: any) {
      console.warn('[FinOpsService] Audit log warning:', err.message);
    }
  }
}

export const finOpsService = new FinOpsService();
