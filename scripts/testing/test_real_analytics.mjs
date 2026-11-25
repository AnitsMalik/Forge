import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { MetaAnalyticsSyncService } from '../apps/api/dist/services/meta/analyticsSync.js';
import { AnalyticsController } from '../apps/api/dist/controllers/analyticsController.js';
import crypto from 'crypto';

const TARGET_BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const TARGET_PAGE_ID = '1405588742634526';
const TARGET_IG_ID = '17841441490581879';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('   SOCIALFORGE REAL SOCIAL POST ANALYTICS TEST SUITE');
  console.log('================================================================\n');

  // Prepare test isolation fixtures
  const testPostId = crypto.randomUUID();
  const testFbVariantId = crypto.randomUUID();
  const testIgVariantId = crypto.randomUUID();
  const now = new Date();

  // Fetch real tenant_id from target brand
  const targetBrand = await db('brands').where({ id: TARGET_BRAND_ID }).first();
  const targetTenantId = targetBrand ? targetBrand.tenant_id : '00000000-0000-0000-0000-000000000000';

  // Create author user if needed
  const author = await db('users').first();
  const authorId = author ? author.id : crypto.randomUUID();

  // 1. Insert test post and variants
  await db('posts').insert({
    id: testPostId,
    tenant_id: targetTenantId,
    brand_id: TARGET_BRAND_ID,
    author_id: authorId,
    title: 'Real Analytics Automated Test Post',
    base_content: 'Testing verified real Meta analytics ingestion and reporting',
    status: 'published',
    published_at: now,
    created_at: now,
    updated_at: now,
  });

  await db('post_variants').insert([
    {
      id: testFbVariantId,
      post_id: testPostId,
      platform: 'facebook',
      status: 'published',
      content: 'Facebook test post content',
      remote_post_id: `${TARGET_PAGE_ID}_test_fb_post_999`,
      remote_post_url: `https://facebook.com/${TARGET_PAGE_ID}/posts/test_fb_post_999`,
      media_asset_ids: '[]',
      platform_specific_config: '{}',
      created_at: now,
      updated_at: now,
    },
    {
      id: testIgVariantId,
      post_id: testPostId,
      platform: 'instagram',
      status: 'published',
      content: 'Instagram test media caption',
      remote_post_id: `test_ig_media_888`,
      remote_post_url: `https://instagram.com/p/test_ig_media_888`,
      media_asset_ids: '[]',
      platform_specific_config: '{}',
      created_at: now,
      updated_at: now,
    },
  ]);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Facebook Analytics (Real Object Fields & Insights)
    // -------------------------------------------------------------------------
    console.log('[Test 1] Facebook Analytics (Real Object Fields & Insights)...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_test_fb_post_999/insights`, () => ({
      data: [
        { name: 'post_impressions_unique', period: 'lifetime', values: [{ value: 1420 }] },
        { name: 'post_impressions', period: 'lifetime', values: [{ value: 1850 }] },
        { name: 'post_clicks', period: 'lifetime', values: [{ value: 74 }] },
        { name: 'post_video_views', period: 'lifetime', values: [{ value: 310 }] },
        { name: 'post_engaged_users', period: 'lifetime', values: [{ value: 215 }] },
      ],
    }));
    MetaClient.registerMock(`${TARGET_PAGE_ID}_test_fb_post_999`, () => ({
      id: `${TARGET_PAGE_ID}_test_fb_post_999`,
      message: 'Testing FB analytics',
      permalink_url: 'https://facebook.com/1405588742634526/posts/test_fb_post_999',
      shares: { count: 18 },
      comments: { summary: { total_count: 32 } },
      reactions: { summary: { total_count: 91 } },
    }));

    const fbMetrics = await MetaAnalyticsSyncService.fetchFacebookPostMetrics(
      `${TARGET_PAGE_ID}_test_fb_post_999`,
      'mock_token'
    );

    assert(fbMetrics.reach === 1420, 'Facebook reach equals 1420 from Meta post_impressions_unique');
    assert(fbMetrics.impressions === 1850, 'Facebook impressions equals 1850 from Meta post_impressions');
    assert(fbMetrics.reactions === 91, 'Facebook reactions equals 91 from Meta reactions.summary');
    assert(fbMetrics.comments === 32, 'Facebook comments equals 32 from Meta comments.summary');
    assert(fbMetrics.shares === 18, 'Facebook shares equals 18 from Meta shares.count');
    assert(fbMetrics.clicks === 74, 'Facebook clicks equals 74 from Meta post_clicks');
    assert(fbMetrics.video_views === 310, 'Facebook video views equals 310 from Meta post_video_views');
    assert(fbMetrics.engagement === 215, 'Facebook engagement equals 215 from Meta post_engaged_users');
    assert(fbMetrics.engagement_rate === 15.14, 'Facebook engagement rate calculated as (215 / 1420 * 100) = 15.14%');

    // -------------------------------------------------------------------------
    // TEST 2: Instagram Analytics (Real Media Fields & Insights)
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Instagram Analytics (Real Media Fields & Insights)...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`test_ig_media_888/insights`, () => ({
      data: [
        { name: 'reach', values: [{ value: 2340 }] },
        { name: 'impressions', values: [{ value: 3120 }] },
        { name: 'saved', values: [{ value: 48 }] },
        { name: 'shares', values: [{ value: 29 }] },
        { name: 'total_interactions', values: [{ value: 312 }] },
        { name: 'plays', values: [{ value: 890 }] },
      ],
    }));
    MetaClient.registerMock(`test_ig_media_888`, () => ({
      id: 'test_ig_media_888',
      caption: 'Testing IG analytics',
      media_type: 'IMAGE',
      permalink: 'https://instagram.com/p/test_ig_media_888',
      like_count: 175,
      comments_count: 60,
    }));

    const igMetrics = await MetaAnalyticsSyncService.fetchInstagramMediaMetrics(
      'test_ig_media_888',
      'mock_token'
    );

    assert(igMetrics.reach === 2340, 'Instagram reach equals 2340 from Meta reach insight');
    assert(igMetrics.impressions === 3120, 'Instagram impressions equals 3120 from Meta impressions insight');
    assert(igMetrics.likes === 175, 'Instagram likes equals 175 from Meta like_count');
    assert(igMetrics.comments === 60, 'Instagram comments equals 60 from Meta comments_count');
    assert(igMetrics.saves === 48, 'Instagram saves equals 48 from Meta saved insight');
    assert(igMetrics.shares === 29, 'Instagram shares equals 29 from Meta shares insight');
    assert(igMetrics.video_views === 890, 'Instagram video plays equals 890 from Meta plays insight');
    assert(igMetrics.engagement === 312, 'Instagram engagement equals 312 from Meta total_interactions');
    assert(igMetrics.engagement_rate === 13.33, 'Instagram engagement rate calculated as (312 / 2340 * 100) = 13.33%');

    // -------------------------------------------------------------------------
    // TEST 3: Zero Real Metric (Meta returns 0)
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Zero Real Metric Handling (Preserves 0, not null)...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`zero_metric_post/insights`, () => ({
      data: [
        { name: 'post_impressions_unique', values: [{ value: 0 }] },
        { name: 'post_impressions', values: [{ value: 0 }] },
        { name: 'post_clicks', values: [{ value: 0 }] },
      ],
    }));
    MetaClient.registerMock(`zero_metric_post`, () => ({
      id: 'zero_metric_post',
      shares: { count: 0 },
      comments: { summary: { total_count: 0 } },
      reactions: { summary: { total_count: 0 } },
    }));

    const zeroMetrics = await MetaAnalyticsSyncService.fetchFacebookPostMetrics(
      'zero_metric_post',
      'mock_token'
    );

    assert(zeroMetrics.reach === 0, 'Real zero reach is strictly 0 (not null, not estimated)');
    assert(zeroMetrics.impressions === 0, 'Real zero impressions is strictly 0');
    assert(zeroMetrics.reactions === 0, 'Real zero reactions is strictly 0');
    assert(zeroMetrics.comments === 0, 'Real zero comments is strictly 0');
    assert(zeroMetrics.shares === 0, 'Real zero shares is strictly 0');
    assert(zeroMetrics.clicks === 0, 'Real zero clicks is strictly 0');

    // -------------------------------------------------------------------------
    // TEST 4: Unavailable Metric Handling (Not returned by Meta -> strictly null)
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Unavailable Metric Handling (Never invented -> strictly null)...');
    MetaClient.clearMocks();
    // Simulate image post where Meta does NOT return video_views or post_clicks
    MetaClient.registerMock(`unavail_metric_post/insights`, () => ({
      data: [
        { name: 'post_impressions_unique', values: [{ value: 500 }] },
        { name: 'post_impressions', values: [{ value: 620 }] },
      ],
    }));
    MetaClient.registerMock(`unavail_metric_post`, () => ({
      id: 'unavail_metric_post',
      reactions: { summary: { total_count: 10 } },
    }));

    const unavailMetrics = await MetaAnalyticsSyncService.fetchFacebookPostMetrics(
      'unavail_metric_post',
      'mock_token'
    );

    assert(unavailMetrics.reach === 500, 'Available reach is returned as 500');
    assert(unavailMetrics.video_views === null, 'Unavailable video_views is strictly null (Not available)');
    assert(unavailMetrics.clicks === null, 'Unavailable clicks is strictly null (Not available)');
    assert(unavailMetrics.saves === null, 'Unavailable saves is strictly null (Not available)');

    // -------------------------------------------------------------------------
    // TEST 5: API Error Handling (Retains snapshot, does not erase previous metrics)
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] API Error Handling (Retains last snapshot, records last_error)...');
    // First persist a valid metric snapshot
    await MetaAnalyticsSyncService.persistMetrics(
      TARGET_BRAND_ID,
      testPostId,
      testFbVariantId,
      'facebook',
      `${TARGET_PAGE_ID}_test_fb_post_999`,
      fbMetrics,
      now
    );

    // Now simulate Meta API throwing 500 server error on sync
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_test_fb_post_999`, () => {
      const err = new Error('Meta Graph API temporary internal error (HTTP 500)');
      err.statusCode = 500;
      throw err;
    });

    const syncErrorResult = await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      postId: testPostId,
      postVariantId: testFbVariantId,
    });

    assert(syncErrorResult.failedCount > 0, 'Sync reported failure on temporary API error');

    // Check that previous snapshot metrics are preserved
    const snapshotAfterError = await db('post_analytics_snapshots')
      .where({ post_variant_id: testFbVariantId })
      .first();

    assert(snapshotAfterError.reach === 1420, 'Previous reach (1420) was preserved after API error');
    assert(snapshotAfterError.impressions === 1850, 'Previous impressions (1850) was preserved after API error');
    assert(snapshotAfterError.reactions === 91, 'Previous reactions (91) was preserved after API error');
    assert(snapshotAfterError.last_error !== null, 'last_error was recorded on snapshot');

    // -------------------------------------------------------------------------
    // TEST 6: Expired Token Detection (REAUTH_REQUIRED)
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Expired Token Detection & REAUTH_REQUIRED status...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_test_fb_post_999`, () => {
      const err = new Error('Error validating access token: Session has expired (code 190)');
      err.statusCode = 401;
      err.code = 190;
      throw err;
    });

    const expiredSyncResult = await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      postId: testPostId,
      postVariantId: testFbVariantId,
    });

    assert(expiredSyncResult.reauthRequired === true, 'Sync detected expired token and reported reauthRequired: true');

    const updatedConn = await db('meta_connections')
      .where({ brand_id: TARGET_BRAND_ID })
      .orderBy('created_at', 'desc')
      .first();

    assert(updatedConn.status === 'reauth_required', 'Connection status transitioned to reauth_required in DB');

    // Restore connection to connected for subsequent tests
    await db('meta_connections')
      .where({ id: updatedConn.id })
      .update({ status: 'connected', updated_at: new Date() });

    // -------------------------------------------------------------------------
    // TEST 7: Duplicate Sync Prevention (Upsert on post_analytics_metrics)
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Duplicate Sync Prevention (Idempotent Upsert)...');
    // Persist fbMetrics first time
    await MetaAnalyticsSyncService.persistMetrics(
      TARGET_BRAND_ID,
      testPostId,
      testFbVariantId,
      'facebook',
      `${TARGET_PAGE_ID}_test_fb_post_999`,
      fbMetrics,
      now
    );

    const countBefore = await db('post_analytics_metrics')
      .where({ post_variant_id: testFbVariantId, metric: 'reach' })
      .count('id as cnt');

    // Persist fbMetrics second time (updated reach value 1435)
    const updatedFbMetrics = { ...fbMetrics, reach: 1435 };
    await MetaAnalyticsSyncService.persistMetrics(
      TARGET_BRAND_ID,
      testPostId,
      testFbVariantId,
      'facebook',
      `${TARGET_PAGE_ID}_test_fb_post_999`,
      updatedFbMetrics,
      now
    );

    const countAfter = await db('post_analytics_metrics')
      .where({ post_variant_id: testFbVariantId, metric: 'reach' })
      .count('id as cnt');

    const updatedReachRow = await db('post_analytics_metrics')
      .where({ post_variant_id: testFbVariantId, metric: 'reach' })
      .first();

    assert(Number(countBefore[0].cnt) === 1, 'First sync created exactly 1 row for reach');
    assert(Number(countAfter[0].cnt) === 1, 'Repeated sync updated existing row without creating duplicate');
    assert(Number(updatedReachRow.value) === 1435, 'Row value was updated to 1435');

    // Also persist IG metrics
    await MetaAnalyticsSyncService.persistMetrics(
      TARGET_BRAND_ID,
      testPostId,
      testIgVariantId,
      'instagram',
      'test_ig_media_888',
      igMetrics,
      now
    );

    // -------------------------------------------------------------------------
    // TEST 8: Pagination in Analytics Overview
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Pagination in Analytics Overview...');
    const fakeReqP1 = {
      params: { brandId: TARGET_BRAND_ID },
      query: { page: '1', limit: '1', timeRange: 'all' },
      user: { userId: authorId, tenantId: targetTenantId, role: 'agency_admin' },
    };
    let responseDataP1 = null;
    const fakeResP1 = {
      json: (payload) => { responseDataP1 = payload.data; },
      status: () => fakeResP1,
    };
    await AnalyticsController.getOverview(fakeReqP1, fakeResP1);

    assert(responseDataP1 !== null, 'Pagination endpoint returned data');
    assert(responseDataP1.pagination.page === 1, 'Pagination page is 1');
    assert(responseDataP1.pagination.limit === 1, 'Pagination limit is 1');
    assert(responseDataP1.posts.length <= 1, 'Page 1 returned at most 1 post according to limit');
    assert(responseDataP1.pagination.totalCount >= 1, 'totalCount correctly reflects total published posts');

    // -------------------------------------------------------------------------
    // TEST 9: Date Filtering (today, 7d, 30d, custom)
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Date Filtering (Today, 7d, 30d, Custom Range)...');
    const fakeReqToday = {
      params: { brandId: TARGET_BRAND_ID },
      query: { timeRange: 'today' },
      user: { userId: authorId, tenantId: targetTenantId, role: 'agency_admin' },
    };
    let resDataToday = null;
    const fakeResToday = {
      json: (payload) => { resDataToday = payload.data; },
      status: () => fakeResToday,
    };
    await AnalyticsController.getOverview(fakeReqToday, fakeResToday);

    assert(resDataToday !== null, 'Today filter returned valid overview');
    assert(resDataToday.filters.timeRange === 'today', 'Filters metadata confirms timeRange: today');
    assert(new Date(resDataToday.filters.startDate) <= now, 'Filter startDate covers today');

    // -------------------------------------------------------------------------
    // TEST 10: Platform Filtering (facebook vs instagram)
    // -------------------------------------------------------------------------
    console.log('\n[Test 10] Platform Filtering (Facebook vs Instagram)...');
    const fakeReqFB = {
      params: { brandId: TARGET_BRAND_ID },
      query: { platform: 'facebook', timeRange: 'all' },
      user: { userId: authorId, tenantId: targetTenantId, role: 'agency_admin' },
    };
    let resDataFB = null;
    const fakeResFB = {
      json: (payload) => { resDataFB = payload.data; },
      status: () => fakeResFB,
    };
    await AnalyticsController.getOverview(fakeReqFB, fakeResFB);

    assert(resDataFB !== null, 'Facebook platform filter returned data');
    const fbVariantsOnly = resDataFB.posts.every((p) =>
      p.variants.every((v) => v.platform === 'facebook')
    );
    assert(fbVariantsOnly, 'All returned posts variants only belong to Facebook platform');

    const fakeReqIG = {
      params: { brandId: TARGET_BRAND_ID },
      query: { platform: 'instagram', timeRange: 'all' },
      user: { userId: authorId, tenantId: targetTenantId, role: 'agency_admin' },
    };
    let resDataIG = null;
    const fakeResIG = {
      json: (payload) => { resDataIG = payload.data; },
      status: () => fakeResIG,
    };
    await AnalyticsController.getOverview(fakeReqIG, fakeResIG);

    const igVariantsOnly = resDataIG.posts.every((p) =>
      p.variants.every((v) => v.platform === 'instagram')
    );
    assert(igVariantsOnly, 'All returned posts variants only belong to Instagram platform');

    // -------------------------------------------------------------------------
    // TEST 11: Permission Isolation (Multi-tenant security)
    // -------------------------------------------------------------------------
    console.log('\n[Test 11] Permission Isolation (Multi-tenant security)...');
    const unauthorizedUserReq = {
      params: { brandId: TARGET_BRAND_ID },
      query: {},
      user: { userId: 'unauthorized-user-999', tenantId: 'different-tenant-777', role: 'creator' },
    };
    let statusCode = 200;
    let forbiddenBody = null;
    const fakeResForbidden = {
      status: (code) => {
        statusCode = code;
        return fakeResForbidden;
      },
      json: (payload) => { forbiddenBody = payload; },
    };

    await AnalyticsController.getOverview(unauthorizedUserReq, fakeResForbidden);

    assert(statusCode === 403, 'Unauthorized tenant access returns HTTP 403 Forbidden');
    assert(forbiddenBody?.error?.code === 'FORBIDDEN', 'Error code is FORBIDDEN');

  } finally {
    // Clean up test fixtures
    await db('post_analytics_metrics').where({ post_id: testPostId }).delete();
    await db('post_analytics_snapshots').where({ post_id: testPostId }).delete();
    await db('post_variants').where({ post_id: testPostId }).delete();
    await db('posts').where({ id: testPostId }).delete();
    MetaClient.clearMocks();
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passCount} PASS / ${failCount} FAIL`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
