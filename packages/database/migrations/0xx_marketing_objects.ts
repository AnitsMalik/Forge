import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('marketing_objects');
  if (!exists) {
    await knex.schema.createTable('marketing_objects', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('source', 64).notNullable(); // 'shopify' | 'woocommerce' | 'google_drive' | 'hubspot' | 'manual'
      table.string('object_type', 64).notNullable(); // 'product' | 'lead' | 'article' | 'review' | 'asset'
      table.string('external_id', 255).nullable();
      table.string('title', 255).notNullable();
      table.json('properties').notNullable(); // raw payload/fields from provider
      table.json('normalized_data').nullable(); // standardized product/lead fields
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_marketing_objects_tenant_brand');
      table.index(['source', 'object_type'], 'idx_marketing_objects_source_type');
      table.index(['external_id'], 'idx_marketing_objects_external_id');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('marketing_objects');
  if (exists) {
    await knex.schema.dropTable('marketing_objects');
  }
}
