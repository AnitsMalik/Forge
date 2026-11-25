/**
 * Stage 39: Enterprise Global Event Mesh, Distributed Dead-Letter Replay & Exactly-Once Webhook Processing Pipeline Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Event Mesh Telemetry & Aggregate Metrics
 * 4. Pre-seeded Topics Retrieval & Configuration
 * 5. Dynamic Topic Creation & Validation
 * 6. Consumer Subscriptions & Circuit Breaker State Transitions
 * 7. Dead-Letter Queue (DLQ) Retrieval, Filtering & Inspection
 * 8. DLQ Replay Engine & Automated Recovery
 * 9. DLQ Poisoned Payload Discard
 * 10. Exactly-Once Idempotency & Deduplication Engine
 * 11. Failure Simulation & DLQ Quarantine Routing
 * 12. Superadmin Audit Trail Ledger & Event Tracking
 * 13. Complete Database Cleanup & Test Idempotency
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

async function runStage39Tests() {
  console.log('\n================================================================');
  console.log('   STAGE 39: ENTERPRISE GLOBAL EVENT MESH & DLQ REPLAY PIPELINE');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------
    // 1. PRE-VERIFICATION OF PRODUCTION META PUBLICATION LOCK
    // -------------------------------------------------------------
    console.log('[1/12] Verifying Pre-Execution Meta Publication Invariant Lock...');
    await verifyMetaLock(connection, 'PRE');

    // -------------------------------------------------------------
    // Setup Superadmin & Tenant Auth Tokens
    // -------------------------------------------------------------
    console.log('\n[2/12] Generating Operator & Non-Superadmin Tokens...');
    const [superUsers] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superUsers.length > 0, 'At least one active superadmin user must exist');
    const superadmin = superUsers[0];

    const superadminToken = jwt.sign(
      {
        userId: superadmin.id,
        email: superadmin.email,
        isSuperAdmin: true,
        is_superadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const [regularUsers] = await connection.execute(
      'SELECT id, email FROM users WHERE (is_superadmin = 0 OR is_superadmin IS NULL) AND is_active = 1 LIMIT 1'
    );
    assert(regularUsers.length > 0, 'At least one active regular user must exist');
    const regularUser = regularUsers[0];

    const regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        isSuperAdmin: false,
        is_superadmin: false,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Initial Test Record Cleanup
    await connection.execute("DELETE FROM event_mesh_topics WHERE topic_name LIKE 'test.%'");
    await connection.execute("DELETE FROM event_mesh_dead_letter_queue WHERE event_id LIKE 'evt-stage39-%'");
    await connection.execute("DELETE FROM event_mesh_idempotency_keys WHERE idempotency_key LIKE 'idem-stage39-%'");

    // -------------------------------------------------------------
    // 2. RBAC & Guardrail Enforcement
    // -------------------------------------------------------------
    console.log('\n[3/12] Verifying Security Guardrails & RBAC Enforcement...');

    // 401 without token
    const resNoAuth = await fetch(`${BASE_URL}/admin/operations/event-mesh/telemetry`);
    assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated request must return 401');
    logPass('401 Unauthorized enforced for missing token');

    // 403 with non-superadmin token
    const resForbidden = await fetch(`${BASE_URL}/admin/operations/event-mesh/telemetry`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, 'Non-superadmin token must return 403');
    logPass('403 Forbidden enforced for regular tenant user token');

    // 200 with superadmin token
    const resAuth = await fetch(`${BASE_URL}/admin/operations/event-mesh/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAuth.status, 200, 'Superadmin token must return 200');
    const telJson = await resAuth.json();
    assert(telJson.success, 'Telemetry request must report success');
    logPass('200 OK authenticated access granted for superadmin operator');

    // -------------------------------------------------------------
    // 3. Real-Time Telemetry Validation
    // -------------------------------------------------------------
    console.log('\n[4/12] Validating Real-Time Event Mesh Telemetry & Health Metrics...');
    const telData = telJson.data;
    assert(typeof telData.total_topics === 'number' && telData.total_topics >= 5, 'Telemetry total_topics >= 5');
    assert(typeof telData.total_subscriptions === 'number' && telData.total_subscriptions >= 5, 'Telemetry total_subscriptions >= 5');
    assert(typeof telData.total_published_24h === 'number' && telData.total_published_24h > 0, 'Telemetry total_published_24h > 0');
    assert(typeof telData.total_delivered_24h === 'number' && telData.total_delivered_24h > 0, 'Telemetry total_delivered_24h > 0');
    assert(typeof telData.total_dlq_quarantined === 'number' && telData.total_dlq_quarantined >= 3, 'Telemetry total_dlq_quarantined >= 3');
    assert(telData.idempotency_hit_rate >= 99.0, 'Telemetry idempotency_hit_rate >= 99.0%');
    assert(telData.p99_delivery_latency_ms > 0, 'Telemetry p99_delivery_latency_ms > 0');
    assert(['optimal', 'degraded', 'critical'].includes(telData.status), 'Telemetry status must be valid enum');
    logPass(`Telemetry validated: ${telData.total_topics} topics, ${telData.total_subscriptions} subscriptions, ${telData.total_published_24h.toLocaleString()} published, DLQ: ${telData.total_dlq_quarantined}`);

    // -------------------------------------------------------------
    // 4. Topics Retrieval
    // -------------------------------------------------------------
    console.log('\n[5/12] Verifying Pre-seeded Core Event Mesh Topics...');
    const resTopics = await fetch(`${BASE_URL}/admin/operations/event-mesh/topics`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resTopics.status, 200);
    const topicsJson = await resTopics.json();
    assert(topicsJson.success && Array.isArray(topicsJson.data));
    const topicNames = topicsJson.data.map((t) => t.topic_name);
    assert(topicNames.includes('posts.published'), 'Core topic posts.published must be present');
    assert(topicNames.includes('social.webhook.received'), 'Core topic social.webhook.received must be present');
    assert(topicNames.includes('analytics.ingested'), 'Core topic analytics.ingested must be present');
    assert(topicNames.includes('billing.invoiced'), 'Core topic billing.invoiced must be present');
    assert(topicNames.includes('security.audit.logged'), 'Core topic security.audit.logged must be present');
    logPass(`Core topics confirmed: ${topicNames.slice(0, 5).join(', ')}`);

    // -------------------------------------------------------------
    // 5. Dynamic Topic Creation
    // -------------------------------------------------------------
    console.log('\n[6/12] Creating Dynamic Event Topic with Strict Schema...');
    const testTopicName = `test.notifications.outbound.${Date.now()}`;
    const resCreateTopic = await fetch(`${BASE_URL}/admin/operations/event-mesh/topics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic_name: testTopicName,
        partition_count: 12,
        retention_hours: 48,
        schema_validation: 'strict',
      }),
    });
    assert.strictEqual(resCreateTopic.status, 201, 'Creating topic must return 201');
    const createTopicJson = await resCreateTopic.json();
    assert(createTopicJson.success && createTopicJson.data.topic_name === testTopicName);
    assert.strictEqual(createTopicJson.data.partition_count, 12);
    assert.strictEqual(createTopicJson.data.retention_hours, 48);
    logPass(`Dynamic topic created: ${testTopicName} (12 partitions, 48h retention)`);

    // Test 400 on missing topic_name
    const resBadTopic = await fetch(`${BASE_URL}/admin/operations/event-mesh/topics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadTopic.status, 400, 'Missing topic_name must return 400');
    logPass('400 Bad Request enforced for missing topic_name in topic creation');

    // -------------------------------------------------------------
    // 6. Subscriptions Management & Circuit Breakers
    // -------------------------------------------------------------
    console.log('\n[7/12] Testing Consumer Subscriptions & Circuit Breaker State Transitions...');
    const resSubs = await fetch(`${BASE_URL}/admin/operations/event-mesh/subscriptions`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resSubs.status, 200);
    const subsJson = await resSubs.json();
    assert(subsJson.success && Array.isArray(subsJson.data));
    const targetSub = subsJson.data.find((s) => s.id === 'sub-webhook-verifier');
    assert(targetSub, 'Subscription sub-webhook-verifier must exist');
    logPass(`Subscription identified: ${targetSub.subscriber_name} (circuit breaker: ${targetSub.circuit_breaker_status})`);

    // Filter subscriptions by topicId
    const resFilteredSubs = await fetch(`${BASE_URL}/admin/operations/event-mesh/subscriptions?topicId=top-posts-published`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resFilteredSubs.status, 200);
    const filteredSubsJson = await resFilteredSubs.json();
    assert(filteredSubsJson.data.every((s) => s.topic_id === 'top-posts-published'), 'All returned subscriptions must belong to top-posts-published');
    logPass(`Subscriptions filtered by topicId successfully (${filteredSubsJson.data.length} matches)`);

    // Test 400 on missing circuit breaker status
    const resBadCb = await fetch(
      `${BASE_URL}/admin/operations/event-mesh/subscriptions/${targetSub.id}/circuit-breaker`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );
    assert.strictEqual(resBadCb.status, 400, 'Missing circuit_breaker_status must return 400');
    logPass('400 Bad Request enforced for missing circuit_breaker_status');

    // Trip circuit breaker to 'open'
    const resTrip = await fetch(
      `${BASE_URL}/admin/operations/event-mesh/subscriptions/${targetSub.id}/circuit-breaker`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ circuit_breaker_status: 'open' }),
      }
    );
    assert.strictEqual(resTrip.status, 200);
    const tripJson = await resTrip.json();
    assert.strictEqual(tripJson.data.circuit_breaker_status, 'open');
    logPass('Circuit breaker transitioned to OPEN state');

    // Reset circuit breaker to 'closed'
    const resReset = await fetch(
      `${BASE_URL}/admin/operations/event-mesh/subscriptions/${targetSub.id}/circuit-breaker`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superadminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ circuit_breaker_status: 'closed' }),
      }
    );
    assert.strictEqual(resReset.status, 200);
    const resetJson = await resReset.json();
    assert.strictEqual(resetJson.data.circuit_breaker_status, 'closed');
    logPass('Circuit breaker successfully reset to CLOSED state');

    // -------------------------------------------------------------
    // 7. Dead-Letter Queue (DLQ) Retrieval & Inspection
    // -------------------------------------------------------------
    console.log('\n[8/12] Validating Dead-Letter Queue Retrieval & Quarantined Payloads...');
    const resDlq = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq?status=quarantined`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resDlq.status, 200);
    const dlqJson = await resDlq.json();
    assert(dlqJson.success && Array.isArray(dlqJson.data));
    assert(dlqJson.data.length >= 2, 'Must have at least 2 quarantined DLQ records');
    const dlqItem = dlqJson.data[0];
    assert(dlqItem.payload && typeof dlqItem.payload === 'object', 'DLQ payload must be parsed object');
    assert(dlqItem.failure_reason, 'DLQ failure_reason must be present');
    logPass(`DLQ messages retrieved: ${dlqJson.data.length} quarantined. Sample error: ${dlqItem.failure_reason}`);

    // Filter DLQ by topic_name
    const resDlqTopic = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq?topic_name=social.webhook.received`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resDlqTopic.status, 200);
    const dlqTopicJson = await resDlqTopic.json();
    assert(dlqTopicJson.data.every((m) => m.topic_name === 'social.webhook.received'), 'All items must have topic social.webhook.received');
    logPass(`DLQ messages filtered by topic_name successfully (${dlqTopicJson.data.length} matches)`);

    // Test 400 on replay with missing dlq_ids
    const resBadReplay = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq/replay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadReplay.status, 400, 'Missing dlq_ids must return 400');
    logPass('400 Bad Request enforced for missing dlq_ids in DLQ replay');

    // -------------------------------------------------------------
    // 8. DLQ Replay Engine
    // -------------------------------------------------------------
    console.log('\n[9/12] Executing DLQ Replay Engine for Recovery...');
    // Seed a specific recoverable DLQ record
    const testDlqId = `dlq-stage39-rec-${Date.now()}`;
    await connection.execute(
      `INSERT INTO event_mesh_dead_letter_queue 
      (id, subscription_id, topic_name, subscriber_name, event_id, idempotency_key, payload, headers, failure_reason, retry_count, status, last_error, first_failed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testDlqId,
        'sub-webhook-verifier',
        'social.webhook.received',
        'meta-graph-pipeline',
        `evt-stage39-replay-${Date.now()}`,
        `idem-stage39-replay-${Date.now()}`,
        JSON.stringify({ test_event: true, timestamp: Date.now() }),
        JSON.stringify({ 'x-test': 'stage39' }),
        'Simulated transient downstream network timeout',
        1,
        'quarantined',
        'Downstream 504 Gateway Timeout',
        new Date(),
      ]
    );

    const resReplay = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq/replay`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dlq_ids: [testDlqId],
        reset_circuit_breaker: true,
      }),
    });
    assert.strictEqual(resReplay.status, 200);
    const replayJson = await resReplay.json();
    assert(replayJson.success);
    assert.strictEqual(replayJson.data.replayed_count, 1);
    assert.strictEqual(replayJson.data.resolved_count, 1);

    // Verify DLQ status changed in database
    const [updatedDlq] = await connection.execute(
      'SELECT status, resolved_at FROM event_mesh_dead_letter_queue WHERE id = ?',
      [testDlqId]
    );
    assert.strictEqual(updatedDlq[0].status, 'resolved');
    assert(updatedDlq[0].resolved_at !== null, 'resolved_at must be populated');
    logPass('DLQ message successfully replayed and marked as RESOLVED');

    // -------------------------------------------------------------
    // 9. DLQ Poisoned Payload Discard
    // -------------------------------------------------------------
    console.log('\n[10/12] Discarding Unrecoverable Poisoned DLQ Payload...');
    const discardDlqId = `dlq-stage39-discard-${Date.now()}`;
    await connection.execute(
      `INSERT INTO event_mesh_dead_letter_queue 
      (id, subscription_id, topic_name, subscriber_name, event_id, idempotency_key, payload, headers, failure_reason, retry_count, status, last_error, first_failed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        discardDlqId,
        'sub-webhook-verifier',
        'social.webhook.received',
        'meta-graph-pipeline',
        `evt-stage39-discard-${Date.now()}`,
        `idem-stage39-discard-${Date.now()}`,
        JSON.stringify({ unrecoverable: true }),
        JSON.stringify({ 'x-test': 'stage39' }),
        'Unrecoverable cryptographic signature corruption',
        5,
        'quarantined',
        'PayloadTamperedException',
        new Date(),
      ]
    );

    const resDiscard = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq/discard`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dlq_ids: [discardDlqId],
        reason: 'Unrecoverable cryptographic payload corruption discarded by test runner',
      }),
    });
    assert.strictEqual(resDiscard.status, 200);
    const discardJson = await resDiscard.json();
    assert.strictEqual(discardJson.data.discarded_count, 1);

    const [discardedRow] = await connection.execute(
      'SELECT status FROM event_mesh_dead_letter_queue WHERE id = ?',
      [discardDlqId]
    );
    assert.strictEqual(discardedRow[0].status, 'discarded');
    logPass('Unrecoverable payload quarantined message marked as DISCARDED');

    // Test 400 on discard with missing dlq_ids
    const resBadDiscard = await fetch(`${BASE_URL}/admin/operations/event-mesh/dlq/discard`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadDiscard.status, 400, 'Missing dlq_ids must return 400');
    logPass('400 Bad Request enforced for missing dlq_ids in DLQ discard');

    // -------------------------------------------------------------
    // Idempotency Keys Listing API
    // -------------------------------------------------------------
    const resIdemKeys = await fetch(`${BASE_URL}/admin/operations/event-mesh/idempotency-keys?limit=10`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resIdemKeys.status, 200);
    const idemKeysJson = await resIdemKeys.json();
    assert(idemKeysJson.success && Array.isArray(idemKeysJson.data));
    assert(idemKeysJson.data.length > 0, 'Idempotency keys list must return records');
    assert(idemKeysJson.data[0].idempotency_key, 'Must have idempotency_key');
    logPass(`Idempotency keys retrieved: ${idemKeysJson.data.length} records verified`);

    // -------------------------------------------------------------
    // 10. Exactly-Once Idempotency & Deduplication Engine
    // -------------------------------------------------------------
    console.log('\n[11/12] Verifying Exactly-Once Ingestion & Deduplication Pipeline...');
    const testIdemKey = `idem-stage39-exact-${Date.now()}`;
    const eventPayload = {
      action: 'post.published.verify',
      author: 'Stage39 Test Runner',
      meta: { timestamp: Date.now() },
    };

    // Test 400 on simulate with missing payload
    const resBadSim = await fetch(`${BASE_URL}/admin/operations/event-mesh/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic_name: 'posts.published' }),
    });
    assert.strictEqual(resBadSim.status, 400, 'Missing payload must return 400');
    logPass('400 Bad Request enforced for missing simulate payload');

    // First dispatch - should succeed
    const resSim1 = await fetch(`${BASE_URL}/admin/operations/event-mesh/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic_name: 'posts.published',
        payload: eventPayload,
        idempotency_key: testIdemKey,
      }),
    });
    assert.strictEqual(resSim1.status, 200);
    const sim1Json = await resSim1.json();
    assert(sim1Json.success);
    assert.strictEqual(sim1Json.data.published, true);
    assert.strictEqual(sim1Json.data.duplicate_detected, false);
    assert(sim1Json.data.deliveries.length > 0, 'Must have subscription deliveries');
    logPass(`Event successfully dispatched (first time): key = ${testIdemKey}`);

    // Second dispatch with same idempotency key - must detect duplicate
    const resSim2 = await fetch(`${BASE_URL}/admin/operations/event-mesh/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic_name: 'posts.published',
        payload: eventPayload,
        idempotency_key: testIdemKey,
      }),
    });
    assert.strictEqual(resSim2.status, 200);
    const sim2Json = await resSim2.json();
    assert(sim2Json.success);
    assert.strictEqual(sim2Json.data.published, false);
    assert.strictEqual(sim2Json.data.duplicate_detected, true);
    logPass('Duplicate event blocked by Exactly-Once Deduplication Engine (duplicate_detected = true)');

    // -------------------------------------------------------------
    // 11. Failure Simulation & DLQ Quarantine Routing
    // -------------------------------------------------------------
    const failIdemKey = `idem-stage39-fail-${Date.now()}`;
    const resSimFail = await fetch(`${BASE_URL}/admin/operations/event-mesh/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic_name: 'posts.published',
        payload: { simulated_failure: true },
        idempotency_key: failIdemKey,
        fail_target_subscription: true,
      }),
    });
    assert.strictEqual(resSimFail.status, 200);
    const simFailJson = await resSimFail.json();
    assert(simFailJson.data.deliveries.some((d) => d.status === 'dlq_routed'));
    logPass('Downstream failure simulation correctly routed message to DLQ');

    // -------------------------------------------------------------
    // 12. Superadmin Audit Trail Ledger & Cleanup
    // -------------------------------------------------------------
    console.log('\n[12/12] Verifying Audit Trail Ledger & Final Clean-up...');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type FROM superadmin_audit_logs WHERE target_resource_type = 'event_mesh' ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length >= 3, 'Must have at least 3 event_mesh audit log entries');
    const actions = auditRows.map((a) => a.action);
    assert(
      actions.includes('EVENT_MESH_TOPIC_CREATED') ||
      actions.includes('EVENT_MESH_CIRCUIT_BREAKER_UPDATED') ||
      actions.includes('EVENT_MESH_DLQ_REPLAY') ||
      actions.includes('EVENT_MESH_SIMULATION_EXECUTED'),
      'Audit log actions must match event mesh events'
    );
    logPass(`Audit trail verified: actions = ${actions.slice(0, 4).join(', ')}`);

    // Clean-up Test Records
    await connection.execute("DELETE FROM event_mesh_topics WHERE topic_name LIKE 'test.%'");
    await connection.execute("DELETE FROM event_mesh_dead_letter_queue WHERE event_id LIKE 'evt-stage39-%' OR id LIKE 'dlq-stage39-%'");
    await connection.execute("DELETE FROM event_mesh_idempotency_keys WHERE idempotency_key LIKE 'idem-stage39-%'");
    logPass('Cleaned up test event mesh records and idempotency keys');

    // -------------------------------------------------------------
    // POST-VERIFICATION OF PRODUCTION META PUBLICATION LOCK
    // -------------------------------------------------------------
    console.log('\n[POST-VERIFICATION] Checking Production Meta Invariant Lock post-test...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 39 SUMMARY: ALL ${passedTests} ASSERTIONS PASSED (100%)`);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage39Tests().catch((err) => {
  console.error('\n❌ STAGE 39 FAILED:', err);
  process.exit(1);
});
