import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automation_runs');
  if (!exists) {
    await knex.schema.createTable('automation_runs', (table) => {
      table.uuid('id').primary();
      table.uuid('automation_id').notNullable().references('id').inTable('automations').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.json('trigger_event').nullable(); // payload of the incoming trigger
      table.string('status', 32).notNullable().defaultTo('pending'); // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
      table.json('step_results').nullable(); // output and status of each action step
      table.text('error_message').nullable();
      table.integer('duration_ms').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['automation_id'], 'idx_auto_runs_automation');
      table.index(['tenant_id', 'brand_id'], 'idx_auto_runs_tenant_brand');
      table.index(['status'], 'idx_auto_runs_status');
      table.index(['created_at'], 'idx_auto_runs_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automation_runs');
  if (exists) {
    await knex.schema.dropTable('automation_runs');
  }
}
