/**
 * Stage 45: Enterprise Multi-Cloud Distributed Object Storage Tiering, Immutable Object Lock & Presigned Upload Gateway Test Suite
 * SocialForge Platform v6.3.0
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Object Storage Fleet Telemetry & Multi-Cloud Distribution
 * 4. Multi-Cloud Bucket Inventory & Provisioning
 * 5. Lifecycle Tiering Policies & Transition Execution Simulation
 * 6. Presigned Upload Gateway URL Issuance with HMAC Signatures
 * 7. Asset Ingestion Checksum Integrity Verification
 * 8. Adversarial Malware Quarantine Invariant on Checksum Tamper
 * 9. WORM Compliance Immutable Object Lock Enforcement (SEC 17a-4)
 * 10. WORM Immutability Barrier Invariant: Deletion Blocked (HTTP 403)
 * 11. Unconstrained Object Deletion & Catalog Cleanup
 * 12. Test Idempotency & Clean Teardown
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

async function runStage45Tests() {
  console.log('========================================================================');
  console.log('  STAGE 45: MULTI-CLOUD DISTRIBUTED OBJECT STORAGE & WORM VAULT SUITE   ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. PRE-CHECK META INVARIANT LOCK
    console.log('[1/12] Verifying Pre-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'PRE');

    // 2. AUTH & RBAC GUARDRAILS
    console.log('\n[2/12] Validating Superadmin Security & RBAC Guardrails...');
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
    let normalUserToken = null;
    if (regularRows.length > 0) {
      normalUserToken = jwt.sign(
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

    // 401 without auth
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/object-storage/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    logPass('Unauthenticated request rejected with HTTP 401');

    // 403 non-superadmin
    if (normalUserToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/object-storage/telemetry`, {
        headers: { Authorization: `Bearer ${normalUserToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin request must return 403');
      logPass('Non-superadmin tenant request rejected with HTTP 403');
    }

    // 200 superadmin
    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // 3. TELEMETRY & MULTI-CLOUD DISTRIBUTION
    console.log('\n[3/12] Querying Object Storage Telemetry & Multi-Cloud Distribution...');
    const telemetryRes = await fetch(`${BASE_URL}/admin/operations/object-storage/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telemetryRes.status, 200, 'Telemetry endpoint must return 200');
    const telemetryBody = await telemetryRes.json();
    assert(telemetryBody.success, 'Telemetry response must indicate success');
    const telemetry = telemetryBody.data;
    assert(telemetry.total_buckets >= 3, `Expected at least 3 buckets, got ${telemetry.total_buckets}`);
    assert(telemetry.total_objects > 0, `Expected total objects > 0, got ${telemetry.total_objects}`);
    assert(telemetry.active_worm_locks >= 2, `Expected at least 2 WORM locks, got ${telemetry.active_worm_locks}`);
    assert(telemetry.storage_cost_savings_percent > 0, 'Cost savings percentage must be > 0');
    assert(telemetry.multi_cloud_distribution.aws_s3 >= 1, 'AWS S3 bucket must be present in topology');
    assert(telemetry.multi_cloud_distribution.gcp_storage >= 1, 'GCP Cloud Storage bucket must be present in topology');
    assert(telemetry.multi_cloud_distribution.cloudflare_r2 >= 1, 'Cloudflare R2 bucket must be present in topology');
    logPass(`Telemetry verified: ${telemetry.total_buckets} buckets, ${telemetry.total_objects.toLocaleString()} objects, ${telemetry.storage_cost_savings_percent}% cost savings`);

    // 4. BUCKET INVENTORY & PROVISIONING
    console.log('\n[4/12] Testing Bucket Inventory & New Multi-Cloud Bucket Provisioning...');
    const bucketsListRes = await fetch(`${BASE_URL}/admin/operations/object-storage/buckets`, {
      headers: authHeaders,
    });
    assert.strictEqual(bucketsListRes.status, 200, 'Buckets list must return 200');
    const bucketsList = (await bucketsListRes.json()).data;
    assert(bucketsList.length >= 3, 'Must list at least 3 storage buckets');
    logPass(`Buckets list retrieved: ${bucketsList.length} active buckets`);

    const testBucketName = `sf-test-stage45-${Date.now()}`;
    const createBucketRes = await fetch(`${BASE_URL}/admin/operations/object-storage/buckets`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_name: testBucketName,
        provider_type: 'minio_s3',
        region: 'internal-mesh',
        default_storage_class: 'standard_hot',
        versioning_enabled: true,
        is_immutable_locked: false,
      }),
    });
    assert.strictEqual(createBucketRes.status, 201, 'Create bucket must return 201');
    const createdBucket = (await createBucketRes.json()).data;
    assert.strictEqual(createdBucket.bucket_name, testBucketName);
    assert.strictEqual(createdBucket.provider_type, 'minio_s3');
    logPass(`Provisioned test bucket: '${createdBucket.bucket_name}' (ID: ${createdBucket.id})`);

    // 5. LIFECYCLE RULES & SIMULATION
    console.log('\n[5/12] Testing Lifecycle Tiering Rules & Transition Execution Simulation...');
    const rulesListRes = await fetch(`${BASE_URL}/admin/operations/object-storage/lifecycle-rules`, {
      headers: authHeaders,
    });
    assert.strictEqual(rulesListRes.status, 200, 'Lifecycle rules list must return 200');
    const rulesList = (await rulesListRes.json()).data;
    assert(rulesList.length >= 3, 'Must list at least 3 lifecycle rules');
    logPass(`Retrieved ${rulesList.length} pre-seeded lifecycle tiering policies`);

    const createRuleRes = await fetch(`${BASE_URL}/admin/operations/object-storage/lifecycle-rules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        rule_name: 'Test Ingestion Cold Tiering',
        prefix_filter: 'tests/raw/',
        transition_cool_days: 14,
        transition_archive_days: 60,
        expiration_days: 180,
      }),
    });
    assert.strictEqual(createRuleRes.status, 201, 'Create rule must return 201');
    const createdRule = (await createRuleRes.json()).data;
    assert.strictEqual(createdRule.rule_name, 'Test Ingestion Cold Tiering');
    logPass(`Created lifecycle rule: '${createdRule.rule_name}' (Cool: ${createdRule.transition_cool_days}d, Archive: ${createdRule.transition_archive_days}d)`);

    // Simulate tiering execution
    const simTieringRes = await fetch(`${BASE_URL}/admin/operations/object-storage/buckets/${createdBucket.id}/simulate-tiering`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(simTieringRes.status, 200, 'Simulate tiering must return 200');
    const simTiering = (await simTieringRes.json()).data;
    assert(simTiering.active_rules_evaluated >= 1, 'Should evaluate active rule');
    assert(simTiering.objects_transitioned_cool >= 0, 'Transition counts must be non-negative');
    logPass(`Simulated lifecycle tiering: ${simTiering.objects_transitioned_cool} cool, ${simTiering.objects_transitioned_archive} archive`);

    // 6. PRESIGNED UPLOAD GATEWAY
    console.log('\n[6/12] Testing Presigned Upload Gateway URL Issuance...');
    const testExpectedSha = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    const presignedRes = await fetch(`${BASE_URL}/admin/operations/object-storage/presigned-upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        object_key: 'uploads/2026/asset_001.mp4',
        content_type: 'video/mp4',
        expected_sha256: testExpectedSha,
        expiration_seconds: 600,
      }),
    });
    assert.strictEqual(presignedRes.status, 201, 'Generate presigned upload must return 201');
    const presignedData = (await presignedRes.json()).data;
    assert(presignedData.presigned_url.includes('sig='), 'Presigned URL must contain cryptographic signature');
    assert(presignedData.session_id.startsWith('upload-'), 'Session ID must start with upload-');
    logPass(`Issued presigned upload URL: session_id=${presignedData.session_id}`);

    // Verify session in database
    const sessionsListRes = await fetch(`${BASE_URL}/admin/operations/object-storage/presigned-sessions?bucket_id=${createdBucket.id}`, {
      headers: authHeaders,
    });
    assert.strictEqual(sessionsListRes.status, 200, 'Sessions list must return 200');
    const sessionsList = (await sessionsListRes.json()).data;
    assert(sessionsList.some((s) => s.id === presignedData.session_id), 'Issued session must be listed in active sessions');
    logPass('Presigned upload session persisted and tracked in catalog');

    // 7. INGESTION CHECKSUM INTEGRITY VERIFICATION
    console.log('\n[7/12] Testing Checksum Verification & Asset Ingestion...');
    const verifySuccessRes = await fetch(`${BASE_URL}/admin/operations/object-storage/verify-upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        session_id: presignedData.session_id,
        actual_sha256: testExpectedSha,
        actual_size_bytes: 52428800, // 50MB
      }),
    });
    assert.strictEqual(verifySuccessRes.status, 200, 'Verify upload must return 200');
    const verifySuccessData = (await verifySuccessRes.json()).data;
    assert.strictEqual(verifySuccessData.verified, true, 'Verification must succeed for matching checksum');
    assert.strictEqual(verifySuccessData.lock_eligible, true, 'Verified asset must be lock eligible');
    logPass('Checksum match verified: Asset ingested and bucket metrics updated');

    // 8. ADVERSARIAL MALWARE QUARANTINE INVARIANT
    console.log('\n[8/12] Testing Checksum Tampering & Malware Quarantine Invariant...');
    const tamperPresignedRes = await fetch(`${BASE_URL}/admin/operations/object-storage/presigned-upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        object_key: 'uploads/2026/suspicious_payload.bin',
        content_type: 'application/octet-stream',
        expected_sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    });
    const tamperSession = (await tamperPresignedRes.json()).data;

    const tamperVerifyRes = await fetch(`${BASE_URL}/admin/operations/object-storage/verify-upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        session_id: tamperSession.session_id,
        actual_sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // Checksum Mismatch!
        actual_size_bytes: 1048576,
      }),
    });
    assert.strictEqual(tamperVerifyRes.status, 200, 'Verify endpoint returns 200 with verification failure payload');
    const tamperData = (await tamperVerifyRes.json()).data;
    assert.strictEqual(tamperData.verified, false, 'Tampered asset verification must fail');
    assert(tamperData.message.includes('quarantined'), 'Message must indicate object quarantined');
    logPass('Adversarial tampering prevented: Checksum mismatch triggered quarantine');

    // 9. WORM COMPLIANCE IMMUTABLE OBJECT LOCK
    console.log('\n[9/12] Testing WORM Compliance Immutable Object Lock Enforcement (SEC 17a-4)...');
    const lockedKey = 'compliance/audit_trail_2026.immutable';
    const lockRes = await fetch(`${BASE_URL}/admin/operations/object-storage/locks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        object_key: lockedKey,
        lock_mode: 'compliance_strict',
        retention_days: 3650, // 10 years
        legal_hold_active: true,
        sha256_checksum: 'c24209a341b5cf3c07f9c8f008801ec216288764e29415cb26d47fe697f2e164',
      }),
    });
    assert.strictEqual(lockRes.status, 201, 'Create object lock must return 201');
    const lockData = (await lockRes.json()).data;
    assert.strictEqual(lockData.lock_mode, 'compliance_strict');
    assert.strictEqual(lockData.legal_hold_active, true);
    logPass(`WORM Lock enforced: key='${lockData.object_key}', mode=${lockData.lock_mode}, legal_hold=true`);

    // 10. WORM IMMUTABILITY BARRIER INVARIANT (HTTP 403)
    console.log('\n[10/12] Testing WORM Immutability Barrier Invariant (HTTP 403 on Deletion)...');
    const deleteAttemptRes = await fetch(`${BASE_URL}/admin/operations/object-storage/delete-object`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        object_key: lockedKey,
      }),
    });
    assert.strictEqual(deleteAttemptRes.status, 403, 'Deletion of WORM locked object must be rejected with HTTP 403');
    const deleteErr = await deleteAttemptRes.json();
    assert(deleteErr.error.includes('WORM Compliance Violation'), 'Error must explicitly state WORM Compliance Violation');
    logPass('WORM Immutability Barrier Invariant Intact: Deletion rejected with HTTP 403');

    // 11. UNCONSTRAINED OBJECT DELETION
    console.log('\n[11/12] Testing Unconstrained Object Deletion...');
    const unconstrainedKey = 'temporary/ephemeral_thumbnail.jpg';
    const deleteUnconstrainedRes = await fetch(`${BASE_URL}/admin/operations/object-storage/delete-object`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        bucket_id: createdBucket.id,
        object_key: unconstrainedKey,
      }),
    });
    assert.strictEqual(deleteUnconstrainedRes.status, 200, 'Unconstrained object deletion must return 200');
    const unconstrainedData = (await deleteUnconstrainedRes.json()).data;
    assert.strictEqual(unconstrainedData.deleted, true, 'Unconstrained object must be successfully pruned');
    logPass(`Unconstrained object pruned cleanly: '${unconstrainedKey}'`);

    // 12. CLEANUP & TEARDOWN
    console.log('\n[12/12] Cleaning Up Test Artifacts & Verifying Post-Flight Meta Lock...');
    await connection.execute('DELETE FROM presigned_upload_sessions WHERE bucket_id = ?', [createdBucket.id]);
    await connection.execute('DELETE FROM immutable_object_locks WHERE bucket_id = ?', [createdBucket.id]);
    await connection.execute('DELETE FROM object_storage_lifecycle_rules WHERE bucket_id = ?', [createdBucket.id]);
    await connection.execute('DELETE FROM storage_buckets WHERE id = ?', [createdBucket.id]);
    logPass('Cleaned up test bucket, rules, locks, and presigned upload sessions');

    // POST-CHECK META INVARIANT LOCK
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`  ALL STAGE 45 ASSERTIONS PASSED (${passedTests}/${passedTests}) - 100% SUCCESS  `);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage45Tests().catch((err) => {
  console.error('\n❌ STAGE 45 TEST FAILED:', err);
  process.exit(1);
});
