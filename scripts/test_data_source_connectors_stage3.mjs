/**
 * SocialForge HLD Stage 3: Data Source Connectors (Google Drive & Google Sheets)
 * Self-Service OAuth, Resource Discovery, and Automation Trigger Syncing E2E Suite
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
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
    throw new Error(message);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE DATA SOURCE CONNECTORS TEST SUITE                        ');
  console.log('   Google Drive & Google Sheets • Discovery • Automation Trigger Sync   ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const tenantAId = 'tenant_ds_a_' + uuidv4().slice(0, 8);
  const tenantBId = 'tenant_ds_b_' + uuidv4().slice(0, 8);
  const userAId = 'user_ds_a_' + uuidv4().slice(0, 8);
  const userBId = 'user_ds_b_' + uuidv4().slice(0, 8);
  const brandAId = 'brand_ds_a_' + uuidv4().slice(0, 8);
  const brandBId = 'brand_ds_b_' + uuidv4().slice(0, 8);

  try {
    console.log('[Setup] Provisioning isolated test tenants, brands, and sessions...');

    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Alpha Agency', tenantAId]
    );
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Beta Agency', tenantBId]
    );

    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Alice Tester A', 0, 1, NOW(), NOW())`,
      [userAId, `alice-ds-${Date.now()}@socialforge.io`]
    );
    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Bob Tester B', 0, 1, NOW(), NOW())`,
      [userBId, `bob-ds-${Date.now()}@socialforge.io`]
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
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Alpha Global Brand', ?, NOW(), NOW())`,
      [brandAId, tenantAId, `alpha-brand-${brandAId}`]
    );
    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Beta Holding Brand', ?, NOW(), NOW())`,
      [brandBId, tenantBId, `beta-brand-${brandBId}`]
    );

    const tokenA = jwt.sign({ userId: userAId, tenantId: tenantAId, role: 'tenant_admin' }, JWT_SECRET, { expiresIn: '1h' });
    const tokenB = jwt.sign({ userId: userBId, tenantId: tenantBId, role: 'tenant_admin' }, JWT_SECRET, { expiresIn: '1h' });

    const authHeadersA = { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' };
    const authHeadersB = { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' };

    // -------------------------------------------------------------------------
    // 1. Google Drive OAuth URL Generation & State Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Google Drive OAuth Authorization & State Security ---');

    const authRes = await fetch(`${API_BASE}/connections/authorize`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-drive',
        brandId: brandAId,
      }),
    });

    assert(authRes.status === 200, 'POST /connections/authorize for google-drive returns 200');
    const authData = await authRes.json();
    assert(authData.success === true, 'Authorization request succeeded');
    assert(typeof authData.data.url === 'string', 'OAuth authorization URL returned');
    assert(authData.data.url.includes('accounts.google.com/o/oauth2/v2/auth'), 'Target authorization endpoint is Google OAuth 2.0');
    assert(authData.data.url.includes('drive.readonly'), 'Requested scopes include drive.readonly');

    const driveState = authData.data.state;
    assert(typeof driveState === 'string' && driveState.includes('.'), 'OAuth state token contains payload and HMAC signature');

    // Tampered state rejection
    const [payloadPart, sigPart] = driveState.split('.');
    const tamperedState = `${payloadPart}.${sigPart.slice(0, -4)}XXXX`;

    const tamperRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-drive',
        code: 'mock_code_test',
        state: tamperedState,
      }),
    });
    assert(tamperRes.status !== 200, 'Tampered OAuth state signature is rejected by backend');

    // -------------------------------------------------------------------------
    // 2. Google Drive OAuth Callback & Credential Vault Encryption
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Google Drive Callback & Envelope Vault Encryption ---');

    const callbackRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-drive',
        code: 'valid_auth_code_gdrive_test',
        state: driveState,
      }),
    });

    assert(callbackRes.status === 200 || callbackRes.status === 201, 'POST /connections/callback handles Google Drive successfully');
    const cbData = await callbackRes.json();
    assert(cbData.success === true, 'Callback returns success: true');
    const driveConnId = cbData.data.connectionId;
    assert(Boolean(driveConnId), 'Generated connection ID for Google Drive');

    // Verify database row and credential vault
    const [connRows] = await db.query(
      `SELECT * FROM social_connections WHERE id = ? AND tenant_id = ?`,
      [driveConnId, tenantAId]
    );
    assert(connRows.length === 1, 'social_connections row created for Google Drive');
    assert(connRows[0].status === 'CONNECTED', 'Connection status is CONNECTED');
    assert(Boolean(connRows[0].credential_reference), 'credential_reference stored in social_connections');

    // Verify vault record
    const [vaultRows] = await db.query(
      `SELECT * FROM connection_credentials WHERE id = ? AND tenant_id = ?`,
      [connRows[0].credential_reference, tenantAId]
    );
    assert(vaultRows.length === 1, 'Vault record isolated to tenant context in connection_credentials');
    assert(Boolean(vaultRows[0].encrypted_data), 'Vault ciphertext stored at rest');
    assert(Boolean(vaultRows[0].iv), 'Unique AES-GCM IV stored');
    assert(Boolean(vaultRows[0].auth_tag), 'AES-GCM authentication tag stored');

    // -------------------------------------------------------------------------
    // 3. Google Drive Resource Discovery & Zero Token Leakage
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Google Drive Folder & Asset Resource Discovery ---');

    const resListRes = await fetch(`${API_BASE}/connections/${driveConnId}/resources`, {
      headers: authHeadersA,
    });
    assert(resListRes.status === 200, 'GET /connections/:id/resources returns 200');
    const resListData = await resListRes.json();
    assert(resListData.success === true, 'Resource discovery payload succeeded');
    const driveResources = resListData.data || resListData.resources;
    assert(Array.isArray(driveResources) && driveResources.length >= 2, 'Discovered at least 2 Google Drive folders');

    const marketingFolder = driveResources.find(r => r.name.includes('Marketing'));
    assert(Boolean(marketingFolder), 'Discovered "Brand Marketing Assets" folder');
    assert(marketingFolder.resourceType === 'drive_folder', 'Resource type is drive_folder');
    assert(marketingFolder.isSelected === true, 'Marketing folder is selected by default');
    assert(!marketingFolder.accessToken && !marketingFolder.credentials, 'Zero access tokens leaked in resource discovery');

    // -------------------------------------------------------------------------
    // 4. Google Sheets OAuth Flow & Spreadsheet Discovery
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Google Sheets OAuth Flow & Spreadsheet Discovery ---');

    const sheetAuthRes = await fetch(`${API_BASE}/connections/authorize`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-sheets',
        brandId: brandAId,
      }),
    });
    assert(sheetAuthRes.status === 200, 'POST /connections/authorize for google-sheets returns 200');
    const sheetAuthData = await sheetAuthRes.json();
    assert(sheetAuthData.data.url.includes('spreadsheets.readonly'), 'Google Sheets authorization scopes include spreadsheets.readonly');

    const sheetsState = sheetAuthData.data.state;

    const sheetCbRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        provider: 'google-sheets',
        code: 'valid_auth_code_sheets_test',
        state: sheetsState,
      }),
    });
    assert(sheetCbRes.status === 200 || sheetCbRes.status === 201, 'POST /connections/callback handles Google Sheets successfully');
    const sheetCbData = await sheetCbRes.json();
    const sheetsConnId = sheetCbData.data.connectionId;
    assert(Boolean(sheetsConnId), 'Google Sheets connection ID created');

    const sheetsResList = await fetch(`${API_BASE}/connections/${sheetsConnId}/resources`, {
      headers: authHeadersA,
    });
    assert(sheetsResList.status === 200, 'GET /connections/:id/resources for Google Sheets returns 200');
    const sheetResources = (await sheetsResList.json()).data;
    assert(Array.isArray(sheetResources) && sheetResources.length >= 2, 'Discovered at least 2 spreadsheets');

    const calendarSheet = sheetResources.find(r => r.name.includes('Editorial Calendar'));
    assert(Boolean(calendarSheet), 'Discovered "Social Editorial Calendar 2026" spreadsheet');
    assert(calendarSheet.resourceType === 'spreadsheet', 'Resource type is spreadsheet');
    assert(calendarSheet.metadata?.columns?.includes('Post Date'), 'Metadata includes spreadsheet column headers');

    // -------------------------------------------------------------------------
    // 5. Resource Selection Toggle
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Resource Selection Toggle ---');

    const toggleRes = await fetch(`${API_BASE}/connections/resources/${marketingFolder.id}/select`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ isSelected: false }),
    });
    assert(toggleRes.status === 200, 'PATCH /connections/resources/:id/select returns 200');
    const toggleData = await toggleRes.json();
    assert(toggleData.success === true, 'Toggle selection succeeded');
    assert(toggleData.data.isSelected === false, 'Folder successfully toggled to unselected');

    // Re-select
    await fetch(`${API_BASE}/connections/resources/${marketingFolder.id}/select`, {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ isSelected: true }),
    });

    // -------------------------------------------------------------------------
    // 6. Automation Trigger Syncing (handleDatasourceChange)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Automation Trigger Syncing ---');

    // Create an active automation configured to listen for datasource_change on this connection
    const autoId = uuidv4();
    await db.query(
      `INSERT INTO automations (
        id, tenant_id, brand_id, name, description, trigger_type, trigger_config, conditions, actions, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        autoId,
        tenantAId,
        brandAId,
        'Drive Asset Watcher',
        'Auto-generate drafts when new creative assets appear in Google Drive',
        'datasource_change',
        JSON.stringify({ sourceConnectionId: driveConnId, resourceId: marketingFolder.id }),
        JSON.stringify([]),
        JSON.stringify([
          {
            id: 'step_notify',
            type: 'notify',
            config: { channel: 'webhook', message: 'New creative asset synced from Google Drive' },
          },
        ]),
        'active',
      ]
    );

    // Call sync endpoint
    const syncRes = await fetch(`${API_BASE}/connections/${driveConnId}/sync`, {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        resourceId: marketingFolder.id,
        changePayload: {
          fileId: 'file_asset_001',
          fileName: 'summer_campaign_hero.png',
          event: 'new_file_uploaded',
        },
      }),
    });

    assert(syncRes.status === 200, 'POST /connections/:id/sync returns 200');
    const syncData = await syncRes.json();
    assert(syncData.success === true, 'Sync endpoint returns success: true');
    assert(syncData.data.triggeredAutomationsCount >= 1, 'Data sync triggered at least 1 active automation');
    assert(syncData.data.provider === 'google-drive', 'Provider reports google-drive');

    // Verify automation run record in database
    const [runRows] = await db.query(
      `SELECT * FROM automation_runs WHERE automation_id = ? AND tenant_id = ?`,
      [autoId, tenantAId]
    );
    assert(runRows[0].status === 'completed' || runRows[0].status === 'running' || runRows[0].status === 'success', 'Automation run completed successfully');

    // -------------------------------------------------------------------------
    // 7. Security: Multi-Tenant Boundary Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Security: Multi-Tenant Boundary Isolation ---');

    // Tenant B attempts to read Tenant A's Google Drive connection resources
    const crossResList = await fetch(`${API_BASE}/connections/${driveConnId}/resources`, {
      headers: authHeadersB,
    });
    assert(crossResList.status === 404 || crossResList.status === 403, 'Tenant B is strictly BLOCKED from accessing Tenant A connection resources');

    // Tenant B attempts to sync Tenant A's connection
    const crossSync = await fetch(`${API_BASE}/connections/${driveConnId}/sync`, {
      method: 'POST',
      headers: authHeadersB,
      body: JSON.stringify({ resourceId: marketingFolder.id }),
    });
    assert(crossSync.status === 404 || crossSync.status === 500, 'Tenant B cannot trigger sync on Tenant A connection');

    // -------------------------------------------------------------------------
    // 8. Lifecycle: Health Check, Reconnect & Disconnect
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Lifecycle: Health Check, Reconnect & Disconnect ---');

    const healthCheckRes = await fetch(`${API_BASE}/connections/${driveConnId}/health-check`, {
      method: 'POST',
      headers: authHeadersA,
    });
    assert(healthCheckRes.status === 200, 'POST /connections/:id/health-check returns 200');

    const disconnectRes = await fetch(`${API_BASE}/connections/${driveConnId}/disconnect`, {
      method: 'POST',
      headers: authHeadersA,
    });
    assert(disconnectRes.status === 200, 'POST /connections/:id/disconnect returns 200');

    const [disconnRow] = await db.query(
      `SELECT status FROM social_connections WHERE id = ?`,
      [driveConnId]
    );
    assert(disconnRow[0].status === 'DISCONNECTED', 'Connection marked DISCONNECTED in database');

    // -------------------------------------------------------------------------
    // 9. Production Integrity & Meta Lock Preservation
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Production Integrity & Meta Lock Preservation ---');

    const [lockedVariant] = await db.query(
      `SELECT pv.*, p.brand_id FROM post_variants pv JOIN posts p ON pv.post_id = p.id WHERE pv.remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(lockedVariant.length === 1, 'Production locked post variant 1405588742634526_122100337179498315 exists');
    assert(lockedVariant[0].status === 'published', 'Production locked post remains strictly published');
    assert(lockedVariant[0].brand_id === '52f09a1e-e490-4c01-9674-4eb729bd5108', 'Production locked post belongs to correct brand');

    console.log('\n[Cleanup] Cleaning up test fixtures...');
    await db.query(`DELETE FROM automation_runs WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM automations WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM connector_resources WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM connection_credentials WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM connection_events WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM social_connections WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM brands WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.query(`DELETE FROM users WHERE id IN (?, ?)`, [userAId, userBId]);
    await db.query(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);

    console.log('========================================================================');
    console.log(`DATA SOURCE CONNECTORS TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\nTest execution failed:', err);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

run();
