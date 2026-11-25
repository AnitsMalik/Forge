/**
 * Stage 19: Enterprise SLA Monitor, High-Availability Health & Public Status Page Feeds Suite
 * 
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Public Status Endpoint (Zero-Credential, High-Cacheability):
 *    - GET /api/v1/status and GET /api/status return 200 without auth
 *    - Sanitized structure with components, active incidents, and maintenance windows
 *    - Zero secrets, raw tokens, or staff emails leaked
 * 3. Superadmin SLA Overview & Telemetry Metrics:
 *    - RBAC enforcement (non-superadmin returns 403)
 *    - SLA uptime percentages (30d, 90d), error budget burn rate, average P95 latency
 *    - 90-day daily historical sparkline projections
 * 4. Synthetic Health & Latency Probe:
 *    - Measures execution times across 8 subsystems (Database raw SELECT 1, API, Cache, etc.)
 *    - Writes durable sample records to system_sla_telemetry
 *    - Audited in superadmin_audit_logs
 * 5. Manual Component Status Override & Clear Mechanism:
 *    - Rejection on missing confirmation or short reason (<8 chars)
 *    - Successful override transitions component and propagates to public status
 *    - Clearing override safely restores component to operational
 *    - Full audit logging for both actions
 * 6. Planned Maintenance Window Lifecycle Governance:
 *    - Scheduling validation (requires title, min 8-char desc, start/end, confirmation)
 *    - Status transition: scheduled -> in_progress (marks impacted components) -> completed (restores components)
 *    - Cancellation safeguards with mandatory reason
 *    - Full audit logging
 * 7. Production Meta Publication Lock Intact (Final Verification)
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
const ROOT_URL = 'http://localhost:4000';
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
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function verifyMetaLock(dbConnection, checkpointLabel) {
  console.log(`\n--- [CHECKPOINT] Verifying Meta Publication Lock: ${checkpointLabel} ---`);
  const [variants] = await dbConnection.execute(
    'SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length > 0, `Meta post variant ${META_LOCK_REMOTE_POST_ID} exists in database`);
  assert(variants[0].status === 'published', `Meta post variant status is strictly 'published' (current: ${variants[0].status})`);

  const [jobs] = await dbConnection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length > 0, `Publishing job ${META_LOCK_JOB_ID} exists in database`);
  assert(jobs[0].status === 'published', `Publishing job status is strictly 'published' (current: ${jobs[0].status})`);
}

async function runSuite() {
  console.log('========================================================================');
  console.log('  STAGE 19: ENTERPRISE SLA MONITOR & PUBLIC STATUS PAGE SUITE           ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Initial Meta Lock Verification
    await verifyMetaLock(db, 'Initial State Pre-Stage 19');

    // 2. Fetch Superadmin and Regular User
    const [superadmins] = await db.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'Platform superadmin user located in database');
    const superadmin = superadmins[0];

    const [regularUsers] = await db.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(regularUsers.length > 0, 'Regular user located in database');
    const regularUser = regularUsers[0];

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const regularToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, isSuperadmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // 3. Public Zero-Credential Status Feeds
    // -------------------------------------------------------------------------
    console.log('\n--- Section 1: Public Status Feeds (Zero-Credential) ---');

    const pubRes1 = await request('/status'); // GET /api/v1/status
    assert(pubRes1.status === 200, 'GET /api/v1/status returns HTTP 200 without requiring authentication');
    assert(pubRes1.data?.platformName === 'SocialForge Enterprise Cloud', 'Public feed returns platform title');
    assert(Array.isArray(pubRes1.data?.components), 'Public feed contains components array');
    assert(pubRes1.data.components.length >= 8, `Public feed contains ${pubRes1.data.components.length} components`);
    assert(typeof pubRes1.data.uptime30d === 'number', 'Public feed includes 30d SLA uptime metric');
    assert(typeof pubRes1.data.uptime90d === 'number', 'Public feed includes 90d SLA uptime metric');

    // Test alternate root endpoint /api/status
    const pubRes2 = await request(`${ROOT_URL}/api/status`);
    assert(pubRes2.status === 200, 'GET /api/status returns HTTP 200 without requiring authentication');
    assert(pubRes2.data?.overallStatus !== undefined, 'Root public feed includes overallStatus');

    // Verify zero credential / sensitive staff email leaks in public feed
    const rawPublicJson = JSON.stringify(pubRes1.data);
    assert(!rawPublicJson.includes('@socialforge.ai'), 'Public status feed does not leak staff email addresses');
    assert(!rawPublicJson.includes('secret') && !rawPublicJson.includes('password'), 'Public status feed contains zero secrets');

    // -------------------------------------------------------------------------
    // 4. Superadmin SLA Overview & RBAC Guards
    // -------------------------------------------------------------------------
    console.log('\n--- Section 2: Superadmin SLA Overview & RBAC Guards ---');

    const unauthRes = await request('/admin/operations/sla/overview');
    assert(unauthRes.status === 401, 'Unauthenticated access to SLA overview rejected with HTTP 401');

    const forbiddenRes = await request('/admin/operations/sla/overview', {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(forbiddenRes.status === 403, 'Non-superadmin access to SLA overview rejected with HTTP 403');

    const overviewRes = await request('/admin/operations/sla/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(overviewRes.status === 200, 'Superadmin access to SLA overview returns HTTP 200');
    assert(overviewRes.data?.overallStatus !== undefined, 'Overview contains overallStatus');
    assert(typeof overviewRes.data?.overallUptime30d === 'number', 'Overview contains overallUptime30d');
    assert(typeof overviewRes.data?.overallUptime90d === 'number', 'Overview contains overallUptime90d');
    assert(typeof overviewRes.data?.errorBudgetBurnRate === 'number', 'Overview contains errorBudgetBurnRate');
    assert(typeof overviewRes.data?.averageP95LatencyMs === 'number', 'Overview contains averageP95LatencyMs');
    assert(Array.isArray(overviewRes.data?.components), 'Overview contains components array');
    assert(Array.isArray(overviewRes.data?.historicalUptime90d), 'Overview contains 90-day historical points');
    assert(overviewRes.data.historicalUptime90d.length === 90, 'Overview contains exactly 90 daily historical data points');

    // -------------------------------------------------------------------------
    // 5. Synthetic Health & Latency Probe Engine
    // -------------------------------------------------------------------------
    console.log('\n--- Section 3: Synthetic Health & Latency Probe Engine ---');

    const probeRes = await request('/admin/operations/sla/probe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(probeRes.status === 200, 'POST /admin/operations/sla/probe returns HTTP 200');
    assert(probeRes.data?.success === true, 'Probe response indicates success');
    assert(Array.isArray(probeRes.data?.results), 'Probe results returned as array');
    assert(probeRes.data.results.length >= 8, `Probe tested ${probeRes.data.results.length} subsystems`);

    const dbProbe = probeRes.data.results.find((r) => r.componentId === 'database_storage');
    assert(dbProbe !== undefined, 'Database storage probed');
    assert(typeof dbProbe.measuredLatencyMs === 'number' && dbProbe.measuredLatencyMs > 0, 'Database latency measured');

    // Verify sample recorded in system_sla_telemetry
    const [telemetryRows] = await db.execute(
      'SELECT id, component_id, window_type, latency_p95_ms, is_probe FROM system_sla_telemetry WHERE component_id = ? ORDER BY sample_timestamp DESC LIMIT 1',
      ['database_storage']
    );
    assert(telemetryRows.length > 0, 'Synthetic probe sample logged to system_sla_telemetry');
    assert(telemetryRows[0].is_probe === 1, 'Telemetry sample flagged as is_probe=1');

    // Verify audit log
    const [probeAuditRows] = await db.execute(
      "SELECT id, action, superadmin_email FROM superadmin_audit_logs WHERE action = 'sla_synthetic_probe_executed' ORDER BY created_at DESC LIMIT 1"
    );
    assert(probeAuditRows.length > 0, 'Probe execution recorded in superadmin_audit_logs');
    assert(probeAuditRows[0].superadmin_email === superadmin.email, 'Probe audit log associates superadmin email');

    // -------------------------------------------------------------------------
    // 6. Safe Operator Status Override & Clear Mechanism
    // -------------------------------------------------------------------------
    console.log('\n--- Section 4: Safe Subsystem Status Override & Clear ---');

    // Rejection without confirmation
    const noConfOverride = await request('/admin/operations/sla/components/ai_studio_engine/override', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'degraded_performance',
        reason: 'Upstream OpenAI inference latency elevated',
        confirmed: false,
      }),
    });
    assert(noConfOverride.status === 400, 'Override rejected without explicit confirmation checkbox');

    // Rejection with short justification
    const shortReasonOverride = await request('/admin/operations/sla/components/ai_studio_engine/override', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'degraded_performance',
        reason: 'slow',
        confirmed: true,
      }),
    });
    assert(shortReasonOverride.status === 400, 'Override rejected with justification < 8 characters');

    // Valid override execution
    const validOverride = await request('/admin/operations/sla/components/ai_studio_engine/override', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'degraded_performance',
        reason: 'Upstream OpenAI inference latency elevated past 1500ms threshold',
        confirmed: true,
      }),
    });
    assert(validOverride.status === 200, 'Valid status override accepted with HTTP 200');
    assert(validOverride.data?.status === 'degraded_performance', 'Component status updated to degraded_performance');
    assert(validOverride.data?.manualOverride === true, 'Component flagged as manualOverride=true');

    // Verify public status feed reflects degradation
    const pubDegraded = await request('/status');
    assert(pubDegraded.data?.overallStatus === 'degraded_performance', 'Overall platform status degraded in public feed');
    assert(pubDegraded.data?.statusMessage === 'Subsystem Performance Degraded', 'Public status banner updated accordingly');

    // Verify override audit log
    const [overrideAudit] = await db.execute(
      "SELECT id, action, reason FROM superadmin_audit_logs WHERE action = 'sla_component_status_override' ORDER BY created_at DESC LIMIT 1"
    );
    assert(overrideAudit.length > 0, 'Status override logged in superadmin_audit_logs');
    assert(overrideAudit[0].reason.includes('Upstream OpenAI inference'), 'Audit log contains operator justification');

    // Clear override with confirmation
    const clearOverride = await request('/admin/operations/sla/components/ai_studio_engine/clear-override', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        reason: 'Upstream latency normalized; verified synthetic probes sub-250ms',
        confirmed: true,
      }),
    });
    assert(clearOverride.status === 200, 'Clearing override accepted with HTTP 200');
    assert(clearOverride.data?.status === 'operational', 'Component restored to operational status');
    assert(clearOverride.data?.manualOverride === false, 'Component manualOverride reset to false');

    // Verify public status restored
    const pubRestored = await request('/status');
    assert(pubRestored.data?.overallStatus === 'operational', 'Overall platform status restored to operational in public feed');

    // -------------------------------------------------------------------------
    // 7. Planned Maintenance Window Lifecycle Governance
    // -------------------------------------------------------------------------
    console.log('\n--- Section 5: Maintenance Window Lifecycle Governance ---');

    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Schedule maintenance window validation
    const invalidMaint = await request('/admin/operations/sla/maintenance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        title: 'DB',
        description: 'short',
        impactLevel: 'minor_degradation',
        impactedComponents: ['database_storage'],
        scheduledStartAt: inOneHour.toISOString(),
        scheduledEndAt: inTwoHours.toISOString(),
        confirmed: false,
      }),
    });
    assert(invalidMaint.status === 400, 'Maintenance rejected without confirmation and short title/desc');

    // Schedule valid maintenance window
    const schedMaint = await request('/admin/operations/sla/maintenance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        title: 'Q4 Core Database Optimization & Partitioning',
        description: 'Scheduled index rebuild and partitioning on high-volume analytics telemetry tables.',
        impactLevel: 'minor_degradation',
        impactedComponents: ['database_storage', 'api_gateway'],
        scheduledStartAt: inOneHour.toISOString(),
        scheduledEndAt: inTwoHours.toISOString(),
        confirmed: true,
      }),
    });
    assert(schedMaint.status === 201, 'Maintenance window scheduled with HTTP 201');
    assert(schedMaint.data?.status === 'scheduled', 'Maintenance window created in scheduled state');
    const maintId = schedMaint.data?.id;

    // Transition maintenance: scheduled -> in_progress
    const inProgMaint = await request(`/admin/operations/sla/maintenance/${maintId}/status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'in_progress',
        reason: 'Beginning maintenance window operations as scheduled',
        confirmed: true,
      }),
    });
    assert(inProgMaint.status === 200, 'Maintenance transitioned to in_progress with HTTP 200');
    assert(inProgMaint.data?.status === 'in_progress', 'Maintenance status is in_progress');

    // Verify impacted component flagged as maintenance
    const [dbCompRow] = await db.execute('SELECT status FROM system_status_components WHERE id = ?', ['database_storage']);
    assert(dbCompRow[0].status === 'maintenance', 'Impacted subsystem transitioned to maintenance status');

    // Transition maintenance: in_progress -> completed
    const compMaint = await request(`/admin/operations/sla/maintenance/${maintId}/status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'completed',
        reason: 'Database index rebuild completed successfully; verified read-replica sync',
        confirmed: true,
      }),
    });
    assert(compMaint.status === 200, 'Maintenance transitioned to completed with HTTP 200');
    assert(compMaint.data?.status === 'completed', 'Maintenance status is completed');

    // Verify impacted component restored to operational
    const [dbCompRestored] = await db.execute('SELECT status FROM system_status_components WHERE id = ?', ['database_storage']);
    assert(dbCompRestored[0].status === 'operational', 'Impacted subsystem restored to operational status upon completion');

    // Schedule and cancel maintenance window
    const cancelMaintRes = await request('/admin/operations/sla/maintenance', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        title: 'Redis Node Firmware Upgrade Drill',
        description: 'Routine cache cluster rolling restart drill during off-peak hours.',
        impactLevel: 'none',
        impactedComponents: ['cache_redis'],
        scheduledStartAt: inOneHour.toISOString(),
        scheduledEndAt: inTwoHours.toISOString(),
        confirmed: true,
      }),
    });
    const cancelMaintId = cancelMaintRes.data?.id;

    const cancelledMaint = await request(`/admin/operations/sla/maintenance/${cancelMaintId}/status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        status: 'cancelled',
        reason: 'Postponed due to scheduled customer product launch event',
        confirmed: true,
      }),
    });
    assert(cancelledMaint.status === 200, 'Maintenance cancellation accepted with HTTP 200');
    assert(cancelledMaint.data?.status === 'cancelled', 'Maintenance status updated to cancelled');
    assert(cancelledMaint.data?.cancellationReason.includes('Postponed due to'), 'Cancellation reason stored');

    // Verify maintenance audit logs
    const [maintAuditRows] = await db.execute(
      "SELECT action FROM superadmin_audit_logs WHERE action IN ('sla_maintenance_window_scheduled', 'sla_maintenance_window_updated')"
    );
    assert(maintAuditRows.length >= 3, 'All maintenance lifecycle operations audited in superadmin_audit_logs');

    // -------------------------------------------------------------------------
    // 8. Final Meta Publication Lock Check
    // -------------------------------------------------------------------------
    await verifyMetaLock(db, 'Final State Post-Stage 19');

    console.log('\n========================================================================');
    console.log(`  STAGE 19 COMPLETE: ${passedTests} passed, ${failedTests} failed (100% PASS RATE)`);
    console.log('========================================================================\n');
  } finally {
    await db.end();
  }
}

runSuite().catch((err) => {
  console.error('Fatal error during Stage 19 test execution:', err);
  process.exit(1);
});
