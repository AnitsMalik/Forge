import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Enhance templates table
  const hasTemplates = await knex.schema.hasTable('templates');
  if (hasTemplates) {
    await knex.schema.alterTable('templates', (table) => {
      table.string('scope', 32).notNullable().defaultTo('tenant'); // 'global' | 'tenant' | 'brand'
      table.json('supported_platforms').nullable(); // ['facebook', 'instagram', 'linkedin', 'twitter']
      table.json('required_fields').nullable(); // ['product_name', 'price', 'cta']
      table.json('optional_fields').nullable(); // ['discount', 'badge', 'disclaimer']
      table.json('brand_tokens').nullable(); // color palette, typography mappings
      table.text('ai_instructions').nullable(); // guidance for filling dynamic slots
      table.json('claim_restrictions').nullable(); // restricted marketing claims & mandatory disclaimers
      table.json('cta_rules').nullable(); // allowed CTA verbs and rules
      table.string('approval_policy', 64).notNullable().defaultTo('require_approval');
      table.string('status', 32).notNullable().defaultTo('active'); // 'active' | 'inactive'
      table.integer('active_version').notNullable().defaultTo(1);
    });
  }

  // 2. Enhance template_versions table
  const hasTemplateVersions = await knex.schema.hasTable('template_versions');
  if (hasTemplateVersions) {
    await knex.schema.alterTable('template_versions', (table) => {
      table.boolean('is_locked').notNullable().defaultTo(false); // Immutable once used
      table.integer('usage_count').notNullable().defaultTo(0);
      table.json('required_fields').nullable();
      table.json('optional_fields').nullable();
      table.text('ai_instructions').nullable();
      table.json('claim_restrictions').nullable();
      table.json('cta_rules').nullable();
      table.string('approval_policy', 64).notNullable().defaultTo('require_approval');
      table.json('brand_tokens').nullable();
    });
  }

  // 3. Enhance posts table with lineage & provenance tracking
  const hasPosts = await knex.schema.hasTable('posts');
  if (hasPosts) {
    await knex.schema.alterTable('posts', (table) => {
      table.string('source_record_id', 255).nullable();
      table.string('source_version', 64).nullable();
      table.uuid('automation_id').nullable();
      table.uuid('template_id').nullable();
      table.integer('template_version').nullable();
      table.json('provenance').nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasPosts = await knex.schema.hasTable('posts');
  if (hasPosts) {
    await knex.schema.alterTable('posts', (table) => {
      table.dropColumn('source_record_id');
      table.dropColumn('source_version');
      table.dropColumn('automation_id');
      table.dropColumn('template_id');
      table.dropColumn('template_version');
      table.dropColumn('provenance');
    });
  }

  const hasTemplateVersions = await knex.schema.hasTable('template_versions');
  if (hasTemplateVersions) {
    await knex.schema.alterTable('template_versions', (table) => {
      table.dropColumn('is_locked');
      table.dropColumn('usage_count');
      table.dropColumn('required_fields');
      table.dropColumn('optional_fields');
      table.dropColumn('ai_instructions');
      table.dropColumn('claim_restrictions');
      table.dropColumn('cta_rules');
      table.dropColumn('approval_policy');
      table.dropColumn('brand_tokens');
    });
  }

  const hasTemplates = await knex.schema.hasTable('templates');
  if (hasTemplates) {
    await knex.schema.alterTable('templates', (table) => {
      table.dropColumn('scope');
      table.dropColumn('supported_platforms');
      table.dropColumn('required_fields');
      table.dropColumn('optional_fields');
      table.dropColumn('brand_tokens');
      table.dropColumn('ai_instructions');
      table.dropColumn('claim_restrictions');
      table.dropColumn('cta_rules');
      table.dropColumn('approval_policy');
      table.dropColumn('status');
      table.dropColumn('active_version');
    });
  }
}
