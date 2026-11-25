import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('video_render_jobs');
  if (!hasTable) {
    await knex.schema.createTable('video_render_jobs', (table) => {
      table.uuid('id').primary();
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('status', 50).notNullable().defaultTo('queued'); // queued, processing, completed, failed
      table.integer('progress').notNullable().defaultTo(0);
      table.string('stage', 255).notNullable().defaultTo('Queued in Engine');
      table.json('request_payload').notNullable();
      table.uuid('result_asset_id').nullable().references('id').inTable('media_assets').onDelete('SET NULL');
      table.text('public_url').nullable();
      table.text('thumbnail_url').nullable();
      table.text('error_message').nullable();
      table.integer('retries').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_video_jobs_brand_status');
      table.index(['created_at'], 'idx_video_jobs_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('video_render_jobs');
}
