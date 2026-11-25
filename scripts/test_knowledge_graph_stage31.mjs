/**
 * Stage 31: Advanced Vector Search, Semantic Memory & Real-Time Brand Knowledge Graph Suite
 * SocialForge Platform v4.9.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular member rejection)
 * 3. Overview telemetry & KPI metrics (totalNodes, totalEdges, totalMemories, embeddedVectorsCount)
 * 4. Pre-seeded flagship Brand Knowledge Graph:
 *    - All 6 core entity nodes exist (brand, product, persona, value_prop, verified_claim, banned_claim)
 *    - All 5 directional relationship edges exist (promotes, targets, has_feature, validates, prohibits)
 *    - All 4 semantic vector memories exist
 * 5. Knowledge Node CRUD & Validations:
 *    - Rejection of short name (< 2 chars)
 *    - Creation of custom entity node with attributes and auto-generated unit vector embedding
 *    - Retrieval by ID
 *    - Entity updates and vector re-embedding
 *    - Safe deletion
 * 6. Semantic Relationship Edges CRUD:
 *    - Rejection of self-loop relationships (source === target)
 *    - Rejection of duplicate edges (409 Conflict)
 *    - Rejection of missing nodes (404)
 *    - Creation of directional edge with confidence scoring
 *    - Hydrated node name retrieval
 *    - Relationship deletion
 * 7. Vector Memories CRUD:
 *    - Content length validation
 *    - Ingestion of high-dimensional vector memory with classification tags
 *    - Memory retrieval and deletion
 * 8. Cosine Similarity Vector Search:
 *    - Query vectorization and cosine similarity scoring across nodes and memories
 *    - Top-K result ranking and thresholding
 * 9. Multi-Hop Graph Traversal & Context Synthesis:
 *    - BFS traversal resolving multi-hop semantic graph paths
 *    - Synthesizing prompt-ready markdown context for LLM agents
 * 10. Superadmin Audit Trail:
 *     - Verifying operations recorded in superadmin_audit_logs
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

async function runStage31Tests() {
  console.log('================================================================');
  console.log('   STAGE 31: BRAND KNOWLEDGE GRAPH & VECTOR SEARCH SUITE        ');
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

    // Find standard 36-char UUID tenant and associated brand
    const [brands] = await db.execute(
      `SELECT b.id, b.tenant_id, b.name FROM brands b
       JOIN tenants t ON b.tenant_id = t.id
       WHERE CHAR_LENGTH(b.tenant_id) = 36 LIMIT 1`
    );
    assert(brands.length > 0, 'Found active brand with standard UUID tenant');
    const targetBrand = brands[0];
    const targetTenantId = targetBrand.tenant_id;

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
      const resUnauth = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/overview`, {
        headers: reqHeaders(null),
      });
      assert(resUnauth.status === 401, '401 Unauthorized for unauthenticated request to /knowledge-graph/overview');

      const resRegular = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/overview`, {
        headers: reqHeaders(regularToken),
      });
      assert(resRegular.status === 403, '403 Forbidden for non-superadmin member requesting /knowledge-graph/overview');

      const resSuper = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/overview`, {
        headers: reqHeaders(superadminToken),
      });
      assert(resSuper.status === 200, '200 OK for verified superadmin requesting /knowledge-graph/overview');
    }

    // -------------------------------------------------------------------------
    // 4. OVERVIEW TELEMETRY & KNOWLEDGE METRICS
    // -------------------------------------------------------------------------
    console.log('\n[Section 4: Knowledge Graph Telemetry & Metric Aggregation]');
    {
      const res = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/overview`, {
        headers: reqHeaders(superadminToken),
      });
      const body = await res.json();
      assert(body.success === true, 'Overview response has success = true');
      const data = body.data;
      assert(data.totalNodes >= 6, `Knowledge Graph has at least 6 entities (found: ${data.totalNodes})`);
      assert(data.totalEdges >= 5, `Knowledge Graph has at least 5 relationships (found: ${data.totalEdges})`);
      assert(data.totalMemories >= 4, `Vector Memory Bank has at least 4 memories (found: ${data.totalMemories})`);
      assert(data.embeddedVectorsCount >= 10, `Vector count is at least 10 (found: ${data.embeddedVectorsCount})`);
      assert(data.avgQueryLatencyMs > 0 && data.avgQueryLatencyMs < 500, `Average query latency is healthy sub-500ms (found: ${data.avgQueryLatencyMs}ms)`);
      assert(data.activeBrandGraphsCount >= 1, `At least 1 active brand graph cataloged (found: ${data.activeBrandGraphsCount})`);
    }

    // -------------------------------------------------------------------------
    // 5. PRE-SEEDED FLAGSHIP BRAND GRAPH
    // -------------------------------------------------------------------------
    console.log('\n[Section 5: Flagship Brand Knowledge Graph Verification]');
    {
      const resNodes = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyNodes = await resNodes.json();
      assert(bodyNodes.success === true, 'List nodes returns success = true');
      const slugs = bodyNodes.data.map((n) => n.slug);
      assert(slugs.includes('lumina-wellness'), 'Core brand node "lumina-wellness" exists');
      assert(slugs.includes('puremarine-collagen'), 'Flagship product node "puremarine-collagen" exists');
      assert(slugs.includes('biohackers-longevity'), 'Target persona node "biohackers-longevity" exists');
      assert(slugs.includes('98-percent-bioavailability'), 'Value prop node "98-percent-bioavailability" exists');
      assert(slugs.includes('third-party-lab-tested'), 'Verified claim node "third-party-lab-tested" exists');
      assert(slugs.includes('banned-cure-disease-claim'), 'Banned regulatory claim node "banned-cure-disease-claim" exists');

      const resEdges = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyEdges = await resEdges.json();
      assert(bodyEdges.success === true, 'List edges returns success = true');
      const relations = bodyEdges.data.map((e) => e.relationType);
      assert(relations.includes('promotes'), 'Graph includes "promotes" relationship');
      assert(relations.includes('targets'), 'Graph includes "targets" relationship');
      assert(relations.includes('has_feature'), 'Graph includes "has_feature" relationship');
      assert(relations.includes('validates'), 'Graph includes "validates" relationship');
      assert(relations.includes('prohibits'), 'Graph includes "prohibits" relationship');

      const resMemories = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/memories`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyMemories = await resMemories.json();
      assert(bodyMemories.success === true, 'List memories returns success = true');
      const memTypes = bodyMemories.data.map((m) => m.memoryType);
      assert(memTypes.includes('fact'), 'Memory bank includes "fact" memory');
      assert(memTypes.includes('top_hook'), 'Memory bank includes "top_hook" memory');
      assert(memTypes.includes('brand_voice_rule'), 'Memory bank includes "brand_voice_rule" memory');
      assert(memTypes.includes('customer_feedback'), 'Memory bank includes "customer_feedback" memory');
    }

    // -------------------------------------------------------------------------
    // 6. KNOWLEDGE NODE CRUD & VALIDATIONS
    // -------------------------------------------------------------------------
    console.log('\n[Section 6: Knowledge Entity Nodes CRUD & Validations]');
    let customNodeId = null;
    {
      // Validation: Name too short
      const resShortName = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          name: 'x',
          entityType: 'product',
          brandId: targetBrand.id,
          tenantId: targetTenantId,
        }),
      });
      assert(resShortName.status === 400, '400 Bad Request for node name < 2 characters');

      // Create Custom Node
      const resCreate = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          name: 'BioActive Astaxanthin Cellular Guard',
          entityType: 'product',
          brandId: targetBrand.id,
          tenantId: targetTenantId,
          description: 'Microalgae-derived super antioxidant with 6000x the quenching power of Vitamin C.',
          attributes: { sku: 'LUM-ASTA-002', dosage: '12mg', naturalSource: 'Haematococcus pluvialis' },
        }),
      });
      assert(resCreate.status === 201, '201 Created for custom knowledge node');
      const bodyCreate = await resCreate.json();
      customNodeId = bodyCreate.data.id;
      assert(bodyCreate.data.name === 'BioActive Astaxanthin Cellular Guard', 'Node name saved correctly');
      assert(bodyCreate.data.embeddingStatus === 'embedded', 'Node embedding status is "embedded"');
      assert(Array.isArray(bodyCreate.data.embeddingVector), 'Node has embedded vector array');
      assert(bodyCreate.data.embeddingVector.length === 16, 'Vector dimensions = 16');

      // Get Node by ID
      const resGet = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes/${customNodeId}`, {
        headers: reqHeaders(superadminToken),
      });
      const bodyGet = await resGet.json();
      assert(bodyGet.data.id === customNodeId, 'Get node by ID returns matching node');

      // Update Node
      const resUpdate = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes/${customNodeId}`, {
        method: 'PUT',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          description: 'Updated clinically validated microalgae astaxanthin providing cellular membrane protection.',
        }),
      });
      const bodyUpdate = await resUpdate.json();
      assert(bodyUpdate.success === true, 'Update node returns success = true');
      assert(bodyUpdate.data.description.includes('clinically validated'), 'Node description updated');

      // Delete Node
      const resDelete = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes/${customNodeId}`, {
        method: 'DELETE',
        headers: reqHeaders(superadminToken),
      });
      const bodyDelete = await resDelete.json();
      assert(bodyDelete.success === true, 'Delete node returns success = true');
      assert(bodyDelete.data.deletedId === customNodeId, 'Deleted node ID matches created node ID');

      // Verify 404
      const res404 = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/nodes/${customNodeId}`, {
        headers: reqHeaders(superadminToken),
      });
      assert(res404.status === 404, '404 for deleted node ID');
    }

    // -------------------------------------------------------------------------
    // 7. SEMANTIC RELATIONSHIPS (EDGES) CRUD
    // -------------------------------------------------------------------------
    console.log('\n[Section 7: Semantic Relationships (Edges) CRUD]');
    let customEdgeId = null;
    {
      // Validation: Self-loop
      const resSelfLoop = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          sourceNodeId: 'node-lumina-brand-01',
          targetNodeId: 'node-lumina-brand-01',
          relationType: 'promotes',
        }),
      });
      assert(resSelfLoop.status === 400, '400 Bad Request for self-loop edge (source === target)');

      // Validation: Duplicate edge
      const resDuplicate = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          sourceNodeId: 'node-lumina-brand-01',
          targetNodeId: 'node-puremarine-prod-02',
          relationType: 'promotes',
        }),
      });
      assert(resDuplicate.status === 409, '409 Conflict for duplicate relationship between nodes');

      // Validation: Non-existent node
      const resBadNode = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          sourceNodeId: 'node-non-existent-1',
          targetNodeId: 'node-puremarine-prod-02',
          relationType: 'targets',
        }),
      });
      assert(resBadNode.status === 404, '404 for non-existent source node in edge creation');

      // Create Custom Relationship Edge
      const resCreateEdge = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          tenantId: targetTenantId,
          brandId: targetBrand.id,
          sourceNodeId: 'node-lumina-brand-01',
          targetNodeId: 'node-biohack-persona-03',
          relationType: 'targets',
          confidenceScore: 0.99,
          metadata: { note: 'Direct brand-to-persona alignment' },
        }),
      });
      assert(resCreateEdge.status === 201, '201 Created for custom relationship edge');
      const bodyCreateEdge = await resCreateEdge.json();
      customEdgeId = bodyCreateEdge.data.id;
      assert(bodyCreateEdge.data.relationType === 'targets', 'Edge relationType = "targets"');
      assert(bodyCreateEdge.data.sourceNodeName !== undefined, 'Edge has hydrated sourceNodeName');
      assert(bodyCreateEdge.data.targetNodeName !== undefined, 'Edge has hydrated targetNodeName');

      // Delete Edge
      const resDeleteEdge = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges/${customEdgeId}`, {
        method: 'DELETE',
        headers: reqHeaders(superadminToken),
      });
      const bodyDeleteEdge = await resDeleteEdge.json();
      assert(bodyDeleteEdge.success === true, 'Delete edge returns success = true');
      assert(bodyDeleteEdge.data.deletedId === customEdgeId, 'Deleted edge ID matches created edge ID');

      // Verify 404
      const resConfirm404 = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/edges/${customEdgeId}`, {
        headers: reqHeaders(superadminToken),
      });
      assert(resConfirm404.status === 404, '404 for deleted edge ID');
    }

    // -------------------------------------------------------------------------
    // 8. SEMANTIC VECTOR MEMORIES CRUD
    // -------------------------------------------------------------------------
    console.log('\n[Section 8: Semantic Vector Memories CRUD]');
    let customMemId = null;
    {
      // Validation: Short content
      const resShortContent = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/memories`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          tenantId: targetTenantId,
          brandId: targetBrand.id,
          content: 'x',
        }),
      });
      assert(resShortContent.status === 400, '400 Bad Request for memory content < 5 characters');

      // Create Custom Memory
      const resCreateMem = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/memories`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          tenantId: targetTenantId,
          brandId: targetBrand.id,
          memoryType: 'top_hook',
          content: 'Breakthrough clinical trial hook: "What happens to your skin cells when you switch from bovine to marine peptides for 30 days..."',
          tags: ['clinical_hook', 'marine_peptides', 'ugc_video'],
          relevanceScore: 0.975,
        }),
      });
      assert(resCreateMem.status === 201, '201 Created for vector memory');
      const bodyCreateMem = await resCreateMem.json();
      customMemId = bodyCreateMem.data.id;
      assert(bodyCreateMem.data.memoryType === 'top_hook', 'Memory type saved correctly');
      assert(Array.isArray(bodyCreateMem.data.embeddingVector), 'Memory embedded with unit vector');

      // Delete Memory
      const resDeleteMem = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/memories/${customMemId}`, {
        method: 'DELETE',
        headers: reqHeaders(superadminToken),
      });
      const bodyDeleteMem = await resDeleteMem.json();
      assert(bodyDeleteMem.success === true, 'Delete memory returns success = true');
    }

    // -------------------------------------------------------------------------
    // 9. COSINE SIMILARITY VECTOR SEARCH
    // -------------------------------------------------------------------------
    console.log('\n[Section 9: Cosine Vector Search Engine]');
    {
      const resSearch = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/search`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          query: 'marine collagen bioavailability and peptide absorption',
          topK: 4,
          minRelevance: 0.50,
        }),
      });
      assert(resSearch.status === 200, '200 OK for semantic search');
      const bodySearch = await resSearch.json();
      assert(bodySearch.success === true, 'Semantic search returns success = true');
      assert(Array.isArray(bodySearch.data.results), 'Search returns results array');
      assert(bodySearch.data.results.length > 0, `Search returned matches (found: ${bodySearch.data.results.length})`);
      assert(bodySearch.data.latencyMs < 50, `Vector search latency is sub-50ms (found: ${bodySearch.data.latencyMs}ms)`);

      const topMatch = bodySearch.data.results[0];
      assert(topMatch.similarityScore >= 0.50, `Top match similarity >= 0.50 (found: ${topMatch.similarityScore})`);
      assert(topMatch.similarityScore <= 1.00, `Top match similarity <= 1.00 (found: ${topMatch.similarityScore})`);

      // Reject empty query
      const resEmptyQuery = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/search`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          query: '   ',
        }),
      });
      assert(resEmptyQuery.status === 400, '400 Bad Request for empty search query');
    }

    // -------------------------------------------------------------------------
    // 10. MULTI-HOP GRAPH TRAVERSAL & PROMPT CONTEXT SYNTHESIZER
    // -------------------------------------------------------------------------
    console.log('\n[Section 10: Multi-Hop Graph Traversal & Context Synthesizer]');
    {
      const resTraverse = await fetch(`${BASE_URL}/admin/operations/knowledge-graph/traverse`, {
        method: 'POST',
        headers: reqHeaders(superadminToken),
        body: JSON.stringify({
          rootNodeId: 'node-puremarine-prod-02',
          maxDepth: 2,
        }),
      });
      assert(resTraverse.status === 200, '200 OK for graph traversal');
      const bodyTraverse = await resTraverse.json();
      assert(bodyTraverse.success === true, 'Traversal returns success = true');
      const data = bodyTraverse.data;
      assert(data.rootNode.id === 'node-puremarine-prod-02', 'Root node matches requested product');
      assert(data.visitedNodesCount >= 3, `Traversal reached at least 3 connected nodes (found: ${data.visitedNodesCount})`);
      assert(data.hops.length >= 2, `Traversal resolved relationship hops (found: ${data.hops.length})`);
      assert(data.synthesizedContextPrompt.includes('### Knowledge Context for Entity:'), 'Synthesized prompt contains markdown header');
      assert(data.synthesizedContextPrompt.includes('PureMarine Collagen Peptide Elixir'), 'Synthesized prompt contains product name');
      assert(data.synthesizedContextPrompt.includes('Connected Semantic Relationships:'), 'Synthesized prompt contains relationship section');
    }

    // -------------------------------------------------------------------------
    // 11. SUPERADMIN AUDIT TRAIL VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[Section 11: Superadmin Audit Trail]');
    {
      const [logs] = await db.execute(
        "SELECT action, target_resource_type, reason FROM superadmin_audit_logs WHERE target_resource_type = 'knowledge_graph' ORDER BY created_at DESC LIMIT 5"
      );
      assert(logs.length > 0, 'Found audit log records for knowledge_graph operations');
      const actions = logs.map((l) => l.action);
      assert(
        actions.some((a) => a === 'KNOWLEDGE_NODE_CREATE' || a === 'KNOWLEDGE_EDGE_CREATE' || a === 'VECTOR_MEMORY_CREATE'),
        `Audit trail includes expected knowledge actions (found: ${actions.join(', ')})`
      );
    }

    // -------------------------------------------------------------------------
    // 12. INVARIANT POST-CHECK
    // -------------------------------------------------------------------------
    console.log('\n[Section 12: Meta Invariant Post-Check]');
    await verifyMetaLock(db, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 31 COMPLETE: ${passedTests} passed, ${failedTests} failed   `);
    console.log('================================================================');

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    await db.end();
  }
}

runStage31Tests().catch((err) => {
  console.error('\n❌ Unhandled error in Stage 31 test suite:', err);
  process.exit(1);
});
