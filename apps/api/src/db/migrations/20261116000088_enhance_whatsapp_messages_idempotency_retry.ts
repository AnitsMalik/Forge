import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('whatsapp_messages');
  if (hasTable) {
    const hasIdempotency = await knex.schema.hasColumn('whatsapp_messages', 'idempotency_key');
    if (!hasIdempotency) {
      await knex.schema.alterTable('whatsapp_messages', (t) => {
        t.string('idempotency_key', 255).nullable();
        t.index(['idempotency_key'], 'idx_wa_msg_idempotency');
      });
    }

    const hasMetadata = await knex.schema.hasColumn('whatsapp_messages', 'metadata');
    if (!hasMetadata) {
      await knex.schema.alterTable('whatsapp_messages', (t) => {
        t.text('metadata', 'longtext').nullable();
      });
    }

    const hasRetryCount = await knex.schema.hasColumn('whatsapp_messages', 'retry_count');
    if (!hasRetryCount) {
      await knex.schema.alterTable('whatsapp_messages', (t) => {
        t.integer('retry_count').notNullable().defaultTo(0);
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('whatsapp_messages');
  if (hasTable) {
    await knex.schema.alterTable('whatsapp_messages', (t) => {
      t.dropColumn('retry_count');
      t.dropColumn('metadata');
      t.dropColumn('idempotency_key');
    });
  }
}
