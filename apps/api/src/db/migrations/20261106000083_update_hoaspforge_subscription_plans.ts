import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. Add annual_price_cents column if not present
  const hasAnnualCol = await knex.schema.hasColumn('subscription_plans', 'annual_price_cents');
  if (!hasAnnualCol) {
    await knex.schema.alterTable('subscription_plans', (table) => {
      table.integer('annual_price_cents').nullable().after('monthly_price_cents');
    });
  }

  // 2. STARTER: $29/mo, $288/yr, 1 brand, 2 seats, 3 social accounts, 100 posts/mo, 5GB storage, 3 automations
  await knex('subscription_plans')
    .where({ id: 'starter' })
    .update({
      name: 'Starter',
      slug: 'starter',
      description: 'Essential social publishing, basic CRM, design studio, and foundational AI marketing assistance.',
      price: 29.00,
      monthly_price_cents: 2900,
      annual_price_cents: 28800,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 1,
      max_users: 2,
      max_social_accounts: 3,
      max_posts_per_month: 100,
      ai_tokens_monthly: 100000,
      video_render_seconds_monthly: 300,
      storage_bytes_limit: 5368709120, // 5 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: false,
        client_approvals: false,
        priority_queues: false,
        ads_management: false,
        max_active_automations: 3,
        max_autonomy_level: 'L2',
        analytics_retention_days: 30,
      }),
      is_active: 1,
      updated_at: now,
    });

  // 3. GROWTH: $79/mo, $780/yr, 5 brands, 5 seats, 15 social accounts, 500 posts/mo, 20GB storage, 10 automations
  await knex('subscription_plans')
    .where({ id: 'growth' })
    .update({
      name: 'Growth',
      slug: 'growth',
      description: 'For growing businesses: advanced analytics, full AI Design Studio, Video/Reels, WhatsApp & approvals.',
      price: 79.00,
      monthly_price_cents: 7900,
      annual_price_cents: 78000,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 5,
      max_users: 5,
      max_social_accounts: 15,
      max_posts_per_month: 500,
      ai_tokens_monthly: 500000,
      video_render_seconds_monthly: 1200,
      storage_bytes_limit: 21474836480, // 20 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: true,
        client_approvals: true,
        priority_queues: false,
        ads_management: false,
        agency_workspaces: false,
        max_active_automations: 10,
        max_autonomy_level: 'L3',
        analytics_retention_days: 90,
        whatsapp_enabled: true,
      }),
      is_active: 1,
      updated_at: now,
    });

  // 4. AGENCY PRO: $199/mo, $1,908/yr, 25 brands, 20 seats, 100 social accounts, 2,500 posts/mo, 100GB storage, 50 automations
  await knex('subscription_plans').where({ id: 'agency' }).update({
    name: 'Agency Pro',
    slug: 'agency-pro',
    description: 'For digital agencies: 25 brands, multi-client agency workspaces, advanced Brand Brain & API access.',
    price: 199.00,
    monthly_price_cents: 19900,
    annual_price_cents: 190800,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 25,
    max_users: 20,
    max_social_accounts: 100,
    max_posts_per_month: 2500,
    ai_tokens_monthly: 2500000,
    video_render_seconds_monthly: 3600,
    storage_bytes_limit: 107374182400, // 100 GB
    features: JSON.stringify({
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: true,
      ads_management: true,
      agency_workspaces: true,
      custom_branding: true,
      api_access: true,
      max_active_automations: 50,
      max_autonomy_level: 'L4',
      analytics_retention_days: 365,
      whatsapp_enabled: true,
      multi_brand_brain: true,
    }),
    is_active: 1,
    updated_at: now,
  });

  await knex('subscription_plans').where({ id: 'agency_scale' }).update({
    name: 'Agency Scale Pro',
    slug: 'agency-scale-pro',
    description: 'For digital agencies: 25 brands, multi-client agency workspaces, advanced Brand Brain & API access.',
    price: 199.00,
    monthly_price_cents: 19900,
    annual_price_cents: 190800,
    currency: 'usd',
    billing_interval: 'month',
    max_brands: 25,
    max_users: 20,
    max_social_accounts: 100,
    max_posts_per_month: 2500,
    ai_tokens_monthly: 2500000,
    video_render_seconds_monthly: 3600,
    storage_bytes_limit: 107374182400, // 100 GB
    features: JSON.stringify({
      ai_brain: true,
      ffmpeg_video: true,
      advanced_analytics: true,
      client_approvals: true,
      priority_queues: true,
      ads_management: true,
      agency_workspaces: true,
      custom_branding: true,
      api_access: true,
      max_active_automations: 50,
      max_autonomy_level: 'L4',
      analytics_retention_days: 365,
      whatsapp_enabled: true,
      multi_brand_brain: true,
    }),
    is_active: 1,
    updated_at: now,
  });

  // 5. SCALE: $499/mo, $4,788/yr, 100 brands, 50 seats, 250 social accounts, 10,000 posts/mo, 500GB storage, 200 automations
  await knex('subscription_plans')
    .where({ id: 'scale' })
    .update({
      name: 'Scale',
      slug: 'scale',
      description: 'High-throughput publishing across up to 100 brands, 200 automations, L5 autonomous agent, and SCIM.',
      price: 499.00,
      monthly_price_cents: 49900,
      annual_price_cents: 478800,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 100,
      max_users: 50,
      max_social_accounts: 250,
      max_posts_per_month: 10000,
      ai_tokens_monthly: 10000000,
      video_render_seconds_monthly: 18000,
      storage_bytes_limit: 536870912000, // 500 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: true,
        client_approvals: true,
        priority_queues: true,
        ads_management: true,
        agency_workspaces: true,
        custom_branding: true,
        api_access: true,
        max_active_automations: 200,
        max_autonomy_level: 'L5',
        analytics_retention_days: 730,
        whatsapp_enabled: true,
        multi_brand_brain: true,
        enterprise_governance: true,
        scim_provisioning: true,
      }),
      is_active: 1,
      updated_at: now,
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex('subscription_plans').where({ id: 'agency' }).update({ price: 249.00, monthly_price_cents: 24900 });
  await knex('subscription_plans').where({ id: 'agency_scale' }).update({ price: 249.00, monthly_price_cents: 24900 });
  await knex('subscription_plans').where({ id: 'scale' }).update({ price: 599.00, monthly_price_cents: 59900 });
}
