/**
 * Stage 25: Enterprise Data Loss Prevention (DLP) & Content Policy Guardrails Suite
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on DLP Endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. Database Schema & Pre-seeded Policies Verification
 * 4. DLP Overview Telemetry & Operational Metrics (GET /api/v1/admin/operations/dlp/overview)
 * 5. DLP Policy CRUD Lifecycle & Regex Validation (Create, List, Toggle, Update, Delete)
 * 6. Live Content Inspection Engine:
 *    - Clean content pass-through
 *    - PCI financial credit card detection with Luhn check & inline redaction ([REDACTED_PCI:****<last4>])
 *    - Rejection of invalid Luhn credit card numbers (prevent false positives)
 *    - AWS credentials & API keys detection with outright blocking
 *    - PII / SSN detection with quarantine queue routing
 * 7. Live Sandbox Scanner Simulation (GET/POST /api/v1/admin/operations/dlp/simulate)
 * 8. Incident Quarantine Review Workflow (Approve override & Reject dismissal)
 * 9. Zero Plaintext Secret Leakage across responses and database records
 * 10. Production Meta Publication Lock Intact (Final Verification)
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
  return { status: res.status, headers: res.headers, data };
}

async function verifyMetaLock(db, stepLabel) {
  console.log(`\n--- [Meta Lock Check: ${stepLabel}] ---`);
  const [variants] = await db.execute(
    'SELECT id, remote_post_id, platform, status FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length === 1, `Production post variant exists for remote ID ${META_LOCK_REMOTE_POST_ID}`);
  assert(variants[0].status === 'published', `Production post variant status is strictly locked in 'published' (actual: ${variants[0].status})`);

  const [jobs] = await db.execute(
    'SELECT id, platform, status FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length === 1, `Production publishing job exists for ID ${META_LOCK_JOB_ID}`);
  assert(jobs[0].status === 'published', `Production publishing job status is strictly locked in 'published' (actual: ${jobs[0].status})`);
}

async function runSuite() {
  console.log('========================================================================');
  console.log('   STAGE 25: ENTERPRISE DATA LOSS PREVENTION (DLP) & GUARDRAILS TEST   ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  try {
    // STEP 1: Pre-test Meta Lock Invariant
    await verifyMetaLock(db, 'Pre-Test Verification');

    // Clean up test data from prior runs
    await db.execute("DELETE FROM dlp_policies WHERE id LIKE 'dlp-pol-test-%' OR name LIKE 'Project Confidential%'");
    await db.execute("DELETE FROM dlp_incidents WHERE id NOT IN ('dlp-inc-quarantine-seed01', 'dlp-inc-redacted-seed02')");
    
    // Ensure pre-seeded incidents exist
    await db.execute(`
      INSERT INTO dlp_incidents (id, tenant_id, policy_id, target_scope, entity_type, entity_id, severity, action_taken, match_count, violation_details, masked_content, quarantine_status, created_at, updated_at)
      VALUES 
      ('dlp-inc-quarantine-seed01', 'default-tenant-001', 'dlp-pol-pii-ssn-contacts', 'posts:publish', 'post', 'post-draft-review-991', 'warning', 'quarantined', 1, '{"violations":[{"rule_name":"US Social Security Number (SSN)","category":"pii","severity":"warning","snippet_masked":"Contact employee SSN: [REDACTED_PII:ssn] for details","match_index":22}],"detected_categories":["pii"],"original_length":64}', 'Contact employee SSN: [REDACTED_PII:ssn] for benefits verification.', 'pending_review', NOW(), NOW()),
      ('dlp-inc-redacted-seed02', 'default-tenant-001', 'dlp-pol-fin-pci-cards', 'posts:publish', 'post', 'post-draft-redacted-882', 'critical', 'redacted', 1, '{"violations":[{"rule_name":"Visa Credit Card","category":"financial_pci","severity":"critical","snippet_masked":"Invoice paid with card [REDACTED_PCI:visa_card]","match_index":23}],"detected_categories":["financial_pci"],"original_length":58}', 'Invoice paid with card [REDACTED_PCI:visa_card] successfully.', 'none', NOW(), NOW())
      ON DUPLICATE KEY UPDATE quarantine_status = VALUES(quarantine_status), reviewed_by = NULL, reviewed_at = NULL, review_notes = NULL
    `);

    // Fetch superadmin and normal user from DB
    const [superadmins] = await db.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'Superadmin user exists in database');
    const superadmin = superadmins[0];

    const [normalUsers] = await db.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(normalUsers.length > 0, 'Standard tenant user exists in database');
    const normalUser = normalUsers[0];

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, tenantId: superadmin.tenant_id, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const memberToken = jwt.sign(
      { userId: normalUser.id, email: normalUser.email, isSuperadmin: false, tenantId: normalUser.tenant_id, role: 'member' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // STEP 2: Superadmin RBAC & Auth Security on DLP Endpoints
    console.log('\n--- Step 2: Superadmin RBAC Security Enforcement ---');
    const unauthRes = await request('/admin/operations/dlp/overview');
    assert(unauthRes.status === 401, 'Anonymous request to DLP overview is rejected with 401 Unauthorized');

    const memberRes = await request('/admin/operations/dlp/overview', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(memberRes.status === 403, 'Regular member access to DLP overview is rejected with 403 Forbidden');

    const adminRes = await request('/admin/operations/dlp/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(adminRes.status === 200, 'Superadmin access to DLP overview succeeds with 200 OK');

    // STEP 3: Database Pre-seeded Policies & Schema Verification
    console.log('\n--- Step 3: Database Schema & Pre-seeded Policies ---');
    const [polRows] = await db.execute('SELECT id, name, category, severity, action, is_enabled FROM dlp_policies');
    assert(polRows.length >= 4, `At least 4 DLP policies exist in database (found: ${polRows.length})`);

    const pciPol = polRows.find((p) => p.category === 'financial_pci');
    assert(Boolean(pciPol), 'Pre-seeded PCI credit card policy exists');
    assert(pciPol.action === 'redact_inline', 'PCI policy action is configured to redact_inline');

    const credsPol = polRows.find((p) => p.category === 'credentials');
    assert(Boolean(credsPol), 'Pre-seeded Credentials policy exists');
    assert(credsPol.action === 'block_outright', 'Credentials policy action is configured to block_outright');

    const piiPol = polRows.find((p) => p.category === 'pii');
    assert(Boolean(piiPol), 'Pre-seeded PII policy exists');
    assert(piiPol.action === 'quarantine_for_approval', 'PII policy action is configured to quarantine_for_approval');

    const [incRows] = await db.execute('SELECT id, policy_id, action_taken, quarantine_status FROM dlp_incidents');
    assert(incRows.length >= 2, `At least 2 historical DLP incidents exist (found: ${incRows.length})`);

    // STEP 4: DLP Overview Telemetry & Operational Metrics
    console.log('\n--- Step 4: DLP Overview Telemetry & Operational Metrics ---');
    const ov = adminRes.data;
    assert(typeof ov.active_policies_count === 'number' && ov.active_policies_count >= 4, 'active_policies_count is a valid non-zero count');
    assert(typeof ov.total_policies_count === 'number' && ov.total_policies_count >= 4, 'total_policies_count is a valid non-zero count');
    assert(typeof ov.scans_24h_count === 'number' && ov.scans_24h_count >= 0, 'scans_24h_count is a valid numeric metric');
    assert(typeof ov.quarantined_pending_count === 'number' && ov.quarantined_pending_count >= 1, 'quarantined_pending_count reflects pending incidents');
    assert(typeof ov.violation_rate_pct === 'number', 'violation_rate_pct is calculated as a numeric percentage');

    // STEP 5: DLP Policy CRUD Lifecycle & Regex Validation
    console.log('\n--- Step 5: DLP Policy CRUD Lifecycle ---');
    // 5a. Invalid regex rejection
    const invalidPolRes = await request('/admin/operations/dlp/policies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Invalid Policy With Broken Regex',
        category: 'custom',
        severity: 'warning',
        action: 'warn_and_log',
        match_patterns: [
          {
            name: 'Broken Pattern',
            pattern: '(broken[regex', // unmatched bracket
            flags: 'g',
            description: 'Invalid regex',
          },
        ],
        target_scopes: ['posts:publish'],
      }),
    });
    assert(invalidPolRes.status === 400, 'Invalid regex pattern is rejected with 400 Bad Request');

    // 5b. Create valid policy
    const testPolRes = await request('/admin/operations/dlp/policies', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        name: 'Project Confidential Project Codename Sentinel',
        description: 'Detects and redacts Project Titan confidential markers in social posts',
        category: 'custom',
        severity: 'critical',
        action: 'redact_inline',
        match_patterns: [
          {
            name: 'Titan Codename',
            pattern: '\\bPROJECT_TITAN_CLASSIFIED\\b',
            flags: 'g',
            description: 'Confidential project codename',
          },
        ],
        target_scopes: ['posts:publish', 'ai:generation'],
        is_enabled: true,
      }),
    });
    assert(testPolRes.status === 201, 'Valid custom DLP policy created with 201 Created');
    const createdPol = testPolRes.data;
    assert(createdPol.name === 'Project Confidential Project Codename Sentinel', 'Created policy name matches input');
    assert(createdPol.action === 'redact_inline', 'Created policy action matches input');

    // 5c. List policies with filter
    const listRes = await request('/admin/operations/dlp/policies?category=custom', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listRes.status === 200, 'List custom policies returns 200 OK');
    const foundCreated = listRes.data.find((p) => p.id === createdPol.id);
    assert(Boolean(foundCreated), 'Newly created policy found in custom category filter');

    // 5d. Toggle policy
    const toggleRes = await request(`/admin/operations/dlp/policies/${createdPol.id}/toggle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ is_enabled: false }),
    });
    assert(toggleRes.status === 200, 'Policy toggle succeeds with 200 OK');
    assert(toggleRes.data.is_enabled === false, 'Policy is_enabled is now false');

    // 5e. Update policy
    const updateRes = await request(`/admin/operations/dlp/policies/${createdPol.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        description: 'Updated description for confidential sentinel',
        action: 'quarantine_for_approval',
        is_enabled: true,
      }),
    });
    assert(updateRes.status === 200, 'Policy update succeeds with 200 OK');
    assert(updateRes.data.action === 'quarantine_for_approval', 'Updated policy action is quarantine_for_approval');
    assert(updateRes.data.is_enabled === true, 'Updated policy is re-enabled');

    // 5f. Delete policy
    const deleteRes = await request(`/admin/operations/dlp/policies/${createdPol.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteRes.status === 200, 'Policy deletion succeeds with 200 OK');

    const getDeletedRes = await request(`/admin/operations/dlp/policies/${createdPol.id}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(getDeletedRes.status === 404, 'Deleted policy returns 404 Not Found');

    // STEP 6: Live Content Inspection Engine
    console.log('\n--- Step 6: Live Content Inspection Engine ---');

    // 6a. Clean Content
    const cleanInspect = await request('/admin/operations/dlp/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        content: 'Check out our exciting new social media automation feature launching tomorrow!',
        targetScope: 'posts:publish',
        entityType: 'post',
        entityId: 'post-clean-01',
      }),
    });
    assert(cleanInspect.status === 200, 'Clean content inspection returns 200 OK');
    assert(cleanInspect.data.allowed === true, 'Clean content is allowed');
    assert(cleanInspect.data.action_taken === 'passed', 'Clean content action_taken is passed');
    assert(cleanInspect.data.violations.length === 0, 'Clean content produces 0 violations');

    // 6b. Valid PCI Credit Card (Visa) with Luhn Algorithm & Inline Redaction
    // Valid test Visa number that satisfies Luhn: 4532015112830366
    const pciInspect = await request('/admin/operations/dlp/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        content: 'Please pay invoice using Visa card 4532015112830366 before end of day.',
        targetScope: 'posts:publish',
        entityType: 'post',
        entityId: 'post-pci-02',
      }),
    });
    assert(pciInspect.status === 200, 'PCI content inspection returns 200 OK');
    assert(pciInspect.data.action_taken === 'redacted', 'PCI violation triggers action_taken: redacted');
    assert(pciInspect.data.allowed === true, 'Redacted content is allowed to proceed with token masks');
    assert(
      pciInspect.data.redacted_content.includes('[REDACTED_PCI:****0366]'),
      `Content is inline redacted with token mask [REDACTED_PCI:****0366] (got: ${pciInspect.data.redacted_content})`
    );
    assert(!pciInspect.data.redacted_content.includes('4532015112830366'), 'Raw credit card number is completely eliminated from redacted text');
    assert(Boolean(pciInspect.data.incident_id), 'Incident ID is generated and recorded for the redaction');

    // 6c. Invalid Luhn Card (16 digits that fail checksum should NOT trigger false positive)
    // 4000000000000001 fails Luhn (sum = 9)
    const invalidLuhnInspect = await request('/admin/operations/dlp/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        content: 'Product reference code 4000000000000001 for warehouse lookup.',
        targetScope: 'posts:publish',
        entityType: 'post',
        entityId: 'post-luhn-fail-03',
      }),
    });
    assert(invalidLuhnInspect.status === 200, 'Invalid Luhn inspection returns 200 OK');
    assert(invalidLuhnInspect.data.action_taken === 'passed', 'Non-Luhn 16-digit number correctly ignored to prevent false positive');

    // 6d. Critical Credentials / AWS Key (Block Outright)
    const credsInspect = await request('/admin/operations/dlp/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        content: 'Deploying AWS worker using AKIAIOSFODNN7EXAMPLE credentials now.',
        targetScope: 'posts:publish',
        entityType: 'post',
        entityId: 'post-creds-04',
      }),
    });
    assert(credsInspect.status === 200, 'Credentials inspection returns 200 OK');
    assert(credsInspect.data.action_taken === 'blocked', 'AWS key violation triggers action_taken: blocked');
    assert(credsInspect.data.allowed === false, 'Blocked content allowed flag is false');
    assert(credsInspect.data.highest_severity === 'fatal', 'Violation severity is fatal');
    assert(!credsInspect.data.redacted_content.includes('AKIAIOSFODNN7EXAMPLE'), 'Raw AWS key is eliminated from masked output');

    // 6e. PII / Social Security Number (Quarantine Queue)
    const piiInspect = await request('/admin/operations/dlp/inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        content: 'New executive hire identity verification SSN: 123-45-6789 for records.',
        targetScope: 'posts:publish',
        entityType: 'post',
        entityId: 'post-pii-05',
      }),
    });
    assert(piiInspect.status === 200, 'PII inspection returns 200 OK');
    assert(piiInspect.data.action_taken === 'quarantined', 'SSN violation triggers action_taken: quarantined');
    assert(piiInspect.data.allowed === false, 'Quarantined content is blocked from immediate publication (allowed: false)');
    assert(Boolean(piiInspect.data.incident_id), 'Incident ID is generated for quarantine queue');
    const piiIncidentId = piiInspect.data.incident_id;

    // STEP 7: Live Sandbox Scanner Simulation
    console.log('\n--- Step 7: Live Sandbox Scanner Simulation ---');
    const simRes = await request('/admin/operations/dlp/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        content: 'Sandbox test with card 4532015112830366 and AWS AKIAIOSFODNN7EXAMPLE embedded.',
      }),
    });
    assert(simRes.status === 200, `DLP simulation scan returns 200 OK (got ${simRes.status}: ${JSON.stringify(simRes.data)})`);
    assert(simRes.data.violations.length >= 2, `Simulation detected all embedded violations (found: ${simRes.data.violations.length})`);
    assert(simRes.data.action_taken === 'blocked', 'Combined simulation correctly resolves to highest severity action (blocked)');
    assert(simRes.data.redacted_content.includes('[REDACTED_PCI:****0366]'), 'Simulation preview includes PCI redaction');

    // STEP 8: Incident Quarantine Review Workflow
    console.log('\n--- Step 8: Incident Quarantine Review Workflow ---');
    // 8a. List incidents
    const incListRes = await request('/admin/operations/dlp/incidents?quarantine_status=pending_review', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(incListRes.status === 200, 'List quarantined incidents returns 200 OK');
    const pendingIncidents = incListRes.data.incidents;
    const targetInc = pendingIncidents.find((i) => i.id === piiIncidentId);
    assert(Boolean(targetInc), `Newly created quarantined incident ${piiIncidentId} found in pending_review queue`);
    assert(targetInc.quarantine_status === 'pending_review', 'Incident quarantine_status is pending_review');

    // 8b. Security Officer Review: Approve Override
    const reviewApproveRes = await request(`/admin/operations/dlp/incidents/${piiIncidentId}/review`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        decision: 'approved_override',
        reviewNotes: 'Authorized exception: Verified synthetic SSN used in training documentation.',
      }),
    });
    assert(reviewApproveRes.status === 200, 'Quarantine review submission returns 200 OK');
    assert(reviewApproveRes.data.quarantine_status === 'approved_override', 'Incident status updated to approved_override');
    assert(Boolean(reviewApproveRes.data.reviewed_at), 'reviewed_at timestamp is populated');
    assert(reviewApproveRes.data.reviewed_by === superadmin.id, 'reviewed_by is recorded from superadmin token');

    // 8c. Security Officer Review on pre-seeded item: Reject Dismissal
    const rejectReviewRes = await request('/admin/operations/dlp/incidents/dlp-inc-quarantine-seed01/review', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: 'default-tenant-001',
        decision: 'rejected_dismissed',
        reviewNotes: 'Security violation: Confirmed PII leak. Post permanently discarded.',
      }),
    });
    assert(rejectReviewRes.status === 200, 'Pre-seeded quarantine review rejection returns 200 OK');
    assert(rejectReviewRes.data.quarantine_status === 'rejected_dismissed', 'Incident status updated to rejected_dismissed');

    // STEP 9: Zero Plaintext Secret Leakage Verification
    console.log('\n--- Step 9: Zero Plaintext Secret Leakage Verification ---');
    const [leakIncidents] = await db.execute(
      "SELECT masked_content, violation_details FROM dlp_incidents WHERE id = ?",
      [piiIncidentId]
    );
    assert(leakIncidents.length === 1, 'Incident record located in database');
    const maskedContentDb = leakIncidents[0].masked_content;
    assert(!maskedContentDb.includes('123-45-6789'), 'Database masked_content never stores plaintext SSN');

    const [auditRows] = await db.execute(
      "SELECT details FROM superadmin_audit_logs WHERE action IN ('dlp_policy_created', 'dlp_quarantine_reviewed') ORDER BY created_at DESC LIMIT 5"
    );
    assert(auditRows.length > 0, 'Superadmin audit logs contain audited DLP actions');
    for (const log of auditRows) {
      const detailsStr = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {});
      assert(!detailsStr.includes('4532015112830366'), 'Audit logs never contain plaintext credit card numbers');
      assert(!detailsStr.includes('AKIAIOSFODNN7EXAMPLE'), 'Audit logs never contain plaintext AWS credentials');
    }

    // STEP 10: Final Meta Publication Lock Invariant Verification
    await verifyMetaLock(db, 'Post-Test Verification');

    console.log('\n========================================================================');
    console.log(`   STAGE 25 SUMMARY: ALL ${passedTests} ASSERTIONS PASSED (100% SUCCESS)   `);
    console.log('========================================================================\n');
  } finally {
    await db.end();
  }
}

runSuite().catch((err) => {
  console.error('\n❌ STAGE 25 FATAL RUNTIME ERROR:', err);
  process.exit(1);
});
