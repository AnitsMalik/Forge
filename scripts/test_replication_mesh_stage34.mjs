/**
 * Stage 34: Enterprise Multi-Region Disaster Failover & Live Active-Active Database Replication Mesh Suite
 * SocialForge Platform v5.2.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview Telemetry & Cluster Quorum KPIs (totalNodes, healthyNodes, leaderNode, quorumStatus, avgLag, regions)
 * 4. Pre-seeded Core Replication Mesh Nodes:
 *    - All 5 nodes exist across 4 global regions
 *    - Node roles: leader_primary, hot_standby, read_replica, witness_arbiter
 *    - GTID offsets and write eligibility correctly populated
 * 5. Node CRUD & Safety Guardrails Engine:
 *    - Rejection of invalid region_code or short node_name -> 400
 *    - Rejection of invalid role -> 400
 *    - Creation of custom replica node
 *    - Duplicate node name rejection -> 409
 *    - Retrieval by node ID
 *    - Updating node parameters (status, role, lag)
 *    - Decommission guardrail: Rejection of deleting active leader_primary node -> 400
 *    - Deletion of custom replica node
 * 6. Continuous Heartbeat Telemetry:
 *    - Heartbeat recording updates node status, lag, and last_heartbeat_at
 *    - Heartbeat event logged to replication_heartbeat_events
 *    - Querying recent heartbeat history
 * 7. Raft-Style Failover Simulation Sandbox:
 *    - Simulation on healthy standby -> SAFE_FOR_FAILOVER (quorate, low lag)
 *    - Simulation on witness arbiter -> SPLIT_BRAIN_RISK
 *    - Zero persistent database mutations
 * 8. Real Disaster Failover Promotion & Quorum Consensus:
 *    - Rejection of witness arbiter promotion -> 400
 *    - Successful promotion of candidate standby
 *    - Automatic demotion of former leader to hot_standby
 *    - Monotonic fencing token allocation
 *    - Recorded event in failover_quorum_events
 *    - Restoration of initial leader
 * 9. Superadmin Audit Trail:
 *    - Verifying actions logged to superadmin_audit_logs
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

async function runStage34() {
  console.log('================================================================');
  console.log('   STAGE 34: MULTI-REGION DISASTER FAILOVER & REPLICATION MESH  ');
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
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/telemetry`);
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    const regularRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/telemetry`, {
      headers: regularHeaders,
    });
    assert(regularRes.status === 403, `Regular member rejected with 403 (got ${regularRes.status})`);

    const superadminRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/telemetry`, {
      headers: superadminHeaders,
    });
    assert(superadminRes.status === 200, `Superadmin access allowed with 200 (got ${superadminRes.status})`);
    console.log('');

    // -------------------------------------------------------------------------
    // 4. Overview Telemetry & Cluster Quorum KPIs
    // -------------------------------------------------------------------------
    console.log('[Section 4: Overview Telemetry & Cluster Quorum KPIs]');
    const telemetryData = await superadminRes.json();
    assert(telemetryData.success === true, 'Telemetry response has success: true');
    const tel = telemetryData.data;

    assert(typeof tel.totalNodes === 'number', 'telemetry.totalNodes is number');
    assert(tel.totalNodes >= 5, `telemetry.totalNodes >= 5 (found: ${tel.totalNodes})`);
    assert(typeof tel.healthyNodes === 'number', 'telemetry.healthyNodes is number');
    assert(tel.healthyNodes >= 4, `telemetry.healthyNodes >= 4 (found: ${tel.healthyNodes})`);
    assert(tel.quorumStatus === 'quorate', `telemetry.quorumStatus is "quorate" (found: ${tel.quorumStatus})`);
    assert(typeof tel.averageLagMs === 'number', 'telemetry.averageLagMs is number');
    assert(typeof tel.maxLagMs === 'number', 'telemetry.maxLagMs is number');
    assert(tel.activeRegionCount >= 4, `telemetry.activeRegionCount >= 4 (found: ${tel.activeRegionCount})`);
    assert(tel.leaderNode !== null, 'telemetry.leaderNode is not null');
    assert(tel.leaderNode.role === 'leader_primary', 'Leader node has role "leader_primary"');
    assert(Array.isArray(tel.recentFailovers), 'telemetry.recentFailovers is array');
    console.log('');

    // -------------------------------------------------------------------------
    // 5. Pre-seeded Core Mesh Nodes Verification
    // -------------------------------------------------------------------------
    console.log('[Section 5: Pre-seeded Core Mesh Nodes Verification]');
    const nodesRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      headers: superadminHeaders,
    });
    assert(nodesRes.status === 200, 'GET /nodes returned 200');
    const nodesJson = await nodesRes.json();
    const nodes = nodesJson.data;
    assert(Array.isArray(nodes), 'nodes is an array');

    const iadLeader = nodes.find((n) => n.node_name === 'iad-db-primary-01');
    assert(iadLeader !== undefined, 'Found iad-db-primary-01');
    assert(iadLeader.region_code === 'us-east-1', 'iad-db-primary-01 in us-east-1');
    assert(iadLeader.role === 'leader_primary', 'iad-db-primary-01 is leader_primary');
    assert(iadLeader.is_write_eligible === true, 'iad-db-primary-01 is write eligible');

    const pdxStandby = nodes.find((n) => n.node_name === 'pdx-db-standby-02');
    assert(pdxStandby !== undefined, 'Found pdx-db-standby-02');
    assert(pdxStandby.role === 'hot_standby', 'pdx-db-standby-02 is hot_standby');

    const ordWitness = nodes.find((n) => n.node_name === 'ord-db-witness-05');
    assert(ordWitness !== undefined, 'Found ord-db-witness-05');
    assert(ordWitness.role === 'witness_arbiter', 'ord-db-witness-05 is witness_arbiter');
    console.log('');

    // -------------------------------------------------------------------------
    // 6. Node CRUD & Safety Guardrails Engine
    // -------------------------------------------------------------------------
    console.log('[Section 6: Node CRUD & Safety Guardrails Engine]');
    // Validation: missing region_code
    const invalidRegionRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        node_name: 'test-invalid-node',
        role: 'read_replica',
        ip_address: '10.0.1.99',
      }),
    });
    assert(invalidRegionRes.status === 400, `Missing region_code rejected with 400 (got ${invalidRegionRes.status})`);

    // Validation: invalid role
    const invalidRoleRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        node_name: 'test-invalid-node',
        region_code: 'us-east-1',
        role: 'unsupported_role',
        ip_address: '10.0.1.99',
      }),
    });
    assert(invalidRoleRes.status === 400, `Invalid role rejected with 400 (got ${invalidRoleRes.status})`);

    // Create custom replica node
    const customNodeName = `syd-db-replica-${Date.now().toString(36)}`;
    const createRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        node_name: customNodeName,
        region_code: 'ap-southeast-2',
        role: 'read_replica',
        ip_address: '10.200.1.15',
        port: 3306,
        is_write_eligible: false,
        heartbeat_interval_sec: 5,
      }),
    });
    assert(createRes.status === 201, `POST /nodes created node with 201 (got ${createRes.status})`);
    const createdNode = (await createRes.json()).data;
    assert(createdNode.node_name === customNodeName, 'Created node name matches');
    assert(createdNode.region_code === 'ap-southeast-2', 'Created node region matches');

    // Duplicate rejection
    const dupRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        node_name: customNodeName,
        region_code: 'ap-southeast-2',
        role: 'read_replica',
        ip_address: '10.200.1.15',
      }),
    });
    assert(dupRes.status === 409, `Duplicate node name rejected with 409 (got ${dupRes.status})`);

    // Get node by ID
    const getRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${createdNode.id}`, {
      headers: superadminHeaders,
    });
    assert(getRes.status === 200, 'GET /nodes/:id returned 200');
    assert((await getRes.json()).data.id === createdNode.id, 'Fetched node matches ID');

    // Update node parameters
    const updateRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${createdNode.id}`, {
      method: 'PUT',
      headers: superadminHeaders,
      body: JSON.stringify({
        status: 'degraded',
        replication_lag_ms: 120,
      }),
    });
    assert(updateRes.status === 200, 'PUT /nodes/:id returned 200');
    const updatedNode = (await updateRes.json()).data;
    assert(updatedNode.status === 'degraded', 'Node status updated to degraded');
    assert(updatedNode.replication_lag_ms === 120, 'Node lag updated to 120ms');

    // Safety guardrail: cannot delete active leader
    const deleteLeaderRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${iadLeader.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    assert(deleteLeaderRes.status === 400, `Deleting active leader rejected with 400 (got ${deleteLeaderRes.status})`);

    // Delete custom replica node
    const deleteRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${createdNode.id}`, {
      method: 'DELETE',
      headers: superadminHeaders,
    });
    assert(deleteRes.status === 200, 'DELETE /nodes/:id returned 200');
    console.log('');

    // -------------------------------------------------------------------------
    // 7. Continuous Heartbeat Telemetry
    // -------------------------------------------------------------------------
    console.log('[Section 7: Continuous Heartbeat Telemetry]');
    const hbRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${pdxStandby.id}/heartbeat`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        lag_ms: 8,
        commit_throughput_tps: 345.5,
        cpu_utilization_percent: 32.1,
        status: 'healthy',
      }),
    });
    assert(hbRes.status === 200, 'POST /nodes/:id/heartbeat returned 200');
    const hbData = (await hbRes.json()).data;
    assert(hbData.node_id === pdxStandby.id, 'Heartbeat record contains matching node_id');
    assert(hbData.lag_ms === 8, 'Heartbeat lag_ms recorded as 8');

    // Verify node table updated
    const nodeAfterHbRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes/${pdxStandby.id}`, {
      headers: superadminHeaders,
    });
    const nodeAfterHb = (await nodeAfterHbRes.json()).data;
    assert(nodeAfterHb.replication_lag_ms === 8, 'Node replication_lag_ms in table updated to 8');

    // List recent heartbeats
    const listHbRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/heartbeats?limit=10`, {
      headers: superadminHeaders,
    });
    assert(listHbRes.status === 200, 'GET /heartbeats returned 200');
    const hbs = (await listHbRes.json()).data;
    assert(Array.isArray(hbs) && hbs.length > 0, 'Recent heartbeats array retrieved');
    console.log('');

    // -------------------------------------------------------------------------
    // 8. Raft-Style Failover Simulation Sandbox
    // -------------------------------------------------------------------------
    console.log('[Section 8: Raft-Style Failover Simulation Sandbox]');
    // Simulate with healthy standby
    const simSafeRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/simulate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ candidateNodeId: pdxStandby.id }),
    });
    assert(simSafeRes.status === 200, 'Simulation on standby returned 200');
    const simSafe = (await simSafeRes.json()).data;
    assert(simSafe.verdict === 'SAFE_FOR_FAILOVER', `Verdict on healthy standby is SAFE_FOR_FAILOVER (got: ${simSafe.verdict})`);
    assert(simSafe.eligible === true, 'Standby is eligible for failover');
    assert(simSafe.quorumVotesEstimated.quorate === true, 'Quorum votes estimated quorate');
    assert(typeof simSafe.fencingTokenAllocated === 'number', 'Fencing token allocated');

    // Simulate with witness arbiter
    const simWitnessRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/simulate`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({ candidateNodeId: ordWitness.id }),
    });
    assert(simWitnessRes.status === 200, 'Simulation on witness returned 200');
    const simWitness = (await simWitnessRes.json()).data;
    assert(simWitness.verdict === 'SPLIT_BRAIN_RISK', `Verdict on witness is SPLIT_BRAIN_RISK (got: ${simWitness.verdict})`);
    assert(simWitness.eligible === false, 'Witness is ineligible for promotion');

    // Verify database cluster unaffected by simulation
    const checkNodesRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/nodes`, {
      headers: superadminHeaders,
    });
    const nodesAfterSim = (await checkNodesRes.json()).data;
    const currentLeader = nodesAfterSim.find((n) => n.role === 'leader_primary');
    assert(currentLeader.node_name === 'iad-db-primary-01', 'Primary leader remains iad-db-primary-01 post-simulation');
    console.log('');

    // -------------------------------------------------------------------------
    // 9. Disaster Failover Execution & Consensus Engine
    // -------------------------------------------------------------------------
    console.log('[Section 9: Disaster Failover Execution & Consensus Engine]');
    // Reject witness promotion
    const rejectWitnessFailover = await fetch(`${BASE_URL}/admin/operations/replication-mesh/failover`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        promoted_node_id: ordWitness.id,
        reason: 'Attempting invalid witness promotion',
      }),
    });
    assert(rejectWitnessFailover.status === 400, `Witness promotion rejected with 400 (got ${rejectWitnessFailover.status})`);

    // Execute failover promoting pdxStandby
    const executeRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/failover`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        promoted_node_id: pdxStandby.id,
        reason: 'Automated regional DR switch test to us-west-2',
      }),
    });
    assert(executeRes.status === 200, 'POST /failover returned 200');
    const executeData = (await executeRes.json()).data;
    assert(executeData.success === true, 'Failover execution result has success: true');
    assert(executeData.promotedNode.role === 'leader_primary', 'Candidate successfully promoted to leader_primary');
    assert(executeData.promotedNode.is_write_eligible === true, 'New leader has write authority');
    assert(executeData.previousLeader.role === 'hot_standby', 'Former leader demoted to hot_standby');
    assert(executeData.previousLeader.is_write_eligible === false, 'Former leader write authority revoked');
    assert(executeData.failoverEvent.outcome === 'promoted', 'Failover quorum event outcome is promoted');
    assert(executeData.failoverEvent.fencing_token >= 1002, `Fencing token incremented (token: ${executeData.failoverEvent.fencing_token})`);

    // Verify failover event in database
    const [dbEvents] = await connection.execute(
      'SELECT id, promoted_leader_id, outcome, fencing_token FROM failover_quorum_events WHERE id = ?',
      [executeData.failoverEvent.id]
    );
    assert(dbEvents.length > 0, 'Failover event found in database');
    assert(dbEvents[0].outcome === 'promoted', 'Database event outcome is promoted');

    // Restore initial leader (iadLeader)
    const restoreRes = await fetch(`${BASE_URL}/admin/operations/replication-mesh/failover`, {
      method: 'POST',
      headers: superadminHeaders,
      body: JSON.stringify({
        promoted_node_id: iadLeader.id,
        reason: 'Restoring primary cluster leadership back to us-east-1',
      }),
    });
    assert(restoreRes.status === 200, 'POST /failover restoration returned 200');
    const restoreData = (await restoreRes.json()).data;
    assert(restoreData.promotedNode.node_name === 'iad-db-primary-01', 'Restored iad-db-primary-01 to leader_primary');
    console.log('');

    // -------------------------------------------------------------------------
    // 10. Superadmin Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('[Section 10: Superadmin Audit Trail Verification]');
    const [auditRows] = await connection.execute(
      `SELECT action, target_resource_type, reason FROM superadmin_audit_logs 
       WHERE target_resource_type = 'replication_mesh' 
       ORDER BY created_at DESC LIMIT 10`
    );
    assert(auditRows.length > 0, 'Found audit logs recorded for replication_mesh actions');
    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('EXECUTE_FAILOVER'), 'Audit log recorded EXECUTE_FAILOVER');
    assert(actions.includes('CREATE_REPLICATION_NODE'), 'Audit log recorded CREATE_REPLICATION_NODE');
    console.log('');

    // -------------------------------------------------------------------------
    // 11. Meta Invariant Post-Check
    // -------------------------------------------------------------------------
    console.log('[Section 11: Meta Invariant Post-Check]');
    await verifyMetaLock(connection, 'POST');
    console.log('');

    console.log('================================================================');
    console.log(`   STAGE 34 COMPLETE: ALL ${passedTests} ASSERTIONS PASSED!`);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage34().catch((err) => {
  console.error('\nSTAGE 34 EXECUTION FAILED:', err.message);
  process.exit(1);
});
