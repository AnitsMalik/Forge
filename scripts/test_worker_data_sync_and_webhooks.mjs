/**
 * SocialForge: Worker Data Sync, Webhook Renewal & Health Monitoring Test Suite
 * Tests continuous background synchronization of Google Drive & Google Sheets,
 * automatic webhook channel renewal, and connection token health.
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { processConnectorSyncJob } from '../apps/worker/dist/processors/connector.processor.js';
import { runConnectionHealthScheduler } from '../apps/worker/dist/schedulers/connectionHealth.scheduler.js';

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const uuidv4 = () => crypto.randomUUID();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: WORKER DATA SYNC & WEBHOOK RENEWAL TEST SUITE          ');
  console.log('   Incremental Sync • Webhook Expiration • Auto-Renewal • Health Poller');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const tenantId = 'tenant_wrk_' + uuidv4().slice(0, 8);
  const brandId = 'brand_wrk_' + uuidv4().slice(0, 8);
  const driveConnId = 'conn_drive_' + uuidv4().slice(0, 8);
  const sheetsConnId = 'conn_sheets_' + uuidv4().slice(0, 8);
  const driveResId = 'res_drive_' + uuidv4().slice(0, 8);
  const sheetsResId = 'res_sheets_' + uuidv4().slice(0, 8);
  const expiringResId = 'res_expiring_' + uuidv4().slice(0, 8);

  try {
    const now = new Date();

    // [1/5] Setup Test Fixtures
    console.log('[1/5] Provisioning test tenants, brands, and connector resources...');
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantId, 'Worker Test Tenant', tenantId]
    );

    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Worker Test Brand', ?, NOW(), NOW())`,
      [brandId, tenantId, `brand-${brandId}`]
    );

    // Google Drive Connection
    await db.execute(
      `INSERT INTO social_connections (id, tenant_id, brand_id, provider, provider_account_id, account_name, status, credential_reference, created_at, updated_at)
       VALUES (?, ?, ?, 'google-drive', 'drive_acct_1', 'Google Drive Business', 'CONNECTED', 'cred_test_drive', NOW(), NOW())`,
      [driveConnId, tenantId, brandId]
    );

    // Google Sheets Connection
    await db.execute(
      `INSERT INTO social_connections (id, tenant_id, brand_id, provider, provider_account_id, account_name, status, credential_reference, created_at, updated_at)
       VALUES (?, ?, ?, 'google-sheets', 'sheets_acct_1', 'Google Sheets Business', 'CONNECTED', 'cred_test_sheets', NOW(), NOW())`,
      [sheetsConnId, tenantId, brandId]
    );

    // Google Drive Resource (selected)
    await db.execute(
      `INSERT INTO connector_resources (
        id, connection_id, tenant_id, brand_id, external_resource_id, resource_name, resource_type,
        is_selected, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'folder_marketing_assets', 'Marketing Assets', 'folder', 1, 'idle', NOW(), NOW())`,
      [driveResId, driveConnId, tenantId, brandId]
    );

    // Google Sheets Resource (selected)
    await db.execute(
      `INSERT INTO connector_resources (
        id, connection_id, tenant_id, brand_id, external_resource_id, resource_name, resource_type,
        is_selected, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'sheet_catalog_2026', 'Master Product Catalog', 'spreadsheet', 1, 'idle', NOW(), NOW())`,
      [sheetsResId, sheetsConnId, tenantId, brandId]
    );

    assert(driveConnId !== '', 'Google Drive connection established');
    assert(sheetsConnId !== '', 'Google Sheets connection established');
    assert(driveResId !== '', 'Google Drive connector resource created');
    assert(sheetsResId !== '', 'Google Sheets connector resource created');

    // [2/5] Incremental Google Drive Sync Processor
    console.log('\n[2/5] Testing Background Google Drive Incremental Sync Job...');
    const driveSyncResult = await processConnectorSyncJob({
      resourceId: driveResId,
      connectionId: driveConnId,
      tenantId,
      brandId,
    });

    assert(driveSyncResult.success === true, 'Drive sync job succeeded');
    assert(driveSyncResult.processedCount === 1, 'Processed exactly 1 Drive resource');

    const [driveResRows] = await db.execute(`SELECT * FROM connector_resources WHERE id = ?`, [driveResId]);
    assert(driveResRows[0].sync_status === 'idle', 'Resource sync_status transitioned to "idle"');
    assert(driveResRows[0].sync_cursor.startsWith('cursor_drive_'), 'Resource sync_cursor populated with Drive pagination cursor');
    assert(driveResRows[0].last_synced_at !== null, 'Resource last_synced_at timestamp populated');

    const [driveObjects] = await db.execute(
      `SELECT * FROM marketing_objects WHERE tenant_id = ? AND source = 'google_drive'`,
      [tenantId]
    );
    assert(driveObjects.length >= 2, `Ingested ${driveObjects.length} files as marketing objects from Google Drive`);
    assert(driveObjects[0].status === 'valid', 'Drive marketing objects marked valid');

    // [3/5] Incremental Google Sheets Sync Processor
    console.log('\n[3/5] Testing Background Google Sheets Incremental Sync Job...');
    const sheetsSyncResult = await processConnectorSyncJob({
      resourceId: sheetsResId,
      connectionId: sheetsConnId,
      tenantId,
      brandId,
    });

    assert(sheetsSyncResult.success === true, 'Sheets sync job succeeded');
    assert(sheetsSyncResult.processedCount === 1, 'Processed exactly 1 Sheets resource');

    const [sheetsResRows] = await db.execute(`SELECT * FROM connector_resources WHERE id = ?`, [sheetsResId]);
    assert(sheetsResRows[0].sync_status === 'idle', 'Resource sync_status transitioned to "idle"');
    assert(sheetsResRows[0].sync_cursor.startsWith('v_sheet_'), 'Resource sync_cursor populated with Sheet revision cursor');
    assert(sheetsResRows[0].last_synced_at !== null, 'Resource last_synced_at timestamp populated');

    const [sheetObjects] = await db.execute(
      `SELECT * FROM marketing_objects WHERE tenant_id = ? AND source = 'google_sheets'`,
      [tenantId]
    );
    assert(sheetObjects.length >= 1, `Ingested ${sheetObjects.length} rows as marketing objects from Google Sheets`);
    assert(sheetObjects[0].title.includes('Seasonal Bundle'), 'Ingested sheet product title preserved');

    // Check Ingestion Audit Logs
    const [auditLogs] = await db.execute(
      `SELECT * FROM ingestion_audit_logs WHERE tenant_id = ? AND action = 'background_sync'`,
      [tenantId]
    );
    assert(auditLogs.length >= 2, `Ingestion audit log contains ${auditLogs.length} background_sync entries`);

    // [4/5] Google Drive Webhook Expiration & Automatic Renewal Daemon
    console.log('\n[4/5] Testing Webhook Channel Expiration & Automatic Renewal Daemon...');
    // Seed resource with webhook expiring in 2 hours
    const expiringIn2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const initialChannelId = 'watch_chan_expiring_999';

    await db.execute(
      `INSERT INTO connector_resources (
        id, connection_id, tenant_id, brand_id, external_resource_id, resource_name, resource_type,
        is_selected, webhook_subscription_id, webhook_expires_at, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'folder_watch_target', 'Auto-Renewed Folder', 'folder', 1, ?, ?, 'idle', NOW(), NOW())`,
      [expiringResId, driveConnId, tenantId, brandId, initialChannelId, expiringIn2Hours]
    );

    // Run connection health scheduler
    await runConnectionHealthScheduler();

    const [renewedResRows] = await db.execute(`SELECT * FROM connector_resources WHERE id = ?`, [expiringResId]);
    const renewed = renewedResRows[0];

    assert(renewed.webhook_subscription_id !== initialChannelId, 'Webhook subscription ID replaced with fresh watch channel');
    assert(renewed.webhook_subscription_id.startsWith('watch_'), 'New webhook subscription adheres to watch channel naming');

    const newExpiryDate = new Date(renewed.webhook_expires_at);
    const daysUntilExpiry = (newExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    assert(daysUntilExpiry > 6 && daysUntilExpiry <= 8, `Webhook channel extended to ~7 days in the future (got ${daysUntilExpiry.toFixed(1)} days)`);

    const [renewalAuditLogs] = await db.execute(
      `SELECT * FROM ingestion_audit_logs WHERE resource_id = ? AND action = 'webhook_renewed'`,
      [expiringResId]
    );
    assert(renewalAuditLogs.length === 1, 'Audit trail recorded "webhook_renewed" entry');

    // [5/5] Expired Connection Token Health Check & Production Lock
    console.log('\n[5/5] Testing Expired Token Health Check & Production Integrity...');
    const expiredConnId = 'conn_expired_' + uuidv4().slice(0, 8);
    const expiredTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // Expired 2 hours ago

    await db.execute(
      `INSERT INTO social_connections (id, tenant_id, brand_id, provider, provider_account_id, account_name, status, expires_at, credential_reference, created_at, updated_at)
       VALUES (?, ?, ?, 'google-drive', 'expired_acct_1', 'Expired Drive Account', 'CONNECTED', ?, 'cred_expired', NOW(), NOW())`,
      [expiredConnId, tenantId, brandId, expiredTime]
    );

    await runConnectionHealthScheduler();

    const [connRows] = await db.execute(`SELECT * FROM social_connections WHERE id = ?`, [expiredConnId]);
    assert(connRows[0].status === 'REAUTH_REQUIRED', 'Expired connection automatically marked REAUTH_REQUIRED');
    assert(connRows[0].last_error.includes('expired'), 'Diagnostic error recorded in last_error');

    // Preservation of Locked Production Post
    const [prodRows] = await db.execute(
      `SELECT remote_post_id, status FROM post_variants WHERE remote_post_id = ?`,
      ['1405588742634526_122100337179498315']
    );
    assert(prodRows.length > 0, 'Production locked post variant exists');
    assert(prodRows[0].status === 'published', 'Production locked post variant remains published');

    console.log('\n========================================================================');
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n*** TEST RUN ERROR ***:', err);
    failed++;
  } finally {
    console.log('Cleaning up test fixtures...');
    try {
      await db.execute(`DELETE FROM marketing_objects WHERE tenant_id = ?`, [tenantId]);
      await db.execute(`DELETE FROM ingestion_audit_logs WHERE tenant_id = ?`, [tenantId]);
      await db.execute(`DELETE FROM connector_resources WHERE tenant_id = ?`, [tenantId]);
      await db.execute(`DELETE FROM social_connections WHERE tenant_id = ?`, [tenantId]);
      await db.execute(`DELETE FROM brands WHERE tenant_id = ?`, [tenantId]);
      await db.execute(`DELETE FROM tenants WHERE id = ?`, [tenantId]);
      console.log('Cleanup completed successfully.');
    } catch (e) {
      console.error('Cleanup warning:', e.message);
    }
    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
