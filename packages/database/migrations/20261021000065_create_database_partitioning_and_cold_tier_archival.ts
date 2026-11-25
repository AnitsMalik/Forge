import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. db_partition_configs
  await knex.schema.createTable('db_partition_configs', (table) => {
    table.string('id', 64).primary();
    table.string('table_name', 128).notNullable().unique().index();
    table.string('partition_type', 32).notNullable().defaultTo('range_date');
    table.string('partition_key', 64).notNullable();
    table.integer('retention_days').notNullable().defaultTo(90);
    table.integer('active_partition_count').notNullable().defaultTo(12);
    table.bigInteger('total_row_count').notNullable().defaultTo(0);
    table.decimal('total_size_mb', 12, 2).notNullable().defaultTo(0.00);
    table.string('status', 32).notNullable().defaultTo('active').index();
    table.timestamp('last_pruned_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. db_archival_policies
  await knex.schema.createTable('db_archival_policies', (table) => {
    table.string('id', 64).primary();
    table.string('policy_name', 128).notNullable().unique();
    table.string('target_table', 128).notNullable().index();
    table.integer('age_threshold_days').notNullable().defaultTo(90);
    table.string('target_storage_tier', 32).notNullable().defaultTo('s3_glacier').index();
    table.string('compression_format', 32).notNullable().defaultTo('parquet_zstd');
    table.string('schedule_cron', 64).notNullable().defaultTo('0 2 * * 0');
    table.boolean('is_enabled').notNullable().defaultTo(true).index();
    table.timestamp('last_run_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. db_cold_tier_archives
  await knex.schema.createTable('db_cold_tier_archives', (table) => {
    table.string('id', 64).primary();
    table.string('policy_id', 64).notNullable().index();
    table.string('table_name', 128).notNullable().index();
    table.string('partition_name', 128).notNullable().index();
    table.timestamp('date_range_start').notNullable();
    table.timestamp('date_range_end').notNullable();
    table.bigInteger('row_count').notNullable().defaultTo(0);
    table.bigInteger('uncompressed_bytes').notNullable().defaultTo(0);
    table.bigInteger('compressed_bytes').notNullable().defaultTo(0);
    table.decimal('compression_ratio', 6, 2).notNullable().defaultTo(0.00);
    table.string('storage_uri', 512).notNullable();
    table.string('checksum_sha256', 64).notNullable();
    table.string('status', 32).notNullable().defaultTo('archived').index();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('restored_at').nullable();
  });

  // 4. db_partition_maintenance_logs
  await knex.schema.createTable('db_partition_maintenance_logs', (table) => {
    table.string('id', 64).primary();
    table.string('action', 64).notNullable().index();
    table.string('table_name', 128).notNullable().index();
    table.json('details').nullable();
    table.integer('duration_ms').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('success').index();
    table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());
  });

  const now = new Date();

  // Pre-seed Partition Configurations
  const partitionConfigs = [
    {
      id: 'part-cfg-wh-deliveries',
      table_name: 'social_webhook_deliveries',
      partition_type: 'range_date',
      partition_key: 'delivered_at',
      retention_days: 60,
      active_partition_count: 12,
      total_row_count: 840000,
      total_size_mb: 420.50,
      status: 'active',
      last_pruned_at: new Date(Date.now() - 86400000 * 3),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'part-cfg-pub-audit',
      table_name: 'publishing_audit_logs',
      partition_type: 'range_date',
      partition_key: 'created_at',
      retention_days: 180,
      active_partition_count: 24,
      total_row_count: 310000,
      total_size_mb: 185.20,
      status: 'active',
      last_pruned_at: new Date(Date.now() - 86400000 * 7),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'part-cfg-gov-audit',
      table_name: 'governance_audit_logs',
      partition_type: 'range_date',
      partition_key: 'created_at',
      retention_days: 365,
      active_partition_count: 52,
      total_row_count: 145000,
      total_size_mb: 98.40,
      status: 'active',
      last_pruned_at: new Date(Date.now() - 86400000 * 14),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'part-cfg-usage-events',
      table_name: 'tenant_usage_events',
      partition_type: 'range_date',
      partition_key: 'timestamp',
      retention_days: 90,
      active_partition_count: 12,
      total_row_count: 2150000,
      total_size_mb: 890.00,
      status: 'active',
      last_pruned_at: new Date(Date.now() - 86400000 * 5),
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('db_partition_configs').insert(partitionConfigs);

  // Pre-seed Archival Policies
  const archivalPolicies = [
    {
      id: 'pol-wh-glacier',
      policy_name: 'Webhook Ingestion Cold Storage',
      target_table: 'social_webhook_deliveries',
      age_threshold_days: 60,
      target_storage_tier: 's3_glacier',
      compression_format: 'parquet_zstd',
      schedule_cron: '0 2 * * 0',
      is_enabled: true,
      last_run_at: new Date(Date.now() - 86400000 * 3),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pol-pub-audit-coldline',
      policy_name: 'Publishing Audit Compliance Archival',
      target_table: 'publishing_audit_logs',
      age_threshold_days: 180,
      target_storage_tier: 'gcs_coldline',
      compression_format: 'parquet_zstd',
      schedule_cron: '0 3 1 * *',
      is_enabled: true,
      last_run_at: new Date(Date.now() - 86400000 * 7),
      created_at: now,
      updated_at: now,
    },
    {
      id: 'pol-usage-s3',
      policy_name: 'Tenant Usage Aggregation Rollup',
      target_table: 'tenant_usage_events',
      age_threshold_days: 90,
      target_storage_tier: 's3_glacier',
      compression_format: 'parquet_zstd',
      schedule_cron: '0 1 * * 0',
      is_enabled: true,
      last_run_at: new Date(Date.now() - 86400000 * 5),
      created_at: now,
      updated_at: now,
    },
  ];

  await knex('db_archival_policies').insert(archivalPolicies);

  // Pre-seed Cold Tier Archives
  const coldArchives = [
    {
      id: 'arch-wh-2026-q1',
      policy_id: 'pol-wh-glacier',
      table_name: 'social_webhook_deliveries',
      partition_name: 'p_wh_2026_01',
      date_range_start: new Date('2026-01-01T00:00:00Z'),
      date_range_end: new Date('2026-01-31T23:59:59Z'),
      row_count: 280000,
      uncompressed_bytes: 140000000,
      compressed_bytes: 19400000,
      compression_ratio: 7.22,
      storage_uri: 's3://socialforge-cold-vault/webhooks/2026-01.parquet.zst',
      checksum_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'archived',
      created_at: new Date('2026-02-01T03:00:00Z'),
      restored_at: null,
    },
    {
      id: 'arch-pub-2025-h2',
      policy_id: 'pol-pub-audit-coldline',
      table_name: 'publishing_audit_logs',
      partition_name: 'p_pub_2025_h2',
      date_range_start: new Date('2025-07-01T00:00:00Z'),
      date_range_end: new Date('2025-12-31T23:59:59Z'),
      row_count: 195000,
      uncompressed_bytes: 117000000,
      compressed_bytes: 14800000,
      compression_ratio: 7.91,
      storage_uri: 'gs://socialforge-compliance-archive/publishing/2025-h2.parquet.zst',
      checksum_sha256: 'd41d8cd98f00b204e9800998ecf8427e36605284348589088898129819830219',
      status: 'archived',
      created_at: new Date('2026-01-02T04:15:00Z'),
      restored_at: null,
    },
  ];

  await knex('db_cold_tier_archives').insert(coldArchives);

  // Pre-seed Maintenance Log
  await knex('db_partition_maintenance_logs').insert([
    {
      id: 'log-maint-001',
      action: 'partition_created',
      table_name: 'social_webhook_deliveries',
      details: JSON.stringify({ partitions_added: 4, range: '2026-Q4' }),
      duration_ms: 240,
      status: 'success',
      executed_at: new Date(Date.now() - 86400000 * 3),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('db_partition_maintenance_logs');
  await knex.schema.dropTableIfExists('db_cold_tier_archives');
  await knex.schema.dropTableIfExists('db_archival_policies');
  await knex.schema.dropTableIfExists('db_partition_configs');
}
