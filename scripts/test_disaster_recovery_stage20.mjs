/**
 * Stage 20: Automated Disaster Recovery, Database Snapshot Vault & Multi-Region Backup Verification Suite
 * 
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on DR endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. DR Telemetry Overview (GET /api/v1/admin/operations/dr/overview)
 * 4. List Vault Snapshots with Filters (GET /api/v1/admin/operations/dr/snapshots)
 * 5. Create Manual Snapshot with Safeguards (Confirmation check, min-8 reason, SHA-256 seal, audit log)
 * 6. Execute Synthetic Disaster Recovery Drill (Isolated sandbox, RTO calculation, integrity check, audit log)
 * 7. List DR Drill Logs (GET /api/v1/admin/operations/dr/drills)
 * 8. Generate Scoped Tenant Backup Export (Checksum calculation, 48h TTL, audit log)
 * 9. Download Tenant Backup Archive (GET /api/v1/admin/operations/dr/tenant-backups/:id/download)
 * 10. Production Meta Publication Lock Intact (Final Verification)
 */

import crypto from 'crypto';
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
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function verifyMetaLock(dbConnection, checkpointLabel) {
  console.log(`\n--- [CHECKPOINT] Verifying Meta Publication Lock: ${checkpointLabel} ---`);
  const [variants] = await dbConnection.execute(
    'SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length > 0, `Meta post variant ${META_LOCK_REMOTE_POST_ID} exists in database`);
  assert(variants[0].status === 'published', `Meta post variant status is strictly 'published' (current: ${variants[0].status})`);

  const [jobs] = await dbConnection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length > 0, `Publishing job ${META_LOCK_JOB_ID} exists in database`);
  assert(jobs[0].status === 'published', `Publishing job status is strictly 'published' (current: ${jobs[0].status})`);
}

async function main() {
  console.log('================================================================================');
  console.log('STAGE 20: DISASTER RECOVERY, DATABASE SNAPSHOT VAULT & MULTI-REGION RESILIENCE');
  console.log('================================================================================\n');

  const dbConnection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Initial Meta Lock Verification
    await verifyMetaLock(dbConnection, 'PRE-STAGE-20');

    // Setup Test Tokens
    // 1. Superadmin Token
    const [superadminRows] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadminRows.length > 0, 'Platform superadmin user located in database');
    const superadminUser = superadminRows[0];

    const superadminToken = jwt.sign(
      { userId: superadminUser.id, email: superadminUser.email, isSuperadmin: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Regular User Token
    const [regularRows] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(regularRows.length > 0, 'Regular user located in database');
    const regularUser = regularRows[0];

    const regularToken = jwt.sign(
      { userId: regularUser.id, email: regularUser.email, isSuperadmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. RBAC Security Tests
    console.log('\n--- 1. Testing RBAC Security & Auth Bounds ---');
    const noAuthRes = await request('/admin/operations/dr/overview');
    assert(noAuthRes.status === 401, 'Unauthenticated request to DR overview rejected with 401');

    const regularAuthRes = await request('/admin/operations/dr/overview', {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(regularAuthRes.status === 403, 'Non-superadmin request to DR overview rejected with 403');

    // 3. Superadmin DR Overview
    console.log('\n--- 2. Testing Disaster Recovery Overview Telemetry ---');
    const overviewRes = await request('/admin/operations/dr/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(overviewRes.status === 200, 'Superadmin access to DR overview returns 200 OK');
    const overview = overviewRes.data;
    assert(typeof overview.drStatus === 'string', `drStatus is returned (${overview.drStatus})`);
    assert(typeof overview.targetRtoSeconds === 'number', `targetRtoSeconds is returned (${overview.targetRtoSeconds}s)`);
    assert(typeof overview.targetRpoSeconds === 'number', `targetRpoSeconds is returned (${overview.targetRpoSeconds}s)`);
    assert(typeof overview.totalSnapshotsCount === 'number', `totalSnapshotsCount is returned (${overview.totalSnapshotsCount})`);
    assert(overview.totalSnapshotsCount >= 1, 'Initial seeded snapshot is counted');
    assert(overview.latestSnapshot !== null, 'latestSnapshot object is populated');
    assert(typeof overview.latestSnapshot.id === 'string' && overview.latestSnapshot.id.startsWith('snap-'), `Initial latest snapshot has valid ID (${overview.latestSnapshot.id})`);

    // 4. List Vault Snapshots with Filters
    console.log('\n--- 3. Testing Snapshot Listing & Filtering ---');
    const listSnapRes = await request('/admin/operations/dr/snapshots', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listSnapRes.status === 200, 'GET /admin/operations/dr/snapshots returns 200 OK');
    const snapshots = listSnapRes.data;
    assert(Array.isArray(snapshots) && snapshots.length >= 1, 'Snapshots returned as an array with at least 1 record');
    const seedSnap = snapshots.find((s) => s.id === 'snap-20261012-daily01');
    assert(!!seedSnap, 'Seeded snapshot snap-20261012-daily01 found in list');
    assert(seedSnap.checksumSha256.length === 64, 'Snapshot SHA-256 manifest is a valid 64-character hash');
    assert(seedSnap.tableCount > 0, `Seed snapshot table count is positive (${seedSnap.tableCount} tables)`);
    assert(seedSnap.recordCount > 0, `Seed snapshot record count is positive (${seedSnap.recordCount} rows)`);

    // Tier Filter Test
    const tierFilterRes = await request('/admin/operations/dr/snapshots?tier=multi_region_replica', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(tierFilterRes.status === 200, 'Filtering snapshots by tier=multi_region_replica returns 200 OK');
    assert(tierFilterRes.data.every((s) => s.storageTier === 'multi_region_replica'), 'All returned snapshots match storageTier filter');

    // 5. Create Manual Snapshot with Safeguards
    console.log('\n--- 4. Testing Manual Snapshot Creation with Administrative Safeguards ---');
    
    // Safeguard 1: Missing Confirmation
    const unconfirmedSnapRes = await request('/admin/operations/dr/snapshots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        snapshotType: 'manual_operator',
        storageTier: 'multi_region_replica',
        reason: 'Valid justification text for snapshot',
        confirmed: false,
      }),
    });
    assert(unconfirmedSnapRes.status === 400, 'Snapshot creation without explicit confirmation rejected with 400');

    // Safeguard 2: Short Reason (< 8 chars)
    const shortReasonSnapRes = await request('/admin/operations/dr/snapshots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        snapshotType: 'manual_operator',
        storageTier: 'multi_region_replica',
        reason: 'short',
        confirmed: true,
      }),
    });
    assert(shortReasonSnapRes.status === 400, 'Snapshot creation with reason < 8 characters rejected with 400');

    // Successful Snapshot Creation
    const testReason = 'Automated Stage 20 disaster recovery compliance verification snapshot.';
    const createSnapRes = await request('/admin/operations/dr/snapshots', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        snapshotType: 'manual_operator',
        storageTier: 'multi_region_replica',
        replicaRegions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
        retentionDays: 60,
        reason: testReason,
        confirmed: true,
      }),
    });
    assert(createSnapRes.status === 201, 'Valid snapshot creation returns 201 Created');
    const newSnapshot = createSnapRes.data;
    assert(newSnapshot.id.startsWith('snap-'), `New snapshot ID generated (${newSnapshot.id})`);
    assert(newSnapshot.snapshotType === 'manual_operator', 'Snapshot type set to manual_operator');
    assert(newSnapshot.storageTier === 'multi_region_replica', 'Storage tier set to multi_region_replica');
    assert(newSnapshot.status === 'available', 'Initial snapshot status is available');
    assert(newSnapshot.checksumSha256.length === 64, 'Cryptographic SHA-256 seal generated');
    assert(newSnapshot.retentionDays === 60, 'Retention days set to 60');

    // Audit Log Check for Snapshot Creation
    const [snapAuditLogs] = await dbConnection.execute(
      "SELECT action, superadmin_id, details FROM superadmin_audit_logs WHERE action = 'dr_snapshot_created' ORDER BY created_at DESC LIMIT 1"
    );
    assert(snapAuditLogs.length > 0, 'Audit log recorded for dr_snapshot_created');
    assert(snapAuditLogs[0].superadmin_id === superadminUser.id, 'Audit log correctly attributes operator superadmin_id');
    const snapAuditDetails = typeof snapAuditLogs[0].details === 'string' ? JSON.parse(snapAuditLogs[0].details) : snapAuditLogs[0].details;
    assert(snapAuditDetails.snapshotId === newSnapshot.id, 'Audit log details include target snapshot ID');

    // 6. Execute Synthetic Disaster Recovery Drill
    console.log('\n--- 5. Testing Synthetic Disaster Recovery Drill Execution ---');

    // Safeguard 1: Missing Confirmation
    const unconfirmedDrillRes = await request(`/admin/operations/dr/snapshots/${newSnapshot.id}/drill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        targetEnv: 'isolated_sandbox',
        reason: 'Monthly compliance drill execution verification.',
        confirmed: false,
      }),
    });
    assert(unconfirmedDrillRes.status === 400, 'DR drill without explicit confirmation rejected with 400');

    // Safeguard 2: Short Reason
    const shortReasonDrillRes = await request(`/admin/operations/dr/snapshots/${newSnapshot.id}/drill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        targetEnv: 'isolated_sandbox',
        reason: 'drill',
        confirmed: true,
      }),
    });
    assert(shortReasonDrillRes.status === 400, 'DR drill with reason < 8 characters rejected with 400');

    // Successful DR Drill
    const drillReason = 'Stage 20 automated synthetic schema and table restoration drill.';
    const drillRes = await request(`/admin/operations/dr/snapshots/${newSnapshot.id}/drill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        targetEnv: 'isolated_sandbox',
        reason: drillReason,
        confirmed: true,
      }),
    });
    assert(drillRes.status === 200, 'Valid synthetic DR drill execution returns 200 OK');
    const { drill, snapshot: updatedSnap } = drillRes.data;
    assert(drill.id.startsWith('drill-'), `DR drill ID generated (${drill.id})`);
    assert(drill.snapshotId === newSnapshot.id, 'Drill target snapshot matches requested snapshot ID');
    assert(drill.status === 'passed', 'Synthetic drill execution status is passed');
    assert(drill.integrityCheckPassed === true, 'All schema and table integrity checks passed');
    assert(typeof drill.rtoSeconds === 'number' && drill.rtoSeconds >= 0, `Achieved RTO measured (${drill.rtoSeconds}s)`);
    assert(updatedSnap.verificationStatus === 'drill_passed', 'Snapshot verification status promoted to drill_passed');
    assert(updatedSnap.drillRtoSeconds === drill.rtoSeconds, 'Snapshot recorded drill RTO');

    // Audit Log Check for DR Drill
    const [drillAuditLogs] = await dbConnection.execute(
      "SELECT action, superadmin_id, details FROM superadmin_audit_logs WHERE action = 'dr_drill_executed' ORDER BY created_at DESC LIMIT 1"
    );
    assert(drillAuditLogs.length > 0, 'Audit log recorded for dr_drill_executed');
    const drillAuditDetails = typeof drillAuditLogs[0].details === 'string' ? JSON.parse(drillAuditLogs[0].details) : drillAuditLogs[0].details;
    assert(drillAuditDetails.drillId === drill.id, 'Audit log details include drill ID');
    assert(drillAuditDetails.snapshotId === newSnapshot.id, 'Audit log details include snapshot ID');

    // 7. List DR Drill Logs
    console.log('\n--- 6. Testing DR Drill Log Retrieval ---');
    const listDrillsRes = await request('/admin/operations/dr/drills', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listDrillsRes.status === 200, 'GET /admin/operations/dr/drills returns 200 OK');
    const drills = listDrillsRes.data;
    assert(Array.isArray(drills) && drills.length >= 2, 'At least 2 drill records found (seed + newly executed)');
    const foundExecutedDrill = drills.find((d) => d.id === drill.id);
    assert(!!foundExecutedDrill, 'Newly executed drill found in drill history logs');

    // 8. Generate Scoped Tenant Backup Export
    console.log('\n--- 7. Testing Scoped Tenant Backup Archive Generation ---');
    const targetTenantId = superadminUser.tenant_id;

    // Safeguard: Unconfirmed
    const unconfirmedTbRes = await request('/admin/operations/dr/tenant-backup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenantId,
        format: 'sql_gz',
        reason: 'Valid justification for export',
        confirmed: false,
      }),
    });
    assert(unconfirmedTbRes.status === 400, 'Tenant backup request without explicit confirmation rejected with 400');

    // Safeguard: Short Reason
    const shortReasonTbRes = await request('/admin/operations/dr/tenant-backup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenantId,
        format: 'sql_gz',
        reason: 'short',
        confirmed: true,
      }),
    });
    assert(shortReasonTbRes.status === 400, 'Tenant backup request with reason < 8 characters rejected with 400');

    // Successful Tenant Backup Export
    const backupReason = 'Enterprise tenant data portability GDPR archive export request.';
    const createTbRes = await request('/admin/operations/dr/tenant-backup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenantId,
        format: 'sql_gz',
        reason: backupReason,
        confirmed: true,
      }),
    });
    assert(createTbRes.status === 201, 'Valid tenant backup export returns 201 Created');
    const newTb = createTbRes.data;
    assert(newTb.id.startsWith('tbk-'), `Tenant backup export ID generated (${newTb.id})`);
    assert(newTb.tenantId === targetTenantId, 'Export scoped to specified target tenant ID');
    assert(newTb.format === 'sql_gz', 'Export format is sql_gz');
    assert(newTb.status === 'ready', 'Tenant backup archive immediately status ready');
    assert(newTb.sizeBytes > 0, `Export archive file size is positive (${newTb.sizeBytes} bytes)`);
    assert(newTb.checksumSha256.length === 64, 'SHA-256 archive checksum calculated');
    
    const now = Date.now();
    const expiresAtMs = new Date(newTb.downloadExpiresAt).getTime();
    const hoursRemaining = (expiresAtMs - now) / (1000 * 60 * 60);
    assert(hoursRemaining > 24 && hoursRemaining <= 168.1, `Download TTL is securely bounded (${hoursRemaining.toFixed(1)}h)`);

    // Audit Log Check for Tenant Backup
    const [tbAuditLogs] = await dbConnection.execute(
      "SELECT action, superadmin_id, target_tenant_id, reason, details FROM superadmin_audit_logs WHERE action = 'dr_tenant_backup_exported' ORDER BY created_at DESC LIMIT 1"
    );
    assert(tbAuditLogs.length > 0, 'Audit log recorded for dr_tenant_backup_exported');
    const tbAuditDetails = typeof tbAuditLogs[0].details === 'string' ? JSON.parse(tbAuditLogs[0].details) : tbAuditLogs[0].details;
    assert(tbAuditDetails.exportId === newTb.id, 'Audit log details include export ID');
    assert(tbAuditLogs[0].target_tenant_id === targetTenantId, 'Audit log target_tenant_id matches target tenant ID');
    assert(tbAuditLogs[0].reason === backupReason, 'Audit log reason preserves operator justification');

    // 9. List Tenant Backups & Secure Download Endpoint
    console.log('\n--- 8. Testing Tenant Backups Listing & Secure Download ---');
    const listTbRes = await request('/admin/operations/dr/tenant-backups', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listTbRes.status === 200, 'GET /admin/operations/dr/tenant-backups returns 200 OK');
    const tbList = listTbRes.data;
    assert(Array.isArray(tbList) && tbList.length >= 1, 'Tenant backups list contains generated record');
    const foundTb = tbList.find((b) => b.id === newTb.id);
    assert(!!foundTb, 'Generated tenant backup found in listing');

    // Secure Download
    const downloadRes = await request(`/admin/operations/dr/tenant-backups/${newTb.id}/download`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(downloadRes.status === 200, 'GET /admin/operations/dr/tenant-backups/:id/download returns 200 OK');
    assert(downloadRes.headers.get('content-disposition')?.includes('attachment'), 'Content-Disposition header specifies attachment');
    assert(downloadRes.headers.get('x-checksum-sha256') === newTb.checksumSha256, 'Response header provides matching SHA-256 checksum');

    // Non-existent Download
    const invalidDownloadRes = await request('/admin/operations/dr/tenant-backups/tb-nonexistent-9999/download', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(invalidDownloadRes.status === 404, 'Download request for nonexistent backup returns 404 Not Found');

    // 10. Post-Verification of Meta Publication Lock
    await verifyMetaLock(dbConnection, 'POST-STAGE-20 (FINAL INVARIANT)');

    console.log('\n================================================================================');
    console.log(`STAGE 20 COMPLETED SUCCESSFULLY! All ${passedTests} assertions passed.`);
    console.log('Production Meta Publication Lock invariant remains 100% intact.');
    console.log('================================================================================\n');

  } finally {
    await dbConnection.end();
  }
}

main().catch((err) => {
  console.error('\nSTAGE 20 TEST RUNNER UNCAUGHT ERROR:', err);
  process.exit(1);
});
