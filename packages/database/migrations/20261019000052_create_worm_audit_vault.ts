import type { Knex } from 'knex';

/**
 * Phase 27: Immutable WORM Audit Vault & Cryptographic Tamper-Evidence (v4.5.0)
 *
 * - worm_vault_records:      append-only, SHA-256 hash-chained audit ledger
 * - worm_daily_seals:        Ed25519-signed Merkle seals over contiguous sequence ranges
 * - worm_legal_holds:        litigation / regulatory holds that block compliance purges
 * - worm_verification_tokens: hashed, expiring access tokens for external legal verifiers
 * - worm_verification_events: access log of every external verification request
 *
 * Write-Once-Read-Many is enforced at the database layer via BEFORE UPDATE / BEFORE DELETE
 * triggers on the records and seals tables, so no application bug can rewrite history.
 */

const WORM_TRIGGERS = [
  {
    name: 'trg_worm_vault_records_no_update',
    sql: `CREATE TRIGGER trg_worm_vault_records_no_update BEFORE UPDATE ON worm_vault_records
          FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'WORM_VIOLATION: worm_vault_records is append-only (UPDATE rejected)'`,
  },
  {
    name: 'trg_worm_vault_records_no_delete',
    sql: `CREATE TRIGGER trg_worm_vault_records_no_delete BEFORE DELETE ON worm_vault_records
          FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'WORM_VIOLATION: worm_vault_records is append-only (DELETE rejected)'`,
  },
  {
    name: 'trg_worm_daily_seals_no_update',
    sql: `CREATE TRIGGER trg_worm_daily_seals_no_update BEFORE UPDATE ON worm_daily_seals
          FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'WORM_VIOLATION: worm_daily_seals is append-only (UPDATE rejected)'`,
  },
  {
    name: 'trg_worm_daily_seals_no_delete',
    sql: `CREATE TRIGGER trg_worm_daily_seals_no_delete BEFORE DELETE ON worm_daily_seals
          FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'WORM_VIOLATION: worm_daily_seals is append-only (DELETE rejected)'`,
  },
];

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('worm_vault_records'))) {
    await knex.schema.createTable('worm_vault_records', (table) => {
      table.string('id', 36).primary();
      table.bigInteger('sequence_number').unsigned().notNullable().unique('uq_worm_sequence');
      table.string('tenant_id', 36).nullable().index();
      table.string('source_table', 64).notNullable();
      table.string('source_record_id', 64).notNullable();
      table.string('event_action', 128).notNullable();
      table.string('actor_id', 64).nullable();
      table.string('actor_email', 255).nullable();
      // Stored as LONGTEXT (not JSON) so the exact hashed byte sequence is preserved verbatim.
      table.text('payload_canonical', 'longtext').notNullable();
      table.string('payload_hash', 64).notNullable();
      table.string('previous_hash', 64).notNullable();
      table.string('chain_hash', 64).notNullable().unique('uq_worm_chain_hash');
      table.timestamp('source_created_at').nullable();
      table.timestamp('retain_until').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['source_table', 'source_record_id'], 'uq_worm_source_record');
      table.index(['source_table', 'source_created_at'], 'idx_worm_source_cursor');
    });
  }

  if (!(await knex.schema.hasTable('worm_daily_seals'))) {
    await knex.schema.createTable('worm_daily_seals', (table) => {
      table.string('id', 36).primary();
      // Fixed-width 'YYYY-MM-DD' string (not DATE) so the signed value never drifts across driver timezones.
      table.string('seal_date', 10).notNullable().index();
      table.bigInteger('first_sequence').unsigned().notNullable();
      table.bigInteger('last_sequence').unsigned().notNullable().unique('uq_worm_seal_last_seq');
      table.integer('record_count').notNullable();
      table.string('merkle_root', 64).notNullable();
      table.string('chain_head_hash', 64).notNullable();
      table.string('previous_seal_hash', 64).notNullable();
      table.string('seal_hash', 64).notNullable().unique('uq_worm_seal_hash');
      table.string('signature', 128).notNullable(); // Ed25519 signature, base64 (88 chars)
      table.string('signing_key_id', 32).notNullable();
      table.string('algorithm', 16).notNullable().defaultTo('Ed25519');
      table.string('sealed_by', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('worm_legal_holds'))) {
    await knex.schema.createTable('worm_legal_holds', (table) => {
      table.string('id', 36).primary();
      table.string('tenant_id', 36).nullable().index(); // null = platform-wide hold
      table.string('matter_reference', 128).notNullable();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.string('custodian_email', 255).nullable();
      table.enum('status', ['active', 'released']).notNullable().defaultTo('active').index();
      table.string('placed_by', 255).notNullable();
      table.string('released_by', 255).nullable();
      table.string('release_reason', 512).nullable();
      table.timestamp('released_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('worm_verification_tokens'))) {
    await knex.schema.createTable('worm_verification_tokens', (table) => {
      table.string('id', 36).primary();
      table.string('token_hash', 64).notNullable().unique(); // SHA-256 of token; plaintext never stored
      table.string('token_prefix', 16).notNullable();
      table.string('label', 255).notNullable();
      table.string('auditor_email', 255).notNullable();
      table.string('auditor_organization', 255).nullable();
      table.timestamp('expires_at').notNullable();
      table.boolean('revoked').notNullable().defaultTo(false);
      table.integer('access_count').notNullable().defaultTo(0);
      table.timestamp('last_accessed_at').nullable();
      table.string('created_by', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('worm_verification_events'))) {
    await knex.schema.createTable('worm_verification_events', (table) => {
      table.string('id', 36).primary();
      table.string('token_id', 36).nullable().index();
      table.string('endpoint', 128).notNullable();
      table.enum('result', ['valid', 'invalid', 'denied']).notNullable();
      table.string('seal_id', 36).nullable();
      table.string('ip_address', 64).nullable();
      table.json('details').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    });
  }

  for (const trigger of WORM_TRIGGERS) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${trigger.name}`);
    await knex.raw(trigger.sql);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const trigger of WORM_TRIGGERS) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${trigger.name}`);
  }
  await knex.schema.dropTableIfExists('worm_verification_events');
  await knex.schema.dropTableIfExists('worm_verification_tokens');
  await knex.schema.dropTableIfExists('worm_legal_holds');
  await knex.schema.dropTableIfExists('worm_daily_seals');
  await knex.schema.dropTableIfExists('worm_vault_records');
}
