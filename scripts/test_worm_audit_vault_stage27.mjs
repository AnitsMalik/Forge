/**
 * Stage 27: Immutable WORM Audit Vault & Cryptographic Tamper-Evidence Suite
 * SocialForge Platform v4.5.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only security (401 / 403) on vault administration
 * 3. Database-level WORM enforcement (UPDATE / DELETE rejected by triggers on records and seals)
 * 4. Idempotent, hash-chained ingestion from source audit tables (no duplicates, no secrets)
 * 5. Independent client-side recomputation of payload hashes and chain links
 * 6. Ed25519-signed Merkle daily seals (independently re-verified with the public key)
 * 7. Full ledger verification + in-memory tamper simulation (payload / delete / reorder / forged seal)
 * 8. Merkle inclusion proofs (valid proof accepted, forged proof rejected)
 * 9. Legal holds block compliance purges until released with justification
 * 10. External legal verification portal: hashed expiring tokens, revocation, access logging
 * 11. Immutable superadmin audit trail for all vault mutations
 */

import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const META_LOCK_REMOTE_POST_ID = '1405588742634526_122100337179498315';
const META_LOCK_JOB_ID = '256cf21a-26cd-4032-a7b8-17261d8a81b1';
const GENESIS = '0'.repeat(64);

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function verifyMetaLock(connection, stepDescription) {
  const [variants] = await connection.execute('SELECT id, status FROM post_variants WHERE remote_post_id = ?', [META_LOCK_REMOTE_POST_ID]);
  assert(variants.length === 1, `[${stepDescription}] Production Meta variant exists.`);
  assert(variants[0].status === 'published', `[${stepDescription}] Production Meta variant status is strictly 'published'.`);
  const [jobs] = await connection.execute('SELECT id, status FROM publishing_jobs WHERE id = ?', [META_LOCK_JOB_ID]);
  assert(jobs.length === 1, `[${stepDescription}] Production Meta publishing job exists.`);
  assert(jobs[0].status === 'published', `[${stepDescription}] Production Meta publishing job status is strictly 'published'.`);
}

// ---------------------------------------------------------------------------
// Independent re-implementation of the vault cryptography (does not import server code)
// ---------------------------------------------------------------------------
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function chainHash(r, previousHash, payloadHash) {
  return sha256(
    ['worm-chain-v1', previousHash, String(r.sequence_number), r.source_table, r.source_record_id, r.tenant_id ?? '', r.event_action, r.actor_id ?? '', payloadHash].join('|')
  );
}

const leafHash = (hex) => crypto.createHash('sha256').update(Buffer.from([0])).update(Buffer.from(hex, 'hex')).digest('hex');
const nodeHash = (l, r) =>
  crypto.createHash('sha256').update(Buffer.from([1])).update(Buffer.from(l, 'hex')).update(Buffer.from(r, 'hex')).digest('hex');

function merkleRoot(chainHashes) {
  let level = chainHashes.map(leafHash);
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return level[0];
}

function verifyProof(leaf, proof, root) {
  let h = leaf;
  for (const step of proof) h = step.position === 'right' ? nodeHash(h, step.hash) : nodeHash(step.hash, h);
  return h === root;
}

function sealHash(s) {
  const fields = {
    algorithm: 'Ed25519',
    chainHeadHash: s.chainHeadHash,
    firstSequence: s.firstSequence,
    lastSequence: s.lastSequence,
    merkleRoot: s.merkleRoot,
    previousSealHash: s.previousSealHash,
    recordCount: s.recordCount,
    sealDate: s.sealDate,
    signingKeyId: s.signingKeyId,
    version: 'worm-seal-v1',
  };
  return sha256(JSON.stringify(fields)); // keys already sorted; flat object => identical to canonical JSON
}

async function expectSqlRejected(connection, sql, params, label) {
  let error = null;
  try {
    await connection.execute(sql, params);
  } catch (err) {
    error = err;
  }
  assert(error !== null && /WORM_VIOLATION/.test(error.message), `${label} rejected by database trigger (WORM_VIOLATION).`);
}

async function main() {
  console.log('========================================================================');
  console.log('  STAGE 27: IMMUTABLE WORM AUDIT VAULT & CRYPTOGRAPHIC TAMPER-EVIDENCE   ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);
  const createdHoldIds = [];
  const createdTokenIds = [];
  let superadminToken = null;

  try {
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Pre-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Pre-Test Invariant');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Auth Tokens & Security Safeguards ---');
    const [superadmins] = await connection.execute('SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1');
    assert(superadmins.length > 0, 'Active superadmin user located in database.');
    const superadmin = superadmins[0];
    const [members] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Regular tenant user located.');
    const member = members[0];
    const targetTenantId = member.tenant_id;

    superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, isSuperAdmin: true, tenantId: targetTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const memberToken = jwt.sign(
      { userId: member.id, email: member.email, isSuperadmin: false, isSuperAdmin: false, tenantId: targetTenantId, role: member.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const auth = { Authorization: `Bearer ${superadminToken}` };

    const unauthVault = await request('/admin/operations/worm/overview');
    assert(unauthVault.status === 401, `Unauthenticated vault request rejected with HTTP 401 (got ${unauthVault.status}: ${JSON.stringify(unauthVault.data)}).`);
    const nonAdminVault = await request('/admin/operations/worm/overview', { headers: { Authorization: `Bearer ${memberToken}` } });
    assert(nonAdminVault.status === 403, `Non-superadmin vault request rejected with HTTP 403 (got ${nonAdminVault.status}: ${JSON.stringify(nonAdminVault.data)}).`);

    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Overview & WORM Enforcement Telemetry ---');
    const ov0 = await request('/admin/operations/worm/overview', { headers: auth });
    assert(ov0.status === 200 && ov0.data?.success === true, 'Vault overview returned HTTP 200.');
    assert(ov0.data.data.wormEnforcement.recordsTriggers === true, 'UPDATE/DELETE triggers active on worm_vault_records.');
    assert(ov0.data.data.wormEnforcement.sealsTriggers === true, 'UPDATE/DELETE triggers active on worm_daily_seals.');
    assert(ov0.data.data.signingKey.algorithm === 'Ed25519' && /^[0-9a-f]{16}$/.test(ov0.data.data.signingKey.keyId), 'Ed25519 signing key exposed with 16-hex key id.');
    assert(!JSON.stringify(ov0.data.data).includes('PRIVATE KEY'), 'Overview never exposes private key material.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Hash-Chained Ingestion & Idempotency ---');
    const ing1 = await request('/admin/operations/worm/ingest', { method: 'POST', headers: auth, body: '{}' });
    assert(ing1.status === 200 && typeof ing1.data?.data?.ingested === 'number', `First ingestion succeeded (ingested ${ing1.data?.data?.ingested}).`);
    const ing2 = await request('/admin/operations/worm/ingest', { method: 'POST', headers: auth, body: '{}' });
    assert(ing2.status === 200 && ing2.data.data.ingested <= 1, `Re-ingestion is idempotent (only ${ing2.data.data.ingested} new event(s): the prior ingestion's own audit entry).`);

    const [[dupRow]] = await connection.query(
      'SELECT COUNT(*) AS n FROM (SELECT source_table, source_record_id FROM worm_vault_records GROUP BY 1, 2 HAVING COUNT(*) > 1) d'
    );
    assert(Number(dupRow.n) === 0, 'No source audit event was ingested twice.');

    const [[srcCount]] = await connection.query('SELECT COUNT(*) AS n FROM superadmin_audit_logs');
    const [[vaultSrcCount]] = await connection.query("SELECT COUNT(*) AS n FROM worm_vault_records WHERE source_table = 'superadmin_audit_logs'");
    assert(Number(srcCount.n) - Number(vaultSrcCount.n) <= 1, `Vault mirrors superadmin audit log (${vaultSrcCount.n}/${srcCount.n}).`);

    const [[secretLeak]] = await connection.query('SELECT COUNT(*) AS n FROM worm_vault_records WHERE payload_canonical LIKE ?', [`%${JWT_SECRET}%`]);
    assert(Number(secretLeak.n) === 0, 'No platform secrets present in immutable vault payloads.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Independent Hash-Chain Recomputation ---');
    const [allRecords] = await connection.query('SELECT * FROM worm_vault_records ORDER BY sequence_number ASC');
    assert(allRecords.length >= 2, `Vault contains ${allRecords.length} chained records.`);
    let prev = GENESIS;
    let chainOk = true;
    let contiguous = true;
    allRecords.forEach((r, i) => {
      if (Number(r.sequence_number) !== i + 1) contiguous = false;
      const ph = sha256(r.payload_canonical);
      if (ph !== r.payload_hash || r.previous_hash !== prev || chainHash(r, prev, ph) !== r.chain_hash) chainOk = false;
      prev = r.chain_hash;
    });
    assert(contiguous, 'Sequence numbers are gap-free from #1.');
    assert(chainOk, 'Every payload hash and chain link independently recomputed and matched.');

    const recRes = await request(`/admin/operations/worm/records?limit=5`, { headers: auth });
    assert(recRes.status === 200 && recRes.data.data.records.length > 0 && Math.abs(recRes.data.data.total - allRecords.length) <= 5, `Records listing paginated with accurate total (${recRes?.data?.data?.total} vs ${allRecords.length}).`);
    assert(recRes.data.data.records[0].payloadCanonical === undefined, 'List view omits raw payloads.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Database-Level WORM Enforcement ---');
    const victim = allRecords[0];
    await expectSqlRejected(connection, 'UPDATE worm_vault_records SET event_action = ? WHERE id = ?', ['forged_action', victim.id], 'Direct UPDATE of vault record');
    await expectSqlRejected(connection, 'DELETE FROM worm_vault_records WHERE id = ?', [victim.id], 'Direct DELETE of vault record');
    const [[victimAfter]] = await connection.query('SELECT event_action, chain_hash FROM worm_vault_records WHERE id = ?', [victim.id]);
    assert(victimAfter.event_action === victim.event_action && victimAfter.chain_hash === victim.chain_hash, 'Vault record unchanged after blocked mutation attempts.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Legal Hold Placement & Purge Blocking ---');
    const badHold = await request('/admin/operations/worm/legal-holds', { method: 'POST', headers: auth, body: JSON.stringify({ matterReference: 'x', title: 'y' }) });
    assert(badHold.status === 400, 'Legal hold with invalid matter reference rejected with HTTP 400.');

    const matterRef = `LIT-S27-${Date.now()}`;
    const holdRes = await request('/admin/operations/worm/legal-holds', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        tenantId: targetTenantId,
        matterReference: matterRef,
        title: 'Stage 27 Litigation Preservation',
        description: 'Preserve all audit evidence pending litigation.',
        custodianEmail: 'legal@socialforge.ai',
      }),
    });
    assert(holdRes.status === 201 && holdRes.data.data.status === 'active', 'Tenant-scoped legal hold placed (HTTP 201, active).');
    const hold = holdRes.data.data;
    createdHoldIds.push(hold.id);

    const blockedPurge = await request('/admin/operations/compliance/purge', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ targetTenantId, dataCategory: 'analytics_telemetry', reason: 'Stage 27 purge attempt under hold', confirmation: true }),
    });
    assert(blockedPurge.status === 400 && /LEGAL_HOLD_ACTIVE/.test(blockedPurge.data?.error || ''), 'Compliance purge BLOCKED while legal hold is active.');

    const shortRelease = await request(`/admin/operations/worm/legal-holds/${hold.id}/release`, { method: 'POST', headers: auth, body: JSON.stringify({ reason: 'short' }) });
    assert(shortRelease.status === 400, `Release without adequate justification rejected with HTTP 400 (got ${shortRelease.status}: ${JSON.stringify(shortRelease.data)}).`);

    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Ed25519-Signed Merkle Daily Seal ---');
    await request('/admin/operations/worm/ingest', { method: 'POST', headers: auth, body: '{}' }); // capture the hold events
    const [prevSealRows] = await connection.query('SELECT seal_hash FROM worm_daily_seals ORDER BY last_sequence DESC LIMIT 1');
    const prevSealRow = prevSealRows[0];
    const sealRes = await request('/admin/operations/worm/seals', { method: 'POST', headers: auth, body: '{}' });
    assert(sealRes.status === 201, 'Daily seal created with HTTP 201.');
    const seal = sealRes.data.data;
    assert(seal.recordCount === seal.lastSequence - seal.firstSequence + 1 && seal.recordCount >= 1, `Seal covers contiguous range #${seal.firstSequence}-#${seal.lastSequence}.`);
    assert(seal.previousSealHash === (prevSealRow ? prevSealRow.seal_hash : GENESIS), 'Seal is chained to the preceding seal hash.');

    const repeatSeal = await request('/admin/operations/worm/seals', { method: 'POST', headers: auth, body: '{}' });
    assert(repeatSeal.status === 409, 'Re-sealing with no new records rejected with HTTP 409.');

    const [rangeRows] = await connection.query('SELECT chain_hash FROM worm_vault_records WHERE sequence_number BETWEEN ? AND ? ORDER BY sequence_number', [seal.firstSequence, seal.lastSequence]);
    assert(merkleRoot(rangeRows.map((r) => r.chain_hash)) === seal.merkleRoot, 'Merkle root independently recomputed and matched.');
    assert(sealHash(seal) === seal.sealHash, 'Seal hash independently recomputed and matched.');

    const pk = await request('/public/worm-verify/public-key');
    assert(pk.status === 200 && pk.data.data.publicKeyPem.includes('BEGIN PUBLIC KEY'), 'Public signing key available without credentials.');
    const publicKey = crypto.createPublicKey(pk.data.data.publicKeyPem);
    assert(crypto.verify(null, Buffer.from(seal.sealHash, 'utf8'), publicKey, Buffer.from(seal.signature, 'base64')), 'Ed25519 seal signature independently verified with the public key.');
    assert(!crypto.verify(null, Buffer.from(sha256('forged'), 'utf8'), publicKey, Buffer.from(seal.signature, 'base64')), 'Signature does not validate a forged seal hash.');

    await expectSqlRejected(connection, 'UPDATE worm_daily_seals SET merkle_root = ? WHERE id = ?', [GENESIS, seal.id], 'Direct UPDATE of daily seal');
    await expectSqlRejected(connection, 'DELETE FROM worm_daily_seals WHERE id = ?', [seal.id], 'Direct DELETE of daily seal');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Full Ledger Verification ---');
    const verify = await request('/admin/operations/worm/verify', { method: 'POST', headers: auth, body: '{}' });
    assert(verify.status === 200 && verify.data.data.verified === true && verify.data.data.issues.length === 0, 'Full ledger verified: zero integrity issues.');
    assert(verify.data.data.recordsChecked >= seal.lastSequence && verify.data.data.sealsChecked >= 1, `Verifier checked ${verify.data.data.recordsChecked} records and ${verify.data.data.sealsChecked} seal(s).`);

    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: In-Memory Tamper Simulation ---');
    const sim = async (body) => request('/admin/operations/worm/verify/simulate-tamper', { method: 'POST', headers: auth, body: JSON.stringify(body) });
    const target = seal.recordCount > 1 ? seal.firstSequence : (allRecords.length > 2 ? 2 : seal.firstSequence);

    const simPayload = await sim({ mode: 'payload', sequenceNumber: target });
    assert(simPayload.data.data.tamperDetected && simPayload.data.data.issues.some((i) => i.type === 'payload_hash_mismatch' && i.sequenceNumber === target), `Payload tampering at #${target} detected.`);
    assert(simPayload.data.data.issues.some((i) => i.type === 'merkle_root_mismatch' || i.type === 'chain_hash_mismatch'), 'Payload tampering also invalidates chain/Merkle commitments.');

    const simDelete = await sim({ mode: 'delete', sequenceNumber: target });
    assert(simDelete.data.data.tamperDetected && simDelete.data.data.issues.some((i) => i.type === 'sequence_gap'), 'Silent record deletion detected (sequence gap).');
    assert(simDelete.data.data.issues.some((i) => i.type === 'chain_link_broken'), 'Silent deletion breaks the hash chain link.');

    const simReorder = await sim({ mode: 'reorder', sequenceNumber: target });
    assert(simReorder.data.data.tamperDetected && simReorder.data.data.issues.some((i) => i.type === 'sequence_gap' || i.type === 'chain_link_broken'), 'Record reordering detected.');

    const simSeal = await sim({ mode: 'seal_root' });
    const sealIssueTypes = simSeal.data.data.issues.map((i) => i.type);
    assert(simSeal.data.data.tamperDetected && sealIssueTypes.includes('seal_hash_mismatch') && sealIssueTypes.includes('merkle_root_mismatch'), 'Forged seal Merkle root detected.');

    assert((await sim({ mode: 'nuke' })).status === 400, 'Unknown simulation mode rejected with HTTP 400.');
    const verifyAfterSim = await request('/admin/operations/worm/verify', { method: 'POST', headers: auth, body: '{}' });
    assert(verifyAfterSim.data.data.verified === true, 'Simulations never mutate stored evidence (ledger still verifies).');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Merkle Inclusion Proofs ---');
    const recDetail = await request(`/admin/operations/worm/records/${target}`, { headers: auth });
    assert(recDetail.status === 200 && typeof recDetail.data.data.record.payloadCanonical === 'string', 'Record detail returns canonical payload.');
    const proof = recDetail.data.data.proof;
    assert(proof && proof.leafHash === leafHash(proof.chainHash), 'Inclusion proof leaf derived from record chain hash.');
    assert(verifyProof(proof.leafHash, proof.proof, proof.seal.merkleRoot), 'Inclusion proof independently verified against the signed seal root.');
    const forgedProof = proof.proof.length
      ? proof.proof.map((s, i) => (i === 0 ? { ...s, hash: sha256('forged') } : s))
      : [{ position: 'right', hash: sha256('forged') }];
    assert(!verifyProof(proof.leafHash, forgedProof, proof.seal.merkleRoot), 'Forged inclusion proof fails verification.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: External Legal Verification Portal ---');
    assert((await request('/public/worm-verify/seals')).status === 401, 'Portal rejects requests without a verifier token (401).');
    assert((await request('/public/worm-verify/seals', { headers: { 'X-Verification-Token': 'wvt_bogus_token_value' } })).status === 401, 'Portal rejects unknown verifier token (401).');

    const badToken = await request('/admin/operations/worm/verification-tokens', { method: 'POST', headers: auth, body: JSON.stringify({ label: 'Bad', auditorEmail: 'not-an-email' }) });
    assert(badToken.status === 400, 'Verifier token with invalid auditor email rejected (400).');

    const issued = await request('/admin/operations/worm/verification-tokens', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ label: 'Stage 27 External Counsel', auditorEmail: 'auditor@lawfirm.example', auditorOrganization: 'Example LLP', expiresInDays: 7 }),
    });
    assert(issued.status === 201 && /^wvt_[A-Za-z0-9_-]{32}$/.test(issued.data.data.token), 'Verifier token issued once with wvt_ prefix (HTTP 201).');
    const verifierToken = issued.data.data.token;
    const tokenId = issued.data.data.id;
    createdTokenIds.push(tokenId);

    const [[tokRow]] = await connection.query('SELECT * FROM worm_verification_tokens WHERE id = ?', [tokenId]);
    assert(tokRow.token_hash === sha256(verifierToken), 'Only the SHA-256 hash of the verifier token is stored.');
    assert(!Object.values(tokRow).some((v) => String(v) === verifierToken), 'Plaintext verifier token is not persisted in any column.');
    const [[tokAudit]] = await connection.query("SELECT COUNT(*) AS n FROM superadmin_audit_logs WHERE details LIKE ?", [`%${verifierToken}%`]);
    assert(Number(tokAudit.n) === 0, 'Plaintext verifier token never written to the audit trail.');
    const tokList = await request('/admin/operations/worm/verification-tokens', { headers: auth });
    assert(tokList.data.data.every((t) => t.token === undefined), 'Token listing never re-exposes plaintext tokens.');

    const vh = { 'X-Verification-Token': verifierToken };
    const pSeals = await request('/public/worm-verify/seals', { headers: vh });
    assert(pSeals.status === 200 && pSeals.data.data.some((s) => s.id === seal.id), 'Verifier lists signed seals.');
    const pVerify = await request(`/public/worm-verify/seals/${seal.id}/verify`, { headers: vh });
    const pv = pVerify.data.data;
    assert(pVerify.status === 200 && pv.verified && pv.signatureValid && pv.merkleRootValid && pv.chainHeadValid && pv.previousSealLinkValid, 'Verifier confirms seal signature, Merkle root, chain head and seal linkage.');
    const pProof = await request(`/public/worm-verify/records/${target}/proof`, { headers: vh });
    assert(pProof.status === 200 && pProof.data.data.payloadCanonical === undefined && pProof.data.data.record === undefined, 'Verifier receives inclusion proof without any record payload.');
    const pProofCheck = await request('/public/worm-verify/proof/verify', {
      method: 'POST',
      headers: vh,
      body: JSON.stringify({ leafHash: pProof.data.data.leafHash, proof: pProof.data.data.proof, merkleRoot: pProof.data.data.merkleRoot }),
    });
    assert(pProofCheck.data.data.valid === true, 'Portal stateless proof check accepts a genuine proof.');
    const pForged = await request('/public/worm-verify/proof/verify', {
      method: 'POST',
      headers: vh,
      body: JSON.stringify({ leafHash: pProof.data.data.leafHash, proof: forgedProof, merkleRoot: pProof.data.data.merkleRoot }),
    });
    assert(pForged.data.data.valid === false, 'Portal stateless proof check rejects a forged proof.');

    const revoke = await request(`/admin/operations/worm/verification-tokens/${tokenId}/revoke`, { method: 'POST', headers: auth, body: '{}' });
    assert(revoke.status === 200 && revoke.data.data.revoked === true, 'Verifier token revoked.');
    assert((await request('/public/worm-verify/seals', { headers: vh })).status === 403, 'Revoked verifier token denied (403).');

    const [[tokAfter]] = await connection.query('SELECT access_count FROM worm_verification_tokens WHERE id = ?', [tokenId]);
    assert(Number(tokAfter.access_count) >= 5, `Token access counter recorded ${tokAfter.access_count} authorized calls.`);
    const events = await request('/admin/operations/worm/verification-events', { headers: auth });
    const myEvents = events.data.data.filter((e) => e.tokenId === tokenId);
    assert(myEvents.some((e) => e.result === 'valid') && myEvents.some((e) => e.result === 'invalid') && myEvents.some((e) => e.result === 'denied'), 'Verification events log valid, invalid and denied outcomes.');

    // -------------------------------------------------------------------------
    console.log('\n--- Step 13: Legal Hold Release Unblocks Purge ---');
    const release = await request(`/admin/operations/worm/legal-holds/${hold.id}/release`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ reason: 'Stage 27 litigation concluded; preservation no longer required' }),
    });
    assert(release.status === 200 && release.data.data.status === 'released' && release.data.data.releasedBy === superadmin.email, 'Legal hold released with justification and releasing actor recorded.');
    createdHoldIds.splice(createdHoldIds.indexOf(hold.id), 1);
    const reRelease = await request(`/admin/operations/worm/legal-holds/${hold.id}/release`, { method: 'POST', headers: auth, body: JSON.stringify({ reason: 'Second release attempt' }) });
    assert(reRelease.status === 409, 'Double release rejected with HTTP 409.');
    const [[otherHolds]] = await connection.query("SELECT COUNT(*) AS n FROM worm_legal_holds WHERE status = 'active' AND (tenant_id IS NULL OR tenant_id = ?)", [targetTenantId]);
    if (Number(otherHolds.n) === 0) {
      const allowedPurge = await request('/admin/operations/compliance/purge', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ targetTenantId, dataCategory: 'analytics_telemetry', reason: 'Stage 27 purge after hold release', confirmation: true }),
      });
      assert(allowedPurge.status === 200, 'Compliance purge permitted once no legal hold applies.');
    }

    // -------------------------------------------------------------------------
    console.log('\n--- Step 14: Immutable Superadmin Audit Trail ---');
    const [auditRows] = await connection.query(
      `SELECT DISTINCT action FROM superadmin_audit_logs WHERE superadmin_id = ? AND action IN
       ('worm_vault_ingestion','worm_daily_seal_created','worm_vault_verified','worm_legal_hold_placed','worm_legal_hold_released','worm_verification_token_issued','worm_verification_token_revoked')`,
      [superadmin.id]
    );
    const actions = auditRows.map((r) => r.action);
    for (const a of ['worm_daily_seal_created', 'worm_vault_verified', 'worm_legal_hold_placed', 'worm_legal_hold_released', 'worm_verification_token_issued', 'worm_verification_token_revoked']) {
      assert(actions.includes(a), `Audit trail contains ${a}.`);
    }

    // -------------------------------------------------------------------------
    console.log('\n--- Step 15: Post-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Post-Test Invariant');

    console.log('\n========================================================================');
    console.log(`   STAGE 27 TEST SUITE PASSED: ${passedTests} passed, ${failedTests} failed.`);
    console.log('   Immutable WORM Audit Vault & Tamper-Evidence 100% OPERATIONAL');
    console.log('========================================================================\n');
  } finally {
    // Never leave test holds active (they would block other suites' purges) or test tokens usable.
    if (superadminToken) {
      const auth = { Authorization: `Bearer ${superadminToken}` };
      for (const id of createdHoldIds) {
        await request(`/admin/operations/worm/legal-holds/${id}/release`, { method: 'POST', headers: auth, body: JSON.stringify({ reason: 'Stage 27 cleanup after failed run' }) }).catch(() => {});
      }
      for (const id of createdTokenIds) {
        await request(`/admin/operations/worm/verification-tokens/${id}/revoke`, { method: 'POST', headers: auth, body: '{}' }).catch(() => {});
      }
    }
    await connection.end();
  }
}

main().catch((err) => {
  console.error('\nStage 27 Suite Error:', err);
  process.exit(1);
});
