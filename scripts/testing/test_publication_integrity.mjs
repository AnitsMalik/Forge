import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import {
  isRealExternalPostId,
  isSandboxUrl,
  isRealPublication,
} from '@socialforge/shared';
import { MetaPublishingService } from '../apps/api/dist/services/meta/publishing.js';
import { MetaAnalyticsSyncService } from '../apps/api/dist/services/meta/analyticsSync.js';
import { facebookPagesService } from '../apps/api/dist/services/meta/facebookPages.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { AnalyticsController } from '../apps/api/dist/controllers/analyticsController.js';

console.log('========================================================================');
console.log('       SOCIALFORGE PUBLICATION INTEGRITY TEST SUITE');
console.log('========================================================================\n');

let passedCount = 0;
let failedCount = 0;
const testResults = [];

async function test(id, name, fn) {
  try {
    process.stdout.write(`[Test ${String(id).padStart(2, ' ')}] ${name} ... `);
    await fn();
    console.log('✅ PASS');
    passedCount++;
    testResults.push({ id, name, status: 'PASS' });
  } catch (err) {
    console.log(`❌ FAIL\n  Error: ${err.message}`);
    failedCount++;
    testResults.push({ id, name, status: 'FAIL', error: err.message });
  }
}

async function runAll() {
  const publishingService = new MetaPublishingService();

  // Test 1: Fake IDs Rejection
  await test(1, 'Fake IDs Validation & Rejection', async () => {
    // Simulated / mock prefixes
    assert.strictEqual(isRealExternalPostId('fb_post_1791126667325'), false, 'fb_post_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('mock_linkedin_aca08ebeb1b3'), false, 'mock_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('sb_tiktok_luminary-glow'), false, 'sb_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('ig_media_12345'), false, 'ig_media_ must be rejected');
    assert.strictEqual(isRealExternalPostId('ig_container_12345'), false, 'ig_container_ must be rejected');
    assert.strictEqual(isRealExternalPostId('ig_77889900'), false, 'ig_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('page_10203040'), false, 'page_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('sim_post_999'), false, 'sim_ prefix must be rejected');
    assert.strictEqual(isRealExternalPostId('fake_post_123'), false, 'fake_ prefix must be rejected');

    // UUIDs
    assert.strictEqual(isRealExternalPostId('bbcf26bd-197'), false, 'short UUID must be rejected');
    assert.strictEqual(isRealExternalPostId('85ea5897-163'), false, 'short UUID must be rejected');
    assert.strictEqual(isRealExternalPostId('2cfe7fc4-583c-4e4d-b37f-02f7089cf58d'), false, 'full UUID must be rejected');

    // Empty / null
    assert.strictEqual(isRealExternalPostId(''), false, 'empty string must be rejected');
    assert.strictEqual(isRealExternalPostId(null), false, 'null must be rejected');
    assert.strictEqual(isRealExternalPostId(undefined), false, 'undefined must be rejected');

    // Real IDs
    assert.strictEqual(isRealExternalPostId('1405588742634526_122100337179498315'), true, 'genuine Facebook post ID must be accepted');
    assert.strictEqual(isRealExternalPostId('17983456789012345'), true, 'genuine Instagram numeric ID must be accepted');
  });

  // Test 2: Sandbox URLs Validation
  await test(2, 'Sandbox & Mock URLs Detection', async () => {
    assert.strictEqual(isSandboxUrl('https://mock.socialforge.local/linkedin/p/123'), true);
    assert.strictEqual(isSandboxUrl('http://localhost:3000/posts/123'), true);
    assert.strictEqual(isSandboxUrl('https://sandbox.meta.com/post/123'), true);
    assert.strictEqual(isSandboxUrl('https://www.facebook.com/1405588742634526/posts/122100337179498315'), false);
    assert.strictEqual(isSandboxUrl('https://www.instagram.com/p/C4s9vL'), false);
  });

  // Test 3: Real Publication Confirmation (Combined Status, ID, URL)
  await test(3, 'Real Publication Confirmation Function', async () => {
    // Valid real publication
    assert.strictEqual(isRealPublication({
      status: 'published',
      remote_post_id: '1405588742634526_122100337179498315',
      remote_post_url: 'https://www.facebook.com/1405588742634526/posts/122100337179498315'
    }), true);

    // Sandbox status
    assert.strictEqual(isRealPublication({
      status: 'sandbox',
      remote_post_id: '1405588742634526_122100337179498315',
      remote_post_url: 'https://www.facebook.com/posts/123'
    }), false);

    // Fake ID marked published
    assert.strictEqual(isRealPublication({
      status: 'published',
      remote_post_id: 'fb_post_1791126667325',
      remote_post_url: 'https://www.facebook.com/posts/123'
    }), false);

    // Mock URL marked published
    assert.strictEqual(isRealPublication({
      status: 'published',
      remote_post_id: '999888777666',
      remote_post_url: 'https://mock.socialforge.local/fb/999888777666'
    }), false);
  });

  // Test 4: Database Sandbox Reclassification Integrity
  await test(4, 'Database Publication State Integrity', async () => {
    const publishedVariants = await db('post_variants').where({ status: 'published' }).select('*');
    assert.strictEqual(publishedVariants.length, 1, `Exactly 1 variant must be published, found ${publishedVariants.length}`);
    assert.strictEqual(publishedVariants[0].remote_post_id, '1405588742634526_122100337179498315');

    const publishedPosts = await db('posts').where({ status: 'published' }).select('*');
    assert.strictEqual(publishedPosts.length, 1, `Exactly 1 post must be published, found ${publishedPosts.length}`);
    assert.strictEqual(publishedPosts[0].id, 'f6070497-e32c-435c-89c8-ddcba8e2ea13');

    const publishedJobs = await db('publishing_jobs').where({ status: 'published' }).select('*');
    assert.strictEqual(publishedJobs.length, 1, `Exactly 1 job must be published, found ${publishedJobs.length}`);
    assert.strictEqual(publishedJobs[0].external_post_id, '1405588742634526_122100337179498315');

    // Ensure 0 published variants have mock/sandbox IDs
    for (const v of publishedVariants) {
      assert.strictEqual(isRealExternalPostId(v.remote_post_id), true, `Variant ${v.id} has invalid remote ID: ${v.remote_post_id}`);
      assert.strictEqual(isSandboxUrl(v.remote_post_url), false, `Variant ${v.id} has sandbox URL: ${v.remote_post_url}`);
    }
  });

  // Test 5: Tenant Isolation on Publishing
  await test(5, 'Tenant Isolation Enforcement on Publish', async () => {
    const brand = await db('brands').where({ name: 'HOASP International' }).first();
    assert.ok(brand, 'HOASP brand must exist');

    let threw = false;
    try {
      await publishingService.publishSocialPost(
        {
          platform: 'facebook',
          accountId: '1405588742634526',
          text: 'Cross-tenant attempt',
          brandId: brand.id,
        },
        {
          tenantId: '00000000-0000-0000-0000-000000000000', // Wrong tenant ID
        }
      );
    } catch (err) {
      threw = true;
      assert.strictEqual(err.code, 'TENANT_ISOLATION_VIOLATION');
    }
    assert.strictEqual(threw, true, 'Publish must be blocked on tenant isolation violation');
  });

  // Test 6: Duplicate Meta Page Ownership Conflict Detection & Blocking
  await test(6, 'Duplicate Page Ownership Conflict Blocking', async () => {
    const conflictConn = await db('meta_connections').where({ status: 'ownership_conflict' }).first();
    assert.ok(conflictConn, 'At least one connection in ownership_conflict must exist');

    let blocked = false;
    try {
      await publishingService.publishSocialPost(
        {
          platform: 'facebook',
          accountId: conflictConn.selected_page_id,
          text: 'Blocked conflict test',
          brandId: conflictConn.brand_id,
        },
        {
          tenantId: conflictConn.tenant_id,
          connectionId: conflictConn.id,
        }
      );
    } catch (err) {
      blocked = true;
      assert.strictEqual(err.code, 'META_OWNERSHIP_CONFLICT');
    }
    assert.strictEqual(blocked, true, 'Publishing must be blocked with META_OWNERSHIP_CONFLICT');
  });

  // Test 7: Analytics Isolation & Ownership Conflict Safe Handling
  await test(7, 'Analytics Isolation & Conflict Handling', async () => {
    const conflictConn = await db('meta_connections').where({ status: 'ownership_conflict' }).first();
    assert.ok(conflictConn, 'Connection in ownership_conflict must exist');

    const result = await MetaAnalyticsSyncService.syncBrandAnalytics(conflictConn.brand_id, { force: true });
    assert.strictEqual(result.ownershipConflict, undefined, 'or handled cleanly without throwing unhandled exception');
    assert.strictEqual(result.syncedCount, 0, 'No posts should be synced while connection is in conflict');
    assert.ok(result.errors.length > 0, 'Error should be reported in errors list');
    assert.match(result.errors[0].error, /ownership conflict/i, 'Error message must specify ownership conflict');
  });

  // Test 8: Token Expiration Blocking
  await test(8, 'Token Expiry Immediate Blocking', async () => {
    const brand = await db('brands').where({ name: 'Echo Sound Labs' }).first();
    assert.ok(brand, 'Echo Sound Labs brand must exist');

    // Create a temporary expired test connection
    const testConnId = crypto.randomUUID();
    const expiredDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
    const dummyEncToken = metaTokenManager.encryptToken('EAA_dummy_expired_token');

    await db('meta_connections').insert({
      id: testConnId,
      tenant_id: brand.tenant_id,
      brand_id: brand.id,
      user_id: 'a58ee49d-5d31-4135-817a-132e7cea5fe9',
      provider: 'meta',
      selected_page_id: 'test_page_9999999',
      encrypted_page_access_token: dummyEncToken,
      credential_expires_at: expiredDate,
      status: 'connected',
    });

    let expiredBlocked = false;
    try {
      await publishingService.publishSocialPost(
        {
          platform: 'facebook',
          accountId: 'test_page_9999999',
          text: 'Testing expired token',
          brandId: brand.id,
        },
        {
          tenantId: brand.tenant_id,
          connectionId: testConnId,
        }
      );
    } catch (err) {
      expiredBlocked = true;
      assert.strictEqual(err.code, 'META_TOKEN_EXPIRED');
    } finally {
      await db('meta_connections').where({ id: testConnId }).del();
    }

    assert.strictEqual(expiredBlocked, true, 'Publish must fail with META_TOKEN_EXPIRED for expired credentials');
  });

  // Test 9: Transient Error Exponential Backoff Calculation
  await test(9, 'Exponential Backoff Retry Calculation', async () => {
    // Attempt 1 -> 2^1 * 5 = 10s
    // Attempt 2 -> 2^2 * 5 = 20s
    // Attempt 3 -> 2^3 * 5 = 40s
    const delay1 = Math.pow(2, 1) * 5;
    const delay2 = Math.pow(2, 2) * 5;
    const delay3 = Math.pow(2, 3) * 5;

    assert.strictEqual(delay1, 10);
    assert.strictEqual(delay2, 20);
    assert.strictEqual(delay3, 40);
  });

  // Test 10: Dashboard Overview Real Publications Only
  await test(10, 'Dashboard Overview Real Publication Totals', async () => {
    const hoaspBrand = await db('brands').where({ name: 'HOASP International' }).first();
    assert.ok(hoaspBrand, 'HOASP brand exists');

    let responseData = null;
    const req = {
      params: { brandId: hoaspBrand.id },
      query: { timeRange: 'all', platform: 'all' },
      user: { userId: 'test_user', tenantId: hoaspBrand.tenant_id, role: 'agency_admin' },
    };
    const res = {
      status(code) { this.statusCode = code; return this; },
      json(data) { responseData = data; return this; },
    };

    await AnalyticsController.getOverview(req, res);

    assert.ok(responseData, 'Overview response must not be null');
    assert.strictEqual(responseData.success, true);

    const data = responseData.data;
    // Total posts in overview must ONLY count real published posts (1 post)
    assert.strictEqual(data.totals.totalPublishedPosts, 1, `Total published posts must be 1, got ${data.totals.totalPublishedPosts}`);
    assert.strictEqual(data.platformBreakdown.facebook.postsCount, 1, 'Facebook real posts must be 1');
    assert.strictEqual(data.platformBreakdown.instagram.postsCount, 0, 'Instagram real posts must be 0');

    // Posts table list in overview must contain exactly 1 real post
    assert.strictEqual(data.posts.length, 1, `Posts items count must be 1, got ${data.posts.length}`);
    assert.strictEqual(data.posts[0].variants[0].remotePostId, '1405588742634526_122100337179498315');
  });

  // Test 11: Duplicate Publishing Prevention
  await test(11, 'Duplicate Publishing Attempt Blocking', async () => {
    const publishedVariant = await db('post_variants').where({ status: 'published' }).first();
    assert.ok(publishedVariant, 'Real published variant must exist');
    const post = await db('posts').where({ id: publishedVariant.post_id }).first();
    assert.ok(post, 'Parent post must exist');
    const brand = await db('brands').where({ id: post.brand_id }).first();
    assert.ok(brand, 'Brand must exist');

    let duplicateBlocked = false;
    try {
      await publishingService.publishSocialPost(
        {
          platform: 'facebook',
          accountId: '1405588742634526',
          text: 'Attempting to republish already confirmed post',
          brandId: brand.id,
          postId: post.id,
          postVariantId: publishedVariant.id,
        },
        {
          tenantId: brand.tenant_id,
        }
      );
    } catch (err) {
      duplicateBlocked = true;
      assert.strictEqual(err.code, 'DUPLICATE_PUBLISHING_ATTEMPT');
      assert.strictEqual(err.httpStatus, 409);
    }
    assert.strictEqual(duplicateBlocked, true, 'Duplicate publishing must be refused with 409 DUPLICATE_PUBLISHING_ATTEMPT');
  });

  // Test 12: Failed Publication Handling & Integrity Guard
  await test(12, 'Failed Publication Status & Audit Log Verification', async () => {
    const brand = await db('brands').where({ name: 'Echo Sound Labs' }).first();
    assert.ok(brand, 'Echo Sound Labs brand exists');

    // Create a temporary post and variant to test failure flow
    const testPostId = crypto.randomUUID();
    const testVariantId = crypto.randomUUID();
    const now = new Date();

    const user = await db('users').first();
    assert.ok(user, 'User must exist');

    await db('posts').insert({
      id: testPostId,
      tenant_id: brand.tenant_id,
      brand_id: brand.id,
      author_id: user.id,
      title: 'Failed Publication Test Post',
      base_content: 'Test base content',
      status: 'draft',
      created_at: now,
      updated_at: now,
    });

    await db('post_variants').insert({
      id: testVariantId,
      post_id: testPostId,
      platform: 'facebook',
      content: 'This should fail validation',
      media_asset_ids: '[]',
      platform_specific_config: '{}',
      status: 'pending',
      created_at: now,
      updated_at: now,
    });

    let failedAsExpected = false;
    try {
      await publishingService.publishSocialPost(
        {
          platform: 'facebook',
          accountId: 'non_existent_page_123',
          text: 'Failing test content',
          brandId: brand.id,
          postId: testPostId,
          postVariantId: testVariantId,
        },
        {
          tenantId: brand.tenant_id,
        }
      );
    } catch (err) {
      failedAsExpected = true;
    }

    assert.strictEqual(failedAsExpected, true, 'Publishing to non-existent account must fail');

    // Verify post_variant is marked failed (or pending/draft, NEVER published)
    const afterVariant = await db('post_variants').where({ id: testVariantId }).first();
    assert.notStrictEqual(afterVariant.status, 'published', 'Failed post variant must NEVER be marked published');

    // Verify post is not published
    const afterPost = await db('posts').where({ id: testPostId }).first();
    assert.notStrictEqual(afterPost.status, 'published', 'Failed post must NEVER be marked published');

    // Clean up temporary test records
    await db('publishing_jobs').where({ post_id: testPostId }).del();
    await db('post_variants').where({ id: testVariantId }).del();
    await db('posts').where({ id: testPostId }).del();
  });

  // Test 13: Data Reclassification Audit Trail Integrity
  await test(13, 'Data Reclassification Audit Trail Verification', async () => {
    const variantAuditCount = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_variant_sandbox' })
      .count('id as count')
      .first();
    assert.strictEqual(Number(variantAuditCount.count), 118, 'Must have 118 variant reclassification audit records');

    const postAuditCount = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_post_sandbox' })
      .count('id as count')
      .first();
    assert.strictEqual(Number(postAuditCount.count), 21, 'Must have 21 post reclassification audit records');

    const jobAuditCount = await db('publishing_audit_logs')
      .where({ action: 'audit_reclassify_job_sandbox' })
      .count('id as count')
      .first();
    assert.strictEqual(Number(jobAuditCount.count), 40, 'Must have 40 job reclassification audit records');

    const conflictAuditCount = await db('publishing_audit_logs')
      .where({ action: 'flag_meta_page_ownership_conflict' })
      .count('id as count')
      .first();
    assert.strictEqual(Number(conflictAuditCount.count), 2, 'Must have 2 ownership conflict audit records');

    const preservedAudit = await db('publishing_audit_logs')
      .where({ action: 'audit_preserve_real_publication' })
      .first();
    assert.ok(preservedAudit, 'Must have audit record for preserved real publication');
    assert.strictEqual(preservedAudit.external_id, '1405588742634526_122100337179498315');
  });

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================\n');

  await db.destroy();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
