import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. EMAIL_SUBSCRIBERS
  const hasSubscribers = await knex.schema.hasTable('email_subscribers');
  if (!hasSubscribers) {
    await knex.schema.createTable('email_subscribers', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('email', 255).notNullable();
      table.string('first_name', 100).nullable();
      table.string('last_name', 100).nullable();
      table.string('status', 50).notNullable().defaultTo('SUBSCRIBED'); // 'SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED'
      table.json('tags').nullable();
      table.json('metadata').nullable();
      table.string('source', 100).notNullable().defaultTo('manual'); // 'crm_sync', 'website_optin', 'manual', 'csv_import'
      table.timestamp('subscribed_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('unsubscribed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['brand_id', 'email'], 'uniq_sub_brand_email');
      table.index(['brand_id', 'status'], 'idx_sub_brand_status');
    });
  }

  // 2. EMAIL_TEMPLATES
  const hasTemplates = await knex.schema.hasTable('email_templates');
  if (!hasTemplates) {
    await knex.schema.createTable('email_templates', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE'); // null for system global templates
      table.string('name', 255).notNullable();
      table.string('category', 100).notNullable().defaultTo('newsletter'); // 'newsletter', 'promotion', 'welcome', 'announcement'
      table.string('subject', 255).nullable();
      table.text('html_content', 'longtext').notNullable();
      table.json('blocks_json').nullable();
      table.string('thumbnail_url', 500).nullable();
      table.boolean('is_system').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'category'], 'idx_email_tpl_brand_cat');
    });
  }

  // 3. EMAIL_CAMPAIGNS
  const hasCampaigns = await knex.schema.hasTable('email_campaigns');
  if (!hasCampaigns) {
    await knex.schema.createTable('email_campaigns', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('name', 255).notNullable();
      table.string('subject', 255).notNullable();
      table.string('preview_text', 255).nullable();
      table.string('from_name', 100).notNullable();
      table.string('from_email', 255).notNullable();
      table.string('reply_to', 255).nullable();
      table.text('html_content', 'longtext').notNullable();
      table.text('plain_text', 'longtext').nullable();
      table.json('blocks_json').nullable();
      table.string('status', 50).notNullable().defaultTo('DRAFT'); // 'DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED'
      table.timestamp('scheduled_at').nullable();
      table.timestamp('sent_at').nullable();
      table.integer('recipient_count').notNullable().defaultTo(0);
      table.integer('delivered_count').notNullable().defaultTo(0);
      table.integer('opened_count').notNullable().defaultTo(0);
      table.integer('clicked_count').notNullable().defaultTo(0);
      table.integer('bounced_count').notNullable().defaultTo(0);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_email_camp_brand_status');
    });
  }

  // 4. EMAIL_DELIVERIES
  const hasDeliveries = await knex.schema.hasTable('email_deliveries');
  if (!hasDeliveries) {
    await knex.schema.createTable('email_deliveries', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('campaign_id').notNullable().references('id').inTable('email_campaigns').onDelete('CASCADE');
      table.uuid('subscriber_id').nullable().references('id').inTable('email_subscribers').onDelete('SET NULL');
      table.string('email', 255).notNullable();
      table.string('status', 50).notNullable().defaultTo('QUEUED'); // 'QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED'
      table.string('esp_message_id', 255).nullable();
      table.timestamp('opened_at').nullable();
      table.timestamp('clicked_at').nullable();
      table.text('error_message').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['campaign_id', 'status'], 'idx_email_deliv_camp_status');
      table.index(['subscriber_id'], 'idx_email_deliv_sub');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('email_deliveries');
  await knex.schema.dropTableIfExists('email_campaigns');
  await knex.schema.dropTableIfExists('email_templates');
  await knex.schema.dropTableIfExists('email_subscribers');
}

