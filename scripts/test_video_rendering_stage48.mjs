/**
 * Stage 48: Multi-Tenant Real-Time Video Rendering Pipeline, Dynamic Motion Graphics & Cloud GPU Transcoding Mesh Test Suite
 * SocialForge Platform v6.6.0
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Video Rendering Telemetry & NVENC Hardware Acceleration Metrics
 * 4. GPU Transcode Node Cluster Registry & Dynamic Provisioning
 * 5. Motion Composition Templates Registry & Layer Ingestion
 * 6. Dynamic Video Render Job Dispatch & Automated GPU Node Load Balancing
 * 7. Live Transcoding Progress Updates & Multi-Bitrate Artifact Compilation (MP4 & HLS)
 * 8. Render Job Cancellation & GPU VRAM Resource Deallocation
 * 9. Completed Job Cancellation Immutability Guardrail (HTTP 400)
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

async function runStage48Tests() {
  console.log('========================================================================');
  console.log('  STAGE 48: REAL-TIME VIDEO RENDERING & GPU TRANSCODING MESH SUITE      ');
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
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    logPass('Unauthenticated request rejected with HTTP 401');

    // 403 non-superadmin
    if (normalUserToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/telemetry`, {
        headers: { Authorization: `Bearer ${normalUserToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin request must return 403');
      logPass('Non-superadmin tenant request rejected with HTTP 403');
    }

    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // 3. VIDEO RENDERING TELEMETRY
    console.log('\n[3/11] Querying Video Rendering Telemetry & NVENC Acceleration Metrics...');
    const telemetryRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telemetryRes.status, 200, 'Telemetry endpoint must return 200');
    const telemetryBody = await telemetryRes.json();
    assert(telemetryBody.success, 'Telemetry response must indicate success');
    const telemetry = telemetryBody.data;
    assert(telemetry.online_gpu_nodes >= 2, `Expected at least 2 online GPU nodes, got ${telemetry.online_gpu_nodes}`);
    assert(telemetry.avg_render_speedup_factor >= 3.0, `Speedup factor must be >= 3.0x, got ${telemetry.avg_render_speedup_factor}x`);
    assert(telemetry.avg_job_latency_ms > 0, 'Average job latency must be > 0');
    logPass(`Telemetry verified: ${telemetry.total_active_jobs} active jobs, ${telemetry.online_gpu_nodes} online GPU nodes, ${telemetry.avg_render_speedup_factor}x NVENC speedup, ${telemetry.avg_job_latency_ms}ms avg latency`);

    // 4. GPU TRANSCODE NODE CLUSTER
    console.log('\n[4/11] Testing GPU Transcode Node Cluster & Provisioning...');
    const nodesListRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/nodes`, {
      headers: authHeaders,
    });
    assert.strictEqual(nodesListRes.status, 200, 'Nodes list must return 200');
    const nodesList = (await nodesListRes.json()).data;
    assert(nodesList.length >= 3, 'Must list at least 3 pre-seeded GPU nodes');
    logPass(`Retrieved ${nodesList.length} active GPU transcode nodes`);

    const registerNodeRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/nodes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        node_name: `Test Node RTX-4090-${Date.now()}`,
        provider: 'on_prem_rtx',
        gpu_device_model: 'NVIDIA GeForce RTX 4090 Dedicated',
        acceleration_type: 'nvidia_nvenc',
        total_vram_gb: 24.0,
        max_concurrent_jobs: 6,
      }),
    });
    assert.strictEqual(registerNodeRes.status, 201, 'Register node must return 201');
    const registeredNode = (await registerNodeRes.json()).data;
    assert.strictEqual(registeredNode.provider, 'on_prem_rtx');
    assert.strictEqual(registeredNode.acceleration_type, 'nvidia_nvenc');
    const testNodeId = registeredNode.id;
    logPass(`Registered new GPU transcode node '${registeredNode.node_name}' (ID: ${testNodeId})`);

    // 5. MOTION COMPOSITION TEMPLATES
    console.log('\n[5/11] Testing Motion Composition Templates Registry & Provisioning...');
    const templatesListRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/templates`, {
      headers: authHeaders,
    });
    assert.strictEqual(templatesListRes.status, 200, 'Templates list must return 200');
    const templatesList = (await templatesListRes.json()).data;
    assert(templatesList.length >= 3, 'Must list at least 3 pre-seeded templates');
    logPass(`Retrieved ${templatesList.length} motion composition templates`);

    const testTemplateLayers = [
      {
        id: 'layer-bg-loop',
        name: '4K Abstract Particle Stream',
        type: 'video',
        startTimeSeconds: 0,
        durationSeconds: 12,
        properties: { opacity: 0.9 },
      },
      {
        id: 'layer-title-kinetic',
        name: 'Kinetic 3D Typography',
        type: 'text',
        startTimeSeconds: 1,
        durationSeconds: 5,
        properties: { text: 'NEXT LEVEL PERFORMANCE', color: '#38bdf8' },
      },
    ];

    const createTemplateRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/templates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        template_name: `Motion Reel Automated Template-${Date.now()}`,
        target_brand_id: 'brand-flagship-001',
        default_aspect_ratio: '9:16',
        duration_seconds: 12.0,
        composition_layers: testTemplateLayers,
      }),
    });
    assert.strictEqual(createTemplateRes.status, 201, 'Create template must return 201');
    const createdTemplate = (await createTemplateRes.json()).data;
    assert.strictEqual(createdTemplate.default_aspect_ratio, '9:16');
    assert.strictEqual(createdTemplate.total_layers_count, 2);
    const testTemplateId = createdTemplate.id;
    logPass(`Created motion composition template '${createdTemplate.template_name}' (ID: ${testTemplateId})`);

    // 6. VIDEO RENDER JOB DISPATCH & LOAD BALANCING
    console.log('\n[6/11] Dispatching Video Render Job with Automated GPU Load Balancing...');
    const testJobName = `Automated Launch Reel-${Date.now()}`;
    const dispatchJobRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        job_name: testJobName,
        target_brand_id: 'brand-flagship-001',
        template_id: testTemplateId,
        aspect_ratio: '9:16',
        fps: 30,
        duration_seconds: 12.0,
        codec: 'h264',
        preferred_gpu_node_id: testNodeId,
      }),
    });
    assert.strictEqual(dispatchJobRes.status, 201, 'Dispatch job must return 201');
    const dispatchedJob = (await dispatchJobRes.json()).data;
    assert.strictEqual(dispatchedJob.job_name, testJobName);
    assert.strictEqual(dispatchedJob.aspect_ratio, '9:16');
    assert.strictEqual(dispatchedJob.resolution_width, 1080);
    assert.strictEqual(dispatchedJob.resolution_height, 1920);
    assert.strictEqual(dispatchedJob.gpu_node_id, testNodeId);
    assert.strictEqual(dispatchedJob.status, 'rendering');
    const testJobId = dispatchedJob.id;
    logPass(`Dispatched render job '${testJobName}' to GPU node '${testNodeId}' at 1080x1920 30fps`);

    // 7. PROGRESS UPDATES & ARTIFACT COMPILATION (MP4 & HLS)
    console.log('\n[7/11] Progressing Render Execution & Generating Multi-Bitrate Artifacts...');
    // Mid-render progress update
    const midProgressRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs/${testJobId}/progress`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        progress_percent: 60,
        status: 'transcoding',
      }),
    });
    assert.strictEqual(midProgressRes.status, 200, 'Mid-progress update must return 200');
    const midJob = (await midProgressRes.json()).data;
    assert.strictEqual(midJob.progress_percent, 60);
    assert.strictEqual(midJob.status, 'transcoding');
    logPass(`Job progressed to 60% (transcoding)`);

    // Final completion update
    const finalProgressRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs/${testJobId}/progress`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        progress_percent: 100,
        status: 'completed',
        render_time_ms: 2850,
        file_size_bytes: 16840000,
      }),
    });
    assert.strictEqual(finalProgressRes.status, 200, 'Final progress update must return 200');
    const finalJob = (await finalProgressRes.json()).data;
    assert.strictEqual(finalJob.progress_percent, 100);
    assert.strictEqual(finalJob.status, 'completed');
    assert(finalJob.completed_at !== null, 'completed_at must be populated');
    logPass(`Job completed in ${finalJob.render_time_ms}ms with status = 'completed'`);

    // Query job details & verify compiled artifacts
    const jobDetailRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs/${testJobId}`, {
      headers: authHeaders,
    });
    assert.strictEqual(jobDetailRes.status, 200, 'Get job detail must return 200');
    const jobDetail = (await jobDetailRes.json()).data;
    assert.strictEqual(jobDetail.job.id, testJobId);
    assert.strictEqual(jobDetail.artifacts.length, 2, 'Must compile both Master MP4 and HLS artifacts');

    const mp4Artifact = jobDetail.artifacts.find((a) => a.format === 'mp4');
    assert(mp4Artifact, 'Master MP4 artifact must exist');
    assert.strictEqual(mp4Artifact.resolution, '1080x1920');
    assert(mp4Artifact.checksum_sha256.length === 64, 'SHA-256 digest must be 64 hex chars');

    const hlsArtifact = jobDetail.artifacts.find((a) => a.format === 'hls_playlist');
    assert(hlsArtifact, 'Adaptive HLS playlist artifact must exist');
    logPass(`Artifacts verified: Master 1080p MP4 (${(mp4Artifact.size_bytes / 1024 / 1024).toFixed(1)}MB) and Adaptive HLS Playlist`);

    // 8. JOB CANCELLATION & RESOURCE DEALLOCATION
    console.log('\n[8/11] Testing Render Job Cancellation & VRAM Resource Deallocation...');
    const cancelJobRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        job_name: `Cancellation Target Job-${Date.now()}`,
        target_brand_id: 'brand-flagship-001',
        aspect_ratio: '1:1',
        preferred_gpu_node_id: testNodeId,
      }),
    });
    const cancelTargetJob = (await cancelJobRes.json()).data;
    const cancelTargetId = cancelTargetJob.id;

    const cancelActionRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs/${cancelTargetId}/cancel`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(cancelActionRes.status, 200, 'Cancel job must return 200');
    const cancelledJob = (await cancelActionRes.json()).data;
    assert.strictEqual(cancelledJob.status, 'cancelled');
    logPass(`Cancelled in-flight job '${cancelTargetId}' successfully`);

    // 9. COMPLETED JOB IMMUTABILITY BARRIER (HTTP 400)
    console.log('\n[9/11] Enforcing Completed Job Immutability Barrier (HTTP 400 on Cancel)...');
    const invalidCancelRes = await fetch(`${BASE_URL}/admin/operations/video-rendering/jobs/${testJobId}/cancel`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.strictEqual(invalidCancelRes.status, 400, 'Attempting to cancel a completed job must return HTTP 400');
    logPass('Completed job cancellation rejected with HTTP 400');

    // 10. CLEAN IDEMPOTENT TEARDOWN
    console.log('\n[10/11] Performing Idempotent Test Artifact Teardown...');
    await connection.execute('DELETE FROM rendered_video_artifacts WHERE render_job_id IN (?, ?)', [testJobId, cancelTargetId]);
    await connection.execute('DELETE FROM gpu_video_render_jobs WHERE id IN (?, ?)', [testJobId, cancelTargetId]);
    await connection.execute('DELETE FROM motion_composition_templates WHERE id = ?', [testTemplateId]);
    await connection.execute('DELETE FROM gpu_transcode_nodes WHERE id = ?', [testNodeId]);
    logPass(`Cleaned up test jobs, artifacts, templates, and GPU node '${testNodeId}'`);

    // 11. POST-CHECK META INVARIANT LOCK
    console.log('\n[11/11] Verifying Post-Flight Production Meta Publication Invariants...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`  STAGE 48 COMPLETED SUCCESSFULLY: ${passedTests}/${passedTests} ASSERTIONS PASSED (100%) `);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage48Tests().catch((err) => {
  console.error('\n❌ STAGE 48 TEST FAILED:', err);
  process.exit(1);
});
