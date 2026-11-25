import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. AB_TEST_EXPERIMENTS
  const hasExperiments = await knex.schema.hasTable('ab_test_experiments');
  if (!hasExperiments) {
    await knex.schema.createTable('ab_test_experiments', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('status', 50).notNullable().defaultTo('draft'); // draft, running, concluded, cancelled
      table.uuid('winning_variant_id').nullable().references('id').inTable('post_variants').onDelete('SET NULL');
      table.decimal('confidence_score', 5, 2).nullable(); // e.g. 98.50%
      table.integer('sample_size_target').notNullable().defaultTo(1000);
      table.integer('flight_window_hours').notNullable().defaultTo(6);
      table.timestamp('started_at').nullable();
      table.timestamp('concluded_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_ab_exp_brand_status');
      table.index(['post_id'], 'idx_ab_exp_post_id');
    });
  }

  // 2. AB_TEST_VARIANTS
  const hasVariants = await knex.schema.hasTable('ab_test_variants');
  if (!hasVariants) {
    await knex.schema.createTable('ab_test_variants', (table) => {
      table.uuid('id').primary();
      table.uuid('experiment_id').notNullable().references('id').inTable('ab_test_experiments').onDelete('CASCADE');
      table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
      table.string('variant_label', 50).notNullable(); // 'Variant A', 'Variant B', etc.
      table.decimal('traffic_allocation_pct', 5, 2).notNullable().defaultTo(50.0);
      table.integer('impressions').notNullable().defaultTo(0);
      table.integer('engagements').notNullable().defaultTo(0);
      table.integer('clicks').notNullable().defaultTo(0);
      table.integer('shares').notNullable().defaultTo(0);
      table.decimal('conversion_rate', 7, 4).notNullable().defaultTo(0.0);
      table.decimal('viral_score', 5, 2).notNullable().defaultTo(0.0);
      table.boolean('is_winner').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['experiment_id'], 'idx_ab_var_exp_id');
      table.index(['post_variant_id'], 'idx_ab_var_post_variant_id');
    });
  }

  // 3. VIRAL_SCORE_PREDICTIONS
  const hasPredictions = await knex.schema.hasTable('viral_score_predictions');
  if (!hasPredictions) {
    await knex.schema.createTable('viral_score_predictions', (table) => {
      table.uuid('id').primary();
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
      table.decimal('overall_score', 5, 2).notNullable(); // 0.00 to 100.00
      table.string('tier', 50).notNullable(); // 'low', 'moderate', 'high', 'breakout'
      table.decimal('hook_score', 5, 2).notNullable();
      table.decimal('readability_score', 5, 2).notNullable();
      table.decimal('media_synergy_score', 5, 2).notNullable();
      table.decimal('hashtag_score', 5, 2).notNullable();
      table.decimal('velocity_multiplier', 5, 2).notNullable().defaultTo(1.0);
      table.json('recommendations').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id'], 'idx_viral_pred_brand_id');
      table.index(['post_variant_id'], 'idx_viral_pred_variant_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('viral_score_predictions');
  await knex.schema.dropTableIfExists('ab_test_variants');
  await knex.schema.dropTableIfExists('ab_test_experiments');
}
