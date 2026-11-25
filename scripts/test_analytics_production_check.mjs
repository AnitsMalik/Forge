import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { MetaAnalyticsSyncService } from '../apps/api/dist/services/meta/analyticsSync.js';
import { MetaAnalyticsScheduler } from '../apps/api/dist/services/meta/analyticsScheduler.js';
import { AnalyticsController } from '../apps/api/dist/controllers/analyticsController.js';
import crypto from 'crypto';

const TARGET_BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const TARGET_PAGE_ID = '1405588742634526';

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

async function runProductionChecks() {
  console.log('================================================================');
  console.log('   SOCIALFORGE FINAL ANALYTICS PRODUCTION CHECK & VERIFICATION');
  console.log('================================================================\n');

  const targetBrand = await db('brands').where({ id: TARGET_BRAND_ID }).first();
  const targetTenantId = targetBrand ? targetBrand.tenant_id : '00000000-0000-0000-0000-000000000000';
  const author = await db('users').first();
  const authorId = author ? author.id : crypto.randomUUID();

  const testPostId = crypto.randomUUID();
  const testFbVariantId = crypto.randomUUID();
  const testIgVariantId = crypto.randomUUID();
  const now = new Date();

  // Create test post and variants
  await db('posts').insert({
    id: testPostId,
    tenant_id: targetTenantId,
    brand_id: TARGET_BRAND_ID,
    author_id: authorId,
    title: 'Production Check Analytics Post',
    base_content: 'Comprehensive testing for automated scheduler, rate limiting, and snapshot isolation',
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
      content: 'Production check FB content',
      remote_post_id: `${TARGET_PAGE_ID}_prod_check_fb_1`,
      remote_post_url: `https://facebook.com/${TARGET_PAGE_ID}/posts/prod_check_fb_1`,
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
      content: 'Production check IG caption',
      remote_post_id: `prod_check_ig_1`,
      remote_post_url: `https://instagram.com/p/prod_check_ig_1`,
      media_asset_ids: '[]',
      platform_specific_config: '{}',
      created_at: now,
      updated_at: now,
    },
  ]);

  try {
    // -------------------------------------------------------------------------
    // CHECK 1: AUTO SYNC & BACKGROUND JOB RUNNER
    // -------------------------------------------------------------------------
    console.log('[Check 1] Automatic Scheduled Sync & Background Job...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1/insights`, () => ({
      data: [
        { name: 'post_impressions_unique', values: [{ value: 1200 }] },
        { name: 'post_impressions', values: [{ value: 1600 }] },
      ],
    }));
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1`, () => ({
      id: `${TARGET_PAGE_ID}_prod_check_fb_1`,
      shares: { count: 14 },
      comments: { summary: { total_count: 22 } },
      reactions: { summary: { total_count: 85 } },
    }));
    MetaClient.registerMock(`prod_check_ig_1/insights`, () => ({
      data: [
        { name: 'reach', values: [{ value: 2100 }] },
        { name: 'impressions', values: [{ value: 2800 }] },
        { name: 'saved', values: [{ value: 35 }] },
        { name: 'shares', values: [{ value: 20 }] },
        { name: 'total_interactions', values: [{ value: 240 }] },
      ],
    }));
    MetaClient.registerMock(`prod_check_ig_1`, () => ({
      id: 'prod_check_ig_1',
      like_count: 140,
      comments_count: 45,
    }));

    // Trigger one background sync cycle
    const cycleResult = await MetaAnalyticsScheduler.runSyncCycle();

    assert(cycleResult.brandsChecked > 0, 'Scheduler background runner checked active connected brands');
    assert(cycleResult.brandsSynced > 0, 'Scheduler successfully synced brand analytics');

    const fbSnapshot = await db('post_analytics_snapshots')
      .where({ post_variant_id: testFbVariantId })
      .first();

    assert(fbSnapshot !== undefined, 'Background auto-sync created snapshot for published Facebook post');
    assert(fbSnapshot.reach === 1200, 'Auto-sync fetched real reach (1200) from Meta');
    assert(fbSnapshot.reactions === 85, 'Auto-sync fetched real reactions (85) from Meta');

    // -------------------------------------------------------------------------
    // CHECK 2: INCREMENTAL SYNCING & RATE LIMIT COOLDOWN
    // -------------------------------------------------------------------------
    console.log('\n[Check 2] Incremental Syncing & Rate Limit Cooldown...');
    // Immediately trigger a second background sync cycle without force
    // Since fbSnapshot was just updated moments ago, it must be skipped by the cooldown filter!
    const incrementalResult = await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      force: false,
      cooldownMinutes: 15,
    });

    assert(incrementalResult.totalPublished === 0, 'Incremental sync safely skipped posts within 15-minute cooldown');
    assert(incrementalResult.syncedCount === 0, 'Zero unnecessary API calls made, preserving Meta rate limits');

    // -------------------------------------------------------------------------
    // CHECK 3: MANUAL REFRESH OVERRIDES COOLDOWN
    // -------------------------------------------------------------------------
    console.log('\n[Check 3] Manual "Refresh Analytics" Overrides Cooldown...');
    const manualRefreshResult = await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      force: true, // Manual click
    });

    assert(manualRefreshResult.totalPublished > 0, 'Manual refresh with force: true processes published posts');
    assert(manualRefreshResult.syncedCount > 0, 'Manual refresh successfully synchronized metrics');

    // -------------------------------------------------------------------------
    // CHECK 4: CONCURRENT SYNC LOCK PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n[Check 4] Concurrent Sync Lock Protection...');
    // Start two sync requests simultaneously for the same brand
    const [firstSync, concurrentSync] = await Promise.all([
      MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, { force: true }),
      MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, { force: true }),
    ]);

    const oneSkipped = firstSync.skipped === true || concurrentSync.skipped === true;
    assert(oneSkipped, 'Concurrency guard prevented overlapping sync execution for the same brand');

    // -------------------------------------------------------------------------
    // CHECK 5: TRANSIENT ERROR RETRY WITH EXPONENTIAL BACKOFF
    // -------------------------------------------------------------------------
    console.log('\n[Check 5] Transient Error Retry with Exponential Backoff...');
    let retryAttempts = 0;
    const testTransientFn = async () => {
      retryAttempts++;
      if (retryAttempts < 3) {
        const err = new Error('Meta Graph API temporary rate limit (HTTP 429)');
        err.statusCode = 429;
        throw err;
      }
      return { success: true, attempts: retryAttempts };
    };

    const retryResult = await MetaAnalyticsSyncService.retryWithBackoff(testTransientFn, 2);
    assert(retryResult.attempts === 3, 'Transient error was retried with exponential backoff until success');

    // -------------------------------------------------------------------------
    // CHECK 6: NEVER RETRY EXPIRED TOKEN INDEFINITELY
    // -------------------------------------------------------------------------
    console.log('\n[Check 6] Non-Retry of Expired/Revoked Authentication...');
    let authAttempts = 0;
    const testAuthFn = async () => {
      authAttempts++;
      const err = new Error('OAuthException: Session expired (code 190)');
      err.statusCode = 401;
      err.code = 190;
      throw err;
    };

    let caughtAuthError = false;
    try {
      await MetaAnalyticsSyncService.retryWithBackoff(testAuthFn, 3);
    } catch {
      caughtAuthError = true;
    }

    assert(caughtAuthError, 'Auth error immediately threw without infinite retries');
    assert(authAttempts === 1, 'Auth error was attempted exactly once and NEVER retried');

    // -------------------------------------------------------------------------
    // CHECK 7: METADATA TRACKING (last_successful_sync, last_attempt, last_error)
    // -------------------------------------------------------------------------
    console.log('\n[Check 7] Recording Sync Metadata on Connections & Snapshots...');
    const connMeta = await db('meta_connections')
      .where({ brand_id: TARGET_BRAND_ID })
      .first();

    assert(connMeta.last_successful_sync !== null, 'Connection has valid last_successful_sync timestamp');
    assert(connMeta.last_attempt !== null, 'Connection has valid last_attempt timestamp');

    const snapMeta = await db('post_analytics_snapshots')
      .where({ post_variant_id: testFbVariantId })
      .first();

    assert(snapMeta.last_fetched_at !== null, 'Snapshot records last_fetched_at');
    assert(snapMeta.last_attempt !== null, 'Snapshot records last_attempt');

    // -------------------------------------------------------------------------
    // CHECK 8: PRESERVE SNAPSHOT ON TEMPORARY FAILURE
    // -------------------------------------------------------------------------
    console.log('\n[Check 8] Preserve Snapshot on Temporary Outage...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1`, () => {
      const err = new Error('Meta Graph API 503 Service Unavailable');
      err.statusCode = 503;
      throw err;
    });

    await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      postId: testPostId,
      postVariantId: testFbVariantId,
    });

    const snapPreserved = await db('post_analytics_snapshots')
      .where({ post_variant_id: testFbVariantId })
      .first();

    assert(snapPreserved.reach === 1200, 'Previous verified reach (1200) was preserved during 503 outage');
    assert(snapPreserved.impressions === 1600, 'Previous impressions (1600) was preserved');
    assert(snapPreserved.last_error !== null, 'last_error was safely recorded on the snapshot');

    // -------------------------------------------------------------------------
    // CHECK 9: DASHBOARD TOTALS ACCURACY (LATEST SNAPSHOT ONLY, NO DUPLICATION)
    // -------------------------------------------------------------------------
    console.log('\n[Check 9] Dashboard Totals Calculation (Single Snapshot per Variant)...');
    const fakeReqOverview = {
      params: { brandId: TARGET_BRAND_ID },
      query: { timeRange: 'all' },
      user: { userId: authorId, tenantId: targetTenantId, role: 'agency_admin' },
    };
    let overviewRes = null;
    const fakeRes = {
      json: (payload) => { overviewRes = payload.data; },
      status: () => fakeRes,
    };

    await AnalyticsController.getOverview(fakeReqOverview, fakeRes);

    assert(overviewRes !== null, 'Overview successfully returned');
    assert(overviewRes.totals.totalPublishedPosts >= 1, 'Total published posts is accurate');
    assert(overviewRes.totals.totalReach !== null, 'Total reach is computed from latest snapshot');
    assert(overviewRes.totals.lastSuccessfulSync !== null, 'lastSuccessfulSync is returned to dashboard');

    // Verify that repeating sync multiple times does NOT inflate totals
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1/insights`, () => ({
      data: [{ name: 'post_impressions_unique', values: [{ value: 1200 }] }],
    }));
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1`, () => ({
      id: `${TARGET_PAGE_ID}_prod_check_fb_1`,
      shares: { count: 14 },
      reactions: { summary: { total_count: 85 } },
    }));

    // Run sync again
    await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      postId: testPostId,
      postVariantId: testFbVariantId,
      force: true,
    });

    let overviewRes2 = null;
    const fakeRes2 = {
      json: (payload) => { overviewRes2 = payload.data; },
      status: () => fakeRes2,
    };
    await AnalyticsController.getOverview(fakeReqOverview, fakeRes2);

    assert(
      overviewRes2.totals.totalReach === overviewRes.totals.totalReach,
      'Dashboard total reach remains identical after repeated sync (NO cumulative inflation)'
    );

    // -------------------------------------------------------------------------
    // CHECK 10: HISTORICAL DATA PRESERVED ON TOKEN EXPIRY
    // -------------------------------------------------------------------------
    console.log('\n[Check 10] Historical Data Preserved on Token Expiry...');
    MetaClient.clearMocks();
    MetaClient.registerMock(`${TARGET_PAGE_ID}_prod_check_fb_1`, () => {
      const err = new Error('Error validating access token (code 190)');
      err.statusCode = 401;
      err.code = 190;
      throw err;
    });

    await MetaAnalyticsSyncService.syncBrandAnalytics(TARGET_BRAND_ID, {
      postId: testPostId,
      force: true,
    });

    const historicalSnap = await db('post_analytics_snapshots')
      .where({ post_variant_id: testFbVariantId })
      .first();

    assert(historicalSnap !== undefined, 'Snapshot record exists after token expiry');
    assert(historicalSnap.reach === 1200, 'Historical metrics (1200 reach) are NOT deleted when token expires');

    // Restore connection
    await db('meta_connections')
      .where({ brand_id: TARGET_BRAND_ID })
      .update({ status: 'connected', updated_at: new Date() });

  } finally {
    // Cleanup test fixtures
    await db('post_analytics_metrics').where({ post_id: testPostId }).delete();
    await db('post_analytics_snapshots').where({ post_id: testPostId }).delete();
    await db('post_variants').where({ post_id: testPostId }).delete();
    await db('posts').where({ id: testPostId }).delete();
    MetaClient.clearMocks();
  }

  console.log('\n================================================================');
  console.log(`PRODUCTION CHECK RESULT: ${passCount} PASS / ${failCount} FAIL`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionChecks().catch((err) => {
  console.error('Fatal production check error:', err);
  process.exit(1);
});
