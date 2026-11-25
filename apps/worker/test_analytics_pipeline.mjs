// Phase 9: Analytics Ingestion & Reporting Engine Test Suite


const API_BASE = 'http://localhost:4000/api/v1';

async function runAnalyticsTestSuite() {
  console.log('============================================================');
  console.log('  SocialForge Phase 9: Analytics Ingestion & Reporting Suite');
  console.log('============================================================\n');

  // 1. Authenticate Master Superadmin
  console.log('1. Authenticating test user (singh.ninex@gmail.com)...');
  const authRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'singh.ninex@gmail.com', password: 'Access@123' }),
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData.success) {
    throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
  }
  const token = authData.data.tokens.accessToken;
  console.log('   ✓ Authentication successful! Token acquired.\n');

  // 2. Fetch Brand Details
  console.log('2. Resolving Brand context...');
  const brandsRes = await fetch(`${API_BASE}/brands`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const brandsData = await brandsRes.json();
  const brand = brandsData.data?.brands?.[0] || brandsData.data?.[0];
  if (!brand) throw new Error('No brand found for user');
  const brandId = brand.id;
  console.log(`   ✓ Identified Brand: "${brand.name}" (ID: ${brandId})\n`);

  // 3. Trigger Analytics Synchronization & Telemetry Ingestion
  console.log('3. Triggering Live Telemetry Synchronization & Multi-Day History Ingestion...');
  const syncRes = await fetch(`${API_BASE}/brands/${brandId}/analytics/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const syncData = await syncRes.json();
  if (!syncRes.ok || !syncData.success) {
    throw new Error(`Metric synchronization failed: ${JSON.stringify(syncData)}`);
  }
  console.log(`   ✓ Telemetry Synchronized: ${syncData.data.syncedCount} variants updated.`);
  if (syncData.data.historyCreated) {
    console.log(`   ✓ Generated ${syncData.data.historyCreated} multi-day historical trend points.`);
  }
  console.log();

  // 4. Test Analytics Overview (14-Day Default Window)
  console.log('4. Querying Analytics Overview (14-Day Window)...');
  const overviewRes = await fetch(`${API_BASE}/brands/${brandId}/analytics/overview?timeRange=14d`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const overviewData = await overviewRes.json();
  if (!overviewRes.ok || !overviewData.success) {
    throw new Error(`Failed to fetch overview: ${JSON.stringify(overviewData)}`);
  }
  const ov = overviewData.data.overview;
  console.log('   ✓ Executive KPIs Received:');
  console.log(`     - Total Gross Impressions: ${ov.totalImpressions.toLocaleString()}`);
  console.log(`     - Total Audience Reach:    ${ov.totalReach.toLocaleString()}`);
  console.log(`     - Average Engagement Rate: ${ov.averageEngagementRate}%`);
  console.log(`     - Total Interactions:      ${(ov.totalLikes + ov.totalComments + ov.totalShares + ov.totalClicks).toLocaleString()}`);
  console.log(`     - Total Video Views:       ${ov.totalVideoViews.toLocaleString()}`);
  console.log(`     - Active Variants:         ${ov.totalPublishedVariants}`);
  console.log(`     - Reach Growth Delta:      +${ov.growthVsLastPeriod.reachPercent}%\n`);

  // 5. Test Continuous Daily Time-Series Points
  console.log('5. Verifying Continuous Daily Time-Series Points...');
  const timeSeries = overviewData.data.timeSeries;
  if (!Array.isArray(timeSeries) || timeSeries.length !== 14) {
    throw new Error(`Expected 14 daily time-series points, received ${timeSeries?.length}`);
  }
  const firstPt = timeSeries[0];
  const lastPt = timeSeries[timeSeries.length - 1];
  console.log(`   ✓ Time-series spans from ${firstPt.date} to ${lastPt.date} (${timeSeries.length} points)`);
  console.log(`     - Latest day impressions:  ${lastPt.impressions.toLocaleString()}`);
  console.log(`     - Latest day interactions: ${lastPt.engagements.toLocaleString()}`);
  console.log(`     - Latest day engage rate:  ${lastPt.engagementRate}%\n`);

  // 6. Test Time-Range Selectors (7d & 30d)
  console.log('6. Verifying Flexible Time-Range Windows (7d and 30d)...');
  const res7d = await fetch(`${API_BASE}/brands/${brandId}/analytics/overview?timeRange=7d`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data7d = await res7d.json();
  if (data7d.data.timeSeries.length !== 7) {
    throw new Error(`Expected 7 points for 7d range, got ${data7d.data.timeSeries.length}`);
  }

  const res30d = await fetch(`${API_BASE}/brands/${brandId}/analytics/overview?timeRange=30d`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data30d = await res30d.json();
  if (data30d.data.timeSeries.length !== 30) {
    throw new Error(`Expected 30 points for 30d range, got ${data30d.data.timeSeries.length}`);
  }
  console.log('   ✓ Verified 7-day window (7 points) and 30-day window (30 points).\n');

  // 7. Verify Cross-Platform Breakdown & Share of Voice
  console.log('7. Verifying Cross-Platform Breakdown & Share of Voice...');
  const platforms = overviewData.data.platformBreakdown;
  const platformKeys = Object.keys(platforms);
  console.log(`   ✓ Active Channels: ${platformKeys.join(', ')}`);
  for (const plat of platformKeys) {
    const p = platforms[plat];
    console.log(`     - [${plat.toUpperCase()}]: ${p.impressions.toLocaleString()} imp | ${p.engagementRate}% rate | ${p.shareOfVoice}% share of voice`);
  }
  console.log();

  // 8. Verify Content Format Intelligence
  console.log('8. Verifying Content Format Intelligence (Reels vs Images vs Text)...');
  const formats = overviewData.data.formatBreakdown;
  if (!Array.isArray(formats) || formats.length === 0) {
    throw new Error('No format breakdown data returned');
  }
  for (const fmt of formats) {
    console.log(`     - ${fmt.label}: ${fmt.impressions.toLocaleString()} impressions | ${fmt.avgEngagementRate}% avg engagement (${fmt.postsCount} posts)`);
  }
  console.log();

  // 9. Verify Single Post Marketing Funnel Drilldown
  console.log('9. Verifying Granular Single-Post Marketing Funnel Drilldown...');
  const topPosts = overviewData.data.topPosts;
  if (!topPosts || topPosts.length === 0) {
    throw new Error('No top posts available to drill down into');
  }
  const targetPost = topPosts[0];
  console.log(`   - Testing Drilldown on Post: "${targetPost.title}" (ID: ${targetPost.postId})`);

  const drilldownRes = await fetch(`${API_BASE}/brands/${brandId}/analytics/posts/${targetPost.postId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const drilldownData = await drilldownRes.json();
  if (!drilldownRes.ok || !drilldownData.success) {
    throw new Error(`Failed to fetch post drilldown: ${JSON.stringify(drilldownData)}`);
  }

  const fn = drilldownData.data.funnel;
  console.log('   ✓ Marketing Conversion Funnel Verified:');
  console.log(`     1. Gross Impressions: ${fn.impressions.toLocaleString()} (100%)`);
  console.log(`     2. Audience Reach:    ${fn.reach.toLocaleString()} (${Math.round((fn.reach / fn.impressions) * 100)}%)`);
  console.log(`     3. Engagements:       ${fn.engagements.toLocaleString()} (${((fn.engagements / fn.impressions) * 100).toFixed(1)}%)`);
  console.log(`     4. Link Clicks:       ${fn.clicks.toLocaleString()} (${((fn.clicks / fn.impressions) * 100).toFixed(1)}%)`);
  console.log(`     5. Viral Shares:      ${fn.shares.toLocaleString()} (${((fn.shares / fn.impressions) * 100).toFixed(1)}%)`);
  console.log(`   ✓ Multi-Channel Variants: ${drilldownData.data.variants.length} platform adaptations analyzed.\n`);

  // 10. Verify Executive Report Export as CSV
  console.log('10. Verifying Executive CSV Report Export...');
  const exportRes = await fetch(`${API_BASE}/brands/${brandId}/analytics/export?format=csv`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!exportRes.ok) {
    throw new Error(`CSV Export failed with status ${exportRes.status}`);
  }
  const contentType = exportRes.headers.get('content-type');
  const disposition = exportRes.headers.get('content-disposition');
  const csvBody = await exportRes.text();

  if (!contentType?.includes('text/csv')) {
    throw new Error(`Expected text/csv content type, received ${contentType}`);
  }
  if (!csvBody.includes('SocialForge Executive Performance Report') || !csvBody.includes('Post ID')) {
    throw new Error('CSV content did not contain expected report headers');
  }

  console.log(`   ✓ HTTP Status: ${exportRes.status}`);
  console.log(`   ✓ Content-Type: ${contentType}`);
  console.log(`   ✓ Disposition: ${disposition}`);
  console.log(`   ✓ Report payload size: ${csvBody.length} bytes`);
  console.log(`   ✓ CSV Sample (first 3 lines):`);
  console.log(`     ${csvBody.split('\n').slice(0, 3).join('\n     ')}\n`);

  console.log('============================================================');
  console.log('  ALL 10 PHASE 9 ANALYTICS TESTS PASSED WITH 0 ERRORS');
  console.log('============================================================');
}

runAnalyticsTestSuite().catch((err) => {
  console.error('\n❌ Analytics Test Suite Failed:', err);
  process.exit(1);
});
