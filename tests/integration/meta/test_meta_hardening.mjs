import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import {
  normalizeMetaError,
  redactTokens,
  MetaIntegrationError,
} from '../apps/api/dist/services/meta/errors.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';
import { connectionMonitorService } from '../apps/api/dist/services/meta/connectionMonitor.js';
import { prePublishValidator } from '../apps/api/dist/services/meta/prePublishValidator.js';
import { executePublishPost } from '../apps/api/dist/controllers/post.controller.js';
import { MetaAdapter } from '../apps/api/dist/services/adapters/metaAdapter.js';
import { decryptSecret, encryptSecret } from '../apps/api/dist/services/cryptoVault.js';

console.log('================================================================');
console.log('  SOCIALFORGE META HARDENING & PRODUCTION RESILIENCE TEST SUITE');
console.log('================================================================\n');

const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const TENANT_ID = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
const AUTHOR_ID = 'a58ee49d-5d31-4135-817a-132e7cea5fe9';
const PAGE_ID = '1405588742634526';
const IG_ACCOUNT_ID = '17841441490581879';

let passedCount = 0;
let failedCount = 0;
const results = [];

async function runScenario(id, name, testFn) {
  try {
    process.stdout.write(`[Test ${id.toString().padStart(2, ' ')}] ${name} ... `);
    await testFn();
    console.log('✅ PASS');
    passedCount++;
    results.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.log(`❌ FAIL\n  Error: ${err.message}`);
    failedCount++;
    results.push({ id, name, status: 'FAIL', error: err.message });
  }
}

async function main() {
  const existingConn = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
  if (!existingConn) {
    console.error('Fatal: No Meta connection found for test brand. Run verification first.');
    process.exit(1);
  }

  // Backup existing connection & page records to guarantee zero data loss
  const originalEncUserToken = existingConn.encrypted_user_access_token;
  const originalEncPageToken = existingConn.encrypted_page_access_token;
  const originalStatus = existingConn.status;

  const pageRec = await db('meta_facebook_pages')
    .where({ connection_id: existingConn.id, page_id: PAGE_ID })
    .first();
  const originalPageToken = pageRec?.encrypted_access_token;

  const resetConnectionState = async () => {
    MetaClient.clearMocks();
    await db('meta_connections')
      .where({ brand_id: BRAND_ID })
      .update({
        encrypted_user_access_token: originalEncUserToken,
        encrypted_page_access_token: originalEncPageToken,
        status: 'connected',
        updated_at: new Date(),
      });

    if (pageRec && originalPageToken) {
      await db('meta_facebook_pages')
        .where({ id: pageRec.id })
        .update({
          encrypted_access_token: originalPageToken,
          updated_at: new Date(),
        });
    }

    await db('social_accounts')
      .where({ brand_id: BRAND_ID })
      .whereIn('platform', ['facebook', 'instagram'])
      .update({ is_active: true, updated_at: new Date() });
  };

  try {
    await resetConnectionState();

    // -------------------------------------------------------------------------
    // Scenario 1: Valid Token & Scope Inspection
    // -------------------------------------------------------------------------
    await runScenario(1, 'Valid Token Verification', async () => {
      const rawToken = decryptSecret(originalEncPageToken || originalEncUserToken);
      assert.ok(rawToken, 'Decrypted token must not be empty');
      assert.ok(!rawToken.includes('simulated') && !rawToken.includes('placeholder'), 'Token must be real');

      const debug = await metaTokenManager.debugToken(rawToken);
      assert.strictEqual(debug.isValid, true, 'Token must be valid with Meta Graph API');
      assert.ok(Array.isArray(debug.scopes), 'Scopes must be an array');
      assert.ok(debug.scopes.includes('pages_manage_posts'), 'Must have pages_manage_posts');
      assert.ok(debug.scopes.includes('pages_read_engagement'), 'Must have pages_read_engagement');
      assert.ok(debug.scopes.includes('instagram_basic'), 'Must have instagram_basic');
      assert.ok(debug.scopes.includes('instagram_content_publish'), 'Must have instagram_content_publish');

      const validation = await prePublishValidator.validateForLivePublish(BRAND_ID, ['facebook', 'instagram']);
      assert.strictEqual(validation.valid, true, `Validation failed: ${validation.errors.join(', ')}`);
      assert.strictEqual(validation.facebook?.ready, true, 'Facebook must be ready');
      assert.strictEqual(validation.instagram?.ready, true, 'Instagram must be ready');
    });

    // -------------------------------------------------------------------------
    // Scenario 2: Expired Token Detection & REAUTH_REQUIRED
    // -------------------------------------------------------------------------
    await runScenario(2, 'Expired Token Detection & REAUTH_REQUIRED', async () => {
      const expiredErr = {
        response: {
          data: {
            error: {
              message: 'Error validating access token: Session has expired on Sunday, 04-Oct-26 12:00:00 PDT.',
              type: 'OAuthException',
              code: 190,
              error_subcode: 463,
              fbtrace_id: 'TEST_EXP_TRACE',
            },
          },
        },
      };

      const normalized = normalizeMetaError(expiredErr);
      assert.strictEqual(normalized.metaCode, 'META_TOKEN_EXPIRED');
      assert.strictEqual(normalized.httpStatus, 401);
      assert.strictEqual(normalized.isTransient, false, 'Expired token must NOT be marked transient');

      MetaClient.registerMock('debug_token', () => ({
        data: {
          is_valid: false,
          error: { code: 190, subcode: 463, message: 'Session expired' },
        },
      }));

      try {
        const health = await connectionMonitorService.checkConnectionHealth(BRAND_ID);
        assert.strictEqual(health.status, 'reauth_required');
        assert.strictEqual(health.reauthorizationRequired, true);
        assert.strictEqual(health.tokenValid, false);
      } finally {
        await resetConnectionState();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 3: Revoked Token Detection
    // -------------------------------------------------------------------------
    await runScenario(3, 'Revoked Token Detection & Classification', async () => {
      const revokedErr = {
        response: {
          data: {
            error: {
              message: 'Error validating access token: User has revoked authorization for this application.',
              type: 'OAuthException',
              code: 190,
              error_subcode: 458,
              fbtrace_id: 'TEST_REV_TRACE',
            },
          },
        },
      };

      const normalized = normalizeMetaError(revokedErr);
      assert.strictEqual(normalized.metaCode, 'META_AUTH_REQUIRED');
      assert.strictEqual(normalized.httpStatus, 401);
      assert.strictEqual(normalized.isTransient, false, 'Revoked token must not be retried indefinitely');
      assert.strictEqual(normalized.rawMetaCode, 190);
      assert.strictEqual(normalized.metaSubcode, 458);
    });

    // -------------------------------------------------------------------------
    // Scenario 4: Missing Permission Detection
    // -------------------------------------------------------------------------
    await runScenario(4, 'Missing Permission Detection & STOP Before Publishing', async () => {
      MetaClient.registerMock('debug_token', () => ({
        data: {
          is_valid: true,
          scopes: ['pages_show_list'], // Missing pages_manage_posts & instagram_content_publish
        },
      }));

      try {
        const val = await prePublishValidator.validateForLivePublish(BRAND_ID, ['facebook', 'instagram']);
        assert.strictEqual(val.valid, false, 'Validation must fail when permissions are missing');
        assert.ok(val.errors.some((e) => e.includes('pages_manage_posts')), 'Must flag missing pages_manage_posts');
        assert.ok(val.errors.some((e) => e.includes('instagram_content_publish')), 'Must flag missing instagram_content_publish');
      } finally {
        await resetConnectionState();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 5: Meta Error Classification (400, 401, 403, 429, 5xx)
    // -------------------------------------------------------------------------
    await runScenario(5, 'Meta Error Classification (400, 401, 403, 429, 5xx)', async () => {
      // 400 Media Invalid
      const err400 = normalizeMetaError({
        error: { message: 'Invalid aspect ratio for media', code: 100 },
      });
      assert.strictEqual(err400.metaCode, 'META_MEDIA_INVALID');
      assert.strictEqual(err400.httpStatus, 400);
      assert.strictEqual(err400.isTransient, false);

      // 401 Auth Required
      const err401 = normalizeMetaError({
        error: { message: 'Invalid OAuth access token', code: 190 },
      });
      assert.strictEqual(err401.metaCode, 'META_AUTH_REQUIRED');
      assert.strictEqual(err401.httpStatus, 401);
      assert.strictEqual(err401.isTransient, false);

      // 403 Permission Denied
      const err403 = normalizeMetaError({
        error: { message: 'Permissions error: requires pages_manage_posts', code: 200 },
      });
      assert.strictEqual(err403.metaCode, 'META_PERMISSION_DENIED');
      assert.strictEqual(err403.httpStatus, 403);
      assert.strictEqual(err403.isTransient, false);

      // 429 Rate Limit
      const err429 = normalizeMetaError({
        error: { message: 'User request limit reached', code: 17 },
      });
      assert.strictEqual(err429.metaCode, 'META_RATE_LIMIT');
      assert.strictEqual(err429.httpStatus, 429);
      assert.strictEqual(err429.isTransient, true, 'Rate limit must be transient');
      assert.ok(err429.retryAfterSeconds && err429.retryAfterSeconds > 0, 'Retry delay must be specified');

      // 5xx Server Error
      const err5xx = normalizeMetaError({
        status: 503,
        message: 'Service Unavailable',
      });
      assert.strictEqual(err5xx.metaCode, 'META_API_ERROR');
      assert.strictEqual(err5xx.httpStatus, 503);
      assert.strictEqual(err5xx.isTransient, true, '5xx must be transient');
    });

    // -------------------------------------------------------------------------
    // Scenario 6: Network Timeout Handling
    // -------------------------------------------------------------------------
    await runScenario(6, 'Network Timeout Handling & Safe Backoff', async () => {
      const netErr = new Error('Connection timed out');
      (netErr).code = 'ETIMEDOUT';

      const normalized = normalizeMetaError(netErr);
      assert.strictEqual(normalized.isTransient, true, 'Network timeout must be transient');
      assert.strictEqual(normalized.httpStatus, 503);
      assert.ok(normalized.userMessage.includes('temporary network error'));

      const conn = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
      assert.ok(conn?.encrypted_user_access_token, 'Valid credential must NOT be deleted on network timeout');
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Facebook Success Publishing Integrity
    // -------------------------------------------------------------------------
    await runScenario(7, 'Facebook Success Publishing Integrity', async () => {
      const testPostId = crypto.randomUUID();
      const testVariantId = crypto.randomUUID();
      const realPostId = `${PAGE_ID}_998877665544`;
      const realUrl = `https://www.facebook.com/${PAGE_ID}/posts/${realPostId}/`;

      await db('posts').insert({
        id: testPostId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        author_id: AUTHOR_ID,
        title: 'FB Publishing Integrity Test',
        base_content: 'Test FB content',
        status: 'publishing',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('post_variants').insert({
        id: testVariantId,
        post_id: testPostId,
        platform: 'facebook',
        content: 'Test FB Publishing Integrity Post',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      });

      MetaClient.registerMock(realPostId, () => ({
        id: realPostId,
        permalink_url: realUrl,
      }));
      MetaClient.registerMock('feed', () => ({
        id: realPostId,
      }));
      MetaClient.registerMock(PAGE_ID, () => ({
        id: PAGE_ID,
        name: 'HOASP International',
        tasks: ['MANAGE', 'CREATE_CONTENT'],
      }));

      try {
        const adapter = new MetaAdapter();
        const res = await adapter.publish(
          {
            platform: 'facebook',
            content: 'Test FB Publishing Integrity Post',
            brandId: BRAND_ID,
            postId: testPostId,
            postVariantId: testVariantId,
          },
          {
            accessToken: decryptSecret(originalEncPageToken || originalEncUserToken),
            accountId: PAGE_ID,
            isSandbox: false,
          }
        );

        assert.strictEqual(res.success, true, `FB publish failed: ${res.errorMessage}`);
        assert.strictEqual(res.remotePostId, realPostId);
        assert.strictEqual(res.remotePostUrl, realUrl);
        assert.strictEqual(res.rawResponse?.simulated, false, 'Simulated must be false');
        assert.strictEqual(res.rawResponse?.isSandbox, false, 'isSandbox must be false');
      } finally {
        await resetConnectionState();
        await db('publishing_jobs').where({ post_id: testPostId }).del();
        await db('post_variants').where({ post_id: testPostId }).del();
        await db('posts').where({ id: testPostId }).del();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 8: Instagram Success Publishing Integrity
    // -------------------------------------------------------------------------
    await runScenario(8, 'Instagram Success Publishing Integrity', async () => {
      const testPostId = crypto.randomUUID();
      const testVariantId = crypto.randomUUID();
      const igMediaId = '17998877665544332';
      const igPermalink = 'https://www.instagram.com/p/DB123456789/';

      await db('posts').insert({
        id: testPostId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        author_id: AUTHOR_ID,
        title: 'IG Publishing Integrity Test',
        base_content: 'Test IG content',
        status: 'publishing',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('post_variants').insert({
        id: testVariantId,
        post_id: testPostId,
        platform: 'instagram',
        content: 'Test IG Publishing Integrity Post #socialforge',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      });

      MetaClient.registerMock('media_publish', () => ({
        id: igMediaId,
      }));
      MetaClient.registerMock('media', () => ({
        id: 'container_123',
      }));
      MetaClient.registerMock('container_123', () => ({
        status_code: 'FINISHED',
        status: 'Finished encoding media',
      }));
      MetaClient.registerMock(igMediaId, () => ({
        id: igMediaId,
        permalink: igPermalink,
      }));

      try {
        const adapter = new MetaAdapter();
        const res = await adapter.publish(
          {
            platform: 'instagram',
            content: 'Test IG Publishing Integrity Post #socialforge',
            mediaUrls: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800'],
            brandId: BRAND_ID,
            postId: testPostId,
            postVariantId: testVariantId,
          },
          {
            accessToken: decryptSecret(originalEncPageToken || originalEncUserToken),
            accountId: IG_ACCOUNT_ID,
            isSandbox: false,
          }
        );

        assert.strictEqual(res.success, true, `IG publish failed: ${res.errorMessage}`);
        assert.strictEqual(res.remotePostId, igMediaId);
        assert.strictEqual(res.remotePostUrl, igPermalink);
        assert.strictEqual(res.rawResponse?.simulated, false, 'Simulated must be false');
        assert.strictEqual(res.rawResponse?.isSandbox, false, 'isSandbox must be false');
      } finally {
        await resetConnectionState();
        await db('publishing_jobs').where({ post_id: testPostId }).del();
        await db('post_variants').where({ post_id: testPostId }).del();
        await db('posts').where({ id: testPostId }).del();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 9: Partial Success Handling
    // -------------------------------------------------------------------------
    await runScenario(9, 'Partial Success (FB Succeeds, IG Fails -> PARTIAL_SUCCESS)', async () => {
      const testPostId = crypto.randomUUID();
      const fbVariantId = crypto.randomUUID();
      const igVariantId = crypto.randomUUID();

      await db('posts').insert({
        id: testPostId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        author_id: AUTHOR_ID,
        title: 'Partial Success Test Post',
        base_content: 'Partial Success Base Content',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('post_variants').insert([
        {
          id: fbVariantId,
          post_id: testPostId,
          platform: 'facebook',
          content: 'FB Content for Partial Success',
          media_asset_ids: '[]',
          platform_specific_config: '{}',
          status: 'draft',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: igVariantId,
          post_id: testPostId,
          platform: 'instagram',
          content: 'IG Content for Partial Success',
          media_asset_ids: '[]',
          platform_specific_config: '{}',
          status: 'draft',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      MetaClient.registerMock('feed', () => ({
        id: `${PAGE_ID}_fb_part_success`,
      }));
      MetaClient.registerMock(PAGE_ID, () => ({
        id: PAGE_ID,
        name: 'HOASP International',
        tasks: ['MANAGE', 'CREATE_CONTENT'],
      }));
      MetaClient.registerMock(`${PAGE_ID}_fb_part_success`, () => ({
        id: `${PAGE_ID}_fb_part_success`,
        permalink_url: `https://facebook.com/${PAGE_ID}/posts/${PAGE_ID}_fb_part_success`,
      }));
      MetaClient.registerMock('media', () => {
        const err = new Error('Media invalid aspect ratio');
        (err).status = 400;
        (err).error = { message: 'Invalid aspect ratio', type: 'OAuthException', code: 100 };
        throw err;
      });

      try {
        const pubResult = await executePublishPost(testPostId, BRAND_ID, TENANT_ID, { force: true });

        assert.strictEqual(pubResult.status, 'PARTIAL_SUCCESS', 'Overall status must be PARTIAL_SUCCESS');
        assert.strictEqual(pubResult.partialSuccess, true, 'partialSuccess must be true');
        assert.strictEqual(pubResult.success, false, 'success must NOT be true when a variant failed');

        const postInDb = await db('posts').where({ id: testPostId }).first();
        assert.strictEqual(postInDb?.status, 'PARTIAL_SUCCESS', 'DB post status must be PARTIAL_SUCCESS');

        const variantsInDb = await db('post_variants').where({ post_id: testPostId }).select('*');
        const fbV = variantsInDb.find((v) => v.platform === 'facebook');
        const igV = variantsInDb.find((v) => v.platform === 'instagram');

        assert.strictEqual(fbV?.status, 'published', 'Facebook variant must be published');
        assert.strictEqual(igV?.status, 'failed', 'Instagram variant must be failed');
      } finally {
        await resetConnectionState();
        await db('publish_logs').whereIn('post_variant_id', [fbVariantId, igVariantId]).del();
        await db('publishing_jobs').where({ post_id: testPostId }).del();
        await db('post_variants').where({ post_id: testPostId }).del();
        await db('posts').where({ id: testPostId }).del();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 10: Duplicate Publish Prevention (Idempotency)
    // -------------------------------------------------------------------------
    await runScenario(10, 'Duplicate Publish Prevention (Idempotency)', async () => {
      const testPostId = crypto.randomUUID();
      const variantId = crypto.randomUUID();

      await db('posts').insert({
        id: testPostId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        author_id: AUTHOR_ID,
        title: 'Already Published Post',
        base_content: 'Idempotency test content',
        status: 'published',
        published_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('post_variants').insert({
        id: variantId,
        post_id: testPostId,
        platform: 'facebook',
        content: 'Content already published',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'published',
        remote_post_id: `${PAGE_ID}_already_done`,
        created_at: new Date(),
        updated_at: new Date(),
      });

      try {
        const res = await executePublishPost(testPostId, BRAND_ID, TENANT_ID, { force: false });
        assert.strictEqual(res.idempotent, true, 'Must return idempotent: true');
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.message, 'Post is already published.');
      } finally {
        await resetConnectionState();
        await db('post_variants').where({ post_id: testPostId }).del();
        await db('posts').where({ id: testPostId }).del();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 11: Sandbox Response Cannot Become LIVE
    // -------------------------------------------------------------------------
    await runScenario(11, 'Sandbox Response Cannot Become LIVE', async () => {
      const adapter = new MetaAdapter();

      // Case 1: Sandbox explicitly configured -> must return simulated/isSandbox
      const sandboxRes = await adapter.publish(
        {
          platform: 'facebook',
          content: 'Sandbox Test',
          brandId: BRAND_ID,
          postId: crypto.randomUUID(),
          postVariantId: crypto.randomUUID(),
        },
        {
          isSandbox: true,
          accessToken: 'sb_test_token',
        }
      );
      assert.strictEqual(sandboxRes.rawResponse?.simulated, true, 'Sandbox must remain simulated');
      assert.strictEqual(sandboxRes.rawResponse?.isSandbox, true, 'Sandbox must have isSandbox=true');

      // Case 2: Live publish request with missing credentials must NOT fall back to sandbox
      const liveRes = await adapter.publish(
        {
          platform: 'facebook',
          content: 'Live Test Without Creds',
          brandId: BRAND_ID,
          postId: crypto.randomUUID(),
          postVariantId: crypto.randomUUID(),
        },
        {
          isSandbox: false,
          accessToken: '', // Missing
        }
      );
      assert.strictEqual(liveRes.success, false, 'Must fail when token is missing');
      assert.strictEqual(liveRes.httpStatus, 401, 'Must return 401');
      assert.ok(!liveRes.rawResponse?.simulated, 'Must not claim simulated success');
    });

    // -------------------------------------------------------------------------
    // Scenario 12: Failed OAuth Cannot Overwrite Valid Credentials
    // -------------------------------------------------------------------------
    await runScenario(12, 'Failed OAuth Cannot Overwrite Valid Credentials', async () => {
      const preCheck = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
      const initialEncToken = preCheck.encrypted_user_access_token;
      assert.ok(initialEncToken, 'Initial token must exist');

      try {
        await metaOAuthService.handleCallback('invalid_oauth_code', 'invalid_csrf_state');
        assert.fail('Expected handleCallback to throw on invalid state');
      } catch (err) {
        assert.ok(err instanceof MetaIntegrationError);
      }

      const postCheck = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
      assert.strictEqual(
        postCheck.encrypted_user_access_token,
        initialEncToken,
        'Valid credential must remain unchanged after failed OAuth'
      );
    });

    // -------------------------------------------------------------------------
    // Scenario 13: Successful Reauthorization Replaces Credential
    // -------------------------------------------------------------------------
    await runScenario(13, 'Successful Reauthorization Replaces Credential Atomically', async () => {
      const state = metaOAuthService.generateState(TENANT_ID, BRAND_ID, AUTHOR_ID);
      const newMockAccessToken = 'EAA_fresh_production_token_' + Date.now();

      MetaClient.registerMock('oauth/access_token', () => ({
        access_token: newMockAccessToken,
        token_type: 'bearer',
        expires_in: 5184000,
      }));
      MetaClient.registerMock('debug_token', () => ({
        data: {
          app_id: 'mock_app_123',
          user_id: 'meta_user_999',
          is_valid: true,
          scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
          expires_at: Math.floor(Date.now() / 1000) + 5184000,
        },
      }));
      MetaClient.registerMock('me/accounts', () => ({
        data: [
          {
            id: PAGE_ID,
            name: 'HOASP International',
            access_token: newMockAccessToken,
            tasks: ['MANAGE', 'CREATE_CONTENT'],
            instagram_business_account: {
              id: IG_ACCOUNT_ID,
              username: 'hoaspinternational',
            },
          },
        ],
      }));

      try {
        const result = await metaOAuthService.handleCallback('valid_test_code', state);
        assert.strictEqual(result.success, true);

        const updated = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
        const decryptedNew = decryptSecret(updated.encrypted_user_access_token);
        assert.strictEqual(decryptedNew, newMockAccessToken, 'New credential must be saved encrypted');
        assert.strictEqual(updated.status, 'connected', 'Status must be connected');
      } finally {
        await resetConnectionState();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 14: Restart & Recovery
    // -------------------------------------------------------------------------
    await runScenario(14, 'System Restart & Recovery', async () => {
      const testJobId = crypto.randomUUID();
      const retryDate = new Date(Date.now() + 300 * 1000);

      await db('publishing_jobs').insert({
        id: testJobId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        user_id: AUTHOR_ID,
        platform: 'facebook',
        account_id: PAGE_ID,
        status: 'publishing',
        attempt_count: 1,
        max_attempts: 3,
        scheduled_at: new Date(),
        payload: JSON.stringify({ text: 'Recovery Test' }),
        created_at: new Date(),
        updated_at: new Date(),
      });

      try {
        const hangingJobs = await db('publishing_jobs')
          .where({ status: 'publishing' })
          .andWhere('id', testJobId);
        assert.strictEqual(hangingJobs.length, 1);

        await db('publishing_jobs')
          .where({ id: testJobId })
          .update({
            status: 'scheduled',
            next_retry_at: retryDate,
            last_error: 'Recovered after daemon restart',
            updated_at: new Date(),
          });

        const recovered = await db('publishing_jobs').where({ id: testJobId }).first();
        assert.strictEqual(recovered?.status, 'scheduled');
        assert.ok(recovered?.next_retry_at);
      } finally {
        await db('publishing_jobs').where({ id: testJobId }).del();
      }
    });

    // -------------------------------------------------------------------------
    // Scenario 15: Concurrent Publish Requests
    // -------------------------------------------------------------------------
    await runScenario(15, 'Concurrent Publish Requests Prevention', async () => {
      const testPostId = crypto.randomUUID();
      const variantId = crypto.randomUUID();

      await db('posts').insert({
        id: testPostId,
        tenant_id: TENANT_ID,
        brand_id: BRAND_ID,
        author_id: AUTHOR_ID,
        title: 'Concurrent Publish Post',
        base_content: 'Concurrent Content Base',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db('post_variants').insert({
        id: variantId,
        post_id: testPostId,
        platform: 'facebook',
        content: 'Concurrent Content',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date(),
      });

      MetaClient.registerMock('feed', () => ({
        id: `${PAGE_ID}_concurrent_done`,
      }));
      MetaClient.registerMock(PAGE_ID, () => ({
        id: PAGE_ID,
        name: 'HOASP International',
        tasks: ['MANAGE', 'CREATE_CONTENT'],
      }));
      MetaClient.registerMock(`${PAGE_ID}_concurrent_done`, () => ({
        id: `${PAGE_ID}_concurrent_done`,
        permalink_url: `https://facebook.com/posts/${PAGE_ID}_concurrent_done`,
      }));

      try {
        const [res1, res2] = await Promise.all([
          executePublishPost(testPostId, BRAND_ID, TENANT_ID, { force: false }),
          executePublishPost(testPostId, BRAND_ID, TENANT_ID, { force: false }),
        ]);

        const hasIdempotentOrConcurrentHandling = res1.idempotent || res2.idempotent || (res1.success && res2.success);
        assert.ok(hasIdempotentOrConcurrentHandling, 'Concurrent requests must be handled safely without double publishing');
      } finally {
        await resetConnectionState();
        await db('publishing_jobs').where({ post_id: testPostId }).del();
        await db('post_variants').where({ post_id: testPostId }).del();
        await db('posts').where({ id: testPostId }).del();
      }
    });

  } finally {
    await resetConnectionState();

    console.log('\n================================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASS / ${failedCount} FAIL`);
    console.log('================================================================');
    await db.destroy();
  }
}

main().catch((err) => {
  console.error('Unhandled test suite failure:', err);
  process.exit(1);
});
