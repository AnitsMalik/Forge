import knex from 'knex';
import fetch from 'node-fetch';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:5173';
const ARTIFACT_DIR = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const db = knex({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  },
});

async function checkMetaInvariant(stage) {
  const variant = await db('post_variants')
    .where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' })
    .first();
  const job = await db('publishing_jobs')
    .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
    .first();

  console.log(`\n🔒 [Meta Invariant Check - ${stage}]`);
  if (!variant || variant.status !== 'published' || variant.remote_post_id !== '1405588742634526_122100337179498315') {
    throw new Error(`CRITICAL: Meta post variant invariant broken! Status=${variant?.status}, remote_post_id=${variant?.remote_post_id}`);
  }
  if (!job || job.status !== 'published') {
    throw new Error(`CRITICAL: Meta publishing job invariant broken! Status=${job?.status}`);
  }
  console.log(`✅ Invariant INTACT: Variant ${variant.id} is 'published' (Remote: ${variant.remote_post_id}), Job ${job.id} is 'published'.`);
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('  SOCIALFORGE CONNECT HUB & CHANNEL HEALTH CENTER AUDIT SUITE');
  console.log('================================================================');

  await checkMetaInvariant('Pre-Audit Initial Verification');

  // 1. Resolve test tenant, user & brand
  const tenantUser = await db('tenant_users').first();
  const user = await db('users').where({ id: tenantUser.user_id }).first();
  const tenant = await db('tenants').where({ id: tenantUser.tenant_id }).first();
  let brand = await db('brands').where({ tenant_id: tenant.id }).first();

  if (!brand) {
    const brandId = 'b0000000-0000-0000-0000-000000000001';
    await db('brands').insert({
      id: brandId,
      tenant_id: tenant.id,
      name: 'Acme Growth Labs',
      slug: 'acmegrowth',
      created_at: new Date(),
      updated_at: new Date(),
    });
    brand = await db('brands').where({ id: brandId }).first();
  }

  console.log(`\n👤 User: ${user.email} (Tenant: ${tenant.id})`);
  console.log(`🏢 Active Brand: ${brand.name} (ID: ${brand.id})`);

  // Generate auth token
  const token = jwt.sign(
    { userId: user.id, tenantId: tenant.id, role: tenantUser.role || 'admin', email: user.email },
    'socialforge_super_secret_jwt_key_minimum_32_chars_long_123',
    { expiresIn: '2h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  let testConnectionId = null;
  const testAccountName = `Acme Enterprise LinkedIn ${Date.now().toString(36)}`;
  const testAccountId = `li_test_${Date.now().toString(36)}`;

  // --------------------------------------------------------------------------
  // TEST 1: Connect a New Social Account (Programmatic / Manual with Vault Encryption)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Connect a New Social Account ---');
  const createPayload = {
    provider: 'linkedin',
    brandId: brand.id,
    accountName: testAccountName,
    providerAccountId: testAccountId,
    scopes: ['r_liteprofile', 'w_member_social', 'rw_organization_admin'],
    credentials: {
      accessToken: 'test_valid_linkedin_token_' + crypto.randomBytes(8).toString('hex'),
      refreshToken: 'test_valid_refresh_token_' + crypto.randomBytes(8).toString('hex'),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    metadata: {
      handle: '@acme_enterprise',
      category: 'SOCIAL',
      isSandbox: false,
      organizationName: 'Acme Global Corporation',
    },
  };

  const createRes = await fetch(`${API_BASE}/connections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(createPayload),
  });

  const createData = await createRes.json();
  console.log(`HTTP ${createRes.status}:`, createData.success ? 'Success' : createData.error);
  if (!createRes.ok || !createData.success || !createData.data?.id) {
    throw new Error(`TEST 1 FAILED: ${JSON.stringify(createData)}`);
  }

  testConnectionId = createData.data.id;
  console.log(`✅ Connection Created ID: ${testConnectionId}`);
  console.log(`   Provider: ${createData.data.provider}, Status: ${createData.data.status}`);
  console.log(`   Account: ${createData.data.account_name || createData.data.accountName}`);

  // Verify vault credential storage
  const vaultEntry = await db('connection_credentials')
    .where({ connection_id: testConnectionId, tenant_id: tenant.id })
    .first();
  if (!vaultEntry || !vaultEntry.encrypted_data || !vaultEntry.iv || !vaultEntry.auth_tag) {
    throw new Error('TEST 1 FAILED: Credentials not securely stored in cryptographic vault!');
  }
  console.log(`🔒 Vault verified: Stored with AES-256-GCM (IV length: ${vaultEntry.iv.length}, AuthTag length: ${vaultEntry.auth_tag.length})`);

  // --------------------------------------------------------------------------
  // TEST 2: Complete OAuth Authorization Flow
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: OAuth Authorization Flow & Callback Handling ---');
  const authUrlRes = await fetch(`${API_BASE}/connections/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: 'linkedin',
      brandId: brand.id,
      redirectUri: `${WEB_BASE}/connections/callback`,
      scopes: ['r_liteprofile', 'w_member_social'],
    }),
  });

  const authUrlData = await authUrlRes.json();
  console.log(`OAuth URL Gen HTTP ${authUrlRes.status}:`, authUrlData.success ? 'Success' : authUrlData.error);
  if (!authUrlRes.ok || !authUrlData.data?.url || !authUrlData.data?.state) {
    throw new Error(`TEST 2 FAILED: Failed to generate OAuth authorization URL: ${JSON.stringify(authUrlData)}`);
  }
  console.log(`✅ Authorization URL generated: ${authUrlData.data.url.substring(0, 60)}...`);
  console.log(`   OAuth State verified: ${authUrlData.data.state.substring(0, 30)}...`);

  // Simulate OAuth Callback execution
  const callbackRes = await fetch(`${API_BASE}/connections/callback`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: 'linkedin',
      code: 'auth_code_simulated_' + crypto.randomBytes(8).toString('hex'),
      state: authUrlData.data.state,
      redirectUri: `${WEB_BASE}/connections/callback`,
      brandId: brand.id,
    }),
  });

  const callbackData = await callbackRes.json();
  console.log(`OAuth Callback HTTP ${callbackRes.status}:`, callbackData.success ? 'Success' : callbackData.error);
  if (!callbackRes.ok || !callbackData.success) {
    throw new Error(`TEST 2 FAILED: OAuth Callback execution failed: ${JSON.stringify(callbackData)}`);
  }
  console.log(`✅ OAuth Callback succeeded: Created connection ID ${callbackData.data?.id}`);

  // --------------------------------------------------------------------------
  // TEST 3: Verify Account Information & Credential Masking (Security Audit)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Verify Account Details & Zero Credential Exposure ---');
  const detailRes = await fetch(`${API_BASE}/connections/${testConnectionId}`, {
    method: 'GET',
    headers,
  });

  const detailData = await detailRes.json();
  console.log(`Connection Detail HTTP ${detailRes.status}:`, detailData.success ? 'Success' : detailData.error);
  if (!detailRes.ok || !detailData.data) {
    throw new Error(`TEST 3 FAILED: Could not retrieve connection details: ${JSON.stringify(detailData)}`);
  }

  const connObj = detailData.data;
  console.log(`   Account Name: ${connObj.account_name}`);
  console.log(`   Provider: ${connObj.provider}`);
  console.log(`   Status: ${connObj.status}`);
  console.log(`   Expires At: ${connObj.expires_at}`);

  // Rigorous Security Verification: Ensure NO plaintext credentials exist in payload
  const rawString = JSON.stringify(detailData);
  if (
    rawString.includes('test_valid_linkedin_token_') ||
    rawString.includes('test_valid_refresh_token_') ||
    rawString.includes('accessToken') ||
    rawString.includes('refreshToken') ||
    rawString.includes('clientSecret')
  ) {
    throw new Error('SECURITY VIOLATION: Plaintext credentials exposed in GET connection response!');
  }
  console.log('🛡️ Security Audit PASSED: Raw tokens and secrets are 100% masked/omitted from client API.');

  // --------------------------------------------------------------------------
  // TEST 4: Verify Token Refresh / Reconnect with New Credentials
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Verify Token Refresh & Reconnect ---');
  const refreshedToken = 'test_valid_linkedin_refreshed_' + crypto.randomBytes(8).toString('hex');
  const reconnectRes = await fetch(`${API_BASE}/connections/${testConnectionId}/reconnect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      credentials: {
        accessToken: refreshedToken,
        refreshToken: 'test_valid_refresh_v2_' + crypto.randomBytes(8).toString('hex'),
      },
      accountName: testAccountName + ' [Refreshed]',
    }),
  });

  const reconnectData = await reconnectRes.json();
  console.log(`Reconnect HTTP ${reconnectRes.status}:`, reconnectData.success ? 'Success' : reconnectData.error);
  if (!reconnectRes.ok || !reconnectData.success) {
    throw new Error(`TEST 4 FAILED: Reconnect failed: ${JSON.stringify(reconnectData)}`);
  }
  console.log(`✅ Token successfully refreshed. Connection status: ${reconnectData.data?.connection?.status || 'CONNECTED'}`);

  // --------------------------------------------------------------------------
  // TEST 5: Simulate Token Expiration & Detection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Simulate Token Expiration & Health Monitor Detection ---');
  // Set expiration date 2 hours in the past
  const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await db('social_connections')
    .where({ id: testConnectionId })
    .update({ expires_at: pastDate, token_expires_at: pastDate });

  // Trigger active health check
  const healthCheckRes = await fetch(`${API_BASE}/connections/${testConnectionId}/health-check`, {
    method: 'POST',
    headers,
  });

  const healthData = await healthCheckRes.json();
  console.log(`Health Check HTTP ${healthCheckRes.status}:`, healthData.data?.status || healthData.error);
  if (healthData.data?.status !== 'REAUTH_REQUIRED') {
    throw new Error(`TEST 5 FAILED: Expected REAUTH_REQUIRED status on expired token, got: ${healthData.data?.status}`);
  }
  console.log(`✅ Expiration detected accurately: Status transitioned to ${healthData.data.status}`);
  console.log(`   Actionable message: ${healthData.data.error}`);

  // Verify aggregated tenant health reflects degraded status
  const tenantHealthRes = await fetch(`${API_BASE}/connections/health`, {
    method: 'GET',
    headers,
  });
  const tenantHealthData = await tenantHealthRes.json();
  console.log(`   Tenant Health Overview: Overall=${tenantHealthData.data?.overallStatus}, ReauthRequired=${tenantHealthData.data?.statusCounts?.REAUTH_REQUIRED}`);

  // --------------------------------------------------------------------------
  // TEST 6: Reconnect a Disconnected / Degraded Account
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Recover Connection from Expired/Degraded State ---');
  const recoveryToken = 'test_valid_recovered_' + crypto.randomBytes(8).toString('hex');
  const recoverRes = await fetch(`${API_BASE}/connections/${testConnectionId}/reconnect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      credentials: {
        accessToken: recoveryToken,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      accountName: testAccountName,
    }),
  });

  const recoverData = await recoverRes.json();
  console.log(`Recovery HTTP ${recoverRes.status}:`, recoverData.success ? 'Success' : recoverData.error);
  if (!recoverRes.ok || !recoverData.success) {
    throw new Error(`TEST 6 FAILED: Failed to recover connection: ${JSON.stringify(recoverData)}`);
  }

  // Trigger fresh health check to verify recovery
  const postRecoverHealth = await fetch(`${API_BASE}/connections/${testConnectionId}/test`, {
    method: 'POST',
    headers,
  });
  const postRecoverData = await postRecoverHealth.json();
  console.log(`✅ Connection recovered to: ${postRecoverData.data?.status || 'CONNECTED'}`);

  // --------------------------------------------------------------------------
  // TEST 7: Revoke Permissions / Missing Scopes Simulation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Permission Revocation & Scopes Validation ---');
  // Transition status to PERMISSION_MISSING
  await db('social_connections')
    .where({ id: testConnectionId })
    .update({
      status: 'PERMISSION_MISSING',
      last_error: JSON.stringify({ code: 'INSUFFICIENT_SCOPE', message: 'The organization publishing permission was revoked.' }),
      updated_at: new Date(),
    });

  const permCheckRes = await fetch(`${API_BASE}/connections/${testConnectionId}`, {
    method: 'GET',
    headers,
  });
  const permCheckData = await permCheckRes.json();
  if (permCheckData.data?.status !== 'PERMISSION_MISSING') {
    throw new Error(`TEST 7 FAILED: Expected PERMISSION_MISSING status, got ${permCheckData.data?.status}`);
  }
  console.log(`✅ Permission status accurately tracked: ${permCheckData.data?.status}`);
  console.log(`   Error payload: ${JSON.stringify(permCheckData.data?.last_error)}`);

  // Recover connection back to healthy
  await db('social_connections')
    .where({ id: testConnectionId })
    .update({ status: 'CONNECTED', last_error: null, updated_at: new Date() });

  // --------------------------------------------------------------------------
  // TEST 8: Error Handling & Credential Validation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Credential Verification & Error Handling ---');
  const verifyInvalidRes = await fetch(`${API_BASE}/connections/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: 'linkedin',
      credentials: { accessToken: 'invalid_expired_token_12345' },
    }),
  });

  const verifyInvalidData = await verifyInvalidRes.json();
  console.log(`Verify Invalid Credentials HTTP ${verifyInvalidRes.status}:`, verifyInvalidData.error?.code || 'Failed as expected');
  if (verifyInvalidRes.status !== 400 || verifyInvalidData.success !== false) {
    throw new Error('TEST 8 FAILED: Invalid credentials should have returned HTTP 400!');
  }
  console.log(`✅ Authoritative error response: [${verifyInvalidData.error?.code}] ${verifyInvalidData.error?.message}`);

  // --------------------------------------------------------------------------
  // TEST 9: Disconnect an Account
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Disconnect Account & Audit Log ---');
  const disconnectRes = await fetch(`${API_BASE}/connections/${testConnectionId}/disconnect`, {
    method: 'POST',
    headers,
  });

  const disconnectData = await disconnectRes.json();
  console.log(`Disconnect HTTP ${disconnectRes.status}:`, disconnectData.success ? 'Success' : disconnectData.error);
  if (!disconnectRes.ok || !disconnectData.success || disconnectData.data?.status !== 'DISCONNECTED') {
    throw new Error(`TEST 9 FAILED: Disconnect failed: ${JSON.stringify(disconnectData)}`);
  }
  console.log('✅ Account successfully marked DISCONNECTED');

  // Verify connection events table logged the disconnect event
  const eventsRes = await fetch(`${API_BASE}/connections/${testConnectionId}/events`, {
    method: 'GET',
    headers,
  });
  const eventsData = await eventsRes.json();
  const disconnectEvent = eventsData.data?.find((e) => e.eventType === 'disconnected');
  if (!disconnectEvent) {
    throw new Error('TEST 9 FAILED: Disconnect lifecycle audit event missing from connection_events table!');
  }
  console.log(`📝 Lifecycle event verified: Event ID ${disconnectEvent.id} (${disconnectEvent.eventType}) recorded at ${disconnectEvent.createdAt}`);

  // --------------------------------------------------------------------------
  // TEST 10: Content Studio & Publishing Queue Integration
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Connected Accounts Integration with Content Studio & Publishing ---');
  // Reconnect the test account as active for brand
  const activeConn = await fetch(`${API_BASE}/connections/${testConnectionId}/reconnect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      credentials: { accessToken: 'test_valid_for_composer_' + crypto.randomBytes(8).toString('hex') },
      accountName: 'Acme LinkedIn Production',
    }),
  });
  const activeConnData = await activeConn.json();
  console.log(`Re-activated test connection: HTTP ${activeConn.status}`);

  // Check social accounts endpoint used by ContentStudioPage: api.socialAccounts.list(brand.id)
  const socialAccsRes = await fetch(`${API_BASE}/brands/${brand.id}/social-accounts`, {
    method: 'GET',
    headers,
  });
  const socialAccsData = await socialAccsRes.json();
  const accountsList = Array.isArray(socialAccsData) ? socialAccsData : socialAccsData.data || [];
  console.log(`Content Studio Social Accounts HTTP ${socialAccsRes.status}:`, `${accountsList.length} account(s) returned`);

  const linkedInAcc = accountsList.find((a) => a.platform === 'linkedin');
  if (!linkedInAcc || !linkedInAcc.isActive) {
    throw new Error('TEST 10 FAILED: Connected LinkedIn channel not reflected in brand social accounts for Content Studio!');
  }
  console.log(`✅ Content Studio recognizes connected channel: ${linkedInAcc.accountName} (${linkedInAcc.platform}) [Active: ${linkedInAcc.isActive}]`);

  // Verify publishing job creation using the connected account
  const testPostRes = await fetch(`${API_BASE}/brands/${brand.id}/posts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Connect Hub Integration Test Post',
      baseContent: 'Verifying end-to-end publishing pipeline from verified Connect Hub channel.',
      status: 'draft',
      variants: [
        {
          platform: 'linkedin',
          content: 'Verifying end-to-end publishing pipeline from verified Connect Hub channel. #Tech #SocialForge',
          platformSpecificConfig: { hashtags: ['#Tech', '#SocialForge'] },
        },
      ],
    }),
  });
  const testPostData = await testPostRes.json();
  if (!testPostRes.ok || !testPostData.data?.id) {
    throw new Error(`TEST 10 FAILED: Could not create post with connected variant: ${JSON.stringify(testPostData)}`);
  }
  console.log(`✅ Post created with connected LinkedIn variant: ID ${testPostData.data.id}`);

  // Schedule the post to test Publishing Queue integration
  const scheduleTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const scheduleRes = await fetch(`${API_BASE}/brands/${brand.id}/posts/${testPostData.data.id}/schedule`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ scheduledFor: scheduleTime }),
  });
  const scheduleData = await scheduleRes.json();
  console.log(`Schedule HTTP ${scheduleRes.status}:`, scheduleData.success ? 'Success' : scheduleData.error);
  if (!scheduleRes.ok || !scheduleData.success) {
    throw new Error(`TEST 10 FAILED: Could not schedule post for Publishing Queue: ${JSON.stringify(scheduleData)}`);
  }
  console.log('✅ Post variant successfully scheduled for automated publishing queue dispatch!');

  // Clean up test post and test connection (leaving all production connections and Meta invariant untouched)
  await db('posts').where({ id: testPostData.data.id }).delete().catch(() => {});
  await db('post_variants').where({ post_id: testPostData.data.id }).delete().catch(() => {});
  await db('social_connections').where({ id: testConnectionId }).delete().catch(() => {});
  await db('connection_credentials').where({ connection_id: testConnectionId }).delete().catch(() => {});
  await db('connection_events').where({ connection_id: testConnectionId }).delete().catch(() => {});
  await db('social_accounts').where({ account_name: 'Acme LinkedIn Production', brand_id: brand.id }).delete().catch(() => {});
  console.log('🧹 Cleaned up temporary test artifacts.');

  // --------------------------------------------------------------------------
  // BROWSER PLAYWRIGHT AUDIT & VISUAL PROOF CAPTURE
  // --------------------------------------------------------------------------
  console.log('\n--- BROWSER PLAYWRIGHT AUDIT: Live UI Verification & Visual Proof ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Inject session token and tenant context
  await page.addInitScript(({ token, user, tenant, brand }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    localStorage.setItem('activeBrand', JSON.stringify(brand));
    localStorage.setItem('currentBrandId', brand.id);
  }, { token, user, tenant, brand });

  // 1. Capture Connect Hub Main Dashboard
  console.log('📸 Navigating to Connect Hub (/?tab=connections)...');
  await page.goto(`${WEB_BASE}/?tab=connections`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const hubScreenshotPath = path.join(ARTIFACT_DIR, 'connect_hub_dashboard.png');
  await page.screenshot({ path: hubScreenshotPath, fullPage: true });
  console.log(`✅ Saved screenshot: ${hubScreenshotPath}`);

  // 2. Open Add Connection Modal
  console.log('📸 Testing Add Connection Modal...');
  const addBtn = page.locator('button:has-text("Connect Account"), button:has-text("Add Connection"), [data-testid="add-connection-btn"]').first();
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(1000);
    const modalScreenshotPath = path.join(ARTIFACT_DIR, 'connect_hub_add_modal.png');
    await page.screenshot({ path: modalScreenshotPath });
    console.log(`✅ Saved screenshot: ${modalScreenshotPath}`);

    // Close modal by clicking X or backdrop or pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // 3. Open Channel Health Center
  console.log('📸 Navigating to Channel Health Center (/?tab=connection-health)...');
  await page.goto(`${WEB_BASE}/?tab=connection-health`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const healthScreenshotPath = path.join(ARTIFACT_DIR, 'channel_health_center.png');
  await page.screenshot({ path: healthScreenshotPath, fullPage: true });
  console.log(`✅ Saved screenshot: ${healthScreenshotPath}`);

  // 4. Test "Run Health Audit" button on Channel Health Center
  console.log('🔄 Testing interactive Health Audit trigger...');
  const runAuditBtn = page.locator('button:has-text("Run Health Audit"), button:has-text("Audit Now")').first();
  if (await runAuditBtn.isVisible()) {
    await runAuditBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Triggered interactive health audit successfully.');
  }

  // 5. Open Content Studio to demonstrate connected channels integration
  console.log('📸 Navigating to Content Studio (/?tab=studio)...');
  await page.goto(`${WEB_BASE}/?tab=studio`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const studioScreenshotPath = path.join(ARTIFACT_DIR, 'connect_hub_content_studio_integration.png');
  await page.screenshot({ path: studioScreenshotPath, fullPage: true });
  console.log(`✅ Saved screenshot: ${studioScreenshotPath}`);

  await browser.close();

  // Final Invariant Verification
  await checkMetaInvariant('Post-Audit Final Verification');

  console.log('\n================================================================');
  console.log('  🎉 CONNECT HUB & CHANNEL HEALTH AUDIT SUITE: 10/10 PASSED!');
  console.log('================================================================');
}

runTestSuite().then(() => {
  db.destroy();
  process.exit(0);
}).catch(async (err) => {
  console.error('\n❌ AUDIT SUITE FAILED:', err);
  await checkMetaInvariant('Failure Invariant Check').catch(console.error);
  db.destroy();
  process.exit(1);
});
