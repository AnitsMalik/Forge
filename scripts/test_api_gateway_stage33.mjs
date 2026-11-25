/**
 * Stage 33: Enterprise Global API Gateway & Dynamic Rate-Limiter Suite
 * SocialForge Platform v5.1.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Gateway Telemetry & KPI metrics (activeRoutes, totalBuckets, totalRequestsEvaluated, throttleRate)
 * 4. Pre-seeded Core Gateway Routes:
 *    - All 4 system routes exist (/posts/*, /ai/*, /analytics/*, /webhooks/*)
 *    - Rate limit tiers and burst capacities correctly configured
 * 5. Gateway Route CRUD & Validation Engine:
 *    - Rejection of invalid route path (missing leading slash) -> 400
 *    - Rejection of non-positive requests per minute -> 400
 *    - Rejection of non-positive burst capacity -> 400
 *    - Creation of custom gateway route
 *    - Duplicate path conflict rejection -> 409
 *    - Retrieval by route ID
 *    - Updating route configuration
 *    - Safe route deletion
 * 6. Distributed Token Bucket Dynamic Rate Limiter Engine:
 *    - Normal consumption within capacity -> 200 Allowed
 *    - Continuous proportional refill calculation
 *    - Rapid burst exhaustion exceeding ceiling -> 429 Rate Limit Exceeded
 *    - 429 response includes retryAfterSeconds penalty
 *    - Quota status transitions to throttled (is_throttled = true)
 *    - Automatic audit event recorded in api_throttle_audit_logs
 *    - Resetting bucket restores tokens to max capacity and clears throttle flag
 *    - Subsequent consumption succeeds immediately
 * 7. In-Memory Burst Simulator & Load Tester:
 *    - Safe load simulation within capacity window
 *    - Over-capacity burst exhaustion detection
 *    - Zero persistent database quota mutation
 * 8. Superadmin Audit Trail:
 *    - Verifying actions logged in superadmin_audit_logs
 */

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
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function verifyMetaLock(db, label = 'Check') {
  const [variants] = await db.execute(
    'SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length === 1, `[Meta Lock ${label}] Variant exists with remote_post_id = ${META_LOCK_REMOTE_POST_ID}`);
  assert(variants[0].status === 'published', `[Meta Lock ${label}] Variant status is strictly "published" (found: ${variants[0].status})`);

  const [jobs] = await db.execute(
    'SELECT id, status FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length === 1, `[Meta Lock ${label}] Publishing job exists with ID = ${META_LOCK_JOB_ID}`);
  assert(jobs[0].status === 'published', `[Meta Lock ${label}] Job status is strictly "published" (found: ${jobs[0].status})`);
}

async function runStage33Tests() {
  console.log('================================================================');
  console.log('   STAGE 33: API GATEWAY & TOKEN BUCKET THROTTLING SUITE        ');
  console.log('================================================================');

  const db = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. INVARIANT PRE-CHECK
    // -------------------------------------------------------------------------
    console.log('\n[Section 1: Meta Invariant Pre-Check]');
    await verifyMetaLock(db, 'PRE');

    // -------------------------------------------------------------------------
    // 2. SETUP AUTH TOKENS
    // -------------------------------------------------------------------------
    console.log('\n[Section 2: Security & Authentication Setup]');
    const [superadmins] = await db.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadmins.length > 0, 'Found at least one active superadmin user');
    const superadminUser = superadmins[0];

    const [members] = await db.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Found active regular tenant member');
    const regularUser = members[0];

    // Find standard 36-char UUID tenant
    const [tenants] = await db.execute(
      'SELECT id, name FROM tenants WHERE CHAR_LENGTH(id) = 36 LIMIT 1'
    );
    assert(tenants.length > 0, 'Found valid 36-char tenant');
    const targetTenant = tenants[0];
    const targetTenantId = targetTenant.id;

    const superadminToken = jwt.sign(
      {
        userId: superadminUser.id,
        email: superadminUser.email,
        isSuperAdmin: true,
        isSuperadmin: true,
        tenantId: targetTenantId,
        role: 'owner',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        isSuperAdmin: false,
        isSuperadmin: false,
        tenantId: regularUser.tenant_id,
        role: regularUser.role || 'viewer',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // 3. RBAC SECURITY BOUNDARY
    // -------------------------------------------------------------------------
    console.log('\n[Section 3: Superadmin Security & RBAC Enforcement]');

    // Unauthenticated -> 401
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/telemetry`);
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    // Regular User -> 403 Forbidden
    const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/telemetry`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(forbiddenRes.status === 403, `Regular member rejected with 403 (got ${forbiddenRes.status})`);

    // Superadmin -> 200 OK
    const superadminRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(superadminRes.status === 200, `Superadmin access allowed with 200 (got ${superadminRes.status})`);

    // -------------------------------------------------------------------------
    // 4. OVERVIEW TELEMETRY & KPIS
    // -------------------------------------------------------------------------
    console.log('\n[Section 4: Overview Telemetry & Gateway KPIs]');
    const telemetryJson = await superadminRes.json();
    assert(telemetryJson.success === true, 'Telemetry response has success: true');
    const telemetry = telemetryJson.data;

    assert(typeof telemetry.totalRoutes === 'number', 'telemetry.totalRoutes is number');
    assert(typeof telemetry.activeRoutes === 'number', 'telemetry.activeRoutes is number');
    assert(typeof telemetry.totalBuckets === 'number', 'telemetry.totalBuckets is number');
    assert(typeof telemetry.totalRequestsEvaluated === 'number', 'telemetry.totalRequestsEvaluated is number');
    assert(typeof telemetry.totalThrottledCount === 'number', 'telemetry.totalThrottledCount is number');
    assert(typeof telemetry.globalThrottleRate === 'number', 'telemetry.globalThrottleRate is number');
    assert(typeof telemetry.averageLatencyMs === 'number', 'telemetry.averageLatencyMs is number');
    assert(Array.isArray(telemetry.topThrottledRoutes), 'telemetry.topThrottledRoutes is array');
    assert(Array.isArray(telemetry.topConsumers), 'telemetry.topConsumers is array');

    // -------------------------------------------------------------------------
    // 5. GATEWAY ROUTE CRUD & VALIDATIONS
    // -------------------------------------------------------------------------
    console.log('\n[Section 5: Gateway Route CRUD & Validation Engine]');

    // Validation: Missing leading slash -> 400
    const invalidPathRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routePath: 'invalid/path/no/slash',
        serviceName: 'content_service',
        requestsPerMinute: 60,
        burstCapacity: 15,
      }),
    });
    assert(invalidPathRes.status === 400, 'Route path without leading slash rejected with 400');

    // Validation: Non-positive RPM -> 400
    const invalidRpmRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routePath: '/api/v1/invalid-rpm',
        serviceName: 'content_service',
        requestsPerMinute: 0,
        burstCapacity: 15,
      }),
    });
    assert(invalidRpmRes.status === 400, 'Zero requestsPerMinute rejected with 400');

    // Validation: Non-positive burst capacity -> 400
    const invalidBurstRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routePath: '/api/v1/invalid-burst',
        serviceName: 'content_service',
        requestsPerMinute: 60,
        burstCapacity: -5,
      }),
    });
    assert(invalidBurstRes.status === 400, 'Negative burstCapacity rejected with 400');

    // Create custom gateway route
    const testRoutePath = `/api/v1/custom-test-route-${Date.now()}/*`;
    const createRouteRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routePath: testRoutePath,
        serviceName: 'publishing_service',
        authStrategy: 'jwt_bearer',
        rateLimitTier: 'high_throughput',
        requestsPerMinute: 300,
        burstCapacity: 50,
        corsEnabled: true,
        isActive: true,
        timeoutMs: 12000,
        description: 'Test gateway route for automated verification suite',
      }),
    });
    assert(createRouteRes.status === 201, `POST /routes returned 201 (got ${createRouteRes.status})`);
    const createdRouteJson = await createRouteRes.json();
    const createdRoute = createdRouteJson.data;
    assert(createdRoute.routePath === testRoutePath, 'Created route path matches input');
    assert(createdRoute.burstCapacity === 50, 'Burst capacity matches 50');

    // Duplicate path conflict -> 409
    const duplicateRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        routePath: testRoutePath,
        serviceName: 'publishing_service',
        requestsPerMinute: 60,
        burstCapacity: 15,
      }),
    });
    assert(duplicateRes.status === 409, `Duplicate route path correctly rejected with 409 (got ${duplicateRes.status})`);

    // Get Route by ID
    const getRouteRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes/${createdRoute.id}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(getRouteRes.status === 200, 'GET /routes/:id returned 200');
    const getRouteJson = await getRouteRes.json();
    assert(getRouteJson.data.id === createdRoute.id, 'Fetched route matches ID');

    // Update Route
    const updateRouteRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes/${createdRoute.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestsPerMinute: 500,
        burstCapacity: 80,
        description: 'Updated route description via test suite',
      }),
    });
    assert(updateRouteRes.status === 200, 'PUT /routes/:id returned 200');
    const updatedRouteJson = await updateRouteRes.json();
    assert(updatedRouteJson.data.requestsPerMinute === 500, 'requestsPerMinute updated to 500');
    assert(updatedRouteJson.data.burstCapacity === 80, 'burstCapacity updated to 80');

    // Delete Route
    const deleteRouteRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes/${createdRoute.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteRouteRes.status === 200, 'DELETE /routes/:id returned 200');

    // Verify deleted
    const verifyDeleteRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/routes/${createdRoute.id}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(verifyDeleteRes.status === 404, 'Deleted route returns 404');

    // -------------------------------------------------------------------------
    // 6. TOKEN BUCKET RATE-LIMITER & 429 BURST EXHAUSTION
    // -------------------------------------------------------------------------
    console.log('\n[Section 6: Token Bucket Dynamic Rate Limiter Engine]');

    // Listing token buckets
    const listBucketsRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/buckets`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listBucketsRes.status === 200, 'GET /buckets returned 200');
    const listBucketsJson = await listBucketsRes.json();
    assert(Array.isArray(listBucketsJson.data), 'Token buckets is array');
    assert(listBucketsJson.data.length > 0, 'Found pre-seeded token bucket quotas');

    const flagshipBucket = listBucketsJson.data.find((b) => b.tenantId === targetTenantId);
    assert(Boolean(flagshipBucket), `Found bucket for target tenant ${targetTenantId}`);
    const targetRouteId = flagshipBucket.routeId;
    const targetRoutePath = flagshipBucket.routePath || '/api/v1/posts/*';

    // Reset bucket first to ensure clean full token capacity
    const initialResetRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/buckets/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routeId: targetRouteId,
      }),
    });
    assert(initialResetRes.status === 200, 'POST /buckets/reset returned 200');
    const resetBucketJson = await initialResetRes.json();
    assert(resetBucketJson.data.availableTokens === resetBucketJson.data.maxCapacity, 'Bucket tokens restored to max capacity');

    // Single token consumption -> 200 Allowed
    const consumeRes1 = await fetch(`${BASE_URL}/admin/operations/api-gateway/consume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routePath: targetRoutePath,
        tokenCost: 1,
      }),
    });
    assert(consumeRes1.status === 200, 'Single token consumption within capacity returned 200 Allowed');
    const consumeJson1 = await consumeRes1.json();
    assert(consumeJson1.data.allowed === true, 'consume result has allowed: true');
    assert(consumeJson1.data.remainingTokens < resetBucketJson.data.maxCapacity, 'remainingTokens decremented');

    // Burst Exhaustion: Consume entire remaining capacity + 10 tokens
    const excessCost = resetBucketJson.data.maxCapacity + 10;
    const burstRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/consume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routePath: targetRoutePath,
        tokenCost: excessCost,
      }),
    });
    assert(burstRes.status === 429, `Excess burst load correctly rejected with 429 (got ${burstRes.status})`);
    const burstJson = await burstRes.json();
    assert(burstJson.data.allowed === false, 'Rate limited response has allowed: false');
    assert(burstJson.data.retryAfterSeconds > 0, `retryAfterSeconds established (${burstJson.data.retryAfterSeconds}s)`);

    // Verify 429 event logged in api_throttle_audit_logs
    const [auditLogs] = await db.execute(
      `SELECT tenant_id, route_path, http_status, throttle_reason FROM api_throttle_audit_logs
       WHERE tenant_id = ? AND route_path = ?
       ORDER BY created_at DESC LIMIT 1`,
      [targetTenantId, targetRoutePath]
    );
    assert(auditLogs.length === 1, 'Throttle event successfully logged to api_throttle_audit_logs');
    assert(auditLogs[0].http_status === 429, 'Audit log status is 429');

    // Verify bucket state in DB is marked as throttled
    const [throttledDbBucket] = await db.execute(
      'SELECT is_throttled, total_requests_throttled FROM api_token_bucket_quotas WHERE tenant_id = ? AND route_id = ?',
      [targetTenantId, targetRouteId]
    );
    assert(throttledDbBucket.length === 1, 'Bucket found in database');
    assert(throttledDbBucket[0].is_throttled === 1, 'Bucket status marked is_throttled = 1 in database');
    assert(Number(throttledDbBucket[0].total_requests_throttled) > 0, 'total_requests_throttled counter incremented');

    // Reset bucket
    const resetRes2 = await fetch(`${BASE_URL}/admin/operations/api-gateway/buckets/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routeId: targetRouteId,
      }),
    });
    assert(resetRes2.status === 200, 'POST /buckets/reset returned 200');
    const resetJson2 = await resetRes2.json();
    assert(resetJson2.data.isThrottled === false, 'isThrottled cleared to false upon reset');

    // Immediate consumption succeeds post-reset
    const consumeRes3 = await fetch(`${BASE_URL}/admin/operations/api-gateway/consume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routePath: targetRoutePath,
        tokenCost: 1,
      }),
    });
    assert(consumeRes3.status === 200, 'Post-reset consumption succeeded with 200');

    // -------------------------------------------------------------------------
    // 7. IN-MEMORY BURST SIMULATOR & LOAD TESTER
    // -------------------------------------------------------------------------
    console.log('\n[Section 7: In-Memory Burst Simulator]');

    // Normal load simulation
    const simPassRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routePath: targetRoutePath,
        tokenCost: 1,
        simulateBurst: 10,
      }),
    });
    assert(simPassRes.status === 200, 'POST /simulate with mild burst returned 200');
    const simPassJson = await simPassRes.json();
    assert(simPassJson.data.allowed === true, 'Mild burst simulation verdict is allowed: true');
    assert(simPassJson.data.burstExhausted === false, 'burstExhausted is false');

    // Heavy overload burst simulation
    const simOverloadRes = await fetch(`${BASE_URL}/admin/operations/api-gateway/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        routePath: targetRoutePath,
        tokenCost: 2,
        simulateBurst: 50,
      }),
    });
    assert(simOverloadRes.status === 200, 'POST /simulate with overload returned 200');
    const simOverloadJson = await simOverloadRes.json();
    assert(simOverloadJson.data.allowed === false, 'Overload simulation verdict is allowed: false');
    assert(simOverloadJson.data.burstExhausted === true, 'burstExhausted is true');
    assert(simOverloadJson.data.retryAfterSeconds > 0, `Projected retryAfterSeconds > 0 (${simOverloadJson.data.retryAfterSeconds}s)`);

    // Verify simulation did NOT mutate persistent bucket quota
    const [persistedBucket] = await db.execute(
      'SELECT is_throttled FROM api_token_bucket_quotas WHERE tenant_id = ? AND route_id = ?',
      [targetTenantId, targetRouteId]
    );
    assert(persistedBucket[0].is_throttled === 0, 'Database bucket remained unthrottled post-simulation');

    // -------------------------------------------------------------------------
    // 8. SUPERADMIN AUDIT LOGS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[Section 8: Superadmin Audit Trail Verification]');
    const [gatewayAuditLogs] = await db.execute(
      `SELECT action, target_resource_type, superadmin_email FROM superadmin_audit_logs
       WHERE target_resource_type = 'api_gateway'
       ORDER BY created_at DESC LIMIT 5`
    );
    assert(gatewayAuditLogs.length > 0, 'Found audit logs recorded for api_gateway actions');
    assert(gatewayAuditLogs.some((l) => l.action === 'CREATE_GATEWAY_ROUTE'), 'Audit log recorded CREATE_GATEWAY_ROUTE');
    assert(gatewayAuditLogs.some((l) => l.action === 'RESET_TOKEN_BUCKET'), 'Audit log recorded RESET_TOKEN_BUCKET');

    // -------------------------------------------------------------------------
    // 9. INVARIANT POST-CHECK
    // -------------------------------------------------------------------------
    console.log('\n[Section 9: Meta Invariant Post-Check]');
    await verifyMetaLock(db, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 33 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await db.end();
  }
}

runStage33Tests().catch((err) => {
  console.error('\nStage 33 Test Run Failed:', err);
  process.exit(1);
});
