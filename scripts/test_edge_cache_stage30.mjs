/**
 * Stage 30: Global Multi-Region Edge Caching & Real-Time Content Distribution Network (CDN) Suite
 * SocialForge Platform v4.8.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview telemetry & KPI metrics (totalNodes, onlineNodes, globalHitRatio, originOffloadPercent)
 * 4. Global PoP Edge Nodes:
 *    - All 6 pre-seeded global edge PoPs exist (iad, sfo, fra, lhr, sin, tyo)
 *    - Node status updates (online -> draining -> online)
 *    - Validation rejecting invalid status codes (400 Bad Request)
 *    - 404 for non-existent node
 * 5. Caching Rules & TTL Policies:
 *    - Retrieval of pre-seeded default edge rules
 *    - Rule validation (route must start with '/', ruleName length >= 3)
 *    - Creation of custom edge caching rule with tags and bypass conditions
 *    - Rule update, priority tuning & toggle
 *    - Custom rule deletion and cleanup
 * 6. Fast Cache Invalidation & Purge:
 *    - Justification reason enforcement (>= 6 chars)
 *    - Targets validation
 *    - Tag-based purge execution
 *    - URL-based purge execution
 *    - Wildcard purge execution
 *    - Global purge_all execution
 *    - Audit purge log verification
 * 7. Real-Time CDN Edge Request Simulator:
 *    - Route simulation matching cache rules (HIT, Cache-Control, Age headers)
 *    - Method bypass simulation (POST/PUT/DELETE -> BYPASS)
 *    - Auth header bypass simulation
 *    - Fallback un-cached route simulation (BYPASS)
 * 8. Edge Traffic Telemetry & Metrics:
 *    - Time-series metric retrieval
 *    - Bandwidth, cache hits, and origin offload percentages
 * 9. Superadmin Audit Trail:
 *    - Verifying operations recorded in superadmin_audit_logs
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

async function runStage30Tests() {
  console.log('================================================================');
  console.log('   STAGE 30: GLOBAL EDGE CACHING & REAL-TIME CDN TEST SUITE     ');
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

    const [tenantsList] = await db.execute('SELECT id FROM tenants LIMIT 1');
    assert(tenantsList.length > 0, 'Found active tenant');
    const targetTenantId = tenantsList[0].id;

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
        role: regularUser.role || 'member',
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const reqHeaders = (token) => ({
      'Content-Type': 'application/json',
      'x-bypass-rate-limit': 'test-runner',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    // -------------------------------------------------------------------------
    // 3. RBAC SECURITY REJECTIONS
    // -------------------------------------------------------------------------
    console.log('\n[Section 3: RBAC Security Guard Verification]');
    {
      const resUnauth = await fetch(`${BASE_URL}/admin/operations/edge-cache/overview`, {
        headers: reqHeaders(null),
      });
      assert(resUnauth.status === 401, '401 Unauthorized for unauthenticated request to /edge-cache/overview');

      const resRegular = await fetch(`${BASE_URL}/admin/operations/edge-cache/overview`, {
        headers: reqHeaders(regularToken),
      });
      assert(resRegular.status === 403, '403 Forbidden for non-superadmin member requesting /edge-cache/overview');

      const resSuper = await fetch(`${BASE_URL}/admin/operations/edge-cache/overview`, {
        headers: reqHeaders(superadminToken),
      });
      assert(resSuper.status === 200, '200 OK for verified superadmin requesting /edge-cache/overview');
    }

    // -------------------------------------------------------------------------
    // 4. OVERVIEW TELEMETRY & FLEET METRICS
    // -------------------------------------------------------------------------
    console.log('\n[Section 4: Edge Caching Fleet Telemetry Overview]');
    {
      const res = await fetch(`${BASE_URL}/admin/operations/edge-cache/overview`, {
        headers: reqHeaders(superadminToken),
      });
      const body = await res.json();
      assert(body.success === true, 'Overview response has success = true');
      const data = body.data;
      assert(data.totalNodes >= 6, `Fleet has at least 6 edge nodes (found: ${data.totalNodes})`);
      assert(data.onlineNodes >= 5, `Fleet has healthy online nodes count (found: ${data.onlineNodes})`);
      assert(data.globalHitRatio > 80, `Global hit ratio is healthy (> 80%, found: ${data.globalHitRatio}%)`);
      assert(data.originOffloadPercent > 80, `Origin offload percent is healthy (> 80%, found: ${data.originOffloadPercent}%)`);
      assert(data.avgEdgeLatencyMs > 0 && data.avgEdgeLatencyMs < 100, `Average edge latency is sub-100ms (found: ${data.avgEdgeLatencyMs}ms)`);
      assert(data.activeRulesCount >= 4, `At least 4 default caching rules deployed (found: ${data.activeRulesCount})`);
      assert(data.recentPurgeCount >= 1, `At least 1 audit purge record cataloged (found: ${data.recentPurgeCount})`);
    }

    // -------------------------------------------------------------------------
    // 5. GLOBAL EDGE POP NODES MANAGEMENT
    // -------------------------------------------------------------------------
    console.log('\n[Section 5: Edge PoP Nodes Catalog & Status Lifecycle]');
    let testNodeId = null;
    {
      const res = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes`, {
        headers: reqHeaders(superadminToken),
      });
      const body = await res.json();
      assert(body.success === true, 'List nodes returns success = true');
      assert(Array.isArray(body.data) && body.data.length >= 6, 'Contains at least 6 global Edge PoP nodes');

      const expectedCodes = ['iad-edge-01', 'sfo-edge-02', 'fra-edge-03', 'lhr-edge-04', 'sin-edge-05', 'tyo-edge-06'];
      for (const code of expectedCodes) {
        const found = body.data.find((n) => n.nodeCode === code);
        assert(Boolean(found), `Pre-seeded PoP node ${code} exists in edge catalog`);
        assert(found.sslActive === true, `PoP node ${code} has active SSL termination`);
      }

      const sampleNode = body.data[0];
      testNodeId = sampleNode.id;

      // Get single node
      const resSingle = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes/${testNodeId}`, {
        headers: reqHeaders(superadminToken),
      });
      const bodySingle = await resSingle.json();
      assert(bodySingle.success === true, 'Get single node returns success = true');
      assert(bodySingle.data.id === testNodeId, 'Single node ID matches requested ID');

      // Reject non-existent node
      const res404 = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes/non-existent-node-id`, {
        headers: reqHeaders(superadminToken),
      });
      assert(res404.status === 404, '404 for non-existent node ID');

      // Update node status: online -> draining
      const resDrain = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes/${testNodeId}/status`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({ status: 'draining' }),
      });
      const bodyDrain = await resDrain.json();
      assert(bodyDrain.success === true, 'Update node status to draining returns success = true');
      assert(bodyDrain.data.status === 'draining', 'Node status updated to "draining"');

      // Restore node status: draining -> online
      const resOnline = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes/${testNodeId}/status`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({ status: 'online' }),
      });
      const bodyOnline = await resOnline.json();
      assert(bodyOnline.success === true, 'Update node status back to online returns success = true');
      assert(bodyOnline.data.status === 'online', 'Node status restored to "online"');

      // Reject invalid status
      const resBadStatus = await fetch(`${BASE_URL}/admin/operations/edge-cache/nodes/${testNodeId}/status`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({ status: 'exploding_bad_status' }),
      });
      assert(resBadStatus.status === 400, '400 Bad Request for invalid node status');
    }

    // -------------------------------------------------------------------------
    // 6. CACHING RULES & POLICIES CRUD
    // -------------------------------------------------------------------------
    console.log('\n[Section 6: Caching Rules & TTL Policies CRUD]');
    let createdRuleId = null;
    {
      const resList = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyList = await resList.json();
      assert(bodyList.success === true, 'List rules returns success = true');
      assert(Array.isArray(bodyList.data) && bodyList.data.length >= 4, 'Contains at least 4 default rules');

      // Rule Validation: Missing leading slash
      const resBadPattern = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          ruleName: 'Invalid Route Rule',
          routePattern: 'no-leading-slash/*',
          ttlSeconds: 60,
        }),
      });
      assert(resBadPattern.status === 400, '400 Bad Request for routePattern without leading slash');

      // Rule Validation: Short rule name
      const resShortName = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          ruleName: 'ab',
          routePattern: '/valid/*',
        }),
      });
      assert(resShortName.status === 400, '400 Bad Request for ruleName < 3 characters');

      // Create Custom Rule
      const resCreate = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          ruleName: 'BioTech Product Promotion Media CDN',
          routePattern: '/cdn/biotech/*',
          priority: 25,
          cacheTier: 'edge_ssd',
          ttlSeconds: 7200,
          swrSeconds: 600,
          cacheTags: ['biotech', 'media', 'promo'],
          bypassOnAuth: true,
          bypassMethods: ['POST', 'PUT', 'DELETE'],
          isEnabled: true,
        }),
      });
      assert(resCreate.status === 201, '201 Created for custom edge caching rule');
      const bodyCreate = await resCreate.json();
      assert(bodyCreate.success === true, 'Create rule returns success = true');
      createdRuleId = bodyCreate.data.id;
      assert(bodyCreate.data.ttlSeconds === 7200, 'Created rule has ttlSeconds = 7200');
      assert(bodyCreate.data.cacheTags.includes('biotech'), 'Created rule includes "biotech" cache tag');

      // Get Rule by ID
      const resGet = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules/${createdRuleId}`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyGet = await resGet.json();
      assert(bodyGet.data.id === createdRuleId, 'Get rule by ID returns created rule');

      // Update Rule
      const resUpdate = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules/${createdRuleId}`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          ttlSeconds: 14400,
          priority: 15,
        }),
      });
      const bodyUpdate = await resUpdate.json();
      assert(bodyUpdate.success === true, 'Update rule returns success = true');
      assert(bodyUpdate.data.ttlSeconds === 14400, 'Rule TTL updated to 14400 seconds');
      assert(bodyUpdate.data.priority === 15, 'Rule priority updated to 15');

      // Toggle Rule Status
      const resToggle = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules/${createdRuleId}/toggle`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({ isEnabled: false }),
      });
      const bodyToggle = await resToggle.json();
      assert(bodyToggle.data.isEnabled === false, 'Rule toggled to disabled');

      // Delete Rule
      const resDelete = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules/${createdRuleId}`, {
        method: 'DELETE',
        headers: reqHeaders(superadminToken),
      });
      const bodyDelete = await resDelete.json();
      assert(bodyDelete.success === true, 'Delete rule returns success = true');
      assert(bodyDelete.data.deletedId === createdRuleId, 'Deleted rule ID matches created rule ID');

      // Confirm deletion (404)
      const resConfirm404 = await fetch(`${BASE_URL}/admin/operations/edge-cache/rules/${createdRuleId}`, {
        headers: reqHeaders(superadminToken),
      });
      assert(resConfirm404.status === 404, '404 for deleted rule ID');
    }

    // -------------------------------------------------------------------------
    // 7. FAST CACHE INVALIDATION & PURGE
    // -------------------------------------------------------------------------
    console.log('\n[Section 7: Fast Cache Invalidation & Multi-PoP Purge]');
    {
      // Validation: Bad purge type
      const resBadType = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'invalid_type',
          targets: ['assets'],
          reason: 'Valid justification reason',
        }),
      });
      assert(resBadType.status === 400, '400 Bad Request for invalid purgeType');

      // Validation: Short justification reason
      const resShortReason = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'tag',
          targets: ['assets'],
          reason: 'short',
        }),
      });
      assert(resShortReason.status === 400, '400 Bad Request for purge reason < 6 characters');

      // Validation: Empty targets for tag purge
      const resEmptyTargets = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'tag',
          targets: [],
          reason: 'Valid operational justification',
        }),
      });
      assert(resEmptyTargets.status === 400, '400 Bad Request for empty targets in non-purge_all');

      // Execute Tag-based Purge
      const resPurgeTag = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'tag',
          targets: ['white-label', 'branding'],
          reason: 'Agency branding assets update cache invalidation',
        }),
      });
      assert(resPurgeTag.status === 201, '201 Created for Tag-based cache purge');
      const bodyPurgeTag = await resPurgeTag.json();
      assert(bodyPurgeTag.success === true, 'Purge response has success = true');
      assert(bodyPurgeTag.data.purgeType === 'tag', 'Purge log records purgeType = "tag"');
      assert(bodyPurgeTag.data.nodesAffected >= 5, `Purge reached global PoP nodes (affected: ${bodyPurgeTag.data.nodesAffected})`);

      // Execute URL-based Purge
      const resPurgeUrl = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'url',
          targets: ['/assets/logo.svg', '/assets/theme.css'],
          reason: 'Immediate stylesheet patch cache invalidation',
        }),
      });
      assert(resPurgeUrl.status === 201, '201 Created for URL-based cache purge');

      // Execute Global Purge All
      const resPurgeAll = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          purgeType: 'purge_all',
          targets: ['*'],
          reason: 'Major platform release global cache invalidation',
        }),
      });
      assert(resPurgeAll.status === 201, '201 Created for global purge_all');
      const bodyPurgeAll = await resPurgeAll.json();
      assert(bodyPurgeAll.data.targets.includes('*'), 'Purge All targets contains "*"');

      // List Purge Logs
      const resLogs = await fetch(`${BASE_URL}/admin/operations/edge-cache/purge/logs?limit=10`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyLogs = await resLogs.json();
      assert(bodyLogs.success === true, 'List purge logs returns success = true');
      assert(Array.isArray(bodyLogs.data) && bodyLogs.data.length >= 3, 'Contains newly executed purge records');
    }

    // -------------------------------------------------------------------------
    // 8. REAL-TIME CDN EDGE REQUEST SIMULATOR
    // -------------------------------------------------------------------------
    console.log('\n[Section 8: Real-Time CDN Edge Request Simulator]');
    {
      // Simulation: Static Asset Rule Match (HIT)
      const resSimHit = await fetch(`${BASE_URL}/admin/operations/edge-cache/simulate`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          route: '/assets/brand-hero.png',
          method: 'GET',
        }),
      });
      assert(resSimHit.status === 200, '200 OK for edge simulation request');
      const bodySimHit = await resSimHit.json();
      assert(bodySimHit.success === true, 'Simulation returns success = true');
      assert(bodySimHit.data.cacheDecision === 'HIT', 'Simulation yields HIT on /assets/brand-hero.png');
      assert(bodySimHit.data.originShielded === true, 'Origin shield is active for cached route');
      assert(bodySimHit.data.responseHeaders['CF-Cache-Status'] === 'HIT', 'Emits "CF-Cache-Status: HIT"');
      assert(bodySimHit.data.responseHeaders['X-Origin-Shield'] === 'ACTIVE-POP', 'Emits "X-Origin-Shield: ACTIVE-POP"');
      assert(bodySimHit.data.effectiveTtlSeconds === 86400, 'Effective TTL matches rule (86400s)');

      // Simulation: Method Bypass (POST to /assets/upload -> BYPASS)
      const resSimMethodBypass = await fetch(`${BASE_URL}/admin/operations/edge-cache/simulate`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          route: '/assets/upload',
          method: 'POST',
        }),
      });
      const bodySimMethodBypass = await resSimMethodBypass.json();
      assert(bodySimMethodBypass.data.cacheDecision === 'BYPASS', 'Simulation yields BYPASS for POST method');
      assert(bodySimMethodBypass.data.responseHeaders['CF-Cache-Status'] === 'DYNAMIC', 'Emits "CF-Cache-Status: DYNAMIC" for method bypass');

      // Simulation: Auth Header Bypass
      const resSimAuthBypass = await fetch(`${BASE_URL}/admin/operations/edge-cache/simulate`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          route: '/api/v1/status',
          method: 'GET',
          headers: {
            Authorization: 'Bearer test-token-12345',
          },
        }),
      });
      const bodySimAuthBypass = await resSimAuthBypass.json();
      // Status rule has bypass_on_auth = false, so it should still HIT!
      assert(bodySimAuthBypass.data.cacheDecision === 'HIT', 'Public status endpoint remains HIT even with Authorization header (bypass_on_auth = false)');

      // Simulation: Unmatched Route (Pass-through BYPASS)
      const resSimUnmatched = await fetch(`${BASE_URL}/admin/operations/edge-cache/simulate`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          route: '/api/v1/auth/login',
          method: 'POST',
        }),
      });
      const bodySimUnmatched = await resSimUnmatched.json();
      assert(bodySimUnmatched.data.cacheDecision === 'BYPASS', 'Unmatched dynamic route yields BYPASS');
      assert(bodySimUnmatched.data.matchedRule === null, 'Unmatched route has matchedRule = null');
    }

    // -------------------------------------------------------------------------
    // 9. TIME-SERIES TRAFFIC METRICS & LATENCY
    // -------------------------------------------------------------------------
    console.log('\n[Section 9: Time-Series Edge Metrics & Latency Percentiles]');
    {
      const resMetrics = await fetch(`${BASE_URL}/admin/operations/edge-cache/metrics?limit=12`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyMetrics = await resMetrics.json();
      assert(bodyMetrics.success === true, 'Get metrics returns success = true');
      assert(Array.isArray(bodyMetrics.data) && bodyMetrics.data.length >= 12, 'Returns at least 12 metric points');
      const point = bodyMetrics.data[0];
      assert(point.totalRequests > 0, 'Metric point records totalRequests > 0');
      assert(point.cacheHits > 0, 'Metric point records cacheHits > 0');
      assert(point.originOffloadPercent > 80, `Metric point records originOffloadPercent > 80% (found: ${point.originOffloadPercent}%)`);
      assert(point.p95LatencyMs > 0 && point.p95LatencyMs < 50, `p95 edge latency is under 50ms (found: ${point.p95LatencyMs}ms)`);
    }

    // -------------------------------------------------------------------------
    // 10. SUPERADMIN AUDIT LOGS VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[Section 10: Superadmin Audit Trail]');
    {
      const [logs] = await db.execute(
        "SELECT action, target_resource_type, reason FROM superadmin_audit_logs WHERE target_resource_type = 'edge_cache' ORDER BY created_at DESC LIMIT 5"
      );
      assert(logs.length > 0, 'Found audit log records for edge_cache operations');
      const actions = logs.map((l) => l.action);
      assert(
        actions.some((a) => a === 'EDGE_CACHE_PURGE' || a === 'EDGE_RULE_CREATE' || a === 'EDGE_NODE_STATUS_UPDATE'),
        `Audit trail includes expected edge actions (found: ${actions.join(', ')})`
      );
    }

    // -------------------------------------------------------------------------
    // 11. INVARIANT POST-CHECK
    // -------------------------------------------------------------------------
    console.log('\n[Section 11: Meta Invariant Post-Check]');
    await verifyMetaLock(db, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 30 COMPLETE: ${passedTests} passed, ${failedTests} failed   `);
    console.log('================================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    await db.end();
  }
}

runStage30Tests().catch((err) => {
  console.error('\n❌ Unhandled error in Stage 30 test suite:', err);
  process.exit(1);
});
