import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. POST_ANALYTICS_METRICS (Granular metric timeseries & upsert records)
  const hasMetricsTable = await knex.schema.hasTable('post_analytics_metrics');
  if (!hasMetricsTable) {
    await knex.schema.createTable('post_analytics_metrics', (table) => {
      table.uuid('id').primary();
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
      table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
      table.string('platform', 50).notNullable();
      table.string('remote_post_id', 255).notNullable();
      table.string('metric', 100).notNullable();
      table.decimal('value', 14, 4).notNullable();
      table.timestamp('metric_date').notNullable().defaultTo(knex.fn.now());
      table.timestamp('fetched_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['post_variant_id', 'metric', 'metric_date'], 'uq_variant_metric_date');
      table.index(['brand_id', 'metric_date'], 'idx_post_analytics_brand_date');
      table.index(['remote_post_id'], 'idx_post_analytics_remote_id');
      table.index(['post_id'], 'idx_post_analytics_post_id');
      table.index(['platform'], 'idx_post_analytics_platform');
    });
  }

  // 2. POST_ANALYTICS_SNAPSHOTS (Fast indexed query cache of current real metrics per variant)
  const hasSnapshotsTable = await knex.schema.hasTable('post_analytics_snapshots');
  if (!hasSnapshotsTable) {
    await knex.schema.createTable('post_analytics_snapshots', (table) => {
      table.uuid('id').primary();
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
      table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE').unique();
      table.string('platform', 50).notNullable();
      table.string('remote_post_id', 255).notNullable();
      table.integer('reach').nullable();
      table.integer('impressions').nullable();
      table.integer('reactions').nullable();
      table.integer('likes').nullable();
      table.integer('comments').nullable();
      table.integer('shares').nullable();
      table.integer('saves').nullable();
      table.integer('clicks').nullable();
      table.integer('video_views').nullable();
      table.integer('profile_activity').nullable();
      table.integer('engagement').nullable();
      table.decimal('engagement_rate', 7, 2).nullable();
      table.json('raw_metrics').nullable();
      table.timestamp('last_fetched_at').notNullable().defaultTo(knex.fn.now());
      table.text('last_error').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'platform'], 'idx_snapshots_brand_platform');
      table.index(['remote_post_id'], 'idx_snapshots_remote_id');
      table.index(['post_id'], 'idx_snapshots_post_id');
      table.index(['last_fetched_at'], 'idx_snapshots_fetched_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('post_analytics_snapshots');
  await knex.schema.dropTableIfExists('post_analytics_metrics');
}
