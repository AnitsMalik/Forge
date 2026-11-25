/**
 * Stage 38: Enterprise Continuous Compliance, SOC2/HIPAA/GDPR Automated Evidence Locker & Security Posture Mesh Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Continuous Compliance Telemetry & Aggregate Security Posture
 * 4. Pre-seeded Core Regulatory Controls (SOC2, HIPAA, GDPR, ISO27001, FedRAMP)
 * 5. Controls Filtering (by framework, status) & Single Control Deep Retrieval
 * 6. Automated Control Live Evaluation & Cryptographic SHA-256 Evidence Generation
 * 7. Evidence Locker Querying & Filtering (by control, collector type)
 * 8. Scoped Auditor Portal Session Provisioning, Validation & Revocation
 * 9. In-Memory What-If Audit Readiness Simulation Sandbox
 * 10. Cryptographic Evidence Package Export with Root SHA-256 Verification Hash
 * 11. Superadmin Audit Trail Ledger & Event Tracking
 * 12. Complete Database Cleanup & Test Idempotency
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
    `[Meta Lock ${phase}] Variant status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Variant status is strictly "published" (found: ${variant.status})`);

  const [jobRows] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [TARGET_JOB_ID]
  );
  assert(jobRows.length > 0, `[Meta Lock ${phase}] Publishing job ${TARGET_JOB_ID} must exist`);
  const job = jobRows[0];
  logPass(`[Meta Lock ${phase}] Publishing job exists with ID = ${TARGET_JOB_ID}`);

  assert.strictEqual(
    job.status,
    'published',
    `[Meta Lock ${phase}] Job status must be strictly 'published'`
  );
  logPass(`[Meta Lock ${phase}] Job status is strictly "published" (found: ${job.status})`);
}

async function runStage38Tests() {
  console.log('\n========================================================================');
  console.log('--- STAGE 38: Continuous Compliance & Evidence Locker Test Suite ---');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 0. Cleanup temporary test artifacts for idempotency
    await connection.execute("DELETE FROM compliance_auditor_sessions WHERE auditor_firm LIKE 'Test %'");
    await connection.execute("DELETE FROM compliance_evidences WHERE evidence_title LIKE '%Live Evidence Check%'");
    await connection.execute("UPDATE compliance_controls SET evidence_count = 1 WHERE id != 'ctrl-soc2-cc61'");
    await connection.execute("UPDATE compliance_controls SET evidence_count = 2 WHERE id = 'ctrl-soc2-cc61'");

    // 1. Meta Lock PRE-verification
    console.log('[1/12] Verifying Production Meta Publication Lock (PRE-CHECK)...');
    await verifyMetaLock(connection, 'PRE');

    // 2. Auth Tokens & RBAC Guardrails
    console.log('\n[2/12] Testing Superadmin Security & RBAC Guardrails...');
    const [superadminRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadminRows.length > 0, 'Must have at least one active superadmin user');
    const superadmin = superadminRows[0];
    logPass('Found active superadmin user');

    const [memberRows] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(memberRows.length > 0, 'Must have at least one active regular user');
    const regularUser = memberRows[0];
    logPass('Found active regular tenant member');

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperAdmin: true },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, isSuperAdmin: false, tenantId: regularUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const resNoAuth = await fetch(`${BASE_URL}/admin/operations/compliance-locker/telemetry`);
    assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated request must return 401 Unauthorized');
    logPass('Unauthenticated request rejected with 401 Unauthorized');

    const resForbidden = await fetch(`${BASE_URL}/admin/operations/compliance-locker/telemetry`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, 'Regular user must return 403 Forbidden');
    logPass('Regular user request rejected with 403 Forbidden');

    const resAuth = await fetch(`${BASE_URL}/admin/operations/compliance-locker/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAuth.status, 200, 'Superadmin request must return 200 OK');
    const telemetryBody = await resAuth.json();
    assert.strictEqual(telemetryBody.success, true);
    logPass('Superadmin authentication successfully granted (200 OK)');

    // 3. Telemetry Validation
    console.log('\n[3/12] Validating Continuous Compliance Telemetry...');
    const tel = telemetryBody.data;
    assert(typeof tel.overallComplianceScore === 'number', 'overallComplianceScore must be a number');
    assert(tel.overallComplianceScore >= 95, `overallComplianceScore must be >= 95% (found ${tel.overallComplianceScore}%)`);
    logPass(`overallComplianceScore verified (${tel.overallComplianceScore}%)`);

    assert(tel.totalControls >= 6, `totalControls must be >= 6 (found ${tel.totalControls})`);
    logPass(`totalControls verified (${tel.totalControls} controls)`);

    assert(tel.compliantControlsCount >= 6, `compliantControlsCount must be >= 6 (found ${tel.compliantControlsCount})`);
    logPass(`compliantControlsCount verified (${tel.compliantControlsCount} passing)`);

    assert(tel.automatedEvidenceItemsCount >= 6, `automatedEvidenceItemsCount must be >= 6 (found ${tel.automatedEvidenceItemsCount})`);
    logPass(`automatedEvidenceItemsCount verified (${tel.automatedEvidenceItemsCount} items)`);

    assert(tel.activeAuditorSessionsCount >= 1, `activeAuditorSessionsCount must be >= 1 (found ${tel.activeAuditorSessionsCount})`);
    logPass(`activeAuditorSessionsCount verified (${tel.activeAuditorSessionsCount} active sessions)`);

    assert(typeof tel.frameworkScores === 'object', 'frameworkScores must be an object');
    assert(tel.frameworkScores.soc2_type2 >= 95, 'SOC 2 Type II framework score must be >= 95%');
    logPass(`frameworkScores.soc2_type2 verified (${tel.frameworkScores.soc2_type2}%)`);
    assert(tel.frameworkScores.hipaa >= 95, 'HIPAA framework score must be >= 95%');
    logPass(`frameworkScores.hipaa verified (${tel.frameworkScores.hipaa}%)`);
    assert(tel.frameworkScores.gdpr >= 95, 'GDPR framework score must be >= 95%');
    logPass(`frameworkScores.gdpr verified (${tel.frameworkScores.gdpr}%)`);
    assert(tel.frameworkScores.iso27001 >= 95, 'ISO 27001 framework score must be >= 95%');
    logPass(`frameworkScores.iso27001 verified (${tel.frameworkScores.iso27001}%)`);
    assert(tel.frameworkScores.fedramp >= 95, 'FedRAMP framework score must be >= 95%');
    logPass(`frameworkScores.fedramp verified (${tel.frameworkScores.fedramp}%)`);

    assert(Array.isArray(tel.recentEvidenceFeed), 'recentEvidenceFeed must be an array');
    assert(tel.recentEvidenceFeed.length > 0, 'recentEvidenceFeed must contain evidence records');
    logPass(`recentEvidenceFeed contains ${tel.recentEvidenceFeed.length} recent evidence records`);

    // 4. Pre-seeded Regulatory Controls
    console.log('\n[4/12] Inspecting Pre-Seeded Regulatory Controls...');
    const resControls = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resControls.status, 200);
    const controls = (await resControls.json()).data;
    assert(controls.length >= 6, `Must have at least 6 controls (found ${controls.length})`);

    const cSoc2 = controls.find((c) => c.id === 'ctrl-soc2-cc61');
    assert(cSoc2, 'ctrl-soc2-cc61 must exist');
    assert.strictEqual(cSoc2.control_code, 'CC6.1');
    assert.strictEqual(cSoc2.framework, 'soc2_type2');
    assert.strictEqual(cSoc2.collector_type, 'access_control');
    assert.strictEqual(cSoc2.status, 'compliant');
    logPass('Pre-seeded SOC2 CC6.1 Logical Access Control verified');

    const cDlp = controls.find((c) => c.id === 'ctrl-soc2-cc66');
    assert(cDlp, 'ctrl-soc2-cc66 must exist');
    assert.strictEqual(cDlp.control_code, 'CC6.6');
    assert.strictEqual(cDlp.collector_type, 'dlp_guardrails');
    logPass('Pre-seeded SOC2 CC6.6 DLP Perimeter Control verified');

    const cHipaa = controls.find((c) => c.id === 'ctrl-hipaa-164312');
    assert(cHipaa, 'ctrl-hipaa-164312 must exist');
    assert.strictEqual(cHipaa.control_code, 'HIPAA-164.312');
    assert.strictEqual(cHipaa.collector_type, 'secret_rotation');
    logPass('Pre-seeded HIPAA-164.312 Secret Rotation Control verified');

    const cGdpr = controls.find((c) => c.id === 'ctrl-gdpr-art32');
    assert(cGdpr, 'ctrl-gdpr-art32 must exist');
    assert.strictEqual(cGdpr.control_code, 'GDPR-Art32');
    assert.strictEqual(cGdpr.collector_type, 'worm_tamper_proof');
    logPass('Pre-seeded GDPR Art. 32 WORM Tamper Proof Control verified');

    const cIso = controls.find((c) => c.id === 'ctrl-iso-a12');
    assert(cIso, 'ctrl-iso-a12 must exist');
    assert.strictEqual(cIso.control_code, 'ISO27001-A.12');
    assert.strictEqual(cIso.collector_type, 'incident_response');
    logPass('Pre-seeded ISO27001-A.12 Incident Response Control verified');

    const cFedramp = controls.find((c) => c.id === 'ctrl-fedramp-sc13');
    assert(cFedramp, 'ctrl-fedramp-sc13 must exist');
    assert.strictEqual(cFedramp.control_code, 'FedRAMP-SC-13');
    assert.strictEqual(cFedramp.collector_type, 'encryption_at_rest');
    logPass('Pre-seeded FedRAMP-SC-13 Encryption at Rest Control verified');

    // 5. Controls Filtering & Retrieval
    console.log('\n[5/12] Testing Controls Filtering & Single Retrieval...');
    const resFilter = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls?framework=soc2_type2`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resFilter.status, 200);
    const filtered = (await resFilter.json()).data;
    assert(filtered.every((c) => c.framework === 'soc2_type2'), 'All filtered controls must belong to soc2_type2');
    logPass(`Framework filtering verified (?framework=soc2_type2 returned ${filtered.length} controls)`);

    const resSingle = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls/ctrl-soc2-cc61`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resSingle.status, 200);
    const singleCtrl = (await resSingle.json()).data;
    assert.strictEqual(singleCtrl.id, 'ctrl-soc2-cc61');
    logPass('Single control retrieved successfully by ID (ctrl-soc2-cc61)');

    const resNotFound = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls/non-existent-control-id`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resNotFound.status, 404);
    logPass('Non-existent control rejected with 404 Not Found');

    // 6. Automated Control Live Evaluation & Cryptographic Evidence
    console.log('\n[6/12] Triggering Automated Control Evaluation & SHA-256 Evidence Generation...');
    const resEval = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls/ctrl-soc2-cc61/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resEval.status, 200);
    const evalResult = (await resEval.json()).data;
    assert(evalResult.control, 'Evaluation must return updated control');
    assert(evalResult.evidence, 'Evaluation must return new evidence record');
    assert.strictEqual(evalResult.control.id, 'ctrl-soc2-cc61');
    assert.strictEqual(evalResult.evidence.evaluation_status, 'passed');
    assert.strictEqual(evalResult.evidence.evidence_payload_hash.length, 64, 'Evidence payload hash must be 64-char SHA-256');
    logPass(`Control CC6.1 evaluated: Evidence generated with SHA-256 = ${evalResult.evidence.evidence_payload_hash.slice(0, 16)}...`);

    const resBadEval = await fetch(`${BASE_URL}/admin/operations/compliance-locker/controls/non-existent-control-id/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resBadEval.status, 400);
    logPass('Evaluating non-existent control rejected with 400');

    // 7. Evidence Locker Querying & Filtering
    console.log('\n[7/12] Testing Evidence Locker Querying & Collector Filtering...');
    const resEvidence = await fetch(`${BASE_URL}/admin/operations/compliance-locker/evidence`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resEvidence.status, 200);
    const allEvidence = (await resEvidence.json()).data;
    assert(allEvidence.length >= 7, `Must have at least 7 evidence records (found ${allEvidence.length})`);
    logPass(`Evidence locker catalog verified (${allEvidence.length} total evidence entries)`);

    const resFilterEv = await fetch(`${BASE_URL}/admin/operations/compliance-locker/evidence?collectorType=access_control`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resFilterEv.status, 200);
    const filteredEv = (await resFilterEv.json()).data;
    assert(filteredEv.every((e) => e.collector_type === 'access_control'), 'Filtered evidence must have collector_type=access_control');
    logPass(`Collector filtering verified (?collectorType=access_control returned ${filteredEv.length} records)`);

    // 8. Scoped External Auditor Portal Sessions
    console.log('\n[8/12] Testing Scoped Auditor Portal Session Lifecycle (Create, Validate, Revoke)...');
    const resSessions = await fetch(`${BASE_URL}/admin/operations/compliance-locker/auditor-sessions`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resSessions.status, 200);
    const sessions = (await resSessions.json()).data;
    assert(sessions.length >= 1, `Must have at least 1 pre-seeded auditor session (found ${sessions.length})`);

    const kpmgSession = sessions.find((s) => s.id === 'aud-kpmg-soc2-01');
    assert(kpmgSession, 'aud-kpmg-soc2-01 must exist');
    assert.strictEqual(kpmgSession.auditor_firm, 'KPMG US LLP');
    assert.strictEqual(kpmgSession.is_active, true);
    logPass('Pre-seeded auditor portal session verified (KPMG US LLP, active)');

    // Validation: missing email
    const resBadEmail = await fetch(`${BASE_URL}/admin/operations/compliance-locker/auditor-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ auditor_email: 'invalid-email', auditor_firm: 'Test Firm', framework_scope: ['soc2_type2'] }),
    });
    assert.strictEqual(resBadEmail.status, 400);
    logPass('Invalid auditor email rejected with 400');

    // Validation: empty scope
    const resEmptyScope = await fetch(`${BASE_URL}/admin/operations/compliance-locker/auditor-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ auditor_email: 'auditor@pwc.com', auditor_firm: 'Test PwC LLP', framework_scope: [] }),
    });
    assert.strictEqual(resEmptyScope.status, 400);
    logPass('Empty framework scope rejected with 400');

    // Create valid session
    const resCreateSession = await fetch(`${BASE_URL}/admin/operations/compliance-locker/auditor-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        auditor_email: 'auditor.lead@pwc.com',
        auditor_firm: 'Test PwC Cyber Audit',
        framework_scope: ['hipaa', 'fedramp'],
        duration_days: 14,
      }),
    });
    assert.strictEqual(resCreateSession.status, 201);
    const createdSession = (await resCreateSession.json()).data;
    assert(createdSession.id.startsWith('aud-'), 'Generated session ID must start with aud-');
    assert.strictEqual(createdSession.is_active, true);
    assert.strictEqual(createdSession.access_token.length, 64, 'Access token must be 64-char hex string');
    logPass(`Auditor portal session provisioned (ID: ${createdSession.id}, Token: ${createdSession.access_token.slice(0, 16)}...)`);

    // Revoke session
    const resRevoke = await fetch(`${BASE_URL}/admin/operations/compliance-locker/auditor-sessions/${createdSession.id}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resRevoke.status, 200);
    const revokedSession = (await resRevoke.json()).data;
    assert.strictEqual(revokedSession.is_active, false);
    logPass(`Auditor portal access revoked successfully (status: is_active=false)`);

    // 9. In-Memory What-If Audit Readiness Simulation
    console.log('\n[9/12] Testing In-Memory What-If Audit Readiness Simulation Sandbox...');
    const resSim = await fetch(`${BASE_URL}/admin/operations/compliance-locker/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        target_framework: 'soc2_type2',
        strict_mode: true,
      }),
    });
    assert.strictEqual(resSim.status, 200);
    const simResult = (await resSim.json()).data;
    assert.strictEqual(simResult.simulated, true);
    assert.strictEqual(simResult.framework, 'soc2_type2');
    assert.strictEqual(simResult.readinessStatus, 'audit_ready');
    assert(simResult.overallScore >= 95, `Projected audit score must be >= 95% (found ${simResult.overallScore}%)`);
    assert(simResult.auditorRecommendations.length >= 3, 'Must have at least 3 auditor guidance recommendations');
    logPass(`Audit readiness simulated for SOC 2 Type II: Score=${simResult.overallScore}%, Status=${simResult.readinessStatus}`);

    // 10. Cryptographic Evidence Package Export
    console.log('\n[10/12] Testing Cryptographic Evidence Package Export...');
    const resPackage = await fetch(`${BASE_URL}/admin/operations/compliance-locker/export-package?framework=soc2_type2`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resPackage.status, 200);
    const pkg = (await resPackage.json()).data;
    assert.strictEqual(pkg.framework, 'soc2_type2');
    assert(pkg.controls.length > 0, 'Export package must contain controls');
    assert(pkg.evidenceLedger.length > 0, 'Export package must contain evidence ledger');
    assert.strictEqual(pkg.packageHash.length, 64, 'Package verification hash must be 64-char SHA-256');
    logPass(`Evidence package exported with root SHA-256 package hash = ${pkg.packageHash.slice(0, 16)}...`);

    // 11. Superadmin Audit Trail Ledger
    console.log('\n[11/12] Verifying Superadmin Audit Trail Ledger & Event Tracking...');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type, target_resource_id, reason FROM superadmin_audit_logs WHERE target_resource_type = 'compliance_locker' ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length > 0, 'Must have recorded audit log entries for compliance operations');
    const auditActions = auditRows.map((r) => r.action);
    assert(auditActions.includes('EVALUATE_COMPLIANCE_CONTROL'), 'Must include EVALUATE_COMPLIANCE_CONTROL audit action');
    assert(auditActions.includes('CREATE_AUDITOR_SESSION'), 'Must include CREATE_AUDITOR_SESSION audit action');
    assert(auditActions.includes('REVOKE_AUDITOR_SESSION'), 'Must include REVOKE_AUDITOR_SESSION audit action');
    logPass(`Superadmin audit ledger verified with ${auditRows.length} recent compliance action events`);

    // 12. Cleanup DB state & Meta Lock POST-verification
    console.log('\n[12/12] Cleaning Up Test Artifacts & Verifying Meta Lock (POST-CHECK)...');
    await connection.execute("DELETE FROM compliance_auditor_sessions WHERE auditor_firm LIKE 'Test %'");
    await connection.execute("DELETE FROM compliance_evidences WHERE evidence_title LIKE '%Live Evidence Check%'");
    await connection.execute("UPDATE compliance_controls SET evidence_count = 1 WHERE id != 'ctrl-soc2-cc61'");
    await connection.execute("UPDATE compliance_controls SET evidence_count = 2 WHERE id = 'ctrl-soc2-cc61'");
    logPass('Database cleaned up and restored to baseline state');

    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`--- STAGE 38 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED WITH 100% SUCCESS ---`);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage38Tests().catch((err) => {
  console.error('\n❌ STAGE 38 TEST SUITE FAILED:', err);
  process.exit(1);
});
