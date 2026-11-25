import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('social_connections');
  if (!exists) {
    await knex.schema.createTable('social_connections', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('provider', 64).notNullable(); // 'meta' | 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'google_drive' | 'shopify'
      table.string('provider_account_id', 255).notNullable();
      table.string('account_name', 255).notNullable();
      table.string('status', 32).notNullable().defaultTo('connected'); // 'connected' | 'expired' | 'revoked' | 'error'
      table.string('health_status', 32).notNullable().defaultTo('healthy'); // 'healthy' | 'degraded' | 'unreachable'
      table.json('scopes').nullable();
      table.timestamp('token_expires_at').nullable();
      table.timestamp('last_synced_at').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_social_conn_tenant_brand');
      table.index(['provider', 'provider_account_id'], 'idx_social_conn_provider_account');
      table.index(['status'], 'idx_social_conn_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('social_connections');
  if (exists) {
    await knex.schema.dropTable('social_connections');
  }
}
