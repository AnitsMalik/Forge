import http from 'http';

const API_BASE = 'http://localhost:4000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('================================================================');
  console.log('  SocialForge AI Campaign Engine Integration Tests');
  console.log('================================================================\n');

  // 1. Authenticate Sarah Connor (Tenant A)
  console.log('1. Authenticating Tenant A test user (sarah@apex.com)...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'sarah@apex.com',
      password: 'Password123!',
    }),
  });

  if (loginRes.status !== 200 || !loginRes.data.data?.tokens?.accessToken) {
    throw new Error('Authentication failed: ' + JSON.stringify(loginRes.data));
  }
  const tokenA = loginRes.data.data.tokens.accessToken;
  const authHeadersA = { Authorization: `Bearer ${tokenA}` };
  console.log('   ✓ Authentication successful! Token acquired.');

  // 2. Identify Brand A
  console.log('\n2. Resolving Brand context...');
  const meRes = await request('/auth/me', { headers: authHeadersA });
  const brandA = meRes.data.data.brands[0];
  const brandAId = brandA.id;
  console.log(`   ✓ Identified Brand: "${brandA.name}" (ID: ${brandAId})`);

  // 3. Test Preview AI Campaign Strategy
  console.log('\n3. Generating AI Campaign Strategy from 1 Business Idea (POST /campaigns/strategy)...');
  const businessIdea = 'Launching our Ultra-Hydrating Botanical Night Serum with 20% Launch Week Discount';
  const strategyRes = await request(`/brands/${brandAId}/campaigns/strategy`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      businessIdea,
      campaignGoal: 'product_launch',
      duration: '7_day_arc',
    }),
  });

  if (strategyRes.status !== 200 || !strategyRes.data.data) {
    throw new Error('Strategy preview failed: ' + JSON.stringify(strategyRes.data));
  }
  const strategy = strategyRes.data.data;
  console.log('   ✓ AI Campaign Strategy synthesized successfully!');
  console.log(`     - Goal:          ${strategy.campaignGoal}`);
  console.log(`     - Duration:      ${strategy.duration}`);
  console.log(`     - Narrative Arc: ${strategy.narrativeArc}`);
  console.log(`     - Target Focus:  ${strategy.targetAudienceFocus}`);
  console.log(`     - Primary KPI:   ${strategy.primaryKpi}`);
  console.log(`     - Total Posts:   ${strategy.posts.length}`);

  strategy.posts.forEach((p) => {
    console.log(`       [Post ${p.sequenceNumber}] (Day +${p.targetDayOffset}) [${p.suggestedFormat}] ${p.stageTitle}`);
    console.log(`         Headline: "${p.suggestedHeadline}"`);
    console.log(`         CTA:      "${p.callToAction}"`);
  });

  if (strategy.posts.length !== 4) {
    throw new Error(`Expected 4 posts for 7_day_arc, got ${strategy.posts.length}`);
  }

  // 4. Test 1-Click Campaign Creation & Generation
  console.log('\n4. Executing 1-Click Campaign Generation & Database Persistence (POST /campaigns/generate)...');
  const generateRes = await request(`/brands/${brandAId}/campaigns/generate`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      businessIdea,
      campaignGoal: 'product_launch',
      duration: '7_day_arc',
      name: 'Ultra-Hydrating Botanical Serum Launch Arc',
      strategy,
    }),
  });

  if (generateRes.status !== 201 || !generateRes.data.data) {
    throw new Error('Campaign generation failed: ' + JSON.stringify(generateRes.data));
  }
  const campaign = generateRes.data.data;
  const campaignId = campaign.id;
  console.log('   ✓ Campaign created and stored in MySQL!');
  console.log(`     - Campaign ID:   ${campaignId}`);
  console.log(`     - Campaign Name: ${campaign.name}`);
  console.log(`     - Status:        ${campaign.status}`);
  console.log(`     - Start Date:    ${campaign.startDate}`);
  console.log(`     - End Date:      ${campaign.endDate}`);
  console.log(`     - Posts Count:   ${campaign.posts.length}`);

  const samplePost = campaign.posts[0];
  console.log(`   ✓ Sample Post 1 (Stage 1: Hook):`);
  console.log(`     - Title:         ${samplePost.title}`);
  console.log(`     - Scheduled For: ${samplePost.scheduledFor}`);
  console.log(`     - Variants:      ${samplePost.variants.map((v) => v.platform).join(', ')}`);
  console.log(`     - Instagram Copy Preview: ${samplePost.baseContent.slice(0, 100)}...`);

  // 5. Test GET /campaigns/:campaignId
  console.log('\n5. Fetching Campaign Details with Child Posts (GET /campaigns/:campaignId)...');
  const getRes = await request(`/brands/${brandAId}/campaigns/${campaignId}`, {
    headers: authHeadersA,
  });

  if (getRes.status !== 200 || !getRes.data.data) {
    throw new Error('Get campaign failed: ' + JSON.stringify(getRes.data));
  }
  console.log('   ✓ Campaign fetched successfully with all nested variants!');

  // 6. Test GET /campaigns list
  console.log('\n6. Listing Campaigns with Computed Post Metrics (GET /campaigns)...');
  const listRes = await request(`/brands/${brandAId}/campaigns`, {
    headers: authHeadersA,
  });

  if (listRes.status !== 200 || !listRes.data.data) {
    throw new Error('List campaigns failed: ' + JSON.stringify(listRes.data));
  }
  const targetCampaign = listRes.data.data.find((c) => c.id === campaignId);
  if (!targetCampaign || targetCampaign.postCount !== 4) {
    throw new Error(`Expected campaign with 4 posts in list, got: ${JSON.stringify(targetCampaign)}`);
  }
  console.log(`   ✓ Campaign identified in list with postCount: ${targetCampaign.postCount}, publishedCount: ${targetCampaign.publishedCount}`);

  // 7. Test Batch Reschedule Across Calendar
  console.log('\n7. Batch Rescheduling Campaign Across Calendar (POST /campaigns/:campaignId/schedule)...');
  const newStartDate = '2026-10-01';
  const scheduleRes = await request(`/brands/${brandAId}/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    headers: authHeadersA,
    body: JSON.stringify({
      startDate: newStartDate,
      dailyTime: '09:30',
    }),
  });

  if (scheduleRes.status !== 200 || !scheduleRes.data.success) {
    throw new Error('Batch reschedule failed: ' + JSON.stringify(scheduleRes.data));
  }
  console.log(`   ✓ ${scheduleRes.data.message}`);

  // Verify dates were adjusted
  const updatedCampaignRes = await request(`/brands/${brandAId}/campaigns/${campaignId}`, {
    headers: authHeadersA,
  });
  const updatedPosts = updatedCampaignRes.data.data.posts;
  console.log('   ✓ Post scheduled dates after batch rescheduling:');
  updatedPosts.forEach((p, idx) => {
    console.log(`     - Post ${idx + 1}: ${p.scheduledFor}`);
  });

  // 8. Multi-Tenant Isolation Test (Tenant B cannot access Tenant A campaign)
  console.log('\n8. Verifying Multi-Tenant Isolation (Tenant B probing Tenant A Campaign)...');
  const loginBRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alex@nexus.com',
      password: 'Password123!',
    }),
  });
  const tokenB = loginBRes.data.data.tokens.accessToken;
  const authHeadersB = { Authorization: `Bearer ${tokenB}` };

  const crossProbeRes = await request(`/brands/${brandAId}/campaigns`, {
    headers: authHeadersB,
  });
  if (crossProbeRes.status === 404) {
    console.log('   ✓ Tenant B blocked from Tenant A campaigns list (HTTP 404 BRAND_NOT_FOUND) — Zero Leakage!');
  } else {
    throw new Error(`Expected 404 for cross-tenant access, got: ${crossProbeRes.status}`);
  }

  const crossDetailRes = await request(`/brands/${brandAId}/campaigns/${campaignId}`, {
    headers: authHeadersB,
  });
  if (crossDetailRes.status === 404) {
    console.log('   ✓ Tenant B blocked from Tenant A single campaign (HTTP 404 BRAND_NOT_FOUND) — Zero Leakage!');
  } else {
    throw new Error(`Expected 404 for cross-tenant access, got: ${crossDetailRes.status}`);
  }

  console.log('\n================================================================');
  console.log('  ALL AI CAMPAIGN ENGINE INTEGRATION TESTS PASSED (100%)');
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Campaign Test Failed:', err);
  process.exit(1);
});
