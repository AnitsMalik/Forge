/**
 * SocialForge HLD Stage 3: Business-Data Ingestion Test Suite
 * Google Drive • Google Sheets • Excel • CSV • Marketing Objects • Normalization Pipeline
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';

const uuidv4 = () => crypto.randomUUID();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = config.jwtSecret;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE HLD STAGE 3: BUSINESS-DATA INGESTION TEST SUITE         ');
  console.log('   Drive • Sheets • Excel • CSV • 11 Object Types • Normalization DAG   ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const tenantAId = 'tenant_s3_a_' + uuidv4().slice(0, 8);
  const tenantBId = 'tenant_s3_b_' + uuidv4().slice(0, 8);
  const userAId = 'user_s3_a_' + uuidv4().slice(0, 8);
  const userBId = 'user_s3_b_' + uuidv4().slice(0, 8);
  const brandAId = 'brand_s3_a_' + uuidv4().slice(0, 8);
  const brandBId = 'brand_s3_b_' + uuidv4().slice(0, 8);

  try {
    console.log('[Setup] Provisioning isolated test tenants, brands, and sessions...');

    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Apex Marketing Group', tenantAId]
    );
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Vortex Agency', tenantBId]
    );

    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Alice Ingest Admin', 0, 1, NOW(), NOW())`,
      [userAId, `alice-s3-${Date.now()}@socialforge.io`]
    );
    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Bob Competitor', 0, 1, NOW(), NOW())`,
      [userBId, `bob-s3-${Date.now()}@socialforge.io`]
    );

    await db.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantAId, userAId]
    );
    await db.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantBId, userBId]
    );

    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Apex Flagship Brand', ?, NOW(), NOW())`,
      [brandAId, tenantAId, `apex-brand-${brandAId}`]
    );
    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Vortex Brand', ?, NOW(), NOW())`,
      [brandBId, tenantBId, `vortex-brand-${brandBId}`]
    );

    const tokenA = jwt.sign({ userId: userAId, tenantId: tenantAId, role: 'tenant_admin' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userBId, tenantId: tenantBId, role: 'tenant_admin' }, JWT_SECRET, { expiresIn: '1h' });

    const authHeadersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const authHeadersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };

    // -------------------------------------------------------------------------
    // 1. Database Schema Verification (connector_resources & marketing_objects)
    // -------------------------------------------------------------------------
    console.log('[1/10] Verifying database schema for Stage 3 business data ingestion...');

    const [moCols] = await db.query('DESCRIBE marketing_objects');
    const moFieldNames = moCols.map((c) => c.Field);
    assert(moFieldNames.includes('source_record_id'), 'marketing_objects has source_record_id column');
    assert(moFieldNames.includes('source_version'), 'marketing_objects has source_version column');
    assert(moFieldNames.includes('status'), 'marketing_objects has status column');
    assert(moFieldNames.includes('properties'), 'marketing_objects has properties column');
    assert(moFieldNames.includes('normalized_data'), 'marketing_objects has normalized_data column');
    assert(moFieldNames.includes('validation_errors'), 'marketing_objects has validation_errors column');
    assert(moFieldNames.includes('provenance'), 'marketing_objects has provenance column');
    assert(moFieldNames.includes('idempotency_key'), 'marketing_objects has idempotency_key column');
    assert(moFieldNames.includes('retry_count'), 'marketing_objects has retry_count column');

    const [crCols] = await db.query('DESCRIBE connector_resources');
    const crFieldNames = crCols.map((c) => c.Field);
    assert(crFieldNames.includes('sync_cursor'), 'connector_resources has sync_cursor column');
    assert(crFieldNames.includes('sync_status'), 'connector_resources has sync_status column');
    assert(crFieldNames.includes('last_synced_at'), 'connector_resources has last_synced_at column');
    assert(crFieldNames.includes('webhook_subscription_id'), 'connector_resources has webhook_subscription_id column');
    assert(crFieldNames.includes('webhook_expires_at'), 'connector_resources has webhook_expires_at column');

    const [auditCols] = await db.query('DESCRIBE ingestion_audit_logs');
    const auditFieldNames = auditCols.map((c) => c.Field);
    assert(auditFieldNames.includes('batch_id'), 'ingestion_audit_logs has batch_id column');
    assert(auditFieldNames.includes('action'), 'ingestion_audit_logs has action column');
    assert(auditFieldNames.includes('total_records'), 'ingestion_audit_logs has total_records column');
    assert(auditFieldNames.includes('success_count'), 'ingestion_audit_logs has success_count column');
    assert(auditFieldNames.includes('error_count'), 'ingestion_audit_logs has error_count column');

    // -------------------------------------------------------------------------
    // 2. Google Drive Connector: OAuth, Discovery, Selection, Webhook & Changes
    // -------------------------------------------------------------------------
    console.log('\n[2/10] Verifying Google Drive Connector implementation...');

    // OAuth Authorize
    const driveAuthRes = await fetch(`${API_BASE}/connections/authorize`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ provider: 'google-drive', brandId: brandAId }),
    });
    assert(driveAuthRes.status === 200, 'POST /connections/authorize for google-drive returns 200');
    const driveAuthData = await driveAuthRes.json();
    assert(driveAuthData.data.url.includes('drive.readonly'), 'Requested scopes include drive.readonly');

    // Callback
    const driveCbRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-drive',
        code: 'valid_drive_code',
        state: driveAuthData.data.state,
      }),
    });
    const driveConnId = (await driveCbRes.json()).data.connectionId;
    assert(Boolean(driveConnId), 'Google Drive connection established');

    // Discovery & Selection
    const driveResList = await fetch(`${API_BASE}/connections/${driveConnId}/resources`, { headers: authHeadersA });
    const driveFolders = (await driveResList.json()).data;
    assert(driveFolders.length >= 2, 'Google Drive discovered at least 2 folders');
    const targetFolder = driveFolders[0];

    // Toggle resource selection
    const toggleFolderRes = await fetch(`${API_BASE}/connections/resources/${targetFolder.id}/select`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ isSelected: true }),
    });
    assert(toggleFolderRes.status === 200, 'Resource selection toggle succeeds for Google Drive folder');

    // Fetch Changed Resources
    const { googleDriveConnector } = await import('../apps/api/dist/connectors/google-drive/GoogleDriveConnector.js');
    const changes = await googleDriveConnector.fetchChangedResources({
      folderId: targetFolder.externalResourceId,
      modifiedAfter: new Date(Date.now() - 86400000).toISOString(),
    });
    assert(changes.success === true, 'fetchChangedResources succeeds');
    assert(changes.files.length >= 1, 'fetchChangedResources identifies modified asset files');
    assert(Boolean(changes.nextCursor), 'fetchChangedResources produces pagination sync cursor');

    // Webhook subscription & renewal
    const subRes = await googleDriveConnector.subscribeWebhooks({
      resourceId: targetFolder.id,
      ttlSeconds: 86400,
    });
    assert(subRes.subscribed === true, 'Google Drive webhook channel subscribed');
    assert(Boolean(subRes.channelId), 'Google Drive watch channel ID generated');
    assert(Boolean(subRes.expiresAt), 'Google Drive webhook expiration recorded');

    const renewRes = await googleDriveConnector.renewWebhooks({
      channelId: subRes.channelId,
      resourceId: targetFolder.id,
      ttlSeconds: 172800,
    });
    assert(renewRes.renewed === true, 'Google Drive webhook subscription renewed');

    // Health monitoring
    const driveHealth = await googleDriveConnector.healthCheck({ credentials: { accessToken: 'valid_mock_token' } });
    assert(driveHealth.status === 'CONNECTED', 'Google Drive health check reports CONNECTED');

    // -------------------------------------------------------------------------
    // 3. Google Sheets Connector: OAuth, Discovery, Header & Row Ingestion
    // -------------------------------------------------------------------------
    console.log('\n[3/10] Verifying Google Sheets Connector implementation...');

    // OAuth
    const sheetsAuthRes = await fetch(`${API_BASE}/connections/authorize`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ provider: 'google-sheets', brandId: brandAId }),
    });
    const sheetsAuthData = await sheetsAuthRes.json();
    assert(sheetsAuthData.data.url.includes('spreadsheets.readonly'), 'Google Sheets OAuth scopes include spreadsheets.readonly');

    const sheetsCbRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-sheets',
        code: 'valid_sheets_code',
        state: sheetsAuthData.data.state,
      }),
    });
    const sheetsConnId = (await sheetsCbRes.json()).data.connectionId;
    assert(Boolean(sheetsConnId), 'Google Sheets connection established');

    // Discovery
    const sheetsResList = await fetch(`${API_BASE}/connections/${sheetsConnId}/resources`, { headers: authHeadersA });
    const sheetsList = (await sheetsResList.json()).data;
    assert(sheetsList.length >= 2, 'Google Sheets discovered spreadsheets');
    const catalogSheet = sheetsList[0];

    // Header Detection
    const { googleSheetsConnector } = await import('../apps/api/dist/connectors/google-sheets/GoogleSheetsConnector.js');
    const headerDetection = await googleSheetsConnector.detectHeaders({
      rawRows: [
        ['Product Name', 'Price', 'Discount', 'SKU', 'Image URL', 'Product URL', 'Availability', 'Status'],
        ['Apex Pro Earbuds', '$129.99', '20% OFF', 'APX-01', 'https://img.com/1.png', 'https://store.com/1', 'in_stock', 'active'],
      ],
    });
    assert(headerDetection.headers.length === 8, 'Google Sheets detected 8 column headers');
    assert(headerDetection.hasRequiredProductFields === true, 'Google Sheets verified presence of required product fields');

    // Sheet Selection
    const selectSheetRes = await googleSheetsConnector.selectSheet({
      spreadsheetId: catalogSheet.externalResourceId,
      sheetName: 'Catalog_Q4',
    });
    assert(selectSheetRes.success === true, 'selectSheet chose active spreadsheet tab');

    // New/Updated Row Detection
    const changeCheck = await googleSheetsConnector.detectChangedRows({
      rawRows: [
        ['Product Name', 'Price'],
        ['Apex Pro Earbuds', '$129.99'],
      ],
      lastKnownVersion: 'v_old_version',
    });
    assert(changeCheck.hasChanges === true, 'detectChangedRows successfully detects updated catalog content');
    assert(Boolean(changeCheck.currentVersion), 'detectChangedRows computes current version hash');

    // -------------------------------------------------------------------------
    // 4. Excel & CSV Connector: Parse, Validate, Import & Versioning
    // -------------------------------------------------------------------------
    console.log('\n[4/10] Verifying Excel & CSV Connector (Upload, Parse, Validate, Import)...');

    const sampleCsv = `Product Name,Price,Discount,SKU,Image URL,Product URL,Availability,Status
Apex Flagship Camera,$899.99,10% OFF,CAM-001,https://assets.socialforge.app/templates/render_default.png,https://store.apex.com/cam-1,in_stock,active
Apex Studio Microphone,$149.50,$20 OFF,MIC-002,https://assets.socialforge.app/templates/render_default.png,https://store.apex.com/mic-2,in_stock,active
Apex Pro Tripod,$79.00,,TRI-003,https://assets.socialforge.app/templates/render_default.png,https://store.apex.com/tri-3,in_stock,active`;

    // 1. Dry-Run Format Validation
    const valRes = await fetch(`${API_BASE}/data/validate/csv`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        csvText: sampleCsv,
        objectType: 'Product',
      }),
    });
    assert(valRes.status === 200, 'POST /data/validate/csv returns 200');
    const valData = await valRes.json();
    assert(valData.data.totalRows === 3, 'CSV validation counted exactly 3 product rows');
    assert(valData.data.validCount === 3, 'All 3 rows passed product validation');
    assert(valData.data.errorCount === 0, 'Zero validation errors on compliant CSV');

    // 2. Ingest CSV Content
    const ingestCsvRes = await fetch(`${API_BASE}/data/ingest/csv`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        brandId: brandAId,
        csvText: sampleCsv,
        fileName: 'apex_q4_catalog.csv',
        objectType: 'Product',
      }),
    });
    assert(ingestCsvRes.status === 200, 'POST /data/ingest/csv returns 200');
    const ingestCsvData = await ingestCsvRes.json();
    assert(ingestCsvData.data.totalRecords === 3, 'Ingested 3 records from CSV');
    assert(ingestCsvData.data.successCount === 3, 'Successfully created 3 marketing objects');
    assert(Boolean(ingestCsvData.data.batchId), 'Generated unique ingestion batch ID');

    // -------------------------------------------------------------------------
    // 5. Product Field Standardization
    // -------------------------------------------------------------------------
    console.log('\n[5/10] Verifying Product field standardization (name, price, discount, image, URL, SKU, availability, status)...');

    const [productRows] = await db.query(
      `SELECT * FROM marketing_objects WHERE tenant_id = ? AND brand_id = ? AND object_type = 'Product' ORDER BY created_at ASC`,
      [tenantAId, brandAId]
    );
    assert(productRows.length >= 3, 'Marketing objects persisted in database');

    const cameraProduct = productRows.find((p) => p.title.includes('Camera')) || productRows[0];
    const normData = typeof cameraProduct.normalized_data === 'string' ? JSON.parse(cameraProduct.normalized_data) : cameraProduct.normalized_data;

    assert(normData.name === 'Apex Flagship Camera', 'Product name standardized');
    assert(normData.price === '$899.99', 'Product price formatted with currency');
    assert(normData.priceAmount === 899.99, 'Numeric priceAmount parsed');
    assert(normData.currency === 'USD', 'Currency standardized to USD');
    assert(normData.discount === '10% OFF', 'Product discount parsed');
    assert(normData.image.includes('render_default.png'), 'Product image URL preserved');
    assert(normData.url.includes('store.apex.com'), 'Product URL preserved');
    assert(normData.sku === 'CAM-001', 'Product SKU preserved');
    assert(normData.availability === 'in_stock', 'Product availability standardized');
    assert(normData.status === 'active', 'Product status standardized');

    // -------------------------------------------------------------------------
    // 6. Support for All 11 Marketing Object Types
    // -------------------------------------------------------------------------
    console.log('\n[6/10] Verifying support for all 11 Marketing Object types...');

    const { normalizationService } = await import('../apps/api/dist/services/data/normalization.service.js');

    const testTypes = [
      { type: 'Product', payload: { name: 'Smart Watch', price: '$199.99' } },
      { type: 'Offer', payload: { title: 'Black Friday 50% Off', code: 'BF50', discount: '50% OFF' } },
      { type: 'Event', payload: { title: 'Product Launch Keynote', event_date: '2026-11-01', location: 'San Francisco, CA' } },
      { type: 'Service', payload: { name: 'Brand Consultation', price: '$250/hr', duration: '60 mins' } },
      { type: 'Article', payload: { title: '10 Ways to Scale Social Reach in 2026', author: 'Marketing Lead' } },
      { type: 'Property', payload: { title: 'Modern Studio Loft', price: '$3,200/mo', city: 'New York' } },
      { type: 'Job', payload: { title: 'Senior Social Strategist', department: 'Growth', salary: '$120,000' } },
      { type: 'Location', payload: { name: 'Downtown Flagship Store', address: '100 Market St', city: 'San Francisco' } },
      { type: 'Customer Review', payload: { author: 'Sarah M.', rating: 5, comment: 'SocialForge cut our creation time by 80%!' } },
      { type: 'Announcement', payload: { title: 'System Maintenance Window Scheduled', priority: 'high' } },
      { type: 'Campaign', payload: { name: 'Q4 Holiday Blitz', objective: 'conversions', budget: '$50,000' } },
    ];

    for (const item of testTypes) {
      const res = normalizationService.normalize(item.payload, { objectType: item.type });
      assert(res.objectType === item.type, `Normalized object type matches "${item.type}"`);
      assert(res.isValid === true, `Validates required fields for "${item.type}"`);
      assert(Boolean(res.title), `Standardized display title generated for "${item.type}"`);
    }

    // -------------------------------------------------------------------------
    // 7. Normalization Pipeline: External Source -> Source Record -> Normalizer -> Marketing Object
    // -------------------------------------------------------------------------
    console.log('\n[7/10] Verifying 4-step Normalization Pipeline (Source -> Record -> Normalizer -> Object)...');

    const { ingestionService } = await import('../apps/api/dist/services/data/ingestion.service.js');

    const singleIngestRes = await ingestionService.ingestRecord({
      tenantId: tenantAId,
      brandId: brandAId,
      source: 'google_sheets',
      sourceRecordId: 'row_promo_99',
      sourceVersion: 'v_sheet_rev2',
      rawRecord: {
        'Offer Name': 'Early Bird Lifetime Deal',
        'Discount': '40% OFF',
        'Promo Code': 'EARLYBIRD',
      },
      objectType: 'Offer',
      provenance: {
        spreadsheetId: 'sheet_offers_2026',
        sheetTab: 'Q4_Deals',
      },
    });

    assert(singleIngestRes.isValid === true, 'Pipeline normalizes and marks valid');
    assert(singleIngestRes.objectType === 'Offer', 'Resolved objectType to Offer');
    assert(singleIngestRes.sourceRecordId === 'row_promo_99', 'Source record ID preserved');
    assert(singleIngestRes.sourceVersion === 'v_sheet_rev2', 'Source version preserved');

    // Verify database record
    const [savedObj] = await db.query(
      `SELECT * FROM marketing_objects WHERE id = ?`,
      [singleIngestRes.id]
    );
    const savedProv = typeof savedObj[0].provenance === 'string' ? JSON.parse(savedObj[0].provenance) : savedObj[0].provenance;
    assert(savedProv.spreadsheetId === 'sheet_offers_2026', 'Source provenance JSON persisted');
    assert(savedProv.sourceVersion === 'v_sheet_rev2', 'Provenance traces source version');
    assert(Boolean(savedProv.rawHash), 'Provenance includes raw data content hash');

    // -------------------------------------------------------------------------
    // 8. Duplicate Ingestion Prevention & Idempotency
    // -------------------------------------------------------------------------
    console.log('\n[8/10] Verifying Duplicate Ingestion Prevention & Idempotency...');

    // Attempt to ingest the EXACT same record again
    const dupRes = await ingestionService.ingestRecord({
      tenantId: tenantAId,
      brandId: brandAId,
      source: 'google_sheets',
      sourceRecordId: 'row_promo_99',
      sourceVersion: 'v_sheet_rev2',
      rawRecord: {
        'Offer Name': 'Early Bird Lifetime Deal',
        'Discount': '40% OFF',
        'Promo Code': 'EARLYBIRD',
      },
      objectType: 'Offer',
    });

    assert(dupRes.isDuplicate === true, 'Duplicate ingestion detected and blocked');
    assert(dupRes.id === singleIngestRes.id, 'Returned existing object ID without duplicate database row insertion');

    // Check count in database
    const [countRows] = await db.query(
      `SELECT COUNT(*) as cnt FROM marketing_objects WHERE tenant_id = ? AND source = 'google_sheets' AND source_record_id = 'row_promo_99'`,
      [tenantAId]
    );
    assert(countRows[0].cnt === 1, 'Exactly 1 database row exists for idempotent record');

    // -------------------------------------------------------------------------
    // 9. Validation Error Persistence, Ingestion Audit Trail & Retry
    // -------------------------------------------------------------------------
    console.log('\n[9/10] Verifying Validation Error Persistence, Audit Trail & 1-Click Retry...');

    // Ingest invalid record (missing required product name and invalid price)
    const invalidRes = await ingestionService.ingestRecord({
      tenantId: tenantAId,
      brandId: brandAId,
      source: 'csv',
      sourceRecordId: 'row_broken_01',
      sourceVersion: 'v1',
      rawRecord: {
        name: '',
        price: 'not_a_price',
      },
      objectType: 'Product',
    });

    assert(invalidRes.isValid === false, 'Invalid record identified by normalizer');
    assert(invalidRes.status === 'invalid', 'Object status set to "invalid"');
    assert(invalidRes.validationErrors.length >= 2, 'Validation errors detail missing name and invalid price');

    // Verify errors persisted in database row
    const [invDbRow] = await db.query(`SELECT * FROM marketing_objects WHERE id = ?`, [invalidRes.id]);
    assert(invDbRow[0].status === 'invalid', 'Invalid status persisted in database');
    assert(Boolean(invDbRow[0].validation_errors), 'validation_errors JSON persisted in database');

    // Verify audit logs endpoint
    const auditRes = await fetch(`${API_BASE}/data/audit-logs?brandId=${brandAId}`, { headers: authHeadersA });
    assert(auditRes.status === 200, 'GET /data/audit-logs returns 200');
    const auditLogs = (await auditRes.json()).data;
    assert(auditLogs.length >= 1, 'Ingestion audit logs retrieved');
    assert(auditLogs[0].batchId !== undefined, 'Audit log contains batchId');
    assert(auditLogs[0].totalRecords >= 1, 'Audit log tracks record counts');

    // 1-Click Retry
    // Fix properties in database and trigger retry
    await db.query(
      `UPDATE marketing_objects SET properties = ? WHERE id = ?`,
      [JSON.stringify({ name: 'Fixed Apex Cable', price: '$19.99' }), invalidRes.id]
    );

    const retryRes = await fetch(`${API_BASE}/data/objects/${invalidRes.id}/retry`, {
      method: 'POST',
      headers: authHeadersA,
    });
    assert(retryRes.status === 200, 'POST /data/objects/:id/retry returns 200');
    const retryData = await retryRes.json();
    assert(retryData.data.isValid === true, 'Retry operation successfully validates updated payload');
    assert(retryData.data.status === 'valid', 'Object status updated to "valid" upon successful retry');

    const [retriedDbRow] = await db.query(`SELECT * FROM marketing_objects WHERE id = ?`, [invalidRes.id]);
    assert(retriedDbRow[0].status === 'valid', 'Database row status updated to valid');
    assert(retriedDbRow[0].retry_count >= 1, 'retry_count incremented in database row');

    // -------------------------------------------------------------------------
    // 10. Multi-Tenant Scoping & Production Post Integrity
    // -------------------------------------------------------------------------
    console.log('\n[10/10] Verifying Multi-Tenant Scoping & Production Integrity...');

    // Tenant B attempts to read Tenant A marketing objects
    const crossListRes = await fetch(`${API_BASE}/data/objects`, { headers: authHeadersB });
    const tenantBObjects = (await crossListRes.json()).data;
    assert(tenantBObjects.length === 0, 'Tenant B sees 0 marketing objects (Tenant A objects isolated)');

    // Tenant B attempts to retry Tenant A object
    const crossRetryRes = await fetch(`${API_BASE}/data/objects/${invalidRes.id}/retry`, {
      method: 'POST',
      headers: authHeadersB,
    });
    assert(crossRetryRes.status === 404, 'Tenant B is strictly BLOCKED from retrying Tenant A object (returns 404)');

    // Verify production locked post
    const [lockedPosts] = await db.query(
      `SELECT * FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(lockedPosts.length === 1, 'Production locked post variant exists');
    assert(lockedPosts[0].status === 'published', 'Production locked post variant remains locked and published');

    console.log('\n========================================================================');
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } finally {
    console.log('Cleaning up test tenant data...');
    try {
      await db.execute(`DELETE FROM marketing_objects WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM ingestion_audit_logs WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM connector_resources WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM social_connections WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM brands WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
      await db.execute(`DELETE FROM users WHERE id IN (?, ?)`, [userAId, userBId]);
      await db.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }
    await db.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run().catch((err) => {
  console.error('\nFatal test runner error:', err);
  process.exit(1);
});
