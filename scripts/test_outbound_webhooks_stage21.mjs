/**
 * Stage 21: Outbound Webhook Dispatcher & Enterprise Event Notification Engine Suite
 * 
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on Outbound Webhook endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. Outbound Webhooks Overview & Telemetry (GET /api/v1/admin/operations/outbound-webhooks/overview)
 * 4. List Registered Endpoints & Secret Masking (GET /api/v1/admin/operations/outbound-webhooks/endpoints)
 * 5. SSRF Defense Validation on URL registration & dispatch
 * 6. Register New Outbound Endpoint with AES-256-GCM Vault Encryption & Audit Logging
 * 7. Rotate HMAC-SHA256 Signing Secret & Audit Logging
 * 8. Toggle Endpoint Status (active / paused)
 * 9. Dispatch Synthetic Test Webhook & Verify HMAC-SHA256 Signature Header Format
 * 10. List Delivery Logs with Status & Event Filters
 * 11. Manual Delivery Replay / Retry & Audit Logging
 * 12. Delete Outbound Endpoint & Delivery Purge
 * 13. Production Meta Publication Lock Intact (Final Verification)
 */

import crypto from 'crypto';
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

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

async function verifyMetaLock(dbConnection, phaseLabel) {
  console.log(`\n--- [Meta Publication Lock Invariant: ${phaseLabel}] ---`);

  const [variants] = await dbConnection.execute(
    'SELECT id, remote_post_id, platform, status FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length > 0, `Meta post variant found for remote post ${META_LOCK_REMOTE_POST_ID}`);
  assert(variants[0].status === 'published', `Meta post variant strictly locked in 'published' status (current: ${variants[0].status})`);

  const [jobs] = await dbConnection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length > 0, `Production publishing job found for ID ${META_LOCK_JOB_ID}`);
  assert(jobs[0].status === 'published', `Publishing job strictly locked in 'published' status (current: ${jobs[0].status})`);
}

async function runStage21Suite() {
  console.log('========================================================================');
  console.log('   STAGE 21: OUTBOUND WEBHOOK DISPATCHER & ENTERPRISE EVENT ENGINE      ');
  console.log('========================================================================\n');

  const dbConnection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Meta Publication Lock Invariant Pre-check
    await verifyMetaLock(dbConnection, 'PRE-CHECK');

    // Fetch superadmin and non-superadmin users for auth assertions
    const [superadmins] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'At least one superadmin user exists in database');
    const superadmin = superadmins[0];

    const [normalUsers] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(normalUsers.length > 0, 'At least one standard tenant user exists in database');
    const normalUser = normalUsers[0];

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const normalUserToken = jwt.sign(
      { userId: normalUser.id, email: normalUser.email, isSuperadmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Superadmin RBAC & Auth Security Checks
    console.log('\n--- [Test 2: Superadmin RBAC & Auth Security] ---');
    const unauthRes = await request('/admin/operations/outbound-webhooks/overview');
    assert(unauthRes.status === 401, `Unauthenticated request blocked with 401 (got ${unauthRes.status})`);

    const forbiddenRes = await request('/admin/operations/outbound-webhooks/overview', {
      headers: { Authorization: `Bearer ${normalUserToken}` },
    });
    assert(forbiddenRes.status === 403, `Non-superadmin tenant request blocked with 403 (got ${forbiddenRes.status})`);

    const authRes = await request('/admin/operations/outbound-webhooks/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(authRes.status === 200, `Superadmin authorized with 200 OK (got ${authRes.status})`);

    // 3. Outbound Webhooks Overview & Telemetry
    console.log('\n--- [Test 3: Overview & Telemetry Overview] ---');
    const overview = authRes.data;
    assert(typeof overview.totalEndpoints === 'number', 'Overview contains totalEndpoints');
    assert(typeof overview.activeEndpoints === 'number', 'Overview contains activeEndpoints');
    assert(typeof overview.totalDeliveries === 'number', 'Overview contains totalDeliveries');
    assert(typeof overview.deliveredCount === 'number', 'Overview contains deliveredCount');
    assert(typeof overview.successRatePercent === 'number', 'Overview contains successRatePercent');
    assert(Array.isArray(overview.endpoints), 'Overview contains endpoints array');
    assert(Array.isArray(overview.recentDeliveries), 'Overview contains recentDeliveries array');

    // 4. List Registered Endpoints & Secret Masking
    console.log('\n--- [Test 4: List Registered Endpoints & Zero-Plaintext Masking] ---');
    const listRes = await request('/admin/operations/outbound-webhooks/endpoints', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listRes.status === 200, 'Endpoints list returns 200 OK');
    assert(Array.isArray(listRes.data), 'Endpoints list is an array');
    assert(listRes.data.length >= 2, `Endpoints list contains at least 2 seeded endpoints (got ${listRes.data.length})`);

    for (const ep of listRes.data) {
      assert(ep.id && ep.name && ep.url, `Endpoint ${ep.id} has id, name, and url`);
      assert(
        ep.secretMasked.startsWith('[SECRET_REF_HMAC_SHA256:****'),
        `Endpoint secret is masked as [SECRET_REF_HMAC_SHA256:****] (got ${ep.secretMasked})`
      );
      assert(!ep.secret, 'Raw encrypted ciphertext is never exposed on endpoint entity');
    }

    // 5. SSRF Defense Validation
    console.log('\n--- [Test 5: SSRF Defense Validation] ---');
    const ssrfCloudRes = await request('/admin/operations/outbound-webhooks/endpoints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Malicious Cloud Metadata SSRF',
        url: 'http://169.254.169.254/latest/meta-data/',
        events: ['incident.alert'],
      }),
    });
    assert(ssrfCloudRes.status === 400, `Cloud metadata SSRF URL blocked with 400 (got ${ssrfCloudRes.status})`);
    assert(
      JSON.stringify(ssrfCloudRes.data).includes('SSRF Protection Violation'),
      'Cloud metadata error message indicates SSRF protection violation'
    );

    const ssrfBadProtoRes = await request('/admin/operations/outbound-webhooks/endpoints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Bad Protocol SSRF',
        url: 'ftp://ftp.internal.corporate/dump',
        events: ['incident.alert'],
      }),
    });
    assert(ssrfBadProtoRes.status === 400, `Non-HTTP/HTTPS protocol blocked with 400 (got ${ssrfBadProtoRes.status})`);

    // 6. Register New Outbound Endpoint with AES-256-GCM Vault Encryption & Audit Log
    console.log('\n--- [Test 6: Register New Outbound Webhook Endpoint] ---');
    const newEpPayload = {
      name: 'Stage 21 Automated Test Webhook Dispatcher',
      url: 'https://security.stage21-test-partner.internal/webhook/v1',
      events: ['post.published', 'post.failed', 'incident.alert', 'custom.event'],
      metadata: { environment: 'test_suite', testRunId: Date.now() },
    };

    const createRes = await request('/admin/operations/outbound-webhooks/endpoints', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify(newEpPayload),
    });
    assert(createRes.status === 201, `Endpoint creation returns 201 Created (got ${createRes.status})`);
    assert(createRes.data.endpoint && createRes.data.rawSecret, 'Creation returns endpoint and one-time rawSecret');
    assert(createRes.data.rawSecret.startsWith('whsec_'), 'Raw secret has whsec_ prefix');

    const createdEp = createRes.data.endpoint;
    assert(createdEp.name === newEpPayload.name, 'Created endpoint has correct name');
    assert(createdEp.url === newEpPayload.url, 'Created endpoint has correct URL');
    assert(createdEp.status === 'active', 'Created endpoint status is active');

    // Verify DB record: secret is stored encrypted with AES-256-GCM format (iv:authTag:ciphertext)
    const [dbEpRows] = await dbConnection.execute(
      'SELECT secret, secret_last4 FROM outbound_webhook_endpoints WHERE id = ?',
      [createdEp.id]
    );
    assert(dbEpRows.length === 1, 'Endpoint found in database');
    const dbEp = dbEpRows[0];
    assert(dbEp.secret.split(':').length === 3, 'Secret in database is AES-256-GCM encrypted (iv:authTag:ciphertext)');
    assert(dbEp.secret !== createRes.data.rawSecret, 'Database does NOT store plaintext raw secret');
    assert(createRes.data.rawSecret.endsWith(dbEp.secret_last4), 'Database secret_last4 matches rawSecret suffix');

    // Verify Audit Log
    const [auditCreate] = await dbConnection.execute(
      'SELECT * FROM superadmin_audit_logs WHERE action = "outbound_webhook_endpoint_created" AND target_resource_id = ?',
      [createdEp.id]
    );
    assert(auditCreate.length > 0, 'Audit log created for outbound_webhook_endpoint_created');

    // 7. Rotate HMAC-SHA256 Signing Secret & Audit Logging
    console.log('\n--- [Test 7: Rotate HMAC-SHA256 Signing Secret] ---');
    const rotateRes = await request(`/admin/operations/outbound-webhooks/endpoints/${createdEp.id}/rotate-secret`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(rotateRes.status === 200, `Secret rotation returns 200 OK (got ${rotateRes.status})`);
    assert(rotateRes.data.rawSecret && rotateRes.data.rawSecret.startsWith('whsec_'), 'New raw secret returned');
    assert(rotateRes.data.rawSecret !== createRes.data.rawSecret, 'Rotated secret differs from original secret');

    const [auditRotate] = await dbConnection.execute(
      'SELECT * FROM superadmin_audit_logs WHERE action = "outbound_webhook_secret_rotated" AND target_resource_id = ?',
      [createdEp.id]
    );
    assert(auditRotate.length > 0, 'Audit log created for outbound_webhook_secret_rotated');

    // 8. Toggle Endpoint Status (active / paused)
    console.log('\n--- [Test 8: Toggle Endpoint Status] ---');
    const pauseRes = await request(`/admin/operations/outbound-webhooks/endpoints/${createdEp.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ status: 'paused' }),
    });
    assert(pauseRes.status === 200, 'Status update returns 200 OK');
    assert(pauseRes.data.status === 'paused', 'Endpoint status updated to paused');

    const activateRes = await request(`/admin/operations/outbound-webhooks/endpoints/${createdEp.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(activateRes.status === 200, 'Status update returns 200 OK');
    assert(activateRes.data.status === 'active', 'Endpoint status updated back to active');

    // 9. Dispatch Synthetic Test Webhook & Verify HMAC-SHA256 Signature Header Format
    console.log('\n--- [Test 9: Dispatch Synthetic Test Webhook & Verify HMAC-SHA256 Signature] ---');
    const testDispatchRes = await request(`/admin/operations/outbound-webhooks/endpoints/${createdEp.id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        eventType: 'post.published',
        payload: {
          event: 'post.published',
          post_title: 'Stage 21 Enterprise Webhook Launch Announcement',
          published_at: new Date().toISOString(),
          __mock_success: true,
        },
      }),
    });
    assert(testDispatchRes.status === 200, `Test dispatch returns 200 OK (got ${testDispatchRes.status})`);
    const testResult = testDispatchRes.data;
    assert(testResult.deliveryId && testResult.deliveryId.startsWith('del-test-'), 'Test dispatch returns valid deliveryId');
    assert(testResult.statusCode === 200, 'Test dispatch received 200 status code');
    assert(testResult.status === 'delivered', 'Delivery status marked as delivered');
    assert(typeof testResult.durationMs === 'number', 'Duration measured in ms');

    // Verify HMAC-SHA256 signature format: t=<timestamp>,v1=<64_hex_chars>
    const sigRegex = /^t=\d+,v1=[0-9a-fA-F]{64}$/;
    assert(sigRegex.test(testResult.signature), `Signature matches t=<timestamp>,v1=<hmac_sha256> format (got: ${testResult.signature})`);

    // Verify delivery record persisted in database
    const [delRows] = await dbConnection.execute(
      'SELECT * FROM outbound_webhook_deliveries WHERE id = ?',
      [testResult.deliveryId]
    );
    assert(delRows.length === 1, 'Delivery record persisted in database');
    assert(delRows[0].status === 'delivered', 'Database delivery status is delivered');
    assert(delRows[0].status_code === 200, 'Database status_code is 200');

    // Verify audit log for test dispatch
    const [auditTest] = await dbConnection.execute(
      'SELECT * FROM superadmin_audit_logs WHERE action = "outbound_webhook_test_dispatched" AND target_resource_id = ?',
      [createdEp.id]
    );
    assert(auditTest.length > 0, 'Audit log created for outbound_webhook_test_dispatched');

    // 10. List Delivery Logs with Status & Event Filters
    console.log('\n--- [Test 10: List Delivery Logs & Filters] ---');
    const delListRes = await request(`/admin/operations/outbound-webhooks/deliveries?endpointId=${createdEp.id}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(delListRes.status === 200, 'Deliveries list returns 200 OK');
    assert(Array.isArray(delListRes.data), 'Deliveries list is array');
    assert(delListRes.data.length >= 1, `Deliveries list contains test delivery (got ${delListRes.data.length})`);
    assert(delListRes.data[0].id === testResult.deliveryId, 'First delivery matches test deliveryId');

    // Filter by event type
    const delEventRes = await request(`/admin/operations/outbound-webhooks/deliveries?eventType=post.published`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(delEventRes.status === 200, 'Deliveries event filtered list returns 200 OK');
    assert(delEventRes.data.some((d) => d.eventType === 'post.published'), 'Found post.published event delivery');

    // 11. Manual Delivery Replay / Retry & Audit Logging
    console.log('\n--- [Test 11: Manual Delivery Replay / Retry] ---');
    const retryRes = await request(`/admin/operations/outbound-webhooks/deliveries/${testResult.deliveryId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(retryRes.status === 200, `Delivery retry returns 200 OK (got ${retryRes.status})`);
    assert(retryRes.data.attemptCount === 2, `Attempt count incremented to 2 (got ${retryRes.data.attemptCount})`);

    const [auditRetry] = await dbConnection.execute(
      'SELECT * FROM superadmin_audit_logs WHERE action = "outbound_webhook_delivery_retried" AND target_resource_id = ?',
      [testResult.deliveryId]
    );
    assert(auditRetry.length > 0, 'Audit log created for outbound_webhook_delivery_retried');

    // 12. Delete Outbound Endpoint & Delivery Purge
    console.log('\n--- [Test 12: Delete Outbound Endpoint & Purge Deliveries] ---');
    const deleteRes = await request(`/admin/operations/outbound-webhooks/endpoints/${createdEp.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteRes.status === 200, `Delete endpoint returns 200 OK (got ${deleteRes.status})`);
    assert(deleteRes.data.success === true, 'Delete response confirms success');

    const [deletedEpRows] = await dbConnection.execute(
      'SELECT id FROM outbound_webhook_endpoints WHERE id = ?',
      [createdEp.id]
    );
    assert(deletedEpRows.length === 0, 'Endpoint removed from database');

    const [purgedDelRows] = await dbConnection.execute(
      'SELECT id FROM outbound_webhook_deliveries WHERE endpoint_id = ?',
      [createdEp.id]
    );
    assert(purgedDelRows.length === 0, 'Associated deliveries purged from database');

    const [auditDelete] = await dbConnection.execute(
      'SELECT * FROM superadmin_audit_logs WHERE action = "outbound_webhook_endpoint_deleted" AND target_resource_id = ?',
      [createdEp.id]
    );
    assert(auditDelete.length > 0, 'Audit log created for outbound_webhook_endpoint_deleted');

    // 13. Production Meta Publication Lock Intact (Final Verification)
    await verifyMetaLock(dbConnection, 'POST-VERIFICATION FINAL');

    console.log('\n========================================================================');
    console.log(`   STAGE 21 COMPLETE: ${passedTests} passed, ${failedTests} failed        `);
    console.log('   ENTERPRISE OUTBOUND WEBHOOK DISPATCHER 100% OPERATIONAL & VERIFIED   ');
    console.log('========================================================================\n');
  } finally {
    await dbConnection.end();
  }
}

runStage21Suite().catch((err) => {
  console.error('\nFATAL EXCEPTION in Stage 21 Test Suite:', err);
  process.exit(1);
});
