import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. WHATSAPP_ACCOUNTS
  const hasAccounts = await knex.schema.hasTable('whatsapp_accounts');
  if (!hasAccounts) {
    await knex.schema.createTable('whatsapp_accounts', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('waba_id', 100).notNullable();
      table.string('phone_number_id', 100).notNullable();
      table.string('display_phone_number', 50).notNullable();
      table.string('verified_name', 150).notNullable();
      table.string('quality_rating', 50).notNullable().defaultTo('GREEN'); // 'GREEN', 'YELLOW', 'RED', 'UNKNOWN'
      table.string('status', 50).notNullable().defaultTo('CONNECTED');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_wa_acc_brand_status');
    });
  }

  // 2. WHATSAPP_TEMPLATES
  const hasTemplates = await knex.schema.hasTable('whatsapp_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('whatsapp_templates', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('waba_id', 100).notNullable();
      table.string('name', 100).notNullable();
      table.string('category', 50).notNullable().defaultTo('MARKETING'); // 'MARKETING', 'UTILITY', 'AUTHENTICATION'
      table.string('language', 10).notNullable().defaultTo('en_US');
      table.string('status', 50).notNullable().defaultTo('APPROVED'); // 'APPROVED', 'PENDING', 'REJECTED'
      table.string('header_type', 50).notNullable().defaultTo('NONE'); // 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'NONE'
      table.text('body_text', 'longtext').notNullable();
      table.string('footer_text', 255).nullable();
      table.json('buttons').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['brand_id', 'name', 'language'], 'uniq_wa_tpl_name_lang');
    });
  }

  // 3. WHATSAPP_MESSAGES (Conversational Inbox & Logs)
  const hasMessages = await knex.schema.hasTable('whatsapp_messages');
  if (!hasMessages) {
    await knex.schema.createTable('whatsapp_messages', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
      table.string('phone_number', 50).notNullable();
      table.string('direction', 20).notNullable(); // 'OUTBOUND', 'INBOUND'
      table.string('message_type', 50).notNullable().defaultTo('text'); // 'template', 'text', 'image', 'document'
      table.text('body', 'longtext').notNullable();
      table.string('template_name', 100).nullable();
      table.string('wam_id', 255).nullable();
      table.string('status', 50).notNullable().defaultTo('SENT'); // 'SENT', 'DELIVERED', 'READ', 'FAILED'
      table.text('error_message').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'phone_number'], 'idx_wa_msg_phone');
      table.index(['wam_id'], 'idx_wa_msg_wam_id');
    });
  }

  // 4. WHATSAPP_CAMPAIGNS (Broadcasts)
  const hasCampaigns = await knex.schema.hasTable('whatsapp_campaigns');
  if (!hasCampaigns) {
    await knex.schema.createTable('whatsapp_campaigns', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.uuid('template_id').nullable().references('id').inTable('whatsapp_templates').onDelete('SET NULL');
      table.string('template_name', 100).notNullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT'); // 'DRAFT', 'SENDING', 'COMPLETED', 'FAILED'
      table.integer('recipient_count').notNullable().defaultTo(0);
      table.integer('sent_count').notNullable().defaultTo(0);
      table.integer('delivered_count').notNullable().defaultTo(0);
      table.integer('read_count').notNullable().defaultTo(0);
      table.integer('failed_count').notNullable().defaultTo(0);
      table.timestamp('sent_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_wa_camp_brand_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('whatsapp_campaigns');
  await knex.schema.dropTableIfExists('whatsapp_messages');
  await knex.schema.dropTableIfExists('whatsapp_templates');
  await knex.schema.dropTableIfExists('whatsapp_accounts');
}

