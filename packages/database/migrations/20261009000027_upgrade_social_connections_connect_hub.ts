import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Upgrade social_connections table
  const hasSocialConnections = await knex.schema.hasTable('social_connections');
  if (hasSocialConnections) {
    const hasCredRef = await knex.schema.hasColumn('social_connections', 'credential_reference');
    const hasProviderMeta = await knex.schema.hasColumn('social_connections', 'provider_account_metadata');
    const hasExpiresAt = await knex.schema.hasColumn('social_connections', 'expires_at');
    const hasLastHealthCheck = await knex.schema.hasColumn('social_connections', 'last_health_check_at');
    const hasLastError = await knex.schema.hasColumn('social_connections', 'last_error');

    await knex.schema.alterTable('social_connections', (table) => {
      // Allow workspace-level connections where brand is not assigned yet
      table.uuid('brand_id').nullable().alter();

      if (!hasCredRef) {
        table.string('credential_reference', 255).nullable().after('scopes');
      }
      if (!hasProviderMeta) {
        table.json('provider_account_metadata').nullable().after('status');
      }
      if (!hasExpiresAt) {
        table.timestamp('expires_at').nullable().after('credential_reference');
      }
      if (!hasLastHealthCheck) {
        table.timestamp('last_health_check_at').nullable().after('expires_at');
      }
      if (!hasLastError) {
        table.text('last_error').nullable().after('last_health_check_at');
      }
    });

    // Backfill any existing rows
    await knex.raw(`
      UPDATE social_connections 
      SET 
        provider_account_metadata = metadata,
        expires_at = token_expires_at
      WHERE provider_account_metadata IS NULL AND metadata IS NOT NULL
    `);
  } else {
    await knex.schema.createTable('social_connections', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('provider', 64).notNullable();
      table.string('status', 32).notNullable().defaultTo('CONNECTED');
      table.json('provider_account_metadata').nullable();
      table.json('scopes').nullable();
      table.string('credential_reference', 255).nullable();
      table.timestamp('expires_at').nullable();
      table.timestamp('last_health_check_at').nullable();
      table.text('last_error').nullable();
      table.string('provider_account_id', 255).nullable();
      table.string('account_name', 255).nullable();
      table.string('health_status', 32).nullable().defaultTo('healthy');
      table.timestamp('token_expires_at').nullable();
      table.timestamp('last_synced_at').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_social_conn_tenant_brand');
      table.index(['provider'], 'idx_social_conn_provider');
      table.index(['status'], 'idx_social_conn_status');
      table.index(['credential_reference'], 'idx_social_conn_cred_ref');
    });
  }

  // 2. Create connection_credentials table for secure envelope storage
  const hasCredentialsTable = await knex.schema.hasTable('connection_credentials');
  if (!hasCredentialsTable) {
    await knex.schema.createTable('connection_credentials', (table) => {
      table.string('id', 64).primary(); // e.g. cred_<uuid>
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('connection_id').notNullable().references('id').inTable('social_connections').onDelete('CASCADE');
      table.text('encrypted_data', 'longtext').notNullable();
      table.string('iv', 64).notNullable();
      table.string('auth_tag', 64).notNullable();
      table.string('algorithm', 32).notNullable().defaultTo('aes-256-gcm');
      table.integer('key_version').notNullable().defaultTo(1);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id'], 'idx_conn_creds_tenant');
      table.index(['connection_id'], 'idx_conn_creds_connection');
    });
  }

  // 3. Ensure connection_events allows nullable brand_id
  const hasEventsTable = await knex.schema.hasTable('connection_events');
  if (hasEventsTable) {
    await knex.schema.alterTable('connection_events', (table) => {
      table.uuid('brand_id').nullable().alter();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCredentialsTable = await knex.schema.hasTable('connection_credentials');
  if (hasCredentialsTable) {
    await knex.schema.dropTable('connection_credentials');
  }

  const hasSocialConnections = await knex.schema.hasTable('social_connections');
  if (hasSocialConnections) {
    await knex.schema.alterTable('social_connections', (table) => {
      table.dropColumn('credential_reference');
      table.dropColumn('provider_account_metadata');
      table.dropColumn('expires_at');
      table.dropColumn('last_health_check_at');
      table.dropColumn('last_error');
    });
  }
}
