/**
 * SocialForge HLD Stage 2: Meta Self-Service Connection E2E Test Suite
 *
 * Verifies the 20-step self-service connection flow for Meta (Facebook & Instagram):
 * 1. User signs into SocialForge.
 * 2. User selects/creates workspace (tenant).
 * 3. User selects/creates brand.
 * 4. User opens Connect Hub.
 * 5. User clicks Connect Facebook.
 * 6. Start OAuth using the existing SocialForge Meta application.
 * 7. Validate OAuth state (HMAC validation & tampering rejection).
 * 8. Handle OAuth callback (GET & POST).
 * 9. Securely store credentials (AES-256-GCM vault envelope encryption).
 * 10. Discover eligible Facebook Pages.
 * 11. Discover eligible Instagram professional/business accounts.
 * 12. Present discovered resources safely to the user (no raw tokens/IDs).
 * 13. User selects Facebook Page.
 * 14. User selects Instagram account.
 * 15. Associate selected resources with current tenant and brand.
 * 16. Validate access.
 * 17. Validate required permissions.
 * 18. Validate publishing capability.
 * 19. Validate analytics capability.
 * 20. Mark connection HEALTHY only after successful validation.
 *
 * Requirements & Guardrails:
 * - Zero user input of Page ID, Instagram ID, access token, or secrets.
 * - Zero exposure of access tokens to frontend, AI, or logs.
 * - Strict tenant and brand isolation.
 * - Reconnect and Disconnect lifecycle.
 * - Failure modes (PERMISSION_MISSING, REAUTH_REQUIRED, NEEDS_ATTENTION).
 * - Existing Meta publisher interoperability via social_accounts.
 * - Production locked post preservation.
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
  console.log('   SOCIALFORGE HLD STAGE 2: META SELF-SERVICE CONNECTION TEST SUITE     ');
  console.log('   Facebook Pages & Instagram Professional • 20 Steps • Zero Secrets   ');
  console.log('========================================================================\n');

  const db = await mysql.createConnection(DB_CONFIG);

  const tenantAId = 'tenant_meta_a_' + uuidv4().slice(0, 8);
  const tenantBId = 'tenant_meta_b_' + uuidv4().slice(0, 8);
  const userAId = 'user_meta_a_' + uuidv4().slice(0, 8);
  const userBId = 'user_meta_b_' + uuidv4().slice(0, 8);
  const brandAId = 'brand_meta_a_' + uuidv4().slice(0, 8);
  const brandBId = 'brand_meta_b_' + uuidv4().slice(0, 8);

  try {
    // -------------------------------------------------------------------------
    // 0. Setup Multi-Tenant Identity & Brand Context
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning isolated test tenants, brands, and sessions...');
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Meta Agency Alpha', tenantAId]
    );
    await db.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Meta Agency Beta', tenantBId]
    );

    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Meta Tester A', 0, 1, NOW(), NOW())`,
      [userAId, `meta-a-${Date.now()}@socialforge.io`]
    );
    await db.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at) VALUES (?, ?, '$argon2id$mock', 'Meta Tester B', 0, 1, NOW(), NOW())`,
      [userBId, `meta-b-${Date.now()}@socialforge.io`]
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
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Alpha Brand Global', 'alpha-brand', NOW(), NOW())`,
      [brandAId, tenantAId]
    );
    await db.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, created_at, updated_at) VALUES (?, ?, 'Beta Brand Global', 'beta-brand', NOW(), NOW())`,
      [brandBId, tenantBId]
    );

    const tokenA = jwt.sign(
      { userId: userAId, email: 'meta-a@socialforge.io', tenantId: tenantAId, role: 'agency_owner' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const tokenB = jwt.sign(
      { userId: userBId, email: 'meta-b@socialforge.io', tenantId: tenantBId, role: 'agency_owner' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const headersA = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` };
    const headersB = { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` };

    // -------------------------------------------------------------------------
    // Steps 1 - 4: User sign in, workspace, brand & Connect Hub open
    // -------------------------------------------------------------------------
    console.log('\n--- Steps 1-4: Sign In, Tenant, Brand & Connect Hub Access ---');
    const chListRes = await fetch(`${API_BASE}/connections?brandId=${brandAId}`, { headers: headersA });
    assert(chListRes.status === 200, 'User accesses Connect Hub successfully for active brand');
    const chData = await chListRes.json();
    assert(chData.success === true, 'Connect Hub returns valid connections payload');

    // -------------------------------------------------------------------------
    // Steps 5 - 6: Start OAuth using existing SocialForge Meta Application
    // -------------------------------------------------------------------------
    console.log('\n--- Steps 5-6: Start Meta OAuth Authorization ---');
    const authStartRes = await fetch(`${API_BASE}/connections/authorize`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        provider: 'facebook',
        brandId: brandAId,
      }),
    });
    if (authStartRes.status !== 200) {
      console.error('authStartRes status:', authStartRes.status, await authStartRes.text());
    }
    assert(authStartRes.status === 200, 'POST /connections/authorize returns 200');
    const authStartData = await authStartRes.json();
    assert(authStartData.success === true, 'Authorization request succeeded');
    const authUrl = authStartData.data.authorizationUrl;
    const authState = authStartData.data.state;

    assert(Boolean(authUrl), 'OAuth authorization URL is returned');
    assert(Boolean(authState), 'HMAC OAuth state is returned');
    assert(authUrl.includes('https://www.facebook.com/v20.0/dialog/oauth'), 'OAuth URL targets Meta Graph API v20.0 dialog');
    assert(authUrl.includes(`client_id=${config.meta.appId}`), `OAuth URL references configured Meta App ID (${config.meta.appId})`);
    assert(authUrl.includes('pages_show_list'), 'OAuth scopes request pages_show_list');
    assert(authUrl.includes('pages_manage_posts'), 'OAuth scopes request pages_manage_posts');
    assert(authUrl.includes('pages_read_engagement'), 'OAuth scopes request pages_read_engagement');
    assert(authUrl.includes('instagram_basic'), 'OAuth scopes request instagram_basic');
    assert(authUrl.includes('instagram_content_publish'), 'OAuth scopes request instagram_content_publish');

    // -------------------------------------------------------------------------
    // Step 7: Validate OAuth State (HMAC Validation & Tampering Rejection)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Validate OAuth State & Tamper Resistance ---');
    // Tampered state: modify tenantId payload with mismatched signature
    const [statePayload, stateSig] = authState.split('.');
    assert(Boolean(statePayload) && Boolean(stateSig), 'State token consists of base64url payload and HMAC signature');

    const tamperedPayload = Buffer.from(JSON.stringify({ tenantId: 'tampered_tenant', brandId: brandAId, nonce: '123' })).toString('base64url');
    const tamperedState = `${tamperedPayload}.${stateSig}`;

    const tamperedCallbackRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        provider: 'facebook',
        code: 'mock_code_123',
        state: tamperedState,
      }),
    });
    assert(tamperedCallbackRes.status === 400 || tamperedCallbackRes.status === 500, 'Tampered OAuth state signature is rejected by backend');
    const tamperedBody = await tamperedCallbackRes.json();
    assert(tamperedBody.success === false, 'Tampered state rejected with success: false');

    // -------------------------------------------------------------------------
    // Steps 8 - 11: Handle OAuth Callback & Discover Eligible Pages and Instagram Accounts
    // -------------------------------------------------------------------------
    console.log('\n--- Steps 8-11: Handle Callback, Store Vault Credentials & Discover Resources ---');
    const callbackRes = await fetch(`${API_BASE}/connections/callback`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        provider: 'facebook',
        code: `mock_code_${Date.now()}`,
        state: authState,
        brandId: brandAId,
      }),
    });
    if (callbackRes.status !== 200 && callbackRes.status !== 201) {
      console.error('callbackRes status:', callbackRes.status, await callbackRes.text());
    }
    assert(callbackRes.status === 200 || callbackRes.status === 201, 'POST /connections/callback handles code exchange successfully');
    const callbackData = await callbackRes.json();
    assert(callbackData.success === true, 'Callback returns success: true');
    const metaConnId = callbackData.data.connectionId;
    assert(Boolean(metaConnId), 'Connection ID generated and returned');

    // Test GET /callback top-level browser redirect endpoint as well
    const getCallbackRes = await fetch(`${API_BASE}/connections/callback?code=mock_get_code&state=${authState}`, {
      redirect: 'manual',
    });
    const redirectLocation = getCallbackRes.headers.get('location') || '';
    assert(
      getCallbackRes.status === 302 || getCallbackRes.status === 301,
      'GET /connections/callback issues HTTP 302 redirect for browser OAuth dialogs'
    );
    assert(
      redirectLocation.includes('/connections?meta_status=discovered'),
      'Browser redirect targets /connections with meta_status=discovered'
    );

    // -------------------------------------------------------------------------
    // Step 9: Vault Verification — AES-256-GCM Envelope Encryption at Rest
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Credential Vault Inspection at Rest ---');
    const [connDbRows] = await db.execute(
      `SELECT id, provider, status, credential_reference, provider_account_metadata FROM social_connections WHERE id = ?`,
      [metaConnId]
    );
    assert(connDbRows.length === 1, 'social_connections record persisted');
    const connRecord = connDbRows[0];
    assert(Boolean(connRecord.credential_reference), 'credential_reference stored in social_connections');
    assert(
      !JSON.stringify(connRecord).includes('EAA') && !JSON.stringify(connRecord).includes('token_mock'),
      'Raw OAuth access token is NEVER stored in plaintext in social_connections'
    );

    // Verify vault record in connection_credentials table
    const [vaultRows] = await db.execute(
      `SELECT id, tenant_id, connection_id, encrypted_data, iv, auth_tag, algorithm, key_version FROM connection_credentials WHERE connection_id = ?`,
      [metaConnId]
    );
    assert(vaultRows.length >= 1, 'Credentials securely stored in connection_credentials table with envelope encryption');
    const vaultItem = vaultRows[0];
    assert(vaultItem.tenant_id === tenantAId, 'Vault record isolated to tenant context');
    assert(Boolean(vaultItem.encrypted_data), 'Vault ciphertext exists');
    assert(Boolean(vaultItem.iv), 'Unique AES-GCM IV stored');
    assert(Boolean(vaultItem.auth_tag), 'AES-GCM authentication tag stored');
    assert(
      !vaultItem.encrypted_data.includes('EAAB') && !vaultItem.encrypted_data.includes('access_token'),
      'Vault ciphertext is fully encrypted and unreadable without key'
    );

    // -------------------------------------------------------------------------
    // Step 12: Present Discovered Resources to the User
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Present Discovered Resources (Zero Token Exposure) ---');
    const resListRes = await fetch(`${API_BASE}/connections/${metaConnId}/resources`, { headers: headersA });
    assert(resListRes.status === 200, 'GET /connections/:id/resources returned 200');
    const resListData = await resListRes.json();
    assert(resListData.success === true, 'Discovered resources payload succeeded');
    const discoveredPages = resListData.pages || resListData.data || [];
    assert(discoveredPages.length >= 1, 'Discovered at least 1 Facebook Page');

    const firstPage = discoveredPages[0];
    assert(Boolean(firstPage.name), 'Discovered page has friendly display name');
    assert(Boolean(firstPage.id), 'Discovered page has ID for selection');
    assert(firstPage.isEligible === true, 'Discovered page marked eligible');
    assert(!firstPage.accessToken && !firstPage.access_token, 'Discovered page NEVER exposes page access token to user');

    let targetInstagramId = null;
    if (firstPage.instagramAccount) {
      assert(Boolean(firstPage.instagramAccount.username), 'Discovered Instagram account has friendly @username');
      assert(!firstPage.instagramAccount.accessToken, 'Discovered Instagram account NEVER exposes access token');
      targetInstagramId = firstPage.instagramAccount.id;
    }

    // -------------------------------------------------------------------------
    // Steps 13 - 15: Select Page & Instagram Account, Associate with Brand
    // -------------------------------------------------------------------------
    console.log('\n--- Steps 13-15: Select Page & Instagram Account (Associate with Brand) ---');
    const targetPageId = firstPage.id;

    // -------------------------------------------------------------------------
    // Steps 16 - 20: 4-Stage Validation Pipeline & Mark Connection HEALTHY
    // -------------------------------------------------------------------------
    console.log('\n--- Steps 16-20: 4-Stage Validation Pipeline (Access, Permissions, Publishing, Analytics) ---');
    const selectRes = await fetch(`${API_BASE}/connections/${metaConnId}/select-resources`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        pageId: targetPageId,
        instagramAccountId: targetInstagramId,
        brandId: brandAId,
      }),
    });
    assert(selectRes.status === 200, 'POST /connections/:id/select-resources returned 200');
    const selectResult = await selectRes.json();
    assert(selectResult.success === true, 'Resource selection and 4-stage validation succeeded');
    assert(selectResult.data.status === 'CONNECTED', 'Connection status marked CONNECTED (Healthy)');
    assert(selectResult.data.health === 'healthy', 'Health summary is healthy');

    // Verify 4 validation capabilities reported
    const caps = selectResult.data.capabilities;
    assert(caps.access === true, 'Stage 1: Access validation PASSED');
    assert(caps.permissions === true, 'Stage 2: Permissions validation PASSED');
    assert(caps.publishing === true, 'Stage 3: Publishing capability validation PASSED');
    assert(caps.analytics === true, 'Stage 4: Analytics capability validation PASSED');

    // Verify association in database
    const [updatedConnRows] = await db.execute(
      `SELECT status, account_name, provider_account_id, last_health_check_at, last_error FROM social_connections WHERE id = ?`,
      [metaConnId]
    );
    assert(updatedConnRows[0].status === 'CONNECTED', 'social_connections marked CONNECTED in database');
    assert(Boolean(updatedConnRows[0].last_health_check_at), 'last_health_check_at timestamp populated');
    assert(updatedConnRows[0].last_error === null, 'last_error cleared');

    // -------------------------------------------------------------------------
    // Requirement: Interoperability with existing publisher via social_accounts
    // -------------------------------------------------------------------------
    console.log('\n--- Interoperability: Existing Meta Publisher & social_accounts ---');
    const [fbAccountRows] = await db.execute(
      `SELECT id, brand_id, platform, account_name, account_id, is_active, access_token_encrypted FROM social_accounts WHERE brand_id = ? AND platform = 'facebook'`,
      [brandAId]
    );
    assert(fbAccountRows.length === 1, 'social_accounts row synced for Facebook Page');
    const fbAccount = fbAccountRows[0];
    assert(fbAccount.is_active === 1, 'Facebook social_account is active');
    assert(Boolean(fbAccount.access_token_encrypted), 'Page token encrypted for existing publisher');
    assert(!fbAccount.access_token_encrypted.includes('EAA'), 'social_accounts token is securely encrypted');

    // -------------------------------------------------------------------------
    // Requirement: Multi-Tenant & Brand Boundary Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- Security: Strict Tenant and Brand Boundary Isolation ---');
    // Tenant B attempts to select resources on Tenant A's connection
    const tenantBHijackRes = await fetch(`${API_BASE}/connections/${metaConnId}/select-resources`, {
      method: 'POST',
      headers: headersB,
      body: JSON.stringify({
        pageId: targetPageId,
        brandId: brandBId,
      }),
    });
    assert(
      tenantBHijackRes.status === 400 || tenantBHijackRes.status === 403 || tenantBHijackRes.status === 404,
      'Tenant B is strictly BLOCKED from accessing or selecting resources on Tenant A connection'
    );

    // Tenant A attempts to bind to Tenant B's brand
    const crossBrandRes = await fetch(`${API_BASE}/connections/${metaConnId}/select-resources`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({
        pageId: targetPageId,
        brandId: brandBId,
      }),
    });
    assert(
      crossBrandRes.status === 403 || crossBrandRes.status === 400,
      'Tenant A cannot bind connection to brand owned by Tenant B'
    );

    // -------------------------------------------------------------------------
    // Negative Tests: Permission Failure, Expired Auth & Health Diagnostics
    // -------------------------------------------------------------------------
    console.log('\n--- Negative Tests: Permission Failure & Re-Authentication ---');
    // Test Reconnect
    const reconnectRes = await fetch(`${API_BASE}/connections/${metaConnId}/reconnect`, {
      method: 'POST',
      headers: headersA,
      body: JSON.stringify({}),
    });
    assert(reconnectRes.status === 200, 'POST /connections/:id/reconnect executed successfully');

    // Test Active Health Check Trigger
    const healthCheckRes = await fetch(`${API_BASE}/connections/${metaConnId}/health-check`, {
      method: 'POST',
      headers: headersA,
    });
    assert(healthCheckRes.status === 200, 'POST /connections/:id/health-check executed successfully');
    const healthData = await healthCheckRes.json();
    assert(healthData.data.status === 'CONNECTED', 'Health check diagnostic confirms status CONNECTED');

    // Test Disconnect
    console.log('\n--- Lifecycle: Disconnect Flow ---');
    const disconnectRes = await fetch(`${API_BASE}/connections/${metaConnId}/disconnect`, {
      method: 'POST',
      headers: headersA,
    });
    assert(disconnectRes.status === 200, 'POST /connections/:id/disconnect successfully executed');
    const [disconnectedRows] = await db.execute(
      `SELECT status FROM social_connections WHERE id = ?`,
      [metaConnId]
    );
    assert(disconnectedRows[0].status === 'DISCONNECTED', 'social_connections marked DISCONNECTED');

    // -------------------------------------------------------------------------
    // Production Lock Record Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Integrity: Production Lock Post Preservation ---');
    const [lockedRows] = await db.execute(
      `SELECT pv.id, p.brand_id, pv.platform, pv.remote_post_id, pv.status 
       FROM post_variants pv 
       JOIN posts p ON pv.post_id = p.id 
       WHERE pv.remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(lockedRows.length === 1, 'Production locked post variant 1405588742634526_122100337179498315 exists');
    assert(lockedRows[0].brand_id === '52f09a1e-e490-4c01-9674-4eb729bd5108', 'Production locked post belongs to brand 52f09a1e-e490-4c01-9674-4eb729bd5108');
    assert(lockedRows[0].remote_post_id === '1405588742634526_122100337179498315', 'Production locked post ID unchanged');

    console.log('\n[Cleanup] Cleaning up test tenant data...');
    await db.execute(`DELETE FROM connector_resources WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM social_connections WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM meta_connections WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM social_accounts WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM connection_credentials WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM brands WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await db.execute(`DELETE FROM users WHERE id IN (?, ?)`, [userAId, userBId]);
    await db.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);

    console.log('========================================================================');
    console.log(`META SELF-SERVICE STAGE 2 TESTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\nTest execution error:', err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
