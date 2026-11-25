import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create user_onboarding_progress table
  const hasOnboardingTable = await knex.schema.hasTable('user_onboarding_progress');
  if (!hasOnboardingTable) {
    await knex.schema.createTable('user_onboarding_progress', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable();
      table.uuid('tenant_id').notNullable();
      table.string('status', 32).notNullable().defaultTo('NOT_STARTED'); // 'NOT_STARTED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED', 'COMPLETED'
      table.string('selected_role', 64).nullable(); // 'business_owner', 'marketing_manager', 'social_media_manager', 'marketing_agency', 'content_creator', 'other'
      table.string('primary_objective', 64).nullable(); // 'manage_social', 'create_content', 'manage_brands', 'run_campaigns', 'automate', 'analyze'
      table.integer('current_step').notNullable().defaultTo(1);
      table.json('completed_steps').notNullable();
      table.json('activities').notNullable();
      table.string('workspace_name', 255).nullable();
      table.uuid('brand_id').nullable();
      table.uuid('first_post_id').nullable();
      table.timestamp('started_at').nullable();
      table.timestamp('first_value_at').nullable(); // When first post is scheduled or published
      table.timestamp('completed_at').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['user_id'], 'idx_uop_user_id');
      table.index(['tenant_id'], 'idx_uop_tenant_id');
      table.index(['status'], 'idx_uop_status');
      table.unique(['user_id', 'tenant_id'], 'uniq_uop_user_tenant');
    });
  }

  // 2. Create onboarding_analytics_events table
  const hasAnalyticsTable = await knex.schema.hasTable('onboarding_analytics_events');
  if (!hasAnalyticsTable) {
    await knex.schema.createTable('onboarding_analytics_events', (table) => {
      table.uuid('id').primary();
      table.uuid('user_id').notNullable();
      table.uuid('tenant_id').notNullable();
      table.string('event_name', 64).notNullable(); // 'onboarding_started', 'role_selected', 'workspace_created', 'brand_kit_completed', 'social_channel_connected', 'first_post_created', 'first_post_scheduled', 'first_post_published', 'onboarding_completed', 'onboarding_abandoned'
      table.integer('step_number').nullable();
      table.json('metadata').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['event_name'], 'idx_oae_event_name');
      table.index(['tenant_id'], 'idx_oae_tenant_id');
      table.index(['user_id'], 'idx_oae_user_id');
      table.index(['created_at'], 'idx_oae_created_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('onboarding_analytics_events');
  await knex.schema.dropTableIfExists('user_onboarding_progress');
}

