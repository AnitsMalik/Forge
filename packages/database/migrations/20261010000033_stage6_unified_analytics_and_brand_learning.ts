import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. ANALYTICS_WINNERS Table
  const hasWinnersTable = await knex.schema.hasTable('analytics_winners');
  if (!hasWinnersTable) {
    await knex.schema.createTable('analytics_winners', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
      table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
      table.string('platform', 50).notNullable();
      table.string('remote_post_id', 255).nullable();
      table.string('winner_type', 64).notNullable(); // 'statistical_outperformer' | 'velocity_surge' | 'creative_angle_winner' | 'high_conversion'
      table.decimal('score', 12, 4).notNullable().defaultTo(0);
      table.decimal('lift_multiplier', 8, 2).notNullable().defaultTo(1.0);
      table.json('baseline_benchmark').nullable();
      table.json('metrics_snapshot').notNullable();
      table.json('winning_attributes').nullable();
      table.boolean('automation_dispatched').notNullable().defaultTo(false);
      table.uuid('automation_run_id').nullable();
      table.timestamp('detected_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_analytics_winners_tenant_brand');
      table.index(['post_variant_id'], 'idx_analytics_winners_variant');
      table.index(['winner_type'], 'idx_analytics_winners_type');
      table.index(['detected_at'], 'idx_analytics_winners_detected');
    });
  }

  // 2. BRAND_LEARNING_INSIGHTS Table
  const hasLearningTable = await knex.schema.hasTable('brand_learning_insights');
  if (!hasLearningTable) {
    await knex.schema.createTable('brand_learning_insights', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('insight_type', 64).notNullable(); // 'hook_strategy' | 'creative_angle' | 'cta_pattern' | 'hashtag_affinity' | 'posting_window' | 'format_performance'
      table.string('title', 255).notNullable();
      table.text('summary').notNullable();
      table.float('confidence').notNullable().defaultTo(1.0);
      table.integer('sample_size').notNullable().defaultTo(1);
      table.decimal('performance_lift', 8, 2).notNullable().defaultTo(0.0);
      table.text('recommended_action').nullable();
      table.json('metadata').nullable();
      table.boolean('applied_to_brand_brain').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_brand_learning_tenant_brand');
      table.index(['insight_type'], 'idx_brand_learning_type');
    });
  }

  // 3. Extend post_analytics_snapshots with extra cross-platform telemetry columns if missing
  const hasSnapshots = await knex.schema.hasTable('post_analytics_snapshots');
  if (hasSnapshots) {
    const hasWatchTime = await knex.schema.hasColumn('post_analytics_snapshots', 'watch_time_seconds');
    if (!hasWatchTime) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.integer('watch_time_seconds').nullable();
      });
    }

    const hasCtr = await knex.schema.hasColumn('post_analytics_snapshots', 'ctr');
    if (!hasCtr) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.decimal('ctr', 7, 2).nullable();
      });
    }

    const hasVelocity = await knex.schema.hasColumn('post_analytics_snapshots', 'velocity_score');
    if (!hasVelocity) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.decimal('velocity_score', 10, 2).nullable();
      });
    }

    const hasRoi = await knex.schema.hasColumn('post_analytics_snapshots', 'roi');
    if (!hasRoi) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.decimal('roi', 10, 2).nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('brand_learning_insights');
  await knex.schema.dropTableIfExists('analytics_winners');
}
