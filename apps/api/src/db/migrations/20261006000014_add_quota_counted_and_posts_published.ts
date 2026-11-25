import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add quota_counted column to posts table to ensure atomic deduplication and retry protection
  const hasPostsTable = await knex.schema.hasTable('posts');
  if (hasPostsTable) {
    const hasQuotaCounted = await knex.schema.hasColumn('posts', 'quota_counted');
    if (!hasQuotaCounted) {
      await knex.schema.alterTable('posts', (table) => {
        table.boolean('quota_counted').notNullable().defaultTo(false).after('status');
        table.index(['tenant_id', 'quota_counted'], 'idx_posts_tenant_quota_counted');
      });

      // Backfill: historical real published posts are considered counted
      await knex('posts')
        .where({ status: 'published' })
        .update({ quota_counted: true });
    }
  }

  // 2. Add posts_published column to tenant_usage_counters
  const hasUsageCounters = await knex.schema.hasTable('tenant_usage_counters');
  if (hasUsageCounters) {
    const hasPostsPublished = await knex.schema.hasColumn('tenant_usage_counters', 'posts_published');
    if (!hasPostsPublished) {
      await knex.schema.alterTable('tenant_usage_counters', (table) => {
        table.integer('posts_published').notNullable().defaultTo(0).after('period_month');
      });

      // Synchronize existing counters so historical usage is preserved
      await knex.raw(`
        UPDATE tenant_usage_counters
        SET posts_published = posts_created
        WHERE posts_published = 0 AND posts_created > 0
      `);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasUsageCounters = await knex.schema.hasTable('tenant_usage_counters');
  if (hasUsageCounters && (await knex.schema.hasColumn('tenant_usage_counters', 'posts_published'))) {
    await knex.schema.alterTable('tenant_usage_counters', (table) => {
      table.dropColumn('posts_published');
    });
  }

  const hasPostsTable = await knex.schema.hasTable('posts');
  if (hasPostsTable && (await knex.schema.hasColumn('posts', 'quota_counted'))) {
    await knex.schema.alterTable('posts', (table) => {
      table.dropIndex(['tenant_id', 'quota_counted'], 'idx_posts_tenant_quota_counted');
      table.dropColumn('quota_counted');
    });
  }
}
