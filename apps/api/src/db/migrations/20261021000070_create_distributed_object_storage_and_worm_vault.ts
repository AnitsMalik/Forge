import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. storage_buckets
  await knex.schema.createTable('storage_buckets', (table) => {
    table.string('id', 64).primary();
    table.string('bucket_name', 128).notNullable().unique();
    table.string('provider_type', 64).notNullable();
    table.string('region', 64).notNullable();
    table.string('endpoint_url', 255).notNullable();
    table.string('default_storage_class', 64).notNullable().defaultTo('standard_hot');
    table.boolean('versioning_enabled').notNullable().defaultTo(true);
    table.boolean('is_immutable_locked').notNullable().defaultTo(false);
    table.integer('total_objects_count').notNullable().defaultTo(0);
    table.bigInteger('total_size_bytes').notNullable().defaultTo(0);
    table.string('status', 32).notNullable().defaultTo('active');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. object_storage_lifecycle_rules
  await knex.schema.createTable('object_storage_lifecycle_rules', (table) => {
    table.string('id', 64).primary();
    table.string('bucket_id', 64).notNullable().index();
    table.string('rule_name', 128).notNullable();
    table.string('prefix_filter', 128).notNullable().defaultTo('');
    table.integer('transition_cool_days').notNullable().defaultTo(30);
    table.integer('transition_archive_days').notNullable().defaultTo(90);
    table.integer('expiration_days').notNullable().defaultTo(365);
    table.integer('noncurrent_version_expiration_days').notNullable().defaultTo(30);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 3. immutable_object_locks
  await knex.schema.createTable('immutable_object_locks', (table) => {
    table.string('id', 64).primary();
    table.string('bucket_id', 64).notNullable().index();
    table.string('object_key', 255).notNullable().index();
    table.string('lock_mode', 64).notNullable().defaultTo('compliance_strict');
    table.timestamp('retention_until_timestamp').notNullable();
    table.boolean('legal_hold_active').notNullable().defaultTo(false);
    table.string('sha256_checksum', 128).notNullable();
    table.string('locked_by_email', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. presigned_upload_sessions
  await knex.schema.createTable('presigned_upload_sessions', (table) => {
    table.string('id', 64).primary();
    table.string('bucket_id', 64).notNullable().index();
    table.string('object_key', 255).notNullable();
    table.text('presigned_url').notNullable();
    table.string('http_method', 16).notNullable().defaultTo('PUT');
    table.string('content_type', 128).notNullable();
    table.string('expected_sha256', 128).notNullable();
    table.timestamp('expires_at').notNullable();
    table.string('status', 32).notNullable().defaultTo('issued');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed Storage Buckets
  await knex('storage_buckets').insert([
    {
      id: 'bucket-aws-primary',
      bucket_name: 'socialforge-prod-media-us-east-1',
      provider_type: 'aws_s3',
      region: 'us-east-1',
      endpoint_url: 'https://s3.us-east-1.amazonaws.com/socialforge-prod-media-us-east-1',
      default_storage_class: 'standard_hot',
      versioning_enabled: true,
      is_immutable_locked: true,
      total_objects_count: 128420,
      total_size_bytes: 48291048500,
      status: 'active',
      created_at: new Date('2026-09-01T00:00:00Z'),
    },
    {
      id: 'bucket-gcp-vault',
      bucket_name: 'socialforge-worm-vault-eu-west1',
      provider_type: 'gcp_storage',
      region: 'europe-west1',
      endpoint_url: 'https://storage.googleapis.com/socialforge-worm-vault-eu-west1',
      default_storage_class: 'archive_glacier',
      versioning_enabled: true,
      is_immutable_locked: true,
      total_objects_count: 84500,
      total_size_bytes: 31920800000,
      status: 'active',
      created_at: new Date('2026-09-05T00:00:00Z'),
    },
    {
      id: 'bucket-r2-edge',
      bucket_name: 'socialforge-public-cdn-edge',
      provider_type: 'cloudflare_r2',
      region: 'auto-global',
      endpoint_url: 'https://c9b71a2e.r2.cloudflarestorage.com/socialforge-public-cdn-edge',
      default_storage_class: 'standard_hot',
      versioning_enabled: false,
      is_immutable_locked: false,
      total_objects_count: 54100,
      total_size_bytes: 12840500000,
      status: 'active',
      created_at: new Date('2026-09-10T00:00:00Z'),
    },
  ]);

  // Pre-seed Lifecycle Rules
  await knex('object_storage_lifecycle_rules').insert([
    {
      id: 'rule-media-tiering',
      bucket_id: 'bucket-aws-primary',
      rule_name: 'Media Ingestion Tiering',
      prefix_filter: 'media/raw/',
      transition_cool_days: 30,
      transition_archive_days: 90,
      expiration_days: 365,
      noncurrent_version_expiration_days: 30,
      is_active: true,
      created_at: new Date('2026-09-02T00:00:00Z'),
    },
    {
      id: 'rule-worm-compliance',
      bucket_id: 'bucket-gcp-vault',
      rule_name: 'SEC 17a-4 Cold Archival',
      prefix_filter: 'worm-ledger/',
      transition_cool_days: 14,
      transition_archive_days: 30,
      expiration_days: 2555,
      noncurrent_version_expiration_days: 90,
      is_active: true,
      created_at: new Date('2026-09-06T00:00:00Z'),
    },
    {
      id: 'rule-cdn-cache',
      bucket_id: 'bucket-r2-edge',
      rule_name: 'CDN Ephemeral Prune',
      prefix_filter: 'cache/thumbnails/',
      transition_cool_days: 7,
      transition_archive_days: 30,
      expiration_days: 60,
      noncurrent_version_expiration_days: 7,
      is_active: true,
      created_at: new Date('2026-09-11T00:00:00Z'),
    },
  ]);

  // Pre-seed Immutable Object Locks
  await knex('immutable_object_locks').insert([
    {
      id: 'lock-audit-ledger-2026',
      bucket_id: 'bucket-gcp-vault',
      object_key: 'worm-ledger/2026-q3-crypto-ledger.dat',
      lock_mode: 'compliance_strict',
      retention_until_timestamp: new Date('2033-10-21T00:00:00Z'),
      legal_hold_active: true,
      sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      locked_by_email: 'compliance-officer@socialforge.io',
      created_at: new Date('2026-09-07T00:00:00Z'),
    },
    {
      id: 'lock-governance-backup',
      bucket_id: 'bucket-aws-primary',
      object_key: 'governance/annual_report_2026.pdf',
      lock_mode: 'governance_bypassable',
      retention_until_timestamp: new Date('2027-10-21T00:00:00Z'),
      legal_hold_active: false,
      sha256_checksum: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      locked_by_email: 'superadmin@socialforge.io',
      created_at: new Date('2026-09-08T00:00:00Z'),
    },
  ]);

  // Pre-seed Presigned Upload Session
  await knex('presigned_upload_sessions').insert([
    {
      id: 'session-seed-001',
      bucket_id: 'bucket-aws-primary',
      object_key: 'uploads/demo_video_4k.mp4',
      presigned_url:
        'https://s3.us-east-1.amazonaws.com/socialforge-prod-media-us-east-1/uploads/demo_video_4k.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20261021%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20261021T120000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=d4c6d64936d54cf8e30953a7e025b90558eb8ff74291f09bb68cfb0ca5f58da7',
      http_method: 'PUT',
      content_type: 'video/mp4',
      expected_sha256: 'd4c6d64936d54cf8e30953a7e025b90558eb8ff74291f09bb68cfb0ca5f58da7',
      expires_at: new Date('2026-10-22T12:00:00Z'),
      status: 'issued',
      created_at: new Date('2026-10-21T00:00:00Z'),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('presigned_upload_sessions');
  await knex.schema.dropTableIfExists('immutable_object_locks');
  await knex.schema.dropTableIfExists('object_storage_lifecycle_rules');
  await knex.schema.dropTableIfExists('storage_buckets');
}
