import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. Create idempotent_usage_records table for zero-leakage duplicate prevention
  const hasUsageRecords = await knex.schema.hasTable('idempotent_usage_records');
  if (!hasUsageRecords) {
    await knex.schema.createTable('idempotent_usage_records', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.string('resource', 64).notNullable();
      table.decimal('amount', 12, 2).notNullable();
      table.string('idempotency_key', 255).notNullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'idempotency_key'], 'uniq_tenant_idempotency');
      table.index(['tenant_id', 'resource'], 'idx_usage_tenant_resource');
      table.index(['created_at'], 'idx_usage_created_at');
    });
  }

  // 2. Configure Commercial Plans in subscription_plans

  // Trial Plan
  const trialPlan = {
    id: 'free_trial',
    name: 'Free Trial',
    slug: 'free-trial',
    description: '14-day evaluation with full core capability testing.',
    price: 0.00,
    monthly_price_cents: 0,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 1,
    max_social_accounts: 2,
    max_posts_per_month: 20,
    max_users: 1,
    ai_tokens_monthly: 25000,
    video_render_seconds_monthly: 60,
    storage_bytes_limit: 1073741824, // 1 GB
    features: JSON.stringify({
      max_active_automations: 10,
      analytics_retention_days: 7,
      premium_connectors: false,
      max_autonomy_level: 'L2',
      agency_workspaces: false,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: false,
      client_approvals: true,
      priority_queues: false,
      ads_management: false,
    }),
    is_active: true,
    updated_at: now,
  };

  const trialExists = await knex('subscription_plans').where({ id: 'free_trial' }).first();
  if (trialExists) {
    await knex('subscription_plans').where({ id: 'free_trial' }).update(trialPlan);
  } else {
    await knex('subscription_plans').insert({ ...trialPlan, created_at: now });
  }

  // Also support 'trial' alias
  const trialAliasExists = await knex('subscription_plans').where({ id: 'trial' }).first();
  if (!trialAliasExists) {
    await knex('subscription_plans').insert({
      ...trialPlan,
      id: 'trial',
      name: 'Trial',
      slug: 'trial',
      created_at: now,
    });
  }

  // Starter Plan
  const starterPlan = {
    name: 'Starter',
    slug: 'starter',
    description: 'For solo creators and single brand marketing.',
    price: 29.00,
    monthly_price_cents: 2900,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 1,
    max_social_accounts: 3,
    max_posts_per_month: 100,
    max_users: 2,
    ai_tokens_monthly: 100000,
    video_render_seconds_monthly: 300,
    storage_bytes_limit: 5368709120, // 5 GB
    features: JSON.stringify({
      max_active_automations: 3,
      analytics_retention_days: 30,
      premium_connectors: false,
      max_autonomy_level: 'L2',
      agency_workspaces: false,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: false,
      client_approvals: false,
      priority_queues: false,
      ads_management: false,
    }),
    is_active: true,
    updated_at: now,
  };
  await knex('subscription_plans').where({ id: 'starter' }).update(starterPlan);

  // Growth Plan
  const growthPlan = {
    name: 'Growth',
    slug: 'growth',
    description: 'For growing businesses managing up to 5 brands.',
    price: 79.00,
    monthly_price_cents: 7900,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 5,
    max_social_accounts: 15,
    max_posts_per_month: 500,
    max_users: 5,
    ai_tokens_monthly: 500000,
    video_render_seconds_monthly: 1200,
    storage_bytes_limit: 21474836480, // 20 GB
    features: JSON.stringify({
      max_active_automations: 10,
      analytics_retention_days: 90,
      premium_connectors: true,
      max_autonomy_level: 'L3',
      agency_workspaces: false,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: false,
      ads_management: false,
    }),
    is_active: true,
    updated_at: now,
  };
  await knex('subscription_plans').where({ id: 'growth' }).update(growthPlan);

  // Agency Plan
  const agencyPlan = {
    name: 'Agency Pro',
    slug: 'agency-pro',
    description: 'For digital agencies managing up to 25 brands.',
    price: 249.00,
    monthly_price_cents: 24900,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 25,
    max_social_accounts: 100,
    max_posts_per_month: 2500,
    max_users: 20,
    ai_tokens_monthly: 2500000,
    video_render_seconds_monthly: 3600,
    storage_bytes_limit: 107374182400, // 100 GB
    features: JSON.stringify({
      max_active_automations: 50,
      analytics_retention_days: 365,
      premium_connectors: true,
      max_autonomy_level: 'L4',
      agency_workspaces: true,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: true,
      ads_management: true,
      custom_branding: true,
      api_access: true,
    }),
    is_active: true,
    updated_at: now,
  };
  await knex('subscription_plans').where({ id: 'agency' }).update(agencyPlan);
  if (await knex('subscription_plans').where({ id: 'agency_scale' }).first()) {
    await knex('subscription_plans').where({ id: 'agency_scale' }).update({
      ...agencyPlan,
      name: 'Agency Scale Pro',
      slug: 'agency-scale-pro',
    });
  }

  // Scale Plan ($499 / mo)
  const scalePlan = {
    id: 'scale',
    name: 'Scale',
    slug: 'scale',
    description: 'High-throughput publishing across up to 100 brands with multi-workspace control.',
    price: 499.00,
    monthly_price_cents: 49900,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 100,
    max_social_accounts: 250,
    max_posts_per_month: 10000,
    max_users: 50,
    ai_tokens_monthly: 10000000,
    video_render_seconds_monthly: 18000, // 300 mins
    storage_bytes_limit: 536870912000, // 500 GB
    features: JSON.stringify({
      max_active_automations: 200,
      analytics_retention_days: 730,
      premium_connectors: true,
      max_autonomy_level: 'L5',
      agency_workspaces: true,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: true,
      ads_management: true,
      custom_branding: true,
      api_access: true,
    }),
    is_active: true,
    updated_at: now,
  };
  const scaleExists = await knex('subscription_plans').where({ id: 'scale' }).first();
  if (scaleExists) {
    await knex('subscription_plans').where({ id: 'scale' }).update(scalePlan);
  } else {
    await knex('subscription_plans').insert({ ...scalePlan, created_at: now });
  }

  // Enterprise Plan ($999 / mo or custom)
  const enterprisePlan = {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Bespoke multi-brand enterprise marketing with dedicated capacity and unlimited quotas.',
    price: 999.00,
    monthly_price_cents: 99900,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 999999,
    max_social_accounts: 999999,
    max_posts_per_month: 999999,
    max_users: 999999,
    ai_tokens_monthly: 999999999,
    video_render_seconds_monthly: 999999999,
    storage_bytes_limit: 1099511627776, // 1 TB
    features: JSON.stringify({
      max_active_automations: 999999,
      analytics_retention_days: 3650,
      premium_connectors: true,
      max_autonomy_level: 'L5',
      agency_workspaces: true,
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: true,
      ads_management: true,
      custom_branding: true,
      api_access: true,
      dedicated_account_manager: true,
    }),
    is_active: true,
    updated_at: now,
  };
  const enterpriseExists = await knex('subscription_plans').where({ id: 'enterprise' }).first();
  if (enterpriseExists) {
    await knex('subscription_plans').where({ id: 'enterprise' }).update(enterprisePlan);
  } else {
    await knex('subscription_plans').insert({ ...enterprisePlan, created_at: now });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('idempotent_usage_records');
  await knex('subscription_plans').whereIn('id', ['trial', 'scale', 'enterprise']).del();
}
