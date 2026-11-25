import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. AGENT_MEMORIES
  const hasMemories = await knex.schema.hasTable('agent_memories');
  if (!hasMemories) {
    await knex.schema.createTable('agent_memories', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('memory_type', 64).notNullable().defaultTo('short_term'); // short_term, episodic, brand_guidelines, engagement_pattern, preference
      table.string('key', 255).notNullable();
      table.json('value').notNullable();
      table.float('confidence').notNullable().defaultTo(1.0);
      table.timestamp('expires_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_agent_mem_tenant_brand');
      table.index(['tenant_id', 'key'], 'idx_agent_mem_tenant_key');
      table.index(['memory_type'], 'idx_agent_mem_type');
    });
  }

  // 2. AGENT_SETTINGS
  const hasSettings = await knex.schema.hasTable('agent_settings');
  if (!hasSettings) {
    await knex.schema.createTable('agent_settings', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('model', 100).notNullable().defaultTo('gpt-4o');
      table.float('temperature').notNullable().defaultTo(0.7);
      table.string('autonomous_mode', 32).notNullable().defaultTo('semi'); // semi, full
      table.boolean('require_approval_before_publish').notNullable().defaultTo(true);
      table.integer('max_weekly_auto_posts').notNullable().defaultTo(7);
      table.integer('strictness_level').notNullable().defaultTo(90);
      table.json('banned_topics').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_agent_settings_tenant_brand');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSettings = await knex.schema.hasTable('agent_settings');
  if (hasSettings) {
    await knex.schema.dropTable('agent_settings');
  }

  const hasMemories = await knex.schema.hasTable('agent_memories');
  if (hasMemories) {
    await knex.schema.dropTable('agent_memories');
  }
}
