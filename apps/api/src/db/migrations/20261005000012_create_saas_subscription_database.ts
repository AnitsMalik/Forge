import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  // 1. Upgrade subscription_plans to support full SaaS catalog
  const hasPlans = await knex.schema.hasTable('subscription_plans');
  if (hasPlans) {
    const hasSlug = await knex.schema.hasColumn('subscription_plans', 'slug');
    if (!hasSlug) {
      await knex.schema.alterTable('subscription_plans', (table) => {
        table.string('slug', 64).nullable().after('name');
        table.decimal('price', 10, 2).notNullable().defaultTo(0).after('description');
        table.string('currency', 10).notNullable().defaultTo('usd').after('price');
        table.enum('billing_interval', ['month', 'year']).notNullable().defaultTo('month').after('currency');
        table.bigInteger('storage_bytes_limit').notNullable().defaultTo(10737418240).after('video_render_seconds_monthly'); // 10 GB
        table.boolean('is_active').notNullable().defaultTo(true).after('features');
      });

      // Populate slugs and price for existing plans
      await knex('subscription_plans').where({ id: 'free_trial' }).update({
        slug: 'free-trial',
        price: 0.00,
        currency: 'usd',
        billing_interval: 'month',
        storage_bytes_limit: 1073741824, // 1 GB
        is_active: true,
      });

      await knex('subscription_plans').where({ id: 'starter' }).update({
        slug: 'starter-creator',
        price: 29.00,
        currency: 'usd',
        billing_interval: 'month',
        storage_bytes_limit: 5368709120, // 5 GB
        is_active: true,
      });

      await knex('subscription_plans').where({ id: 'growth' }).update({
        slug: 'growth-agency',
        price: 79.00,
        currency: 'usd',
        billing_interval: 'month',
        storage_bytes_limit: 21474836480, // 20 GB
        is_active: true,
      });

      await knex('subscription_plans').where({ id: 'agency_scale' }).update({
        slug: 'agency-scale-pro',
        price: 199.00,
        currency: 'usd',
        billing_interval: 'month',
        storage_bytes_limit: 107374182400, // 100 GB
        is_active: true,
      });

      // Add unique constraint on slug
      await knex.schema.alterTable('subscription_plans', (table) => {
        table.unique(['slug'], 'uniq_subscription_plans_slug');
      });
    }

    // Seed safe grandfathered legacy plan for existing production tenants
    const hasLegacyPlan = await knex('subscription_plans').where({ id: 'legacy_agency_grandfathered' }).first();
    const now = new Date();
    if (!hasLegacyPlan) {
      await knex('subscription_plans').insert({
        id: 'legacy_agency_grandfathered',
        name: 'Agency Grandfathered Lifetime',
        slug: 'agency-grandfathered-lifetime',
        description: 'Safe grandfathered production plan ensuring uninterrupted operations for existing agency tenants.',
        price: 0.00,
        currency: 'usd',
        billing_interval: 'month',
        monthly_price_cents: 0,
        max_brands: 50,
        max_social_accounts: 250,
        max_posts_per_month: 10000,
        max_users: 50,
        ai_tokens_monthly: 5000000,
        video_render_seconds_monthly: 7200,
        storage_bytes_limit: 107374182400, // 100 GB
        features: JSON.stringify({
          ai_brain: true,
          ffmpeg_video: true,
          advanced_analytics: true,
          client_approvals: true,
          priority_queues: true,
          grandfathered: true,
        }),
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // 2. Upgrade tenant_subscriptions to support full provider tracking and lifecycle
  const hasTenantSubs = await knex.schema.hasTable('tenant_subscriptions');
  if (hasTenantSubs) {
    const hasProvider = await knex.schema.hasColumn('tenant_subscriptions', 'provider');
    if (!hasProvider) {
      await knex.schema.alterTable('tenant_subscriptions', (table) => {
        table.string('provider', 50).notNullable().defaultTo('system').after('status');
        table.string('provider_customer_id', 128).nullable().after('provider');
        table.string('provider_subscription_id', 128).nullable().after('provider_customer_id');
        table.timestamp('trial_start_at').nullable().after('current_period_end');
        table.timestamp('trial_end_at').nullable().after('trial_start_at');
        table.timestamp('canceled_at').nullable().after('cancel_at_period_end');
        table.timestamp('ended_at').nullable().after('canceled_at');
        table.index(['provider'], 'idx_tenant_subscriptions_provider');
        table.index(['provider_customer_id'], 'idx_tenant_subscriptions_cust_id');
        table.index(['provider_subscription_id'], 'idx_tenant_subscriptions_sub_id');
      });

      // Synchronize existing stripe IDs if present
      await knex.raw(`
        UPDATE tenant_subscriptions
        SET 
          provider_customer_id = COALESCE(stripe_customer_id, provider_customer_id),
          provider_subscription_id = COALESCE(stripe_subscription_id, provider_subscription_id),
          provider = CASE WHEN stripe_customer_id IS NOT NULL THEN 'stripe' ELSE 'system' END
      `);
    }

    // Modify status column to support all 6 required statuses: trialing, active, past_due, paused, cancelled, expired
    await knex.raw(`
      ALTER TABLE tenant_subscriptions 
      MODIFY COLUMN status ENUM('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired') NOT NULL DEFAULT 'active'
    `);

    // Ensure all existing tenants receive safe grandfathered legacy subscription
    const tenYearFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    const tenants = await knex('tenants').select('id');

    for (const t of tenants) {
      const existingSub = await knex('tenant_subscriptions').where({ tenant_id: t.id }).first();
      if (!existingSub) {
        await knex('tenant_subscriptions').insert({
          id: crypto.randomUUID(),
          tenant_id: t.id,
          plan_id: 'legacy_agency_grandfathered',
          status: 'active',
          provider: 'system',
          current_period_start: new Date(),
          current_period_end: tenYearFuture,
          cancel_at_period_end: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        // Upgrade current subscription period to ensure active grandfathered status
        await knex('tenant_subscriptions').where({ id: existingSub.id }).update({
          status: 'active',
          current_period_end: tenYearFuture,
          updated_at: new Date(),
        });
      }
    }
  }

  // 3. Upgrade tenant_usage_counters to support storage limits
  const hasUsage = await knex.schema.hasTable('tenant_usage_counters');
  if (hasUsage) {
    const hasStorage = await knex.schema.hasColumn('tenant_usage_counters', 'storage_bytes_used');
    if (!hasStorage) {
      await knex.schema.alterTable('tenant_usage_counters', (table) => {
        table.bigInteger('storage_bytes_used').notNullable().defaultTo(0).after('ai_tokens_consumed');
      });
    }
  }

  // 4. Create billing_events table
  const hasBillingEvents = await knex.schema.hasTable('billing_events');
  if (!hasBillingEvents) {
    await knex.schema.createTable('billing_events', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').nullable();
      table.string('event_type', 100).notNullable();
      table.string('provider', 50).notNullable().defaultTo('system');
      table.string('provider_event_id', 255).nullable();
      table.json('payload').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('SET NULL');
      table.index(['tenant_id'], 'idx_billing_events_tenant');
      table.index(['event_type'], 'idx_billing_events_type');
      table.index(['provider_event_id'], 'idx_billing_events_provider_id');
      table.index(['created_at'], 'idx_billing_events_created');
    });
  }

  // 5. Create billing_invoices table
  const hasBillingInvoices = await knex.schema.hasTable('billing_invoices');
  if (!hasBillingInvoices) {
    await knex.schema.createTable('billing_invoices', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('subscription_id').nullable();
      table.string('invoice_number', 100).notNullable().unique();
      table.integer('amount_due_cents').notNullable().defaultTo(0);
      table.integer('amount_paid_cents').notNullable().defaultTo(0);
      table.string('currency', 10).notNullable().defaultTo('usd');
      table.enum('status', ['draft', 'open', 'paid', 'uncollectible', 'void']).notNullable().defaultTo('draft');
      table.string('provider', 50).notNullable().defaultTo('system');
      table.string('provider_invoice_id', 255).nullable();
      table.string('hosted_invoice_url', 512).nullable();
      table.string('invoice_pdf_url', 512).nullable();
      table.timestamp('period_start').nullable();
      table.timestamp('period_end').nullable();
      table.timestamp('paid_at').nullable();
      table.timestamps(true, true);

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('subscription_id').references('id').inTable('tenant_subscriptions').onDelete('SET NULL');
      table.index(['tenant_id'], 'idx_billing_invoices_tenant');
      table.index(['status'], 'idx_billing_invoices_status');
      table.index(['invoice_number'], 'idx_billing_invoices_number');
      table.index(['provider_invoice_id'], 'idx_billing_invoices_provider_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('billing_invoices');
  await knex.schema.dropTableIfExists('billing_events');

  const hasUsage = await knex.schema.hasTable('tenant_usage_counters');
  if (hasUsage && (await knex.schema.hasColumn('tenant_usage_counters', 'storage_bytes_used'))) {
    await knex.schema.alterTable('tenant_usage_counters', (table) => {
      table.dropColumn('storage_bytes_used');
    });
  }

  const hasTenantSubs = await knex.schema.hasTable('tenant_subscriptions');
  if (hasTenantSubs && (await knex.schema.hasColumn('tenant_subscriptions', 'provider'))) {
    await knex.schema.alterTable('tenant_subscriptions', (table) => {
      table.dropIndex(['provider'], 'idx_tenant_subscriptions_provider');
      table.dropIndex(['provider_customer_id'], 'idx_tenant_subscriptions_cust_id');
      table.dropIndex(['provider_subscription_id'], 'idx_tenant_subscriptions_sub_id');
      table.dropColumn('provider');
      table.dropColumn('provider_customer_id');
      table.dropColumn('provider_subscription_id');
      table.dropColumn('trial_start_at');
      table.dropColumn('trial_end_at');
      table.dropColumn('canceled_at');
      table.dropColumn('ended_at');
    });
  }

  const hasPlans = await knex.schema.hasTable('subscription_plans');
  if (hasPlans && (await knex.schema.hasColumn('subscription_plans', 'slug'))) {
    await knex.schema.alterTable('subscription_plans', (table) => {
      table.dropUnique(['slug'], 'uniq_subscription_plans_slug');
      table.dropColumn('slug');
      table.dropColumn('price');
      table.dropColumn('currency');
      table.dropColumn('billing_interval');
      table.dropColumn('storage_bytes_limit');
      table.dropColumn('is_active');
    });
  }
}
