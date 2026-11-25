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

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE SUPERADMIN OPERATIONS TEST SUITE                        ');
  console.log('   11 Admin Views • Safe Actions • Guarded Impersonation • Meta Lock  ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Identify or setup test superadmin user and regular non-admin user
    const [superadminUsers] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id, tu.role 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 AND u.is_active = 1 
       LIMIT 1`
    );

    let superadmin = superadminUsers[0];
    if (!superadmin) {
      // Create or promote a superadmin
      const [allUsers] = await connection.execute(
        `SELECT u.id, u.email, tu.tenant_id, tu.role 
         FROM users u 
         JOIN tenant_users tu ON u.id = tu.user_id 
         LIMIT 1`
      );
      const targetUser = allUsers[0];
      await connection.execute(`UPDATE users SET is_superadmin = 1 WHERE id = ?`, [targetUser.id]);
      superadmin = { ...targetUser, role: targetUser.role || 'agency_admin' };
    }

    // Identify a non-superadmin user
    const [regularUsers] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       LEFT JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    let regularUser = regularUsers[0];
    if (!regularUser) {
      const regId = '00000000-0000-0000-0000-000000000099';
      await connection.execute(
        `INSERT IGNORE INTO users (id, email, password_hash, is_active, is_superadmin, created_at, updated_at) 
         VALUES (?, 'regular@socialforge.ai', 'hash', 1, 0, NOW(), NOW())`,
        [regId]
      );
      regularUser = { id: regId, email: 'regular@socialforge.ai', tenant_id: superadmin.tenant_id };
    }

    // Get an active test tenant
    const [tenants] = await connection.execute(`SELECT id, name, slug FROM tenants LIMIT 2`);
    const testTenant = tenants[0];
    assert(Boolean(testTenant), `Active tenant found: ${testTenant?.name} (${testTenant?.id})`);

    // Sign JWT tokens
    const superadminToken = jwt.sign(
      {
        userId: superadmin.id,
        email: superadmin.email,
        tenantId: superadmin.tenant_id,
        role: superadmin.role || 'agency_admin',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        tenantId: regularUser.tenant_id,
        role: 'creator',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const superadminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superadminToken}`,
    };

    const regularHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regularToken}`,
    };

    // -------------------------------------------------------------------------
    // TEST 1: Security & Permission Guard (Non-superadmin blocked)
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 1] Security & Permission Guard: Enforcing Superadmin Privilege ---');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/tenants`);
    assert(unauthRes.status === 401, `Unauthenticated request rejected with HTTP 401 (${unauthRes.status})`);

    const regRes = await fetch(`${BASE_URL}/admin/operations/tenants`, { headers: regularHeaders });
    assert(regRes.status === 403, `Non-superadmin user rejected with HTTP 403 (${regRes.status})`);

    const authRes = await fetch(`${BASE_URL}/admin/operations/tenants`, { headers: superadminHeaders });
    assert(authRes.status === 200, `Superadmin user authenticated successfully with HTTP 200 (${authRes.status})`);

    // -------------------------------------------------------------------------
    // TEST 2: Tenant Operations & Deep Telemetry Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 2] Tenant Search & Deep Detail Telemetry ---');
    const tenantSearchRes = await fetch(`${BASE_URL}/admin/operations/tenants?search=${encodeURIComponent(testTenant.name.slice(0, 4))}`, {
      headers: superadminHeaders,
    });
    const tenantSearchData = await tenantSearchRes.json();
    assert(tenantSearchRes.ok && tenantSearchData.success, 'GET /admin/operations/tenants search succeeded');
    assert(Array.isArray(tenantSearchData.data.items), 'Tenant items returned as array');
    assert(tenantSearchData.data.items.length > 0, `Search found matching tenant: ${tenantSearchData.data.items[0]?.name}`);

    const tenantDetailRes = await fetch(`${BASE_URL}/admin/operations/tenants/${testTenant.id}`, {
      headers: superadminHeaders,
    });
    const tenantDetailData = await tenantDetailRes.json();
    if (!tenantDetailRes.ok) console.error('Tenant detail failed with error:', tenantDetailData);
    assert(tenantDetailRes.ok && tenantDetailData.success, `GET /admin/operations/tenants/${testTenant.id} succeeded`);
    assert(Array.isArray(tenantDetailData.data.brands), 'Tenant brands list present');
    assert(Array.isArray(tenantDetailData.data.members), 'Tenant team members list present');
    assert(Boolean(tenantDetailData.data.usage), 'Tenant usage against quota present');
    assert(typeof tenantDetailData.data.postsPublishedCount === 'number', 'Posts published counter numeric');

    // -------------------------------------------------------------------------
    // TEST 3: Safe Support Action: Subscription Adjustment Safeguards
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 3] Subscription Plan Adjustment Safeguards & Audit ---');
    // Missing confirmation
    const noConfRes = await fetch(`${BASE_URL}/admin/operations/tenants/${testTenant.id}/subscription`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        planId: 'growth',
        reason: 'Valid justification reason for plan update',
        confirmation: false,
      }),
    });
    assert(noConfRes.status === 400, `Subscription update without confirmation rejected with 400 (${noConfRes.status})`);

    // Missing reason
    const noReasonRes = await fetch(`${BASE_URL}/admin/operations/tenants/${testTenant.id}/subscription`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        planId: 'growth',
        reason: 'short',
        confirmation: true,
      }),
    });
    assert(noReasonRes.status === 400, `Subscription update with insufficient reason rejected with 400 (${noReasonRes.status})`);

    // Valid guarded update
    const validSubRes = await fetch(`${BASE_URL}/admin/operations/tenants/${testTenant.id}/subscription`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        planId: 'growth',
        reason: 'Authorized plan change per ticket SF-SUPPORT-1029',
        confirmation: true,
      }),
    });
    const validSubData = await validSubRes.json();
    assert(validSubRes.ok && validSubData.success, 'Guarded subscription update succeeded');
    assert(validSubData.data.planId === 'growth', 'Tenant subscription plan successfully updated to growth');

    // Verify audit log created
    const [subAuditRows] = await connection.execute(
      `SELECT * FROM superadmin_audit_logs 
       WHERE action = 'UPDATE_TENANT_SUBSCRIPTION' AND target_tenant_id = ? 
       ORDER BY created_at DESC LIMIT 1`,
      [testTenant.id]
    );
    assert(subAuditRows.length > 0, 'Audit log record verified in database for subscription change');

    // -------------------------------------------------------------------------
    // TEST 4: Platform Usage Overview
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 4] Platform-Wide Usage & Over-Quota Telemetry ---');
    const usageRes = await fetch(`${BASE_URL}/admin/operations/usage`, { headers: superadminHeaders });
    const usageData = await usageRes.json();
    assert(usageRes.ok && usageData.success, 'GET /admin/operations/usage succeeded');
    assert(typeof usageData.data.totalTenants === 'number', 'totalTenants is numeric');
    assert(typeof usageData.data.totalPublishedPosts === 'number', 'totalPublishedPosts is numeric');
    assert(typeof usageData.data.totalActiveConnections === 'number', 'totalActiveConnections is numeric');
    assert(Array.isArray(usageData.data.highUsageTenants), 'highUsageTenants array present');

    // -------------------------------------------------------------------------
    // TEST 5: Provider Health Telemetry
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 5] Provider Health & SLA Monitoring ---');
    const providerRes = await fetch(`${BASE_URL}/admin/operations/provider-health`, { headers: superadminHeaders });
    const providerData = await providerRes.json();
    assert(providerRes.ok && providerData.success, 'GET /admin/operations/provider-health succeeded');
    assert(Array.isArray(providerData.data), 'Provider health returned as array');
    assert(providerData.data.length >= 7, `Returned ${providerData.data.length} providers (Meta, X, LinkedIn, etc.)`);
    const metaProvider = providerData.data.find((p) => p.provider === 'meta');
    assert(Boolean(metaProvider), 'Meta Graph API provider health monitored');
    assert(metaProvider.uptimePercent >= 95, `Meta uptime within SLA: ${metaProvider.uptimePercent}%`);

    // -------------------------------------------------------------------------
    // TEST 6: Connection Health & Masked Credentials Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 6] Connection Health & Zero Raw Credentials Invariant ---');
    const connRes = await fetch(`${BASE_URL}/admin/operations/connections`, { headers: superadminHeaders });
    const connData = await connRes.json();
    assert(connRes.ok && connData.success, 'GET /admin/operations/connections succeeded');
    assert(Array.isArray(connData.data.items), 'Connections items returned as array');

    for (const c of connData.data.items) {
      assert(
        !c.access_token && !c.token && !c.client_secret,
        `Zero raw credentials exposed on connection ${c.id}`
      );
      assert(
        c.credentialRefMasked.startsWith('[VAULT_REF_AES256:') || c.credentialRefMasked.startsWith('[NO_CREDENTIAL_REF]'),
        `Credential reference is properly sanitized and masked: ${c.credentialRefMasked}`
      );
    }

    if (connData.data.items.length > 0) {
      const testConn = connData.data.items[0];
      const pingRes = await fetch(`${BASE_URL}/admin/operations/connections/${testConn.id}/test`, {
        method: 'POST',
        headers: superadminHeaders,
        body: JSON.stringify({ reason: 'Routine connectivity health verification' }),
      });
      const pingData = await pingRes.json();
      assert(pingRes.ok && pingData.success, `Safe health check ping succeeded for connection ${testConn.id}`);
      assert(typeof pingData.data.latencyMs === 'number', `Latency measured: ${pingData.data.latencyMs}ms`);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Automation Health & Failed Run Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 7] Automation Health & Step Failure Traces ---');
    const autoRes = await fetch(`${BASE_URL}/admin/operations/automations`, { headers: superadminHeaders });
    const autoData = await autoRes.json();
    assert(autoRes.ok && autoData.success, 'GET /admin/operations/automations succeeded');
    assert(Array.isArray(autoData.data.items), 'Automations items returned as array');

    const failAutoRes = await fetch(`${BASE_URL}/admin/operations/automations/failures`, { headers: superadminHeaders });
    const failAutoData = await failAutoRes.json();
    assert(failAutoRes.ok && failAutoData.success, 'GET /admin/operations/automations/failures succeeded');
    assert(Array.isArray(failAutoData.data.items), 'Failed automations returned as array');

    // -------------------------------------------------------------------------
    // TEST 8: Queue Health & Worker Failure Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 8] Queue Health & Worker Failures ---');
    const queueRes = await fetch(`${BASE_URL}/admin/operations/queues`, { headers: superadminHeaders });
    const queueData = await queueRes.json();
    assert(queueRes.ok && queueData.success, 'GET /admin/operations/queues succeeded');
    assert(Array.isArray(queueData.data), 'Queues list returned as array');
    const pubQueue = queueData.data.find((q) => q.queueName === 'publishing_jobs_queue');
    assert(Boolean(pubQueue), 'publishing_jobs_queue is monitored');

    const workerFailRes = await fetch(`${BASE_URL}/admin/operations/workers/failures`, { headers: superadminHeaders });
    const workerFailData = await workerFailRes.json();
    assert(workerFailRes.ok && workerFailData.success, 'GET /admin/operations/workers/failures succeeded');
    assert(Array.isArray(workerFailData.data.items), 'Worker failures returned as array');

    // -------------------------------------------------------------------------
    // TEST 9: Rate-Limit Errors (429 Telemetry)
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 9] Rate-Limit Errors (HTTP 429) Telemetry ---');
    // Insert a simulated rate limit incident to test telemetry tracking
    await connection.execute(
      `INSERT INTO provider_health_incidents 
       (id, provider, incident_type, status_code, error_code, error_message, affected_tenant_id, retry_after_seconds, created_at)
       VALUES (UUID(), 'meta', 'RATE_LIMIT_429', 429, 'META_RATE_LIMIT', 'Meta Graph API call limit reached (Code 4).', ?, 300, NOW())`,
      [testTenant.id]
    );

    const rateRes = await fetch(`${BASE_URL}/admin/operations/rate-limits`, { headers: superadminHeaders });
    const rateData = await rateRes.json();
    assert(rateRes.ok && rateData.success, 'GET /admin/operations/rate-limits succeeded');
    assert(Array.isArray(rateData.data.activeRateLimits), 'activeRateLimits array present');
    assert(rateData.data.activeRateLimits.length > 0, 'Simulated active rate limit tracked with cooldown');
    assert(
      typeof rateData.data.activeRateLimits[0]?.resetCountdownSeconds === 'number',
      `Countdown active: ${rateData.data.activeRateLimits[0]?.resetCountdownSeconds}s remaining`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Dead-Letter Queue (DLQ) Recovery Safeguards
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 10] DLQ Recovery Safeguards & Retries ---');
    // Insert a dead-lettered publishing job for testing
    const dlqJobId = '00000000-0000-0000-0000-000000000888';
    await connection.execute(
      `INSERT INTO publishing_jobs 
       (id, tenant_id, brand_id, user_id, platform, account_id, status, attempt_count, max_attempts, last_error, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'x_twitter', 'tw_123', 'dead_letter', 3, 3, 'Network timeout after 3 attempts', NOW(), NOW())
       ON DUPLICATE KEY UPDATE status = 'dead_letter'`,
      [dlqJobId, testTenant.id, (await connection.execute('SELECT id FROM brands LIMIT 1'))[0][0].id, superadmin.id]
    );

    const dlqListRes = await fetch(`${BASE_URL}/admin/operations/dlq`, { headers: superadminHeaders });
    const dlqListData = await dlqListRes.json();
    assert(dlqListRes.ok && dlqListData.success, 'GET /admin/operations/dlq succeeded');
    const dlqItem = dlqListData.data.items.find((i) => i.id === dlqJobId);
    assert(Boolean(dlqItem), `Dead-letter job ${dlqJobId.slice(0, 8)} listed in DLQ`);

    // Missing confirmation
    const retryNoConf = await fetch(`${BASE_URL}/admin/operations/dlq/${dlqJobId}/retry`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ reason: 'Valid reason', confirmation: false }),
    });
    assert(retryNoConf.status === 400, `DLQ retry without confirmation rejected with 400 (${retryNoConf.status})`);

    // Valid guarded retry
    const retryValid = await fetch(`${BASE_URL}/admin/operations/dlq/${dlqJobId}/retry`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        reason: 'Authorized retry after Twitter API restored',
        confirmation: true,
        force: true,
      }),
    });
    const retryValidData = await retryValid.json();
    assert(retryValid.ok && retryValidData.success, 'Guarded DLQ retry succeeded');
    assert(retryValidData.data.status === 'scheduled', 'Job status successfully reset to scheduled');

    // Clean up test job
    await connection.execute(`DELETE FROM publishing_jobs WHERE id = ?`, [dlqJobId]);

    // -------------------------------------------------------------------------
    // TEST 11: Entitlement Management & Safe Override
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 11] Entitlement Override Safeguards & Audit ---');
    const entRes = await fetch(`${BASE_URL}/admin/operations/tenants/${testTenant.id}/entitlements`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        resource: 'posts',
        limitValue: 500,
        isEnabled: true,
        reason: 'Authorized 500 post limit override per ticket SF-SUPPORT-4029',
        confirmation: true,
      }),
    });
    const entData = await entRes.json();
    assert(entRes.ok && entData.success, 'Guarded entitlement override succeeded');
    assert(entData.data.newLimit === 500, 'New entitlement limit set to 500');

    // -------------------------------------------------------------------------
    // TEST 12: Audited Tenant Impersonation Safeguards
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 12] Audited Tenant Impersonation Safeguards ---');
    // Missing ticket
    const impNoTicket = await fetch(`${BASE_URL}/admin/operations/impersonate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        tenantId: testTenant.id,
        reason: 'Investigating customer billing failure',
        confirmation: true,
      }),
    });
    assert(impNoTicket.status === 400, `Impersonation without ticket reference rejected with 400 (${impNoTicket.status})`);

    // Valid audited impersonation session
    const impValid = await fetch(`${BASE_URL}/admin/operations/impersonate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        tenantId: testTenant.id,
        ticketReference: 'SF-SUPPORT-9281',
        reason: 'Investigating customer connection disconnect issue',
        durationMinutes: 15,
        confirmation: true,
      }),
    });
    const impValidData = await impValid.json();
    assert(impValid.status === 201 && impValidData.success, 'Audited support session successfully created (201)');
    assert(Boolean(impValidData.data.sessionToken), 'Cryptographically secure session token generated');
    assert(impValidData.data.durationMinutes === 15, 'Session duration enforced at 15 minutes');

    // Revoke session
    const revokeRes = await fetch(`${BASE_URL}/admin/operations/impersonate/${impValidData.data.sessionId}/revoke`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ reason: 'Diagnostic testing completed' }),
    });
    const revokeData = await revokeRes.json();
    assert(revokeRes.ok && revokeData.success, 'Support session successfully revoked and audited');

    // -------------------------------------------------------------------------
    // TEST 13: Immutable Audit Logs Verification
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 13] Immutable Audit Trail Verification ---');
    const auditRes = await fetch(`${BASE_URL}/admin/operations/audit-logs`, { headers: superadminHeaders });
    const auditData = await auditRes.json();
    assert(auditRes.ok && auditData.success, 'GET /admin/operations/audit-logs succeeded');
    assert(Array.isArray(auditData.data.items), 'Audit items returned as array');
    assert(auditData.data.items.length >= 3, `Audit trail contains ${auditData.data.items.length} logged actions`);

    const hasImpAudit = auditData.data.items.some((a) => a.action === 'CREATE_AUDITED_IMPERSONATION_SESSION');
    assert(hasImpAudit, 'Impersonation session creation is logged in immutable audit trail');

    // -------------------------------------------------------------------------
    // TEST 14: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 14] Production Meta Publication Lock Invariant ---');
    const [metaPostRows] = await connection.execute(
      `SELECT remote_post_id, status, platform 
       FROM post_variants 
       WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(metaPostRows.length > 0, 'Production Meta post variant exists in database');
    assert(metaPostRows[0]?.status === 'published', `Production Meta variant status is strictly 'published': ${metaPostRows[0]?.status}`);
    assert(metaPostRows[0]?.platform === 'facebook', `Platform is facebook: ${metaPostRows[0]?.platform}`);

    const [metaJobRows] = await connection.execute(
      `SELECT id, status, platform 
       FROM publishing_jobs 
       WHERE id = '256cf21a-26cd-4032-a7b8-17261d8a81b1'`
    );
    assert(metaJobRows[0]?.status === 'published', 'Production Meta publishing job remains locked in published status');

  } catch (err) {
    console.error('Test execution error:', err);
    failedTests++;
  } finally {
    await connection.end();
  }

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('========================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main();
