import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. SUPERADMIN_AUDIT_LOGS
  const hasAuditLogs = await knex.schema.hasTable('superadmin_audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('superadmin_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('superadmin_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('superadmin_email', 255).notNullable();
      table.string('action', 128).notNullable();
      table.uuid('target_tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL');
      table.string('target_resource_type', 64).nullable();
      table.string('target_resource_id', 255).nullable();
      table.text('reason').nullable();
      table.json('details').nullable();
      table.string('ip_address', 45).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['superadmin_id'], 'idx_sa_audit_superadmin');
      table.index(['target_tenant_id'], 'idx_sa_audit_tenant');
      table.index(['action'], 'idx_sa_audit_action');
      table.index(['created_at'], 'idx_sa_audit_created_at');
    });
  }

  // 2. SUPERADMIN_IMPERSONATION_SESSIONS
  const hasImpersonation = await knex.schema.hasTable('superadmin_impersonation_sessions');
  if (!hasImpersonation) {
    await knex.schema.createTable('superadmin_impersonation_sessions', (table) => {
      table.uuid('id').primary();
      table.uuid('superadmin_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('superadmin_email', 255).notNullable();
      table.uuid('target_tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('target_user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('session_token', 255).notNullable().unique();
      table.text('reason').notNullable();
      table.string('ticket_reference', 64).notNullable();
      table.integer('duration_minutes').notNullable().defaultTo(15);
      table.timestamp('expires_at').notNullable();
      table.timestamp('revoked_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['superadmin_id'], 'idx_sa_imp_superadmin');
      table.index(['target_tenant_id'], 'idx_sa_imp_tenant');
      table.index(['session_token'], 'idx_sa_imp_token');
      table.index(['expires_at'], 'idx_sa_imp_expires');
    });
  }

  // 3. PROVIDER_HEALTH_INCIDENTS
  const hasIncidents = await knex.schema.hasTable('provider_health_incidents');
  if (!hasIncidents) {
    await knex.schema.createTable('provider_health_incidents', (table) => {
      table.uuid('id').primary();
      table.string('provider', 64).notNullable();
      table.string('incident_type', 64).notNullable(); // 'RATE_LIMIT_429' | 'AUTH_EXPIRED' | 'NETWORK_5XX' | 'API_ERROR'
      table.integer('status_code').nullable();
      table.string('error_code', 128).nullable();
      table.text('error_message').nullable();
      table.uuid('affected_tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL');
      table.string('affected_account_id', 255).nullable();
      table.integer('retry_after_seconds').nullable();
      table.timestamp('resolved_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['provider'], 'idx_prov_inc_provider');
      table.index(['incident_type'], 'idx_prov_inc_type');
      table.index(['affected_tenant_id'], 'idx_prov_inc_tenant');
      table.index(['created_at'], 'idx_prov_inc_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('provider_health_incidents');
  await knex.schema.dropTableIfExists('superadmin_impersonation_sessions');
  await knex.schema.dropTableIfExists('superadmin_audit_logs');
}
