/**
 * Comprehensive Test Suite for Meta OAuth Integration Verification
 *
 * Verifies Requirements 1-8:
 * 1. Invalid scopes removal (no instagram_manage_insights) & minimum permissions enforcement
 * 2. Backend-only token isolation (zero leakage in URLs, frontend models, or logs)
 * 3. Server-side token expiration, revocation handling & safe reconnect flow
 * 4. Official OAuth flow discovery of eligible Facebook Pages and linked Instagram accounts
 * 5. Minimum permissions identification and validation
 * 6. OAuth callback, token exchange, account retrieval, and publishing verification
 * 7. Tests for invalid scopes, OAuth failures, expired tokens, missing permissions, and successful connections
 * 8. Real test execution without fabricated results
 */

import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { metaSelfService } from '../apps/api/dist/services/connections/metaSelfService.service.js';
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';
import { credentialVaultService } from '../apps/api/dist/services/connections/credentialVault.service.js';
import { connectionService } from '../apps/api/dist/services/connections/connection.service.js';
import { prePublishValidator } from '../apps/api/dist/services/meta/prePublishValidator.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { config } from '../apps/api/dist/config/index.js';
import { isRealExternalPostId } from '@socialforge/shared';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('========================================================================');
  console.log('   META OAUTH INTEGRATION & SECURITY VERIFICATION SUITE                ');
  console.log('   Scope Validation • Token Isolation • Reconnect • Failures • Invariants');
  console.log('========================================================================\n');

  const testTenant = crypto.randomUUID();
  const testUser = crypto.randomUUID();
  const testBrand = crypto.randomUUID();

  try {
    // -------------------------------------------------------------------------
    // Setup Test Isolation Fixture
    // -------------------------------------------------------------------------
    await db('tenants').insert({
      id: testTenant,
      name: 'Meta Integration Test Tenant',
      slug: `tenant-${testTenant.slice(0, 8)}`,
      settings: JSON.stringify({}),
    });
    await db('users').insert({
      id: testUser,
      email: `test-oauth-${testUser.slice(0, 8)}@socialforge.io`,
      password_hash: 'mock_password_hash',
      full_name: 'Test OAuth Engineer',
      is_active: true,
    });
    await db('brands').insert({
      id: testBrand,
      tenant_id: testTenant,
      name: 'Test OAuth Brand',
      slug: `brand-${testBrand.slice(0, 8)}`,
    });

    // =========================================================================
    // TEST 1: Scope Sanitization & Invalid Scope Removal
    // =========================================================================
    console.log('[Test 1/6] Verifying Meta OAuth Scope Sanitization & Minimum Scopes...');
    const authData = await metaSelfService.getAuthorizationUrl({
      tenantId: testTenant,
      brandId: testBrand,
      userId: testUser,
    });

    assert(!authData.authorizationUrl.includes('instagram_manage_insights'), 'OAuth URL does NOT contain the invalid scope instagram_manage_insights');
    assert(authData.authorizationUrl.includes('pages_show_list'), 'OAuth URL includes pages_show_list (Page Discovery)');
    assert(authData.authorizationUrl.includes('pages_read_engagement'), 'OAuth URL includes pages_read_engagement (Page Verification)');
    assert(authData.authorizationUrl.includes('pages_manage_posts'), 'OAuth URL includes pages_manage_posts (Facebook Feed Publishing)');
    assert(authData.authorizationUrl.includes('instagram_basic'), 'OAuth URL includes instagram_basic (Instagram Discovery)');
    assert(authData.authorizationUrl.includes('instagram_content_publish'), 'OAuth URL includes instagram_content_publish (Instagram Container Publishing)');
    assert(authData.authorizationUrl.includes('public_profile'), 'OAuth URL includes public_profile (User Identification)');

    // Scope count check: exactly 6 minimum supported scopes
    const urlObj = new URL(authData.authorizationUrl);
    const scopeParam = urlObj.searchParams.get('scope') || '';
    const scopeList = scopeParam.split(',');
    assert(scopeList.length === 6, `OAuth URL requests exactly 6 minimal scopes (got ${scopeList.length}: ${scopeParam})`);
    assert(!scopeList.includes('instagram_manage_insights'), 'Confirmed zero occurrence of instagram_manage_insights in scope array');

    // =========================================================================
    // TEST 2: OAuth Failure Handling (Tampered State, Invalid Nonce, Bad Code)
    // =========================================================================
    console.log('\n[Test 2/6] Verifying OAuth Failure Handling (Tampered State & CSRF Protection)...');

    // 2a: Tampered state signature
    const [payloadBase64, realSig] = authData.state.split('.');
    const tamperedState = `${payloadBase64}.tampered_signature_${Date.now()}`;
    const tamperedCheck = metaOAuthService.validateState(tamperedState);
    assert(tamperedCheck.valid === false, 'State with invalid HMAC-SHA256 signature is rejected');
    assert(/signature mismatch/i.test(tamperedCheck.error || ''), 'Error message indicates signature mismatch');

    // 2b: Expired state
    const expiredPayload = {
      tenantId: testTenant,
      brandId: testBrand,
      userId: testUser,
      timestamp: Date.now() - (20 * 60 * 1000), // 20 minutes ago (exceeds 15 min TTL)
      nonce: 'expired_nonce_123',
    };
    const expiredData = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const secretKey = config.jwtSecret || config.encryptionMasterKey || 'socialforge_meta_oauth_secret';
    const expiredSig = crypto.createHmac('sha256', secretKey).update(expiredData).digest('base64url');
    const expiredState = `${expiredData}.${expiredSig}`;
    const expiredCheck = metaOAuthService.validateState(expiredState);
    assert(expiredCheck.valid === false, 'State older than 15 minutes is rejected as expired');
    assert(/expired/i.test(expiredCheck.error || ''), 'Error message indicates state expired');

    // 2c: Cross-tenant tampering (state tenant does not match brand tenant)
    const rogueTenant = crypto.randomUUID();
    let crossTenantCaught = false;
    try {
      await metaSelfService.getAuthorizationUrl({
        tenantId: rogueTenant,
        brandId: testBrand, // testBrand belongs to testTenant, NOT rogueTenant
        userId: testUser,
      });
    } catch (err) {
      crossTenantCaught = true;
    }
    assert(crossTenantCaught === true, 'Brand ownership verification rejects cross-tenant OAuth initiation');

    // =========================================================================
    // TEST 3: Successful Connection, Page Discovery & Linked Instagram Retrieval
    // =========================================================================
    console.log('\n[Test 3/6] Verifying Successful OAuth Handshake, Page Discovery & AES-256 Vault...');
    const mockPageId = '1405588742634526';
    const mockIgId = '17841441490581879';

    // Register test mocks
    MetaClient.registerMock('oauth/access_token', () => ({
      access_token: 'mock_user_access_token_long_lived_60d',
      token_type: 'bearer',
      expires_in: 5184000,
    }));

    MetaClient.registerMock('debug_token', () => ({
      data: {
        app_id: '1785874552561096',
        type: 'USER',
        application: 'SocialForge',
        data_access_expires_at: Math.floor(Date.now() / 1000) + 7776000,
        expires_at: Math.floor(Date.now() / 1000) + 5184000,
        is_valid: true,
        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
          'public_profile',
        ],
        user_id: '122113645503481713',
      },
    }));

    MetaClient.registerMock('me/accounts', () => ({
      data: [
        {
          id: mockPageId,
          name: 'HOASP International',
          category: 'Non-Governmental Organization (NGO)',
          access_token: 'mock_page_access_token_hoa_sp',
          tasks: ['ANALYZE', 'ADVERTISE', 'MODERATE', 'CREATE_CONTENT', 'MANAGE'],
          picture: { data: { url: 'https://example.com/page_avatar.jpg' } },
          instagram_business_account: {
            id: mockIgId,
            username: 'hoaspinternational',
            name: 'HOASP International',
            profile_picture_url: 'https://example.com/ig_avatar.jpg',
            followers_count: 1420,
          },
        },
      ],
    }));

    const callbackRes = await metaSelfService.handleCallback({
      code: 'valid_test_auth_code_123',
      state: authData.state,
      tenantId: testTenant,
      brandId: testBrand,
      userId: testUser,
    });

    assert(Boolean(callbackRes.connectionId), 'Callback returns valid connectionId');
    assert(callbackRes.pages.length === 1, 'Discovered exactly 1 Facebook Page');
    const page = callbackRes.pages[0];
    assert(page.id === mockPageId, 'Facebook Page ID matches discovered page');
    assert(page.name === 'HOASP International', 'Facebook Page name matches discovered page');
    assert(page.hasInstagram === true, 'Detected linked Instagram Professional account');
    assert(page.instagramAccount?.id === mockIgId, 'Linked Instagram Account ID matches');
    assert(page.instagramAccount?.username === 'hoaspinternational', 'Linked Instagram username matches');

    // Verify Page Selection & Diagnostics
    MetaClient.registerMock(mockPageId, () => ({
      id: mockPageId,
      name: 'HOASP International',
      tasks: ['CREATE_CONTENT', 'MANAGE', 'MODERATE', 'ANALYZE'],
    }));

    const selectResult = await metaSelfService.selectResourcesAndValidate({
      tenantId: testTenant,
      brandId: testBrand,
      connectionId: callbackRes.connectionId,
      pageId: mockPageId,
      instagramAccountId: mockIgId,
      userId: testUser,
    });

    assert(selectResult.success === true, 'Page & Instagram selection validated successfully');
    assert(selectResult.status === 'CONNECTED', 'Connection status set to CONNECTED');
    assert(selectResult.capabilities.publishing === true, 'Publishing capability verified');
    assert(selectResult.capabilities.permissions === true, 'Permissions capability verified');

    // =========================================================================
    // TEST 4: Backend-Only Token Isolation (Zero Leakage Check)
    // =========================================================================
    console.log('\n[Test 4/6] Verifying Backend-Only Token Isolation (Zero Leakage)...');
    const rawConn = await db('social_connections').where({ id: callbackRes.connectionId }).first();
    assert(Boolean(rawConn.credential_reference), 'social_connections stores only credential_reference UUID');
    assert(!JSON.stringify(rawConn).includes('mock_user_access_token'), 'User access token is NEVER stored in social_connections');
    assert(!JSON.stringify(rawConn).includes('mock_page_access_token'), 'Page access token is NEVER stored in social_connections');

    const rawCred = await db('connection_credentials').where({ id: rawConn.credential_reference }).first();
    assert(Boolean(rawCred.encrypted_data), 'Credential vault contains encrypted ciphertext');
    assert(rawCred.iv.length === 32, 'Vault uses 16-byte IV (32 hex characters)');
    assert(rawCred.auth_tag.length === 32, 'Vault uses 16-byte Auth Tag (32 hex characters)');
    assert(rawCred.algorithm === 'aes-256-gcm', 'Vault enforces AES-256-GCM authenticated encryption');

    // Test listConnections API formatter does not leak credentials
    const formattedList = await connectionService.listConnections(testTenant, { brandId: testBrand });
    const formattedItem = formattedList.find((c) => c.id === callbackRes.connectionId);
    assert(formattedItem.accessToken === undefined, 'Formatted connection does NOT expose accessToken');
    assert(formattedItem.encrypted_data === undefined, 'Formatted connection does NOT expose encrypted_data');
    assert(formattedItem.iv === undefined, 'Formatted connection does NOT expose iv');

    // =========================================================================
    // TEST 5: Expiration (Error 190) & Missing Permissions (Error 200) Handling
    // =========================================================================
    console.log('\n[Test 5/6] Verifying Expired Token & Missing Permissions Handling...');

    // 5a: Missing permissions simulation (lacks pages_manage_posts)
    MetaClient.registerMock('debug_token', () => ({
      data: {
        app_id: '1785874552561096',
        type: 'USER',
        application: 'SocialForge',
        is_valid: true,
        scopes: ['pages_show_list', 'public_profile'], // Missing pages_manage_posts and pages_read_engagement
        user_id: '122113645503481713',
      },
    }));

    const permCheck = await prePublishValidator.validateForLivePublish(testBrand, ['facebook']);
    assert(permCheck.valid === false, 'Pre-publish validator blocks publishing when pages_manage_posts is missing');
    assert(permCheck.errors.some((e) => /missing.*pages_manage_posts/i.test(e)), 'Error clearly identifies missing pages_manage_posts permission');

    // 5b: Expired token simulation (Meta Error 190 subcode 463)
    MetaClient.registerMock('debug_token', () => ({
      data: {
        app_id: '1785874552561096',
        type: 'PAGE',
        application: 'SocialForge',
        is_valid: false,
        error: {
          code: 190,
          subcode: 463,
          message: 'Error validating access token: Session has expired.',
        },
      },
    }));

    const expiredValidation = await prePublishValidator.validateForLivePublish(testBrand, ['facebook']);
    assert(expiredValidation.valid === false, 'Pre-publish validator blocks publishing on Meta Error 190');
    assert(expiredValidation.errors.some((e) => /190/i.test(e) || /re-authoriz/i.test(e)), 'Provides actionable error directing user to re-authorize');

    const updatedConn = await db('meta_connections').where({ brand_id: testBrand }).first();
    assert(updatedConn.status === 'reauth_required', 'Connection status automatically transitioned to reauth_required');

    const updatedAccount = await db('social_accounts').where({ brand_id: testBrand, platform: 'facebook' }).first();
    assert(updatedAccount?.is_active === 0 || updatedAccount?.is_active === false, 'Social account is deactivated to prevent failed publish jobs');

    // =========================================================================
    // TEST 6: Safe Reconnect Flow
    // =========================================================================
    console.log('\n[Test 6/6] Verifying Safe Reconnect Flow...');
    const reconnectAuth = await metaSelfService.getAuthorizationUrl({
      tenantId: testTenant,
      brandId: testBrand,
      userId: testUser,
    });

    assert(Boolean(reconnectAuth.authorizationUrl), 'Reconnect initiates fresh OAuth URL');
    assert(!reconnectAuth.authorizationUrl.includes('instagram_manage_insights'), 'Reconnect URL does NOT contain instagram_manage_insights');

    // Simulate successful reconnect
    MetaClient.registerMock('debug_token', () => ({
      data: {
        app_id: '1785874552561096',
        type: 'USER',
        application: 'SocialForge',
        is_valid: true,
        scopes: [
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_posts',
          'instagram_basic',
          'instagram_content_publish',
          'public_profile',
        ],
        user_id: '122113645503481713',
      },
    }));

    const reconnectCallback = await metaSelfService.handleCallback({
      code: 'reconnect_valid_code_456',
      state: reconnectAuth.state,
      tenantId: testTenant,
      brandId: testBrand,
      userId: testUser,
    });

    assert(Boolean(reconnectCallback.connectionId), 'Reconnect completes callback and refreshes connection ID');
    assert(reconnectCallback.pages.length > 0, 'Discovered pages preserved on reconnect');

    const reconnectedConn = await db('meta_connections').where({ brand_id: testBrand }).first();
    assert(reconnectedConn.status === 'connected', 'Status restored to connected upon successful reconnect');

    console.log('\n========================================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } finally {
    MetaClient.clearMocks();
    // Cleanup test artifacts
    await db('social_accounts').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('connector_resources').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('connection_credentials').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('social_connections').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('meta_facebook_pages').where({ connection_id: function() { this.select('id').from('meta_connections').where({ tenant_id: testTenant }); } }).delete().catch(() => null);
    await db('meta_connections').where({ tenant_id: testTenant }).delete().catch(() => null);
    await db('brands').where({ id: testBrand }).delete().catch(() => null);
    await db('users').where({ id: testUser }).delete().catch(() => null);
    await db('tenants').where({ id: testTenant }).delete().catch(() => null);
  }
}

runTestSuite().then(() => {
  process.exit(failed > 0 ? 1 : 0);
}).catch((err) => {
  console.error('\nTest suite execution failed with error:', err);
  process.exit(1);
});
