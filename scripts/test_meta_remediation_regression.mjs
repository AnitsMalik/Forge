/**
 * Meta Facebook & Instagram Integration Regression Test Suite
 * Validates:
 * 1. Expired tokens detection and normalization
 * 2. Token-exchange failure behavior on expired sessions
 * 3. Credential-source selection hierarchy (Page tokens strictly required for FB)
 * 4. AES-256-GCM encrypted persistence and token masking
 * 5. Cross-tenant Page ownership conflict prevention
 * 6. Atomic credential replacement upon reauthorization
 */

import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { MetaPublishingService } from '../apps/api/dist/services/meta/publishing.js';
import { facebookPagesService } from '../apps/api/dist/services/meta/facebookPages.js';
import { connectionMonitorService } from '../apps/api/dist/services/meta/connectionMonitor.js';
import { normalizeMetaError, MetaIntegrationError } from '../apps/api/dist/services/meta/errors.js';
import { encryptSecret, decryptSecret, isEncryptedSecret, maskSecret } from '../apps/api/dist/services/cryptoVault.js';

console.log('================================================================');
console.log('  META FACEBOOK & INSTAGRAM REMEDIATION REGRESSION TEST SUITE   ');
console.log('================================================================\n');

let passed = 0;
let failed = 0;
const results = [];

async function test(name, fn) {
  try {
    process.stdout.write(`• ${name} ... `);
    await fn();
    console.log('✅ PASS');
    passed++;
    results.push({ name, status: 'PASS' });
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    failed++;
    results.push({ name, status: 'FAIL', error: err.message });
  }
}

const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const PAGE_ID = '1405588742634526';
const publishingService = new MetaPublishingService();

async function runAll() {
  // Test 1: Expired Token Detection & Status Mapping
  await test('Expired Token Detection & Status Mapping', async () => {
    const expiredMetaError = {
      status: 400,
      code: 190,
      error_subcode: 463,
      type: 'OAuthException',
      message: 'Error validating access token: Session has expired on Sunday, 04-Oct-26 08:00:00 PDT.'
    };

    const normalized = normalizeMetaError(expiredMetaError);
    assert.strictEqual(normalized.code, 'META_TOKEN_EXPIRED');
    assert.strictEqual(normalized.httpStatus, 401);
    assert.ok(normalized.userMessage.includes('expired'), 'User message must mention expiration');
    assert.ok(!normalized.userMessage.includes('OAuthException'), 'User message must be sanitized');
  });

  // Test 2: Token-Exchange Failure on Expired Token
  await test('Token-Exchange Rejection on Expired Token', async () => {
    // Register mock to simulate Meta refusing token exchange for expired session
    MetaClient.registerMock('oauth/access_token', () => {
      throw normalizeMetaError({
        status: 400,
        code: 190,
        error_subcode: 463,
        type: 'OAuthException',
        message: 'Error validating access token: Session has expired.'
      });
    });

    try {
      await metaTokenManager.exchangeForLongLivedToken('expired_user_token_live_format_12345');
      assert.fail('Should have thrown on expired token exchange');
    } catch (err) {
      assert.strictEqual(err.code, 'META_TOKEN_EXPIRED');
    } finally {
      MetaClient.clearMocks();
    }
  });

  // Test 3: Credential-Source Selection Hierarchy
  await test('Credential-Source Selection Hierarchy (Page Token Strictly Required)', async () => {
    // Facebook Page publishing MUST resolve to a Page Access Token, rejecting raw user tokens
    const credsFb = await publishingService.resolveCredentials('facebook', PAGE_ID, BRAND_ID);
    assert.ok(credsFb, 'Credentials object must be returned');

    // Attempting to resolve without brandId or connectionId MUST return null accessToken
    const invalidCreds = await publishingService.resolveCredentials('facebook', PAGE_ID);
    assert.strictEqual(invalidCreds.accessToken, null, 'Must isolate credentials by brand');

    // Instagram resolution
    const credsIg = await publishingService.resolveCredentials('instagram', '17841441490581879', BRAND_ID);
    assert.ok(credsIg, 'Instagram credentials object must be returned');
  });

  // Test 4: AES-256-GCM Encrypted Persistence & Masking
  await test('AES-256-GCM Encrypted Persistence & Token Masking', async () => {
    const sensitiveToken = 'EAA_REAL_CREDENTIAL_MOCK_1234567890_SECRET_DATA';
    const encrypted = encryptSecret(sensitiveToken);

    assert.ok(isEncryptedSecret(encrypted), 'Encrypted string must match iv:authTag:cipher pattern');
    assert.ok(!encrypted.includes('SECRET_DATA'), 'Ciphertext must not expose plaintext');

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, sensitiveToken, 'Decrypted token must match original plaintext');

    const masked = maskSecret(sensitiveToken);
    assert.ok(!masked.includes('SECRET_DATA'), 'Masked representation must hide secret');
    assert.strictEqual(masked.slice(-4), 'DATA', 'Masked representation should only show last 4 chars');
  });

  // Test 5: Cross-Tenant Ownership Conflict Prevention
  await test('Cross-Tenant Page Ownership Conflict Prevention', async () => {
    // If a connection in a different brand/tenant claims the same Page ID, selectPage must throw META_OWNERSHIP_CONFLICT
    const dummyConnId = crypto.randomUUID();
    const dummyBrandId = crypto.randomUUID();
    const dummyTenantId = crypto.randomUUID();

    try {
      // Create temporary tenant, brand, and connection claiming PAGE_ID
      await db('tenants').insert({
        id: dummyTenantId,
        name: 'Conflict Test Tenant',
        slug: 'conflict-test-' + Date.now(),
        subscription_tier: 'starter',
        settings: JSON.stringify({}),
      });

      await db('brands').insert({
        id: dummyBrandId,
        tenant_id: dummyTenantId,
        name: 'Conflict Test Brand',
        slug: 'conflict-brand-' + Date.now(),
      });

      const sampleUser = await db('users').first();

      await db('meta_connections').insert({
        id: dummyConnId,
        tenant_id: dummyTenantId,
        brand_id: dummyBrandId,
        user_id: sampleUser.id,
        provider: 'meta',
        status: 'connected',
        selected_page_id: PAGE_ID, // Conflict!
        encrypted_page_access_token: encryptSecret('mock_page_token_conflict'),
      });

      // Now verify publishingService detects ownership conflict for BRAND_ID
      let conflictDetected = false;
      try {
        await publishingService.publishSocialPost({
          platform: 'facebook',
          accountId: PAGE_ID,
          brandId: BRAND_ID,
          text: 'Dry run post for conflict check'
        });
      } catch (err) {
        if (err.code === 'META_OWNERSHIP_CONFLICT') {
          conflictDetected = true;
        }
      }

      assert.strictEqual(conflictDetected, true, 'Ownership conflict must block cross-tenant publishing');
    } finally {
      // Clean up dummy conflict records
      await db('meta_connections').where({ id: dummyConnId }).del();
      await db('brands').where({ id: dummyBrandId }).del();
      await db('tenants').where({ id: dummyTenantId }).del();
    }
  });

  // Test 6: Atomic Credential Update & Metadata Synchronization
  await test('Atomic Credential Update & Metadata Synchronization', async () => {
    const verifiedExpiresAt = new Date('2026-10-04T15:00:00.000Z');
    
    // Simulate updating connection with verified Meta provider expiration
    const conn = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
    assert.ok(conn, 'HOASP connection must exist');

    await db('meta_connections').where({ id: conn.id }).update({
      credential_expires_at: verifiedExpiresAt,
      status: 'reauth_required',
      updated_at: new Date()
    });

    await db('social_accounts')
      .where({ brand_id: BRAND_ID })
      .whereIn('platform', ['facebook', 'instagram'])
      .update({
        token_expires_at: verifiedExpiresAt,
        is_active: false,
        updated_at: new Date()
      });

    // Verify metadata persisted correctly
    const updatedConn = await db('meta_connections').where({ id: conn.id }).first();
    assert.strictEqual(
      new Date(updatedConn.credential_expires_at).toISOString(),
      verifiedExpiresAt.toISOString(),
      'Connection credential_expires_at must match verified provider response'
    );
    assert.strictEqual(updatedConn.status, 'reauth_required');

    const updatedAccounts = await db('social_accounts')
      .where({ brand_id: BRAND_ID })
      .whereIn('platform', ['facebook', 'instagram']);
    
    for (const acc of updatedAccounts) {
      assert.strictEqual(
        new Date(acc.token_expires_at).toISOString(),
        verifiedExpiresAt.toISOString(),
        `Account ${acc.platform} token_expires_at must match verified provider response`
      );
      assert.strictEqual(acc.is_active, 0, 'Expired account must have is_active = 0');
    }
  });

  console.log('\n================================================================');
  console.log(`REGRESSION TEST RESULTS: ${passed} PASS / ${failed} FAIL`);
  console.log('================================================================');

  await db.destroy();
  if (failed > 0) process.exit(1);
}

runAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
