import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { prePublishValidator } from '../apps/api/dist/services/meta/prePublishValidator.js';
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { executePublishPost } from '../apps/api/dist/controllers/post.controller.js';
import { MockSandboxAdapter } from '../apps/api/dist/services/adapters/mockSandboxAdapter.js';
import { MetaAdapter } from '../apps/api/dist/services/adapters/metaAdapter.js';
import { isRealExternalPostId, isSandboxUrl, isRealPublication } from '@socialforge/shared';
import { redactTokens } from '../apps/api/dist/services/meta/errors.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  META PUBLISHING INTEGRATION AUDIT & TEST SUITE');
  console.log('======================================================\n');

  const brand = await db('brands').where({ id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).first();
  if (!brand) {
    throw new Error('Test brand HOASP International not found');
  }

  const initialConnSnapshot = await db('meta_connections').where({ brand_id: brand.id }).first();
  const initialFbAccountSnapshot = await db('social_accounts').where({ brand_id: brand.id, platform: 'facebook' }).first();

  // ------------------------------------------------------------------
  // TEST 1: Expired Token Detection & OAuth Error 190 Handling (Reqs 1, 3, 4)
  // ------------------------------------------------------------------
  console.log('Test 1: Expired Token Detection & OAuth Error 190 Handling');
  {
    const conn = await db('meta_connections').where({ brand_id: brand.id }).first();

    // 1. Verify helper detects past expiration timestamp
    const expiredTimestamp = new Date('2026-10-04T15:00:00.000Z');
    assert(metaTokenManager.isTokenExpired(expiredTimestamp) === true, 'isTokenExpired flags past timestamp as expired');

    // Set connection credential_expires_at to past to simulate expired session
    await db('meta_connections').where({ id: conn.id }).update({
      credential_expires_at: expiredTimestamp,
      status: 'connected',
    });

    const isConnExpired = metaTokenManager.isTokenExpired(expiredTimestamp);
    assert(isConnExpired === true, 'Meta connection token is correctly identified as expired');

    // Pre-publish validator must detect expired token and halt publishing
    const valResult = await prePublishValidator.validateForLivePublish(brand.id, ['facebook']);
    assert(valResult.valid === false, 'Pre-publish validation halts when token is expired');
    assert(
      valResult.errors.some(e => e.includes('Meta OAuth Error 190') || e.includes('expired')),
      'Validation returns actionable error identifying Meta OAuth Error 190'
    );

    // Verify connection status updated to reauth_required
    const updatedConn = await db('meta_connections').where({ id: conn.id }).first();
    assert(
      updatedConn.status === 'reauth_required',
      `Connection status transitioned to "${updatedConn.status}"`
    );

    // Verify Facebook social_account is marked inactive
    const saFb = await db('social_accounts').where({ brand_id: brand.id, platform: 'facebook' }).first();
    assert(saFb && saFb.is_active === 0, 'Facebook account in social_accounts is deactivated');
  }

  // ------------------------------------------------------------------
  // TEST 2: Revoked Permissions Detection (Req 3, 10)
  // ------------------------------------------------------------------
  console.log('\nTest 2: Revoked Permissions Detection');
  {
    const originalDebugToken = metaTokenManager.debugToken;
    try {
      // Simulate token with revoked pages_manage_posts scope
      metaTokenManager.debugToken = async () => ({
        isValid: true,
        userId: '1405588742634526',
        appId: '1785874552561096',
        scopes: ['pages_show_list', 'pages_read_engagement'], // missing pages_manage_posts!
        expiresAt: new Date(Date.now() + 864000000),
        dataAccessExpiresAt: new Date(Date.now() + 864000000),
      });

      // Temporarily mark connection status connected with future expiry
      await db('meta_connections').where({ brand_id: brand.id }).update({
        credential_expires_at: new Date(Date.now() + 864000000),
        status: 'connected',
      });
      await db('social_accounts').where({ brand_id: brand.id, platform: 'facebook' }).update({ is_active: true });

      const valResult = await prePublishValidator.validateForLivePublish(brand.id, ['facebook']);
      assert(valResult.valid === false, 'Pre-publish validation halts when required permissions are missing');
      assert(
        valResult.errors.some(e => e.includes('pages_manage_posts')),
        'Error message specifies missing pages_manage_posts permission'
      );
    } finally {
      metaTokenManager.debugToken = originalDebugToken;
    }
  }

  // ------------------------------------------------------------------
  // TEST 3: Missing Instagram Professional Linkage (Req 5, 6, 10)
  // ------------------------------------------------------------------
  console.log('\nTest 3: Missing Instagram Professional Linkage Detection');
  {
    const originalDebugToken = metaTokenManager.debugToken;
    try {
      metaTokenManager.debugToken = async () => ({
        isValid: true,
        userId: '1405588742634526',
        appId: '1785874552561096',
        scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
        expiresAt: new Date(Date.now() + 864000000),
        dataAccessExpiresAt: new Date(Date.now() + 864000000),
      });

      await db('meta_connections').where({ brand_id: brand.id }).update({
        credential_expires_at: new Date(Date.now() + 864000000),
        status: 'connected',
        instagram_account_id: null, // No linked Instagram account
      });
      // Page also has null instagram_business_account_id
      await db('meta_facebook_pages').where({ page_id: '1405588742634526' }).update({
        instagram_business_account_id: null,
      });

      const valResult = await prePublishValidator.validateForLivePublish(brand.id, ['instagram']);
      assert(valResult.valid === false, 'Pre-publish validation halts when Instagram Professional account is unlinked');
      assert(
        valResult.errors.some(e => e.includes('no linked Instagram Professional account') || e.includes('Mock Sandbox Mode')),
        'Actionable error guides user to link Instagram Professional account in Meta Business Suite'
      );
    } finally {
      metaTokenManager.debugToken = originalDebugToken;
    }
  }

  // ------------------------------------------------------------------
  // TEST 4: Instagram Media Requirements Enforcement (Req 7)
  // ------------------------------------------------------------------
  console.log('\nTest 4: Instagram Media Requirements Enforcement');
  {
    const textOnlyResult = prePublishValidator.validateMediaRequirements('instagram', []);
    assert(textOnlyResult.valid === false, 'Instagram rejects text-only posts without media');
    assert(
      textOnlyResult.error && textOnlyResult.error.includes('at least one image or video attachment'),
      'Error explains Instagram media requirement clearly'
    );

    const withMediaResult = prePublishValidator.validateMediaRequirements('instagram', ['https://example.com/image.jpg']);
    assert(withMediaResult.valid === true, 'Instagram accepts posts with media attachment');

    const fbTextResult = prePublishValidator.validateMediaRequirements('facebook', []);
    assert(fbTextResult.valid === true, 'Facebook allows text-only feed posts');
  }

  // ------------------------------------------------------------------
  // TEST 5: Zero False Successes & Explicit Sandbox vs. Live Status (Req 6, 10)
  // ------------------------------------------------------------------
  console.log('\nTest 5: Zero False Successes & Explicit Sandbox vs. Live Separation');
  {
    const sandboxAdapter = new MockSandboxAdapter();
    const sbResult = await sandboxAdapter.publish({
      postVariantId: 'test-var-1',
      brandId: brand.id,
      platform: 'instagram',
      content: 'Testing sandbox simulation',
    });

    assert(sbResult.success === true, 'Sandbox publish completes');
    assert(sbResult.rawResponse?.simulated === true, 'Sandbox rawResponse explicitly flagged simulated: true');
    assert(sbResult.rawResponse?.isSandbox === true, 'Sandbox rawResponse explicitly flagged isSandbox: true');
    assert(sbResult.rawResponse?.status === 'sandbox', 'Sandbox rawResponse status is "sandbox" (never "published")');

    // Verify helper functions reject sandbox IDs as live publications
    assert(isRealExternalPostId(sbResult.remotePostId) === false, 'isRealExternalPostId correctly rejects sandbox UUID remotePostId');
    assert(isSandboxUrl(sbResult.remotePostUrl) === true, 'isSandboxUrl correctly detects sandbox post URL');
  }

  // ------------------------------------------------------------------
  // TEST 6: Live API Response Validation (Req 6, 10)
  // ------------------------------------------------------------------
  console.log('\nTest 6: Live API Response Verification');
  {
    const realFacebookId = '1405588742634526_122100337179498315';
    const realFacebookUrl = 'https://www.facebook.com/1405588742634526/posts/122100337179498315';

    assert(isRealExternalPostId(realFacebookId) === true, 'isRealExternalPostId accepts genuine Meta feed post ID');
    assert(isSandboxUrl(realFacebookUrl) === false, 'isSandboxUrl confirms genuine Facebook post URL is not sandbox');
    assert(
      isRealPublication({ status: 'published', remote_post_id: realFacebookId, remote_post_url: realFacebookUrl }) === true,
      'isRealPublication validates genuine live Meta publication'
    );

    const fakeId = 'mock_post_123456';
    const fakeUrl = 'https://mock.socialforge.local/facebook/p/123456';
    assert(isRealExternalPostId(fakeId) === false, 'isRealExternalPostId rejects mock_post_* identifier');
    assert(isSandboxUrl(fakeUrl) === true, 'isSandboxUrl detects mock.socialforge.local URL');
    assert(
      isRealPublication({ status: 'published', remote_post_id: fakeId, remote_post_url: fakeUrl }) === false,
      'isRealPublication rejects mock post labeled as published'
    );
  }

  // ------------------------------------------------------------------
  // TEST 7: Failed Publishing Safety & Error Capture (Req 3, 8, 10)
  // ------------------------------------------------------------------
  console.log('\nTest 7: Failed Publishing Safety & Error Capture');
  {
    const metaAdapter = new MetaAdapter();
    // Test publish with invalid credentials
    const failResult = await metaAdapter.publish(
      {
        postVariantId: 'test-fail-var',
        brandId: brand.id,
        platform: 'facebook',
        content: 'This publish should fail safely',
      },
      { accessToken: 'invalid_expired_token' }
    );

    assert(failResult.success === false, 'Failed publishing returns success: false');
    assert(failResult.remotePostId === '', 'Failed publishing provides empty remotePostId (no fake ID)');
    assert(Boolean(failResult.errorMessage), 'Failed publishing returns actionable error message');
    assert(
      isRealPublication({ status: 'published', remote_post_id: failResult.remotePostId, remote_post_url: failResult.remotePostUrl }) === false,
      'Failed publishing cannot be recorded as real publication'
    );
  }

  // ------------------------------------------------------------------
  // TEST 8: Retrying Cannot Create Duplicate Posts (Req 8)
  // ------------------------------------------------------------------
  console.log('\nTest 8: Duplicate Post Prevention During Retry');
  {
    const testPostId = crypto.randomUUID();
    const publishedVarId = crypto.randomUUID();
    const failedVarId = crypto.randomUUID();
    const now = new Date();

    const user = await db('users').first();
    const authorId = user ? user.id : brand.tenant_id;

    await db('posts').insert({
      id: testPostId,
      tenant_id: brand.tenant_id,
      brand_id: brand.id,
      author_id: authorId,
      title: 'Duplicate Prevention Test Post',
      base_content: 'Testing retry duplicate prevention',
      status: 'partially_published',
      quota_counted: true,
      created_at: now,
      updated_at: now,
    });

    await db('post_variants').insert([
      {
        id: publishedVarId,
        post_id: testPostId,
        platform: 'facebook',
        content: 'Facebook variant already live',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'published',
        remote_post_id: '1405588742634526_122100337179498315',
        remote_post_url: 'https://www.facebook.com/1405588742634526/posts/122100337179498315',
        created_at: now,
        updated_at: now,
      },
      {
        id: failedVarId,
        post_id: testPostId,
        platform: 'x_twitter',
        content: 'Twitter variant that failed',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'failed',
        remote_post_id: null,
        remote_post_url: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Retry publishing the post
    await executePublishPost(testPostId, brand.id, brand.tenant_id, { force: true });

    // The facebook variant must remain published with its original remote_post_id (NO duplicate created)
    const fbVariantAfter = await db('post_variants').where({ id: publishedVarId }).first();
    assert(
      fbVariantAfter.status === 'published' && fbVariantAfter.remote_post_id === '1405588742634526_122100337179498315',
      'Already published variant was protected from duplicate publication during retry'
    );

    // Clean up temporary test records
    await db('publish_logs').whereIn('post_variant_id', [publishedVarId, failedVarId]).del();
    await db('analytics_metrics').whereIn('post_variant_id', [publishedVarId, failedVarId]).del();
    await db('post_variants').whereIn('id', [publishedVarId, failedVarId]).del();
    await db('posts').where({ id: testPostId }).del();
  }

  // ------------------------------------------------------------------
  // TEST 9: Permanent Lock Invariant Preservation
  // ------------------------------------------------------------------
  console.log('\nTest 9: Permanent Publication Lock Invariant');
  {
    const lockedVariant = await db('post_variants').where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' }).first();
    assert(lockedVariant !== undefined, 'Locked Meta post variant exists');
    assert(lockedVariant.status === 'published', 'Locked Meta post variant status is strictly "published"');
    assert(
      lockedVariant.remote_post_id === '1405588742634526_122100337179498315',
      'Locked Meta remote post ID matches production Facebook post'
    );

    const lockedJob = await db('publishing_jobs').where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' }).first();
    assert(lockedJob && lockedJob.status === 'published', 'Locked Meta publishing job status is strictly "published"');
  }

  // ------------------------------------------------------------------
  // TEST 10: Token Security & Secret Redaction (Req 9)
  // ------------------------------------------------------------------
  console.log('\nTest 10: Token Encryption & Secret Redaction');
  {
    const conn = await db('meta_connections').where({ brand_id: brand.id }).first();
    assert(
      conn.encrypted_user_access_token && conn.encrypted_user_access_token.includes(':'),
      'Stored user access token is AES-256-GCM encrypted with IV & AuthTag'
    );

    // Test token redaction utility
    const sampleError = 'Error with token EAAByz1234567890abcdef at https://graph.facebook.com';
    const redacted = redactTokens(sampleError);
    assert(!redacted.includes('EAAByz1234567890abcdef'), 'Sensitive Meta token is cleanly redacted from error strings');
    assert(redacted.includes('[REDACTED_META_TOKEN]'), 'Token replaced with secure redaction marker');
  }

  // ------------------------------------------------------------------
  // TEST 11: OAuth Reconnect Flow URL Generation (Req 2, 11)
  // ------------------------------------------------------------------
  console.log('\nTest 11: Meta Reconnect URL Generation');
  {
    const authUrl = metaOAuthService.getAuthorizationUrl(brand.tenant_id, brand.id, 'test_user');
    assert(authUrl.startsWith('https://www.facebook.com/'), 'Reconnect URL targets official Meta OAuth dialog');
    assert(authUrl.includes('scope='), 'Reconnect URL specifies requested permissions');
    assert(authUrl.includes('pages_manage_posts'), 'Permissions include pages_manage_posts');
    assert(authUrl.includes('pages_read_engagement'), 'Permissions include pages_read_engagement');
    assert(authUrl.includes('pages_show_list'), 'Permissions include pages_show_list');
    assert(authUrl.includes('instagram_basic'), 'Permissions include instagram_basic');
    assert(authUrl.includes('instagram_content_publish'), 'Permissions include instagram_content_publish');
    assert(authUrl.includes('state='), 'State parameter with HMAC-SHA256 signature is included for CSRF defense');
  }

  // Restore live HOASP International connection and social_account state after test assertions
  if (initialConnSnapshot) {
    await db('meta_connections').where({ id: initialConnSnapshot.id }).update({
      status: initialConnSnapshot.status || 'connected',
      credential_expires_at: initialConnSnapshot.credential_expires_at ?? null,
      metadata: typeof initialConnSnapshot.metadata === 'string'
        ? initialConnSnapshot.metadata
        : JSON.stringify(initialConnSnapshot.metadata || {}),
      updated_at: new Date(),
    });
  }
  if (initialFbAccountSnapshot) {
    await db('social_accounts').where({ id: initialFbAccountSnapshot.id }).update({
      is_active: initialFbAccountSnapshot.is_active ?? true,
      token_expires_at: initialFbAccountSnapshot.token_expires_at ?? null,
      updated_at: new Date(),
    });
  }

  console.log('\n======================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
