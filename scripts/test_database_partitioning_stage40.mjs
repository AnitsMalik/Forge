/**
 * Stage 40: Enterprise Automated Database Partitioning, Cold-Tier Sharding & Zero-Downtime Data Lifecycle Archival Test Suite
 *
 * Validates:
 * 1. Production Meta Publication Invariant Lock (PRE & POST)
 * 2. Superadmin Security & RBAC Guardrails (401, 403, 200)
 * 3. Real-Time Partitioning Telemetry & Storage Savings Metrics
 * 4. Pre-seeded Partitioned Tables Retrieval
 * 5. Dynamic Partition Configuration & Validation
 * 6. Automated Partition Pruning Engine
 * 7. Archival Policies Lifecycle & Schedule Management
 * 8. Zero-Downtime Cold-Tier Compression & Archival Trigger (Parquet Zstandard)
 * 9. Cold-Tier Vault Querying, Filtering & Manifest Inspection
 * 10. Cold-Tier Rehydration Pipeline
 * 11. Maintenance Activity Audit Logs
 * 12. Storage Lifecycle Growth Simulator
 * 13. Superadmin Audit Trail Tracking
 * 14. Complete Database Cleanup & Test Idempotency
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

async function runStage40Tests() {
  console.log('\n================================================================');
  console.log('   STAGE 40: ENTERPRISE DATABASE PARTITIONING & COLD ARCHIVAL');
  console.log('================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------
    // 1. PRE-VERIFICATION OF PRODUCTION META PUBLICATION LOCK
    // -------------------------------------------------------------
    console.log('[1/14] Verifying Pre-Execution Meta Publication Invariant Lock...');
    await verifyMetaLock(connection, 'PRE');

    // -------------------------------------------------------------
    // Setup Superadmin & Tenant Auth Tokens
    // -------------------------------------------------------------
    console.log('\n[2/14] Generating Operator & Non-Superadmin Tokens...');
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
    await connection.execute("DELETE FROM db_partition_configs WHERE table_name LIKE 'test_%'");
    await connection.execute("DELETE FROM db_archival_policies WHERE policy_name LIKE 'Test %'");
    await connection.execute("DELETE FROM db_cold_tier_archives WHERE id LIKE 'arch-test-%'");

    // -------------------------------------------------------------
    // 2. RBAC & Security Guardrail Enforcement
    // -------------------------------------------------------------
    console.log('\n[3/14] Verifying Security Guardrails & RBAC Enforcement...');

    // 401 without token
    const resNoAuth = await fetch(`${BASE_URL}/admin/operations/database-archival/telemetry`);
    assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated request must return 401');
    logPass('401 Unauthorized enforced for missing token');

    // 403 with non-superadmin token
    const resForbidden = await fetch(`${BASE_URL}/admin/operations/database-archival/telemetry`, {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert.strictEqual(resForbidden.status, 403, 'Non-superadmin token must return 403');
    logPass('403 Forbidden enforced for regular tenant user token');

    // 200 with superadmin token
    const resAuth = await fetch(`${BASE_URL}/admin/operations/database-archival/telemetry`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resAuth.status, 200, 'Superadmin token must return 200');
    const telJson = await resAuth.json();
    assert(telJson.success, 'Telemetry request must report success');
    logPass('200 OK authenticated access granted for superadmin operator');

    // -------------------------------------------------------------
    // 3. Telemetry Validation
    // -------------------------------------------------------------
    console.log('\n[4/14] Validating Real-Time Partitioning Telemetry & Storage Metrics...');
    const tel = telJson.data;
    assert(typeof tel.total_partitioned_tables === 'number' && tel.total_partitioned_tables >= 4, 'total_partitioned_tables >= 4');
    assert(typeof tel.total_active_partitions === 'number' && tel.total_active_partitions >= 50, 'total_active_partitions >= 50');
    assert(typeof tel.total_archived_rows === 'number' && tel.total_archived_rows > 0, 'total_archived_rows > 0');
    assert(typeof tel.uncompressed_cold_bytes === 'number' && tel.uncompressed_cold_bytes > 0, 'uncompressed_cold_bytes > 0');
    assert(typeof tel.compressed_cold_bytes === 'number' && tel.compressed_cold_bytes > 0, 'compressed_cold_bytes > 0');
    assert(tel.overall_storage_savings_percent >= 50.0, 'overall_storage_savings_percent >= 50.0%');
    assert(['healthy', 'warning', 'maintenance'].includes(tel.status), 'telemetry status must be valid enum');
    logPass(`Telemetry validated: ${tel.total_partitioned_tables} tables, ${tel.total_active_partitions} partitions, ${tel.total_archived_rows.toLocaleString()} archived rows (${tel.overall_storage_savings_percent}% savings)`);

    // -------------------------------------------------------------
    // 4. Partition Configurations API
    // -------------------------------------------------------------
    console.log('\n[5/14] Verifying Pre-seeded Partitioned Tables...');
    const resConfigs = await fetch(`${BASE_URL}/admin/operations/database-archival/configs`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resConfigs.status, 200);
    const configsJson = await resConfigs.json();
    assert(configsJson.success && Array.isArray(configsJson.data));
    const tableNames = configsJson.data.map((c) => c.table_name);
    assert(tableNames.includes('social_webhook_deliveries'), 'social_webhook_deliveries must be configured');
    assert(tableNames.includes('publishing_audit_logs'), 'publishing_audit_logs must be configured');
    assert(tableNames.includes('governance_audit_logs'), 'governance_audit_logs must be configured');
    assert(tableNames.includes('tenant_usage_events'), 'tenant_usage_events must be configured');
    logPass(`Partitioned tables verified: ${tableNames.slice(0, 4).join(', ')}`);

    // -------------------------------------------------------------
    // 5. Dynamic Partition Configuration & Validation
    // -------------------------------------------------------------
    console.log('\n[6/14] Dynamically Configuring Partitioning on New Table...');
    const testTable = `test_analytics_stream_${Date.now()}`;
    const resCreateCfg = await fetch(`${BASE_URL}/admin/operations/database-archival/configs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_name: testTable,
        partition_type: 'range_date',
        partition_key: 'timestamp',
        retention_days: 45,
        active_partition_count: 8,
      }),
    });
    assert.strictEqual(resCreateCfg.status, 201, 'Create config must return 201');
    const createCfgJson = await resCreateCfg.json();
    assert(createCfgJson.success && createCfgJson.data.table_name === testTable);
    assert.strictEqual(createCfgJson.data.retention_days, 45);
    logPass(`Partitioning configured dynamically on ${testTable}`);

    // Test 400 Bad Request on missing fields
    const resBadCfg = await fetch(`${BASE_URL}/admin/operations/database-archival/configs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ table_name: 'incomplete_table' }),
    });
    assert.strictEqual(resBadCfg.status, 400, 'Missing partition_key must return 400');
    logPass('400 Bad Request enforced for missing partition_key');

    // -------------------------------------------------------------
    // 6. Partition Pruning Engine
    // -------------------------------------------------------------
    console.log('\n[7/14] Testing Automated Partition Pruning Engine...');
    const resPrune = await fetch(
      `${BASE_URL}/admin/operations/database-archival/configs/social_webhook_deliveries/prune`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    assert.strictEqual(resPrune.status, 200);
    const pruneJson = await resPrune.json();
    assert(pruneJson.success && pruneJson.data.partitions_dropped > 0);
    logPass(`Pruned ${pruneJson.data.partitions_dropped} partition(s) freeing ${pruneJson.data.freed_mb} MB on social_webhook_deliveries`);

    // 404 on non-existent table prune
    const resBadPrune = await fetch(
      `${BASE_URL}/admin/operations/database-archival/configs/non_existent_table_xyz/prune`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${superadminToken}` },
      }
    );
    assert.strictEqual(resBadPrune.status, 404, 'Non-existent table prune must return 404');
    logPass('404 Not Found returned when attempting to prune unconfigured table');

    // -------------------------------------------------------------
    // 7. Archival Policies API
    // -------------------------------------------------------------
    console.log('\n[8/14] Validating Archival Policies & Lifecycle Schedules...');
    const resPolicies = await fetch(`${BASE_URL}/admin/operations/database-archival/policies`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resPolicies.status, 200);
    const policiesJson = await resPolicies.json();
    assert(policiesJson.success && Array.isArray(policiesJson.data));
    const policyNames = policiesJson.data.map((p) => p.policy_name);
    assert(policyNames.includes('Webhook Ingestion Cold Storage'));
    assert(policyNames.includes('Publishing Audit Compliance Archival'));
    logPass(`Archival policies verified: ${policyNames.slice(0, 2).join(', ')}`);

    // Create Dynamic Archival Policy
    const testPolicyName = `Test Lifecycle Policy ${Date.now()}`;
    const resCreatePol = await fetch(`${BASE_URL}/admin/operations/database-archival/policies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy_name: testPolicyName,
        target_table: testTable,
        age_threshold_days: 30,
        target_storage_tier: 'gcs_coldline',
        compression_format: 'parquet_zstd',
        schedule_cron: '0 0 * * 0',
      }),
    });
    assert.strictEqual(resCreatePol.status, 201);
    const createPolJson = await resCreatePol.json();
    assert.strictEqual(createPolJson.data.policy_name, testPolicyName);
    logPass(`Dynamic archival policy created: ${testPolicyName}`);

    // Test 400 Bad Request on missing policy fields
    const resBadPol = await fetch(`${BASE_URL}/admin/operations/database-archival/policies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ policy_name: 'Incomplete' }),
    });
    assert.strictEqual(resBadPol.status, 400);
    logPass('400 Bad Request enforced for missing target_table in archival policy');

    // -------------------------------------------------------------
    // 8. Zero-Downtime Cold-Tier Archival Trigger
    // -------------------------------------------------------------
    console.log('\n[9/14] Triggering Zero-Downtime Cold Tier Archival Run...');
    const resTrigger = await fetch(`${BASE_URL}/admin/operations/database-archival/archives/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy_id: 'pol-wh-glacier',
        dry_run: false,
      }),
    });
    assert.strictEqual(resTrigger.status, 200);
    const triggerJson = await resTrigger.json();
    assert(triggerJson.success);
    const triggerData = triggerJson.data;
    assert(triggerData.archive_id, 'Archive ID must be present');
    assert(triggerData.compression_ratio > 1.0, 'Compression ratio must be > 1.0x');
    assert(triggerData.checksum_sha256 && triggerData.checksum_sha256.length === 64, 'Checksum must be valid SHA-256');
    logPass(`Archived ${triggerData.archived_rows.toLocaleString()} rows to ${triggerData.storage_uri} (${triggerData.compression_ratio}x compression ratio)`);

    // Test 400 Bad Request on missing policy_id
    const resBadTrigger = await fetch(`${BASE_URL}/admin/operations/database-archival/archives/trigger`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadTrigger.status, 400);
    logPass('400 Bad Request enforced for missing policy_id in trigger archival');

    // -------------------------------------------------------------
    // 9. Cold-Tier Vault Querying & Inspection
    // -------------------------------------------------------------
    console.log('\n[10/14] Querying Cold-Tier Vault & Archive Manifests...');
    const resArchives = await fetch(`${BASE_URL}/admin/operations/database-archival/archives?table_name=social_webhook_deliveries`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resArchives.status, 200);
    const archivesJson = await resArchives.json();
    assert(archivesJson.success && Array.isArray(archivesJson.data));
    assert(archivesJson.data.length >= 2, 'Must have at least 2 archive manifests for social_webhook_deliveries');
    const sampleArch = archivesJson.data[0];
    assert(sampleArch.storage_uri && sampleArch.checksum_sha256);
    logPass(`Cold-tier archives retrieved: ${archivesJson.data.length} manifests verified`);

    // -------------------------------------------------------------
    // 10. Cold-Tier Rehydration Pipeline
    // -------------------------------------------------------------
    console.log('\n[11/14] Rehydrating Cold-Tier Archive to Hot Table...');
    const resRehydrate = await fetch(`${BASE_URL}/admin/operations/database-archival/archives/rehydrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        archive_id: triggerData.archive_id,
      }),
    });
    assert.strictEqual(resRehydrate.status, 200);
    const rehydrateJson = await resRehydrate.json();
    assert(rehydrateJson.success);
    assert.strictEqual(rehydrateJson.data.status, 'restored');
    logPass(`Rehydrated archive ${triggerData.archive_id} (${rehydrateJson.data.restored_rows.toLocaleString()} rows restored)`);

    // Test 400 on missing archive_id
    const resBadRehydrate = await fetch(`${BASE_URL}/admin/operations/database-archival/archives/rehydrate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadRehydrate.status, 400);
    logPass('400 Bad Request enforced for missing archive_id in rehydration');

    // -------------------------------------------------------------
    // 11. Maintenance Activity Audit Logs
    // -------------------------------------------------------------
    console.log('\n[12/14] Checking Partition Maintenance Logs...');
    const resLogs = await fetch(`${BASE_URL}/admin/operations/database-archival/maintenance-logs?limit=10`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert.strictEqual(resLogs.status, 200);
    const logsJson = await resLogs.json();
    assert(logsJson.success && Array.isArray(logsJson.data));
    const actions = logsJson.data.map((l) => l.action);
    assert(actions.includes('partition_dropped') || actions.includes('archived_to_cold_tier') || actions.includes('cold_tier_rehydrated'));
    logPass(`Maintenance activity logs confirmed: ${actions.slice(0, 3).join(', ')}`);

    // -------------------------------------------------------------
    // 12. Storage Lifecycle Growth Simulator
    // -------------------------------------------------------------
    console.log('\n[13/14] Executing Storage Lifecycle Growth Simulator...');
    const resSim = await fetch(`${BASE_URL}/admin/operations/database-archival/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table_name: 'social_webhook_deliveries',
        daily_ingestion_rows: 100000,
        retention_days: 90,
        compression_format: 'parquet_zstd',
      }),
    });
    assert.strictEqual(resSim.status, 200);
    const simJson = await resSim.json();
    assert(simJson.success);
    const sim = simJson.data;
    assert(sim.projected_cost_savings_monthly > 0, 'Cost savings must be positive');
    assert(sim.compression_ratio >= 7.0, 'Parquet zstd compression ratio must be >= 7.0x');
    logPass(`Simulation passed: $${sim.projected_cost_savings_monthly}/mo savings, ${sim.compression_ratio}x compression`);

    // Test 400 on missing table_name in simulator
    const resBadSim = await fetch(`${BASE_URL}/admin/operations/database-archival/simulate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superadminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert.strictEqual(resBadSim.status, 400);
    logPass('400 Bad Request enforced for missing table_name in simulator');

    // -------------------------------------------------------------
    // 13. Superadmin Audit Trail Tracking & Clean-up
    // -------------------------------------------------------------
    console.log('\n[14/14] Verifying Audit Trail & Cleaning Test Records...');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type FROM superadmin_audit_logs WHERE target_resource_type = 'database_archival' ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length >= 3, 'Must have at least 3 database_archival audit log entries');
    logPass(`Audit trail verified with ${auditRows.length} recent database_archival actions`);

    // Clean-up Test Records
    await connection.execute("DELETE FROM db_partition_configs WHERE table_name LIKE 'test_%'");
    await connection.execute("DELETE FROM db_archival_policies WHERE policy_name LIKE 'Test %'");
    await connection.execute(`DELETE FROM db_cold_tier_archives WHERE id = ?`, [triggerData.archive_id]);
    logPass('Cleaned up dynamic test partition configs and archives');

    // -------------------------------------------------------------
    // POST-VERIFICATION OF PRODUCTION META PUBLICATION LOCK
    // -------------------------------------------------------------
    console.log('\n[POST-VERIFICATION] Checking Production Meta Invariant Lock post-test...');
    await verifyMetaLock(connection, 'POST');

    console.log('\n================================================================');
    console.log(`   STAGE 40 SUMMARY: ALL ${passedTests} ASSERTIONS PASSED (100%)`);
    console.log('================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage40Tests().catch((err) => {
  console.error('\n❌ STAGE 40 FAILED:', err);
  process.exit(1);
});
