import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasSubscriptions = await knex.schema.hasTable('tenant_subscriptions');
  if (hasSubscriptions) {
    const hasPastDueSince = await knex.schema.hasColumn('tenant_subscriptions', 'past_due_since');
    if (!hasPastDueSince) {
      await knex.schema.alterTable('tenant_subscriptions', (table) => {
        table.timestamp('past_due_since').nullable().after('status');
        table.index(['status', 'past_due_since'], 'idx_tenant_subscriptions_grace');
      });

      // Backfill any existing past_due rows to now for initial grace tracking
      await knex('tenant_subscriptions')
        .where({ status: 'past_due' })
        .update({ past_due_since: knex.fn.now() });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSubscriptions = await knex.schema.hasTable('tenant_subscriptions');
  if (hasSubscriptions) {
    const hasPastDueSince = await knex.schema.hasColumn('tenant_subscriptions', 'past_due_since');
    if (hasPastDueSince) {
      await knex.schema.alterTable('tenant_subscriptions', (table) => {
        table.dropIndex(['status', 'past_due_since'], 'idx_tenant_subscriptions_grace');
        table.dropColumn('past_due_since');
      });
    }
  }
}
