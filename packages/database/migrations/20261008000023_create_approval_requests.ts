import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('approval_requests');
  if (!exists) {
    await knex.schema.createTable('approval_requests', (table) => {
      table.uuid('id').primary();
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('brand_id').notNullable().references('id').inTable('brands').onDelete('CASCADE');
      table.string('entity_type', 64).notNullable(); // 'post' | 'campaign' | 'template' | 'automation'
      table.string('entity_id', 64).notNullable();
      table.string('status', 32).notNullable().defaultTo('pending'); // 'pending' | 'approved' | 'rejected' | 'changes_requested'
      table.uuid('requested_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('reviewed_by').nullable().references('id').inTable('users').onDelete('SET NULL');
      table.text('review_notes').nullable();
      table.timestamp('reviewed_at').nullable();
      table.json('metadata').nullable(); // snapshot of entity or changes at request time
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index(['tenant_id', 'brand_id'], 'idx_approvals_tenant_brand');
      table.index(['entity_type', 'entity_id'], 'idx_approvals_entity');
      table.index(['status'], 'idx_approvals_status');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('approval_requests');
  if (exists) {
    await knex.schema.dropTable('approval_requests');
  }
}
