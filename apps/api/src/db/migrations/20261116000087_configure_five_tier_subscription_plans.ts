import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. Add configurable quota columns to subscription_plans if not present
  const tableInfo = await knex('information_schema.columns')
    .where({ table_schema: knex.client.database(), table_name: 'subscription_plans' })
    .select('column_name');
  const existingCols = new Set(tableInfo.map((c: any) => c.COLUMN_NAME || c.column_name));

  await knex.schema.alterTable('subscription_plans', (table) => {
    if (!existingCols.has('max_ai_content')) {
      table.integer('max_ai_content').defaultTo(100).after('max_posts_per_month');
    }
    if (!existingCols.has('max_ai_images')) {
      table.integer('max_ai_images').defaultTo(25).after('max_ai_content');
    }
    if (!existingCols.has('max_ai_videos')) {
      table.integer('max_ai_videos').defaultTo(5).after('max_ai_images');
    }
    if (!existingCols.has('max_active_campaigns')) {
      table.integer('max_active_campaigns').defaultTo(5).after('max_ai_videos');
    }
    if (!existingCols.has('max_scheduled_posts')) {
      table.integer('max_scheduled_posts').defaultTo(50).after('max_active_campaigns');
    }
  });

  // 2. Canonical 5-Tier Subscription Plans Definitions
  const CANONICAL_PLANS = [
    {
      id: 'free',
      name: 'Free',
      slug: 'free',
      description: 'Free forever plan for testing social publishing, basic AI copy, and content scheduling.',
      price: 0.00,
      monthly_price_cents: 0,
      annual_price_cents: 0,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 1,
      max_users: 1,
      max_social_accounts: 2,
      max_posts_per_month: 20,
      max_ai_content: 25,
      max_ai_images: 5,
      max_ai_videos: 1,
      max_active_campaigns: 1,
      max_scheduled_posts: 10,
      ai_tokens_monthly: 25000,
      video_render_seconds_monthly: 60,
      storage_bytes_limit: 1073741824, // 1 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        ads_management: false,
        priority_queues: false,
        client_approvals: false,
        agency_workspaces: false,
        advanced_analytics: false,
        whatsapp_enabled: false,
        premium_connectors: false,
        max_active_automations: 1,
        max_autonomy_level: 'L1',
        analytics_retention_days: 7,
      }),
      is_active: 1,
    },
    {
      id: 'starter',
      name: 'Starter',
      slug: 'starter',
      description: 'Essential social publishing, basic CRM, design studio, and foundational AI marketing assistance.',
      price: 29.00,
      monthly_price_cents: 2900,
      annual_price_cents: 29000,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 1,
      max_users: 3,
      max_social_accounts: 5,
      max_posts_per_month: 150,
      max_ai_content: 250,
      max_ai_images: 50,
      max_ai_videos: 10,
      max_active_campaigns: 5,
      max_scheduled_posts: 100,
      ai_tokens_monthly: 100000,
      video_render_seconds_monthly: 600,
      storage_bytes_limit: 10737418240, // 10 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: false,
        client_approvals: false,
        priority_queues: false,
        ads_management: false,
        agency_workspaces: false,
        whatsapp_enabled: false,
        premium_connectors: false,
        max_active_automations: 5,
        max_autonomy_level: 'L2',
        analytics_retention_days: 30,
      }),
      is_active: 1,
    },
    {
      id: 'professional',
      name: 'Professional',
      slug: 'professional',
      description: 'For growing businesses: advanced analytics, full AI Design Studio, Video/Reels Studio, WhatsApp marketing, and approval links.',
      price: 79.00,
      monthly_price_cents: 7900,
      annual_price_cents: 79000,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 5,
      max_users: 10,
      max_social_accounts: 15,
      max_posts_per_month: 600,
      max_ai_content: 1000,
      max_ai_images: 250,
      max_ai_videos: 30,
      max_active_campaigns: 20,
      max_scheduled_posts: 500,
      ai_tokens_monthly: 500000,
      video_render_seconds_monthly: 1800,
      storage_bytes_limit: 53687091200, // 50 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: true,
        client_approvals: true,
        priority_queues: true,
        ads_management: false,
        agency_workspaces: false,
        whatsapp_enabled: true,
        premium_connectors: true,
        max_active_automations: 20,
        max_autonomy_level: 'L3',
        analytics_retention_days: 90,
        recommended: true,
      }),
      is_active: 1,
    },
    {
      id: 'business',
      name: 'Business',
      slug: 'business',
      description: 'Marketing agencies & multi-brand studios: 25 client brands, agency workspaces, white-label branding, approval links, and API access.',
      price: 199.00,
      monthly_price_cents: 19900,
      annual_price_cents: 199000,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 25,
      max_users: 25,
      max_social_accounts: 50,
      max_posts_per_month: 2500,
      max_ai_content: 5000,
      max_ai_images: 1000,
      max_ai_videos: 100,
      max_active_campaigns: 100,
      max_scheduled_posts: 2500,
      ai_tokens_monthly: 2500000,
      video_render_seconds_monthly: 6000,
      storage_bytes_limit: 214748364800, // 200 GB
      features: JSON.stringify({
        ai_brain: true,
        api_access: true,
        ffmpeg_video: true,
        ads_management: true,
        custom_branding: true,
        priority_queues: true,
        client_approvals: true,
        whatsapp_enabled: true,
        agency_workspaces: true,
        multi_brand_brain: true,
        advanced_analytics: true,
        max_autonomy_level: 'L4',
        premium_connectors: true,
        max_active_automations: 100,
        analytics_retention_days: 365,
      }),
      is_active: 1,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Bespoke multi-brand enterprise marketing with dedicated capacity, custom SLA, and unlimited quotas.',
      price: 499.00,
      monthly_price_cents: 49900,
      annual_price_cents: 499000,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 999999,
      max_users: 999999,
      max_social_accounts: 999999,
      max_posts_per_month: 999999,
      max_ai_content: 999999,
      max_ai_images: 999999,
      max_ai_videos: 999999,
      max_active_campaigns: 999999,
      max_scheduled_posts: 999999,
      ai_tokens_monthly: 999999999,
      video_render_seconds_monthly: 999999,
      storage_bytes_limit: 1099511627776, // 1 TB
      features: JSON.stringify({
        ai_brain: true,
        api_access: true,
        ffmpeg_video: true,
        ads_management: true,
        custom_branding: true,
        priority_queues: true,
        client_approvals: true,
        agency_workspaces: true,
        advanced_analytics: true,
        max_autonomy_level: 'L5',
        premium_connectors: true,
        max_active_automations: 999999,
        analytics_retention_days: 3650,
        dedicated_account_manager: true,
        scim_provisioning: true,
      }),
      is_active: 1,
    },
  ];

  for (const plan of CANONICAL_PLANS) {
    const existing = await knex('subscription_plans').where({ id: plan.id }).first();
    if (existing) {
      await knex('subscription_plans').where({ id: plan.id }).update({
        ...plan,
        updated_at: now,
      });
    } else {
      await knex('subscription_plans').insert({
        ...plan,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // 3. Ensure backward-compatible legacy plans have the new columns populated
  const existingGrowth = await knex('subscription_plans').where({ id: 'growth' }).first();
  if (existingGrowth) {
    await knex('subscription_plans').where({ id: 'growth' }).update({
      max_ai_content: 1000,
      max_ai_images: 250,
      max_ai_videos: 30,
      max_active_campaigns: 20,
      max_scheduled_posts: 500,
      updated_at: now,
    });
  }

  const existingAgency = await knex('subscription_plans').where({ id: 'agency' }).first();
  if (existingAgency) {
    await knex('subscription_plans').where({ id: 'agency' }).update({
      max_ai_content: 5000,
      max_ai_images: 1000,
      max_ai_videos: 100,
      max_active_campaigns: 100,
      max_scheduled_posts: 2500,
      updated_at: now,
    });
  }

  const existingScale = await knex('subscription_plans').where({ id: 'scale' }).first();
  if (existingScale) {
    await knex('subscription_plans').where({ id: 'scale' }).update({
      max_ai_content: 10000,
      max_ai_images: 2000,
      max_ai_videos: 200,
      max_active_campaigns: 200,
      max_scheduled_posts: 5000,
      updated_at: now,
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('subscription_plans', (table) => {
    table.dropColumn('max_ai_content');
    table.dropColumn('max_ai_images');
    table.dropColumn('max_ai_videos');
    table.dropColumn('max_active_campaigns');
    table.dropColumn('max_scheduled_posts');
  });
}
