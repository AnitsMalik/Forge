import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. hsm_key_rings
  await knex.schema.createTable('hsm_key_rings', (table) => {
    table.string('id', 64).primary();
    table.string('ring_name', 128).notNullable();
    table.string('provider_type', 64).notNullable();
    table.string('hsm_partition_id', 128).notNullable();
    table.string('master_key_alias', 128).notNullable();
    table.string('algorithm', 32).notNullable().defaultTo('aes_256_gcm');
    table.boolean('is_active').notNullable().defaultTo(true).index();
    table.integer('rotation_interval_days').notNullable().defaultTo(90);
    table.timestamp('last_rotated_at').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 2. envelope_data_encryption_keys
  await knex.schema.createTable('envelope_data_encryption_keys', (table) => {
    table.string('id', 64).primary();
    table.string('key_ring_id', 64).notNullable().index();
    table.string('key_label', 128).notNullable();
    table.text('encrypted_dek_ciphertext').notNullable();
    table.string('algorithm', 32).notNullable().defaultTo('aes_256_gcm');
    table.string('intended_purpose', 64).notNullable().index();
    table.string('status', 32).notNullable().defaultTo('active').index();
    table.integer('version').notNullable().defaultTo(1);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
  });

  // 3. key_derivation_policies
  await knex.schema.createTable('key_derivation_policies', (table) => {
    table.string('id', 64).primary();
    table.string('policy_name', 128).notNullable().unique();
    table.string('target_resource_type', 64).notNullable();
    table.string('key_ring_id', 64).notNullable();
    table.string('purpose', 64).notNullable();
    table.string('kdf_algorithm', 64).notNullable().defaultTo('hkdf_sha256');
    table.boolean('is_enforced').notNullable().defaultTo(true);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  // 4. hsm_crypto_audit_logs
  await knex.schema.createTable('hsm_crypto_audit_logs', (table) => {
    table.string('id', 64).primary();
    table.string('operation', 64).notNullable().index();
    table.string('key_id', 64).notNullable().index();
    table.string('operator_email', 255).notNullable();
    table.string('status', 32).notNullable().defaultTo('success');
    table.integer('duration_ms').notNullable().defaultTo(1);
    table.string('sha256_proof', 255).notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
  });

  // Pre-seed Keyrings
  await knex('hsm_key_rings').insert([
    {
      id: 'ring-aws-us-east',
      ring_name: 'AWS CloudHSM US-East Master Keyring',
      provider_type: 'aws_cloudhsm',
      hsm_partition_id: 'partition-us-east-1a-hsm01',
      master_key_alias: 'alias/socialforge-hsm-root-useast1',
      algorithm: 'aes_256_gcm',
      is_active: true,
      rotation_interval_days: 90,
      last_rotated_at: new Date('2026-02-15T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'ring-gcp-eu-west',
      ring_name: 'GCP Cloud HSM EU-West Master Keyring',
      provider_type: 'gcp_cloud_hsm',
      hsm_partition_id: 'locations/europe-west1/keyRings/sf-root',
      master_key_alias: 'cryptoKeys/envelope-master-eu1',
      algorithm: 'aes_256_gcm',
      is_active: true,
      rotation_interval_days: 90,
      last_rotated_at: new Date('2026-02-20T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'ring-vault-transit',
      ring_name: 'HashiCorp Vault Transit Global Keyring',
      provider_type: 'hashicorp_vault_transit',
      hsm_partition_id: 'transit/keys/global-envelope-root',
      master_key_alias: 'vault-transit-master-root',
      algorithm: 'aes_256_gcm',
      is_active: true,
      rotation_interval_days: 60,
      last_rotated_at: new Date('2026-03-01T00:00:00Z'),
      created_at: new Date('2026-01-01T00:00:00Z'),
    },
  ]);

  // Pre-seed DEKs (wrapped with mock ciphertext)
  await knex('envelope_data_encryption_keys').insert([
    {
      id: 'dek-tenant-pii-v1',
      key_ring_id: 'ring-aws-us-east',
      key_label: 'Tenant PII Field Encryption Key (v1)',
      encrypted_dek_ciphertext: 'enc_dek_b64_9afc38217bb4081efbc2809187da5a78c19a84210984210e7b41982a84c98e10',
      algorithm: 'aes_256_gcm',
      intended_purpose: 'tenant_pii_envelope',
      status: 'active',
      version: 1,
      created_at: new Date('2026-02-01T00:00:00Z'),
      expires_at: new Date('2027-02-01T00:00:00Z'),
    },
    {
      id: 'dek-oauth-secrets-v1',
      key_ring_id: 'ring-aws-us-east',
      key_label: 'Social Provider OAuth Tokens Envelope Key (v1)',
      encrypted_dek_ciphertext: 'enc_dek_b64_8b417e29a041f98bc410298a410b2849e781048291048120e8b410928a4190b2',
      algorithm: 'aes_256_gcm',
      intended_purpose: 'oauth_secrets_envelope',
      status: 'active',
      version: 1,
      created_at: new Date('2026-02-01T00:00:00Z'),
      expires_at: new Date('2027-02-01T00:00:00Z'),
    },
    {
      id: 'dek-audit-ledger-v1',
      key_ring_id: 'ring-vault-transit',
      key_label: 'Immutable Audit Ledger HMAC Key (v1)',
      encrypted_dek_ciphertext: 'enc_dek_b64_71a094b810e481029b418a0928b410982c41098a09b41209e84b10928a4109b8',
      algorithm: 'aes_256_gcm',
      intended_purpose: 'audit_ledger_hmac',
      status: 'active',
      version: 1,
      created_at: new Date('2026-02-01T00:00:00Z'),
      expires_at: new Date('2027-02-01T00:00:00Z'),
    },
  ]);

  // Pre-seed Derivation Policies
  await knex('key_derivation_policies').insert([
    {
      id: 'pol-pii-protection',
      policy_name: 'Tenant PII Column Envelope Encryption',
      target_resource_type: 'tenant_profiles',
      key_ring_id: 'ring-aws-us-east',
      purpose: 'tenant_pii_envelope',
      kdf_algorithm: 'hkdf_sha256',
      is_enforced: true,
      created_at: new Date('2026-01-15T00:00:00Z'),
    },
    {
      id: 'pol-oauth-protection',
      policy_name: 'Social Network OAuth Refresh Token Vault',
      target_resource_type: 'social_connections',
      key_ring_id: 'ring-aws-us-east',
      purpose: 'oauth_secrets_envelope',
      kdf_algorithm: 'hkdf_sha256',
      is_enforced: true,
      created_at: new Date('2026-01-15T00:00:00Z'),
    },
    {
      id: 'pol-audit-integrity',
      policy_name: 'Cryptographic Audit Proof Generation',
      target_resource_type: 'audit_logs',
      key_ring_id: 'ring-vault-transit',
      purpose: 'audit_ledger_hmac',
      kdf_algorithm: 'hkdf_sha256',
      is_enforced: true,
      created_at: new Date('2026-01-15T00:00:00Z'),
    },
  ]);

  // Pre-seed Audit Logs
  await knex('hsm_crypto_audit_logs').insert([
    {
      id: 'hsm-audit-seed-01',
      operation: 'generate_dek',
      key_id: 'dek-tenant-pii-v1',
      operator_email: 'security.lead@socialforge.io',
      status: 'success',
      duration_ms: 12,
      sha256_proof: 'proof_sha256_789a4b810ef810982c41098a09b41209e84b10928a4109b8789a4b810ef81098',
      timestamp: new Date('2026-02-01T00:01:00Z'),
    },
    {
      id: 'hsm-audit-seed-02',
      operation: 'wrap_key',
      key_id: 'dek-oauth-secrets-v1',
      operator_email: 'security.lead@socialforge.io',
      status: 'success',
      duration_ms: 8,
      sha256_proof: 'proof_sha256_891048120e8b410928a4190b28b417e29a041f98bc410298a410b2849e781048',
      timestamp: new Date('2026-02-01T00:02:00Z'),
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('hsm_crypto_audit_logs');
  await knex.schema.dropTableIfExists('key_derivation_policies');
  await knex.schema.dropTableIfExists('envelope_data_encryption_keys');
  await knex.schema.dropTableIfExists('hsm_key_rings');
}
