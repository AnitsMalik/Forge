import type { Knex } from 'knex';
import crypto from 'crypto';

export async function up(knex: Knex): Promise<void> {
  const now = new Date();

  // 1. Extend tenant_subscriptions with provider_metadata if not present
  const hasTenantSubs = await knex.schema.hasTable('tenant_subscriptions');
  if (hasTenantSubs) {
    const hasMetadata = await knex.schema.hasColumn('tenant_subscriptions', 'provider_metadata');
    if (!hasMetadata) {
      await knex.schema.alterTable('tenant_subscriptions', (table) => {
        table.json('provider_metadata').nullable().after('provider_subscription_id');
      });
    }
  }

  // 2. Create entitlements table
  // Stores plan & tenant entitlement state with tenant and optional brand scoping
  const hasEntitlements = await knex.schema.hasTable('entitlements');
  if (!hasEntitlements) {
    await knex.schema.createTable('entitlements', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').nullable();
      table.string('plan_id', 64).nullable();
      table.string('resource', 64).notNullable(); // e.g. 'brands', 'seats', 'social_accounts', 'posts', 'ai_credits', etc.
      table.boolean('is_enabled').notNullable().defaultTo(true);
      table.bigInteger('limit_value').nullable(); // null represents unmetered / unlimited
      table.json('config').nullable(); // extra constraints e.g. { max_autonomy_level: 'L3', retention_days: 90 }
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('brand_id').references('id').inTable('brands').onDelete('CASCADE');
      table.foreign('plan_id').references('id').inTable('subscription_plans').onDelete('SET NULL');

      table.unique(['tenant_id', 'brand_id', 'resource'], 'uniq_entitlement_tenant_brand_resource');
      table.index(['tenant_id'], 'idx_entitlements_tenant');
      table.index(['brand_id'], 'idx_entitlements_brand');
      table.index(['resource'], 'idx_entitlements_resource');
      table.index(['tenant_id', 'resource'], 'idx_entitlements_tenant_resource');
      table.index(['created_at'], 'idx_entitlements_created_at');
    });

    // Backfill entitlements for existing active tenants based on their subscription plan
    const tenantsWithSubs = await knex('tenants')
      .leftJoin('tenant_subscriptions', 'tenants.id', 'tenant_subscriptions.tenant_id')
      .leftJoin('subscription_plans', 'tenant_subscriptions.plan_id', 'subscription_plans.id')
      .select(
        'tenants.id as tenant_id',
        'subscription_plans.id as plan_id',
        'subscription_plans.max_brands',
        'subscription_plans.max_users',
        'subscription_plans.max_social_accounts',
        'subscription_plans.max_posts_per_month',
        'subscription_plans.ai_tokens_monthly',
        'subscription_plans.video_render_seconds_monthly',
        'subscription_plans.storage_bytes_limit',
        'subscription_plans.features'
      );

    const standardResources = [
      'brands',
      'seats',
      'social_accounts',
      'active_automations',
      'ai_credits',
      'video_minutes',
      'storage',
      'posts',
      'analytics_retention',
      'premium_connectors',
      'autonomy_level',
      'agency_workspaces',
    ];

    for (const t of tenantsWithSubs) {
      if (!t.tenant_id) continue;
      const features: Record<string, any> =
        typeof t.features === 'string' ? JSON.parse(t.features || '{}') : t.features || {};

      for (const r of standardResources) {
        let limitVal: number | null = null;
        let isEnabled = true;
        let cfg: Record<string, any> | null = null;

        if (r === 'brands') limitVal = t.max_brands ?? 1;
        else if (r === 'seats') limitVal = t.max_users ?? 2;
        else if (r === 'social_accounts') limitVal = t.max_social_accounts ?? 3;
        else if (r === 'posts') limitVal = t.max_posts_per_month ?? 100;
        else if (r === 'ai_credits') limitVal = t.ai_tokens_monthly ?? 100000;
        else if (r === 'video_minutes') limitVal = t.video_render_seconds_monthly ?? 300;
        else if (r === 'storage') limitVal = t.storage_bytes_limit ?? 5368709120;
        else if (r === 'active_automations') limitVal = features.max_active_automations ?? 3;
        else if (r === 'analytics_retention') {
          limitVal = features.analytics_retention_days ?? 30;
          cfg = { retention_days: features.analytics_retention_days ?? 30 };
        } else if (r === 'premium_connectors') {
          isEnabled = Boolean(features.premium_connectors);
          limitVal = isEnabled ? 1 : 0;
        } else if (r === 'autonomy_level') {
          const maxLevel = features.max_autonomy_level || 'L2';
          cfg = { max_autonomy_level: maxLevel };
          limitVal = maxLevel === 'L5' ? 5 : maxLevel === 'L4' ? 4 : maxLevel === 'L3' ? 3 : 2;
        } else if (r === 'agency_workspaces') {
          isEnabled = Boolean(features.agency_workspaces);
          limitVal = isEnabled ? 1 : 0;
        }

        await knex('entitlements').insert({
          id: crypto.randomUUID(),
          tenant_id: t.tenant_id,
          brand_id: null,
          plan_id: t.plan_id || 'starter',
          resource: r,
          is_enabled: isEnabled,
          limit_value: limitVal,
          config: cfg ? JSON.stringify(cfg) : null,
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  // 3. Create usage_counters table
  // Tracks metered resources with tenant, brand where applicable, metric, period, current usage, limit, and timestamps
  const hasUsageCounters = await knex.schema.hasTable('usage_counters');
  if (!hasUsageCounters) {
    await knex.schema.createTable('usage_counters', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').nullable();
      table.string('metric', 64).notNullable(); // e.g. 'posts', 'ai_credits', 'video_minutes', 'storage', 'active_automations'
      table.string('period', 32).notNullable(); // e.g. '2026-10', 'current'
      table.decimal('current_usage', 14, 2).notNullable().defaultTo(0);
      table.decimal('limit_value', 14, 2).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('brand_id').references('id').inTable('brands').onDelete('CASCADE');

      table.unique(['tenant_id', 'brand_id', 'metric', 'period'], 'uniq_usage_tenant_brand_metric_period');
      table.index(['tenant_id'], 'idx_usage_counters_tenant');
      table.index(['brand_id'], 'idx_usage_counters_brand');
      table.index(['metric'], 'idx_usage_counters_metric');
      table.index(['period'], 'idx_usage_counters_period');
      table.index(['tenant_id', 'metric', 'period'], 'idx_usage_tenant_metric_period');
      table.index(['created_at'], 'idx_usage_counters_created_at');
    });

    // Backfill from tenant_usage_counters if present
    const hasLegacyCounters = await knex.schema.hasTable('tenant_usage_counters');
    if (hasLegacyCounters) {
      const legacyRows = await knex('tenant_usage_counters').select('*');
      for (const row of legacyRows) {
        const metricsMap = [
          { metric: 'posts', amount: Number(row.posts_published || row.posts_created || 0) },
          { metric: 'ai_credits', amount: Number(row.ai_tokens_consumed || 0) },
          { metric: 'video_minutes', amount: Number(row.video_render_seconds || 0) },
          { metric: 'storage', amount: Number(row.storage_bytes_used || 0) },
        ];

        for (const m of metricsMap) {
          await knex('usage_counters').insert({
            id: crypto.randomUUID(),
            tenant_id: row.tenant_id,
            brand_id: null,
            metric: m.metric,
            period: row.period_month,
            current_usage: m.amount,
            limit_value: null,
            created_at: row.created_at || now,
            updated_at: row.updated_at || now,
          });
        }
      }
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop usage_counters
  await knex.schema.dropTableIfExists('usage_counters');

  // Drop entitlements
  await knex.schema.dropTableIfExists('entitlements');

  // Drop provider_metadata from tenant_subscriptions
  const hasTenantSubs = await knex.schema.hasTable('tenant_subscriptions');
  if (hasTenantSubs) {
    const hasMetadata = await knex.schema.hasColumn('tenant_subscriptions', 'provider_metadata');
    if (hasMetadata) {
      await knex.schema.alterTable('tenant_subscriptions', (table) => {
        table.dropColumn('provider_metadata');
      });
    }
  }
}
