import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. BILLING_DUNNING_EVENTS
  const hasDunning = await knex.schema.hasTable('billing_dunning_events');
  if (!hasDunning) {
    await knex.schema.createTable('billing_dunning_events', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('subscription_id', 255).nullable();
      table.string('invoice_id', 255).nullable();
      table.string('event_type', 50).notNullable(); // 'payment_failed' | 'grace_warning_day1' | 'grace_warning_day3' | 'grace_expired_suspension' | 'payment_recovered' | 'renewal_receipt' | 'cancellation_notice'
      table.integer('stage').notNullable().defaultTo(1); // 1 = Day 1, 2 = Day 3, 3 = Day 5
      table.string('status', 50).notNullable().defaultTo('pending'); // 'pending' | 'sent' | 'failed' | 'resolved'
      table.string('recipient_email', 255).notNullable();
      table.string('subject', 255).notNullable();
      table.json('payload').nullable();
      table.text('error_message').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('sent_at').nullable();

      table.index(['tenant_id', 'status'], 'idx_dunning_tenant_status');
      table.index(['tenant_id', 'event_type'], 'idx_dunning_tenant_event');
      table.index(['created_at'], 'idx_dunning_created_at');
    });
  }

  // 2. BILLING_NOTIFICATIONS (In-App Actionable Alerts)
  const hasNotifications = await knex.schema.hasTable('billing_notifications');
  if (!hasNotifications) {
    await knex.schema.createTable('billing_notifications', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 50).notNullable(); // 'billing_past_due' | 'payment_failed' | 'renewal_success' | 'grace_warning' | 'account_suspended'
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.string('severity', 20).notNullable().defaultTo('info'); // 'info' | 'warning' | 'critical' | 'success'
      table.string('action_url', 255).nullable();
      table.string('action_label', 100).nullable();
      table.boolean('is_read').notNullable().defaultTo(false);
      table.boolean('is_dismissed').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expires_at').nullable();

      table.index(['tenant_id', 'is_dismissed'], 'idx_billing_notif_tenant');
      table.index(['created_at'], 'idx_billing_notif_created');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('billing_notifications');
  await knex.schema.dropTableIfExists('billing_dunning_events');
}
