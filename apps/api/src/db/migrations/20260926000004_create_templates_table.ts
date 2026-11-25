import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('templates');
  if (!hasTable) {
    await knex.schema.createTable('templates', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.string('category', 50).notNullable(); // promotion, educational, product, announcement, testimonial, quote, event, carousel, sale
      table.string('aspect_ratio', 50).notNullable().defaultTo('1:1');
      table.boolean('is_custom').notNullable().defaultTo(false);
      table.boolean('is_built_in').notNullable().defaultTo(false);
      table.json('background').notNullable();
      table.json('layers').notNullable();
      table.json('tags').nullable();
      table.text('thumbnail_url').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'category'], 'idx_templates_brand_category');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('templates');
}
