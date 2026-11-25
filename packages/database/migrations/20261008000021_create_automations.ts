import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automations');
  if (!exists) {
    await knex.schema.createTable('automations', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.string('trigger_type', 64).notNullable(); // 'schedule' | 'webhook' | 'event' | 'metric_threshold' | 'content_ready'
      table.json('trigger_config').nullable();
      table.json('conditions').nullable();
      table.json('actions').notNullable(); // list of workflow action steps
      table.string('status', 32).notNullable().defaultTo('active'); // 'active' | 'paused' | 'draft' | 'error'
      table.integer('execution_count').notNullable().defaultTo(0);
      table.timestamp('last_run_at').nullable();
      table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_automations_tenant_brand');
      table.index(['status'], 'idx_automations_status');
      table.index(['trigger_type'], 'idx_automations_trigger_type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automations');
  if (exists) {
    await knex.schema.dropTable('automations');
  }
}
