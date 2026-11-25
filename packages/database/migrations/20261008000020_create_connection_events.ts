import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('connection_events');
  if (!exists) {
    await knex.schema.createTable('connection_events', (table) => {
      table.uuid('id').primary();
      table.uuid('connection_id').notNullable().references('id').inTable('social_connections').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('event_type', 64).notNullable(); // 'auth_success' | 'token_refreshed' | 'health_check' | 'webhook_received' | 'error'
      table.string('status', 32).notNullable().defaultTo('success'); // 'success' | 'failure' | 'warning'
      table.json('details').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['connection_id'], 'idx_conn_events_connection');
      table.index(['tenant_id', 'brand_id'], 'idx_conn_events_tenant_brand');
      table.index(['event_type'], 'idx_conn_events_type');
      table.index(['created_at'], 'idx_conn_events_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('connection_events');
  if (exists) {
    await knex.schema.dropTable('connection_events');
  }
}
