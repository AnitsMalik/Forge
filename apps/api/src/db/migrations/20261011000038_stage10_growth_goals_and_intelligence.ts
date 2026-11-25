import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. brand_goals table
  const hasGoals = await knex.schema.hasTable('brand_goals');
  if (!hasGoals) {
    await knex.schema.createTable('brand_goals', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').notNullable();
      table.string('metric', 64).notNullable(); // 'impressions', 'engagements', 'engagement_rate', 'reach', 'clicks', 'posts_count'
      table.float('target_value').notNullable();
      table.string('period', 32).notNullable().defaultTo('30d'); // '7d', '30d', '90d', '365d', 'monthly'
      table.timestamp('start_date').nullable();
      table.timestamp('end_date').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'brand_id', 'metric', 'period'], 'uniq_goal_tenant_brand_metric_period');
      table.index(['tenant_id', 'brand_id'], 'idx_goal_tenant_brand');
      table.index(['brand_id', 'period'], 'idx_goal_brand_period');
    });
  }

  // 2. cross_channel_repurposings table
  const hasRepurposing = await knex.schema.hasTable('cross_channel_repurposings');
  if (!hasRepurposing) {
    await knex.schema.createTable('cross_channel_repurposings', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').notNullable();
      table.uuid('source_post_id').notNullable();
      table.uuid('source_variant_id').notNullable();
      table.string('source_platform', 32).notNullable();
      table.string('source_format', 32).notNullable();
      table.string('target_platform', 32).notNullable();
      table.string('target_format', 32).notNullable();
      table.string('winning_factor', 255).notNullable();
      table.text('adaptation_guide').notNullable();
      table.float('estimated_potential_lift_pct').notNullable().defaultTo(0);
      table.float('confidence_score').notNullable().defaultTo(0.85);
      table.string('status', 32).notNullable().defaultTo('suggested'); // 'suggested', 'created', 'dismissed'
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_repurposing_tenant_brand');
      table.index(['brand_id', 'status'], 'idx_repurposing_brand_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cross_channel_repurposings');
  await knex.schema.dropTableIfExists('brand_goals');
}
