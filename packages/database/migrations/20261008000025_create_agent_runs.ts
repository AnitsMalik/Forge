import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('agent_runs');
  if (!exists) {
    await knex.schema.createTable('agent_runs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('agent_type', 64).notNullable(); // 'growth_manager' | 'content_agent' | 'strategy_agent' | 'analytics_agent'
      table.text('prompt').nullable();
      table.string('status', 32).notNullable().defaultTo('pending'); // 'pending' | 'running' | 'completed' | 'failed'
      table.json('plan').nullable();
      table.json('tool_calls').nullable();
      table.json('results').nullable();
      table.text('error_message').nullable();
      table.integer('tokens_used').notNullable().defaultTo(0);
      table.integer('duration_ms').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_agent_runs_tenant_brand');
      table.index(['agent_type', 'status'], 'idx_agent_runs_type_status');
      table.index(['created_at'], 'idx_agent_runs_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('agent_runs');
  if (exists) {
    await knex.schema.dropTable('agent_runs');
  }
}
