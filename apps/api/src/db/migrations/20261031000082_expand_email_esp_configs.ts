import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('email_esp_configs');
  if (hasTable) {
    const hasRegion = await knex.schema.hasColumn('email_esp_configs', 'region');
    if (!hasRegion) {
      await knex.schema.alterTable('email_esp_configs', (table) => {
        table.string('region', 50).nullable();
        table.string('domain', 255).nullable();
        table.string('domain_status', 50).notNullable().defaultTo('NOT_STARTED'); // 'NOT_STARTED', 'PENDING', 'VERIFIED'
        table.string('spf_status', 50).notNullable().defaultTo('PENDING'); // 'PENDING', 'VERIFIED', 'NOT_CONFIGURED'
        table.string('dkim_status', 50).notNullable().defaultTo('PENDING'); // 'PENDING', 'VERIFIED', 'NOT_CONFIGURED'
        table.string('dmarc_status', 50).notNullable().defaultTo('PENDING'); // 'PENDING', 'VERIFIED', 'NOT_CONFIGURED'
        table.boolean('sender_verified').notNullable().defaultTo(false);
        table.integer('daily_quota').notNullable().defaultTo(500);
        table.integer('quota_used_today').notNullable().defaultTo(0);
        table.json('dns_records').nullable();
        table.json('metadata').nullable();
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('email_esp_configs');
  if (hasTable) {
    const hasRegion = await knex.schema.hasColumn('email_esp_configs', 'region');
    if (hasRegion) {
      await knex.schema.alterTable('email_esp_configs', (table) => {
        table.dropColumn('metadata');
        table.dropColumn('dns_records');
        table.dropColumn('quota_used_today');
        table.dropColumn('daily_quota');
        table.dropColumn('sender_verified');
        table.dropColumn('dmarc_status');
        table.dropColumn('dkim_status');
        table.dropColumn('spf_status');
        table.dropColumn('domain_status');
        table.dropColumn('domain');
        table.dropColumn('region');
      });
    }
  }
}

