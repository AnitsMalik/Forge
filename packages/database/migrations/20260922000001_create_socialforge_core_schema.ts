import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. TENANTS
  await knex.schema.createTable('tenants', (table) => {
    table.uuid('id').primary();
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable().unique();
    table.string('subscription_tier', 50).notNullable().defaultTo('standard');
    table.json('settings').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. USERS
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 255).notNullable();
    table.text('avatar_url').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. TENANT_USERS (Membership)
  await knex.schema.createTable('tenant_users', (table) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 50).notNullable().defaultTo('creator');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'user_id'], 'uq_tenant_user');
  });

  // 4. BRANDS
  await knex.schema.createTable('brands', (table) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('slug', 255).notNullable();
    table.string('industry', 100).nullable();
    table.text('website_url').nullable();
    table.string('timezone', 100).notNullable().defaultTo('UTC');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['tenant_id', 'slug'], 'uq_brand_slug_per_tenant');
  });

  // 5. BRAND_USERS
  await knex.schema.createTable('brand_users', (table) => {
    table.uuid('id').primary();
    table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('brand_role', 50).notNullable().defaultTo('creator');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['brand_id', 'user_id'], 'uq_brand_user');
  });

  // 6. BRAND_KITS
  await knex.schema.createTable('brand_kits', (table) => {
    table.uuid('id').primary();
    table.uuid('brand_id').notNullable().unique().references('id').inTable('brands').onDelete('CASCADE');
    table.json('tone_of_voice').notNullable();
    table.json('target_audiences').notNullable();
    table.json('primary_colors').notNullable();
    table.json('fonts').notNullable();
    table.json('logo_urls').notNullable();
    table.json('hashtags_default').notNullable();
    table.text('disclaimers').nullable();
    table.json('taboo_words').notNullable();
    table.text('guidelines').nullable();
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 7. MEDIA_ASSETS
  await knex.schema.createTable('media_assets', (table) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
    table.text('storage_key').notNullable();
    table.text('public_url').notNullable();
    table.text('thumbnail_url').nullable();
    table.string('file_name', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.bigInteger('file_size_bytes').notNullable();
    table.string('media_type', 50).notNullable();
    table.json('metadata').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 8. CAMPAIGNS
  await knex.schema.createTable('campaigns', (table) => {
    table.uuid('id').primary();
    table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.string('status', 50).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 9. POSTS
  await knex.schema.createTable('posts', (table) => {
    table.uuid('id').primary();
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
    table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('campaign_id').nullable().references('id').inTable('campaigns').onDelete('SET NULL');
    table.string('title', 255).notNullable();
    table.text('base_content').notNullable();
    table.string('status', 50).notNullable().defaultTo('draft');
    table.timestamp('scheduled_for').nullable();
    table.timestamp('published_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 10. POST_VARIANTS
  await knex.schema.createTable('post_variants', (table) => {
    table.uuid('id').primary();
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.string('platform', 50).notNullable();
    table.text('content').notNullable();
    table.json('media_asset_ids').notNullable();
    table.json('platform_specific_config').notNullable();
    table.string('status', 50).notNullable().defaultTo('pending');
    table.string('remote_post_id', 255).nullable();
    table.text('remote_post_url').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['post_id', 'platform'], 'uq_post_platform_variant');
  });

  // 11. SOCIAL_ACCOUNTS
  await knex.schema.createTable('social_accounts', (table) => {
    table.uuid('id').primary();
    table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
    table.string('platform', 50).notNullable();
    table.string('account_name', 255).notNullable();
    table.string('account_id', 255).notNullable();
    table.text('access_token_encrypted').notNullable();
    table.text('refresh_token_encrypted').nullable();
    table.timestamp('token_expires_at').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.json('metadata').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['brand_id', 'platform', 'account_id'], 'uq_brand_platform_account');
  });

  // 12. APPROVAL_REQUESTS
  await knex.schema.createTable('approval_requests', (table) => {
    table.uuid('id').primary();
    table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('RESTRICT');
    table.uuid('reviewer_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('status', 50).notNullable().defaultTo('pending');
    table.string('magic_token', 255).nullable().unique();
    table.timestamp('magic_token_expires_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();
  });

  // 13. APPROVAL_COMMENTS
  await knex.schema.createTable('approval_comments', (table) => {
    table.uuid('id').primary();
    table.uuid('approval_request_id').notNullable().references('id').inTable('approval_requests').onDelete('CASCADE');
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('author_name', 255).notNullable();
    table.boolean('is_external_client').notNullable().defaultTo(false);
    table.text('comment').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 14. PUBLISH_LOGS
  await knex.schema.createTable('publish_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
    table.integer('attempt_number').notNullable().defaultTo(1);
    table.string('status', 50).notNullable();
    table.integer('http_status').nullable();
    table.json('response_payload').notNullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 15. ANALYTICS_METRICS
  await knex.schema.createTable('analytics_metrics', (table) => {
    table.uuid('id').primary();
    table.uuid('post_variant_id').notNullable().references('id').inTable('post_variants').onDelete('CASCADE');
    table.integer('impressions').notNullable().defaultTo(0);
    table.integer('reach').notNullable().defaultTo(0);
    table.integer('likes').notNullable().defaultTo(0);
    table.integer('comments').notNullable().defaultTo(0);
    table.integer('shares').notNullable().defaultTo(0);
    table.integer('clicks').notNullable().defaultTo(0);
    table.integer('video_views').notNullable().defaultTo(0);
    table.decimal('engagement_rate', 5, 4).notNullable().defaultTo(0.0);
    table.timestamp('recorded_at').notNullable().defaultTo(knex.fn.now());
  });

  // INDEXES
  await knex.schema.alterTable('brands', (table) => {
    table.index(['tenant_id'], 'idx_brands_tenant_id');
  });

  await knex.schema.alterTable('tenant_users', (table) => {
    table.index(['user_id'], 'idx_tenant_users_user_id');
  });

  await knex.schema.alterTable('brand_users', (table) => {
    table.index(['user_id'], 'idx_brand_users_user_id');
  });

  await knex.schema.alterTable('posts', (table) => {
    table.index(['brand_id', 'status'], 'idx_posts_brand_status');
    table.index(['scheduled_for'], 'idx_posts_scheduled_for');
    table.index(['tenant_id', 'created_at'], 'idx_posts_tenant_created');
  });

  await knex.schema.alterTable('media_assets', (table) => {
    table.index(['brand_id', 'media_type'], 'idx_media_brand_type');
  });

  await knex.schema.alterTable('analytics_metrics', (table) => {
    table.index(['post_variant_id', 'recorded_at'], 'idx_analytics_post_variant');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  await knex.schema.dropTableIfExists('analytics_metrics');
  await knex.schema.dropTableIfExists('publish_logs');
  await knex.schema.dropTableIfExists('approval_comments');
  await knex.schema.dropTableIfExists('approval_requests');
  await knex.schema.dropTableIfExists('social_accounts');
  await knex.schema.dropTableIfExists('post_variants');
  await knex.schema.dropTableIfExists('posts');
  await knex.schema.dropTableIfExists('campaigns');
  await knex.schema.dropTableIfExists('media_assets');
  await knex.schema.dropTableIfExists('brand_kits');
  await knex.schema.dropTableIfExists('brand_users');
  await knex.schema.dropTableIfExists('brands');
  await knex.schema.dropTableIfExists('tenant_users');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
}
