import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('email_esp_configs');
  if (!hasTable) {
    await knex.schema.createTable('email_esp_configs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('provider', 50).notNullable().defaultTo('sandbox'); // 'sandbox', 'gmail', 'smtp', 'resend', 'sendgrid'
      table.string('smtp_host', 255).nullable();
      table.integer('smtp_port').nullable().defaultTo(587);
      table.string('smtp_user', 255).nullable();
      table.text('smtp_pass').nullable();
      table.boolean('smtp_secure').notNullable().defaultTo(false);
      table.text('api_key').nullable();
      table.string('from_name', 100).nullable();
      table.string('from_email', 255).nullable();
      table.string('reply_to', 255).nullable();
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('last_tested_at').nullable();
      table.string('last_test_status', 50).nullable(); // 'SUCCESS', 'FAILED'
      table.text('last_test_error').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'brand_id'], 'uniq_esp_tenant_brand');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_esp_configs');
}

