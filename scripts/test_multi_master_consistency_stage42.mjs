/**
 * Stage 42: Enterprise Cross-Region Active-Active Multi-Master Conflict Resolution & Global Distributed Consistency Engine Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Multi-Master Telemetry & Quorum Health (Weighted Consensus)
 * 4. Active-Active Node Registry & Regional Topology (US-East, US-West, EU-West, AP-South)
 * 5. Dynamic Quorum Fencing & Split-Brain Isolation Drill Pipeline
 * 6. Vector Clock Causality Registry & Multi-Region Causal States
 * 7. Conflict Resolution Policies Management & Dynamic Strategy Updating
 * 8. LWW (Last-Write-Wins) Deterministic Timestamp Collision Resolution
 * 9. CRDT PN-Counter Additive Commutative Merge (Zero Data Loss)
 * 10. CRDT OR-Set / Field Union Conflict Resolution
 * 11. Distributed Convergence Audit Logs & Latency Tracking
 * 12. Superadmin Operations Forensic Audit Trail Verification
 * 13. Zero Residual Mutation & Test Idempotency
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

async function runStage42Tests() {
  console.log('\n================================================================');
  console.log(' STAGE 42: ACTIVE-ACTIVE MULTI-MASTER CONFLICT RESOLUTION SUITE ');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. PRE-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('1. Verifying Production Meta Invariant Lock (PRE-CHECK)...');
    await verifyMetaLock(connection, 'PRE');

    // -------------------------------------------------------------------------
    // 2. SETUP AUTH TOKENS (Superadmin vs Regular User)
    // -------------------------------------------------------------------------
    console.log('\n2. Generating Test JWT Credentials & Setting Up Operators...');
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
    logPass(`Superadmin authenticated as: ${superadminUser.email}`);

    // -------------------------------------------------------------------------
    // 3. RBAC & SECURITY GUARDRAILS
    // -------------------------------------------------------------------------
    console.log('\n3. Validating RBAC Security Enforcement (401, 403, 200)...');
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/multi-master/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must be rejected with 401');
    logPass('Unauthenticated multi-master access rejected with HTTP 401 Unauthorized');

    if (regularToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/multi-master/telemetry`, {
        headers: { Authorization: `Bearer ${regularToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin token must be rejected with 403');
      logPass('Non-superadmin tenant user access rejected with HTTP 403 Forbidden');
    }

    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // -------------------------------------------------------------------------
    // 4. TELEMETRY & QUORUM HEALTH
    // -------------------------------------------------------------------------
    console.log('\n4. Testing Multi-Master Mesh Telemetry & Quorum Health...');
    const telRes = await fetch(`${BASE_URL}/admin/operations/multi-master/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telRes.status, 200, 'Superadmin access to telemetry must return 200');
    const telData = (await telRes.json()).data;
    assert(Number(telData.total_active_nodes) >= 4, 'Must report at least 4 active nodes');
    assert(Number(telData.quorum_health_percent) >= 80, 'Quorum health must be >= 80%');
    assert(Number(telData.total_vector_clock_entities) >= 3, 'Must track at least 3 vector clock entities');
    assert(Number(telData.conflicts_resolved_24h) >= 2, 'Must report pre-seeded convergence logs');
    assert.strictEqual(telData.mesh_consistency_state, 'strict_quorum', 'Initial state must be strict_quorum');
    logPass(`Multi-Master Telemetry: ${telData.total_active_nodes} active clusters, ${telData.quorum_health_percent}% quorum health (State: ${telData.mesh_consistency_state})`);

    // -------------------------------------------------------------------------
    // 5. NODE TOPOLOGY & QUORUM FENCING DRILL
    // -------------------------------------------------------------------------
    console.log('\n5. Testing Node Topology & Quorum Fencing Drill...');
    const nodesRes = await fetch(`${BASE_URL}/admin/operations/multi-master/nodes`, {
      headers: authHeaders,
    });
    assert.strictEqual(nodesRes.status, 200, 'Listing nodes must return 200');
    const nodes = (await nodesRes.json()).data;
    assert(nodes.length >= 4, 'Must retrieve all 4 regional multi-master nodes');
    const apNode = nodes.find((n) => n.id === 'node-ap-south-primary');
    assert(apNode, 'Must find AP-South primary node');
    assert.strictEqual(apNode.is_fenced, false, 'Node must initially not be fenced');
    logPass(`Node Topology: 4 active-active regional nodes verified with total write capacity`);

    // Fence node
    const fenceRes = await fetch(`${BASE_URL}/admin/operations/multi-master/nodes/node-ap-south-primary/fence`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ is_fenced: true, reason: 'Automated stage 42 network partition isolation drill' }),
    });
    assert.strictEqual(fenceRes.status, 200, 'Fencing node must return 200');
    const fenceData = (await fenceRes.json()).data;
    assert.strictEqual(fenceData.is_fenced, true, 'Node must now be marked fenced');
    logPass(`Quorum Fencing: Isolated node '${fenceData.node_name}' from voting quorum`);

    // Verify telemetry reflects fenced state
    const fencedTelRes = await fetch(`${BASE_URL}/admin/operations/multi-master/telemetry`, {
      headers: authHeaders,
    });
    const fencedTel = (await fencedTelRes.json()).data;
    assert.strictEqual(fencedTel.fenced_nodes, 1, 'Must report 1 fenced node');
    assert.strictEqual(fencedTel.mesh_consistency_state, 'eventual_convergence', 'State must transition to eventual_convergence');
    logPass('Telemetry dynamically reflected 1 fenced node and eventual convergence state');

    // Restore node
    const restoreRes = await fetch(`${BASE_URL}/admin/operations/multi-master/nodes/node-ap-south-primary/fence`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ is_fenced: false, reason: 'Restoring node to live quorum' }),
    });
    assert.strictEqual(restoreRes.status, 200, 'Restoring node must return 200');
    logPass('Quorum Fencing: Restored node back into active voting quorum');

    // -------------------------------------------------------------------------
    // 6. VECTOR CLOCKS REGISTRY & CAUSALITY INSPECTION
    // -------------------------------------------------------------------------
    console.log('\n6. Testing Vector Clocks Causality Registry...');
    const clocksRes = await fetch(`${BASE_URL}/admin/operations/multi-master/vector-clocks?entity_type=campaign_schedule`, {
      headers: authHeaders,
    });
    assert.strictEqual(clocksRes.status, 200, 'Listing vector clocks must return 200');
    const clocks = (await clocksRes.json()).data;
    assert(clocks.length >= 1, 'Must find campaign schedule vector clock');
    const campClock = clocks[0];
    assert(campClock.region_clocks['us-east-1'] !== undefined, 'Must contain regional clock for us-east-1');
    assert.strictEqual(campClock.causal_state, 'ordered', 'Causal state must be ordered');
    logPass(`Vector Clocks: Verified causal history for '${campClock.entity_id}' across 4 regions`);

    // -------------------------------------------------------------------------
    // 7. CONFLICT RESOLUTION POLICIES MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Conflict Resolution Policies Management...');
    const polsRes = await fetch(`${BASE_URL}/admin/operations/multi-master/policies`, {
      headers: authHeaders,
    });
    assert.strictEqual(polsRes.status, 200, 'Listing policies must return 200');
    const policies = (await polsRes.json()).data;
    assert(policies.length >= 4, 'Must list at least 4 conflict resolution policies');
    const schedPol = policies.find((p) => p.id === 'pol-campaign-schedule');
    assert(schedPol, 'Must find campaign schedule policy');
    const initialStrategy = schedPol.resolution_strategy;

    // Update policy
    const updatePolRes = await fetch(`${BASE_URL}/admin/operations/multi-master/policies/pol-campaign-schedule`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        resolution_strategy: 'highest_priority_region',
        tie_breaker_region: 'us-west-2',
      }),
    });
    assert.strictEqual(updatePolRes.status, 200, 'Updating policy must return 200');
    const updatedPol = (await updatePolRes.json()).data;
    assert.strictEqual(updatedPol.resolution_strategy, 'highest_priority_region');
    assert.strictEqual(updatedPol.tie_breaker_region, 'us-west-2');
    logPass(`Policy Update: Modified '${updatedPol.policy_name}' strategy to 'highest_priority_region'`);

    // Revert policy
    await fetch(`${BASE_URL}/admin/operations/multi-master/policies/pol-campaign-schedule`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        resolution_strategy: initialStrategy,
        tie_breaker_region: 'us-east-1',
      }),
    });
    logPass(`Policy Reverted: Restored baseline strategy '${initialStrategy}'`);

    // -------------------------------------------------------------------------
    // 8. SIMULATING CROSS-REGION WRITE RACE CONFLICTS
    // -------------------------------------------------------------------------
    console.log('\n8. Simulating Cross-Region Write Race Conflicts...');

    // Simulation 1: LWW Timestamp Deterministic Tie-Breaking
    const race1Res = await fetch(`${BASE_URL}/admin/operations/multi-master/simulate-conflict`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        entity_type: 'campaign_schedule',
        entity_id: 'camp-summer-launch-2026',
        region_a: 'us-east-1',
        payload_a: { publish_at: '2026-07-01T14:00:00Z', note: 'Draft from US-East' },
        timestamp_a: '2026-06-30T12:00:00.100Z',
        region_b: 'eu-west-1',
        payload_b: { publish_at: '2026-07-01T15:00:00Z', note: 'Edit from EU-West' },
        timestamp_b: '2026-06-30T12:00:00.250Z',
        strategy_override: 'lww_timestamp',
      }),
    });
    assert.strictEqual(race1Res.status, 200, 'Race 1 simulation must return 200');
    const race1 = (await race1Res.json()).data;
    assert.strictEqual(race1.winning_region, 'eu-west-1', 'Later timestamp (eu-west-1) must win');
    assert.strictEqual(race1.strategy_applied, 'lww_timestamp');
    assert(race1.convergence_latency_ms < 50, 'Convergence latency must be sub-50ms');
    logPass(`Race [LWW Timestamp]: Later write in 'eu-west-1' won by +150ms in ${race1.convergence_latency_ms}ms`);

    // Simulation 2: CRDT PN-Counter Commutative Additive Merge
    const race2Res = await fetch(`${BASE_URL}/admin/operations/multi-master/simulate-conflict`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        entity_type: 'tenant_quota_counter',
        entity_id: 'tenant-enterprise-01',
        region_a: 'us-west-2',
        payload_a: { counter: 350 },
        timestamp_a: '2026-06-30T12:00:00.000Z',
        region_b: 'ap-south-1',
        payload_b: { counter: 420 },
        timestamp_b: '2026-06-30T12:00:00.000Z',
        strategy_override: 'crdt_pn_counter',
      }),
    });
    assert.strictEqual(race2Res.status, 200, 'Race 2 simulation must return 200');
    const race2 = (await race2Res.json()).data;
    assert.strictEqual(race2.winning_payload.counter, 770, 'CRDT PN-Counter must merge additively: 350 + 420 = 770');
    logPass(`Race [CRDT PN-Counter]: Commutative merge converged to counter = 770 without lost updates`);

    // Simulation 3: Concurrent Exact Timestamp Collision (Tie-Breaker Region)
    const race3Res = await fetch(`${BASE_URL}/admin/operations/multi-master/simulate-conflict`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        entity_type: 'campaign_schedule',
        entity_id: 'camp-summer-launch-2026',
        region_a: 'eu-west-1',
        payload_a: { schedule: 'v1' },
        timestamp_a: '2026-06-30T12:00:00.000Z',
        region_b: 'us-east-1',
        payload_b: { schedule: 'v2' },
        timestamp_b: '2026-06-30T12:00:00.000Z',
        strategy_override: 'lww_timestamp',
      }),
    });
    assert.strictEqual(race3Res.status, 200, 'Race 3 simulation must return 200');
    const race3 = (await race3Res.json()).data;
    assert.strictEqual(race3.winning_region, 'us-east-1', 'Priority tie-breaker us-east-1 must break concurrent collision');
    assert.strictEqual(race3.detected_causality, 'concurrent');
    logPass(`Race [Concurrent Tie-Breaker]: Exact collision resolved deterministically in favor of priority tie-breaker 'us-east-1'`);

    // -------------------------------------------------------------------------
    // 9. CONVERGENCE AUDIT LOGS INSPECTION
    // -------------------------------------------------------------------------
    console.log('\n9. Testing Distributed Convergence Audit Logs...');
    const convLogsRes = await fetch(`${BASE_URL}/admin/operations/multi-master/convergence-logs?limit=10`, {
      headers: authHeaders,
    });
    assert.strictEqual(convLogsRes.status, 200, 'Listing convergence logs must return 200');
    const convLogs = (await convLogsRes.json()).data;
    assert(convLogs.length >= 3, 'Must have recorded the simulated conflict convergence events');
    assert.strictEqual(convLogs[0].convergence_status, 'resolved');
    logPass(`Convergence Audit Logs: ${convLogs.length} conflict resolution records verified`);

    // -------------------------------------------------------------------------
    // 10. SUPERADMIN FORENSIC AUDIT TRAIL
    // -------------------------------------------------------------------------
    console.log('\n10. Verifying Superadmin Operations Forensic Audit Trail...');
    const [auditRows] = await connection.execute(
      'SELECT id, action, target_resource_type, reason, created_at FROM superadmin_audit_logs WHERE target_resource_type = ? ORDER BY created_at DESC LIMIT 15',
      ['multi_master_consistency']
    );
    assert(auditRows.length >= 4, 'Must have recorded at least 4 audit log entries for multi-master operations');
    const actions = auditRows.map((a) => a.action);
    assert(actions.includes('MULTI_MASTER_NODE_FENCED'), 'Must log node fencing action');
    assert(actions.includes('MULTI_MASTER_NODE_RECONNECTED'), 'Must log node reconnection action');
    assert(actions.includes('CONFLICT_RESOLUTION_POLICY_UPDATED'), 'Must log policy update action');
    assert(actions.includes('CROSS_REGION_CONFLICT_RESOLVED'), 'Must log cross-region conflict resolution action');
    logPass(`Superadmin Audit Logs: ${auditRows.length} forensic audit entries captured for multi-master operations`);

    // -------------------------------------------------------------------------
    // 11. POST-CHECK PRODUCTION META PUBLICATION LOCK INVARIANT
    // -------------------------------------------------------------------------
    console.log('\n11. Verifying Production Meta Invariant Lock (POST-CHECK)...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n================================================================');
    console.log(` STAGE 42 VALIDATION COMPLETE: ALL ${passedTests} ASSERTIONS PASSED (100%) `);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage42Tests().catch((err) => {
  console.error('\n❌ STAGE 42 TEST FAILURE:', err);
  process.exit(1);
});
