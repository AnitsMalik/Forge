import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasInvites = await knex.schema.hasTable('workspace_invites');
  if (!hasInvites) {
    await knex.schema.createTable('workspace_invites', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).notNullable();
      table.string('email', 255).notNullable();
      table.string('role', 50).notNullable().defaultTo('editor');
      table.string('token', 255).notNullable().unique();
      table.string('invited_by_user_id', 36).nullable();
      table.string('status', 50).notNullable().defaultTo('pending'); // pending, accepted, revoked, expired
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);

      table.foreign('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
      table.foreign('invited_by_user_id').references('id').inTable('users').onDelete('SET NULL');

      table.index(['tenant_id', 'status'], 'idx_workspace_invites_tenant_status');
      table.index(['email', 'status'], 'idx_workspace_invites_email_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workspace_invites');
}
