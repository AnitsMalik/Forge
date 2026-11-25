import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. social_webhook_events
  const hasEventsTable = await knex.schema.hasTable('social_webhook_events');
  if (!hasEventsTable) {
    await knex.schema.createTable('social_webhook_events', (table) => {
      table.uuid('id').primary();
      table.string('provider', 50).notNullable().defaultTo('meta'); // meta, instagram, tiktok, x, stripe, custom
      table.string('provider_event_id', 255).nullable();
      table.string('event_type', 100).notNullable(); // e.g. instagram.direct_message, meta.page_mention, meta.feed_comment, etc.
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('SET NULL');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('SET NULL');
      table.uuid('connection_id').nullable().references('id').inTable('social_connections').onDelete('SET NULL');
      table.text('payload', 'longtext').notNullable();
      table.text('headers', 'longtext').nullable();
      table.text('signature').nullable();
      table.boolean('signature_verified').notNullable().defaultTo(false);
      table
        .enum('status', ['received', 'processing', 'processed', 'failed', 'dead_letter', 'discarded'])
        .notNullable()
        .defaultTo('received');
      table.integer('attempts').notNullable().defaultTo(0);
      table.integer('max_attempts').notNullable().defaultTo(5);
      table.timestamp('next_retry_at').nullable();
      table.timestamp('last_attempt_at').nullable();
      table.text('last_error').nullable();
      table.integer('processing_time_ms').nullable();
      table.string('idempotency_key', 255).notNullable().unique();
      table.boolean('replayed_by_superadmin').notNullable().defaultTo(false);
      table.timestamp('replayed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['provider', 'event_type'], 'idx_swe_prov_type');
      table.index(['status'], 'idx_swe_status');
      table.index(['next_retry_at'], 'idx_swe_retry');
      table.index(['tenant_id', 'brand_id'], 'idx_swe_tenant_brand');
      table.index(['created_at'], 'idx_swe_created');
    });
  }

  // 2. social_webhook_configs
  const hasConfigsTable = await knex.schema.hasTable('social_webhook_configs');
  if (!hasConfigsTable) {
    await knex.schema.createTable('social_webhook_configs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('provider', 50).notNullable();
      table.string('endpoint_url', 500).notNullable();
      table.string('secret_token', 255).nullable(); // masked in API
      table.string('verify_token', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.boolean('auto_retry_enabled').notNullable().defaultTo(true);
      table.integer('max_retries').notNullable().defaultTo(5);
      table.json('subscribed_events').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['provider'], 'idx_swc_provider');
      table.index(['tenant_id'], 'idx_swc_tenant');
      table.index(['is_active'], 'idx_swc_active');
    });
  }

  // 3. social_webhook_replay_logs
  const hasReplayLogsTable = await knex.schema.hasTable('social_webhook_replay_logs');
  if (!hasReplayLogsTable) {
    await knex.schema.createTable('social_webhook_replay_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('event_id').notNullable().references('id').inTable('social_webhook_events').onDelete('CASCADE');
      table.uuid('admin_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('admin_email', 255).notNullable();
      table.string('support_ticket', 100).nullable();
      table.text('reason').notNullable();
      table.string('replay_status', 32).notNullable().defaultTo('success'); // success | failure
      table.json('response_payload').nullable();
      table.integer('execution_ms').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['event_id'], 'idx_swrl_event');
      table.index(['admin_user_id'], 'idx_swrl_admin');
      table.index(['created_at'], 'idx_swrl_created');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasReplayLogsTable = await knex.schema.hasTable('social_webhook_replay_logs');
  if (hasReplayLogsTable) {
    await knex.schema.dropTable('social_webhook_replay_logs');
  }

  const hasConfigsTable = await knex.schema.hasTable('social_webhook_configs');
  if (hasConfigsTable) {
    await knex.schema.dropTable('social_webhook_configs');
  }

  const hasEventsTable = await knex.schema.hasTable('social_webhook_events');
  if (hasEventsTable) {
    await knex.schema.dropTable('social_webhook_events');
  }
}
