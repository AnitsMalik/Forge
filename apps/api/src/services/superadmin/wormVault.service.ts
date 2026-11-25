/**
 * Immutable WORM Audit Vault & Cryptographic Tamper-Evidence Service
 * SocialForge Platform v4.5.0
 *
 * Responsibilities:
 *   1. Ingest audit events from source audit tables into an append-only, SHA-256 hash-chained ledger
 *   2. Produce Ed25519-signed Merkle seals over contiguous, previously unsealed sequence ranges
 *   3. Verify the full ledger (sequence continuity, payload hashes, chain links, seals, signatures)
 *   4. Simulate tampering in memory to prove detection without ever mutating stored evidence
 *   5. Manage legal holds (which block compliance purges) and external verifier access tokens
 */

import crypto from 'node:crypto';
import { db } from '../../db/connection.js';
import type {
  WormSourceTable,
  WormVaultRecord,
  WormDailySeal,
  WormInclusionProof,
  WormVerificationIssue,
  WormVerificationReport,
  WormTamperSimulationRequest,
  WormIngestionResult,
  WormLegalHold,
  CreateWormLegalHoldDto,
  ReleaseWormLegalHoldDto,
  WormVerificationToken,
  IssuedWormVerificationToken,
  IssueWormVerificationTokenDto,
  WormVerificationEvent,
  WormSigningKeyInfo,
  WormVaultOverview,
  WormPublicSealVerification,
} from '@socialforge/shared';
import {
  GENESIS_HASH,
  redactSecrets,
  canonicalize,
  sha256Hex,
  computeChainHash,
  computeMerkleRoot,
  buildInclusionProof,
  computeSealHash,
  signSealHash,
  verifySealSignature,
  getSigningMaterial,
} from './wormCrypto.js';

const SOURCE_TABLES: WormSourceTable[] = ['superadmin_audit_logs', 'governance_audit_logs', 'publishing_audit_logs'];
const DEFAULT_RETENTION_DAYS = 730;
const INSERT_CHUNK = 200;
const VERIFY_PAGE = 2000;
const MAX_SIMULATION_RECORDS = Number(process.env.MAX_SIMULATION_RECORDS) || 250000;
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export class WormError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface Actor {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Chain mutex: every append/seal is serialized in-process. The DB unique constraints on
// sequence_number and chain_hash are the second line of defence against concurrent writers.
// ---------------------------------------------------------------------------
let chainLock: Promise<unknown> = Promise.resolve();
function withChainLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chainLock.then(fn, fn);
  chainLock = run.catch(() => undefined);
  return run;
}

function iso(value: any): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function mapRecord(row: any, includePayload = false): WormVaultRecord {
  const record: WormVaultRecord = {
    id: row.id,
    sequenceNumber: Number(row.sequence_number),
    tenantId: row.tenant_id ?? null,
    sourceTable: row.source_table,
    sourceRecordId: row.source_record_id,
    eventAction: row.event_action,
    actorId: row.actor_id ?? null,
    actorEmail: row.actor_email ?? null,
    payloadHash: row.payload_hash,
    previousHash: row.previous_hash,
    chainHash: row.chain_hash,
    sourceCreatedAt: iso(row.source_created_at),
    retainUntil: iso(row.retain_until),
    createdAt: iso(row.created_at),
  };
  if (includePayload) record.payloadCanonical = row.payload_canonical;
  return record;
}

function mapSeal(row: any): WormDailySeal {
  return {
    id: row.id,
    sealDate: row.seal_date,
    firstSequence: Number(row.first_sequence),
    lastSequence: Number(row.last_sequence),
    recordCount: Number(row.record_count),
    merkleRoot: row.merkle_root,
    chainHeadHash: row.chain_head_hash,
    previousSealHash: row.previous_seal_hash,
    sealHash: row.seal_hash,
    signature: row.signature,
    signingKeyId: row.signing_key_id,
    algorithm: 'Ed25519',
    sealedBy: row.sealed_by,
    createdAt: iso(row.created_at),
  };
}

function mapHold(row: any): WormLegalHold {
  return {
    id: row.id,
    tenantId: row.tenant_id ?? null,
    matterReference: row.matter_reference,
    title: row.title,
    description: row.description ?? null,
    custodianEmail: row.custodian_email ?? null,
    status: row.status,
    placedBy: row.placed_by,
    releasedBy: row.released_by ?? null,
    releaseReason: row.release_reason ?? null,
    releasedAt: row.released_at ? iso(row.released_at) : null,
    createdAt: iso(row.created_at),
  };
}

function mapToken(row: any): WormVerificationToken {
  return {
    id: row.id,
    label: row.label,
    auditorEmail: row.auditor_email,
    auditorOrganization: row.auditor_organization ?? null,
    tokenPrefix: row.token_prefix,
    expiresAt: iso(row.expires_at),
    revoked: Boolean(row.revoked),
    accessCount: Number(row.access_count || 0),
    lastAccessedAt: row.last_accessed_at ? iso(row.last_accessed_at) : null,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
  };
}

/** Extracts denormalized index fields from a source audit row. */
function describeSourceRow(sourceTable: WormSourceTable, row: any) {
  switch (sourceTable) {
    case 'superadmin_audit_logs':
      return {
        tenantId: row.target_tenant_id ?? null,
        eventAction: String(row.action || 'unknown'),
        actorId: row.superadmin_id ? String(row.superadmin_id) : null,
        actorEmail: row.superadmin_email ?? null,
      };
    case 'governance_audit_logs':
      return {
        tenantId: row.tenant_id ?? null,
        eventAction: String(row.action || row.event_type || 'unknown'),
        actorId: row.user_id ? String(row.user_id) : null,
        actorEmail: null,
      };
    case 'publishing_audit_logs':
    default:
      return {
        tenantId: row.tenant_id ?? null,
        eventAction: String(row.action || 'unknown'),
        actorId: row.user_id ? String(row.user_id) : row.agent_id ? String(row.agent_id) : null,
        actorEmail: null,
      };
  }
}

// ---------------------------------------------------------------------------
// Incremental ledger verifier: consumes records in sequence order (paged or in memory)
// ---------------------------------------------------------------------------
class LedgerVerifier {
  private expectedSequence = 1;
  private previousHash = GENESIS_HASH;
  private chainHashBySequence = new Map<number, string>();
  readonly issues: WormVerificationIssue[] = [];
  recordsChecked = 0;
  sealsChecked = 0;
  headSequence = 0;
  headHash = GENESIS_HASH;

  consume(row: any) {
    const seq = Number(row.sequence_number);
    if (seq !== this.expectedSequence) {
      this.issues.push({
        type: 'sequence_gap',
        sequenceNumber: seq,
        message: `Expected sequence #${this.expectedSequence} but found #${seq} (records missing, inserted or reordered).`,
      });
    }

    const recomputedPayloadHash = sha256Hex(row.payload_canonical ?? '');
    if (recomputedPayloadHash !== row.payload_hash) {
      this.issues.push({
        type: 'payload_hash_mismatch',
        sequenceNumber: seq,
        message: `Payload of record #${seq} no longer matches its stored SHA-256 digest (content was altered).`,
      });
    }

    if (row.previous_hash !== this.previousHash) {
      this.issues.push({
        type: 'chain_link_broken',
        sequenceNumber: seq,
        message: `Record #${seq} does not link to the preceding chain hash.`,
      });
    }

    const recomputedChainHash = computeChainHash({
      previousHash: row.previous_hash,
      sequenceNumber: seq,
      sourceTable: row.source_table,
      sourceRecordId: row.source_record_id,
      tenantId: row.tenant_id ?? null,
      eventAction: row.event_action,
      actorId: row.actor_id ?? null,
      payloadHash: recomputedPayloadHash,
    });
    if (recomputedChainHash !== row.chain_hash) {
      this.issues.push({
        type: 'chain_hash_mismatch',
        sequenceNumber: seq,
        message: `Recomputed chain hash for record #${seq} differs from the stored value.`,
      });
    }

    this.chainHashBySequence.set(seq, row.chain_hash);
    this.previousHash = row.chain_hash;
    this.expectedSequence = seq + 1;
    this.recordsChecked++;
    this.headSequence = seq;
    this.headHash = row.chain_hash;
  }

  verifySeals(seals: any[]) {
    const { publicKey, keyId } = getSigningMaterial();
    let previousSealHash = GENESIS_HASH;
    const ordered = [...seals].sort((a, b) => Number(a.last_sequence) - Number(b.last_sequence));

    for (const seal of ordered) {
      this.sealsChecked++;
      const first = Number(seal.first_sequence);
      const last = Number(seal.last_sequence);

      if (seal.previous_seal_hash !== previousSealHash) {
        this.issues.push({ type: 'seal_chain_broken', sealId: seal.id, message: `Seal ${seal.id} does not link to the preceding seal.` });
      }

      if (last > this.headSequence) {
        this.issues.push({
          type: 'sequence_gap',
          sequenceNumber: last,
          message: `Seal ${seal.id} commits to sequence #${last}, but ledger terminates early at #${this.headSequence} (tail records truncated or deleted).`,
        });
      }

      const leaves: string[] = [];
      let missing = false;
      for (let s = first; s <= last; s++) {
        const h = this.chainHashBySequence.get(s);
        if (!h) {
          missing = true;
          break;
        }
        leaves.push(h);
      }
      if (missing || leaves.length === 0 || computeMerkleRoot(leaves) !== seal.merkle_root) {
        this.issues.push({
          type: 'merkle_root_mismatch',
          sealId: seal.id,
          message: `Merkle root recomputed over sequences #${first}-#${last} does not match seal ${seal.id}.`,
        });
      }

      if (this.chainHashBySequence.get(last) !== seal.chain_head_hash) {
        this.issues.push({
          type: 'seal_head_mismatch',
          sealId: seal.id,
          sequenceNumber: last,
          message: `Chain head at #${last} differs from the hash anchored in seal ${seal.id}.`,
        });
      }

      const recomputedSealHash = computeSealHash({
        sealDate: seal.seal_date,
        firstSequence: first,
        lastSequence: last,
        recordCount: Number(seal.record_count),
        merkleRoot: seal.merkle_root,
        chainHeadHash: seal.chain_head_hash,
        previousSealHash: seal.previous_seal_hash,
        signingKeyId: seal.signing_key_id,
      });
      if (recomputedSealHash !== seal.seal_hash) {
        this.issues.push({ type: 'seal_hash_mismatch', sealId: seal.id, message: `Seal ${seal.id} fields no longer match its sealed hash.` });
      }

      if (seal.signing_key_id !== keyId) {
        this.issues.push({
          type: 'seal_signature_invalid',
          sealId: seal.id,
          message: `Seal ${seal.id} was signed by key ${seal.signing_key_id}, which is not the active verification key ${keyId}.`,
        });
      } else if (!verifySealSignature(seal.seal_hash, seal.signature, publicKey)) {
        this.issues.push({ type: 'seal_signature_invalid', sealId: seal.id, message: `Ed25519 signature on seal ${seal.id} is invalid.` });
      }

      previousSealHash = seal.seal_hash;
    }
  }

  report(startedAt: number, simulated = false): WormVerificationReport {
    const sequences = this.issues.map((i) => i.sequenceNumber).filter((s): s is number => typeof s === 'number');
    return {
      verified: this.issues.length === 0,
      tamperDetected: this.issues.length > 0,
      recordsChecked: this.recordsChecked,
      sealsChecked: this.sealsChecked,
      chainHeadSequence: this.headSequence,
      chainHeadHash: this.headHash,
      firstBrokenSequence: sequences.length ? Math.min(...sequences) : null,
      issues: this.issues.slice(0, 200),
      durationMs: Date.now() - startedAt,
      verifiedAt: new Date().toISOString(),
      ...(simulated ? { simulated: true } : {}),
    };
  }
}

export class WormVaultService {
  private lastVerification: WormVerificationReport | null = null;

  // =========================================================================
  // Helpers
  // =========================================================================

  private async audit(actor: Actor, action: string, resourceId: string | null, details: Record<string, any>, reason?: string, tenantId?: string | null) {
    // superadmin_audit_logs.superadmin_id is a FK to users; the system scheduler is not a user.
    // Its seals are self-evidencing (immutable worm_daily_seals row with sealed_by = system actor).
    if (actor.id === SYSTEM_ACTOR_ID) return;
    await db('superadmin_audit_logs').insert({
      id: crypto.randomUUID(),
      superadmin_id: actor.id,
      superadmin_email: actor.email,
      action,
      target_tenant_id: tenantId ?? null,
      target_resource_type: 'worm_vault',
      target_resource_id: resourceId,
      reason: reason ?? null,
      details: JSON.stringify(details),
      created_at: new Date(),
    });
  }

  private async getChainHead(trx: any = db): Promise<{ sequence: number; hash: string }> {
    const head = await trx('worm_vault_records').select('sequence_number', 'chain_hash').orderBy('sequence_number', 'desc').first();
    return head ? { sequence: Number(head.sequence_number), hash: head.chain_hash } : { sequence: 0, hash: GENESIS_HASH };
  }

  private async resolveRetentionDays(): Promise<(tenantId: string | null) => number> {
    const policies = await db('compliance_retention_policies')
      .where({ data_category: 'audit_logs', is_active: true })
      .select('tenant_id', 'retention_days')
      .catch(() => [] as any[]);
    const globalPolicy = policies.find((p: any) => !p.tenant_id);
    const byTenant = new Map<string, number>(policies.filter((p: any) => p.tenant_id).map((p: any) => [p.tenant_id, Number(p.retention_days)]));
    const fallback = globalPolicy ? Number(globalPolicy.retention_days) : DEFAULT_RETENTION_DAYS;
    return (tenantId) => (tenantId && byTenant.has(tenantId) ? byTenant.get(tenantId)! : fallback);
  }

  getSigningKeyInfo(): WormSigningKeyInfo {
    const m = getSigningMaterial();
    return { algorithm: 'Ed25519', keyId: m.keyId, publicKeyPem: m.publicKeyPem, usingDevelopmentSeed: m.usingDevelopmentSeed };
  }

  // =========================================================================
  // 1. INGESTION — append new source audit events to the hash chain
  // =========================================================================

  async ingest(options: { limitPerSource?: number; actor?: Actor } = {}): Promise<WormIngestionResult> {
    const limitPerSource = Math.min(Math.max(Number(options.limitPerSource) || 5000, 1), 20000);
    const startedAt = Date.now();

    const result = await withChainLock(async () => {
      const bySource = { superadmin_audit_logs: 0, governance_audit_logs: 0, publishing_audit_logs: 0 } as Record<WormSourceTable, number>;
      const pending: Array<{ sourceTable: WormSourceTable; row: any; createdAt: number }> = [];

      for (const sourceTable of SOURCE_TABLES) {
        if (!(await db.schema.hasTable(sourceTable))) continue;

        const cursorRow = await db('worm_vault_records').where({ source_table: sourceTable }).max({ cursor: 'source_created_at' }).first();
        const cursor = cursorRow?.cursor ? new Date(cursorRow.cursor) : null;

        let alreadyIngested = new Set<string>();
        let query = db(sourceTable).orderBy([{ column: 'created_at', order: 'asc' }, { column: 'id', order: 'asc' }]);
        if (cursor) {
          const existing = await db('worm_vault_records')
            .where({ source_table: sourceTable })
            .andWhere('source_created_at', '>=', cursor)
            .select('source_record_id');
          alreadyIngested = new Set(existing.map((r: any) => String(r.source_record_id)));
          query = query.where('created_at', '>=', cursor);
        }

        const rows = await query.limit(limitPerSource + alreadyIngested.size);
        let accepted = 0;
        for (const row of rows) {
          if (alreadyIngested.has(String(row.id))) continue;
          pending.push({ sourceTable, row, createdAt: row.created_at ? new Date(row.created_at).getTime() : 0 });
          if (++accepted >= limitPerSource) break;
        }
      }

      // Global chronological order across sources, with deterministic tie-breaking.
      pending.sort(
        (a, b) =>
          a.createdAt - b.createdAt ||
          a.sourceTable.localeCompare(b.sourceTable) ||
          String(a.row.id).localeCompare(String(b.row.id))
      );

      const retentionFor = await this.resolveRetentionDays();
      let head = await this.getChainHead();
      const inserts: any[] = [];

      for (const { sourceTable, row } of pending) {
        const meta = describeSourceRow(sourceTable, row);
        const sourceRecordId = String(row.id).slice(0, 64);
        const payloadCanonical = canonicalize(redactSecrets({ source: sourceTable, record: row }));
        const payloadHash = sha256Hex(payloadCanonical);
        const sequenceNumber = head.sequence + 1;
        const chainHash = computeChainHash({
          previousHash: head.hash,
          sequenceNumber,
          sourceTable,
          sourceRecordId,
          tenantId: meta.tenantId,
          eventAction: meta.eventAction.slice(0, 128),
          actorId: meta.actorId ? meta.actorId.slice(0, 64) : null,
          payloadHash,
        });

        inserts.push({
          id: crypto.randomUUID(),
          sequence_number: sequenceNumber,
          tenant_id: meta.tenantId,
          source_table: sourceTable,
          source_record_id: sourceRecordId,
          event_action: meta.eventAction.slice(0, 128),
          actor_id: meta.actorId ? meta.actorId.slice(0, 64) : null,
          actor_email: meta.actorEmail,
          payload_canonical: payloadCanonical,
          payload_hash: payloadHash,
          previous_hash: head.hash,
          chain_hash: chainHash,
          source_created_at: row.created_at ? new Date(row.created_at) : null,
          retain_until: new Date(Date.now() + retentionFor(meta.tenantId) * 86400000),
          created_at: new Date(),
        });
        bySource[sourceTable]++;
        head = { sequence: sequenceNumber, hash: chainHash };
      }

      if (inserts.length > 0) {
        await db.transaction(async (trx) => {
          for (let i = 0; i < inserts.length; i += INSERT_CHUNK) {
            await trx('worm_vault_records').insert(inserts.slice(i, i + INSERT_CHUNK));
          }
        });
      }

      return { ingested: inserts.length, bySource, chainHeadSequence: head.sequence, chainHeadHash: head.hash };
    });

    if (options.actor && result.ingested > 0) {
      await this.audit(options.actor, 'worm_vault_ingestion', null, {
        ingested: result.ingested,
        bySource: result.bySource,
        chainHeadSequence: result.chainHeadSequence,
      });
    }

    return { ...result, durationMs: Date.now() - startedAt };
  }

  // =========================================================================
  // 2. RECORDS
  // =========================================================================

  async listRecords(params: { sourceTable?: string; tenantId?: string; action?: string; limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const offset = Math.max(Number(params.offset) || 0, 0);
    const apply = (q: any) => {
      if (params.sourceTable && SOURCE_TABLES.includes(params.sourceTable as WormSourceTable)) q.where('source_table', params.sourceTable);
      if (params.tenantId) q.where('tenant_id', params.tenantId);
      if (params.action) q.where('event_action', 'like', `%${params.action}%`);
      return q;
    };
    const [rows, countRow] = await Promise.all([
      apply(db('worm_vault_records'))
        .select(
          'id', 'sequence_number', 'tenant_id', 'source_table', 'source_record_id', 'event_action', 'actor_id',
          'actor_email', 'payload_hash', 'previous_hash', 'chain_hash', 'source_created_at', 'retain_until', 'created_at'
        )
        .orderBy('sequence_number', 'desc')
        .limit(limit)
        .offset(offset),
      apply(db('worm_vault_records')).count({ n: '*' }).first(),
    ]);
    return { records: rows.map((r: any) => mapRecord(r)), total: Number(countRow?.n || 0), limit, offset };
  }

  async getRecord(sequenceNumber: number): Promise<{ record: WormVaultRecord; proof: WormInclusionProof | null }> {
    const row = await db('worm_vault_records').where({ sequence_number: sequenceNumber }).first();
    if (!row) throw new WormError(404, `Vault record #${sequenceNumber} not found.`);
    const proof = await this.getInclusionProof(sequenceNumber).catch(() => null);
    return { record: mapRecord(row, true), proof };
  }

  async getInclusionProof(sequenceNumber: number): Promise<WormInclusionProof> {
    if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) throw new WormError(400, 'A positive integer sequence number is required.');
    const record = await db('worm_vault_records').where({ sequence_number: sequenceNumber }).select('chain_hash', 'payload_hash').first();
    if (!record) throw new WormError(404, `Vault record #${sequenceNumber} not found.`);
    const sealRow = await db('worm_daily_seals')
      .where('first_sequence', '<=', sequenceNumber)
      .andWhere('last_sequence', '>=', sequenceNumber)
      .first();
    if (!sealRow) throw new WormError(409, `Vault record #${sequenceNumber} is not yet covered by a signed seal.`);

    const leaves = await db('worm_vault_records')
      .whereBetween('sequence_number', [Number(sealRow.first_sequence), Number(sealRow.last_sequence)])
      .orderBy('sequence_number', 'asc')
      .pluck('chain_hash');
    const leafIndex = sequenceNumber - Number(sealRow.first_sequence);
    const { leafHash, proof, root } = buildInclusionProof(leaves, leafIndex);

    return {
      sequenceNumber,
      chainHash: record.chain_hash,
      payloadHash: record.payload_hash,
      leafIndex,
      leafHash,
      proof,
      merkleRoot: root,
      seal: mapSeal(sealRow),
      signingPublicKeyPem: getSigningMaterial().publicKeyPem,
    };
  }

  // =========================================================================
  // 3. DAILY CRYPTOGRAPHIC SEALS
  // =========================================================================

  async createSeal(actor: Actor): Promise<WormDailySeal> {
    const seal = await withChainLock(async () => {
      const lastSeal = await db('worm_daily_seals').orderBy('last_sequence', 'desc').first();
      const firstSequence = lastSeal ? Number(lastSeal.last_sequence) + 1 : 1;
      const head = await this.getChainHead();
      if (head.sequence < firstSequence) {
        throw new WormError(409, 'No unsealed vault records. Ingest new audit events before sealing.');
      }

      // Never anchor a tampered range: re-verify the exact range being sealed.
      const rows = await db('worm_vault_records')
        .whereBetween('sequence_number', [firstSequence, head.sequence])
        .orderBy('sequence_number', 'asc');
      const anchor = firstSequence === 1
        ? GENESIS_HASH
        : (await db('worm_vault_records').where({ sequence_number: firstSequence - 1 }).select('chain_hash').first())?.chain_hash;
      if (!anchor) throw new WormError(500, `Chain anchor #${firstSequence - 1} is missing; refusing to seal.`);

      let previous = anchor;
      let expected = firstSequence;
      for (const row of rows) {
        const payloadHash = sha256Hex(row.payload_canonical);
        const recomputed = computeChainHash({
          previousHash: previous,
          sequenceNumber: Number(row.sequence_number),
          sourceTable: row.source_table,
          sourceRecordId: row.source_record_id,
          tenantId: row.tenant_id ?? null,
          eventAction: row.event_action,
          actorId: row.actor_id ?? null,
          payloadHash,
        });
        if (Number(row.sequence_number) !== expected || payloadHash !== row.payload_hash || recomputed !== row.chain_hash) {
          throw new WormError(409, `Integrity failure at record #${row.sequence_number}; seal refused. Run a full verification.`);
        }
        previous = row.chain_hash;
        expected++;
      }

      const { keyId } = getSigningMaterial();
      const sealInput = {
        sealDate: new Date().toISOString().slice(0, 10),
        firstSequence,
        lastSequence: head.sequence,
        recordCount: rows.length,
        merkleRoot: computeMerkleRoot(rows.map((r: any) => r.chain_hash)),
        chainHeadHash: head.hash,
        previousSealHash: lastSeal ? lastSeal.seal_hash : GENESIS_HASH,
        signingKeyId: keyId,
      };
      const sealHash = computeSealHash(sealInput);
      const row = {
        id: crypto.randomUUID(),
        seal_date: sealInput.sealDate,
        first_sequence: sealInput.firstSequence,
        last_sequence: sealInput.lastSequence,
        record_count: sealInput.recordCount,
        merkle_root: sealInput.merkleRoot,
        chain_head_hash: sealInput.chainHeadHash,
        previous_seal_hash: sealInput.previousSealHash,
        seal_hash: sealHash,
        signature: signSealHash(sealHash),
        signing_key_id: keyId,
        algorithm: 'Ed25519',
        sealed_by: actor.email,
        created_at: new Date(),
      };
      await db('worm_daily_seals').insert(row);
      return mapSeal(row);
    });

    await this.audit(actor, 'worm_daily_seal_created', seal.id, {
      sealDate: seal.sealDate,
      range: [seal.firstSequence, seal.lastSequence],
      recordCount: seal.recordCount,
      merkleRoot: seal.merkleRoot,
      sealHash: seal.sealHash,
      signingKeyId: seal.signingKeyId,
    });
    return seal;
  }

  async listSeals(limit = 100): Promise<WormDailySeal[]> {
    const rows = await db('worm_daily_seals').orderBy('last_sequence', 'desc').limit(Math.min(Math.max(limit, 1), 500));
    return rows.map(mapSeal);
  }

  async getSeal(id: string): Promise<WormDailySeal> {
    const row = await db('worm_daily_seals').where({ id }).first();
    if (!row) throw new WormError(404, 'Seal not found.');
    return mapSeal(row);
  }

  /** Independent verification of a single seal (used by the external legal portal). */
  async verifySeal(id: string): Promise<WormPublicSealVerification> {
    const row = await db('worm_daily_seals').where({ id }).first();
    if (!row) throw new WormError(404, 'Seal not found.');
    const first = Number(row.first_sequence);
    const last = Number(row.last_sequence);

    const leaves = await db('worm_vault_records').whereBetween('sequence_number', [first, last]).orderBy('sequence_number', 'asc').select('sequence_number', 'chain_hash');
    const contiguous = leaves.length === last - first + 1 && leaves.every((l: any, i: number) => Number(l.sequence_number) === first + i);
    const merkleRootValid = contiguous && leaves.length > 0 && computeMerkleRoot(leaves.map((l: any) => l.chain_hash)) === row.merkle_root;
    const chainHeadValid = contiguous && leaves[leaves.length - 1]?.chain_hash === row.chain_head_hash;

    const sealHashValid =
      computeSealHash({
        sealDate: row.seal_date,
        firstSequence: first,
        lastSequence: last,
        recordCount: Number(row.record_count),
        merkleRoot: row.merkle_root,
        chainHeadHash: row.chain_head_hash,
        previousSealHash: row.previous_seal_hash,
        signingKeyId: row.signing_key_id,
      }) === row.seal_hash;

    const signatureValid = row.signing_key_id === getSigningMaterial().keyId && verifySealSignature(row.seal_hash, row.signature);

    const previous = await db('worm_daily_seals').where('last_sequence', '<', first).orderBy('last_sequence', 'desc').first();
    const previousSealLinkValid = previous ? previous.seal_hash === row.previous_seal_hash : row.previous_seal_hash === GENESIS_HASH;

    return {
      seal: mapSeal(row),
      signatureValid,
      sealHashValid,
      merkleRootValid,
      chainHeadValid,
      previousSealLinkValid,
      verified: signatureValid && sealHashValid && merkleRootValid && chainHeadValid && previousSealLinkValid,
      verifiedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // 4. FULL LEDGER VERIFICATION & TAMPER SIMULATION
  // =========================================================================

  async verifyLedger(actor?: Actor): Promise<WormVerificationReport> {
    const startedAt = Date.now();
    const verifier = new LedgerVerifier();
    let lastSeq = 0;
    // Keyset pagination keeps memory bounded regardless of ledger size.
    for (;;) {
      const page = await db('worm_vault_records').where('sequence_number', '>', lastSeq).orderBy('sequence_number', 'asc').limit(VERIFY_PAGE);
      if (page.length === 0) break;
      for (const row of page) verifier.consume(row);
      lastSeq = Number(page[page.length - 1].sequence_number);
      if (page.length < VERIFY_PAGE) break;
    }
    verifier.verifySeals(await db('worm_daily_seals'));
    const report = verifier.report(startedAt);
    this.lastVerification = report;

    if (actor) {
      await this.audit(actor, 'worm_vault_verified', null, {
        verified: report.verified,
        recordsChecked: report.recordsChecked,
        sealsChecked: report.sealsChecked,
        issues: report.issues.length,
        chainHeadHash: report.chainHeadHash,
      });
    }
    return report;
  }

  /** Mutates an in-memory COPY of the ledger and proves the verifier detects it. Stored evidence is never touched. */
  async simulateTamper(req: WormTamperSimulationRequest): Promise<WormVerificationReport & { mutation: string }> {
    const modes = ['payload', 'delete', 'reorder', 'seal_root'];
    if (!modes.includes(req?.mode)) throw new WormError(400, `mode must be one of: ${modes.join(', ')}`);

    const startedAt = Date.now();
    const total = Number((await db('worm_vault_records').count({ n: '*' }).first())?.n || 0);
    if (total < 2) throw new WormError(409, 'At least two vault records are required to simulate tampering.');
    if (total > MAX_SIMULATION_RECORDS) throw new WormError(413, `Simulation is limited to ledgers of ${MAX_SIMULATION_RECORDS} records.`);

    const records = (await db('worm_vault_records').orderBy('sequence_number', 'asc')).map((r: any) => ({ ...r }));
    const seals = (await db('worm_daily_seals')).map((s: any) => ({ ...s }));

    const target = req.sequenceNumber && req.sequenceNumber >= 1 && req.sequenceNumber <= records.length
      ? req.sequenceNumber
      : Math.max(1, Math.floor(records.length / 2));
    const idx = records.findIndex((r: any) => Number(r.sequence_number) === target);
    if (idx < 0) throw new WormError(404, `Record #${target} not found.`);

    let mutation = '';
    switch (req.mode) {
      case 'payload':
        records[idx].payload_canonical = records[idx].payload_canonical.replace(/.$/, ',"tampered":true}');
        mutation = `Altered payload content of record #${target}.`;
        break;
      case 'delete':
        records.splice(idx, 1);
        mutation = `Silently deleted record #${target}.`;
        break;
      case 'reorder': {
        const j = idx + 1 < records.length ? idx + 1 : idx - 1;
        [records[idx], records[j]] = [records[j], records[idx]];
        mutation = `Swapped the storage order of records #${records[j].sequence_number} and #${records[idx].sequence_number}.`;
        break;
      }
      case 'seal_root': {
        if (seals.length === 0) throw new WormError(409, 'No seals exist yet; create a seal before simulating seal tampering.');
        seals[0].merkle_root = sha256Hex(`forged-root:${seals[0].merkle_root}`);
        mutation = `Forged the Merkle root of seal ${seals[0].id}.`;
        break;
      }
    }

    const verifier = new LedgerVerifier();
    for (const r of records) verifier.consume(r);
    verifier.verifySeals(seals);
    return { ...verifier.report(startedAt, true), mutation };
  }

  // =========================================================================
  // 5. LEGAL HOLDS
  // =========================================================================

  async listLegalHolds(status?: string): Promise<WormLegalHold[]> {
    const q = db('worm_legal_holds').orderBy('created_at', 'desc');
    if (status === 'active' || status === 'released') q.where({ status });
    return (await q).map(mapHold);
  }

  async getActiveHoldsForTenant(tenantId: string | null | undefined): Promise<WormLegalHold[]> {
    const rows = await db('worm_legal_holds')
      .where({ status: 'active' })
      .andWhere((q) => {
        q.whereNull('tenant_id');
        if (tenantId) q.orWhere('tenant_id', tenantId);
      });
    return rows.map(mapHold);
  }

  async createLegalHold(dto: CreateWormLegalHoldDto, actor: Actor): Promise<WormLegalHold> {
    const matterReference = String(dto?.matterReference || '').trim();
    const title = String(dto?.title || '').trim();
    if (matterReference.length < 3) throw new WormError(400, 'matterReference (min 3 characters) is required.');
    if (title.length < 3) throw new WormError(400, 'title (min 3 characters) is required.');
    if (dto.custodianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.custodianEmail)) throw new WormError(400, 'custodianEmail is not a valid email address.');

    const tenantId = dto.tenantId ? String(dto.tenantId) : null;
    if (tenantId && !(await db('tenants').where({ id: tenantId }).first())) throw new WormError(404, `Tenant ${tenantId} not found.`);

    const row = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      matter_reference: matterReference.slice(0, 128),
      title: title.slice(0, 255),
      description: dto.description?.trim() || null,
      custodian_email: dto.custodianEmail?.trim() || null,
      status: 'active',
      placed_by: actor.email,
      created_at: new Date(),
    };
    await db('worm_legal_holds').insert(row);
    await this.audit(actor, 'worm_legal_hold_placed', row.id, { matterReference: row.matter_reference, title: row.title, scope: tenantId ? 'tenant' : 'platform' }, undefined, tenantId);
    return mapHold(row);
  }

  async releaseLegalHold(id: string, dto: ReleaseWormLegalHoldDto, actor: Actor): Promise<WormLegalHold> {
    const reason = String(dto?.reason || '').trim();
    if (reason.length < 8) throw new WormError(400, 'A release justification of at least 8 characters is required.');
    const hold = await db('worm_legal_holds').where({ id }).first();
    if (!hold) throw new WormError(404, 'Legal hold not found.');
    if (hold.status !== 'active') throw new WormError(409, 'Legal hold has already been released.');

    await db('worm_legal_holds').where({ id }).update({
      status: 'released',
      released_by: actor.email,
      release_reason: reason.slice(0, 512),
      released_at: new Date(),
    });
    await this.audit(actor, 'worm_legal_hold_released', id, { matterReference: hold.matter_reference }, reason, hold.tenant_id);
    return mapHold(await db('worm_legal_holds').where({ id }).first());
  }

  // =========================================================================
  // 6. EXTERNAL VERIFIER ACCESS TOKENS
  // =========================================================================

  async listVerificationTokens(): Promise<WormVerificationToken[]> {
    return (await db('worm_verification_tokens').orderBy('created_at', 'desc')).map(mapToken);
  }

  async issueVerificationToken(dto: IssueWormVerificationTokenDto, actor: Actor): Promise<IssuedWormVerificationToken> {
    const label = String(dto?.label || '').trim();
    const auditorEmail = String(dto?.auditorEmail || '').trim();
    if (label.length < 3) throw new WormError(400, 'label (min 3 characters) is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(auditorEmail)) throw new WormError(400, 'A valid auditorEmail is required.');
    const days = Math.min(Math.max(Number(dto.expiresInDays) || 30, 1), 365);

    const token = `wvt_${crypto.randomBytes(24).toString('base64url')}`;
    const row = {
      id: crypto.randomUUID(),
      token_hash: sha256Hex(token),
      token_prefix: token.slice(0, 12),
      label: label.slice(0, 255),
      auditor_email: auditorEmail,
      auditor_organization: dto.auditorOrganization?.trim() || null,
      expires_at: new Date(Date.now() + days * 86400000),
      revoked: false,
      access_count: 0,
      created_by: actor.email,
      created_at: new Date(),
    };
    await db('worm_verification_tokens').insert(row);
    // Only the non-secret prefix is ever written to the audit trail.
    await this.audit(actor, 'worm_verification_token_issued', row.id, { label: row.label, auditorEmail, tokenPrefix: row.token_prefix, expiresInDays: days });
    return { ...mapToken(row), token };
  }

  async revokeVerificationToken(id: string, actor: Actor): Promise<WormVerificationToken> {
    const row = await db('worm_verification_tokens').where({ id }).first();
    if (!row) throw new WormError(404, 'Verification token not found.');
    if (!row.revoked) {
      await db('worm_verification_tokens').where({ id }).update({ revoked: true });
      await this.audit(actor, 'worm_verification_token_revoked', id, { label: row.label, tokenPrefix: row.token_prefix });
    }
    return mapToken(await db('worm_verification_tokens').where({ id }).first());
  }

  async logVerificationEvent(evt: { tokenId: string | null; endpoint: string; result: 'valid' | 'invalid' | 'denied'; sealId?: string | null; ipAddress?: string | null; details?: Record<string, any> }) {
    await db('worm_verification_events').insert({
      id: crypto.randomUUID(),
      token_id: evt.tokenId,
      endpoint: evt.endpoint.slice(0, 128),
      result: evt.result,
      seal_id: evt.sealId ?? null,
      ip_address: evt.ipAddress ? evt.ipAddress.slice(0, 64) : null,
      details: evt.details ? JSON.stringify(evt.details) : null,
      created_at: new Date(),
    });
  }

  /** Validates an external verifier token. Returns the token id or throws 401/403 (and logs the denial). */
  async authenticateVerificationToken(token: string | undefined, endpoint: string, ipAddress: string | null): Promise<string> {
    if (!token || !token.startsWith('wvt_') || token.length > 128) {
      await this.logVerificationEvent({ tokenId: null, endpoint, result: 'denied', ipAddress, details: { reason: 'missing_or_malformed_token' } });
      throw new WormError(401, 'A valid X-Verification-Token header is required.');
    }
    const row = await db('worm_verification_tokens').where({ token_hash: sha256Hex(token) }).first();
    if (!row) {
      await this.logVerificationEvent({ tokenId: null, endpoint, result: 'denied', ipAddress, details: { reason: 'unknown_token' } });
      throw new WormError(401, 'Verification token is not recognized.');
    }
    if (row.revoked) {
      await this.logVerificationEvent({ tokenId: row.id, endpoint, result: 'denied', ipAddress, details: { reason: 'revoked' } });
      throw new WormError(403, 'Verification token has been revoked.');
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await this.logVerificationEvent({ tokenId: row.id, endpoint, result: 'denied', ipAddress, details: { reason: 'expired' } });
      throw new WormError(403, 'Verification token has expired.');
    }
    await db('worm_verification_tokens').where({ id: row.id }).update({ access_count: db.raw('access_count + 1'), last_accessed_at: new Date() });
    return row.id;
  }

  async listVerificationEvents(limit = 100): Promise<WormVerificationEvent[]> {
    const rows = await db('worm_verification_events').orderBy('created_at', 'desc').limit(Math.min(Math.max(limit, 1), 500));
    return rows.map((r: any) => ({
      id: r.id,
      tokenId: r.token_id ?? null,
      endpoint: r.endpoint,
      result: r.result,
      sealId: r.seal_id ?? null,
      ipAddress: r.ip_address ?? null,
      details: typeof r.details === 'string' ? JSON.parse(r.details) : r.details ?? null,
      createdAt: iso(r.created_at),
    }));
  }

  // =========================================================================
  // 7. OVERVIEW TELEMETRY
  // =========================================================================

  async getOverview(): Promise<WormVaultOverview & { lastVerification: WormVerificationReport | null }> {
    const [head, totalRow, sealCountRow, lastSeal, holdsRow, tokensRow, eventsRow, sourceRows, triggers] = await Promise.all([
      this.getChainHead(),
      db('worm_vault_records').count({ n: '*' }).first(),
      db('worm_daily_seals').count({ n: '*' }).first(),
      db('worm_daily_seals').orderBy('last_sequence', 'desc').first(),
      db('worm_legal_holds').where({ status: 'active' }).count({ n: '*' }).first(),
      db('worm_verification_tokens').where({ revoked: false }).andWhere('expires_at', '>', new Date()).count({ n: '*' }).first(),
      db('worm_verification_events').where('created_at', '>', new Date(Date.now() - 86400000)).count({ n: '*' }).first(),
      db('worm_vault_records').select('source_table').count({ n: '*' }).groupBy('source_table'),
      db.raw(
        `SELECT EVENT_OBJECT_TABLE AS tbl, EVENT_MANIPULATION AS evt FROM information_schema.TRIGGERS
         WHERE TRIGGER_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE IN ('worm_vault_records', 'worm_daily_seals')`
      ),
    ]);

    const sourceBreakdown = { superadmin_audit_logs: 0, governance_audit_logs: 0, publishing_audit_logs: 0 } as Record<WormSourceTable, number>;
    for (const r of sourceRows as any[]) sourceBreakdown[r.source_table as WormSourceTable] = Number(r.n);

    let pendingSourceRecords = 0;
    for (const table of SOURCE_TABLES) {
      if (!(await db.schema.hasTable(table))) continue;
      const n = Number((await db(table).count({ n: '*' }).first())?.n || 0);
      pendingSourceRecords += Math.max(0, n - sourceBreakdown[table]);
    }

    const triggerRows: any[] = Array.isArray(triggers) ? triggers[0] : [];
    const has = (tbl: string, evt: string) => triggerRows.some((t) => t.tbl === tbl && t.evt === evt);
    const lastSealed = lastSeal ? Number(lastSeal.last_sequence) : 0;

    return {
      totalRecords: Number(totalRow?.n || 0),
      chainHeadSequence: head.sequence,
      chainHeadHash: head.hash,
      totalSeals: Number(sealCountRow?.n || 0),
      lastSealAt: lastSeal ? iso(lastSeal.created_at) : null,
      lastSealDate: lastSeal ? lastSeal.seal_date : null,
      unsealedRecords: Math.max(0, head.sequence - lastSealed),
      pendingSourceRecords,
      activeLegalHolds: Number(holdsRow?.n || 0),
      activeVerificationTokens: Number(tokensRow?.n || 0),
      externalVerifications24h: Number(eventsRow?.n || 0),
      sourceBreakdown,
      signingKey: this.getSigningKeyInfo(),
      wormEnforcement: {
        recordsTriggers: has('worm_vault_records', 'UPDATE') && has('worm_vault_records', 'DELETE'),
        sealsTriggers: has('worm_daily_seals', 'UPDATE') && has('worm_daily_seals', 'DELETE'),
      },
      lastVerification: this.lastVerification,
    };
  }

  // =========================================================================
  // 8. AUTOMATED DAILY SEALING (invoked by WormSealScheduler)
  // =========================================================================

  async runScheduledCycle(): Promise<{ ingested: number; sealed: boolean }> {
    const system: Actor = { id: SYSTEM_ACTOR_ID, email: 'system:worm-scheduler' };
    const { ingested } = await this.ingest();
    const lastSeal = await db('worm_daily_seals').orderBy('last_sequence', 'desc').first();
    const today = new Date().toISOString().slice(0, 10);
    const head = await this.getChainHead();
    const hasUnsealed = head.sequence > (lastSeal ? Number(lastSeal.last_sequence) : 0);
    if (hasUnsealed && (!lastSeal || lastSeal.seal_date !== today)) {
      await this.createSeal(system);
      return { ingested, sealed: true };
    }
    return { ingested, sealed: false };
  }
}

export const wormVaultService = new WormVaultService();

/** Lightweight in-process scheduler guaranteeing at least one seal per UTC day while records exist. */
export class WormSealScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static running = false;

  static start(intervalMs = 15 * 60 * 1000) {
    if (process.env.WORM_AUTO_SEAL_DISABLED === 'true' || this.timer) return;
    const tick = async () => {
      if (this.running) return;
      this.running = true;
      try {
        const result = await wormVaultService.runScheduledCycle();
        if (result.sealed || result.ingested > 0) {
          console.log(`[WORM Vault] Scheduled cycle: ingested=${result.ingested} sealed=${result.sealed}`);
        }
      } catch (err: any) {
        console.error('[WORM Vault] Scheduled cycle failed:', err?.message || err);
      } finally {
        this.running = false;
      }
    };
    setTimeout(tick, 30_000).unref();
    this.timer = setInterval(tick, intervalMs);
    this.timer.unref();
  }

  static stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
