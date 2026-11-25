import type { Knex } from 'knex';

/**
 * Phase 37: Enterprise Multi-Cloud FinOps, Real-Time Cost Attribution & Resource Rightsizing Engine (v5.5.0)
 *
 * Tables:
 * - cloud_cost_accounts: Cloud provider accounts, monthly budgets, and spend tracking
 * - tenant_cost_attributions: Granular per-tenant infrastructure unit economics & gross margin
 * - finops_rightsizing_recommendations: Automated infrastructure rightsizing & cost optimization advisor
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Cloud Cost Accounts
  if (!(await knex.schema.hasTable('cloud_cost_accounts'))) {
    await knex.schema.createTable('cloud_cost_accounts', (table) => {
      table.string('id', 36).primary();
      table.string('provider', 48).notNullable().index('idx_cca_provider');
      table.string('account_id', 64).notNullable();
      table.string('account_name', 120).notNullable();
      table.string('currency', 8).notNullable().defaultTo('USD');
      table.decimal('monthly_budget', 10, 2).notNullable().defaultTo(5000.00);
      table.decimal('current_month_spend', 10, 2).notNullable().defaultTo(0.00);
      table.string('status', 32).notNullable().defaultTo('active').index('idx_cca_status');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Tenant Cost Attributions
  if (!(await knex.schema.hasTable('tenant_cost_attributions'))) {
    await knex.schema.createTable('tenant_cost_attributions', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable().references('id').inTable('tenants').onDelete('CASCADE').index('idx_tca_tenant');
      table.string('tenant_name', 120).notNullable();
      table.string('reporting_period', 7).notNullable().index('idx_tca_period');
      table.decimal('total_spend', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('ai_spend', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('compute_spend', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('storage_spend', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('egress_spend', 10, 2).notNullable().defaultTo(0.00);
      table.decimal('cost_per_post', 8, 4).notNullable().defaultTo(0.0500);
      table.decimal('gross_margin_percent', 5, 2).notNullable().defaultTo(85.00);
      table.string('cost_trend', 32).notNullable().defaultTo('stable');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'reporting_period'], 'idx_tca_tenant_period');
    });
  }

  // 3. FinOps Rightsizing Recommendations
  if (!(await knex.schema.hasTable('finops_rightsizing_recommendations'))) {
    await knex.schema.createTable('finops_rightsizing_recommendations', (table) => {
      table.string('id', 36).primary();
      table.string('resource_identifier', 160).notNullable();
      table.string('provider', 48).notNullable().index('idx_frr_provider');
      table.string('resource_type', 48).notNullable().index('idx_frr_type');
      table.decimal('current_cost_monthly', 10, 2).notNullable();
      table.decimal('projected_savings_monthly', 10, 2).notNullable();
      table.string('recommendation_action', 48).notNullable();
      table.text('rationale').notNullable();
      table.decimal('confidence_score', 5, 2).notNullable().defaultTo(95.00);
      table.string('status', 32).notNullable().defaultTo('pending').index('idx_frr_status');
      table.dateTime('applied_at').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // Pre-seed Core Accounts
  const existingAccounts = await knex('cloud_cost_accounts').count<{ count: number }>('id as count').first();
  if (!existingAccounts || Number(existingAccounts.count) === 0) {
    const now = new Date();

    const accounts = [
      {
        id: 'acc-aws-prod-01',
        provider: 'aws',
        account_id: '123456789012',
        account_name: 'AWS Primary Production Fleet (us-east-1 / eu-central-1)',
        currency: 'USD',
        monthly_budget: 12500.00,
        current_month_spend: 4820.50,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'acc-gcp-ai-02',
        provider: 'gcp',
        account_id: 'socialforge-vertex-prod',
        account_name: 'GCP Vertex AI & Analytics Fleet',
        currency: 'USD',
        monthly_budget: 8000.00,
        current_month_spend: 2450.20,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'acc-cf-edge-03',
        provider: 'cloudflare',
        account_id: 'cf-ent-org-9021',
        account_name: 'Cloudflare Enterprise Global CDN & WAF',
        currency: 'USD',
        monthly_budget: 2000.00,
        current_month_spend: 620.00,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 'acc-openai-tokens-04',
        provider: 'openai_anthropic',
        account_id: 'org-sf-llm-tokens',
        account_name: 'OpenAI GPT-4o & Anthropic Claude 3.5 APIs',
        currency: 'USD',
        monthly_budget: 6500.00,
        current_month_spend: 3180.40,
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ];

    await knex('cloud_cost_accounts').insert(accounts);

    // Pre-seed Tenant Cost Attributions
    const tenants = await knex('tenants').select('id', 'name').limit(3);
    if (tenants.length > 0) {
      const attributions = [
        {
          id: 'tca-seed-01',
          tenant_id: tenants[0].id,
          tenant_name: tenants[0].name,
          reporting_period: '2026-10',
          total_spend: 42.50,
          ai_spend: 18.20,
          compute_spend: 12.30,
          storage_spend: 7.10,
          egress_spend: 4.90,
          cost_per_post: 0.0415,
          gross_margin_percent: 91.50,
          cost_trend: 'stable',
          created_at: now,
        },
      ];

      if (tenants.length > 1) {
        attributions.push({
          id: 'tca-seed-02',
          tenant_id: tenants[1].id,
          tenant_name: tenants[1].name,
          reporting_period: '2026-10',
          total_spend: 68.90,
          ai_spend: 34.50,
          compute_spend: 19.80,
          storage_spend: 8.40,
          egress_spend: 6.20,
          cost_per_post: 0.0520,
          gross_margin_percent: 86.20,
          cost_trend: 'decreasing',
          created_at: now,
        });
      }

      await knex('tenant_cost_attributions').insert(attributions);
    }

    // Pre-seed Rightsizing Recommendations
    const rightsizing = [
      {
        id: 'rs-aurora-db-01',
        resource_identifier: 'aurora-cluster-replica-eu-01',
        provider: 'aws',
        resource_type: 'database_aurora',
        current_cost_monthly: 840.00,
        projected_savings_monthly: 420.00,
        recommendation_action: 'downsize_instance',
        rationale: 'CPU utilization has remained below 8.5% over the past 30 days. Downsizing from db.r6g.2xlarge to db.r6g.xlarge reduces cost by 50% with zero SLA risk.',
        confidence_score: 96.50,
        status: 'pending',
        applied_at: null,
        created_at: now,
      },
      {
        id: 'rs-redis-cluster-02',
        resource_identifier: 'elasticache-redis-global-fleet',
        provider: 'aws',
        resource_type: 'redis_cache',
        current_cost_monthly: 1280.00,
        projected_savings_monthly: 680.00,
        recommendation_action: 'reserve_commitments',
        rationale: 'Steady-state Redis cluster utilization over 90 days qualifies for 1-year Savings Plans reservation with zero upfront payment.',
        confidence_score: 98.00,
        status: 'pending',
        applied_at: null,
        created_at: now,
      },
      {
        id: 'rs-s3-tiering-03',
        resource_identifier: 's3-socialforge-generated-assets-archive',
        provider: 'aws',
        resource_type: 'storage_s3',
        current_cost_monthly: 520.00,
        projected_savings_monthly: 380.00,
        recommendation_action: 'storage_tiering',
        rationale: 'Over 82% of assets older than 60 days are never requested. Applying S3 Intelligent-Tiering automatically moves cold objects to Glacier Instant Retrieval.',
        confidence_score: 94.00,
        status: 'pending',
        applied_at: null,
        created_at: now,
      },
    ];

    await knex('finops_rightsizing_recommendations').insert(rightsizing);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('finops_rightsizing_recommendations');
  await knex.schema.dropTableIfExists('tenant_cost_attributions');
  await knex.schema.dropTableIfExists('cloud_cost_accounts');
}
