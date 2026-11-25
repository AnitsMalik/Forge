import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add expires_at to entitlements if not already present
  const hasEntitlements = await knex.schema.hasTable('entitlements');
  if (hasEntitlements) {
    const hasExpiresAt = await knex.schema.hasColumn('entitlements', 'expires_at');
    if (!hasExpiresAt) {
      await knex.schema.alterTable('entitlements', (table) => {
        table.timestamp('expires_at').nullable().after('config');
        table.index(['expires_at'], 'idx_entitlements_expires_at');
      });
    }

    const hasUpdatedBy = await knex.schema.hasColumn('entitlements', 'updated_by');
    if (!hasUpdatedBy) {
      await knex.schema.alterTable('entitlements', (table) => {
        table.string('updated_by', 255).nullable().after('expires_at');
      });
    }

    const hasReason = await knex.schema.hasColumn('entitlements', 'reason');
    if (!hasReason) {
      await knex.schema.alterTable('entitlements', (table) => {
        table.text('reason').nullable().after('updated_by');
      });
    }
  }

  // 2. Create entitlement_audit_logs table for enterprise governance
  const hasAuditTable = await knex.schema.hasTable('entitlement_audit_logs');
  if (!hasAuditTable) {
    await knex.schema.createTable('entitlement_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable();
      table.uuid('brand_id').nullable();
      table.string('resource', 64).notNullable();
      table.string('action', 32).notNullable(); // 'override_created', 'override_updated', 'override_removed', 'plan_assigned', 'override_expired', 'rollback'
      table.boolean('previous_is_enabled').nullable();
      table.boolean('new_is_enabled').nullable();
      table.bigInteger('previous_limit_value').nullable();
      table.bigInteger('new_limit_value').nullable();
      table.json('previous_config').nullable();
      table.json('new_config').nullable();
      table.text('reason').notNullable();
      table.timestamp('effective_date').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();
      table.uuid('admin_user_id').notNullable();
      table.string('admin_email', 255).notNullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('brand_id').references('id').inTable('brands').onDelete('CASCADE');

      table.index(['tenant_id'], 'idx_ent_audit_tenant');
      table.index(['resource'], 'idx_ent_audit_resource');
      table.index(['admin_user_id'], 'idx_ent_audit_admin');
      table.index(['created_at'], 'idx_ent_audit_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('entitlement_audit_logs');
  const hasEntitlements = await knex.schema.hasTable('entitlements');
  if (hasEntitlements) {
    await knex.schema.alterTable('entitlements', (table) => {
      table.dropColumn('expires_at');
      table.dropColumn('updated_by');
      table.dropColumn('reason');
    });
  }
}

