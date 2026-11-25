import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('connector_resources');
  if (!exists) {
    await knex.schema.createTable('connector_resources', (table) => {
      table.uuid('id').primary();
      table.uuid('connection_id').notNullable().references('id').inTable('social_connections').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('resource_type', 64).notNullable(); // 'page' | 'instagram_business' | 'drive_folder' | 'sheet' | 'ad_account'
      table.string('external_resource_id', 255).notNullable();
      table.string('resource_name', 255).notNullable();
      table.boolean('is_selected').notNullable().defaultTo(false);
      table.json('permissions').nullable();
      table.json('config').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['connection_id'], 'idx_connector_res_connection');
      table.index(['tenant_id', 'brand_id'], 'idx_connector_res_tenant_brand');
      table.index(['resource_type', 'is_selected'], 'idx_connector_res_type_selected');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('connector_resources');
  if (exists) {
    await knex.schema.dropTable('connector_resources');
  }
}
