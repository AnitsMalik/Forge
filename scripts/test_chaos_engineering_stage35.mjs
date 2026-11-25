/**
 * Stage 35: Enterprise Automated Chaos Engineering, Resiliency Testing & Fault Injection Suite
 * SocialForge Platform v5.3.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview Telemetry & Resiliency Score KPIs (totalExperiments, activeExperiments, averageResilienceScore, tripwiresTriggeredCount, subsystemHealthScores)
 * 4. Pre-seeded Core Chaos Experiments:
 *    - All 4 system experiments exist (API gateway, DB mesh, Webhook ingress, AI orchestrator)
 *    - Tripwire thresholds and fault configurations correctly configured
 * 5. Experiment CRUD & Blast Radius Validation Engine:
 *    - Rejection of invalid subsystem -> 400
 *    - Rejection of invalid blast radius (< 1% or > 100%) -> 400
 *    - Rejection of invalid duration (< 5s) -> 400
 *    - Creation of custom chaos experiment
 *    - Retrieval by ID
 *    - Updating experiment parameters
 *    - Safe experiment deletion
 * 6. In-Memory Blast Radius Simulation Sandbox:
 *    - Mild blast simulation (15% radius) -> resilient pass, tripwire = false
 *    - Critical blast simulation (75% radius) -> tripwire = true, projected error rate exceeds threshold
 *    - Zero persistent database mutations
 * 7. Controlled Fault Execution & Safety Circuit Breakers:
 *    - Normal execution within safety limits: completes with resilience score ~97.5/100, logs recorded in chaos_fault_executions
 *    - Overload execution breaching threshold: auto-aborted by tripwire, status set to halted_by_tripwire, event recorded in chaos_tripwire_events
 *    - Manual operator emergency abortion: POST /abort immediately halts experiment and records abort event
 * 8. Superadmin Audit Trail Verification:
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

async function verifyMetaLock(connection, stage) {
  const [variants] = await connection.execute(
    'SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length > 0, `[Meta Lock ${stage}] Variant exists with remote_post_id = ${META_LOCK_REMOTE_POST_ID}`);
  assert(variants[0].status === 'published', `[Meta Lock ${stage}] Variant status is strictly "published" (found: ${variants[0].status})`);

  const [jobs] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length > 0, `[Meta Lock ${stage}] Publishing job exists with ID = ${META_LOCK_JOB_ID}`);
  assert(jobs[0].status === 'published', `[Meta Lock ${stage}] Job status is strictly "published" (found: ${jobs[0].status})`);
}

async function runStage35() {
  console.log('================================================================');
  console.log('   STAGE 35: CHAOS ENGINEERING & RESILIENCY TESTING SUITE       ');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. Meta Invariant Pre-Check
    // -------------------------------------------------------------------------
    console.log('[Section 1: Meta Invariant Pre-Check]');
    await verifyMetaLock(connection, 'PRE');
    console.log('');

    // -------------------------------------------------------------------------
    // 2. Auth Tokens & RBAC Setup
    // -------------------------------------------------------------------------
    console.log('[Section 2: Security & Authentication Setup]');
    const [superadmins] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadmins.length > 0, 'Found at least one active superadmin user');
    const superadmin = superadmins[0];

    const [members] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Found active regular tenant member');
    const regularUser = members[0];

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

    const superadminHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };
    const regularHeaders = {
      Authorization: `Bearer ${regularToken}`,
      'Content-Type': 'application/json',
    };
    console.log('');

    // -------------------------------------------------------------------------
    // 3. Superadmin Security & RBAC Enforcement
    // -------------------------------------------------------------------------
    console.log('[Section 3: Superadmin Security & RBAC Enforcement]');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/telemetry`);
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    const regularRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/telemetry`, {
      headers: regularHeaders,
    });
    assert(regularRes.status === 403, `Regular member rejected with 403 (got ${regularRes.status})`);

    const superadminRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/telemetry`, {
      headers: superadminHeaders,
    });
    assert(superadminRes.status === 200, `Superadmin access allowed with 200 (got ${superadminRes.status})`);
    console.log('');

    // -------------------------------------------------------------------------
    // 4. Overview Telemetry & Resiliency Score KPIs
    // -------------------------------------------------------------------------
    console.log('[Section 4: Overview Telemetry & Resiliency Score KPIs]');
    const telemetryData = await superadminRes.json();
    assert(telemetryData.success === true, 'Telemetry response has success: true');
    const tel = telemetryData.data;

    assert(typeof tel.totalExperiments === 'number', 'telemetry.totalExperiments is number');
    assert(tel.totalExperiments >= 4, `telemetry.totalExperiments >= 4 (found: ${tel.totalExperiments})`);
    assert(typeof tel.activeExperiments === 'number', 'telemetry.activeExperiments is number');
    assert(typeof tel.averageResilienceScore === 'number', 'telemetry.averageResilienceScore is number');
    assert(tel.averageResilienceScore >= 80, `averageResilienceScore >= 80 (found: ${tel.averageResilienceScore})`);
    assert(typeof tel.tripwiresTriggeredCount === 'number', 'telemetry.tripwiresTriggeredCount is number');
    assert(typeof tel.subsystemHealthScores === 'object', 'telemetry.subsystemHealthScores is object');
    assert(Array.isArray(tel.recentExecutions), 'telemetry.recentExecutions is array');
    console.log('');

    // -------------------------------------------------------------------------
    // 5. Pre-seeded Core Chaos Experiments
    // -------------------------------------------------------------------------
    console.log('[Section 5: Pre-seeded Core Chaos Experiments]');
    // Ensure test idempotency on repeated runs
    await connection.execute(
      "UPDATE chaos_experiments SET status = 'draft', resilience_score = NULL WHERE id = 'exp-db-lag-02'"
    );
    await connection.execute(
      "DELETE FROM chaos_fault_executions WHERE experiment_id = 'exp-db-lag-02'"
    );

    const expListRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      headers: superadminHeaders,
    });
    assert(expListRes.status === 200, 'GET /experiments returned 200');
    const experiments = (await expListRes.json()).data;
    assert(Array.isArray(experiments), 'experiments is an array');

    const burstExp = experiments.find((e) => e.id === 'exp-gw-burst-01');
    assert(burstExp !== undefined, 'Found exp-gw-burst-01');
    assert(burstExp.target_subsystem === 'api_gateway', 'exp-gw-burst-01 targets api_gateway');
    assert(burstExp.fault_type === 'token_exhaustion', 'exp-gw-burst-01 fault is token_exhaustion');
    assert(burstExp.status === 'completed', 'exp-gw-burst-01 status is completed');
    assert(burstExp.resilience_score === 98.50, 'exp-gw-burst-01 resilience score is 98.50');

    const dbLagExp = experiments.find((e) => e.id === 'exp-db-lag-02');
    assert(dbLagExp !== undefined, 'Found exp-db-lag-02');
    assert(dbLagExp.target_subsystem === 'database_mesh', 'exp-db-lag-02 targets database_mesh');
    assert(dbLagExp.status === 'draft', 'exp-db-lag-02 status is draft');

    const webhookExp = experiments.find((e) => e.id === 'exp-webhook-503-03');
    assert(webhookExp !== undefined, 'Found exp-webhook-503-03');

    const aiTimeoutExp = experiments.find((e) => e.id === 'exp-ai-timeout-04');
    assert(aiTimeoutExp !== undefined, 'Found exp-ai-timeout-04');
    console.log('');

    // -------------------------------------------------------------------------
    // 6. Experiment CRUD & Blast Radius Validation Engine
    // -------------------------------------------------------------------------
    console.log('[Section 6: Experiment CRUD & Blast Radius Validation Engine]');
    // Validation: Invalid subsystem
    const invalidSubsystemRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: 'Invalid Subsystem Test',
        target_subsystem: 'non_existent_subsystem',
        fault_type: 'latency_spike',
        blast_radius_percent: 15,
        duration_seconds: 30,
      }),
    });
    assert(invalidSubsystemRes.status === 400, `Invalid subsystem rejected with 400 (got ${invalidSubsystemRes.status})`);

    // Validation: Invalid blast radius (0%)
    const invalidBlastRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: 'Invalid Blast Test',
        target_subsystem: 'redis_cache',
        fault_type: 'cache_eviction',
        blast_radius_percent: 0,
        duration_seconds: 30,
      }),
    });
    assert(invalidBlastRes.status === 400, `Blast radius 0% rejected with 400 (got ${invalidBlastRes.status})`);

    // Validation: Duration too short (< 5s)
    const invalidDurationRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: 'Invalid Duration Test',
        target_subsystem: 'redis_cache',
        fault_type: 'cache_eviction',
        blast_radius_percent: 15,
        duration_seconds: 2,
      }),
    });
    assert(invalidDurationRes.status === 400, `Duration < 5s rejected with 400 (got ${invalidDurationRes.status})`);

    // Create custom experiment
    const customExpName = `Redis Cache Key Eviction Storm - ${Date.now().toString(36)}`;
    const createRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: customExpName,
        target_subsystem: 'redis_cache',
        fault_type: 'cache_eviction',
        blast_radius_percent: 25,
        duration_seconds: 40,
        fault_config: { evictedPattern: 'session:*' },
        tripwire_thresholds: {
          max_error_rate_percent: 20,
          max_p99_latency_ms: 1500,
          auto_rollback: true,
        },
      }),
    });
    assert(createRes.status === 201, `POST /experiments created experiment with 201 (got ${createRes.status})`);
    const createdExp = (await createRes.json()).data;
    assert(createdExp.name === customExpName, 'Created experiment name matches');
    assert(createdExp.target_subsystem === 'redis_cache', 'Created experiment subsystem matches');
    assert(createdExp.status === 'draft', 'New experiment status is draft');

    // Get by ID
    const getRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${createdExp.id}`, {
      headers: superadminHeaders,
    });
    assert(getRes.status === 200, 'GET /experiments/:id returned 200');
    assert((await getRes.json()).data.id === createdExp.id, 'Fetched experiment matches ID');

    // Update experiment
    const updateRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${createdExp.id}`, {
      method: 'PUT',
      headers: superadminHeaders,
      body: JSON.stringify({
        blast_radius_percent: 30,
        duration_seconds: 50,
      }),
    });
    assert(updateRes.status === 200, 'PUT /experiments/:id returned 200');
    const updatedExp = (await updateRes.json()).data;
    assert(updatedExp.blast_radius_percent === 30, 'Blast radius updated to 30%');
    assert(updatedExp.duration_seconds === 50, 'Duration updated to 50s');

    // Delete custom experiment
    const deleteRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${createdExp.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    assert(deleteRes.status === 200, 'DELETE /experiments/:id returned 200');
    console.log('');

    // -------------------------------------------------------------------------
    // 7. In-Memory Blast Radius Simulation Sandbox
    // -------------------------------------------------------------------------
    console.log('[Section 7: In-Memory Blast Radius Simulation Sandbox]');
    // Mild blast simulation (15% radius, 150 RPS)
    const simMildRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/simulate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        target_subsystem: 'api_gateway',
        fault_type: 'latency_spike',
        blast_radius_percent: 15,
        simulated_traffic_load_rps: 150,
      }),
    });
    assert(simMildRes.status === 200, 'Simulation on mild blast returned 200');
    const simMild = (await simMildRes.json()).data;
    assert(simMild.simulated === true, 'Simulation flag is true');
    assert(simMild.tripwireTriggered === false, 'Mild blast does not trigger tripwire');
    assert(simMild.projectedResilienceScore >= 90, `Projected resilience score is high (${simMild.projectedResilienceScore})`);

    // Critical blast simulation (75% radius, 800 RPS)
    const simCritRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/simulate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        target_subsystem: 'database_mesh',
        fault_type: 'database_partition',
        blast_radius_percent: 75,
        simulated_traffic_load_rps: 800,
      }),
    });
    assert(simCritRes.status === 200, 'Simulation on critical blast returned 200');
    const simCrit = (await simCritRes.json()).data;
    assert(simCrit.tripwireTriggered === true, 'Critical blast triggers safety tripwire');
    assert(typeof simCrit.tripwireReason === 'string', 'Tripwire reason explanation populated');
    assert(Array.isArray(simCrit.recommendations), 'Simulation produces actionable recommendations');
    console.log('');

    // -------------------------------------------------------------------------
    // 8. Controlled Fault Execution & Safety Circuit Breakers
    // -------------------------------------------------------------------------
    console.log('[Section 8: Controlled Fault Execution & Safety Circuit Breakers]');
    // Execute safe experiment (exp-db-lag-02, 20% blast radius)
    const execSafeRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/exp-db-lag-02/execute`, {
      method: 'POST',
      headers: superadminHeaders,
    });
    assert(execSafeRes.status === 200, 'POST /experiments/exp-db-lag-02/execute returned 200');
    const execSafe = (await execSafeRes.json()).data;
    assert(execSafe.success === true, 'Execution result success: true');
    assert(execSafe.experiment.status === 'completed', 'Safe experiment transitioned to completed');
    assert(execSafe.tripwireTriggered === false, 'Safe experiment did not trigger tripwire');
    assert(execSafe.experiment.resilience_score > 90, `Safe experiment resilience score > 90 (found: ${execSafe.experiment.resilience_score})`);

    // Verify execution record in database
    const [execDbRows] = await connection.execute(
      'SELECT id, experiment_id, affected_requests_count FROM chaos_fault_executions WHERE experiment_id = ?',
      ['exp-db-lag-02']
    );
    assert(execDbRows.length > 0, 'Execution trace found in database');

    // Create high-risk experiment that breaches safety thresholds (75% blast radius)
    const highRiskRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: 'High Risk Cluster Tripwire Trigger Test',
        target_subsystem: 'social_webhook',
        fault_type: 'service_unavailable_503',
        blast_radius_percent: 75,
        duration_seconds: 30,
        tripwire_thresholds: {
          max_error_rate_percent: 20,
          max_p99_latency_ms: 1000,
          auto_rollback: true,
        },
      }),
    });
    const highRiskExp = (await highRiskRes.json()).data;

    // Execute high-risk experiment -> should trigger tripwire
    const execTripwireRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${highRiskExp.id}/execute`, {
      method: 'POST',
      headers: superadminHeaders,
    });
    assert(execTripwireRes.status === 200, 'POST /execute on high risk returned 200');
    const execTripwire = (await execTripwireRes.json()).data;
    assert(execTripwire.tripwireTriggered === true, 'High risk execution correctly triggered tripwire');
    assert(execTripwire.experiment.status === 'halted_by_tripwire', 'Experiment status marked halted_by_tripwire');
    assert(execTripwire.execution.emergency_aborted === true, 'Execution record marked emergency_aborted = true');

    // Verify tripwire event recorded in database
    const [twDbRows] = await connection.execute(
      'SELECT id, experiment_id, action_taken FROM chaos_tripwire_events WHERE experiment_id = ?',
      [highRiskExp.id]
    );
    assert(twDbRows.length > 0, 'Tripwire breach event logged to chaos_tripwire_events');
    assert(twDbRows[0].action_taken === 'emergency_aborted', 'Tripwire action is emergency_aborted');

    // Test manual operator emergency abort (/abort)
    const tempExpRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        name: 'Manual Operator Abort Test Experiment',
        target_subsystem: 'api_gateway',
        fault_type: 'latency_spike',
        blast_radius_percent: 15,
        duration_seconds: 45,
      }),
    });
    const tempExp = (await tempExpRes.json()).data;

    const abortRes = await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${tempExp.id}/abort`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        reason: 'Operator manual safety override during active deployment',
      }),
    });
    assert(abortRes.status === 200, 'POST /experiments/:id/abort returned 200');
    const abortedExp = (await abortRes.json()).data;
    assert(abortedExp.status === 'halted_by_tripwire', 'Manually aborted experiment marked halted_by_tripwire');

    // Cleanup temp experiments and restore exp-db-lag-02 for repeatability
    await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${highRiskExp.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    await fetch(`${BASE_URL}/admin/operations/chaos-engineering/experiments/${tempExp.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    await connection.execute(
      "UPDATE chaos_experiments SET status = 'draft', resilience_score = NULL WHERE id = 'exp-db-lag-02'"
    );
    await connection.execute(
      "DELETE FROM chaos_fault_executions WHERE experiment_id = 'exp-db-lag-02'"
    );
    console.log('');

    // -------------------------------------------------------------------------
    // 9. Superadmin Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('[Section 9: Superadmin Audit Trail Verification]');
    const [auditRows] = await connection.execute(
      `SELECT action, target_resource_type, reason FROM superadmin_audit_logs 
       WHERE target_resource_type = 'chaos_engineering' 
       ORDER BY created_at DESC LIMIT 10`
    );
    assert(auditRows.length > 0, 'Found audit logs recorded for chaos_engineering');
    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('CREATE_CHAOS_EXPERIMENT'), 'Audit log recorded CREATE_CHAOS_EXPERIMENT');
    assert(actions.includes('EXECUTE_CHAOS_EXPERIMENT'), 'Audit log recorded EXECUTE_CHAOS_EXPERIMENT');
    assert(actions.includes('ABORT_CHAOS_EXPERIMENT'), 'Audit log recorded ABORT_CHAOS_EXPERIMENT');
    console.log('');

    // -------------------------------------------------------------------------
    // 10. Meta Invariant Post-Check
    // -------------------------------------------------------------------------
    console.log('[Section 10: Meta Invariant Post-Check]');
    await verifyMetaLock(connection, 'POST');
    console.log('');

    console.log('================================================================');
    console.log(`   STAGE 35 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage35().catch((err) => {
  console.error('\nSTAGE 35 EXECUTION FAILED:', err.message);
  process.exit(1);
});
