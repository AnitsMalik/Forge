import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. BRAND_GOVERNANCE_SETTINGS
  const hasGov = await knex.schema.hasTable('brand_governance_settings');
  if (!hasGov) {
    await knex.schema.createTable('brand_governance_settings', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('autonomy_level', 16).notNullable().defaultTo('L2'); // L0, L1, L2, L3, L4, L5
      table.string('max_autonomy_level', 16).notNullable().defaultTo('L5');
      table.boolean('require_approval_for_all_external').notNullable().defaultTo(true);
      table.boolean('emergency_paused').notNullable().defaultTo(false);
      table.timestamp('paused_at').nullable();
      table.uuid('paused_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('pause_reason').nullable();
      table.decimal('monthly_budget_limit', 10, 2).notNullable().defaultTo(500.00);
      table.decimal('current_month_spend', 10, 2).notNullable().defaultTo(0.00);
      table.json('allowed_domains').nullable();
      table.json('banned_words').nullable();
      table.json('mandatory_disclaimers').nullable();
      table.json('policy_rules').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['tenant_id', 'brand_id'], 'uq_brand_gov_tenant_brand');
      table.index(['tenant_id'], 'idx_brand_gov_tenant');
      table.index(['autonomy_level'], 'idx_brand_gov_autonomy');
      table.index(['emergency_paused'], 'idx_brand_gov_paused');
    });
  }

  // 2. GOVERNANCE_AUDIT_LOGS
  const hasAudit = await knex.schema.hasTable('governance_audit_logs');
  if (!hasAudit) {
    await knex.schema.createTable('governance_audit_logs', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.string('event_type', 64).notNullable(); // autonomy_change, policy_decision, approval_event, human_override, external_action, tool_call, ai_run
      table.string('action', 100).notNullable();
      table.string('entity_type', 64).nullable();
      table.string('entity_id', 128).nullable();
      table.string('status', 32).notNullable(); // allowed, rejected, approved, expired, paused, resumed, executed, flagged
      table.string('actor_role', 64).nullable();
      table.json('policy_results').nullable();
      table.json('tool_call').nullable();
      table.json('details').nullable();
      table.text('reason').nullable();
      table.string('ip_address', 64).nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_gov_audit_tenant_brand');
      table.index(['event_type'], 'idx_gov_audit_event_type');
      table.index(['status'], 'idx_gov_audit_status');
      table.index(['created_at'], 'idx_gov_audit_created_at');
    });
  }

  // 3. ENHANCE APPROVAL_REQUESTS
  const hasApprovals = await knex.schema.hasTable('approval_requests');
  if (hasApprovals) {
    const hasTenantId = await knex.schema.hasColumn('approval_requests', 'tenant_id');
    const hasBrandId = await knex.schema.hasColumn('approval_requests', 'brand_id');
    const hasEntityType = await knex.schema.hasColumn('approval_requests', 'entity_type');
    const hasEntityId = await knex.schema.hasColumn('approval_requests', 'entity_id');
    const hasReviewNotes = await knex.schema.hasColumn('approval_requests', 'review_notes');
    const hasExpiresAt = await knex.schema.hasColumn('approval_requests', 'expires_at');
    const hasEditHistory = await knex.schema.hasColumn('approval_requests', 'edit_history');
    const hasMetadata = await knex.schema.hasColumn('approval_requests', 'metadata');
    const hasReviewedBy = await knex.schema.hasColumn('approval_requests', 'reviewed_by');

    await knex.schema.alterTable('approval_requests', (table) => {
      if (!hasTenantId) table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
      if (!hasBrandId) table.uuid('brand_id').nullable().references('id').inTable('brands').onDelete('CASCADE');
      if (!hasEntityType) table.string('entity_type', 64).notNullable().defaultTo('post');
      if (!hasEntityId) table.string('entity_id', 128).nullable();
      if (!hasReviewNotes) table.text('review_notes').nullable();
      if (!hasExpiresAt) table.timestamp('expires_at').nullable();
      if (!hasEditHistory) table.json('edit_history').nullable();
      if (!hasMetadata) table.json('metadata').nullable();
      if (!hasReviewedBy) table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('governance_audit_logs');
  await knex.schema.dropTableIfExists('brand_governance_settings');
}
