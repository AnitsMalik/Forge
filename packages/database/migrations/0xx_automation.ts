import type { Knex } from 'knex';

export async function up(_knex: Knex): Promise<void> {
  // Automations table is defined in 0xx_automations.ts
}

export async function down(_knex: Knex): Promise<void> {
  // Automations rollback is handled in 0xx_automations.ts
}
