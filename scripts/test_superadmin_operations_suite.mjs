import mysql from 'mysql2/promise';
import crypto from 'crypto';

const API_BASE = 'http://localhost:4000/api/v1';

async function runSuperadminSuite() {
  console.log('========================================================================');
  console.log('  SOCIALFORGE SUPERADMIN OPERATIONS & ENTERPRISE SECURITY AUDIT');
  console.log('========================================================================\n');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // STEP 0: Production Safety Invariant Verification
  console.log('--- STEP 0: Production Safety Invariant Check ---');
  const [invariantRows] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    invariantRows.length > 0 && invariantRows[0].status === 'published',
    `Production variant invariant intact: status=${invariantRows[0]?.status}, remoteId=${invariantRows[0]?.remote_post_id}`
  );

  const [invariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    invariantJob.length > 0 && invariantJob[0].status === 'published',
    `Production job invariant intact: status=${invariantJob[0]?.status}, externalId=${invariantJob[0]?.external_post_id}`
  );

  // STEP 1: Non-Superadmin Rejection Guardrail
  console.log('\n--- STEP 1: Superadmin RBAC Privilege Guardrails ---');
  const nonAdminRes = await fetch(`${API_BASE}/admin/operations/tenants`);
  assert(
    nonAdminRes.status === 401 || nonAdminRes.status === 403,
    `Unauthenticated request to superadmin operations rejected: status=${nonAdminRes.status}`
  );

  // STEP 2: Authenticate as Sarah (Verified Superadmin)
  console.log('\n--- STEP 2: Authenticate Superadmin Operator ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.tokens?.accessToken || loginJson.data?.accessToken;
  const sarahId = loginJson.data?.user?.id || 'a58ee49d-5d31-4135-817a-132e7cea5fe9';
  const tenantId = loginJson.data?.user?.tenantId || '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  assert(loginRes.status === 200 && !!token, 'Sarah authenticated with superadmin privileges');

  // STEP 3: Multi-Tenant Lifecycle & Telemetry
  console.log('\n--- STEP 3: Multi-Tenant Lifecycle & Management ---');
  const tenantsRes = await fetch(`${API_BASE}/admin/operations/tenants`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tenantsJson = await tenantsRes.json();
  assert(tenantsRes.status === 200 && tenantsJson.success, 'Superadmin list tenants returned HTTP 200');
  const tenantItems = tenantsJson.data?.items || tenantsJson.data?.tenants || tenantsJson.data;
  assert(Array.isArray(tenantItems) && tenantItems.length > 0, `Tenants dataset returned: count=${tenantItems.length}`);

  const tenantDetailRes = await fetch(`${API_BASE}/admin/operations/tenants/${tenantId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const tenantDetailJson = await tenantDetailRes.json();
  assert(tenantDetailRes.status === 200 && tenantDetailJson.success, `Tenant detail retrieved for ${tenantId}`);

  // Provider Health & Queue Health
  const provHealthRes = await fetch(`${API_BASE}/admin/operations/provider-health`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const provHealthJson = await provHealthRes.json();
  assert(provHealthRes.status === 200 && provHealthJson.success, 'Provider health telemetry retrieved');

  const queueHealthRes = await fetch(`${API_BASE}/admin/operations/queues`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const queueHealthJson = await queueHealthRes.json();
  assert(queueHealthRes.status === 200 && queueHealthJson.success, 'Publishing queue & worker health retrieved');

  // STEP 4: Audited Impersonation Mechanism
  console.log('\n--- STEP 4: Audited Superadmin Impersonation Session ---');
  const impersonateRes = await fetch(`${API_BASE}/admin/operations/impersonate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      tenantId,
      reason: 'SOC2 customer support verification and diagnostic testing.',
      ticketReference: 'INC-2026-8812',
      durationMinutes: 30,
      confirmation: true,
    }),
  });
  const impersonateJson = await impersonateRes.json();
  assert(impersonateRes.status === 201 && impersonateJson.success, 'Audited impersonation session created');
  const sessionId = impersonateJson.data?.sessionId || impersonateJson.data?.id;

  // Revoke impersonation
  if (sessionId) {
    const revokeRes = await fetch(`${API_BASE}/admin/operations/impersonate/${sessionId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: 'Audit investigation completed.' }),
    });
    const revokeJson = await revokeRes.json();
    assert(revokeRes.status === 200 && revokeJson.success, 'Impersonation session cleanly revoked');
  }

  // STEP 5: Enterprise SIEM Streaming & Exporter Engine
  console.log('\n--- STEP 5: Enterprise SIEM Security Telemetry Engine ---');
  const siemOverviewRes = await fetch(`${API_BASE}/admin/operations/siem/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const siemOverviewJson = await siemOverviewRes.json();
  assert(siemOverviewRes.status === 200 && typeof siemOverviewJson.deliverySlaPercent === 'number', 'SIEM overview metrics retrieved');

  // Create SIEM destination
  const testSiemName = `Splunk-SOC-Stream-${Date.now()}`;
  const createSiemRes = await fetch(`${API_BASE}/admin/operations/siem/destinations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: testSiemName,
      destinationType: 'splunk_hec',
      payloadFormat: 'splunk_event',
      endpointUrl: 'https://events.splunk.socialforge.io/services/collector',
      authSecret: 'Splunk-Hec-Token-Secured-2026',
      categories: ['audit', 'auth', 'dlp', 'rbac'],
      minSeverity: 'medium',
      batchSize: 25,
      rateLimitPerMin: 600,
    }),
  });
  const createSiemJson = await createSiemRes.json();
  assert(createSiemRes.status === 201 && typeof createSiemJson.id === 'string', 'SIEM Splunk HEC destination configured');
  const siemId = createSiemJson.id;

  // List SIEM destinations
  const listSiemRes = await fetch(`${API_BASE}/admin/operations/siem/destinations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listSiemJson = await listSiemRes.json();
  const foundSiem = Array.isArray(listSiemJson) ? listSiemJson.find((d) => d.id === siemId) : listSiemJson.data?.find((d) => d.id === siemId);
  assert(!!foundSiem, `SIEM destination listed: ${foundSiem?.name}`);

  // Dispatch SIEM synthetic probe
  if (siemId) {
    const probeRes = await fetch(`${API_BASE}/admin/operations/siem/destinations/${siemId}/probe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const probeJson = await probeRes.json();
    assert(probeRes.status === 200 && typeof probeJson.success !== 'undefined', 'Synthetic SIEM probe dispatched');

    // Clean up destination
    await fetch(`${API_BASE}/admin/operations/siem/destinations/${siemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // STEP 6: Enterprise DLP & Sensitive Data Guardrails
  console.log('\n--- STEP 6: Enterprise DLP (Data Loss Prevention) Guardrails ---');
  const dlpOverviewRes = await fetch(`${API_BASE}/admin/operations/dlp/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dlpOverviewJson = await dlpOverviewRes.json();
  assert(dlpOverviewRes.status === 200 && typeof dlpOverviewJson.active_policies_count === 'number', 'DLP overview metrics retrieved');

  // Inspect policies
  const dlpPoliciesRes = await fetch(`${API_BASE}/admin/operations/dlp/policies`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dlpPoliciesJson = await dlpPoliciesRes.json();
  const policyList = Array.isArray(dlpPoliciesJson) ? dlpPoliciesJson : dlpPoliciesJson.data;
  assert(dlpPoliciesRes.status === 200 && Array.isArray(policyList), 'DLP active policy catalog retrieved');

  // Test DLP sensitive inspection engine (detect and redact API key)
  const dlpInspectRes = await fetch(`${API_BASE}/admin/operations/dlp/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      tenantId,
      targetScope: 'posts:publish',
      content: 'Here is our staging deployment key: ghp_1234567890abcdef1234567890abcdef1234. Please do not share publicly.',
    }),
  });
  const dlpInspectJson = await dlpInspectRes.json();
  assert(dlpInspectRes.status === 200 && dlpInspectJson.allowed === false, 'DLP inspection scan executed and blocked violation');
  assert(dlpInspectJson.match_count === 1, `DLP violations reported: count=${dlpInspectJson.match_count}`);
  assert(dlpInspectJson.redacted_content?.includes('[REDACTED_SECRET'), 'Sensitive credential safely redacted/masked');

  // STEP 7: Enterprise Zero-Trust JIT Access Management
  console.log('\n--- STEP 7: Zero-Trust JIT Privilege Elevation ---');
  const jitTelemetryRes = await fetch(`${API_BASE}/admin/operations/jit-access/telemetry`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const jitTelemetryJson = await jitTelemetryRes.json();
  assert(jitTelemetryRes.status === 200 && jitTelemetryJson.success, 'JIT Access telemetry retrieved');

  // Request JIT privilege elevation
  const jitReqRes = await fetch(`${API_BASE}/admin/operations/jit-access/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      target_role: 'security_lead',
      elevation_tier: 'tier_2',
      justification: 'Quarterly compliance audit and penetration testing review.',
      requested_duration_minutes: 60,
    }),
  });
  const jitReqJson = await jitReqRes.json();
  assert(jitReqRes.status === 201 && jitReqJson.success, 'JIT elevation request generated with HTTP 201');
  const jitRequestId = jitReqJson.data?.id;

  // Approve JIT request using second superadmin (Zero-Trust Dual Control)
  if (jitRequestId) {
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';
    const approverToken = jwt.default.sign(
      { userId: '079d2519-ee92-48dd-bb5b-4eed1e5754fa', email: 'sec-lead@socialforge.io', isSuperAdmin: true, role: 'agency_admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const approveJitRes = await fetch(`${API_BASE}/admin/operations/jit-access/requests/${jitRequestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${approverToken}` },
      body: JSON.stringify({
        approved: true,
        decision_notes: 'Dual-control clearance verified by Lead Security Officer.',
      }),
    });
    const approveJitJson = await approveJitRes.json();
    assert(approveJitRes.status === 200 && approveJitJson.success, 'JIT request approved with dual-control authorization');
  }

  // STEP 8: Immutable WORM Audit Vault & Cryptographic Seals
  console.log('\n--- STEP 8: Immutable WORM Audit Vault & Merkle Seals ---');
  const wormOverviewRes = await fetch(`${API_BASE}/admin/operations/worm/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const wormOverviewJson = await wormOverviewRes.json();
  assert(wormOverviewRes.status === 200 && wormOverviewJson.success, 'WORM Audit Vault overview retrieved');

  // Ingest canonical event into WORM vault
  const wormIngestRes = await fetch(`${API_BASE}/admin/operations/worm/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ limitPerSource: 10 }),
  });
  const wormIngestJson = await wormIngestRes.json();
  assert(wormIngestRes.status === 200 && wormIngestJson.success, 'Canonical record ingested into WORM ledger');
  assert(typeof wormIngestJson.data?.chainHeadHash === 'string', `SHA-256 chain hash computed: ${wormIngestJson.data?.chainHeadHash?.slice(0, 16)}...`);

  // Issue public verification token
  const tokenIssueRes = await fetch(`${API_BASE}/admin/operations/worm/verification-tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      label: 'Deloitte SOC2 Audit Q4 2026',
      auditorEmail: 'auditor.lead@deloitte.com',
      auditorOrganization: 'Deloitte LLP',
      validDays: 14,
    }),
  });
  const tokenIssueJson = await tokenIssueRes.json();
  assert(tokenIssueRes.status === 201 && tokenIssueJson.success, 'Public WORM auditor verification token issued');

  // STEP 9: Disaster Recovery, Snapshots & Backups
  console.log('\n--- STEP 9: Disaster Recovery, Snapshots & Automated Backups ---');
  const drOverviewRes = await fetch(`${API_BASE}/admin/operations/dr/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const drOverviewJson = await drOverviewRes.json();
  assert(drOverviewRes.status === 200 && typeof drOverviewJson.targetRtoSeconds === 'number', 'Disaster Recovery overview metrics retrieved');

  const snapshotsRes = await fetch(`${API_BASE}/admin/operations/dr/snapshots`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const snapshotsJson = await snapshotsRes.json();
  const snapshotList = Array.isArray(snapshotsJson) ? snapshotsJson : snapshotsJson.data;
  assert(snapshotsRes.status === 200 && Array.isArray(snapshotList), 'Disaster Recovery snapshot vault catalog retrieved');

  // STEP 10: Predictive Churn & Revenue Intelligence
  console.log('\n--- STEP 10: Predictive Churn & Revenue Intelligence ---');
  const revIntelOverviewRes = await fetch(`${API_BASE}/admin/operations/revenue-intelligence/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const revIntelOverviewJson = await revIntelOverviewRes.json();
  assert(revIntelOverviewRes.status === 200 && revIntelOverviewJson.success, 'Revenue Intelligence overview telemetry retrieved');

  const churnScoresRes = await fetch(`${API_BASE}/admin/operations/revenue-intelligence/churn-scores`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const churnScoresJson = await churnScoresRes.json();
  assert(churnScoresRes.status === 200 && Array.isArray(churnScoresJson.data), 'Tenant churn risk scores retrieved');

  // Evaluate risk score for active tenant
  const evalChurnRes = await fetch(`${API_BASE}/admin/operations/revenue-intelligence/churn-scores/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tenantId }),
  });
  const evalChurnJson = await evalChurnRes.json();
  assert(evalChurnRes.status === 200 && evalChurnJson.success, `Churn risk evaluated for tenant: riskScore=${evalChurnJson.data?.churnRiskScore || evalChurnJson.data?.score}`);

  // STEP 11: Final Production Safety Invariant Verification
  console.log('\n--- STEP 11: Final Production Safety Invariant Verification ---');
  const [finalInvariantVariant] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    finalInvariantVariant.length > 0 && finalInvariantVariant[0].status === 'published',
    `Final Invariant Variant intact: status=${finalInvariantVariant[0]?.status}, remoteId=${finalInvariantVariant[0]?.remote_post_id}`
  );

  const [finalInvariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    finalInvariantJob.length > 0 && finalInvariantJob[0].status === 'published',
    `Final Invariant Job intact: status=${finalInvariantJob[0]?.status}, externalId=${finalInvariantJob[0]?.external_post_id}`
  );

  await conn.end();

  console.log('\n========================================================================');
  console.log(`  AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuperadminSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
