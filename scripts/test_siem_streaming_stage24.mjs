/**
 * Stage 24: Enterprise SIEM Streaming & Security Event Exporter Suite
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on SIEM Endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. SIEM Overview Telemetry & Operational Metrics (GET /api/v1/admin/operations/siem/overview)
 * 4. Input Validation & SSRF Protection (Cloud Metadata & Scheme Validation)
 * 5. Destination Lifecycle CRUD & Secret Encryption (Create, Update, Status Toggle, Delete)
 * 6. SIEM Payload Formatter Compliance (Splunk HEC, Datadog JSON, Elastic ECS, ArcSight CEF, RFC 5424 Syslog)
 * 7. Synthetic Security Event Probe Dispatch & SHA-256 Cryptographic Batch Digest
 * 8. SIEM Delivery Logs & Filter Queries (GET /api/v1/admin/operations/siem/logs)
 * 9. Production Meta Publication Lock Intact (Final Verification)
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

async function runStage24Suite() {
  console.log('========================================================================');
  console.log('   STAGE 24: ENTERPRISE SIEM STREAMING & SECURITY EVENT EXPORTER       ');
  console.log('========================================================================\n');

  const dbConnection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Meta Publication Lock Invariant Pre-check
    await verifyMetaLock(dbConnection, 'PRE-CHECK');

    // Clean up test destinations from prior runs
    await dbConnection.execute("DELETE FROM siem_destinations WHERE id NOT IN ('siem-dest-splunk-prod01', 'siem-dest-datadog-sec02')");
    await dbConnection.execute("DELETE FROM siem_delivery_logs WHERE destination_id NOT IN ('siem-dest-splunk-prod01', 'siem-dest-datadog-sec02')");

    // Fetch superadmin and normal user
    const [superadmins] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'Superadmin user exists in database');
    const superadmin = superadmins[0];

    const [normalUsers] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(normalUsers.length > 0, 'Standard tenant user exists in database');
    const normalUser = normalUsers[0];

    const superadminJwt = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, tenantId: superadmin.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const normalUserJwt = jwt.sign(
      { userId: normalUser.id, email: normalUser.email, isSuperadmin: false, tenantId: normalUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ========================================================================
    // 2. Superadmin RBAC & Auth Security on SIEM Endpoints
    // ========================================================================
    console.log('\n--- [2. Superadmin RBAC & Auth Security on SIEM Endpoints] ---');

    const unauthOverview = await request('/admin/operations/siem/overview');
    assert(unauthOverview.status === 401, 'Unauthenticated request to SIEM overview rejected with 401');

    const nonAdminOverview = await request('/admin/operations/siem/overview', {
      headers: { Authorization: `Bearer ${normalUserJwt}` },
    });
    assert(nonAdminOverview.status === 403, 'Non-superadmin request to SIEM overview rejected with 403');

    const superadminOverview = await request('/admin/operations/siem/overview', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(superadminOverview.status === 200, 'Superadmin successfully accesses SIEM overview');
    assert(typeof superadminOverview.data.activeStreams === 'number', 'Overview contains activeStreams count');
    assert(typeof superadminOverview.data.totalEventsDelivered24h === 'number', 'Overview contains totalEventsDelivered24h');
    assert(typeof superadminOverview.data.avgLatencyMs === 'number', 'Overview contains avgLatencyMs');
    assert(typeof superadminOverview.data.deliverySlaPercent === 'number', 'Overview contains deliverySlaPercent');

    const listUnauth = await request('/admin/operations/siem/destinations');
    assert(listUnauth.status === 401, 'Unauthenticated listDestinations rejected with 401');

    const listSuperadmin = await request('/admin/operations/siem/destinations', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(listSuperadmin.status === 200, 'Superadmin successfully lists SIEM destinations');
    assert(Array.isArray(listSuperadmin.data), 'Destinations returned as array');
    assert(listSuperadmin.data.length >= 2, 'Pre-seeded Splunk and Datadog destinations are present');

    // ========================================================================
    // 3. Input Validation & SSRF Protection
    // ========================================================================
    console.log('\n--- [3. Input Validation & SSRF Protection] ---');

    const emptyNameRes = await request('/admin/operations/siem/destinations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: '',
        destinationType: 'splunk_hec',
        payloadFormat: 'splunk_event',
        endpointUrl: 'https://splunk.internal.soc/services/collector/event',
        authSecret: 'splunk_secret_token_123',
      }),
    });
    assert(emptyNameRes.status === 400, 'Creating destination without name rejected with 400');

    const emptyUrlRes = await request('/admin/operations/siem/destinations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: 'Test Stream',
        destinationType: 'splunk_hec',
        payloadFormat: 'splunk_event',
        endpointUrl: '',
        authSecret: 'splunk_secret_token_123',
      }),
    });
    assert(emptyUrlRes.status === 400, 'Creating destination without URL rejected with 400');

    const ssrfRes = await request('/admin/operations/siem/destinations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: 'Malicious SSRF Target',
        destinationType: 'generic_webhook',
        payloadFormat: 'json_ecs',
        endpointUrl: 'http://169.254.169.254/latest/meta-data',
        authSecret: 'secret_123',
      }),
    });
    assert(ssrfRes.status === 400, 'Attempting to register cloud metadata IP (169.254.169.254) blocked with 400');
    assert(
      String(ssrfRes.data.error).includes('Cloud metadata endpoints are strictly blocked'),
      'SSRF defense returns specific security message'
    );

    // ========================================================================
    // 4. SIEM Destination Lifecycle CRUD & Secret Encryption
    // ========================================================================
    console.log('\n--- [4. Destination Lifecycle CRUD & Secret Encryption] ---');

    const rawSecretValue = 'sec_splunk_live_token_stage24_xyz987654321';
    const createDestRes = await request('/admin/operations/siem/destinations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: 'Stage 24 Splunk HEC Security Relay',
        destinationType: 'splunk_hec',
        payloadFormat: 'splunk_event',
        endpointUrl: 'https://splunk-hec.stage24.internal.soc/services/collector/event',
        authSecret: rawSecretValue,
        categories: ['audit', 'auth', 'security'],
        minSeverity: 'warning',
        batchSize: 50,
        rateLimitPerMin: 1200,
      }),
    });
    assert(createDestRes.status === 201, 'SIEM destination created with 201 Created');
    assert(createDestRes.data.id && createDestRes.data.id.startsWith('siem-dest-'), 'Created destination contains unique ID');
    assert(createDestRes.data.name === 'Stage 24 Splunk HEC Security Relay', 'Destination name matches requested');
    assert(createDestRes.data.apiKeyMasked.includes('****4321'), 'API key masked in response showing only last 4 chars');
    assert(!createDestRes.data.apiKeyMasked.includes(rawSecretValue), 'Raw plaintext secret is NOT returned in API response');
    const stage24DestId = createDestRes.data.id;

    // Verify in database that secret is encrypted at rest
    const [dbRows] = await dbConnection.execute(
      'SELECT id, name, encrypted_auth_secret, secret_prefix, status FROM siem_destinations WHERE id = ?',
      [stage24DestId]
    );
    assert(dbRows.length === 1, 'Destination found in MySQL siem_destinations table');
    assert(dbRows[0].encrypted_auth_secret.startsWith('vault:aes256gcm:'), 'Secret stored encrypted at rest with vault envelope');
    assert(!dbRows[0].encrypted_auth_secret.includes(rawSecretValue), 'Raw secret is NOT stored in plaintext in the database');
    assert(dbRows[0].status === 'active', 'Initial status is active');

    // Update Destination Settings
    const updateRes = await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: 'Stage 24 Splunk HEC Security Relay (Hardened)',
        batchSize: 100,
        rateLimitPerMin: 2500,
      }),
    });
    assert(updateRes.status === 200, 'Updating destination returns 200 OK');
    assert(updateRes.data.name === 'Stage 24 Splunk HEC Security Relay (Hardened)', 'Name successfully updated');
    assert(updateRes.data.batchSize === 100, 'Batch size updated to 100');
    assert(updateRes.data.rateLimitPerMin === 2500, 'Rate limit updated to 2500');

    // Toggle Stream Status (Active -> Paused -> Active)
    const pauseRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ status: 'paused' }),
    });
    assert(pauseRes.status === 200, 'Pausing stream returns 200 OK');
    assert(pauseRes.data.status === 'paused', 'Stream status updated to paused');

    const resumeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ status: 'active' }),
    });
    assert(resumeRes.status === 200, 'Resuming stream returns 200 OK');
    assert(resumeRes.data.status === 'active', 'Stream status updated to active');

    // ========================================================================
    // 5. SIEM Payload Formatter Compliance Across All 5 Formats
    // ========================================================================
    console.log('\n--- [5. SIEM Payload Formatter Compliance Across All 5 Formats] ---');

    // Test probe using default Splunk Event format
    const splunkProbeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        category: 'security',
        severity: 'critical',
        action: 'user.brute_force.detected',
        message: 'Multiple failed authentication attempts detected from IP 198.51.100.22',
      }),
    });
    assert(splunkProbeRes.status === 200, 'Splunk event probe returns 200 OK');
    assert(splunkProbeRes.data.success === true, 'Probe reports success: true');
    assert(splunkProbeRes.data.digestSha256 && splunkProbeRes.data.digestSha256.length === 64, 'Batch SHA-256 digest generated (64 hex chars)');
    
    // Parse formatted payload sample
    const splunkPayload = JSON.parse(splunkProbeRes.data.formattedPayloadSample);
    assert(splunkPayload.sourcetype === 'socialforge:json', 'Splunk payload sets sourcetype to socialforge:json');
    assert(splunkPayload.event?.action === 'user.brute_force.detected', 'Splunk event contains action');
    assert(splunkPayload.event?.severity === 'critical', 'Splunk event contains severity: critical');

    // Switch format to Datadog JSON and verify
    await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ payloadFormat: 'datadog_json' }),
    });
    const ddProbeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        category: 'auth',
        severity: 'warning',
        action: 'sso.login.failed',
        message: 'SAML assertion signature verification failed',
      }),
    });
    assert(ddProbeRes.status === 200, 'Datadog probe returns 200 OK');
    const ddPayload = JSON.parse(ddProbeRes.data.formattedPayloadSample);
    assert(ddPayload.ddsource === 'socialforge', 'Datadog payload sets ddsource to socialforge');
    assert(ddPayload.status === 'warn', 'Datadog severity mapped to warn');

    // Switch format to Elastic Common Schema (ECS)
    await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ payloadFormat: 'json_ecs' }),
    });
    const ecsProbeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        category: 'compliance',
        severity: 'notice',
        action: 'gdpr.export.requested',
        message: 'GDPR SAR data archive created',
      }),
    });
    assert(ecsProbeRes.status === 200, 'Elastic ECS probe returns 200 OK');
    const ecsPayload = JSON.parse(ecsProbeRes.data.formattedPayloadSample);
    assert(ecsPayload['ecs.version'] === '8.11.0', 'ECS payload contains ecs.version 8.11.0');
    assert(ecsPayload.event?.action === 'gdpr.export.requested', 'ECS event action matches');

    // Switch format to ArcSight CEF
    await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ payloadFormat: 'cef' }),
    });
    const cefProbeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        category: 'audit',
        severity: 'error',
        action: 'entitlement.override.exceeded',
        message: 'Quota override exceeded safety ceiling',
      }),
    });
    assert(cefProbeRes.status === 200, 'ArcSight CEF probe returns 200 OK');
    assert(cefProbeRes.data.formattedPayloadSample.startsWith('CEF:0|SocialForge|MarketingPlatform|4.2.0|'), 'CEF header conforms to standard');
    assert(cefProbeRes.data.formattedPayloadSample.includes('suser=superadmin@socialforge.ai'), 'CEF extension includes suser attribute');

    // Switch format to RFC 5424 Syslog
    await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ payloadFormat: 'rfc5424_syslog' }),
    });
    const syslogProbeRes = await request(`/admin/operations/siem/destinations/${stage24DestId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        category: 'system',
        severity: 'info',
        action: 'worker.queue.healthy',
        message: 'BullMQ queue backlog within nominal parameters',
      }),
    });
    assert(syslogProbeRes.status === 200, 'RFC 5424 Syslog probe returns 200 OK');
    assert(/^<\d+>1\s\d{4}-\d{2}-\d{2}/.test(syslogProbeRes.data.formattedPayloadSample), 'Syslog format matches RFC 5424 header pattern');

    // ========================================================================
    // 6. Delivery Log Inspection & Filter Queries
    // ========================================================================
    console.log('\n--- [6. Delivery Log Inspection & Filter Queries] ---');

    const logsRes = await request('/admin/operations/siem/logs', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(logsRes.status === 200, 'Listing SIEM delivery logs returns 200 OK');
    assert(Array.isArray(logsRes.data.logs), 'Logs returned as array');
    assert(logsRes.data.logs.length >= 5, 'Multiple probe batches recorded in delivery logs');
    assert(logsRes.data.logs[0].digestSha256, 'Each log record contains cryptographic SHA-256 digest');

    // Filter by specific destination
    const filteredLogsRes = await request(`/admin/operations/siem/logs?destinationId=${stage24DestId}`, {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(filteredLogsRes.status === 200, 'Filtered logs query returns 200 OK');
    assert(
      filteredLogsRes.data.logs.every((l) => l.destinationId === stage24DestId),
      'All filtered logs belong to the requested destination'
    );

    // ========================================================================
    // 7. Destination Deletion & Cleanup
    // ========================================================================
    console.log('\n--- [7. Destination Deletion & Cleanup] ---');

    const deleteRes = await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(deleteRes.status === 204, 'Deleting SIEM destination returns 204 No Content');

    // Verify deletion in database
    const [afterDeleteRows] = await dbConnection.execute(
      'SELECT id FROM siem_destinations WHERE id = ?',
      [stage24DestId]
    );
    assert(afterDeleteRows.length === 0, 'Destination safely deleted from database');

    const notFoundRes = await request(`/admin/operations/siem/destinations/${stage24DestId}`, {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(notFoundRes.status === 404, 'Subsequent lookup returns 404 Not Found');

    // ========================================================================
    // 8. Production Meta Publication Lock Final Verification
    // ========================================================================
    await verifyMetaLock(dbConnection, 'POST-CHECK FINAL');

    console.log('\n========================================================================');
    console.log(`   STAGE 24 SUITE PASSED! (${passedTests} passed, ${failedTests} failed)`);
    console.log('========================================================================\n');
  } finally {
    await dbConnection.end();
  }
}

runStage24Suite().catch((err) => {
  console.error('\nFatal test failure:', err);
  process.exit(1);
});
