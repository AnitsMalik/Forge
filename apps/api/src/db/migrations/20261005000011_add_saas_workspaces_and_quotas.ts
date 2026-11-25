import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. Add tenant_id to social_accounts if missing
  const hasSocialAccounts = await knex.schema.hasTable('social_accounts');
  if (hasSocialAccounts) {
    const hasTenantId = await knex.schema.hasColumn('social_accounts', 'tenant_id');
    if (!hasTenantId) {
      await knex.schema.alterTable('social_accounts', (table) => {
        table.uuid('tenant_id').nullable().after('brand_id');
        table.index(['tenant_id'], 'idx_social_accounts_tenant');
      });

      // Backfill tenant_id from brands
      await knex.raw(`
        UPDATE social_accounts sa
        JOIN brands b ON sa.brand_id = b.id
        SET sa.tenant_id = b.tenant_id
        WHERE sa.tenant_id IS NULL
      `);
    }
  }

  // 2. Add is_superadmin to users if missing
  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers) {
    const hasSuperAdmin = await knex.schema.hasColumn('users', 'is_superadmin');
    if (!hasSuperAdmin) {
      await knex.schema.alterTable('users', (table) => {
        table.boolean('is_superadmin').defaultTo(false).after('email');
      });
    }
  }

  // 3. Create subscription_plans table
  const hasPlans = await knex.schema.hasTable('subscription_plans');
  if (!hasPlans) {
    await knex.schema.createTable('subscription_plans', (table) => {
      table.string('id', 64).primary();
      table.string('name', 128).notNullable();
      table.text('description').nullable();
      table.integer('monthly_price_cents').notNullable().defaultTo(0);
      table.integer('max_brands').notNullable().defaultTo(1);
      table.integer('max_social_accounts').notNullable().defaultTo(3);
      table.integer('max_posts_per_month').notNullable().defaultTo(50);
      table.integer('max_users').notNullable().defaultTo(2);
      table.integer('ai_tokens_monthly').notNullable().defaultTo(100000);
      table.integer('video_render_seconds_monthly').notNullable().defaultTo(300);
      table.json('features').nullable();
      table.timestamps(true, true);
    });

    const now = new Date();
    // Seed standard plans
    await knex('subscription_plans').insert([
      {
        id: 'free_trial',
        name: 'Free Trial',
        description: 'Try SocialForge with 1 brand and essential AI generation.',
        monthly_price_cents: 0,
        max_brands: 1,
        max_social_accounts: 2,
        max_posts_per_month: 20,
        max_users: 1,
        ai_tokens_monthly: 25000,
        video_render_seconds_monthly: 60,
        features: JSON.stringify({ ai_brain: true, ffmpeg_video: false, advanced_analytics: false }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'starter',
        name: 'Starter Creator',
        description: 'For independent creators managing up to 2 distinct brands.',
        monthly_price_cents: 2900,
        max_brands: 2,
        max_social_accounts: 6,
        max_posts_per_month: 100,
        max_users: 2,
        ai_tokens_monthly: 100000,
        video_render_seconds_monthly: 300,
        features: JSON.stringify({ ai_brain: true, ffmpeg_video: true, advanced_analytics: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'growth',
        name: 'Growth Agency',
        description: 'For expanding boutique agencies managing up to 6 brands.',
        monthly_price_cents: 7900,
        max_brands: 6,
        max_social_accounts: 20,
        max_posts_per_month: 500,
        max_users: 6,
        ai_tokens_monthly: 500000,
        video_render_seconds_monthly: 900,
        features: JSON.stringify({ ai_brain: true, ffmpeg_video: true, advanced_analytics: true, client_approvals: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 'agency_scale',
        name: 'Agency Scale Pro',
        description: 'Full unmetered power for high-volume agency operations.',
        monthly_price_cents: 19900,
        max_brands: 30,
        max_social_accounts: 100,
        max_posts_per_month: 5000,
        max_users: 25,
        ai_tokens_monthly: 2500000,
        video_render_seconds_monthly: 3600,
        features: JSON.stringify({ ai_brain: true, ffmpeg_video: true, advanced_analytics: true, client_approvals: true, priority_queues: true }),
        created_at: now,
        updated_at: now,
      },
    ]);
  }

  // 4. Create tenant_subscriptions table
  const hasSubscriptions = await knex.schema.hasTable('tenant_subscriptions');
  if (!hasSubscriptions) {
    await knex.schema.createTable('tenant_subscriptions', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().unique();
      table.string('plan_id', 64).notNullable();
      table.string('stripe_customer_id', 128).nullable();
      table.string('stripe_subscription_id', 128).nullable();
      table.enum('status', ['trialing', 'active', 'past_due', 'canceled', 'unpaid']).notNullable().defaultTo('active');
      table.timestamp('current_period_start').notNullable();
      table.timestamp('current_period_end').notNullable();
      table.boolean('cancel_at_period_end').defaultTo(false);
      table.timestamps(true, true);

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('plan_id').references('id').inTable('subscription_plans');
      table.index(['tenant_id'], 'idx_tenant_subscriptions_tenant');
      table.index(['status'], 'idx_tenant_subscriptions_status');
    });

    // Backfill existing tenants with active agency_scale subscription
    const existingTenants = await knex('tenants').select('id', 'subscription_tier');
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    for (const t of existingTenants) {
      const planId = t.subscription_tier === 'standard' ? 'starter' : 'agency_scale';
      await knex('tenant_subscriptions').insert({
        id: crypto.randomUUID(),
        tenant_id: t.id,
        plan_id: planId,
        status: 'active',
        current_period_start: now,
        current_period_end: oneYearLater,
        cancel_at_period_end: false,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // 5. Create tenant_usage_counters table
  const hasUsageCounters = await knex.schema.hasTable('tenant_usage_counters');
  if (!hasUsageCounters) {
    await knex.schema.createTable('tenant_usage_counters', (table) => {
      table.uuid('tenant_id').notNullable();
      table.string('period_month', 7).notNullable(); // YYYY-MM
      table.integer('posts_created').notNullable().defaultTo(0);
      table.integer('video_render_seconds').notNullable().defaultTo(0);
      table.integer('ai_tokens_consumed').notNullable().defaultTo(0);
      table.timestamps(true, true);

      table.primary(['tenant_id', 'period_month']);
      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_usage_counters');
  await knex.schema.dropTableIfExists('tenant_subscriptions');
  await knex.schema.dropTableIfExists('subscription_plans');

  const hasUsers = await knex.schema.hasTable('users');
  if (hasUsers && (await knex.schema.hasColumn('users', 'is_superadmin'))) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('is_superadmin');
    });
  }

  const hasSocialAccounts = await knex.schema.hasTable('social_accounts');
  if (hasSocialAccounts && (await knex.schema.hasColumn('social_accounts', 'tenant_id'))) {
    await knex.schema.alterTable('social_accounts', (table) => {
      table.dropIndex(['tenant_id'], 'idx_social_accounts_tenant');
      table.dropColumn('tenant_id');
    });
  }
}
