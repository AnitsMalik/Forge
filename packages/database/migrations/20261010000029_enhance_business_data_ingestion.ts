import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Enhance marketing_objects table
  const hasMarketingObjects = await knex.schema.hasTable('marketing_objects');
  if (hasMarketingObjects) {
    await knex.schema.alterTable('marketing_objects', (table) => {
      table.string('source_record_id', 255).nullable().after('external_id');
      table.string('source_version', 128).nullable().after('source_record_id');
      table.string('status', 32).notNullable().defaultTo('valid').after('source_version');
      table.json('validation_errors').nullable().after('normalized_data');
      table.json('provenance').nullable().after('validation_errors');
      table.string('idempotency_key', 255).nullable().after('provenance');
      table.integer('retry_count').notNullable().defaultTo(0).after('idempotency_key');

      table.index(['tenant_id', 'brand_id', 'source', 'source_record_id'], 'idx_mo_tenant_brand_src_rec');
      table.index(['idempotency_key'], 'idx_mo_idempotency_key');
      table.index(['status'], 'idx_mo_status');
    });
  } else {
    await knex.schema.createTable('marketing_objects', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('source', 64).notNullable();
      table.string('object_type', 64).notNullable();
      table.string('external_id', 255).nullable();
      table.string('source_record_id', 255).nullable();
      table.string('source_version', 128).nullable();
      table.string('status', 32).notNullable().defaultTo('valid');
      table.string('title', 255).notNullable();
      table.json('properties').notNullable();
      table.json('normalized_data').nullable();
      table.json('validation_errors').nullable();
      table.json('provenance').nullable();
      table.string('idempotency_key', 255).nullable();
      table.integer('retry_count').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_mo_tenant_brand');
      table.index(['source', 'object_type'], 'idx_mo_source_type');
      table.index(['tenant_id', 'brand_id', 'source', 'source_record_id'], 'idx_mo_tenant_brand_src_rec');
      table.index(['idempotency_key'], 'idx_mo_idempotency_key');
      table.index(['status'], 'idx_mo_status');
    });
  }

  // 2. Enhance connector_resources table
  const hasConnectorResources = await knex.schema.hasTable('connector_resources');
  if (hasConnectorResources) {
    await knex.schema.alterTable('connector_resources', (table) => {
      table.string('sync_cursor', 255).nullable().after('config');
      table.string('sync_status', 64).notNullable().defaultTo('idle').after('sync_cursor');
      table.timestamp('last_synced_at').nullable().after('sync_status');
      table.string('webhook_subscription_id', 255).nullable().after('last_synced_at');
      table.timestamp('webhook_expires_at').nullable().after('webhook_subscription_id');
      table.text('error_message').nullable().after('webhook_expires_at');

      table.index(['connection_id', 'resource_type', 'is_selected'], 'idx_cr_conn_type_sel');
    });
  }

  // 3. Create ingestion_audit_logs table
  const hasAuditLogs = await knex.schema.hasTable('ingestion_audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('ingestion_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('source', 64).notNullable();
      table.string('resource_id', 255).nullable();
      table.string('batch_id', 255).notNullable();
      table.string('action', 64).notNullable(); // 'import' | 'update' | 'validation_failed' | 'retry' | 'delete'
      table.integer('total_records').notNullable().defaultTo(0);
      table.integer('success_count').notNullable().defaultTo(0);
      table.integer('error_count').notNullable().defaultTo(0);
      table.json('errors').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_ingest_audit_tenant_brand');
      table.index(['batch_id'], 'idx_ingest_audit_batch');
      table.index(['source', 'action'], 'idx_ingest_audit_source_action');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasAuditLogs = await knex.schema.hasTable('ingestion_audit_logs');
  if (hasAuditLogs) {
    await knex.schema.dropTable('ingestion_audit_logs');
  }

  const hasConnectorResources = await knex.schema.hasTable('connector_resources');
  if (hasConnectorResources) {
    await knex.schema.alterTable('connector_resources', (table) => {
      table.dropIndex(['connection_id', 'resource_type', 'is_selected'], 'idx_cr_conn_type_sel');
      table.dropColumn('sync_cursor');
      table.dropColumn('sync_status');
      table.dropColumn('last_synced_at');
      table.dropColumn('webhook_subscription_id');
      table.dropColumn('webhook_expires_at');
      table.dropColumn('error_message');
    });
  }

  const hasMarketingObjects = await knex.schema.hasTable('marketing_objects');
  if (hasMarketingObjects) {
    await knex.schema.alterTable('marketing_objects', (table) => {
      table.dropIndex(['tenant_id', 'brand_id', 'source', 'source_record_id'], 'idx_mo_tenant_brand_src_rec');
      table.dropIndex(['idempotency_key'], 'idx_mo_idempotency_key');
      table.dropIndex(['status'], 'idx_mo_status');
      table.dropColumn('source_record_id');
      table.dropColumn('source_version');
      table.dropColumn('status');
      table.dropColumn('validation_errors');
      table.dropColumn('provenance');
      table.dropColumn('idempotency_key');
      table.dropColumn('retry_count');
    });
  }
}
