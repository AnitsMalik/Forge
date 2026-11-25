import type { Knex } from 'knex';

/**
 * Phase 32: Enterprise Predictive Churn, Customer Lifetime Value & Revenue Expansion Intelligence (v5.0.0)
 *
 * Tables:
 * - tenant_churn_scores: Multi-factor algorithmic churn risk score and behavioral telemetry per tenant
 * - customer_ltv_metrics: Predictive Customer Lifetime Value (LTV) projections, historical revenue & expansion potential
 * - customer_success_interventions: Proactive CS intervention playbooks, task assignments & retention tracking
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Tenant Churn Scores
  if (!(await knex.schema.hasTable('tenant_churn_scores'))) {
    await knex.schema.createTable('tenant_churn_scores', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('churn_risk_score', 5, 2).notNullable().defaultTo(0.00);
      table.string('risk_tier', 20).notNullable().defaultTo('low').index('idx_tcs_tier');
      table.string('primary_risk_factor', 40).notNullable().defaultTo('low_usage').index('idx_tcs_risk_factor');
      table.decimal('usage_velocity_score', 5, 2).notNullable().defaultTo(50.00);
      table.decimal('seat_utilization_percent', 5, 2).notNullable().defaultTo(50.00);
      table.decimal('billing_health_score', 5, 2).notNullable().defaultTo(100.00);
      table.string('engagement_trend', 20).notNullable().defaultTo('stable');
      table.dateTime('predicted_churn_date').nullable();
      table.decimal('confidence_score', 3, 2).notNullable().defaultTo(0.85);
      table.json('signals_json').notNullable();
      table.dateTime('evaluated_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['tenant_id'], 'uq_tcs_tenant');
    });
  }

  // 2. Customer LTV Metrics
  if (!(await knex.schema.hasTable('customer_ltv_metrics'))) {
    await knex.schema.createTable('customer_ltv_metrics', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.decimal('current_mrr', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('historical_revenue_total', 12, 2).notNullable().defaultTo(0.00);
      table.integer('predicted_ltv_months').notNullable().defaultTo(24);
      table.decimal('projected_ltv_total', 12, 2).notNullable().defaultTo(0.00);
      table.decimal('expansion_potential_score', 5, 2).notNullable().defaultTo(0.00);
      table.string('expansion_tier', 32).notNullable().defaultTo('modest').index('idx_clm_tier');
      table.json('upsell_recommendations_json').notNullable();
      table.dateTime('evaluated_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
      table.unique(['tenant_id'], 'uq_clm_tenant');
    });
  }

  // 3. Customer Success Interventions
  if (!(await knex.schema.hasTable('customer_success_interventions'))) {
    await knex.schema.createTable('customer_success_interventions', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_csi_tenant');
      table.string('churn_score_id', 36).nullable().references('id').inTable('tenant_churn_scores').onDelete('SET NULL');
      table.string('title', 160).notNullable();
      table.string('playbook_type', 40).notNullable().index('idx_csi_playbook');
      table.string('status', 20).notNullable().defaultTo('pending').index('idx_csi_status');
      table.string('priority', 20).notNullable().defaultTo('medium').index('idx_csi_priority');
      table.string('assigned_to', 100).notNullable();
      table.text('trigger_reason').notNullable();
      table.text('resolution_notes').nullable();
      table.string('outcome_effectiveness', 30).nullable().index('idx_csi_outcome');
      table.dateTime('due_date').nullable();
      table.dateTime('completed_at').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Seed initial flagship tenant revenue intelligence data
  const validTenants = await knex('tenants')
    .whereRaw('CHAR_LENGTH(id) = 36')
    .select('id', 'name')
    .limit(5);

  if (validTenants && validTenants.length > 0) {
    const flagshipTenant = validTenants[0];

    // Seed flagship churn score
    const existingScore = await knex('tenant_churn_scores').where('tenant_id', flagshipTenant.id).first();
    const churnScoreId = 'tcs-flagship-lumina-01';

    if (!existingScore) {
      await knex('tenant_churn_scores').insert({
        id: churnScoreId,
        tenant_id: flagshipTenant.id,
        churn_risk_score: 12.50,
        risk_tier: 'low',
        primary_risk_factor: 'seat_underutilization',
        usage_velocity_score: 88.50,
        seat_utilization_percent: 91.20,
        billing_health_score: 100.00,
        engagement_trend: 'improving',
        predicted_churn_date: null,
        confidence_score: 0.94,
        signals_json: JSON.stringify({
          activeUsers7d: 18,
          weeklyPostVelocity: 34,
          failedPayments30d: 0,
          supportTicketSentimentScore: 0.88,
          apiQuotaUsagePercent: 64.2,
          lastActiveAt: new Date().toISOString(),
        }),
      });
    }

    // Seed flagship LTV metric
    const existingLtv = await knex('customer_ltv_metrics').where('tenant_id', flagshipTenant.id).first();
    if (!existingLtv) {
      const currentMrr = 499.00;
      const predictedMonths = 36;
      const projectedLtv = currentMrr * predictedMonths * 1.15; // with expansion factor

      await knex('customer_ltv_metrics').insert({
        id: 'clm-flagship-lumina-01',
        tenant_id: flagshipTenant.id,
        current_mrr: currentMrr,
        historical_revenue_total: 11976.00,
        predicted_ltv_months: predictedMonths,
        projected_ltv_total: projectedLtv,
        expansion_potential_score: 85.00,
        expansion_tier: 'enterprise_transformational',
        upsell_recommendations_json: JSON.stringify([
          {
            title: 'Autonomous Multi-Agent Fleet Expansion',
            addonKey: 'agent_fleet_pro',
            estimatedMrrImpact: 250.00,
            readinessScore: 92,
            rationale: 'High automation usage velocity (34 posts/week) signals ready fit for full-funnel AI agent teams.',
          },
          {
            title: 'Dedicated Edge PoP & Global Cache Acceleration',
            addonKey: 'edge_cdn_dedicated',
            estimatedMrrImpact: 150.00,
            readinessScore: 84,
            rationale: 'Global audience traffic across US and EU PoPs benefits from zero-latency origin shielding.',
          },
        ]),
      });
    }

    // Seed flagship CS intervention
    const existingIntervention = await knex('customer_success_interventions').where('tenant_id', flagshipTenant.id).first();
    if (!existingIntervention) {
      await knex('customer_success_interventions').insert([
        {
          id: 'csi-flagship-lumina-01',
          tenant_id: flagshipTenant.id,
          churn_score_id: churnScoreId,
          title: 'Executive Sponsor Strategic Roadmap Check-in',
          playbook_type: 'executive_sponsor_outreach',
          status: 'in_progress',
          priority: 'high',
          assigned_to: 'sarah.connor@socialforge.ai',
          trigger_reason: 'Account reached 1-year milestone with high usage velocity and eligibility for Enterprise Transformational tier.',
          resolution_notes: 'Initial alignment call scheduled with VP of Marketing. Drafted fleet workflow proposal.',
          outcome_effectiveness: 'expanded',
          due_date: new Date(Date.now() + 7 * 86400000),
        },
        {
          id: 'csi-flagship-lumina-02',
          tenant_id: flagshipTenant.id,
          churn_score_id: churnScoreId,
          title: 'Brand Knowledge Graph Optimization Workshop',
          playbook_type: 'proactive_training_session',
          status: 'completed',
          priority: 'medium',
          assigned_to: 'alex.rivera@socialforge.ai',
          trigger_reason: 'Assisted tenant in structuring multi-hop brand ontology and semantic vector memory for new product line.',
          resolution_notes: 'Successfully seeded 6 entities and 5 relationships. Client rated session 5/5 stars.',
          outcome_effectiveness: 'retained',
          due_date: new Date(Date.now() - 3 * 86400000),
          completed_at: new Date(Date.now() - 2 * 86400000),
        },
      ]);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('customer_success_interventions');
  await knex.schema.dropTableIfExists('customer_ltv_metrics');
  await knex.schema.dropTableIfExists('tenant_churn_scores');
}
