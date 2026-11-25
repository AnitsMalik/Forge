import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('brand_brains');
  if (!exists) {
    await knex.schema.createTable('brand_brains', (table) => {
      table.uuid('id').primary();
      table.uuid('brand_id').notNullable().unique().references('id').inTable('brands').onDelete('CASCADE');
      table.json('business_profile').notNullable();
      table.json('products').notNullable();
      table.json('services').notNullable();
      table.json('usps').notNullable();
      table.json('target_audience').notNullable();
      table.json('pain_points').notNullable();
      table.json('brand_values').notNullable();
      table.json('tone').notNullable();
      table.json('writing_style').notNullable();
      table.json('languages').notNullable();
      table.json('cta_preferences').notNullable();
      table.json('emoji_preferences').notNullable();
      table.json('hashtag_preferences').notNullable();
      table.json('topics_to_avoid').notNullable();
      table.json('visual_identity').notNullable();
      table.json('content_pillars').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('brand_brains');
}
