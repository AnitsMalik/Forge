/**
 * Stage 46: Enterprise Distributed Semantic Search, Neural Vector Embedding Ingestion & Hybrid RAG Knowledge Mesh Test Suite
 * SocialForge Platform v6.4.0
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Neural RAG Telemetry & Model Distribution
 * 4. Neural Embedding Models Registry & Provisioning
 * 5. Knowledge Collections Registry & Index Binding
 * 6. Vector Embedding Ingestion & Automated Token Calculation
 * 7. SHA-256 Content Deduplication Invariant
 * 8. Hybrid Dense-Sparse Reciprocal Rank Fusion (RRF) Search Execution
 * 9. Sub-50ms Low-Latency Query Guarantee
 * 10. Hybrid Search Query Forensics & Operator Audit Logging
 * 11. Test Idempotency & Clean Teardown
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

async function runStage46Tests() {
  console.log('========================================================================');
  console.log('  STAGE 46: NEURAL VECTOR EMBEDDING & HYBRID RAG KNOWLEDGE MESH SUITE   ');
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
    const unauthRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/telemetry`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    logPass('Unauthenticated request rejected with HTTP 401');

    // 403 non-superadmin
    if (normalUserToken) {
      const forbiddenRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/telemetry`, {
        headers: { Authorization: `Bearer ${normalUserToken}` },
      });
      assert.strictEqual(forbiddenRes.status, 403, 'Non-superadmin request must return 403');
      logPass('Non-superadmin tenant request rejected with HTTP 403');
    }

    const authHeaders = {
      Authorization: `Bearer ${superadminToken}`,
      'Content-Type': 'application/json',
    };

    // 3. TELEMETRY & MODEL DISTRIBUTION
    console.log('\n[3/11] Querying Neural RAG Telemetry & Model Fleet Distribution...');
    const telemetryRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/telemetry`, {
      headers: authHeaders,
    });
    assert.strictEqual(telemetryRes.status, 200, 'Telemetry endpoint must return 200');
    const telemetryBody = await telemetryRes.json();
    assert(telemetryBody.success, 'Telemetry response must indicate success');
    const telemetry = telemetryBody.data;
    assert(telemetry.total_collections >= 3, `Expected at least 3 collections, got ${telemetry.total_collections}`);
    assert(telemetry.total_vectors_indexed > 0, `Expected indexed vectors > 0, got ${telemetry.total_vectors_indexed}`);
    assert(telemetry.total_embedding_models >= 3, `Expected at least 3 models, got ${telemetry.total_embedding_models}`);
    assert(telemetry.avg_query_latency_ms > 0, 'Average query latency must be > 0');
    assert(telemetry.hybrid_rrf_recall_accuracy >= 90, 'RRF recall accuracy must be >= 90%');
    assert(telemetry.model_distribution.openai >= 1, 'OpenAI model must be present');
    assert(telemetry.model_distribution.cohere >= 1, 'Cohere model must be present');
    logPass(`Telemetry verified: ${telemetry.total_collections} collections, ${telemetry.total_vectors_indexed.toLocaleString()} vectors, latency ${telemetry.avg_query_latency_ms}ms`);

    // 4. EMBEDDING MODELS REGISTRY & CREATION
    console.log('\n[4/11] Testing Neural Embedding Models Registry & Creation...');
    const modelsListRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/models`, {
      headers: authHeaders,
    });
    assert.strictEqual(modelsListRes.status, 200, 'Models list must return 200');
    const modelsList = (await modelsListRes.json()).data;
    assert(modelsList.length >= 3, 'Must list at least 3 pre-seeded models');
    logPass(`Retrieved ${modelsList.length} neural embedding models`);

    const testModelRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/models`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        model_name: `Test Bedrock Titan-${Date.now()}`,
        provider_type: 'aws_bedrock',
        model_family: 'titan-embed-text-v2',
        dimension_size: 1024,
        max_input_tokens: 8192,
        cost_per_million_tokens: 0.08,
      }),
    });
    assert.strictEqual(testModelRes.status, 201, 'Create model must return 201');
    const createdModel = (await testModelRes.json()).data;
    assert.strictEqual(createdModel.provider_type, 'aws_bedrock');
    assert.strictEqual(createdModel.dimension_size, 1024);
    logPass(`Registered new embedding model: '${createdModel.model_name}' (ID: ${createdModel.id})`);

    // 5. KNOWLEDGE COLLECTIONS REGISTRY & CREATION
    console.log('\n[5/11] Testing Knowledge Collections Registry & Provisioning...');
    const colsListRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/collections`, {
      headers: authHeaders,
    });
    assert.strictEqual(colsListRes.status, 200, 'Collections list must return 200');
    const colsList = (await colsListRes.json()).data;
    assert(colsList.length >= 3, 'Must list at least 3 collections');
    logPass(`Retrieved ${colsList.length} knowledge collections`);

    const testColName = `sf-test-rag-kb-${Date.now()}`;
    const createColRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/collections`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collection_name: testColName,
        target_tenant_id: 'test_tenant_stage46',
        model_id: createdModel.id,
        distance_metric: 'cosine',
        index_type: 'hnsw',
        is_immutable: false,
      }),
    });
    assert.strictEqual(createColRes.status, 201, 'Create collection must return 201');
    const createdCol = (await createColRes.json()).data;
    assert.strictEqual(createdCol.collection_name, testColName);
    assert.strictEqual(createdCol.distance_metric, 'cosine');
    logPass(`Created knowledge collection: '${createdCol.collection_name}' (ID: ${createdCol.id})`);

    // 6. VECTOR EMBEDDING INGESTION
    console.log('\n[6/11] Testing Vector Embedding Ingestion & Token Calculation...');
    const sampleText = 'Campaign Optimization Policy: Always allocate at least 25% of dynamic ad spend to top-performing reel formats with strong first 3-second engagement.';
    const ingestRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/embeddings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collection_id: createdCol.id,
        document_id: 'doc-campaign-strategy-01',
        chunk_index: 0,
        content_text: sampleText,
        metadata: { category: 'ad_spend', priority: 'high' },
      }),
    });
    assert.strictEqual(ingestRes.status, 201, 'Ingest embedding must return 201');
    const ingestBody = await ingestRes.json();
    assert.strictEqual(ingestBody.isDuplicate, false, 'First ingestion must not be duplicate');
    const createdEmbedding = ingestBody.data;
    assert.strictEqual(createdEmbedding.collection_id, createdCol.id);
    assert(createdEmbedding.token_count > 0, 'Token count must be computed');
    assert(createdEmbedding.sha256_hash.length === 64, 'SHA-256 hash must be generated');
    logPass(`Ingested vector embedding: ID=${createdEmbedding.id}, tokens=${createdEmbedding.token_count}, sha256=${createdEmbedding.sha256_hash.substring(0, 12)}...`);

    // Ingest another distinct chunk for hybrid search testing
    await fetch(`${BASE_URL}/admin/operations/neural-rag/embeddings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collection_id: createdCol.id,
        document_id: 'doc-campaign-strategy-02',
        chunk_index: 1,
        content_text: 'Brand Voice Guidelines: Use approachable terminology and bold affirmations, avoiding speculative financial predictions.',
        metadata: { category: 'brand_voice' },
      }),
    });

    // 7. SHA-256 CONTENT DEDUPLICATION INVARIANT
    console.log('\n[7/11] Validating SHA-256 Content Deduplication Invariant...');
    const duplicateIngestRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/embeddings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collection_id: createdCol.id,
        document_id: 'doc-campaign-strategy-01-reupload',
        chunk_index: 0,
        content_text: sampleText, // IDENTICAL TEXT
      }),
    });
    assert.strictEqual(duplicateIngestRes.status, 201, 'Duplicate endpoint returns 201');
    const duplicateBody = await duplicateIngestRes.json();
    assert.strictEqual(duplicateBody.isDuplicate, true, 'Duplicate SHA-256 must be detected and flagged');
    assert.strictEqual(duplicateBody.data.id, createdEmbedding.id, 'Duplicate must return existing embedding ID');
    logPass('Deduplication Invariant Confirmed: Duplicate content detected and redundant vector creation bypassed');

    // 8. HYBRID DENSE + SPARSE RRF SEARCH
    console.log('\n[8/11] Testing Hybrid Dense + Sparse Vector Search with Reciprocal Rank Fusion (RRF)...');
    const searchQuery = 'How much ad spend should be allocated to reel format optimization?';
    const searchRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/hybrid-search`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        collection_id: createdCol.id,
        query_text: searchQuery,
        top_k: 5,
        dense_weight: 0.7,
        sparse_weight: 0.3,
        rrf_k: 60,
      }),
    });
    assert.strictEqual(searchRes.status, 200, 'Hybrid search must return 200');
    const searchResult = (await searchRes.json()).data;
    assert.strictEqual(searchResult.collection_id, createdCol.id);
    assert(searchResult.results_count >= 1, 'Should find at least 1 relevant vector');
    assert(searchResult.items.length >= 1, 'Items array must have matches');

    const topItem = searchResult.items[0];
    assert.strictEqual(topItem.id, createdEmbedding.id, 'Top item should be the ad spend policy chunk');
    assert(topItem.dense_score > 0, 'Dense score must be positive');
    assert(topItem.sparse_score > 0, 'Sparse BM25 score must be positive');
    assert(topItem.rrf_combined_score > 0, 'RRF combined score must be positive');
    logPass(`Hybrid search completed: top match '${topItem.document_id}' (Dense: ${topItem.dense_score}, Sparse: ${topItem.sparse_score}, RRF: ${topItem.rrf_combined_score})`);

    // 9. SUB-50MS QUERY GUARANTEE
    console.log('\n[9/11] Validating Sub-50ms Low-Latency Retrieval Guarantee...');
    assert(searchResult.latency_ms < 50, `Query latency must be < 50ms, was ${searchResult.latency_ms}ms`);
    logPass(`Sub-50ms Low-Latency SLA met: ${searchResult.latency_ms} ms`);

    // 10. HYBRID QUERY FORENSICS & AUDIT LOGGING
    console.log('\n[10/11] Verifying Hybrid Search Query Forensics & Operator Audit Logging...');
    const queryLogsRes = await fetch(`${BASE_URL}/admin/operations/neural-rag/query-logs?collection_id=${createdCol.id}`, {
      headers: authHeaders,
    });
    assert.strictEqual(queryLogsRes.status, 200, 'Query logs must return 200');
    const queryLogs = (await queryLogsRes.json()).data;
    assert(queryLogs.length >= 1, 'Must find at least 1 logged query');
    const latestLog = queryLogs[0];
    assert.strictEqual(latestLog.query_text, searchQuery);
    assert.strictEqual(latestLog.operator_email, superadminUser.email);
    logPass(`Forensic audit logged: query='${latestLog.query_text.substring(0, 30)}...', latency=${latestLog.latency_ms}ms, operator=${latestLog.operator_email}`);

    // 11. CLEANUP & TEARDOWN
    console.log('\n[11/11] Cleaning Up Test Artifacts & Verifying Post-Flight Meta Lock...');
    await connection.execute('DELETE FROM hybrid_search_query_logs WHERE collection_id = ?', [createdCol.id]);
    await connection.execute('DELETE FROM semantic_vector_embeddings WHERE collection_id = ?', [createdCol.id]);
    await connection.execute('DELETE FROM rag_knowledge_collections WHERE id = ?', [createdCol.id]);
    await connection.execute('DELETE FROM neural_embedding_models WHERE id = ?', [createdModel.id]);
    logPass('Cleaned up test collection, vectors, models, and query logs');

    // POST-CHECK META INVARIANT LOCK
    await verifyMetaLock(connection, 'POST');

    console.log('\n========================================================================');
    console.log(`  ALL STAGE 46 ASSERTIONS PASSED (${passedTests}/${passedTests}) - 100% SUCCESS  `);
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage46Tests().catch((err) => {
  console.error('\n❌ STAGE 46 TEST FAILED:', err);
  process.exit(1);
});
