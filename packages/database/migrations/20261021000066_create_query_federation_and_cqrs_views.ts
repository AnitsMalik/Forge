import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. query_federation_sources
  await knex.schema.createTable('query_federation_sources', (table) => {
    table.string('id', 64).primary();
    table.string('source_name', 128).notNullable().unique();
    table.string('source_type', 32).notNullable().defaultTo('mysql_replica');
    table.string('connection_uri', 512).notNullable();
    table.integer('read_weight').notNullable().defaultTo(100);
    table.integer('replication_lag_ms').notNullable().defaultTo(0);
    table.integer('max_qps').notNullable().defaultTo(5000);
    table.string('status', 32).notNullable().defaultTo('online').index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. read_replica_clusters
  await knex.schema.createTable('read_replica_clusters', (table) => {
    table.string('id', 64).primary();
    table.string('cluster_name', 128).notNullable().unique();
    table.string('region', 64).notNullable();
    table.string('host', 255).notNullable();
    table.integer('port').notNullable().defaultTo(3306);
    table.string('replica_role', 32).notNullable().defaultTo('read_only');
    table.integer('current_lag_ms').notNullable().defaultTo(2);
    table.boolean('healthy').notNullable().defaultTo(true).index();
    table.bigInteger('total_queries_served').notNullable().defaultTo(0);
    table.timestamp('last_heartbeat_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. cqrs_materialized_views
  await knex.schema.createTable('cqrs_materialized_views', (table) => {
    table.string('id', 64).primary();
    table.string('view_name', 128).notNullable().unique();
    table.string('target_entity', 64).notNullable().index();
    table.json('source_tables').notNullable();
    table.string('refresh_mode', 32).notNullable().defaultTo('incremental');
    table.string('refresh_cron', 64).notNullable().defaultTo('*/15 * * * *');
    table.timestamp('last_refreshed_at').nullable();
    table.bigInteger('row_count').notNullable().defaultTo(0);
    table.integer('refresh_duration_ms').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('active').index();
  });

  // 4. materialized_view_refresh_logs
  await knex.schema.createTable('materialized_view_refresh_logs', (table) => {
    table.string('id', 64).primary();
    table.string('view_id', 64).notNullable().index();
    table.string('view_name', 128).notNullable().index();
    table.string('refresh_mode', 32).notNullable().defaultTo('incremental');
    table.integer('rows_updated').notNullable().defaultTo(0);
    table.integer('duration_ms').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('success').index();
    table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed query_federation_sources
  await knex('query_federation_sources').insert([
    {
      id: 'src-mysql-primary',
      source_name: 'MySQL Primary Write Engine (us-east-1)',
      source_type: 'mysql_primary',
      connection_uri: 'mysql://socialforge_writer:***@db-primary.internal.socialforge.io:3308/socialforge_db',
      read_weight: 10,
      replication_lag_ms: 0,
      max_qps: 15000,
      status: 'online',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'src-mysql-rep-us-east',
      source_name: 'MySQL Read Replica Cluster (us-east-1a)',
      source_type: 'mysql_replica',
      connection_uri: 'mysql://socialforge_reader:***@db-replica-us-east-1a.internal.socialforge.io:3308/socialforge_db',
      read_weight: 100,
      replication_lag_ms: 4,
      max_qps: 25000,
      status: 'online',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'src-mysql-rep-eu-west',
      source_name: 'MySQL Read Replica Cluster (eu-west-1)',
      source_type: 'mysql_replica',
      connection_uri: 'mysql://socialforge_reader:***@db-replica-eu-west-1.internal.socialforge.io:3308/socialforge_db',
      read_weight: 80,
      replication_lag_ms: 12,
      max_qps: 20000,
      status: 'online',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'src-clickhouse-olap',
      source_name: 'ClickHouse Distributed OLAP Engine',
      source_type: 'clickhouse_olap',
      connection_uri: 'clickhouse://analytics_user:***@olap-cluster.internal.socialforge.io:8123/analytics_db',
      read_weight: 150,
      replication_lag_ms: 18,
      max_qps: 50000,
      status: 'online',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
    {
      id: 'src-redis-cache',
      source_name: 'Redis L2 Query Result Tier',
      source_type: 'redis_cache',
      connection_uri: 'redis://:***@cache-l2.internal.socialforge.io:6379/1',
      read_weight: 200,
      replication_lag_ms: 1,
      max_qps: 100000,
      status: 'online',
      created_at: new Date('2026-03-01T00:00:00Z'),
      updated_at: new Date('2026-03-01T00:00:00Z'),
    },
  ]);

  // Pre-seed read_replica_clusters
  await knex('read_replica_clusters').insert([
    {
      id: 'rep-us-east-01',
      cluster_name: 'aurora-mysql-us-east-reader-01',
      region: 'us-east-1 (N. Virginia)',
      host: 'aurora-rep-01.us-east-1.internal',
      port: 3308,
      replica_role: 'read_only',
      current_lag_ms: 3,
      healthy: true,
      total_queries_served: 4850200,
      last_heartbeat_at: new Date(),
    },
    {
      id: 'rep-us-west-01',
      cluster_name: 'aurora-mysql-us-west-reader-01',
      region: 'us-west-2 (Oregon)',
      host: 'aurora-rep-01.us-west-2.internal',
      port: 3308,
      replica_role: 'read_only',
      current_lag_ms: 8,
      healthy: true,
      total_queries_served: 2410900,
      last_heartbeat_at: new Date(),
    },
    {
      id: 'rep-eu-west-01',
      cluster_name: 'aurora-mysql-eu-west-reader-01',
      region: 'eu-west-1 (Ireland)',
      host: 'aurora-rep-01.eu-west-1.internal',
      port: 3308,
      replica_role: 'read_only',
      current_lag_ms: 11,
      healthy: true,
      total_queries_served: 1890300,
      last_heartbeat_at: new Date(),
    },
    {
      id: 'rep-ap-south-01',
      cluster_name: 'aurora-mysql-ap-south-standby-01',
      region: 'ap-south-1 (Mumbai)',
      host: 'aurora-rep-01.ap-south-1.internal',
      port: 3308,
      replica_role: 'standby_failover',
      current_lag_ms: 19,
      healthy: true,
      total_queries_served: 840200,
      last_heartbeat_at: new Date(),
    },
  ]);

  // Pre-seed cqrs_materialized_views
  await knex('cqrs_materialized_views').insert([
    {
      id: 'view-posts-analytics-rollup',
      view_name: 'mv_posts_realtime_engagement_rollup',
      target_entity: 'posts_analytics_rollup',
      source_tables: JSON.stringify(['posts', 'post_variants', 'real_social_analytics_daily', 'real_social_comments']),
      refresh_mode: 'incremental',
      refresh_cron: '*/5 * * * *',
      last_refreshed_at: new Date(Date.now() - 300000),
      row_count: 142050,
      refresh_duration_ms: 412,
      status: 'active',
    },
    {
      id: 'view-campaign-roi-summary',
      view_name: 'mv_campaign_multiplatform_roi_summary',
      target_entity: 'campaign_roi_summary',
      source_tables: JSON.stringify(['campaigns', 'marketing_objects', 'tenant_usage_events', 'social_webhook_deliveries']),
      refresh_mode: 'incremental',
      refresh_cron: '*/15 * * * *',
      last_refreshed_at: new Date(Date.now() - 900000),
      row_count: 36800,
      refresh_duration_ms: 820,
      status: 'active',
    },
    {
      id: 'view-tenant-spend-daily',
      view_name: 'mv_tenant_daily_spend_and_quota_consumption',
      target_entity: 'tenant_spend_daily',
      source_tables: JSON.stringify(['workspaces', 'saas_subscriptions', 'billing_invoices', 'tenant_usage_counters']),
      refresh_mode: 'full',
      refresh_cron: '0 1 * * *',
      last_refreshed_at: new Date(Date.now() - 3600000 * 4),
      row_count: 8520,
      refresh_duration_ms: 1450,
      status: 'active',
    },
  ]);

  // Pre-seed materialized_view_refresh_logs
  await knex('materialized_view_refresh_logs').insert([
    {
      id: 'ref-log-001',
      view_id: 'view-posts-analytics-rollup',
      view_name: 'mv_posts_realtime_engagement_rollup',
      refresh_mode: 'incremental',
      rows_updated: 345,
      duration_ms: 388,
      status: 'success',
      executed_at: new Date(Date.now() - 300000),
    },
    {
      id: 'ref-log-002',
      view_id: 'view-campaign-roi-summary',
      view_name: 'mv_campaign_multiplatform_roi_summary',
      refresh_mode: 'incremental',
      rows_updated: 94,
      duration_ms: 810,
      status: 'success',
      executed_at: new Date(Date.now() - 900000),
    },
    {
      id: 'ref-log-003',
      view_id: 'view-tenant-spend-daily',
      view_name: 'mv_tenant_daily_spend_and_quota_consumption',
      refresh_mode: 'full',
      rows_updated: 8520,
      duration_ms: 1450,
      status: 'success',
      executed_at: new Date(Date.now() - 3600000 * 4),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('materialized_view_refresh_logs');
  await knex.schema.dropTableIfExists('cqrs_materialized_views');
  await knex.schema.dropTableIfExists('read_replica_clusters');
  await knex.schema.dropTableIfExists('query_federation_sources');
}
