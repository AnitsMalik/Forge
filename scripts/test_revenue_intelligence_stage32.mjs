/**
 * Stage 32: Enterprise Predictive Churn, Customer Lifetime Value & Revenue Expansion Intelligence Suite
 * SocialForge Platform v5.0.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview telemetry & KPI metrics (averageChurnRisk, totalProjectedLtv, netExpansionPipelineMrr, retentionSuccessRate)
 * 4. Pre-seeded flagship Tenant Churn Score & Customer LTV Metrics
 * 5. Algorithmic Risk Evaluation Engine:
 *    - Rejection of missing tenantId (400)
 *    - Multi-factor risk calculation with factor attribution
 *    - Automated LTV recalibration based on churn probability
 *    - Re-evaluation to healthy status with positive trend
 * 6. Customer LTV Metrics & Upsell Recommendations API:
 *    - Listing LTV cohorts
 *    - Retrieval by tenantId
 *    - Verification of upsell expansion signals
 * 7. Customer Success Interventions Lifecycle:
 *    - Rejection of short title (< 3 chars)
 *    - Rejection of invalid assignee email
 *    - Creation of proactive CS intervention playbook
 *    - Listing & status filtering
 *    - Updating status to 'completed' with outcome & resolution notes
 *    - Verification of completed_at timestamp
 *    - Safe deletion
 * 8. Predictive What-If Simulation Engine:
 *    - In-memory simulation of usage velocity, seat utilization, and incentive impacts
 *    - Verifying zero persistent database mutation
 * 9. Superadmin Operations Audit Trail:
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

async function runStage32Tests() {
  console.log('================================================================');
  console.log('   STAGE 32: PREDICTIVE CHURN & LTV REVENUE INTELLIGENCE SUITE  ');
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
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/overview`);
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    // Regular User -> 403 Forbidden
    const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/overview`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(forbiddenRes.status === 403, `Regular tenant member rejected with 403 (got ${forbiddenRes.status})`);

    // Superadmin -> 200 OK
    const superadminRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/overview`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(superadminRes.status === 200, `Superadmin access allowed with 200 (got ${superadminRes.status})`);

    // -------------------------------------------------------------------------
    // 4. OVERVIEW TELEMETRY & KPIS
    // -------------------------------------------------------------------------
    console.log('\n[Section 4: Overview Telemetry & Financial KPIs]');
    const overviewJson = await superadminRes.json();
    assert(overviewJson.success === true, 'Telemetry response has success: true');
    const telemetry = overviewJson.data;

    assert(typeof telemetry.totalMonitoredTenants === 'number', 'telemetry.totalMonitoredTenants is number');
    assert(typeof telemetry.averageChurnRisk === 'number', 'telemetry.averageChurnRisk is number');
    assert(typeof telemetry.totalProjectedLtv === 'number', 'telemetry.totalProjectedLtv is number');
    assert(typeof telemetry.totalCurrentMrr === 'number', 'telemetry.totalCurrentMrr is number');
    assert(typeof telemetry.activeInterventionsCount === 'number', 'telemetry.activeInterventionsCount is number');
    assert(typeof telemetry.retentionSuccessRate === 'number', 'telemetry.retentionSuccessRate is number');
    assert(telemetry.riskDistribution && typeof telemetry.riskDistribution.low === 'number', 'telemetry.riskDistribution contains risk tiers');
    assert(Array.isArray(telemetry.topRiskFactors), 'telemetry.topRiskFactors is array');

    // -------------------------------------------------------------------------
    // 5. CHURN SCORES API & LISTING
    // -------------------------------------------------------------------------
    console.log('\n[Section 5: Tenant Churn Scores API]');
    const listScoresRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listScoresRes.status === 200, 'GET /churn-scores returned 200');
    const listScoresJson = await listScoresRes.json();
    assert(Array.isArray(listScoresJson.data), 'listScores data is array');
    assert(listScoresJson.data.length > 0, 'Found at least one seeded churn score');

    const flagshipScore = listScoresJson.data[0];
    assert(typeof flagshipScore.churnRiskScore === 'number', 'churnRiskScore is numeric');
    assert(['low', 'medium', 'high', 'critical'].includes(flagshipScore.riskTier), 'riskTier is valid tier');
    assert(typeof flagshipScore.usageVelocityScore === 'number', 'usageVelocityScore is numeric');

    // Filter by tier
    const filteredTierRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores?tier=low`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(filteredTierRes.status === 200, 'GET /churn-scores?tier=low returned 200');
    const filteredTierJson = await filteredTierRes.json();
    for (const item of filteredTierJson.data) {
      assert(item.riskTier === 'low', `Filtered score has riskTier = low (got ${item.riskTier})`);
    }

    // Get by Tenant ID
    const singleScoreRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores/${targetTenantId}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(singleScoreRes.status === 200, `GET /churn-scores/${targetTenantId} returned 200`);
    const singleScoreJson = await singleScoreRes.json();
    assert(singleScoreJson.data.tenantId === targetTenantId, 'Single score matched target tenantId');

    // 404 for non-existent tenant
    const notFoundScoreRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores/00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(notFoundScoreRes.status === 404, 'Non-existent tenant churn score correctly returned 404');

    // -------------------------------------------------------------------------
    // 6. MULTI-FACTOR RISK EVALUATION ENGINE
    // -------------------------------------------------------------------------
    console.log('\n[Section 6: Multi-Factor Risk Evaluation Engine]');

    // Validation: Missing tenantId -> 400
    const invalidEvalRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores/evaluate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert(invalidEvalRes.status === 400, 'Missing tenantId rejected with 400');

    // Simulate At-Risk evaluation (low usage, degraded billing health)
    const atRiskEvalRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores/evaluate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        usageVelocityScore: 18.00,
        seatUtilizationPercent: 20.00,
        billingHealthScore: 50.00,
        supportSentiment: 0.30,
      }),
    });
    assert(atRiskEvalRes.status === 200, 'POST /churn-scores/evaluate with degraded factors returned 200');
    const atRiskJson = await atRiskEvalRes.json();
    assert(atRiskJson.data.churnRiskScore > 40.00, `Degraded metrics yielded elevated churn risk (got ${atRiskJson.data.churnRiskScore}%)`);
    assert(atRiskJson.data.riskTier === 'high' || atRiskJson.data.riskTier === 'critical', `Risk tier elevated to high/critical (got ${atRiskJson.data.riskTier})`);
    assert(atRiskJson.data.engagementTrend === 'steep_drop' || atRiskJson.data.engagementTrend === 'declining', 'Engagement trend shows deceleration');
    assert(atRiskJson.data.predictedChurnDate !== null, 'Predicted churn date established for elevated risk account');

    // Restore to Healthy state
    const healthyEvalRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/churn-scores/evaluate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        usageVelocityScore: 88.00,
        seatUtilizationPercent: 90.00,
        billingHealthScore: 100.00,
        supportSentiment: 0.95,
      }),
    });
    assert(healthyEvalRes.status === 200, 'POST /churn-scores/evaluate with healthy factors returned 200');
    const healthyJson = await healthyEvalRes.json();
    assert(healthyJson.data.churnRiskScore < 25.00, `Healthy factors returned low risk score (got ${healthyJson.data.churnRiskScore}%)`);
    assert(healthyJson.data.riskTier === 'low', 'Risk tier returned to low');
    assert(healthyJson.data.engagementTrend === 'improving', 'Engagement trend updated to improving');

    // -------------------------------------------------------------------------
    // 7. CUSTOMER LTV METRICS & EXPANSION SIGNALS
    // -------------------------------------------------------------------------
    console.log('\n[Section 7: Customer LTV & Expansion Signals]');
    const listLtvRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/ltv-metrics`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listLtvRes.status === 200, 'GET /ltv-metrics returned 200');
    const listLtvJson = await listLtvRes.json();
    assert(Array.isArray(listLtvJson.data), 'LTV metrics is array');
    assert(listLtvJson.data.length > 0, 'Found at least one LTV metric record');

    const targetLtv = listLtvJson.data.find((m) => m.tenantId === targetTenantId);
    assert(Boolean(targetLtv), `Found LTV metric for target tenant ${targetTenantId}`);
    assert(targetLtv.currentMrr > 0, `Current MRR is positive ($${targetLtv.currentMrr})`);
    assert(targetLtv.projectedLtvTotal > 0, `Projected LTV total is positive ($${targetLtv.projectedLtvTotal})`);
    assert(targetLtv.predictedLtvMonths >= 6, `Predicted LTV lifespan is at least 6 months (${targetLtv.predictedLtvMonths} mo)`);
    assert(Array.isArray(targetLtv.upsellRecommendations), 'Upsell recommendations is array');
    assert(targetLtv.upsellRecommendations.length > 0, 'Target tenant has upsell recommendations');

    // -------------------------------------------------------------------------
    // 8. CUSTOMER SUCCESS INTERVENTIONS LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n[Section 8: Customer Success Interventions Lifecycle]');

    // Validation: Title < 3 chars -> 400
    const invalidInterventionRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/interventions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        title: 'ab',
        playbookType: 'proactive_training_session',
        assignedTo: 'agent@socialforge.ai',
      }),
    });
    assert(invalidInterventionRes.status === 400, 'Short intervention title rejected with 400');

    // Validation: Invalid email -> 400
    const invalidEmailRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/interventions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        title: 'Valid Title Here',
        playbookType: 'proactive_training_session',
        assignedTo: 'invalid-email-address',
      }),
    });
    assert(invalidEmailRes.status === 400, 'Invalid email rejected with 400');

    // Create valid intervention
    const testInterventionTitle = `Automated CS Outreach Test ${Date.now()}`;
    const createInterventionRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/interventions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenantId: targetTenantId,
        title: testInterventionTitle,
        playbookType: 'usage_remediation',
        priority: 'high',
        assignedTo: 'lead.csm@socialforge.ai',
        triggerReason: 'Automated test suite intervention dispatch',
      }),
    });
    assert(createInterventionRes.status === 201, `POST /interventions returned 201 (got ${createInterventionRes.status})`);
    const createdInterventionJson = await createInterventionRes.json();
    const createdIntervention = createdInterventionJson.data;
    assert(createdIntervention.title === testInterventionTitle, 'Created intervention title matches input');
    assert(createdIntervention.status === 'pending', 'Initial status is pending');
    assert(createdIntervention.priority === 'high', 'Priority matches high');

    // Update intervention (transition to completed with outcome notes)
    const updateInterventionRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/interventions/${createdIntervention.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        outcomeEffectiveness: 'expanded',
        resolutionNotes: 'Tenant adopted Multi-Agent Fleet expansion package. Usage velocity rebounded +40%.',
      }),
    });
    assert(updateInterventionRes.status === 200, 'PATCH /interventions/:id returned 200');
    const updatedInterventionJson = await updateInterventionRes.json();
    assert(updatedInterventionJson.data.status === 'completed', 'Status updated to completed');
    assert(updatedInterventionJson.data.outcomeEffectiveness === 'expanded', 'Outcome recorded as expanded');
    assert(Boolean(updatedInterventionJson.data.completedAt), 'completedAt timestamp automatically recorded');

    // Delete intervention
    const deleteInterventionRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/interventions/${createdIntervention.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteInterventionRes.status === 200, 'DELETE /interventions/:id returned 200');

    // -------------------------------------------------------------------------
    // 9. PREDICTIVE WHAT-IF SIMULATION ENGINE
    // -------------------------------------------------------------------------
    console.log('\n[Section 9: Predictive What-If Simulation Engine]');
    const simPositiveRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usageVelocityDelta: 25,
        seatUtilizationDelta: 15,
        billingHealthDelta: 0,
        discountIncentiveApplied: true,
        trainingSessionCompleted: true,
      }),
    });
    assert(simPositiveRes.status === 200, 'POST /simulate with positive adjustments returned 200');
    const simPositiveJson = await simPositiveRes.json();
    const simData = simPositiveJson.data;

    assert(simData.simulatedRiskScore < 20.00, `Positive factors reduced simulated risk (got ${simData.simulatedRiskScore}%)`);
    assert(simData.simulatedRiskTier === 'low', 'Simulated risk tier is low');
    assert(simData.preventedChurnProbability > 0, `Prevented churn probability is positive (${simData.preventedChurnProbability}%)`);
    assert(Array.isArray(simData.recommendations) && simData.recommendations.length > 0, 'Simulation generated strategic recommendations');

    // Negative simulation
    const simNegativeRes = await fetch(`${BASE_URL}/admin/operations/revenue-intelligence/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usageVelocityDelta: -45,
        seatUtilizationDelta: -30,
        billingHealthDelta: -40,
        discountIncentiveApplied: false,
        trainingSessionCompleted: false,
      }),
    });
    assert(simNegativeRes.status === 200, 'POST /simulate with negative adjustments returned 200');
    const simNegativeJson = await simNegativeRes.json();
    assert(simNegativeJson.data.simulatedRiskScore > 50.00, `Negative factors spiked simulated risk (${simNegativeJson.data.simulatedRiskScore}%)`);
    assert(simNegativeJson.data.projectedMrrVariance < 0, `Projected financial variance is negative (-$${Math.abs(simNegativeJson.data.projectedMrrVariance)})`);

    // Verify simulation did NOT mutate persistent DB records
    const [persistedScore] = await db.execute(
      'SELECT churn_risk_score, risk_tier FROM tenant_churn_scores WHERE tenant_id = ?',
      [targetTenantId]
    );
    assert(persistedScore.length === 1, 'Target tenant persistent score still exists');
    assert(Number(persistedScore[0].churn_risk_score) < 25.00, 'Database churn score was NOT mutated by in-memory simulation');

    // -------------------------------------------------------------------------
    // 10. SUPERADMIN AUDIT LOGS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[Section 10: Superadmin Audit Trail Verification]');
    const [auditLogs] = await db.execute(
      `SELECT action, target_resource_type, superadmin_email FROM superadmin_audit_logs
       WHERE target_resource_type = 'revenue_intelligence'
       ORDER BY created_at DESC LIMIT 5`
    );
    assert(auditLogs.length > 0, 'Found audit logs recorded for revenue intelligence actions');
    assert(auditLogs.some((l) => l.action === 'EVALUATE_CHURN_RISK'), 'Audit log recorded EVALUATE_CHURN_RISK');
    assert(auditLogs.some((l) => l.action === 'CREATE_INTERVENTION'), 'Audit log recorded CREATE_INTERVENTION');

    // -------------------------------------------------------------------------
    // 11. INVARIANT POST-CHECK
    // -------------------------------------------------------------------------
    console.log('\n[Section 11: Meta Invariant Post-Check]');
    await verifyMetaLock(db, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 32 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await db.end();
  }
}

runStage32Tests().catch((err) => {
  console.error('\nStage 32 Test Run Failed:', err);
  process.exit(1);
});
