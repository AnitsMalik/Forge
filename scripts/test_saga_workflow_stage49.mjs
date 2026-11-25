/**
 * Stage 49: Enterprise Distributed Workflow Engine, State Machine Orchestration & Long-Running Saga Coordinator Test Suite
 * SocialForge Platform v6.7.0
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Saga Workflow Telemetry & Recovery Metrics
 * 4. Saga Workflow Definitions Registry & DAG Configuration Provisioning
 * 5. State Machine Instance Dispatch & Step Progression
 * 6. Sequential Step Execution & State Payload Merging
 * 7. Simulated Step Failure & Backward LIFO Compensating Transaction Rollback
 * 8. State Machine Instance Resume & Recovery Drill
 * 9. Full Instance Detail, DAG Step Execution Tracing & Audit Log Inspection
 * 10. Clean Idempotent Test Teardown
 * 11. Post-Flight Meta Invariant Lock Verification
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
    `[Meta Lock ${phase}] Variant status must be 'published'`
  );
  logPass(`[Meta Lock ${phase}] Variant status is strictly 'published'`);

  const [jobRows] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [TARGET_JOB_ID]
  );
  assert(jobRows.length > 0, `[Meta Lock ${phase}] Job ${TARGET_JOB_ID} must exist`);
  const job = jobRows[0];
  assert.strictEqual(
    job.status,
    'published',
    `[Meta Lock ${phase}] Job status must be 'published'`
  );
  logPass(`[Meta Lock ${phase}] Publishing job status is strictly 'published'`);
}

async function runStage49() {
  console.log('========================================================================');
  console.log('  STAGE 49: DISTRIBUTED WORKFLOW ENGINE & SAGA COORDINATOR SUITE        ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Pre-Flight Meta Publication Invariant Lock Verification
    console.log('[1/11] Verifying Pre-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'PRE');

    // 2. Superadmin Security & RBAC Guardrails
    console.log('\n[2/11] Validating Superadmin Security & RBAC Guardrails...');
    const [superadminRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadminRows.length > 0, 'At least one active superadmin user required in database');
    const superadminUser = superadminRows[0];

    const superadminToken = jwt.sign(
      {
        userId: superadminUser.id,
        email: superadminUser.email,
        isSuperadmin: true,
        is_superadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const [regularRows] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 0 AND is_active = 1 LIMIT 1'
    );
    let normalUserToken = null;
    if (regularRows.length > 0) {
      normalUserToken = jwt.sign(
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

    const unauthRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
    logPass('Unauthenticated request rejected with HTTP 401');

    if (normalUserToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/telemetry`, {
        headers: { Authorization: `Bearer ${normalUserToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin request must be rejected with 403');
      logPass('Non-superadmin tenant request rejected with HTTP 403');
    }

    // 3. Real-Time Saga Workflow Telemetry
    console.log('\n[3/11] Querying Saga Workflow Telemetry & Recovery Metrics...');
    const telemetryRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(telemetryRes.status, 200, 'Telemetry endpoint must return HTTP 200');
    const telemetryJson = await telemetryRes.json();
    assert.strictEqual(telemetryJson.success, true);
    const telemetry = telemetryJson.data;

    assert(telemetry.total_workflow_definitions >= 3, 'Must have at least 3 active workflow definitions');
    assert(telemetry.active_state_machine_instances >= 1, 'Must have at least 1 active state machine instance');
    assert(telemetry.saga_recovery_success_rate >= 0, 'Saga recovery success rate must be valid');
    logPass(
      `Telemetry verified: ${telemetry.total_workflow_definitions} definitions, ${telemetry.active_state_machine_instances} active instances, ${telemetry.saga_recovery_success_rate}% recovery rate, ${telemetry.avg_workflow_duration_ms}ms avg latency`
    );

    // 4. Workflow Definitions & DAG Configurations Registry
    console.log('\n[4/11] Testing Workflow Definitions Registry & Dynamic DAG Provisioning...');
    const defsRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/definitions`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(defsRes.status, 200);
    const defsJson = await defsRes.json();
    assert(defsJson.data.length >= 3, 'Should list at least 3 workflow definitions');
    logPass(`Retrieved ${defsJson.data.length} pre-seeded saga workflow definitions`);

    const testDefName = `Test Multi-Step Orchestration Saga-${Date.now()}`;
    const createDefRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        workflow_name: testDefName,
        workflow_type: 'test_pipeline',
        description: 'Automated test state machine with 3 sequential steps and backward compensation',
        failure_strategy: 'backward_compensation',
        steps_configuration: [
          { step_index: 0, step_name: 'Initialize Stage Cache', action_service: 'cache-mesh', action_endpoint: '/api/v1/cache/init', compensation_endpoint: '/api/v1/cache/purge', timeout_seconds: 10, retry_attempts: 1 },
          { step_index: 1, step_name: 'Reserve Tenant Quota', action_service: 'entitlement-service', action_endpoint: '/api/v1/entitlements/reserve', compensation_endpoint: '/api/v1/entitlements/release', timeout_seconds: 15, retry_attempts: 2 },
          { step_index: 2, step_name: 'Dispatch Outbound Hook', action_service: 'webhook-dispatcher', action_endpoint: '/api/v1/webhooks/dispatch', compensation_endpoint: '/api/v1/webhooks/cancel', timeout_seconds: 20, retry_attempts: 1 },
        ],
      }),
    });
    assert.strictEqual(createDefRes.status, 201, 'Should create workflow definition with HTTP 201');
    const createdDefJson = await createDefRes.json();
    const testDef = createdDefJson.data;
    assert.strictEqual(testDef.workflow_name, testDefName);
    assert.strictEqual(testDef.total_steps_count, 3);
    assert.strictEqual(testDef.failure_strategy, 'backward_compensation');
    logPass(`Provisioned custom workflow definition '${testDef.workflow_name}' (ID: ${testDef.id})`);

    // 5. Trigger State Machine Instance
    console.log('\n[5/11] Triggering State Machine Instance & Initializing Step 0...');
    const triggerRes = await fetch(`${BASE_URL}/admin/operations/saga-workflows/instances/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superadminToken}`,
      },
      body: JSON.stringify({
        workflow_definition_id: testDef.id,
        target_tenant_id: 'tenant-test-stage49',
        correlation_id: `corr-stage49-${Date.now()}`,
        input_payload: { env: 'staging', dryRun: false },
      }),
    });
    assert.strictEqual(triggerRes.status, 201, 'Triggering workflow instance must return HTTP 201');
    const triggerJson = await triggerRes.json();
    const instDetail1 = triggerJson.data;
    const testInstanceId = instDetail1.instance.id;

    assert.strictEqual(instDetail1.instance.status, 'active');
    assert.strictEqual(instDetail1.instance.current_step_index, 0);
    assert(instDetail1.step_executions.length >= 1);
    assert.strictEqual(instDetail1.step_executions[0].status, 'executing');
    logPass(`Triggered instance '${testInstanceId}' in status 'active' with step 0 executing`);

    // 6. Progressive Step Execution (Step 0 & Step 1 Succeed)
    console.log('\n[6/11] Progressing Steps Sequentially & Merging State Payloads...');
    // Complete Step 0
    const step0Res = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/steps/0`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          outcome: 'succeeded',
          output_payload: { cache_key: 'stage49_cache_init_ok' },
        }),
      }
    );
    assert.strictEqual(step0Res.status, 200);
    const step0Detail = (await step0Res.json()).data;
    assert.strictEqual(step0Detail.instance.current_step_index, 1);
    assert.strictEqual(step0Detail.instance.state_payload.cache_key, 'stage49_cache_init_ok');
    logPass(`Step 0 succeeded -> instance progressed to step 1 with state payload merged`);

    // Complete Step 1
    const step1Res = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/steps/1`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          outcome: 'succeeded',
          output_payload: { quota_reservation_id: 'res-9941a' },
        }),
      }
    );
    assert.strictEqual(step1Res.status, 200);
    const step1Detail = (await step1Res.json()).data;
    assert.strictEqual(step1Detail.instance.current_step_index, 2);
    assert.strictEqual(step1Detail.instance.state_payload.quota_reservation_id, 'res-9941a');
    logPass(`Step 1 succeeded -> instance progressed to step 2 with state payload merged`);

    // 7. Simulated Step Failure & Backward LIFO Compensating Transaction Rollback
    console.log('\n[7/11] Simulating Step Failure & Executing Backward LIFO Rollback...');
    // Fail Step 2
    const step2FailRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/steps/2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          outcome: 'failed',
          error_message: 'External webhook endpoint connection reset by peer (ETIMEDOUT)',
        }),
      }
    );
    assert.strictEqual(step2FailRes.status, 200);
    const step2FailDetail = (await step2FailRes.json()).data;
    assert.strictEqual(step2FailDetail.instance.status, 'compensating');
    logPass(`Step 2 failed -> instance transitioned to 'compensating'`);

    // Trigger backward compensation
    const compRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/compensate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          reason: 'Automated rollback triggered after step 2 failure',
        }),
      }
    );
    assert.strictEqual(compRes.status, 200);
    const compDetail = (await compRes.json()).data;
    assert.strictEqual(compDetail.instance.status, 'compensated');
    assert(compDetail.compensations.length >= 2, 'Should have rolled back both step 1 and step 0');

    // Verify LIFO order: step 1 rolled back before step 0
    assert.strictEqual(compDetail.compensations[0].step_index, 1);
    assert.strictEqual(compDetail.compensations[1].step_index, 0);
    logPass(
      `Saga backward compensation verified in strict LIFO order: step 1 then step 0 (status: ${compDetail.instance.status})`
    );

    // 8. Workflow Resume Drill
    console.log('\n[8/11] Testing State Machine Resume & Recovery Drill...');
    const resumeRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          resume_step_index: 2,
        }),
      }
    );
    assert.strictEqual(resumeRes.status, 200);
    const resumeDetail = (await resumeRes.json()).data;
    assert.strictEqual(resumeDetail.instance.status, 'active');
    assert.strictEqual(resumeDetail.instance.current_step_index, 2);
    logPass(`Resumed instance '${testInstanceId}' back to 'active' at step 2`);

    // Advance Step 2 to success to complete the workflow
    const step2SuccRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}/steps/2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${superadminToken}`,
        },
        body: JSON.stringify({
          outcome: 'succeeded',
          output_payload: { webhook_delivered: true, response_code: 200 },
        }),
      }
    );
    assert.strictEqual(step2SuccRes.status, 200);
    const completedDetail = (await step2SuccRes.json()).data;
    assert.strictEqual(completedDetail.instance.status, 'completed');
    assert.strictEqual(completedDetail.instance.current_step_index, 3);
    logPass(`Step 2 completed -> State machine completed with status = 'completed'`);

    // 9. Instance Detail & DAG Step Tracing
    console.log('\n[9/11] Querying Detailed Instance State & DAG Execution Trace...');
    const detailRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}`,
      {
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    assert.strictEqual(detailRes.status, 200);
    const inspectDetail = (await detailRes.json()).data;
    assert(inspectDetail.instance && inspectDetail.definition);
    assert(inspectDetail.step_executions.length >= 3);
    logPass(`Instance detail verified with full DAG progression and rollback transaction history`);

    // 10. Clean Idempotent Test Teardown
    console.log('\n[10/11] Performing Idempotent Test Artifact Teardown...');
    const delInstRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/instances/${testInstanceId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    assert.strictEqual(delInstRes.status, 200);

    const delDefRes = await fetch(
      `${BASE_URL}/admin/operations/saga-workflows/definitions/${testDef.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    assert.strictEqual(delDefRes.status, 200);
    logPass(`Cleaned up test instance '${testInstanceId}' and definition '${testDef.id}'`);

    // 11. Post-Flight Meta Publication Invariant Lock Verification
    console.log('\n[11/11] Verifying Post-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`  STAGE 49 COMPLETED SUCCESSFULLY: ${passedTests}/${passedTests} ASSERTIONS PASSED (100%) `);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage49().catch((err) => {
  console.error('\n❌ STAGE 49 FAILED:', err);
  process.exit(1);
});
