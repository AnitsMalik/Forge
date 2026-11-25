import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasMetaConnections = await knex.schema.hasTable('meta_connections');
  if (hasMetaConnections) {
    const hasLastSuccess = await knex.schema.hasColumn('meta_connections', 'last_successful_sync');
    if (!hasLastSuccess) {
      await knex.schema.alterTable('meta_connections', (table) => {
        table.timestamp('last_successful_sync').nullable();
        table.timestamp('last_attempt').nullable();
        table.text('last_error').nullable();
      });
    }
  }

  const hasSnapshots = await knex.schema.hasTable('post_analytics_snapshots');
  if (hasSnapshots) {
    const hasLastAttempt = await knex.schema.hasColumn('post_analytics_snapshots', 'last_attempt');
    if (!hasLastAttempt) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.timestamp('last_attempt').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasSnapshots = await knex.schema.hasTable('post_analytics_snapshots');
  if (hasSnapshots) {
    const hasLastAttempt = await knex.schema.hasColumn('post_analytics_snapshots', 'last_attempt');
    if (hasLastAttempt) {
      await knex.schema.alterTable('post_analytics_snapshots', (table) => {
        table.dropColumn('last_attempt');
      });
    }
  }

  const hasMetaConnections = await knex.schema.hasTable('meta_connections');
  if (hasMetaConnections) {
    const hasLastSuccess = await knex.schema.hasColumn('meta_connections', 'last_successful_sync');
    if (hasLastSuccess) {
      await knex.schema.alterTable('meta_connections', (table) => {
        table.dropColumn('last_successful_sync');
        table.dropColumn('last_attempt');
        table.dropColumn('last_error');
      });
    }
  }
}
