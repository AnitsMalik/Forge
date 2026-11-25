import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('template_versions');
  if (!exists) {
    await knex.schema.createTable('template_versions', (table) => {
      table.uuid('id').primary();
      table.uuid('template_id').notNullable().references('id').inTable('templates').onDelete('CASCADE');
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.integer('version_number').notNullable().defaultTo(1);
      table.json('layers').notNullable();
      table.json('background').notNullable();
      table.json('platform_variants').nullable(); // variants adapted for 9:16 reels, 4:5 carousels, 16:9 banners
      table.text('changelog').nullable();
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['template_id', 'version_number'], 'idx_template_versions_lookup');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('template_versions');
  if (exists) {
    await knex.schema.dropTable('template_versions');
  }
}
