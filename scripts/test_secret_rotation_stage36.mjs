/**
 * Stage 36: Enterprise Zero-Trust Secret Rotation, Confidential Computing & Key Management Mesh Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Overview Telemetry & Security Posture Score
 * 4. Pre-seeded Core Production Secret Vault Keys
 * 5. Single Key Deep Inspection & Version Lineage (v4 active, v3 grace_period)
 * 6. Key Provisioning & Validation Guardrails (alias, types, providers)
 * 7. Multi-Version Key Rotation Engine (v1 -> grace_period, v2 -> active, SHA-256 fingerprints)
 * 8. Emergency Revocation Procedure & Decryption Invalidation
 * 9. In-Memory Envelope Re-Encryption Simulation Sandbox
 * 10. Decommission Guardrails (protected keys vs custom keys)
 * 11. Superadmin Audit Trail Ledger & Zero-Trust Access Logs
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
    `[Meta Lock ${phase}] Variant status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Variant status is strictly "published" (found: ${variant.status})`);

  const [jobRows] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [TARGET_JOB_ID]
  );
  assert(jobRows.length > 0, `[Meta Lock ${phase}] Publishing job ${TARGET_JOB_ID} must exist`);
  const job = jobRows[0];
  logPass(`[Meta Lock ${phase}] Publishing job exists with ID = ${TARGET_JOB_ID}`);

  assert.strictEqual(
    job.status,
    'published',
    `[Meta Lock ${phase}] Job status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Job status is strictly "published" (found: ${job.status})`);
}

async function runStage36() {
  console.log('================================================================');
  console.log('   STAGE 36: ZERO-TRUST SECRET ROTATION & KMS MESH SUITE        ');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. Meta Invariant Pre-Check
    // -------------------------------------------------------------------------
    console.log('[Section 1: Meta Invariant Pre-Check]');
    await verifyMetaLock(connection, 'PRE');
    console.log('');

    // -------------------------------------------------------------------------
    // 2. Auth Tokens & RBAC Setup
    // -------------------------------------------------------------------------
    console.log('[Section 2: Security & Authentication Setup]');
    const [superadmins] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadmins.length > 0, 'Found at least one active superadmin user');
    const superadmin = superadmins[0];
    logPass('Found active superadmin user');

    const [members] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Found active regular tenant member');
    const regularUser = members[0];
    logPass('Found active regular tenant member');

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperAdmin: true },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, isSuperAdmin: false, tenantId: regularUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const superadminHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };
    const regularHeaders = {
      Authorization: `Bearer ${regularToken}`,
      'Content-Type': 'application/json',
    };
    console.log('');

    // -------------------------------------------------------------------------
    // 3. Superadmin Security & RBAC Enforcement
    // -------------------------------------------------------------------------
    console.log('[Section 3: Superadmin Security & RBAC Enforcement]');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/telemetry`);
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);
    logPass(`Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    const regularRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/telemetry`, {
      headers: regularHeaders,
    });
    assert(regularRes.status === 403, `Regular member rejected with 403 (got ${regularRes.status})`);
    logPass(`Regular member rejected with 403 (got ${regularRes.status})`);

    const superRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/telemetry`, {
      headers: superadminHeaders,
    });
    assert(superRes.status === 200, `Superadmin access allowed with 200 (got ${superRes.status})`);
    logPass(`Superadmin access allowed with 200 (got ${superRes.status})`);
    console.log('');

    // -------------------------------------------------------------------------
    // 4. Overview Telemetry & Security Posture KPIs
    // -------------------------------------------------------------------------
    console.log('[Section 4: Overview Telemetry & Security Posture KPIs]');
    const telemetryJson = await superRes.json();
    assert(telemetryJson.success === true, 'Telemetry response success: true');
    logPass('Telemetry response has success: true');

    const tel = telemetryJson.data;
    assert(typeof tel.totalKeys === 'number', 'telemetry.totalKeys is number');
    logPass('telemetry.totalKeys is number');

    assert(tel.totalKeys >= 5, `telemetry.totalKeys >= 5 (found: ${tel.totalKeys})`);
    logPass(`telemetry.totalKeys >= 5 (found: ${tel.totalKeys})`);

    assert(typeof tel.activeKeys === 'number', 'telemetry.activeKeys is number');
    logPass('telemetry.activeKeys is number');

    assert(tel.activeKeys >= 4, `telemetry.activeKeys >= 4 (found: ${tel.activeKeys})`);
    logPass(`telemetry.activeKeys >= 4 (found: ${tel.activeKeys})`);

    assert(typeof tel.securityPostureScore === 'number', 'telemetry.securityPostureScore is number');
    logPass('telemetry.securityPostureScore is number');

    assert(tel.securityPostureScore >= 70, `securityPostureScore >= 70 (found: ${tel.securityPostureScore})`);
    logPass(`securityPostureScore >= 70 (found: ${tel.securityPostureScore})`);

    assert(typeof tel.totalAccessOperations === 'number', 'telemetry.totalAccessOperations is number');
    logPass('telemetry.totalAccessOperations is number');

    assert(typeof tel.providerDistribution === 'object', 'telemetry.providerDistribution is object');
    logPass('telemetry.providerDistribution is object');

    assert(tel.providerDistribution.internal_aes256_gcm >= 1, 'Provider distribution includes internal_aes256_gcm');
    logPass('Provider distribution includes internal_aes256_gcm');

    assert(tel.providerDistribution.aws_kms >= 1, 'Provider distribution includes aws_kms');
    logPass('Provider distribution includes aws_kms');

    assert(Array.isArray(tel.recentRotations), 'telemetry.recentRotations is array');
    logPass('telemetry.recentRotations is array');
    console.log('');

    // -------------------------------------------------------------------------
    // 5. Pre-seeded Core Secret Vault Keys
    // -------------------------------------------------------------------------
    console.log('[Section 5: Pre-seeded Core Secret Vault Keys]');
    // Clean up any temp keys from prior test runs to ensure idempotency
    await connection.execute("DELETE FROM secret_vault_keys WHERE key_alias LIKE 'stage36-%'");

    const listRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys`, {
      headers: superadminHeaders,
    });
    assert(listRes.status === 200, 'GET /keys returned 200');
    logPass('GET /keys returned 200');

    const keys = (await listRes.json()).data;
    assert(Array.isArray(keys), 'keys is an array');
    logPass('keys is an array');

    const oauthKey = keys.find((k) => k.id === 'key-meta-oauth-01');
    assert(oauthKey !== undefined, 'Found key-meta-oauth-01');
    logPass('Found key-meta-oauth-01');
    assert(oauthKey.key_type === 'oauth_client_secret', 'key-meta-oauth-01 type is oauth_client_secret');
    logPass('key-meta-oauth-01 type is oauth_client_secret');
    assert(oauthKey.current_version === 2, 'key-meta-oauth-01 current_version is 2');
    logPass('key-meta-oauth-01 current_version is 2');

    const dekKey = keys.find((k) => k.id === 'key-master-dek-02');
    assert(dekKey !== undefined, 'Found key-master-dek-02');
    logPass('Found key-master-dek-02');
    assert(dekKey.vault_provider === 'aws_kms', 'key-master-dek-02 provider is aws_kms');
    logPass('key-master-dek-02 provider is aws_kms');
    assert(dekKey.current_version === 4, 'key-master-dek-02 current_version is 4');
    logPass('key-master-dek-02 current_version is 4');

    const jwtKey = keys.find((k) => k.id === 'key-jwt-signer-03');
    assert(jwtKey !== undefined, 'Found key-jwt-signer-03');
    logPass('Found key-jwt-signer-03');

    const webhookKey = keys.find((k) => k.id === 'key-webhook-hmac-04');
    assert(webhookKey !== undefined, 'Found key-webhook-hmac-04');
    logPass('Found key-webhook-hmac-04');

    const meshKey = keys.find((k) => k.id === 'key-db-mesh-replicator-05');
    assert(meshKey !== undefined, 'Found key-db-mesh-replicator-05');
    logPass('Found key-db-mesh-replicator-05');
    console.log('');

    // -------------------------------------------------------------------------
    // 6. Deep Inspection & Version Lineage
    // -------------------------------------------------------------------------
    console.log('[Section 6: Deep Inspection & Version Lineage]');
    const inspectRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/key-master-dek-02`, {
      headers: superadminHeaders,
    });
    assert(inspectRes.status === 200, 'GET /keys/:id returned 200');
    logPass('GET /keys/:id returned 200');

    const inspectedDek = (await inspectRes.json()).data;
    assert(Array.isArray(inspectedDek.versions), 'Inspected key contains versions array');
    logPass('Inspected key contains versions array');

    assert(inspectedDek.versions.length >= 2, `Inspected key has >= 2 versions (found: ${inspectedDek.versions.length})`);
    logPass(`Inspected key has >= 2 versions (found: ${inspectedDek.versions.length})`);

    const v4 = inspectedDek.versions.find((v) => v.version_number === 4);
    assert(v4 !== undefined, 'Found version 4');
    logPass('Found version 4');
    assert(v4.status === 'active', 'Version 4 status is active');
    logPass('Version 4 status is active');
    assert(typeof v4.key_fingerprint === 'string' && v4.key_fingerprint.length === 64, 'Version 4 has SHA-256 fingerprint');
    logPass('Version 4 has SHA-256 fingerprint');

    const v3 = inspectedDek.versions.find((v) => v.version_number === 3);
    assert(v3 !== undefined, 'Found version 3');
    logPass('Found version 3');
    assert(v3.status === 'grace_period', 'Version 3 status is grace_period');
    logPass('Version 3 status is grace_period');
    console.log('');

    // -------------------------------------------------------------------------
    // 7. Key Provisioning & Validation Guardrails
    // -------------------------------------------------------------------------
    console.log('[Section 7: Key Provisioning & Validation Guardrails]');
    // Validation: Empty / short alias
    const shortAliasRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        key_alias: 'a',
        key_type: 'encryption_dek',
        vault_provider: 'internal_aes256_gcm',
      }),
    });
    assert(shortAliasRes.status === 400, `Short alias rejected with 400 (got ${shortAliasRes.status})`);
    logPass(`Short alias rejected with 400 (got ${shortAliasRes.status})`);

    // Validation: Invalid provider
    const badProviderRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        key_alias: 'stage36-valid-alias',
        key_type: 'encryption_dek',
        vault_provider: 'non_existent_vault',
      }),
    });
    assert(badProviderRes.status === 400, `Invalid provider rejected with 400 (got ${badProviderRes.status})`);
    logPass(`Invalid provider rejected with 400 (got ${badProviderRes.status})`);

    // Valid Creation
    const createRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        key_alias: 'stage36-temp-rotation-key',
        key_type: 'webhook_signing_secret',
        vault_provider: 'internal_aes256_gcm',
        rotation_interval_days: 60,
        grace_period_hours: 48,
        auto_rotate_enabled: true,
      }),
    });
    assert(createRes.status === 201, `Valid key creation returned 201 (got ${createRes.status})`);
    logPass(`Valid key creation returned 201 (got ${createRes.status})`);

    const createdKey = (await createRes.json()).data;
    assert(createdKey.key_alias === 'stage36-temp-rotation-key', 'Created key alias matches');
    logPass('Created key alias matches');
    assert(createdKey.current_version === 1, 'Initial version is 1');
    logPass('Initial version is 1');
    assert(createdKey.status === 'active', 'New key status is active');
    logPass('New key status is active');
    console.log('');

    // -------------------------------------------------------------------------
    // 8. Multi-Version Key Rotation Engine
    // -------------------------------------------------------------------------
    console.log('[Section 8: Multi-Version Key Rotation Engine]');
    const rotateRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/${createdKey.id}/rotate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        trigger: 'manual_operator',
      }),
    });
    assert(rotateRes.status === 200, `POST /keys/:id/rotate returned 200 (got ${rotateRes.status})`);
    logPass(`POST /keys/:id/rotate returned 200 (got ${rotateRes.status})`);

    const rotateResult = (await rotateRes.json()).data;
    assert(rotateResult.success === true, 'Rotation result success is true');
    logPass('Rotation result success is true');
    assert(rotateResult.key.current_version === 2, 'Rotated key current_version is 2');
    logPass('Rotated key current_version is 2');
    assert(rotateResult.newVersion.version_number === 2, 'New version number is 2');
    logPass('New version number is 2');
    assert(rotateResult.newVersion.status === 'active', 'New version status is active');
    logPass('New version status is active');

    // Verify v1 moved to grace_period
    const [v1Rows] = await connection.execute(
      'SELECT version_number, status, deprecated_at FROM secret_key_versions WHERE key_id = ? AND version_number = 1',
      [createdKey.id]
    );
    assert(v1Rows.length > 0, 'Found v1 in database');
    assert(v1Rows[0].status === 'grace_period', 'Version 1 transitioned to grace_period');
    logPass('Version 1 transitioned to grace_period');
    assert(v1Rows[0].deprecated_at !== null, 'Version 1 deprecated_at timestamp set');
    logPass('Version 1 deprecated_at timestamp set');
    console.log('');

    // -------------------------------------------------------------------------
    // 9. Emergency Revocation Procedure
    // -------------------------------------------------------------------------
    console.log('[Section 9: Emergency Revocation Procedure]');
    // Short reason rejected
    const shortReasonRevoke = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/${createdKey.id}/revoke`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ reason: 'short' }),
    });
    assert(shortReasonRevoke.status === 400, `Short reason rejected with 400 (got ${shortReasonRevoke.status})`);
    logPass(`Short reason rejected with 400 (got ${shortReasonRevoke.status})`);

    // Valid Revocation
    const revokeRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/${createdKey.id}/revoke`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        reason: 'Compromised token leak detected in public repository by security scanner',
      }),
    });
    assert(revokeRes.status === 200, `POST /keys/:id/revoke returned 200 (got ${revokeRes.status})`);
    logPass(`POST /keys/:id/revoke returned 200 (got ${revokeRes.status})`);

    const revokedKey = (await revokeRes.json()).data;
    assert(revokedKey.status === 'revoked', 'Key status is now revoked');
    logPass('Key status is now revoked');

    // Attempting to rotate revoked key should fail
    const rotateRevokedRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/${createdKey.id}/rotate`, {
      method: 'POST',
      headers: superadminHeaders,
    });
    assert(rotateRevokedRes.status === 400, `Rotating revoked key rejected with 400 (got ${rotateRevokedRes.status})`);
    logPass(`Rotating revoked key rejected with 400 (got ${rotateRevokedRes.status})`);
    console.log('');

    // -------------------------------------------------------------------------
    // 10. In-Memory Envelope Re-Encryption Simulator
    // -------------------------------------------------------------------------
    console.log('[Section 10: In-Memory Envelope Re-Encryption Simulator]');
    const simRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/simulate-envelope-reencrypt`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        key_alias: 'master-field-encryption-dek',
        target_record_count: 25000,
      }),
    });
    assert(simRes.status === 200, `POST /simulate-envelope-reencrypt returned 200 (got ${simRes.status})`);
    logPass(`POST /simulate-envelope-reencrypt returned 200 (got ${simRes.status})`);

    const sim = (await simRes.json()).data;
    assert(sim.simulated === true, 'Simulation flag is true');
    logPass('Simulation flag is true');
    assert(sim.evaluatedRecordCount === 25000, 'Evaluated record count matches target');
    logPass('Evaluated record count matches target');
    assert(sim.dataIntegrityChecksumMatch === true, 'Data integrity checksum match is true');
    logPass('Data integrity checksum match is true');
    assert(Array.isArray(sim.recommendations), 'Simulation produces architectural recommendations');
    logPass('Simulation produces architectural recommendations');
    console.log('');

    // -------------------------------------------------------------------------
    // 11. Decommission Guardrails & Superadmin Audit Verification
    // -------------------------------------------------------------------------
    console.log('[Section 11: Decommission Guardrails & Superadmin Audit Verification]');
    // Protected core key cannot be deleted
    const deleteProtectedRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/key-master-dek-02`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    assert(deleteProtectedRes.status === 400, `Deleting protected core key rejected with 400 (got ${deleteProtectedRes.status})`);
    logPass(`Deleting protected core key rejected with 400 (got ${deleteProtectedRes.status})`);

    // Custom key can be deleted
    const deleteCustomRes = await fetch(`${BASE_URL}/admin/operations/secret-rotation/keys/${createdKey.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    assert(deleteCustomRes.status === 200, `Deleting custom key returned 200 (got ${deleteCustomRes.status})`);
    logPass(`Deleting custom key returned 200 (got ${deleteCustomRes.status})`);

    // Audit Log Verification
    const [auditRows] = await connection.execute(
      `SELECT action, target_resource_type FROM superadmin_audit_logs 
       WHERE target_resource_type = 'secret_rotation' 
       ORDER BY created_at DESC LIMIT 10`
    );
    assert(auditRows.length > 0, 'Found audit logs for secret_rotation');
    logPass('Found audit logs for secret_rotation');

    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('PROVISION_VAULT_KEY'), 'Audit log includes PROVISION_VAULT_KEY');
    logPass('Audit log includes PROVISION_VAULT_KEY');
    assert(actions.includes('ROTATE_SECRET_KEY'), 'Audit log includes ROTATE_SECRET_KEY');
    logPass('Audit log includes ROTATE_SECRET_KEY');
    assert(actions.includes('EMERGENCY_REVOKE_SECRET_KEY'), 'Audit log includes EMERGENCY_REVOKE_SECRET_KEY');
    logPass('Audit log includes EMERGENCY_REVOKE_SECRET_KEY');
    console.log('');

    // -------------------------------------------------------------------------
    // 12. Meta Invariant Post-Check
    // -------------------------------------------------------------------------
    console.log('[Section 12: Meta Invariant Post-Check]');
    await verifyMetaLock(connection, 'POST');
    console.log('');

    console.log('================================================================');
    console.log(`   STAGE 36 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage36().catch((err) => {
  console.error('\nSTAGE 36 EXECUTION FAILED:', err.message);
  process.exit(1);
});
