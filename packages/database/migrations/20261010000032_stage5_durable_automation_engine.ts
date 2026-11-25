import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Enhance automations table
  const hasAutomations = await knex.schema.hasTable('automations');
  if (hasAutomations) {
    await knex.schema.alterTable('automations', (table) => {
      table.timestamp('paused_at').nullable();
      table.timestamp('cancelled_at').nullable();
      table.text('cancellation_reason').nullable();
      table.integer('max_retries').notNullable().defaultTo(3);
      table.integer('base_delay_ms').notNullable().defaultTo(1000);
      table.boolean('is_durable').notNullable().defaultTo(true);
    });
  }

  // 2. Enhance automation_runs table
  const hasRuns = await knex.schema.hasTable('automation_runs');
  if (hasRuns) {
    await knex.schema.alterTable('automation_runs', (table) => {
      table.string('lifecycle_state', 64).notNullable().defaultTo('DETECTED');
      table.string('idempotency_key', 255).nullable();
      table.string('source_connection_id', 64).nullable();
      table.string('source_record_id', 64).nullable();
      table.string('source_version', 64).nullable();
      table.string('action_type', 64).nullable();
      table.integer('template_version').nullable();
      table.integer('retry_count').notNullable().defaultTo(0);
      table.integer('max_retries').notNullable().defaultTo(3);
      table.timestamp('next_retry_at').nullable();
      table.string('lock_token', 64).nullable();
      table.timestamp('locked_until').nullable();
      table.text('cancellation_reason').nullable();
      table.timestamp('paused_at').nullable();
      table.json('run_context').nullable();

      table.index(['lifecycle_state'], 'idx_auto_runs_lifecycle');
      table.index(['idempotency_key'], 'idx_auto_runs_idempotency');
      table.index(['next_retry_at'], 'idx_auto_runs_next_retry');
    });
  }

  // 3. Create automation_step_runs table
  const hasStepRuns = await knex.schema.hasTable('automation_step_runs');
  if (!hasStepRuns) {
    await knex.schema.createTable('automation_step_runs', (table) => {
      table.uuid('id').primary();
      table.uuid('run_id').notNullable().references('id').inTable('automation_runs').onDelete('CASCADE');
      table.uuid('automation_id').notNullable().references('id').inTable('automations').onDelete('CASCADE');
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.integer('step_index').notNullable();
      table.string('step_name', 128).notNullable();
      table.string('lifecycle_phase', 64).notNullable();
      table.string('status', 32).notNullable().defaultTo('pending'); // 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
      table.json('input_payload').nullable();
      table.json('output_payload').nullable();
      table.text('error_message').nullable();
      table.integer('duration_ms').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['run_id', 'step_index'], 'idx_auto_steps_run');
      table.index(['tenant_id', 'lifecycle_phase'], 'idx_auto_steps_tenant_phase');
    });
  }

  // 4. Create automation_dlq table (Dead Letter Queue)
  const hasDlq = await knex.schema.hasTable('automation_dlq');
  if (!hasDlq) {
    await knex.schema.createTable('automation_dlq', (table) => {
      table.uuid('id').primary();
      table.uuid('run_id').nullable();
      table.uuid('automation_id').nullable();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('failure_state', 64).notNullable(); // VALIDATION_FAILED, AI_FAILED, etc.
      table.text('error_message').nullable();
      table.text('error_stack').nullable();
      table.integer('retry_count').notNullable().defaultTo(0);
      table.string('idempotency_key', 255).nullable();
      table.json('trigger_event').nullable();
      table.json('run_context').nullable();
      table.string('status', 32).notNullable().defaultTo('dead_letter'); // 'dead_letter' | 'replayed' | 'discarded'
      table.timestamp('replayed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'status'], 'idx_auto_dlq_tenant_status');
      table.index(['failure_state'], 'idx_auto_dlq_failure_state');
    });
  }

  // 5. Create distributed_locks table
  const hasLocks = await knex.schema.hasTable('distributed_locks');
  if (!hasLocks) {
    await knex.schema.createTable('distributed_locks', (table) => {
      table.string('lock_key', 255).primary();
      table.string('owner_token', 64).notNullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('acquired_at').notNullable().defaultTo(knex.fn.now());

      table.index(['expires_at'], 'idx_locks_expires');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('distributed_locks')) {
    await knex.schema.dropTable('distributed_locks');
  }
  if (await knex.schema.hasTable('automation_dlq')) {
    await knex.schema.dropTable('automation_dlq');
  }
  if (await knex.schema.hasTable('automation_step_runs')) {
    await knex.schema.dropTable('automation_step_runs');
  }
  if (await knex.schema.hasTable('automation_runs')) {
    await knex.schema.alterTable('automation_runs', (table) => {
      table.dropColumn('lifecycle_state');
      table.dropColumn('idempotency_key');
      table.dropColumn('source_connection_id');
      table.dropColumn('source_record_id');
      table.dropColumn('source_version');
      table.dropColumn('action_type');
      table.dropColumn('template_version');
      table.dropColumn('retry_count');
      table.dropColumn('max_retries');
      table.dropColumn('next_retry_at');
      table.dropColumn('lock_token');
      table.dropColumn('locked_until');
      table.dropColumn('cancellation_reason');
      table.dropColumn('paused_at');
      table.dropColumn('run_context');
    });
  }
  if (await knex.schema.hasTable('automations')) {
    await knex.schema.alterTable('automations', (table) => {
      table.dropColumn('paused_at');
      table.dropColumn('cancelled_at');
      table.dropColumn('cancellation_reason');
      table.dropColumn('max_retries');
      table.dropColumn('base_delay_ms');
      table.dropColumn('is_durable');
    });
  }
}
