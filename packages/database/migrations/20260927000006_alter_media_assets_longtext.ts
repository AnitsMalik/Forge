import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('media_assets');
  if (hasTable) {
    await knex.raw('ALTER TABLE media_assets MODIFY public_url LONGTEXT, MODIFY thumbnail_url LONGTEXT, MODIFY storage_key LONGTEXT');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('media_assets');
  if (hasTable) {
    await knex.raw('ALTER TABLE media_assets MODIFY public_url TEXT, MODIFY thumbnail_url TEXT, MODIFY storage_key TEXT');
  }
}
