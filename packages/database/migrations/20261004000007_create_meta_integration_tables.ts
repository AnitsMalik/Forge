import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. META_CONNECTIONS
  const hasMetaConnections = await knex.schema.hasTable('meta_connections');
  if (!hasMetaConnections) {
    await knex.schema.createTable('meta_connections', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('provider', 50).notNullable().defaultTo('meta');
      table.string('meta_user_id', 255).nullable();
      table.string('selected_page_id', 255).nullable();
      table.string('selected_page_name', 255).nullable();
      table.string('instagram_account_id', 255).nullable();
      table.string('instagram_username', 255).nullable();
      table.text('encrypted_user_access_token').nullable();
      table.text('encrypted_page_access_token').nullable();
      table.timestamp('credential_expires_at').nullable();
      table.json('scopes').nullable();
      table.string('status', 50).notNullable().defaultTo('connected');
      table.boolean('require_approval_before_publish').notNullable().defaultTo(true);
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id'], 'idx_meta_conn_tenant');
      table.index(['brand_id'], 'idx_meta_conn_brand');
      table.index(['status'], 'idx_meta_conn_status');
    });
  }

  // 2. META_FACEBOOK_PAGES
  const hasMetaPages = await knex.schema.hasTable('meta_facebook_pages');
  if (!hasMetaPages) {
    await knex.schema.createTable('meta_facebook_pages', (table) => {
      table.uuid('id').primary();
      table.uuid('connection_id').notNullable().references('id').inTable('meta_connections').onDelete('CASCADE');
      table.string('page_id', 255).notNullable();
      table.string('name', 255).notNullable();
      table.string('category', 100).nullable();
      table.text('picture_url').nullable();
      table.json('tasks').nullable();
      table.text('encrypted_access_token').nullable();
      table.string('instagram_business_account_id', 255).nullable();
      table.boolean('is_selected').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['connection_id', 'page_id'], 'uq_meta_conn_page');
    });
  }

  // 3. META_INSTAGRAM_ACCOUNTS
  const hasMetaInstagram = await knex.schema.hasTable('meta_instagram_accounts');
  if (!hasMetaInstagram) {
    await knex.schema.createTable('meta_instagram_accounts', (table) => {
      table.uuid('id').primary();
      table.uuid('connection_id').notNullable().references('id').inTable('meta_connections').onDelete('CASCADE');
      table.string('page_id', 255).notNullable();
      table.string('instagram_account_id', 255).notNullable();
      table.string('username', 255).notNullable();
      table.string('name', 255).nullable();
      table.text('profile_picture_url').nullable();
      table.integer('followers_count').notNullable().defaultTo(0);
      table.boolean('is_eligible').notNullable().defaultTo(true);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['connection_id', 'instagram_account_id'], 'uq_meta_conn_ig');
    });
  }

  // 4. PUBLISHING_JOBS
  const hasPublishingJobs = await knex.schema.hasTable('publishing_jobs');
  if (!hasPublishingJobs) {
    await knex.schema.createTable('publishing_jobs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('connection_id').nullable().references('id').inTable('meta_connections').onDelete('SET NULL');
      table.string('platform', 50).notNullable();
      table.string('account_id', 255).notNullable();
      table.uuid('content_id').nullable();
      table.uuid('post_id').nullable().references('id').inTable('posts').onDelete('SET NULL');
      table.timestamp('scheduled_at').nullable();
      table.string('status', 50).notNullable().defaultTo('draft');
      table.integer('attempt_count').notNullable().defaultTo(0);
      table.integer('max_attempts').notNullable().defaultTo(3);
      table.timestamp('next_retry_at').nullable();
      table.string('external_post_id', 255).nullable();
      table.text('external_post_url').nullable();
      table.text('last_error').nullable();
      table.json('payload').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['scheduled_at', 'status'], 'idx_pub_jobs_sched_status');
      table.index(['brand_id', 'status'], 'idx_pub_jobs_brand_status');
      table.index(['next_retry_at'], 'idx_pub_jobs_retry');
    });
  }

  // 5. PUBLISHING_AUDIT_LOGS
  const hasAuditLogs = await knex.schema.hasTable('publishing_audit_logs');
  if (!hasAuditLogs) {
    await knex.schema.createTable('publishing_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('agent_id', 100).nullable().defaultTo('ai_social_agent');
      table.string('platform', 50).notNullable();
      table.string('account_id', 255).notNullable();
      table.string('action', 100).notNullable();
      table.string('content_id', 255).nullable();
      table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
      table.string('result', 50).notNullable();
      table.string('external_id', 255).nullable();
      table.text('error').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['brand_id', 'created_at'], 'idx_pub_audit_brand_date');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('publishing_audit_logs');
  await knex.schema.dropTableIfExists('publishing_jobs');
  await knex.schema.dropTableIfExists('meta_instagram_accounts');
  await knex.schema.dropTableIfExists('meta_facebook_pages');
  await knex.schema.dropTableIfExists('meta_connections');
}
