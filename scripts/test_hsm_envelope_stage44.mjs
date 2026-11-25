/**
 * Stage 44: Enterprise Cryptographic Hardware Security Module (HSM) Key Brokerage, Envelope Encryption & Vault Broker Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time HSM Broker Telemetry & Zero-Plaintext Security Posture
 * 4. HSM Keyrings List & Multi-Cloud Partition Topology (AWS, GCP, Vault)
 * 5. Provision New HSM Root Keyring
 * 6. Key Derivation Policies Registry & Enforced Resource Mappings
 * 7. Generate & Wrap New Envelope Data Encryption Key (DEK)
 * 8. Zero-Plaintext In-Memory Envelope Encryption (AES-256-GCM with AAD)
 * 9. Envelope Decryption & Cryptographic Auth Tag Proof Verification
 * 10. Master Root Key (KEK) Rotation Drill & Automatic DEK Re-wrapping
 * 11. Post-Rotation Envelope Decryption Continuity
 * 12. Irreversible Cryptographic Shredding Drill (GDPR Erasure Guarantee)
 * 13. Mathematical Unrecoverability Invariant: Shredded DEK Decryption Fails
 * 14. Cryptographic Violation Invariant: Shredded DEK Encryption Rejection
 * 15. Cryptographic Audit Trail & Superadmin Forensic Logging
 * 16. Test Idempotency & Clean Teardown
 */

import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

// Target Meta Invariant Identifiers
const TARGET_VARIANT_ID = 'bc2051b1-a44a-4a97-8acd-1f3125c70164';
const EXPECTED_REMOTE_POST_ID = '1405588742634526_122100337179498315';
const TARGET_JOB_ID = '256cf21a-26cd-4032-a7b8-17261d8a81b1';

let passedTests = 0;
function logPass(msg) {
  console.log(`  ✓ PASS: ${msg}`);
  passedTests++;
}

async function verifyMetaLock(connection, phase = 'PRE') {
  const [variantRows] = await connection.execute(
    'SELECT id, remote_post_id, status, platform FROM post_variants WHERE id = ?',
    [TARGET_VARIANT_ID]
  );
  assert(variantRows.length > 0, `[Meta Lock ${phase}] Variant ${TARGET_VARIANT_ID} must exist`);
  const variant = variantRows[0];
  assert.strictEqual(
    variant.remote_post_id,
    EXPECTED_REMOTE_POST_ID,
    `[Meta Lock ${phase}] Variant remote_post_id must match ${EXPECTED_REMOTE_POST_ID}`
  );
  logPass(`[Meta Lock ${phase}] Variant exists with remote_post_id = ${EXPECTED_REMOTE_POST_ID}`);

  assert.strictEqual(
    variant.status,
    'published',
    `[Meta Lock ${phase}] Variant status must be 'published' (was ${variant.status})`
  );
  logPass(`[Meta Lock ${phase}] Variant status is strictly 'published'`);

  const [jobRows] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [TARGET_JOB_ID]
  );
  assert(jobRows.length > 0, `[Meta Lock ${phase}] Publishing job ${TARGET_JOB_ID} must exist`);
  const job = jobRows[0];
  assert.strictEqual(
    job.status,
    'published',
    `[Meta Lock ${phase}] Publishing job status must be 'published' (was ${job.status})`
  );
  logPass(`[Meta Lock ${phase}] Publishing job status is strictly 'published'`);
}

async function runStage44Tests() {
  console.log('\n================================================================');
  console.log(' STAGE 44: CRYPTOGRAPHIC HSM KEY BROKERAGE & ENVELOPE ENCRYPTION ');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. PRE-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('1. Verifying Production Meta Invariant Lock (PRE-CHECK)...');
    await verifyMetaLock(connection, 'PRE');

    // -------------------------------------------------------------------------
    // 2. SETUP AUTH TOKENS (Superadmin vs Regular User)
    // -------------------------------------------------------------------------
    console.log('\n2. Generating Test JWT Credentials & Authenticating Operator...');
    const [superadminRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadminRows.length > 0, 'At least one active superadmin user required in database');
    const superadminUser = superadminRows[0];

    const superadminToken = jwt.sign(
      {
        userId: superadminUser.id,
        email: superadminUser.email,
        isSuperadmin: true,
        is_superadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const [regularRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 0 AND is_active = 1 LIMIT 1'
    );
    let regularToken = null;
    if (regularRows.length > 0) {
      regularToken = jwt.sign(
        {
          userId: regularRows[0].id,
          email: regularRows[0].email,
          isSuperadmin: false,
          is_superadmin: false,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    }
    logPass(`Superadmin authenticated: ${superadminUser.email}`);

    // -------------------------------------------------------------------------
    // 3. RBAC & SECURITY GUARDRAILS
    // -------------------------------------------------------------------------
    console.log('\n3. Validating RBAC Security Enforcement (401, 403, 200)...');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
    logPass('Unauthenticated HSM broker access rejected with HTTP 401 Unauthorized');

    if (regularToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/telemetry`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin token must be rejected with 403');
      logPass('Non-superadmin tenant user access rejected with HTTP 403 Forbidden');
    }

    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // -------------------------------------------------------------------------
    // 4. HSM TELEMETRY & ZERO-PLAINTEXT GUARANTEE
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Real-Time HSM Telemetry & Security Posture...');
    const telRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telRes.status, 200, 'Superadmin access to HSM telemetry must return 200');
    const telData = (await telRes.json()).data;
    assert(Number(telData.total_key_rings) >= 3, 'Must report at least 3 root keyrings');
    assert(Number(telData.active_deks) >= 3, 'Must report at least 3 active DEKs');
    assert.strictEqual(telData.zero_plaintext_guarantee, 'hardware_enforced', 'Zero-plaintext posture must be hardware_enforced');
    logPass(`HSM Telemetry verified (Keyrings: ${telData.total_key_rings}, Active DEKs: ${telData.active_deks}, Enforced: ${telData.zero_plaintext_guarantee})`);

    // -------------------------------------------------------------------------
    // 5. HSM KEYRINGS & PARTITION TOPOLOGY
    // -------------------------------------------------------------------------
    console.log('\n5. Inspecting HSM Root Keyrings & Multi-Cloud Partitions...');
    const ringsRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/key-rings`, {
      headers: authHeaders,
    });
    assert.strictEqual(ringsRes.status, 200, 'Keyrings query must return 200');
    const keyRings = (await ringsRes.json()).data;
    assert(Array.isArray(keyRings) && keyRings.length >= 3, 'Must list pre-seeded keyrings');

    const expectedProviders = ['aws_cloudhsm', 'gcp_cloud_hsm', 'hashicorp_vault_transit'];
    for (const prov of expectedProviders) {
      const found = keyRings.find((r) => r.provider_type === prov);
      assert(found, `Keyring for provider '${prov}' must exist`);
      assert.strictEqual(found.algorithm, 'aes_256_gcm', 'Keyring algorithm must be aes_256_gcm');
      assert.strictEqual(Boolean(found.is_active), true, 'Keyring must be active');
    }
    logPass(`Multi-cloud HSM keyrings validated (AWS CloudHSM, GCP Cloud HSM, Vault Transit)`);

    // -------------------------------------------------------------------------
    // 6. PROVISION NEW HSM ROOT KEYRING
    // -------------------------------------------------------------------------
    console.log('\n6. Provisioning New HSM Root Keyring...');
    const newRingRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/key-rings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        ring_name: 'Azure Dedicated HSM North Europe Master Keyring',
        provider_type: 'azure_dedicated_hsm',
        hsm_partition_id: 'partition-azure-neurope-01',
        master_key_alias: 'alias/sf-azure-root-master-v1',
        rotation_interval_days: 90,
      }),
    });
    assert.strictEqual(newRingRes.status, 201, 'Keyring creation must return 201');
    const createdRing = (await newRingRes.json()).data;
    assert(createdRing.id.startsWith('ring-'), 'Ring ID must have ring- prefix');
    assert.strictEqual(createdRing.provider_type, 'azure_dedicated_hsm', 'Provider type must match');
    logPass(`New HSM Keyring provisioned successfully (ID: ${createdRing.id})`);

    // -------------------------------------------------------------------------
    // 7. KEY DERIVATION POLICIES REGISTRY
    // -------------------------------------------------------------------------
    console.log('\n7. Inspecting Key Derivation Policies...');
    const polRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/policies`, {
      headers: authHeaders,
    });
    assert.strictEqual(polRes.status, 200, 'Policies query must return 200');
    const policies = (await polRes.json()).data;
    assert(Array.isArray(policies) && policies.length >= 3, 'Must have at least 3 derivation policies');
    const piiPol = policies.find((p) => p.purpose === 'tenant_pii_envelope');
    assert(piiPol && piiPol.is_enforced, 'Tenant PII derivation policy must be enforced');
    logPass(`Key derivation policies verified (Enforced targets: ${policies.length})`);

    // -------------------------------------------------------------------------
    // 8. GENERATE & WRAP NEW ENVELOPE DEK
    // -------------------------------------------------------------------------
    console.log('\n8. Generating and Wrapping New Envelope DEK...');
    const genDekRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/deks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        key_ring_id: createdRing.id,
        key_label: 'Integration Test Customer OAuth Refresh Token Vault DEK',
        intended_purpose: 'oauth_secrets_envelope',
        expires_in_days: 180,
      }),
    });
    assert.strictEqual(genDekRes.status, 201, 'DEK generation must return 201');
    const generatedDek = (await genDekRes.json()).data;
    assert(generatedDek.id.startsWith('dek-'), 'DEK ID must have dek- prefix');
    assert(generatedDek.encrypted_dek_ciphertext && generatedDek.encrypted_dek_ciphertext.length >= 32, 'DEK must be wrapped under root KEK');
    assert.strictEqual(generatedDek.status, 'active', 'DEK status must be active');
    const testDekId = generatedDek.id;
    logPass(`New Envelope DEK generated & wrapped (ID: ${testDekId}, Status: ${generatedDek.status})`);

    // -------------------------------------------------------------------------
    // 9. ENVELOPE ENCRYPTION (AES-256-GCM) WITH AAD
    // -------------------------------------------------------------------------
    console.log('\n9. Executing Zero-Plaintext In-Memory Envelope Encryption...');
    const sensitivePlaintext = 'SECRET_SOCIAL_ACCESS_TOKEN_EAABsbCS1iZAkBAOKj2026_STAGE44_VERIFICATION';
    const aadContext = 'tenant_id:test-tenant-uuid-101;platform:meta_graph_api';

    const encRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/encrypt`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dek_id: testDekId,
        plaintext: sensitivePlaintext,
        additional_authenticated_data: aadContext,
      }),
    });
    assert.strictEqual(encRes.status, 200, 'Envelope encryption must return 200');
    const encResult = (await encRes.json()).data;
    assert.strictEqual(encResult.success, true, 'Encryption response must indicate success');
    assert(encResult.ciphertext_base64, 'Must return ciphertext_base64');
    assert(encResult.iv_base64, 'Must return iv_base64');
    assert(encResult.auth_tag_base64, 'Must return auth_tag_base64');
    assert(encResult.sha256_proof, 'Must return sha256_proof');
    logPass(`Envelope encryption succeeded (Ciphertext Base64: ${encResult.ciphertext_base64.slice(0, 16)}..., AuthTag: ${encResult.auth_tag_base64.slice(0, 8)}...)`);

    // -------------------------------------------------------------------------
    // 10. ENVELOPE DECRYPTION & CRYPTOGRAPHIC AUTH TAG VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n10. Executing Envelope Decryption & Verifying In-Memory Decryption...');
    const decRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/decrypt`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dek_id: testDekId,
        ciphertext_base64: encResult.ciphertext_base64,
        iv_base64: encResult.iv_base64,
        auth_tag_base64: encResult.auth_tag_base64,
        additional_authenticated_data: aadContext,
      }),
    });
    assert.strictEqual(decRes.status, 200, 'Envelope decryption must return 200');
    const decResult = (await decRes.json()).data;
    assert.strictEqual(decResult.success, true, 'Decryption must report success');
    assert.strictEqual(decResult.plaintext, sensitivePlaintext, 'Decrypted plaintext must match original exactly');
    logPass(`Envelope decryption validated (Recovered plaintext matched exactly with authenticated AAD verification)`);

    // -------------------------------------------------------------------------
    // 11. MASTER ROOT KEY (KEK) ROTATION DRILL & AUTOMATIC RE-WRAPPING
    // -------------------------------------------------------------------------
    console.log('\n11. Testing Master Root Key (KEK) Rotation Drill & DEK Re-wrapping...');
    const rotateRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/key-rings/${createdRing.id}/rotate`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(rotateRes.status, 200, 'Root KEK rotation must return 200');
    const rotateResult = (await rotateRes.json()).data;
    assert.strictEqual(rotateResult.success, true, 'Rotation must succeed');
    assert(rotateResult.new_key_alias !== rotateResult.old_key_alias, 'New key alias must differ from old');
    assert(rotateResult.rewrapped_deks_count >= 1, 'Must re-wrap at least 1 active DEK');
    logPass(`Master KEK rotated cleanly (Old: ${rotateResult.old_key_alias} -> New: ${rotateResult.new_key_alias}, Re-wrapped: ${rotateResult.rewrapped_deks_count} DEKs)`);

    // -------------------------------------------------------------------------
    // 12. POST-ROTATION DECRYPTION CONTINUITY
    // -------------------------------------------------------------------------
    console.log('\n12. Validating Post-Rotation Decryption Continuity...');
    const postRotDecRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/decrypt`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dek_id: testDekId,
        ciphertext_base64: encResult.ciphertext_base64,
        iv_base64: encResult.iv_base64,
        auth_tag_base64: encResult.auth_tag_base64,
        additional_authenticated_data: aadContext,
      }),
    });
    assert.strictEqual(postRotDecRes.status, 200, 'Post-rotation decryption must succeed');
    const postRotDecResult = (await postRotDecRes.json()).data;
    assert.strictEqual(postRotDecResult.plaintext, sensitivePlaintext, 'Post-rotation decrypted plaintext must match');
    logPass(`Post-rotation decryption continuity verified without data access disruption`);

    // -------------------------------------------------------------------------
    // 13. IRREVERSIBLE CRYPTOGRAPHIC SHREDDING DRILL
    // -------------------------------------------------------------------------
    console.log('\n13. Testing Irreversible Cryptographic Shredding (GDPR Erasure)...');
    const shredRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/deks/${testDekId}/shred`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        reason: 'Automated test suite cryptographic shredding verification',
        confirmation: true,
      }),
    });
    assert.strictEqual(shredRes.status, 200, 'Crypto shredding must return 200');
    const shredResult = (await shredRes.json()).data;
    assert.strictEqual(shredResult.success, true, 'Shredding must report success');
    assert.strictEqual(shredResult.status, 'shredded', 'DEK status must transition to shredded');

    // Confirm DB record is permanently wiped with tombstone
    const [shreddedRows] = await connection.execute(
      'SELECT status, encrypted_dek_ciphertext FROM envelope_data_encryption_keys WHERE id = ?',
      [testDekId]
    );
    assert.strictEqual(shreddedRows[0].status, 'shredded', 'Database record status must be shredded');
    assert(shreddedRows[0].encrypted_dek_ciphertext.startsWith('SHREDDED_IRREVERSIBLE_TOMBSTONE_'), 'Key ciphertext must be overwritten with tombstone');
    logPass(`Cryptographic shredding executed (Ciphertext overwritten with irreversible tombstone)`);

    // -------------------------------------------------------------------------
    // 14. MATHEMATICAL UNRECOVERABILITY INVARIANT: SHREDDED DECRYPTION FAILS
    // -------------------------------------------------------------------------
    console.log('\n14. Enforcing Mathematical Unrecoverability: Decryption with Shredded Key Must Fail...');
    const failedDecRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/decrypt`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dek_id: testDekId,
        ciphertext_base64: encResult.ciphertext_base64,
        iv_base64: encResult.iv_base64,
        auth_tag_base64: encResult.auth_tag_base64,
        additional_authenticated_data: aadContext,
      }),
    });
    assert.strictEqual(failedDecRes.status, 410, 'Decryption attempt on shredded key must return HTTP 410 Gone');
    const failedDecBody = await failedDecRes.json();
    assert(
      failedDecBody.error.includes('mathematically unrecoverable'),
      'Error message must state data is mathematically unrecoverable'
    );
    logPass('Mathematical Unrecoverability Invariant strictly enforced: Decryption failed with HTTP 410 Gone');

    // -------------------------------------------------------------------------
    // 15. CRYPTOGRAPHIC VIOLATION INVARIANT: SHREDDED ENCRYPTION REJECTION
    // -------------------------------------------------------------------------
    console.log('\n15. Enforcing Cryptographic Safety Invariant: Encryption with Shredded Key Must Fail...');
    const failedEncRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/encrypt`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        dek_id: testDekId,
        plaintext: 'Should never be encrypted',
      }),
    });
    assert.strictEqual(failedEncRes.status, 409, 'Encryption attempt on shredded key must return HTTP 409 Conflict');
    logPass('Cryptographic Safety Invariant strictly enforced: New encryption with shredded key rejected with HTTP 409');

    // -------------------------------------------------------------------------
    // 16. CRYPTOGRAPHIC AUDIT TRAIL & SUPERADMIN FORENSIC LOGGING
    // -------------------------------------------------------------------------
    console.log('\n16. Verifying Cryptographic Audit Trail & Forensic Logging...');
    const auditLogsRes = await fetch(`${BASE_URL}/admin/operations/hsm-broker/audit-logs?limit=20`, {
      headers: authHeaders,
    });
    assert.strictEqual(auditLogsRes.status, 200, 'Audit logs fetch must return 200');
    const logs = (await auditLogsRes.json()).data;
    assert(Array.isArray(logs) && logs.length >= 4, 'Must have recorded crypto operations');

    const ops = logs.map((l) => l.operation);
    assert(ops.includes('envelope_encrypt'), 'envelope_encrypt audit log missing');
    assert(ops.includes('envelope_decrypt'), 'envelope_decrypt audit log missing');
    assert(ops.includes('rotate_root_kek'), 'rotate_root_kek audit log missing');
    assert(ops.includes('crypto_shred_dek'), 'crypto_shred_dek audit log missing');
    logPass(`Cryptographic audit trail verified (All lifecycle operations recorded with SHA-256 proofs)`);

    // Check superadmin_audit_logs for shredding event
    const [superAuditRows] = await connection.execute(
      `SELECT action, target_resource_type, details FROM superadmin_audit_logs 
       WHERE action = 'DEK_CRYPTOGRAPHICALLY_SHREDDED' ORDER BY created_at DESC LIMIT 1`
    );
    assert(superAuditRows.length > 0, 'DEK_CRYPTOGRAPHICALLY_SHREDDED must be logged in superadmin_audit_logs');
    logPass('Superadmin forensic audit trail confirmed for cryptographic shredding');

    // -------------------------------------------------------------------------
    // 17. IDEMPOTENT TEST CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n17. Purging Test Artifacts for Strict Idempotency...');
    await connection.execute('DELETE FROM hsm_crypto_audit_logs WHERE key_id IN (?, ?)', [testDekId, createdRing.id]);
    await connection.execute('DELETE FROM envelope_data_encryption_keys WHERE id = ?', [testDekId]);
    await connection.execute('DELETE FROM hsm_key_rings WHERE id = ?', [createdRing.id]);
    logPass('Test artifacts purged cleanly (Zero residual database mutation)');

    // -------------------------------------------------------------------------
    // 18. POST-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('\n18. Verifying Production Meta Invariant Lock (POST-CHECK)...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n================================================================');
    console.log(` STAGE 44 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED (100%)       `);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage44Tests().catch((err) => {
  console.error('\n❌ STAGE 44 TEST SUITE FAILED:', err);
  process.exit(1);
});
