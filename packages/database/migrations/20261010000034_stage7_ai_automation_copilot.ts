import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('copilot_automation_plans');
  if (!hasTable) {
    await knex.schema.createTable('copilot_automation_plans', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('prompt').notNullable();
      table.json('extracted_intent').notNullable();
      table.json('structured_plan').notNullable();
      table.json('validation_report').notNullable();
      table.string('status', 32).notNullable().defaultTo('validated'); // 'draft' | 'validated' | 'tested' | 'activated' | 'cancelled'
      table.uuid('automation_id').nullable().references('id').inTable('automations').onDelete('SET NULL');
      table.json('tool_calls').nullable();
      table.json('test_results').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_copilot_plans_tenant_brand');
      table.index(['status'], 'idx_copilot_plans_status');
      table.index(['created_at'], 'idx_copilot_plans_created');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('copilot_automation_plans');
}
