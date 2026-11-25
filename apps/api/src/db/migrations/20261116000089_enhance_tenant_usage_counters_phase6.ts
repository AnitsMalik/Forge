import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('tenant_usage_counters');
  if (hasTable) {
    await knex.schema.alterTable('tenant_usage_counters', (t) => {
      t.integer('scheduled_posts').notNullable().defaultTo(0);
      t.integer('ai_content_generations').notNullable().defaultTo(0);
      t.integer('ai_image_generations').notNullable().defaultTo(0);
      t.integer('ai_video_generations').notNullable().defaultTo(0);
      t.integer('active_campaigns').notNullable().defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('tenant_usage_counters');
  if (hasTable) {
    await knex.schema.alterTable('tenant_usage_counters', (t) => {
      t.dropColumn('active_campaigns');
      t.dropColumn('ai_video_generations');
      t.dropColumn('ai_image_generations');
      t.dropColumn('ai_content_generations');
      t.dropColumn('scheduled_posts');
    });
  }
}
