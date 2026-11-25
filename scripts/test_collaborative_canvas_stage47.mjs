/**
 * Stage 47: Multi-Tenant Real-Time Collaborative Canvas, Operational Transformation (OT/CRDT) & Presence Gateway Test Suite
 * SocialForge Platform v6.5.0
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Collaborative Canvas Telemetry & Metrics
 * 4. Canvas Rooms Registry & State Hydration
 * 5. Dynamic Collaborative Canvas Room Provisioning & Initial Snapshot
 * 6. Sequential Operational Transformation (OT) Op Application & Atomic Revisions
 * 7. Concurrent State Vector Conflict Collision & CRDT Transform Adaptation
 * 8. Real-Time Peer Presence Gateway & Cursor Tracking Heartbeats
 * 9. Operational Transformation Audit Log Stream
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

async function runStage47Tests() {
  console.log('========================================================================');
  console.log('  STAGE 47: REAL-TIME COLLABORATIVE CANVAS & PRESENCE GATEWAY SUITE     ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. PRE-CHECK META INVARIANT LOCK
    console.log('[1/11] Verifying Pre-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'PRE');

    // 2. AUTH & RBAC GUARDRAILS
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

    // 401 without auth
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    logPass('Unauthenticated request rejected with HTTP 401');

    // 403 non-superadmin
    if (normalUserToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/telemetry`, {
        headers: { Authorization: `Bearer ${normalUserToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin request must return 403');
      logPass('Non-superadmin tenant request rejected with HTTP 403');
    }

    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // 3. COLLABORATIVE CANVAS TELEMETRY
    console.log('\n[3/11] Querying Collaborative Canvas Telemetry...');
    const telemetryRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telemetryRes.status, 200, 'Telemetry endpoint must return 200');
    const telemetryBody = await telemetryRes.json();
    assert(telemetryBody.success, 'Telemetry response must indicate success');
    const telemetry = telemetryBody.data;
    assert(telemetry.total_active_rooms >= 2, `Expected at least 2 active rooms, got ${telemetry.total_active_rooms}`);
    assert(telemetry.crdt_conflict_resolution_rate >= 95, 'Conflict resolution rate must be >= 95%');
    assert(telemetry.avg_op_propagation_latency_ms > 0, 'Average op latency must be > 0');
    logPass(`Telemetry verified: ${telemetry.total_active_rooms} active rooms, ${telemetry.total_concurrent_peers} peers, ${telemetry.avg_op_propagation_latency_ms}ms avg latency, ${telemetry.crdt_conflict_resolution_rate}% CRDT rate`);

    // 4. ROOMS REGISTRY & STATE HYDRATION
    console.log('\n[4/11] Testing Canvas Rooms Registry & State Hydration...');
    const roomsListRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/rooms`, {
      headers: authHeaders,
    });
    assert.strictEqual(roomsListRes.status, 200, 'Rooms list must return 200');
    const roomsList = (await roomsListRes.json()).data;
    assert(roomsList.length >= 3, 'Must list at least 3 pre-seeded rooms');
    logPass(`Retrieved ${roomsList.length} registered canvas rooms`);

    const roomStateRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/rooms/room-brand-launch-reel-01`, {
      headers: authHeaders,
    });
    assert.strictEqual(roomStateRes.status, 200, 'Room state must return 200');
    const roomState = (await roomStateRes.json()).data;
    assert.strictEqual(roomState.room.id, 'room-brand-launch-reel-01');
    assert(roomState.elements.length >= 3, 'Pre-seeded room must have at least 3 layers');
    assert(Array.isArray(roomState.presence), 'Pre-seeded room must include presence array');
    assert(roomState.recent_ops.length >= 1, 'Pre-seeded room must have recent ops');
    logPass(`Hydrated room state for '${roomState.room.room_name}': ${roomState.elements.length} layers, ${roomState.recent_ops.length} ops`);

    // 5. DYNAMIC ROOM PROVISIONING
    console.log('\n[5/11] Provisioning New Collaborative Canvas Room...');
    const testRoomName = `Automated OT Test Canvas-${Date.now()}`;
    const initialLayers = [
      {
        id: 'layer-test-bg',
        type: 'shape',
        name: 'Background Card',
        x: 0,
        y: 0,
        width: 1080,
        height: 1080,
        rotation: 0,
        opacity: 1,
        zIndex: 0,
        props: { fill: '#1e1b4b' },
      },
      {
        id: 'layer-test-text',
        type: 'text',
        name: 'Headline',
        x: 100,
        y: 200,
        width: 600,
        height: 100,
        rotation: 0,
        opacity: 1,
        zIndex: 1,
        props: { text: 'Real-Time CRDT Sync', fontSize: 36, color: '#f8fafc' },
      },
    ];

    const createRoomRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/rooms`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        room_name: testRoomName,
        target_brand_id: 'brand-flagship-001',
        template_id: 'template-test-01',
        initial_elements: initialLayers,
      }),
    });
    assert.strictEqual(createRoomRes.status, 201, 'Create room must return 201');
    const createdRoom = (await createRoomRes.json()).data;
    assert.strictEqual(createdRoom.room_name, testRoomName);
    assert.strictEqual(createdRoom.current_revision, 0);
    assert.strictEqual(createdRoom.status, 'active');
    const createdRoomId = createdRoom.id;
    logPass(`Provisioned new collaborative room '${createdRoom.room_name}' (ID: ${createdRoomId}) at revision 0`);

    // 6. SEQUENTIAL OT OP APPLICATION & ATOMIC REVISIONS
    console.log('\n[6/11] Testing Sequential OT Op Application & Atomic Revisions...');
    // Op 1: insert_layer (base 0 -> rev 1)
    const op1Res = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/ops/apply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        room_id: createdRoomId,
        client_id: 'client-peer-alpha',
        op_type: 'insert_layer',
        target_layer_id: 'layer-test-badge',
        base_revision: 0,
        payload: {
          type: 'shape',
          name: 'Promo Badge',
          x: 250,
          y: 350,
          width: 200,
          height: 80,
          rotation: 0,
          opacity: 1,
          zIndex: 2,
          props: { fill: '#6366f1' },
        },
      }),
    });
    assert.strictEqual(op1Res.status, 200, 'Op 1 must return 200');
    const op1Result = (await op1Res.json()).data;
    assert.strictEqual(op1Result.new_revision, 1, 'New revision must be 1');
    assert.strictEqual(op1Result.transformed, false, 'Sequential op must not require transform adaptation');
    assert.strictEqual(op1Result.current_elements.length, 3, 'Total elements count must be 3');
    logPass(`Applied insert_layer op: revision incremented to v${op1Result.new_revision} (3 total layers)`);

    // Op 2: update_transform (base 1 -> rev 2)
    const op2Res = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/ops/apply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        room_id: createdRoomId,
        client_id: 'client-peer-alpha',
        op_type: 'update_transform',
        target_layer_id: 'layer-test-badge',
        base_revision: 1,
        payload: {
          x: 280,
          y: 390,
          rotation: 5,
        },
      }),
    });
    assert.strictEqual(op2Res.status, 200, 'Op 2 must return 200');
    const op2Result = (await op2Res.json()).data;
    assert.strictEqual(op2Result.new_revision, 2, 'New revision must be 2');
    assert.strictEqual(op2Result.transformed, false);
    const updatedBadge = op2Result.current_elements.find((el) => el.id === 'layer-test-badge');
    assert.strictEqual(updatedBadge.x, 280);
    assert.strictEqual(updatedBadge.y, 390);
    assert.strictEqual(updatedBadge.rotation, 5);
    logPass(`Applied update_transform op: revision incremented to v${op2Result.new_revision} (badge shifted to 280, 390)`);

    // 7. CONCURRENT CONFLICT COLLISION & CRDT TRANSFORM ADAPTATION
    console.log('\n[7/11] Simulating Concurrent Transform Collision (CRDT Convergence)...');
    // Op 3 from concurrent client with STALE base revision (base 0, while room is now at rev 2)
    const op3Res = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/ops/apply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        room_id: createdRoomId,
        client_id: 'client-peer-beta-concurrent',
        op_type: 'update_transform',
        target_layer_id: 'layer-test-badge',
        base_revision: 0, // Outdated revision!
        payload: {
          x: 310.5,
          y: 420.2,
          rotation: 10,
        },
      }),
    });
    assert.strictEqual(op3Res.status, 200, 'Concurrent op must succeed with transform adaptation');
    const op3Result = (await op3Res.json()).data;
    assert.strictEqual(op3Result.new_revision, 3, 'Revision must advance to 3');
    assert.strictEqual(op3Result.transformed, true, 'CRDT engine must adapt stale transform collision');
    assert.strictEqual(op3Result.applied_op.base_revision, 0, 'Original base revision preserved in audit log');
    assert.strictEqual(op3Result.applied_op.applied_revision, 3, 'Applied revision matches target document revision');
    logPass(`CRDT convergence verified: Stale base v0 adapted to v3 with transformed = true`);

    // 8. PEER PRESENCE GATEWAY & CURSOR TRACKING
    console.log('\n[8/11] Testing Peer Presence Gateway & Cursor Tracking...');
    const heartbeatRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/presence/heartbeat`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        room_id: createdRoomId,
        cursor_position_x: 350.5,
        cursor_position_y: 275.0,
        current_selected_layer_id: 'layer-test-badge',
      }),
    });
    assert.strictEqual(heartbeatRes.status, 200, 'Presence heartbeat must return 200');
    const heartbeatResult = (await heartbeatRes.json()).data;
    assert.strictEqual(heartbeatResult.session.room_id, createdRoomId);
    assert.strictEqual(heartbeatResult.session.cursor_position_x, 350.5);
    assert.strictEqual(heartbeatResult.session.cursor_position_y, 275.0);
    assert.strictEqual(heartbeatResult.session.current_selected_layer_id, 'layer-test-badge');
    assert(heartbeatResult.peers.length >= 1, 'Active peer list must contain current user session');
    logPass(`Presence heartbeat acknowledged: Cursor at (350.5, 275.0) on 'layer-test-badge'`);

    // Verify presence query endpoint
    const presenceRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/presence/${createdRoomId}`, {
      headers: authHeaders,
    });
    assert.strictEqual(presenceRes.status, 200, 'Get presence must return 200');
    const presenceList = (await presenceRes.json()).data;
    assert(presenceList.length >= 1, 'Room presence list must return active sessions');
    logPass(`Presence gateway returned ${presenceList.length} active peers for room`);

    // 9. OPERATIONAL TRANSFORMATION AUDIT LOG STREAM
    console.log('\n[9/11] Querying Operational Transformation Audit Log Stream...');
    const opsStreamRes = await fetch(`${BASE_URL}/admin/operations/collaborative-canvas/ops/${createdRoomId}?limit=10`, {
      headers: authHeaders,
    });
    assert.strictEqual(opsStreamRes.status, 200, 'Get ops stream must return 200');
    const opsStream = (await opsStreamRes.json()).data;
    assert.strictEqual(opsStream.length, 3, 'Must return all 3 applied operations');
    assert.strictEqual(opsStream[0].applied_revision, 3, 'Latest op must be revision 3');
    assert.strictEqual(opsStream[1].applied_revision, 2, 'Second op must be revision 2');
    assert.strictEqual(opsStream[2].applied_revision, 1, 'First op must be revision 1');
    logPass(`Operation stream verified: 3 chronological operations ordered by revision desc (v3 -> v2 -> v1)`);

    // 10. CLEAN IDEMPOTENT TEARDOWN
    console.log('\n[10/11] Performing Idempotent Test Artifact Teardown...');
    await connection.execute('DELETE FROM active_user_presence_sessions WHERE room_id = ?', [createdRoomId]);
    await connection.execute('DELETE FROM operational_transformation_ops WHERE room_id = ?', [createdRoomId]);
    await connection.execute('DELETE FROM canvas_document_snapshots WHERE room_id = ?', [createdRoomId]);
    await connection.execute('DELETE FROM collaborative_canvas_rooms WHERE id = ?', [createdRoomId]);
    logPass(`Cleaned up test room '${createdRoomId}' and associated snapshots, ops, and presence records`);

    // 11. POST-CHECK META INVARIANT LOCK
    console.log('\n[11/11] Verifying Post-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`  STAGE 47 COMPLETED SUCCESSFULLY: ${passedTests}/${passedTests} ASSERTIONS PASSED (100%) `);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage47Tests().catch((err) => {
  console.error('\n❌ STAGE 47 TEST FAILED:', err);
  process.exit(1);
});
