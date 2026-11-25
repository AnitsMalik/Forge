/**
 * Stage 16: Automated Incident Alerting & Webhooks Verification Suite
 * 
 * Tests:
 * 1. Meta Publication Lock Invariant check
 * 2. Superadmin authentication & Token signing
 * 3. Notification channel listing & target masking (no raw secret/key exposure)
 * 4. Channel creation with encrypted secret & masked target
 * 5. Channel test dispatch & receipt verification
 * 6. Alert rule listing, creation, and mute toggle
 * 7. Incident simulation & event generation
 * 8. Cooldown deduplication (prevents alert fatigue)
 * 9. Incident lifecycle: Triggered -> Acknowledged -> Resolved (safeguards: confirmation & note)
 * 10. RBAC / Non-superadmin rejection safeguards
 * 11. Superadmin audit logging of incident actions
 * 12. Final Meta Publication Lock verification
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
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('========================================================================');
  console.log('   STAGE 16: AUTOMATED INCIDENT ALERTING & WEBHOOKS TEST SUITE         ');
  console.log('   Multi-Channel Dispatch • Rule Evaluation • Cooldown Deduplication   ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // Step 1: Verify Meta Publication Lock Invariant at Start
    console.log('[1] Meta Publication Lock Invariant Verification (Pre-Flight)');
    const [lockedRows] = await connection.execute(
      `SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(lockedRows.length > 0, 'Found locked post variant row');
    assert(lockedRows[0].status === 'published', `Locked post status is strictly "published" (${lockedRows[0].status})`);

    const [lockedJobRows] = await connection.execute(
      `SELECT id, status, platform FROM publishing_jobs WHERE id = '256cf21a-26cd-4032-a7b8-17261d8a81b1'`
    );
    assert(lockedJobRows.length > 0, 'Found locked publishing job row');
    assert(lockedJobRows[0].status === 'published', `Locked publishing job status is strictly "published" (${lockedJobRows[0].status})`);

    // Step 2: Superadmin & Regular User Authentication Setup
    console.log('\n[2] User Role Identification & JWT Signing');
    const [superadmins] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id, tu.role 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 AND u.is_active = 1 
       LIMIT 1`
    );
    let superadmin = superadmins[0];
    if (!superadmin) {
      const [apexUsers] = await connection.execute(`SELECT u.id, u.email, tu.tenant_id, tu.role FROM users u JOIN tenant_users tu ON u.id = tu.user_id WHERE u.email = 'sarah@apex.com' LIMIT 1`);
      superadmin = apexUsers[0];
      await connection.execute(`UPDATE users SET is_superadmin = 1 WHERE id = ?`, [superadmin.id]);
    }
    assert(Boolean(superadmin), `Active superadmin identified: ${superadmin.email}`);

    const [regularUsers] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       LEFT JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    const regularUser = regularUsers[0] || { id: '00000000-0000-0000-0000-000000000099', email: 'regular@user.com', tenant_id: superadmin.tenant_id };

    const superadminToken = jwt.sign(
      {
        userId: superadmin.id,
        email: superadmin.email,
        tenantId: superadmin.tenant_id,
        role: superadmin.role || 'agency_admin',
        isSuperadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        tenantId: regularUser.tenant_id,
        role: 'brand_manager',
        isSuperadmin: false,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const superadminHeaders = { Authorization: `Bearer ${superadminToken}` };
    const regularHeaders = { Authorization: `Bearer ${regularToken}` };

    // Step 3: Notification Channels Listing & Target Masking
    console.log('\n[3] Notification Channels Listing & Target Masking');
    const chRes = await request('/admin/operations/incidents/channels', { headers: superadminHeaders });
    assert(chRes.ok, 'Fetched incident channels list');
    assert(Array.isArray(chRes.data?.data), 'Channels data is an array');

    for (const ch of chRes.data.data) {
      assert(Boolean(ch.targetMasked), `Channel "${ch.name}" has masked target: ${ch.targetMasked}`);
      assert(ch.secretToken === undefined, `Secret token omitted from API response for channel "${ch.name}"`);
    }

    // Step 4: Configure New Notification Channel with Target Encryption
    console.log('\n[4] Configure New Notification Channel (Encrypted Target)');
    const createChPayload = {
      name: 'DevOps Slack Live Bridge',
      channelType: 'slack',
      target: 'https://example.com/services/T00000000/B00000000/liveSecretToken987654321',
      secretToken: 'slack-signing-secret-sha256-key',
      metadata: { priority: 'P1', cluster: 'us-east' },
      confirmation: true,
    };
    const createChRes = await request('/admin/operations/incidents/channels', {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify(createChPayload),
    });
    assert(createChRes.status === 201, `Channel created with status 201: ${createChRes.data?.data?.name}`);
    const newChannel = createChRes.data?.data;
    assert(Boolean(newChannel.id), 'Channel ID generated');
    assert(newChannel.targetMasked.includes('****'), 'Created channel target is safely masked in response');
    assert(newChannel.targetMasked.endsWith('4321'), `Mask preserves last 4 characters: ${newChannel.targetMasked}`);
    assert(newChannel.secretToken === undefined, 'Signing secret never returned in plaintext');

    // Step 5: Test Channel Dispatch Ping
    console.log('\n[5] Test Channel Dispatch Ping');
    const testChRes = await request(`/admin/operations/incidents/channels/${newChannel.id}/test`, {
      method: 'POST',
      headers: superadminHeaders,
    });
    assert(testChRes.ok, 'Test channel dispatch executed');
    assert(testChRes.data?.data?.success === true, 'Test notification dispatch returned success: true');
    assert(testChRes.data?.data?.receipt?.channelId === newChannel.id, 'Dispatched to target channel ID');

    // Step 6: Alert Rules Management (List, Create, Toggle)
    console.log('\n[6] Alert Rules & Thresholds Management');
    const rulesRes = await request('/admin/operations/incidents/rules', { headers: superadminHeaders });
    assert(rulesRes.ok, 'Fetched alert rules');
    assert(Array.isArray(rulesRes.data?.data), 'Alert rules list is array');

    const createRulePayload = {
      name: 'Burst 429 Throttle Protection Rule',
      conditionType: 'rate_limit_spike',
      thresholdValue: 3,
      timeWindowMinutes: 5,
      cooldownMinutes: 15,
      severity: 'critical',
      channelIds: [newChannel.id],
      confirmation: true,
    };
    const createRuleRes = await request('/admin/operations/incidents/rules', {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify(createRulePayload),
    });
    assert(createRuleRes.status === 201, `Created rule with status 201: ${createRuleRes.data?.data?.name}`);
    const newRule = createRuleRes.data?.data;
    assert(newRule.thresholdValue === 3, 'Threshold value matches');
    assert(newRule.cooldownMinutes === 15, 'Cooldown window matches');

    // Toggle rule mute / unmute
    const toggleMuteRes = await request(`/admin/operations/incidents/rules/${newRule.id}/status`, {
      method: 'PATCH',
      headers: superadminHeaders,
      body: JSON.stringify({ isActive: false }),
    });
    assert(toggleMuteRes.ok, 'Rule muted successfully');
    assert(toggleMuteRes.data?.data?.isActive === false, 'isActive is false');

    const toggleUnmuteRes = await request(`/admin/operations/incidents/rules/${newRule.id}/status`, {
      method: 'PATCH',
      headers: superadminHeaders,
      body: JSON.stringify({ isActive: true }),
    });
    assert(toggleUnmuteRes.ok, 'Rule unmuted successfully');
    assert(toggleUnmuteRes.data?.data?.isActive === true, 'isActive is true');

    // Step 7: Incident Simulation & Cooldown Deduplication
    console.log('\n[7] Incident Simulation & Cooldown Deduplication');
    const simPayload = {
      conditionType: 'rate_limit_spike',
      severity: 'critical',
      title: 'Meta API 429 Rate Limit Spike Detected',
      message: 'Rate limit error quota reached on Graph API node /me/feed.',
      details: {
        provider: 'meta',
        errorCode: 429,
        impactedWorkers: 4,
      },
    };

    // Ensure test rule has null cooldown so sim1 is clean
    await connection.execute(`UPDATE incident_alert_rules SET last_triggered_at = NULL WHERE condition_type = 'rate_limit_spike'`);

    const sim1 = await request('/admin/operations/incidents/simulate', {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify(simPayload),
    });
    assert(sim1.ok, 'First simulated incident evaluated successfully');
    const eventId = sim1.data?.data?.eventId;
    assert(Boolean(eventId), `Recorded incident event ID: #${eventId?.slice(0, 8)}`);
    assert(sim1.data?.data?.triggered === true, 'Incident triggered flag is true');
    assert(Array.isArray(sim1.data?.data?.receipts), 'Event records channel delivery receipts');

    // Immediate second simulation must be suppressed by cooldown
    const sim2 = await request('/admin/operations/incidents/simulate', {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify(simPayload),
    });
    assert(sim2.ok, 'Second simulated incident evaluated');
    assert(sim2.data?.data?.triggered === false, 'Alert suppressed by active 15m deduplication cooldown');
    assert(sim2.data?.data?.reason.includes('cooldown'), `Cooldown reason verified: ${sim2.data?.data?.reason}`);

    // Step 8: Incident Lifecycle: Acknowledge & Safe Resolve
    console.log('\n[8] Incident Lifecycle Management');
    const ackRes = await request(`/admin/operations/incidents/events/${eventId}/acknowledge`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ reason: 'Acknowledged: DevOps engineer investigating Meta rate limits.' }),
    });
    assert(ackRes.ok, 'Incident acknowledged successfully');
    assert(ackRes.data?.data?.status === 'acknowledged', 'Status transitioned to "acknowledged"');
    assert(ackRes.data?.data?.acknowledgedByEmail === superadmin.email, `Ack recorded by ${superadmin.email}`);

    // Try resolve without confirmation (safeguard check)
    const rejectResolve = await request(`/admin/operations/incidents/events/${eventId}/resolve`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ resolutionNote: 'Short', confirmation: false }),
    });
    assert(rejectResolve.status === 400, 'Unconfirmed resolution rejected with HTTP 400');

    // Try resolve without mandatory note
    const rejectNoNote = await request(`/admin/operations/incidents/events/${eventId}/resolve`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ resolutionNote: 'abc', confirmation: true }),
    });
    assert(rejectNoNote.status === 400, 'Resolution without 8-char note rejected with HTTP 400');

    // Safe Resolve
    const safeResolve = await request(`/admin/operations/incidents/events/${eventId}/resolve`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        resolutionNote: 'Throttling backoff cleared; publisher rate limit quota refreshed and jobs running nominally.',
        confirmation: true,
      }),
    });
    assert(safeResolve.ok, 'Incident resolved successfully with audit note');
    assert(safeResolve.data?.data?.status === 'resolved', 'Status transitioned to "resolved"');
    assert(safeResolve.data?.data?.resolvedByEmail === superadmin.email, `Resolved by ${superadmin.email}`);

    // Step 9: RBAC Safeguards
    console.log('\n[9] RBAC & Non-Superadmin Safeguards');
    const noAuth = await request('/admin/operations/incidents/channels');
    assert(noAuth.status === 401, 'Unauthenticated request blocked (HTTP 401)');

    const regularForbidden = await request('/admin/operations/incidents/channels', {
      headers: regularHeaders,
    });
    assert(regularForbidden.status === 403, 'Regular tenant user blocked from incident channels (HTTP 403)');

    // Step 10: Superadmin Audit Trail
    console.log('\n[10] Superadmin Audit Trail Verification');
    const [auditRows] = await connection.execute(
      `SELECT id, action, target_resource_type, target_resource_id, reason, superadmin_email 
       FROM superadmin_audit_logs 
       WHERE action LIKE '%alert%' OR action LIKE '%incident%' 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    assert(auditRows.length > 0, `Recorded ${auditRows.length} incident audit log entries in MySQL`);
    const actionTypes = auditRows.map((r) => r.action);
    console.log(`  ℹ Found incident audit actions: ${actionTypes.slice(0, 4).join(', ')}`);
    assert(actionTypes.some((a) => a.includes('channel')), 'Channel creation/test audited');
    assert(actionTypes.some((a) => a.includes('resolve') || a.includes('acknowledge')), 'Incident lifecycle audited');

    // Step 11: Final Production Meta Lock Verification
    console.log('\n[11] Meta Publication Lock Invariant Verification (Post-Flight)');
    const [finalLockedRows] = await connection.execute(
      `SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(finalLockedRows[0].status === 'published', `Post variant lock intact: ${finalLockedRows[0].status}`);

    const [finalJobRows] = await connection.execute(
      `SELECT id, status, platform FROM publishing_jobs WHERE id = '256cf21a-26cd-4032-a7b8-17261d8a81b1'`
    );
    assert(finalJobRows[0].status === 'published', `Publishing job lock intact: ${finalJobRows[0].status}`);

    console.log('\n========================================================================');
    console.log(`   TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
    console.log('   STAGE 16: INCIDENT ALERTING & WEBHOOKS VERIFIED WITH 100% PASS RATE   ');
    console.log('========================================================================');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
