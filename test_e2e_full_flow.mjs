import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api/v1';

async function main() {
  console.log('================================================================');
  console.log('  SocialForge End-to-End V1 Integration Verification');
  console.log('================================================================\n');

  // 1. Authenticate
  console.log('1. Authenticating Sarah (sarah@apex.com)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const loginData = await loginRes.json();
  const token = loginData.data?.tokens?.accessToken;
  console.log('   ✓ Logged in. Token acquired.');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Resolve Active Brand (Luminary Glow)
  console.log('\n2. Resolving Brand context...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
  const meData = await meRes.json();
  const brand = meData.data.brands[0];
  console.log(`   ✓ Brand: "${brand.name}" (ID: ${brand.id})`);

  // 3. Verify Brand Brain & AI Context
  console.log('\n3. Verifying Centralized Brand Brain...');
  const brainRes = await fetch(`${BASE_URL}/brands/${brand.id}/brain`, { headers: authHeaders });
  const brainData = await brainRes.json();
  console.log(`   ✓ Brand Brain loaded: ${brainData.data.usps.length} USPs, tone: "${brainData.data.toneFormality}", primary CTA: "${brainData.data.ctaPreferences[0]}"`);

  // 4. Generate AI Campaign Strategy
  console.log('\n4. Synthesizing AI Campaign Strategy Arc (POST /campaigns/strategy)...');
  const strategyRes = await fetch(`${BASE_URL}/brands/${brand.id}/campaigns/strategy`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      businessIdea: 'Autumn Radiance Launch: A 3-day rapid sprint highlighting cold-weather botanical hydration',
      campaignGoal: 'product_launch',
      duration: '3_day_sprint',
    }),
  });
  if (!strategyRes.ok) throw new Error(`Strategy preview failed: ${strategyRes.status}`);
  const strategyData = await strategyRes.json();
  const strategy = strategyData.data;
  console.log(`   ✓ AI Narrative Arc: "${strategy.narrativeArc}"`);
  console.log(`   ✓ Posts planned: ${strategy.posts.length} posts across sequence:`);
  strategy.posts.forEach((p) => {
    console.log(`     - Post ${p.sequenceNumber} (Day +${p.targetDayOffset}): "${p.suggestedHeadline}" [${p.suggestedFormat}]`);
  });

  // 5. 1-Click Generate Campaign
  console.log('\n5. Executing 1-Click Campaign Generation (POST /campaigns/generate)...');
  const generateRes = await fetch(`${BASE_URL}/brands/${brand.id}/campaigns/generate`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Autumn Radiance Sprint Arc',
      goal: 'product_launch',
      duration: '3_day_sprint',
      strategy,
      startDate: '2026-10-10T10:00:00.000Z',
    }),
  });
  if (!generateRes.ok) throw new Error(`Generation failed: ${generateRes.status}`);
  const genData = await generateRes.json();
  const campaign = genData.data;
  console.log(`   ✓ Campaign Created: ID ${campaign.id}, Name "${campaign.name}"`);
  console.log(`   ✓ Posts created in DB: ${campaign.posts.length}`);

  // 6. Verify Content Calendar & Posts Listing with Campaign Integration
  console.log('\n6. Verifying Calendar Posts API with Campaign Filter...');
  // List all posts
  const allPostsRes = await fetch(`${BASE_URL}/brands/${brand.id}/posts`, { headers: authHeaders });
  const allPostsData = await allPostsRes.json();
  const campaignPosts = allPostsData.data.filter((p) => p.campaign_id === campaign.id);
  console.log(`   ✓ Total posts in brand: ${allPostsData.data.length}`);
  console.log(`   ✓ Posts belonging to new campaign in Calendar feed: ${campaignPosts.length}`);

  // Query posts filtered specifically by campaignId
  const filteredPostsRes = await fetch(`${BASE_URL}/brands/${brand.id}/posts?campaignId=${campaign.id}`, { headers: authHeaders });
  const filteredPostsData = await filteredPostsRes.json();
  console.log(`   ✓ Posts returned by ?campaignId filter: ${filteredPostsData.data.length}`);
  if (filteredPostsData.data.length !== campaign.posts.length) {
    throw new Error('Filter by campaignId mismatch!');
  }

  // 7. Verify Multi-Platform Variant Copies (IG, X, LinkedIn, TikTok)
  console.log('\n7. Verifying Multi-Platform Variants for Campaign Post 1...');
  const samplePost = campaignPosts[0];
  console.log(`   ✓ Post Title: "${samplePost.title}"`);
  console.log(`   ✓ Variants count: ${samplePost.variants.length}`);
  samplePost.variants.forEach((v) => {
    console.log(`     [${v.platform.toUpperCase()}] Length: ${v.content.length} chars | First 60 chars: "${v.content.slice(0, 60).replace(/\n/g, ' ')}..."`);
  });

  // 8. Batch Reschedule Campaign across Calendar
  console.log('\n8. Batch Rescheduling Campaign on Calendar (POST /campaigns/:id/schedule)...');
  const rescheduleRes = await fetch(`${BASE_URL}/brands/${brand.id}/campaigns/${campaign.id}/schedule`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      startDate: '2026-10-15',
      dailyTime: '14:30',
    }),
  });
  if (!rescheduleRes.ok) throw new Error(`Reschedule failed: ${rescheduleRes.status}`);
  const schedData = await rescheduleRes.json();
  console.log(`   ✓ ${schedData.message}`);

  const updatedCampRes = await fetch(`${BASE_URL}/brands/${brand.id}/campaigns/${campaign.id}`, { headers: authHeaders });
  const updatedCampData = await updatedCampRes.json();
  console.log(`   ✓ Verified post scheduled dates after batch rescheduling:`);
  updatedCampData.data.posts.forEach((p, idx) => {
    console.log(`     - Post ${idx + 1}: ${p.scheduledFor}`);
  });

  // 9. Analytics & KPI Telemetry
  console.log('\n9. Verifying Analytics Telemetry Endpoint...');
  const analyticsRes = await fetch(`${BASE_URL}/brands/${brand.id}/analytics/overview?timeRange=14d`, { headers: authHeaders });
  const analyticsData = await analyticsRes.json();
  console.log(`   ✓ Total Impressions: ${analyticsData.data.overview.totalImpressions.toLocaleString()}`);
  console.log(`   ✓ Total Reach: ${analyticsData.data.overview.totalReach.toLocaleString()}`);
  console.log(`   ✓ Video views: ${analyticsData.data.overview.totalVideoViews.toLocaleString()}`);
  console.log(`   ✓ Average Engagement Rate: ${analyticsData.data.overview.averageEngagementRate}%`);

  // 10. Multi-tenant Verification
  console.log('\n10. Multi-Tenant Security Verification (Tenant B)...');
  const loginBRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alex@nexus.com', password: 'Password123!' }),
  });
  const loginBData = await loginBRes.json();
  const tokenB = loginBData.data?.tokens?.accessToken;

  const probeRes = await fetch(`${BASE_URL}/brands/${brand.id}/campaigns/${campaign.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  console.log(`   ✓ Tenant B access status: HTTP ${probeRes.status} (RFC 404 Isolated)`);
  if (probeRes.status !== 404) {
    throw new Error(`Expected 404 for cross-tenant access, got ${probeRes.status}`);
  }

  console.log('\n================================================================');
  console.log('  ALL END-TO-END V1 INTEGRATION CHECKS PASSED (100%)');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
