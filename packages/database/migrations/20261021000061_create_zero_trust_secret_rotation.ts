import type { Knex } from 'knex';

/**
 * Phase 36: Enterprise Zero-Trust Secret Rotation, Confidential Computing & Key Management Mesh (v5.4.0)
 *
 * Tables:
 * - secret_vault_keys: Master cryptographic keys, vault providers, rotation intervals, and status
 * - secret_key_versions: Lineage of key versions, encrypted material, SHA-256 fingerprints, and algorithms
 * - secret_access_audit_logs: Zero-trust immutable audit stream of all encryption/decryption/rotation operations
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Secret Vault Keys
  if (!(await knex.schema.hasTable('secret_vault_keys'))) {
    await knex.schema.createTable('secret_vault_keys', (table) => {
      table.string('id', 36).primary();
      table.string('key_alias', 120).notNullable().unique();
      table.string('key_type', 48).notNullable().index('idx_svk_type');
      table.string('vault_provider', 48).notNullable().index('idx_svk_provider');
      table.integer('current_version').notNullable().defaultTo(1);
      table.string('status', 32).notNullable().defaultTo('active').index('idx_svk_status');
      table.integer('rotation_interval_days').notNullable().defaultTo(90);
      table.boolean('auto_rotate_enabled').notNullable().defaultTo(true);
      table.dateTime('last_rotated_at').nullable();
      table.dateTime('next_rotation_due').nullable().index('idx_svk_due');
      table.integer('grace_period_hours').notNullable().defaultTo(72);
      table.json('metadata').nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. Secret Key Versions
  if (!(await knex.schema.hasTable('secret_key_versions'))) {
    await knex.schema.createTable('secret_key_versions', (table) => {
      table.string('id', 36).primary();
      table.string('key_id', 36).notNullable().references('id').inTable('secret_vault_keys').onDelete('CASCADE').index('idx_skv_key');
      table.integer('version_number').notNullable();
      table.text('encrypted_key_material').notNullable();
      table.string('key_fingerprint', 64).notNullable();
      table.string('algorithm', 48).notNullable().defaultTo('aes-256-gcm');
      table.string('status', 32).notNullable().defaultTo('active').index('idx_skv_status');
      table.dateTime('activated_at').notNullable().defaultTo(knex.fn.now());
      table.dateTime('deprecated_at').nullable();
      table.dateTime('revoked_at').nullable();
      table.string('rotation_trigger', 48).notNullable().defaultTo('automated_schedule');
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['key_id', 'version_number'], 'idx_skv_key_version');
    });
  }

  // 3. Secret Access Audit Logs
  if (!(await knex.schema.hasTable('secret_access_audit_logs'))) {
    await knex.schema.createTable('secret_access_audit_logs', (table) => {
      table.string('id', 36).primary();
      table.string('key_id', 36).notNullable().references('id').inTable('secret_vault_keys').onDelete('CASCADE').index('idx_saal_key');
      table.integer('version_number').notNullable();
      table.string('accessor_service', 96).notNullable().index('idx_saal_service');
      table.string('accessor_user_id', 36).nullable();
      table.string('operation', 48).notNullable().index('idx_saal_op');
      table.string('ip_address', 45).notNullable().defaultTo('127.0.0.1');
      table.boolean('success').notNullable().defaultTo(true);
      table.string('failure_reason', 255).nullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.fn.now()).index('idx_saal_created');
    });
  }

  // Seed 5 Core Secret Vault Keys and Versions
  const existingCount = await knex('secret_vault_keys').count<{ count: number }>('id as count').first();
  if (!existingCount || Number(existingCount.count) === 0) {
    const now = new Date();
    const past30 = new Date(now.getTime() - 30 * 86400000);
    const past60 = new Date(now.getTime() - 60 * 86400000);
    const future30 = new Date(now.getTime() + 30 * 86400000);
    const future60 = new Date(now.getTime() + 60 * 86400000);

    const keys = [
      {
        id: 'key-meta-oauth-01',
        key_alias: 'meta-graph-api-oauth',
        key_type: 'oauth_client_secret',
        vault_provider: 'internal_aes256_gcm',
        current_version: 2,
        status: 'active',
        rotation_interval_days: 60,
        auto_rotate_enabled: 1,
        last_rotated_at: past30,
        next_rotation_due: future30,
        grace_period_hours: 72,
        metadata: JSON.stringify({ environment: 'production', upstreamService: 'Meta Graph API v20.0' }),
        created_at: past60,
        updated_at: past30,
      },
      {
        id: 'key-master-dek-02',
        key_alias: 'master-field-encryption-dek',
        key_type: 'encryption_dek',
        vault_provider: 'aws_kms',
        current_version: 4,
        status: 'active',
        rotation_interval_days: 90,
        auto_rotate_enabled: 1,
        last_rotated_at: past30,
        next_rotation_due: future60,
        grace_period_hours: 96,
        metadata: JSON.stringify({ kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/sf-prod-envelope-dek' }),
        created_at: past60,
        updated_at: past30,
      },
      {
        id: 'key-jwt-signer-03',
        key_alias: 'jwt-session-signer',
        key_type: 'jwt_signing_key',
        vault_provider: 'internal_aes256_gcm',
        current_version: 3,
        status: 'active',
        rotation_interval_days: 30,
        auto_rotate_enabled: 1,
        last_rotated_at: past30,
        next_rotation_due: future30,
        grace_period_hours: 48,
        metadata: JSON.stringify({ tokenTtlHours: 24, algorithm: 'HS256' }),
        created_at: past60,
        updated_at: past30,
      },
      {
        id: 'key-webhook-hmac-04',
        key_alias: 'social-outbound-webhook-hmac',
        key_type: 'webhook_signing_secret',
        vault_provider: 'hashicorp_vault',
        current_version: 1,
        status: 'active',
        rotation_interval_days: 90,
        auto_rotate_enabled: 1,
        last_rotated_at: past60,
        next_rotation_due: future30,
        grace_period_hours: 72,
        metadata: JSON.stringify({ signatureHeader: 'X-SocialForge-Signature-SHA256' }),
        created_at: past60,
        updated_at: past60,
      },
      {
        id: 'key-db-mesh-replicator-05',
        key_alias: 'cross-region-db-mesh-replicator',
        key_type: 'database_password',
        vault_provider: 'internal_aes256_gcm',
        current_version: 2,
        status: 'active',
        rotation_interval_days: 180,
        auto_rotate_enabled: 1,
        last_rotated_at: past30,
        next_rotation_due: future60,
        grace_period_hours: 120,
        metadata: JSON.stringify({ meshRole: 'replication_slave_user', targetRegions: ['us-east-1', 'eu-central-1'] }),
        created_at: past60,
        updated_at: past30,
      },
    ];

    await knex('secret_vault_keys').insert(keys);

    const versions = [
      {
        id: 'ver-meta-oauth-01-v1',
        key_id: 'key-meta-oauth-01',
        version_number: 1,
        encrypted_key_material: 'enc:v1:aes-gcm:dGhpc19pc19hX3NlY3JldF9leGFtcGxl',
        key_fingerprint: '3b0c92f18a2456e7193b22cf1b9a54e99f0183ac92e105b4b1a8f9024c8e11a2',
        algorithm: 'aes-256-gcm',
        status: 'deprecated',
        activated_at: past60,
        deprecated_at: past30,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past60,
      },
      {
        id: 'ver-meta-oauth-01-v2',
        key_id: 'key-meta-oauth-01',
        version_number: 2,
        encrypted_key_material: 'enc:v2:aes-gcm:ZXhhbXBsZV9rZXlfbWF0ZXJpYWxfdjI=',
        key_fingerprint: '8f72a4b8901234cdef56789012345678abcdef0123456789abcdef0123456789',
        algorithm: 'aes-256-gcm',
        status: 'active',
        activated_at: past30,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past30,
      },
      {
        id: 'ver-master-dek-02-v3',
        key_id: 'key-master-dek-02',
        version_number: 3,
        encrypted_key_material: 'enc:v3:aws-kms:c2YtcHJvZC1lbnZlbG9wZS1kZWstZGF0YQ==',
        key_fingerprint: 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef',
        algorithm: 'aes-256-gcm',
        status: 'grace_period',
        activated_at: past60,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past60,
      },
      {
        id: 'ver-master-dek-02-v4',
        key_id: 'key-master-dek-02',
        version_number: 4,
        encrypted_key_material: 'enc:v4:aws-kms:bmV3X2F3c19rbXNfZW52ZWxvcGVfa2V5X3Y0',
        key_fingerprint: 'e92a8310c94b72615af0321ecbb431908ef902187bca928341209e81bca09211',
        algorithm: 'aes-256-gcm',
        status: 'active',
        activated_at: past30,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past30,
      },
      {
        id: 'ver-jwt-signer-03-v3',
        key_id: 'key-jwt-signer-03',
        version_number: 3,
        encrypted_key_material: 'enc:v3:aes-gcm:and0LXNlc3Npb24tc2lnbmluZy1rZXktdjM=',
        key_fingerprint: '9012345678abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        algorithm: 'hmac-sha256',
        status: 'active',
        activated_at: past30,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past30,
      },
      {
        id: 'ver-webhook-hmac-04-v1',
        key_id: 'key-webhook-hmac-04',
        version_number: 1,
        encrypted_key_material: 'enc:v1:vault:d2ViaG9vay1zaWduaW5nLXNlY3JldC12MQ==',
        key_fingerprint: 'cdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789ab',
        algorithm: 'hmac-sha256',
        status: 'active',
        activated_at: past60,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past60,
      },
      {
        id: 'ver-db-mesh-replicator-05-v2',
        key_id: 'key-db-mesh-replicator-05',
        version_number: 2,
        encrypted_key_material: 'enc:v2:aes-gcm:cmVwbGljYXRvcl9kYl9wYXNzd29yZF92Mg==',
        key_fingerprint: '7890abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345',
        algorithm: 'aes-256-gcm',
        status: 'active',
        activated_at: past30,
        deprecated_at: null,
        revoked_at: null,
        rotation_trigger: 'automated_schedule',
        created_at: past30,
      },
    ];

    await knex('secret_key_versions').insert(versions);

    const auditLogs = [
      {
        id: 'audit-sec-01',
        key_id: 'key-master-dek-02',
        version_number: 4,
        accessor_service: 'socialforge-api-gateway',
        accessor_user_id: null,
        operation: 'decrypt',
        ip_address: '10.0.1.14',
        success: 1,
        failure_reason: null,
        created_at: new Date(now.getTime() - 15 * 60000),
      },
      {
        id: 'audit-sec-02',
        key_id: 'key-jwt-signer-03',
        version_number: 3,
        accessor_service: 'socialforge-auth-service',
        accessor_user_id: null,
        operation: 'encrypt',
        ip_address: '10.0.1.20',
        success: 1,
        failure_reason: null,
        created_at: new Date(now.getTime() - 8 * 60000),
      },
      {
        id: 'audit-sec-03',
        key_id: 'key-master-dek-02',
        version_number: 4,
        accessor_service: 'socialforge-worker-pipeline',
        accessor_user_id: null,
        operation: 'encrypt',
        ip_address: '10.0.2.45',
        success: 1,
        failure_reason: null,
        created_at: new Date(now.getTime() - 2 * 60000),
      },
    ];

    await knex('secret_access_audit_logs').insert(auditLogs);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('secret_access_audit_logs');
  await knex.schema.dropTableIfExists('secret_key_versions');
  await knex.schema.dropTableIfExists('secret_vault_keys');
}
