import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. STARTER: $29/mo, 1 brand, 3 social accounts, 100 posts/month
  const starterExists = await knex('subscription_plans').where({ id: 'starter' }).first();
  if (starterExists) {
    await knex('subscription_plans').where({ id: 'starter' }).update({
      name: 'Starter',
      slug: 'starter',
      description: 'Ideal for solo creators and emerging businesses managing 1 brand.',
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
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: false,
        client_approvals: false,
        priority_queues: false,
        ads_management: false,
      }),
      is_active: true,
      updated_at: now,
    });
  }

  // 2. GROWTH: $79/mo, 5 brands, 15 social accounts, 500 posts/month
  const growthExists = await knex('subscription_plans').where({ id: 'growth' }).first();
  if (growthExists) {
    await knex('subscription_plans').where({ id: 'growth' }).update({
      name: 'Growth',
      slug: 'growth',
      description: 'For growing businesses and boutique marketing agencies managing up to 5 brands.',
      price: 79.00,
      monthly_price_cents: 7900,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 5,
      max_social_accounts: 15,
      max_posts_per_month: 500,
      max_users: 5,
      ai_tokens_monthly: 500000,
      video_render_seconds_monthly: 1200, // 20 mins
      storage_bytes_limit: 21474836480, // 20 GB
      features: JSON.stringify({
        ai_brain: true,
        ffmpeg_video: true,
        advanced_analytics: true,
        client_approvals: true,
        priority_queues: false,
        ads_management: false,
      }),
      is_active: true,
      updated_at: now,
    });
  }

  // 3. AGENCY: $249/mo, 25 brands, 100 social accounts, 2,500 posts/month
  // Configure both 'agency' and 'agency_scale' so both identifiers resolve seamlessly
  const agencyExists = await knex('subscription_plans').where({ id: 'agency' }).first();
  if (!agencyExists) {
    await knex('subscription_plans').insert({
      id: 'agency',
      name: 'Agency',
      slug: 'agency',
      description: 'Full unmetered power for marketing agencies managing up to 25 client brands.',
      price: 249.00,
      monthly_price_cents: 24900,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 25,
      max_social_accounts: 100,
      max_posts_per_month: 2500,
      max_users: 20,
      ai_tokens_monthly: 2500000,
      video_render_seconds_monthly: 3600, // 60 mins
      storage_bytes_limit: 107374182400, // 100 GB
      features: JSON.stringify({
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
      created_at: now,
      updated_at: now,
    });
  } else {
    await knex('subscription_plans').where({ id: 'agency' }).update({
      name: 'Agency',
      slug: 'agency',
      description: 'Full unmetered power for marketing agencies managing up to 25 client brands.',
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
      storage_bytes_limit: 107374182400,
      features: JSON.stringify({
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
    });
  }

  const agencyScaleExists = await knex('subscription_plans').where({ id: 'agency_scale' }).first();
  if (agencyScaleExists) {
    await knex('subscription_plans').where({ id: 'agency_scale' }).update({
      name: 'Agency Scale Pro',
      slug: 'agency-scale-pro',
      description: 'Full unmetered power for marketing agencies managing up to 25 client brands.',
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
      storage_bytes_limit: 107374182400,
      features: JSON.stringify({
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
    });
  }

  // NOTE: Existing tenant subscriptions are explicitly NOT modified.
  // Existing tenants' current access and grandfathered lifetime plans remain completely preserved.
}

export async function down(knex: Knex): Promise<void> {
  await knex('subscription_plans').where({ id: 'agency' }).del();
}
