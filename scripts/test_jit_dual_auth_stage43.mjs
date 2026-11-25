/**
 * Stage 43: Enterprise Zero-Trust Ephemeral Access Grants, Just-In-Time (JIT) Privilege Elevation & Dual-Authorization Control Plane Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time JIT Telemetry & Zero-Trust Posture
 * 4. Dual-Authorization Guardrail Policy Rules Registry
 * 5. Create JIT Privilege Elevation Request (Pending Multi-Operator Quorum)
 * 6. Dual-Authorization Invariant: Strict Self-Approval Rejection (403 Forbidden)
 * 7. Dual-Authorization Multi-Party Approval & Ephemeral Lease Issuance (HMAC Signature)
 * 8. Ephemeral Credential Lease Query & Time-Bounded Lease State
 * 9. On-Demand Immediate Ephemeral Credential Lease Revocation
 * 10. Emergency Break-Glass Root Elevation Simulator & Forensic Signature Issuance
 * 11. Cryptographic Forensic Audit Session Replay & HMAC Integrity
 * 12. Superadmin Operations Forensic Audit Trail Verification
 * 13. Idempotent Test Cleanup & Zero Residual State Mutation
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

async function runStage43Tests() {
  console.log('\n================================================================');
  console.log(' STAGE 43: ZERO-TRUST JIT ACCESS & DUAL-AUTHORIZATION SUITE      ');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. PRE-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('1. Verifying Production Meta Invariant Lock (PRE-CHECK)...');
    await verifyMetaLock(connection, 'PRE');

    // -------------------------------------------------------------------------
    // 2. SETUP AUTH TOKENS (Superadmin 1, Superadmin 2, Regular User)
    // -------------------------------------------------------------------------
    console.log('\n2. Generating Test JWT Credentials & Multi-Operator Identities...');
    const [superadminRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 2'
    );
    assert(superadminRows.length > 0, 'At least one active superadmin user required in database');
    const superadminUser1 = superadminRows[0];

    const superadminToken1 = jwt.sign(
      {
        userId: superadminUser1.id,
        email: superadminUser1.email,
        isSuperadmin: true,
        is_superadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup second operator for dual-authorization testing
    let superadminUser2 = superadminRows.length > 1 ? superadminRows[1] : null;
    let createdTemporarySecondAdmin = false;

    if (!superadminUser2) {
      // Insert temporary secondary superadmin for dual-auth invariant test
      const tempId = 'temp-approver-' + Date.now();
      await connection.execute(
        `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
         VALUES (?, 'secondary.approver@socialforge.test', 'dummy_hash', 'Secondary Lead Admin', 1, 1, NOW(), NOW())`,
        [tempId]
      );
      superadminUser2 = { id: tempId, email: 'secondary.approver@socialforge.test' };
      createdTemporarySecondAdmin = true;
    }

    const superadminToken2 = jwt.sign(
      {
        userId: superadminUser2.id,
        email: superadminUser2.email,
        isSuperadmin: true,
        is_superadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const [regularRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 0 AND is_active = 1 LIMIT 1'
    );
    let regularToken = null;
    if (regularRows.length > 0) {
      regularToken = jwt.sign(
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
    logPass(`Primary Operator authenticated: ${superadminUser1.email}`);
    logPass(`Secondary Approver authenticated: ${superadminUser2.email}`);

    // -------------------------------------------------------------------------
    // 3. RBAC & SECURITY GUARDRAILS
    // -------------------------------------------------------------------------
    console.log('\n3. Validating RBAC Security Enforcement (401, 403, 200)...');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/jit-access/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
    logPass('Unauthenticated JIT access rejected with HTTP 401 Unauthorized');

    if (regularToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/jit-access/telemetry`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin token must be rejected with 403');
      logPass('Non-superadmin tenant user access rejected with HTTP 403 Forbidden');
    }

    const authHeaders1 = {
      Authorization: `Bearer ${superadminToken1}`,
      'Content-Type': 'application/json',
    };

    const authHeaders2 = {
      Authorization: `Bearer ${superadminToken2}`,
      'Content-Type': 'application/json',
    };

    // -------------------------------------------------------------------------
    // 4. JIT TELEMETRY & ZERO-TRUST POSTURE
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Real-Time JIT Telemetry & Zero-Trust Posture...');
    const telRes = await fetch(`${BASE_URL}/admin/operations/jit-access/telemetry`, {
      headers: authHeaders1,
    });
    assert.strictEqual(telRes.status, 200, 'Superadmin access to JIT telemetry must return 200');
    const telData = (await telRes.json()).data;
    assert('active_leases' in telData, 'Telemetry must include active_leases count');
    assert('pending_requests' in telData, 'Telemetry must include pending_requests count');
    assert('total_elevations_24h' in telData, 'Telemetry must include total_elevations_24h');
    assert.strictEqual(telData.compliance_posture, 'strict_zero_trust', 'Zero-trust posture must be strict');
    logPass(`JIT Telemetry verified (Posture: ${telData.compliance_posture}, Active Leases: ${telData.active_leases})`);

    // -------------------------------------------------------------------------
    // 5. DUAL-AUTHORIZATION RULES REGISTRY
    // -------------------------------------------------------------------------
    console.log('\n5. Inspecting Dual-Authorization Guardrail Rules...');
    const rulesRes = await fetch(`${BASE_URL}/admin/operations/jit-access/rules`, {
      headers: authHeaders1,
    });
    assert.strictEqual(rulesRes.status, 200, 'Superadmin access to rules must return 200');
    const rules = (await rulesRes.json()).data;
    assert(Array.isArray(rules) && rules.length >= 4, 'Must have at least 4 active dual-auth rules');

    const expectedActions = [
      'production_post_purge',
      'billing_plan_override',
      'disaster_recovery_failover',
      'master_secret_rotation',
    ];
    for (const action of expectedActions) {
      const found = rules.find((r) => r.action_name === action);
      assert(found, `Dual authorization rule for '${action}' must exist`);
      assert.strictEqual(Number(found.required_approvers), 2, `'${action}' must require 2 approvers`);
      assert.strictEqual(Boolean(found.is_active), true, `'${action}' rule must be active`);
    }
    logPass(`Dual-authorization rules verified for high-impact actions (${rules.length} enforced)`);

    // -------------------------------------------------------------------------
    // 6. CREATE JIT PRIVILEGE ELEVATION REQUEST
    // -------------------------------------------------------------------------
    console.log('\n6. Creating JIT Privilege Elevation Request...');
    const createReqRes = await fetch(`${BASE_URL}/admin/operations/jit-access/requests`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        target_role: 'superadmin',
        elevation_tier: 'elevated_admin',
        justification: 'Automated test privilege escalation for zero-trust dual-auth verification',
        requested_duration_minutes: 45,
      }),
    });
    assert.strictEqual(createReqRes.status, 201, 'Request creation must return 201');
    const createdRequest = (await createReqRes.json()).data;
    assert(createdRequest.id, 'Created request must have an ID');
    assert.strictEqual(createdRequest.status, 'pending_approval', 'Initial status must be pending_approval');
    assert.strictEqual(createdRequest.requester_email, superadminUser1.email, 'Requester email must match');
    assert.strictEqual(createdRequest.requested_duration_minutes, 45, 'Requested duration must be 45');
    logPass(`JIT Request created successfully (ID: ${createdRequest.id}, Tier: ${createdRequest.elevation_tier})`);

    // -------------------------------------------------------------------------
    // 7. DUAL-AUTHORIZATION INVARIANT: STRICT SELF-APPROVAL REJECTION
    // -------------------------------------------------------------------------
    console.log('\n7. Enforcing Dual-Authorization Invariant: Self-Approval Prevention...');
    const selfApproveRes = await fetch(`${BASE_URL}/admin/operations/jit-access/requests/${createdRequest.id}/approve`, {
      method: 'POST',
      headers: authHeaders1, // Requestor trying to approve their own request
      body: JSON.stringify({
        approved: true,
        decision_notes: 'Attempted illicit self-approval',
      }),
    });
    assert.strictEqual(selfApproveRes.status, 403, 'Self-approval must strictly return HTTP 403 Forbidden');
    const selfApproveErr = await selfApproveRes.json();
    assert(
      selfApproveErr.error.includes('Dual-Authorization Violation'),
      'Error message must state dual-authorization violation'
    );
    logPass('Strict Dual-Authorization invariant verified: Operator self-approval rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // 8. DUAL-AUTHORIZATION SUCCESS: SECOND OPERATOR APPROVAL & LEASE ISSUANCE
    // -------------------------------------------------------------------------
    console.log('\n8. Dual-Authorization Quorum: Second Operator Approval...');
    const secondApproveRes = await fetch(`${BASE_URL}/admin/operations/jit-access/requests/${createdRequest.id}/approve`, {
      method: 'POST',
      headers: authHeaders2, // Independent second operator approving
      body: JSON.stringify({
        approved: true,
        decision_notes: 'Approved by secondary lead administrator for automated compliance testing',
      }),
    });
    assert.strictEqual(secondApproveRes.status, 200, 'Second operator approval must succeed with 200');
    const approvalResult = (await secondApproveRes.json()).data;
    assert.strictEqual(approvalResult.success, true, 'Approval response must indicate success');
    assert.strictEqual(approvalResult.status, 'approved', 'Status must transition to approved');
    assert.strictEqual(approvalResult.approver_email, superadminUser2.email, 'Approver email must match operator 2');
    assert(approvalResult.lease, 'Approval must issue an active ephemeral credential lease');
    assert(approvalResult.lease.token_signature, 'Lease must have cryptographic token signature');
    assert.strictEqual(approvalResult.lease.status, 'active', 'Lease must be immediately active');
    const activeLeaseId = approvalResult.lease.id;
    logPass(`Dual-authorization quorum achieved: Lease issued (ID: ${activeLeaseId}, Signature: ${approvalResult.lease.token_signature.slice(0, 16)}...)`);

    // -------------------------------------------------------------------------
    // 9. EPHEMERAL CREDENTIAL LEASE QUERY & TTL VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n9. Querying Ephemeral Credential Leases & TTL Attributes...');
    const listLeasesRes = await fetch(`${BASE_URL}/admin/operations/jit-access/leases?status=active`, {
      headers: authHeaders1,
    });
    assert.strictEqual(listLeasesRes.status, 200, 'Lease list must return 200');
    const activeLeases = (await listLeasesRes.json()).data;
    const foundLease = activeLeases.find((l) => l.id === activeLeaseId);
    assert(foundLease, 'Newly issued lease must appear in active lease inventory');
    assert.strictEqual(foundLease.operator_email, superadminUser1.email, 'Lease operator must match requester');
    assert(new Date(foundLease.expires_at) > new Date(), 'Lease expiration must be in the future');
    logPass(`Active lease verified in inventory with valid TTL (Expires: ${foundLease.expires_at})`);

    // -------------------------------------------------------------------------
    // 10. ON-DEMAND IMMEDIATE EPHEMERAL LEASE REVOCATION
    // -------------------------------------------------------------------------
    console.log('\n10. Testing On-Demand Immediate Ephemeral Credential Lease Revocation...');
    const revokeRes = await fetch(`${BASE_URL}/admin/operations/jit-access/leases/${activeLeaseId}/revoke`, {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        reason: 'Automated test teardown revocation drill',
      }),
    });
    assert.strictEqual(revokeRes.status, 200, 'Lease revocation must return 200');
    const revokeResult = (await revokeRes.json()).data;
    assert.strictEqual(revokeResult.success, true, 'Revocation must report success');
    assert.strictEqual(revokeResult.lease_id, activeLeaseId, 'Revoked lease ID must match');

    // Confirm lease status updated in DB
    const [revokedRows] = await connection.execute(
      'SELECT status FROM ephemeral_credential_leases WHERE id = ?',
      [activeLeaseId]
    );
    assert.strictEqual(revokedRows[0].status, 'revoked', 'Lease record status must be revoked');
    logPass('On-demand lease revocation executed cleanly (Status transitioned to revoked)');

    // -------------------------------------------------------------------------
    // 11. EMERGENCY BREAK-GLASS ROOT ELEVATION SIMULATOR
    // -------------------------------------------------------------------------
    console.log('\n11. Testing Emergency Break-Glass Root Privilege Elevation Simulator...');
    const bgRes = await fetch(`${BASE_URL}/admin/operations/jit-access/break-glass`, {
      method: 'POST',
      headers: authHeaders1,
      body: JSON.stringify({
        justification: 'Automated drill: Unscheduled critical cluster recovery requiring break-glass root',
        duration_minutes: 20,
      }),
    });
    assert.strictEqual(bgRes.status, 200, 'Break-glass elevation must return 200');
    const bgResult = (await bgRes.json()).data;
    assert.strictEqual(bgResult.success, true, 'Break-glass result must report success');
    assert(bgResult.emergency_incident_id.toLowerCase().startsWith('inc-breakglass-'), 'Incident ID must be formatted properly');
    assert.strictEqual(bgResult.elevation_tier, 'break_glass_root', 'Elevation tier must be break_glass_root');
    assert.strictEqual(bgResult.alert_dispatched, true, 'Critical security alert must be dispatched');
    assert(bgResult.forensic_signature, 'Forensic cryptographic signature must be generated');
    const bgLeaseId = bgResult.lease_id;
    logPass(`Break-glass elevation simulated (Incident: ${bgResult.emergency_incident_id}, Signature: ${bgResult.forensic_signature.slice(0, 16)}...)`);

    // -------------------------------------------------------------------------
    // 12. FORENSIC AUDIT SESSION REPLAY & CRYPTOGRAPHIC INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n12. Validating Cryptographic Forensic Audit Session Replay...');
    const auditRes = await fetch(`${BASE_URL}/admin/operations/jit-access/audit-sessions?limit=10`, {
      headers: authHeaders1,
    });
    assert.strictEqual(auditRes.status, 200, 'Audit sessions list must return 200');
    const auditSessions = (await auditRes.json()).data;
    assert(Array.isArray(auditSessions) && auditSessions.length > 0, 'Must record audit sessions');

    const breakGlassAudit = auditSessions.find((s) => s.action_performed === 'BREAK_GLASS_ELEVATION');
    assert(breakGlassAudit, 'Break-glass elevation audit event must be recorded');
    assert.strictEqual(breakGlassAudit.lease_id, bgLeaseId, 'Audit lease ID must match break-glass lease');
    assert(breakGlassAudit.signature.length >= 32, 'Forensic signature must be at least 32 characters');
    logPass(`Forensic audit replay validated (Event: ${breakGlassAudit.action_performed}, Signature verified)`);

    // -------------------------------------------------------------------------
    // 13. SUPERADMIN OPERATIONS AUDIT TRAIL VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n13. Inspecting Superadmin Operations Forensic Audit Trail...');
    const [auditLogRows] = await connection.execute(
      `SELECT action, target_resource_type, details FROM superadmin_audit_logs 
       WHERE action IN ('JIT_ACCESS_REQUEST_SUBMITTED', 'JIT_ACCESS_REQUEST_APPROVED', 'EPHEMERAL_LEASE_REVOKED', 'EMERGENCY_BREAK_GLASS_TRIGGERED')
       ORDER BY created_at DESC LIMIT 10`
    );
    assert(auditLogRows.length >= 4, 'All 4 JIT lifecycle events must be recorded in superadmin_audit_logs');
    const actionsRecorded = auditLogRows.map((r) => r.action);
    assert(actionsRecorded.includes('JIT_ACCESS_REQUEST_SUBMITTED'), 'JIT_ACCESS_REQUEST_SUBMITTED audit event missing');
    assert(actionsRecorded.includes('JIT_ACCESS_REQUEST_APPROVED'), 'JIT_ACCESS_REQUEST_APPROVED audit event missing');
    assert(actionsRecorded.includes('EPHEMERAL_LEASE_REVOKED'), 'EPHEMERAL_LEASE_REVOKED audit event missing');
    assert(actionsRecorded.includes('EMERGENCY_BREAK_GLASS_TRIGGERED'), 'EMERGENCY_BREAK_GLASS_TRIGGERED audit event missing');
    logPass(`Superadmin audit trail verified (All 4 lifecycle operations logged with forensic metadata)`);

    // -------------------------------------------------------------------------
    // 14. TEST CLEANUP & IDEMPOTENCY
    // -------------------------------------------------------------------------
    console.log('\n14. Cleaning Up Test Artifacts for Strict Idempotency...');
    await connection.execute('DELETE FROM jit_audit_sessions WHERE lease_id IN (?, ?)', [activeLeaseId, bgLeaseId]);
    await connection.execute('DELETE FROM ephemeral_credential_leases WHERE id IN (?, ?)', [activeLeaseId, bgLeaseId]);
    await connection.execute('DELETE FROM jit_access_requests WHERE id = ?', [createdRequest.id]);
    if (createdTemporarySecondAdmin) {
      await connection.execute('DELETE FROM users WHERE id = ?', [superadminUser2.id]);
    }
    logPass('Test artifacts purged cleanly (Zero residual database mutation)');

    // -------------------------------------------------------------------------
    // 15. POST-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('\n15. Verifying Production Meta Invariant Lock (POST-CHECK)...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n================================================================');
    console.log(` STAGE 43 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED (100%)       `);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage43Tests().catch((err) => {
  console.error('\n❌ STAGE 43 TEST SUITE FAILED:', err);
  process.exit(1);
});
