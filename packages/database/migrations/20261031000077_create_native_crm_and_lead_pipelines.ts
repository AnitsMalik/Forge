import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. CRM_CONTACTS
  const hasContacts = await knex.schema.hasTable('crm_contacts');
  if (!hasContacts) {
    await knex.schema.createTable('crm_contacts', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).nullable();
      table.string('email', 255).nullable();
      table.string('phone', 50).nullable();
      table.string('company', 255).nullable();
      table.string('job_title', 150).nullable();
      table.string('status', 50).notNullable().defaultTo('lead'); // 'lead', 'prospect', 'customer', 'churned'
      table.string('lead_source', 100).nullable(); // 'facebook', 'instagram', 'linkedin', 'sheets_import', 'organic'
      table.json('tags').nullable();
      table.json('custom_fields').nullable();
      table.timestamp('last_contacted_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'status'], 'idx_crm_contact_brand_status');
      table.index(['brand_id', 'email'], 'idx_crm_contact_brand_email');
    });
  }

  // 2. CRM_PIPELINES
  const hasPipelines = await knex.schema.hasTable('crm_pipelines');
  if (!hasPipelines) {
    await knex.schema.createTable('crm_pipelines', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('name', 150).notNullable();
      table.boolean('is_default').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'is_default'], 'idx_crm_pipeline_brand');
    });
  }

  // 3. CRM_STAGES
  const hasStages = await knex.schema.hasTable('crm_stages');
  if (!hasStages) {
    await knex.schema.createTable('crm_stages', (table) => {
      table.uuid('id').primary();
      table.uuid('pipeline_id').notNullable().references('id').inTable('crm_pipelines').onDelete('CASCADE');
      table.string('name', 100).notNullable();
      table.integer('stage_order').notNullable().defaultTo(0);
      table.string('color', 50).notNullable().defaultTo('#3b82f6');
      table.integer('win_probability').notNullable().defaultTo(50); // percentage 0-100
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['pipeline_id', 'stage_order'], 'idx_crm_stage_pipeline_order');
    });
  }

  // 4. CRM_DEALS
  const hasDeals = await knex.schema.hasTable('crm_deals');
  if (!hasDeals) {
    await knex.schema.createTable('crm_deals', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('pipeline_id').notNullable().references('id').inTable('crm_pipelines').onDelete('CASCADE');
      table.uuid('stage_id').notNullable().references('id').inTable('crm_stages').onDelete('CASCADE');
      table.uuid('contact_id').nullable().references('id').inTable('crm_contacts').onDelete('SET NULL');
      table.string('title', 255).notNullable();
      table.decimal('value', 12, 2).notNullable().defaultTo(0.00);
      table.string('currency', 10).notNullable().defaultTo('USD');
      table.timestamp('expected_close_date').nullable();
      table.string('status', 50).notNullable().defaultTo('OPEN'); // 'OPEN', 'WON', 'LOST'
      table.text('notes').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'pipeline_id', 'stage_id'], 'idx_crm_deals_brand_stage');
      table.index(['brand_id', 'status'], 'idx_crm_deals_status');
    });
  }

  // 5. CRM_ACTIVITIES
  const hasActivities = await knex.schema.hasTable('crm_activities');
  if (!hasActivities) {
    await knex.schema.createTable('crm_activities', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('contact_id').nullable().references('id').inTable('crm_contacts').onDelete('CASCADE');
      table.uuid('deal_id').nullable().references('id').inTable('crm_deals').onDelete('CASCADE');
      table.string('activity_type', 50).notNullable(); // 'NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK', 'SOCIAL_LEAD'
      table.text('description').notNullable();
      table.json('metadata').nullable();
      table.string('created_by', 255).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['contact_id'], 'idx_crm_act_contact');
      table.index(['deal_id'], 'idx_crm_act_deal');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('crm_activities');
  await knex.schema.dropTableIfExists('crm_deals');
  await knex.schema.dropTableIfExists('crm_stages');
  await knex.schema.dropTableIfExists('crm_pipelines');
  await knex.schema.dropTableIfExists('crm_contacts');
}
