import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. brand_performance_baselines table
  const hasBaselines = await knex.schema.hasTable('brand_performance_baselines');
  if (!hasBaselines) {
    await knex.schema.createTable('brand_performance_baselines', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').notNullable();
      table.string('platform', 32).notNullable().defaultTo('all');
      table.string('period', 16).notNullable(); // '7d', '30d', '90d', '365d'
      table.integer('post_count').notNullable().defaultTo(0);
      table.float('avg_impressions').notNullable().defaultTo(0);
      table.float('avg_reach').notNullable().defaultTo(0);
      table.float('avg_engagements').notNullable().defaultTo(0);
      table.float('avg_engagement_rate').notNullable().defaultTo(0);
      table.float('avg_shares').notNullable().defaultTo(0);
      table.float('avg_comments').notNullable().defaultTo(0);
      table.float('avg_saves').notNullable().defaultTo(0);
      table.float('avg_clicks').notNullable().defaultTo(0);
      table.float('avg_velocity_score').notNullable().defaultTo(0);
      table.float('avg_half_life_hours').notNullable().defaultTo(0);
      table.timestamp('calculated_at').notNullable().defaultTo(knex.fn.now());
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'brand_id', 'platform', 'period'], 'uniq_baseline_tenant_brand_plat_period');
      table.index(['tenant_id', 'brand_id'], 'idx_baseline_tenant_brand');
      table.index(['brand_id', 'period'], 'idx_baseline_brand_period');
    });
  }

  // 2. growth_recommendations table
  const hasRecommendations = await knex.schema.hasTable('growth_recommendations');
  if (!hasRecommendations) {
    await knex.schema.createTable('growth_recommendations', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').notNullable();
      table.string('category', 64).notNullable(); // 'hook_optimization', 'timing_window', etc.
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.text('suggested_action').notNullable();
      table.string('target_type', 32).notNullable(); // 'automation', 'template', 'campaign', 'calendar'
      table.string('target_id', 64).nullable();
      table.float('confidence_score').notNullable().defaultTo(0.8);
      table.float('estimated_lift_pct').notNullable().defaultTo(0);
      table.string('severity', 16).notNullable().defaultTo('moderate');
      table.string('status', 32).notNullable().defaultTo('active'); // 'active', 'applied', 'dismissed'
      table.timestamp('applied_at').nullable();
      table.uuid('applied_by_user_id').nullable();
      table.json('rationale').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_rec_tenant_brand');
      table.index(['brand_id', 'status'], 'idx_rec_brand_status');
      table.index(['status'], 'idx_rec_status');
    });
  }

  // 3. experiment_variants table
  const hasExperimentVariants = await knex.schema.hasTable('experiment_variants');
  if (!hasExperimentVariants) {
    await knex.schema.createTable('experiment_variants', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').notNullable();
      table.string('experiment_id', 64).notNullable();
      table.string('experiment_name', 255).notNullable();
      table.text('hypothesis').nullable();
      table.string('variant_letter', 8).notNullable(); // 'A', 'B', etc.
      table.string('variant_type', 32).notNullable(); // 'hook', 'format', 'timing', 'cta', 'creative'
      table.string('post_variant_id', 64).nullable();
      table.integer('sample_size').notNullable().defaultTo(0);
      table.integer('engagements').notNullable().defaultTo(0);
      table.integer('impressions').notNullable().defaultTo(0);
      table.integer('conversions').notNullable().defaultTo(0);
      table.float('conversion_rate').notNullable().defaultTo(0);
      table.float('engagement_rate').notNullable().defaultTo(0);
      table.float('lift_vs_control_pct').notNullable().defaultTo(0);
      table.float('p_value').nullable();
      table.float('confidence_level').notNullable().defaultTo(0.95);
      table.boolean('is_winner').notNullable().defaultTo(false);
      table.string('status', 32).notNullable().defaultTo('running'); // 'draft', 'running', 'concluded', 'promoted'
      table.timestamp('concluded_at').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_exp_tenant_brand');
      table.index(['experiment_id'], 'idx_exp_id');
      table.index(['brand_id', 'status'], 'idx_exp_brand_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('experiment_variants');
  await knex.schema.dropTableIfExists('growth_recommendations');
  await knex.schema.dropTableIfExists('brand_performance_baselines');
}
