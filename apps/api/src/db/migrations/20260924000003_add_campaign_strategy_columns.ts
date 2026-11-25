import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('campaigns');
  if (hasTable) {
    await knex.schema.alterTable('campaigns', (table) => {
      table.string('goal', 100).nullable();
      table.json('strategy').nullable();
      table.timestamp('updated_at').nullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('campaigns');
  if (hasTable) {
    await knex.schema.alterTable('campaigns', (table) => {
      table.dropColumn('goal');
      table.dropColumn('strategy');
      table.dropColumn('updated_at');
    });
  }
}
