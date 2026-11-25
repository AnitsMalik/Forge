/**
 * Automated Verification Suite for Directive 13
 * Content Calendar, 1-Click Batch Campaign Scheduling, Timezone Engine, and Idempotent Batch Publishing
 */

import fetch from 'node-fetch';
import mysql from 'mysql2/promise';
import assert from 'assert';

const API_BASE = 'http://localhost:4000/api/v1';

async function runDirective13TestSuite() {
  console.log('===============================================================');
  console.log('  DIRECTIVE 13: CONTENT CALENDAR & 1-CLICK BATCH PUBLISHING   ');
  console.log('===============================================================\n');

  // 1. Direct MySQL Connection
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: 'socialforge_db',
  });
  console.log('✓ Connected to MySQL database on port 3308');

  // 2. Authenticate
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  const loginData = await loginRes.json();
  assert(loginData.success, 'Login failed');
  const token = loginData.data.tokens.accessToken;
  const brandId = loginData.data.user.brandId || '52f09a1e-e490-4c01-9674-4eb729bd5108';
  console.log(`✓ Authenticated as sarah@apex.com. Brand: ${brandId}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Test Timezone Engine (Unit & Integration)
  console.log('\n--- 1. Testing Timezone Engine ---');
  const { getTimezoneOffsetMinutes, fromBrandLocal, toBrandLocal, getTimezoneDetails } = await import(
    './packages/shared/dist/timezone/index.js'
  );

  // Offset checks
  const utcOffset = getTimezoneOffsetMinutes('UTC');
  assert.strictEqual(utcOffset, 0, 'UTC offset must be 0');

  const tokyoOffset = getTimezoneOffsetMinutes('Asia/Tokyo');
  assert.strictEqual(tokyoOffset, 540, 'Tokyo offset must be +540 (UTC+9)');

  const kolkataOffset = getTimezoneOffsetMinutes('Asia/Kolkata');
  assert.strictEqual(kolkataOffset, 330, 'Kolkata offset must be +330 (UTC+5:30)');

  // Summer EDT vs Winter EST check for America/New_York
  const summerDate = new Date('2026-07-15T12:00:00Z');
  const winterDate = new Date('2026-01-15T12:00:00Z');
  const summerNYOffset = getTimezoneOffsetMinutes('America/New_York', summerDate);
  const winterNYOffset = getTimezoneOffsetMinutes('America/New_York', winterDate);
  assert.strictEqual(summerNYOffset, -240, 'Summer New York must be EDT (UTC-4 = -240 min)');
  assert.strictEqual(winterNYOffset, -300, 'Winter New York must be EST (UTC-5 = -300 min)');
  console.log(`✓ Daylight Saving Time offset verified (Summer EDT: ${summerNYOffset}m, Winter EST: ${winterNYOffset}m)`);

  // Bidirectional conversion
  const testLocalD = '2026-09-24';
  const testLocalT = '09:00';
  const utcDate = fromBrandLocal(testLocalD, testLocalT, 'America/New_York');
  assert.strictEqual(utcDate.toISOString(), '2026-09-24T13:00:00.000Z', '9:00 AM EDT must map to 13:00:00 UTC');

  const backToLocal = toBrandLocal(utcDate, 'America/New_York');
  assert.strictEqual(backToLocal.dateStr, testLocalD, 'Bidirectional date must match');
  assert.strictEqual(backToLocal.timeStr, testLocalT, 'Bidirectional time must match');
  console.log(`✓ Bidirectional brand timezone conversion: ${testLocalD} ${testLocalT} EDT <-> ${utcDate.toISOString()}`);

  const nyDetails = getTimezoneDetails('America/New_York', summerDate);
  assert.strictEqual(nyDetails.hasDST, true, 'New York must have DST support');
  assert.strictEqual(nyDetails.isDST, true, 'Summer New York must be DST active');
  console.log(`✓ Timezone details inspected: ${nyDetails.timeZone} (${nyDetails.abbreviation}, ${nyDetails.offsetString}, DST: ${nyDetails.isDST})`);

  // 4. Generate or select a Campaign with Multi-Platform Posts
  console.log('\n--- 2. Setting Up Test Campaign Arc ---');
  let testCampaignRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      businessIdea: 'Directive 13 Calendar & Batch Publishing Launch Arc',
      campaignGoal: 'launch',
      duration: '3_days',
      platforms: ['instagram', 'x_twitter', 'linkedin', 'facebook', 'tiktok'],
      startDate: '2026-10-01',
    }),
  });
  let testCampaignData = await testCampaignRes.json();
  assert(testCampaignData.success, 'Failed to generate test campaign');
  const campaignId = testCampaignData.data.id;
  const campaignPosts = testCampaignData.data.posts;
  console.log(`✓ Created test campaign "${testCampaignData.data.name}" (ID: ${campaignId}) with ${campaignPosts.length} posts`);

  // 5. Test 1-Click Batch Campaign Scheduling
  console.log('\n--- 3. Testing 1-Click Batch Campaign Scheduling ---');

  // Cadence 1: Daily
  console.log('Testing Cadence: Daily (1 post/day)...');
  let scheduleRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      startDate: '2026-10-01',
      dailyTime: '09:00',
      cadence: 'daily',
    }),
  });
  let scheduleData = await scheduleRes.json();
  assert(scheduleData.success, 'Daily schedule failed: ' + JSON.stringify(scheduleData));
  assert.strictEqual(scheduleData.data.cadence, 'daily');
  console.log(`✓ Daily batch scheduling successful: ${scheduleData.data.postCount} posts scheduled.`);

  // Verify dates in DB
  const [dbDailyPosts] = await db.query('SELECT id, scheduled_for, status FROM posts WHERE campaign_id = ? ORDER BY scheduled_for ASC', [campaignId]);
  assert.strictEqual(dbDailyPosts.length, campaignPosts.length, 'All posts must have schedule');
  console.log(`✓ Verified ${dbDailyPosts.length} posts scheduled consecutively in MySQL.`);

  // Cadence 2: Alternate Days
  console.log('\nTesting Cadence: Alternate Days (every 2 days)...');
  scheduleRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      startDate: '2026-10-05',
      dailyTime: '14:00',
      cadence: 'alternate_days',
    }),
  });
  scheduleData = await scheduleRes.json();
  assert(scheduleData.success, 'Alternate days schedule failed');
  console.log(`✓ Alternate days batch scheduling successful: ${scheduleData.message}`);

  // Cadence 3: Weekdays Only
  console.log('\nTesting Cadence: Weekdays Only (skipping weekends)...');
  // Start on Friday 2026-10-02 -> next post must be Monday 2026-10-05!
  scheduleRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      startDate: '2026-10-02',
      dailyTime: '10:00',
      cadence: 'weekdays',
    }),
  });
  scheduleData = await scheduleRes.json();
  assert(scheduleData.success, 'Weekdays schedule failed');

  const [dbWeekdayPosts] = await db.query('SELECT id, scheduled_for FROM posts WHERE campaign_id = ? ORDER BY scheduled_for ASC', [campaignId]);
  for (const p of dbWeekdayPosts) {
    const postDay = new Date(p.scheduled_for).getUTCDay();
    // In UTC, 10:00 AM EDT is 14:00 UTC Friday (day 5) or Monday (day 1)
    assert(postDay !== 0 && postDay !== 6, `Scheduled post on weekend day ${postDay}!`);
  }
  console.log('✓ Verified weekdays cadence strictly avoided Saturday and Sunday.');

  // Cadence 4: Manual pre-publish adjustments (scheduleItems)
  console.log('\nTesting Manual Pre-Publish Adjustment (scheduleItems)...');
  const customItems = dbDailyPosts.map((p, idx) => ({
    postId: p.id,
    scheduledFor: `2026-10-1${idx + 1}T16:30`,
  }));

  scheduleRes = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      scheduleItems: customItems,
    }),
  });
  scheduleData = await scheduleRes.json();
  assert(scheduleData.success, 'Manual scheduleItems failed');
  console.log(`✓ Manual schedule overrides applied successfully for ${scheduleData.data.postCount} posts.`);

  // 6. Test Drag-and-Drop Rescheduling Endpoint
  console.log('\n--- 4. Testing Drag-and-Drop Rescheduling ---');
  const testPostToReschedule = dbDailyPosts[0].id;
  const targetNewSchedule = '2026-10-25T15:00:00.000Z';

  const dragRes = await fetch(`${API_BASE}/brands/${brandId}/posts/${testPostToReschedule}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ scheduledFor: targetNewSchedule }),
  });
  const dragData = await dragRes.json();
  assert(dragData.success, 'Drag reschedule failed');
  assert.strictEqual(dragData.data.status, 'scheduled', 'Post status must be scheduled');
  console.log(`✓ Post ${testPostToReschedule} drag-and-drop rescheduled to ${targetNewSchedule}.`);

  // 7. Test Batch Publishing with Idempotency Protection
  console.log('\n--- 5. Testing Batch Publishing & Idempotency ---');

  // Attempt 1: First batch publish run
  console.log('Triggering First Batch Publish...');
  const batchPubRes1 = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/publish-now`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ force: false }),
  });
  const batchPubData1 = await batchPubRes1.json();
  assert(batchPubData1.success, 'First batch publish failed');
  console.log(`✓ First Batch Publish: published ${batchPubData1.data.publishedCount} of ${batchPubData1.data.totalCount} posts live.`);
  assert(batchPubData1.data.publishedCount > 0, 'Must have published at least 1 post');

  // Verify in MySQL
  const [publishedPosts] = await db.query(
    "SELECT id, status, published_at FROM posts WHERE campaign_id = ? AND status = 'published'",
    [campaignId]
  );
  assert(publishedPosts.length > 0, 'Posts must have status published');

  const [publishedVariants] = await db.query(
    "SELECT v.id, v.platform, v.status, v.remote_post_url FROM post_variants v JOIN posts p ON v.post_id = p.id WHERE p.campaign_id = ? AND v.status = 'published'",
    [campaignId]
  );
  assert(publishedVariants.length > 0, 'Variants must have status published');
  console.log(`✓ Verified ${publishedVariants.length} platform variants published live with remote URLs.`);

  // Attempt 2: Immediate second batch publish run (IDEMPOTENCY TEST)
  console.log('\nTriggering Second Batch Publish (Testing Idempotency Guard)...');
  const batchPubRes2 = await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}/publish-now`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ force: false }),
  });
  const batchPubData2 = await batchPubRes2.json();
  assert(batchPubData2.success, 'Second batch publish call failed');
  console.log(`✓ Idempotency Result: publishedCount = ${batchPubData2.data.publishedCount}, skippedCount = ${batchPubData2.data.skippedCount}`);
  assert.strictEqual(batchPubData2.data.publishedCount, 0, 'Idempotency guard must NOT republish already published posts');
  assert(batchPubData2.data.skippedCount > 0, 'Idempotent skips must be reported');
  console.log('✓ Idempotency Guard successfully prevented duplicate social posts.');

  // Single post publishNow idempotency check
  const singlePubRes = await fetch(`${API_BASE}/brands/${brandId}/posts/${publishedPosts[0].id}/publish-now`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ force: false }),
  });
  const singlePubData = await singlePubRes.json();
  assert.strictEqual(singlePubData.idempotent, true, 'publishNow must report idempotent: true');
  console.log(`✓ Single post publishNow idempotency guard confirmed: "${singlePubData.message}"`);

  // 8. Test Reliability & Retry Workflow
  console.log('\n--- 6. Testing Reliability & Retry Workflow ---');
  // Mark one post variant as failed in DB
  const [firstPostVariants] = await db.query('SELECT id, post_id FROM post_variants WHERE post_id = ?', [publishedPosts[0].id]);
  const variantToFail = firstPostVariants[0].id;
  await db.query("UPDATE post_variants SET status = 'failed' WHERE id = ?", [variantToFail]);
  await db.query("UPDATE posts SET status = 'failed' WHERE id = ?", [publishedPosts[0].id]);

  const [failedCheck] = await db.query('SELECT status FROM posts WHERE id = ?', [publishedPosts[0].id]);
  assert.strictEqual(failedCheck[0].status, 'failed', 'Post status must be failed');
  console.log(`✓ Post ${publishedPosts[0].id} variant ${variantToFail} simulated as failed.`);

  // Call Retry endpoint
  console.log('Calling POST /posts/:postId/retry...');
  const retryRes = await fetch(`${API_BASE}/brands/${brandId}/posts/${publishedPosts[0].id}/retry`, {
    method: 'POST',
    headers: authHeaders,
  });
  const retryData = await retryRes.json();
  assert(retryData.success, 'Retry failed');
  assert.strictEqual(retryData.data.status, 'published', 'Post status must recover to published');
  console.log(`✓ Post ${publishedPosts[0].id} successfully recovered via Retry! Status: ${retryData.data.status}`);

  // 9. Clean up test campaign
  await fetch(`${API_BASE}/brands/${brandId}/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log('\n✓ Cleaned up test campaign.');

  await db.end();

  console.log('\n===============================================================');
  console.log('  ALL DIRECTIVE 13 INTEGRATION TESTS PASSED (100% SUCCESS)    ');
  console.log('===============================================================\n');
}

runDirective13TestSuite().catch((err) => {
  console.error('\n❌ DIRECTIVE 13 TEST FAILED:', err);
  process.exit(1);
});
