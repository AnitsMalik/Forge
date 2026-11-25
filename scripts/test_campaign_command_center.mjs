/**
 * SocialForge Campaign Command Center Comprehensive Verification Suite
 * 
 * Verifies:
 * 1. Campaign List with Status Filtering (All, Active, Scheduled, Completed)
 * 2. Campaign Card Rich Fields:
 *    - Brand Name
 *    - Goal & Dates
 *    - Organic / Paid / Hybrid Pill
 *    - Content Progress (postCount, publishedCount, scheduledCount)
 *    - KPI Actual vs Target
 *    - Forecast (RangeLow - RangeHigh, Confidence) + Explicit Disclaimer:
 *      "Organic reach targets are probabilistic estimates, not guarantees"
 * 3. 6-Step Campaign Creation Flow:
 *    - Step 1: Goal
 *    - Step 2: Audience
 *    - Step 3: Campaign Details & Paid Separation Guard
 *    - Step 4: AI Plan (12 Dimensions Preview)
 *    - Step 5: Review & Edit (Post Blueprints & Cadence)
 *    - Step 6: Activate (Draft / Strategy Creation)
 * 4. Critical Safeguard Invariants:
 *    - Non-Silent Publishing Invariant: Creating a campaign creates a draft/strategy; MUST NOT silently publish.
 *    - Organic Reach Disclaimer Invariant.
 *    - Paid Campaign Separation Invariant (isolated ad products, budgets, permissions).
 *    - Platform Connections: Automations, Templates, Approvals, Publishing Jobs, Analytics, Growth Recommendations.
 * 5. Production Meta Publication Lock: Variant 1405588742634526_122100337179498315 remains untouched in published status.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  console.log(`\n--- [Test ${passed + failed + 1}] ${name} ---`);
  try {
    await fn();
  } catch (err) {
    console.error(`  Error in test "${name}":`, err.message);
    throw err;
  }
}

const API_BASE = 'http://localhost:4000/api/v1';

async function runCampaignCommandCenterSuite() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE CAMPAIGN COMMAND CENTER TEST SUITE                       ');
  console.log('   Filters • Cards • 6-Step Wizard • Non-Silent Publishing • Connections');
  console.log('========================================================================\n');

  const now = new Date();
  const testTenantId = `tenant_ccc_${crypto.randomUUID().slice(0, 8)}`;
  const testUserId = crypto.randomUUID();
  const testBrandId = crypto.randomUUID();

  let authToken = '';

  try {
    // SETUP: Tenant, User, Brand
    await db('tenants').insert({
      id: testTenantId,
      name: 'Command Center Test Tenant',
      slug: `ccc-tenant-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    });

    await db('users').insert({
      id: testUserId,
      email: `ccc-user-${Date.now()}@socialforge.io`,
      password_hash: 'dummy_hash',
      full_name: 'Command Center Tester',
      is_active: true,
      token_version: 1,
      created_at: now,
      updated_at: now,
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      user_id: testUserId,
      role: 'owner',
      created_at: now,
      updated_at: now,
    });

    await db('brands').insert({
      id: testBrandId,
      tenant_id: testTenantId,
      name: 'Nexus Velocity Systems',
      slug: `nexus-velocity-${Date.now()}`,
      industry: 'Enterprise Technology',
      timezone: 'UTC',
      created_at: now,
      updated_at: now,
    });

    // Create auth JWT
    authToken = jwt.sign(
      {
        userId: testUserId,
        id: testUserId,
        email: `ccc-user-${Date.now()}@socialforge.io`,
        tenantId: testTenantId,
        role: 'owner',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // Seed 3 existing campaigns in different states: active, scheduled, completed
    const activeCampaignId = crypto.randomUUID();
    const scheduledCampaignId = crypto.randomUUID();
    const completedCampaignId = crypto.randomUUID();

    await db('campaigns').insert([
      {
        id: activeCampaignId,
        brand_id: testBrandId,
        name: 'Nexus Product Launch Flight',
        description: 'Multi-channel enterprise launch arc',
        status: 'active',
        start_date: new Date(Date.now() - 3 * 86400000),
        end_date: new Date(Date.now() + 4 * 86400000),
        goal: 'engagement',
        created_at: now,
        updated_at: now,
      },
      {
        id: scheduledCampaignId,
        brand_id: testBrandId,
        name: 'Nexus Q4 Webinar Sprint',
        description: 'Pre-flight scheduled promotion',
        status: 'scheduled',
        start_date: new Date(Date.now() + 7 * 86400000),
        end_date: new Date(Date.now() + 14 * 86400000),
        goal: 'leads',
        created_at: now,
        updated_at: now,
      },
      {
        id: completedCampaignId,
        brand_id: testBrandId,
        name: 'Nexus Summer Brand Arc',
        description: 'Concluded flagship awareness arc',
        status: 'completed',
        start_date: new Date(Date.now() - 30 * 86400000),
        end_date: new Date(Date.now() - 16 * 86400000),
        goal: 'awareness',
        created_at: now,
        updated_at: now,
      },
    ]);

    // Seed posts for active campaign (1 published, 2 scheduled)
    const post1 = crypto.randomUUID();
    const post2 = crypto.randomUUID();
    const post3 = crypto.randomUUID();

    await db('posts').insert([
      {
        id: post1,
        tenant_id: testTenantId,
        brand_id: testBrandId,
        author_id: testUserId,
        campaign_id: activeCampaignId,
        title: 'Post 1: Launch Reveal',
        base_content: 'Revealing the launch',
        status: 'published',
        scheduled_for: new Date(Date.now() - 2 * 86400000),
        published_at: new Date(Date.now() - 2 * 86400000),
        created_at: now,
        updated_at: now,
      },
      {
        id: post2,
        tenant_id: testTenantId,
        brand_id: testBrandId,
        author_id: testUserId,
        campaign_id: activeCampaignId,
        title: 'Post 2: Feature Deep Dive',
        base_content: 'Deep diving into features',
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 1 * 86400000),
        created_at: now,
        updated_at: now,
      },
      {
        id: post3,
        tenant_id: testTenantId,
        brand_id: testBrandId,
        author_id: testUserId,
        campaign_id: activeCampaignId,
        title: 'Post 3: Customer Case Study',
        base_content: 'Enterprise case study',
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 3 * 86400000),
        created_at: now,
        updated_at: now,
      },
    ]);

    // TEST 1: Campaign List Filtering (All, Active, Scheduled, Completed)
    await test('Campaign List Filtering: All, Active, Scheduled, Completed', async () => {
      // 1. All
      const resAll = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns?status=all`, { headers });
      assert(resAll.status === 200, 'GET /campaigns?status=all returns 200');
      const allData = await resAll.json();
      assert(allData.success === true, 'Response indicates success');
      assert(allData.data.length >= 3, `Returned ${allData.data.length} campaigns for 'all' filter`);

      // 2. Active
      const resActive = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns?status=active`, { headers });
      const activeData = await resActive.json();
      assert(activeData.data.every((c) => c.status === 'active'), 'All items under active filter have status === active');
      assert(activeData.data.some((c) => c.id === activeCampaignId), 'Active campaign is included');

      // 3. Scheduled
      const resScheduled = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns?status=scheduled`, { headers });
      const scheduledData = await resScheduled.json();
      assert(scheduledData.data.every((c) => c.status === 'scheduled'), 'All items under scheduled filter have status === scheduled');
      assert(scheduledData.data.some((c) => c.id === scheduledCampaignId), 'Scheduled campaign is included');

      // 4. Completed
      const resCompleted = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns?status=completed`, { headers });
      const completedData = await resCompleted.json();
      assert(completedData.data.every((c) => c.status === 'completed'), 'All items under completed filter have status === completed');
      assert(completedData.data.some((c) => c.id === completedCampaignId), 'Completed campaign is included');
    });

    // TEST 2: Campaign Card Required Fields & Forecast Disclaimer
    await test('Campaign Card Field Enrichment & Forecast Disclaimer', async () => {
      const res = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns?status=all`, { headers });
      const { data } = await res.json();
      const card = data.find((c) => c.id === activeCampaignId);
      assert(!!card, 'Active campaign card found');

      // Brand
      assert(card.brandName === 'Nexus Velocity Systems', `Brand name matches: ${card.brandName}`);
      // Goal
      assert(!!card.goal, `Goal present: ${card.goal}`);
      // Dates
      assert(!!card.startDate && !!card.endDate, 'Start date and End date present');
      // Organic/Paid/Hybrid
      assert(['organic', 'paid', 'hybrid'].includes(card.campaignType), `Execution mode valid: ${card.campaignType}`);
      // Content progress & counts
      assert(card.postCount === 3, `Total post count is 3: ${card.postCount}`);
      assert(card.publishedCount === 1, `Published count is 1: ${card.publishedCount}`);
      assert(card.scheduledCount === 2, `Scheduled count is 2: ${card.scheduledCount}`);
      // KPI actual vs target
      assert(!!card.kpiTarget, 'KPI Target meter object present');
      assert(typeof card.kpiTarget.actual === 'number', 'KPI actual is numeric');
      assert(typeof card.kpiTarget.target === 'number', 'KPI target is numeric');
      assert(typeof card.kpiTarget.percentage === 'number', 'KPI percentage is numeric');
      // Forecast
      assert(!!card.forecast, 'Forecast object present');
      assert(typeof card.forecast.rangeLow === 'number', 'Forecast rangeLow is numeric');
      assert(typeof card.forecast.rangeHigh === 'number', 'Forecast rangeHigh is numeric');
      assert(card.forecast.rangeHigh >= card.forecast.rangeLow, 'Forecast rangeHigh >= rangeLow');
      // Explicit disclaimer
      assert(
        card.forecast.disclaimer.includes('Organic reach targets are probabilistic estimates, not guarantees'),
        `Forecast disclaimer contains required non-guarantee text: "${card.forecast.disclaimer}"`
      );
      // Connections
      assert(!!card.connections, 'Platform connections object present on card');
    });

    // TEST 3: Step 4 AI Plan Strategy Synthesis (Dry-Run Preview)
    let synthesizedStrategy = null;
    await test('Step 4: AI Plan Synthesis (12 Strategic Dimensions)', async () => {
      const payload = {
        businessIdea: 'Autonomous Multi-Agent AI Workflow orchestrator for Fortune 500 financial audits',
        campaignGoal: 'sales',
        duration: '7_days',
        platforms: ['linkedin', 'x', 'facebook'],
      };

      const res = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns/strategy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      assert(res.status === 200, `POST /campaigns/strategy returns 200: status ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Strategy preview successful');
      synthesizedStrategy = body.data;

      // Verify 12 Strategic Dimensions
      assert(!!synthesizedStrategy.campaignName, '1. Campaign Name synthesized');
      assert(!!synthesizedStrategy.campaignObjective, '2. Campaign Objective synthesized');
      assert(!!synthesizedStrategy.targetAudience, '3. Target Audience synthesized');
      assert(!!synthesizedStrategy.coreMessage, '4. Core Message synthesized');
      assert(!!synthesizedStrategy.campaignStrategy, '5. Campaign Strategy synthesized');
      assert(Array.isArray(synthesizedStrategy.contentPillars) && synthesizedStrategy.contentPillars.length > 0, '6. Content Pillars synthesized');
      assert(Array.isArray(synthesizedStrategy.contentMix) && synthesizedStrategy.contentMix.length > 0, '7. Content Mix synthesized');
      assert(!!synthesizedStrategy.postingFrequency, '8. Posting Frequency synthesized');
      assert(Array.isArray(synthesizedStrategy.contentIdeas) && synthesizedStrategy.contentIdeas.length > 0, '9. Content Ideas synthesized');
      assert(Array.isArray(synthesizedStrategy.recommendedFormats) && synthesizedStrategy.recommendedFormats.length > 0, '10. Recommended Formats synthesized');
      assert(!!synthesizedStrategy.ctaStrategy, '11. CTA Strategy synthesized');
      assert(Array.isArray(synthesizedStrategy.hashtagStrategy) && synthesizedStrategy.hashtagStrategy.length > 0, '12. Hashtag Strategy synthesized');

      // Verify Multi-Post Blueprints
      assert(Array.isArray(synthesizedStrategy.posts) && synthesizedStrategy.posts.length >= 3, `Coordinated posts generated: ${synthesizedStrategy.posts.length}`);
    });

    // TEST 4: 6-Step Campaign Generation & Activation with Safe Draft Strategy
    let createdCampaignId = null;
    await test('Step 6: Activate Strategy & Enforce Non-Silent Publishing Invariant', async () => {
      const fullPayload = {
        businessIdea: 'Autonomous Multi-Agent AI Workflow orchestrator for Fortune 500 financial audits',
        campaignGoal: 'sales',
        duration: '7_days',
        platforms: ['linkedin', 'x', 'facebook'],
        name: 'Nexus AI Audit Orchestration Sprint',
        startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        strategy: synthesizedStrategy,
        // Step 2: Audience
        audience: {
          targetPersona: 'Enterprise CFOs, VPs of Finance & Audit Controllers',
          segments: ['Fortune 500 Controllers', 'Enterprise Risk Directors'],
          geography: 'Global Tier 1 (US, UK, CA, AU, EU)',
          painPoints: 'High auditing latency, manual reconciliation errors, fragmented SOC2 compliance',
        },
        // Step 3: Details & Paid Execution Separation
        campaignType: 'hybrid',
        paidConfig: {
          separatedFromOrganic: true,
          adAccountId: 'act_meta_enterprise_9918',
          budgetCents: 50000,
          dailyBudgetCents: 7000,
          currency: 'USD',
          supportedProducts: ['sponsored_feed_post', 'story_placement'],
          permissionsVerified: true,
          disclaimer: 'Paid campaigns must remain separated from organic execution and require supported advertising products, budgets and permissions.',
        },
        status: 'scheduled', // DRAFT / STRATEGY INVARIANT
        connections: {
          automationsCount: 1,
          templatesCount: 2,
          approvalRequired: true,
          publishingJobsCount: synthesizedStrategy.posts.length,
          analyticsTracking: true,
          growthRecommendationsLinked: true,
        },
      };

      const res = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fullPayload),
      });

      if (res.status !== 201) {
        const errText = await res.text();
        console.error('  DEBUG: POST /generate failed with:', errText);
      }
      assert(res.status === 201, `POST /campaigns/generate returns 201: status ${res.status}`);
      const body = await res.json();
      assert(body.success === true, 'Campaign generation returned success');
      const campaign = body.data;
      createdCampaignId = campaign.id;

      // VERIFY NON-SILENT PUBLISHING INVARIANT IN DATABASE
      assert(campaign.status === 'scheduled', `Campaign status is 'scheduled' (NOT published): ${campaign.status}`);

      const dbCampaign = await db('campaigns').where({ id: createdCampaignId }).first();
      assert(dbCampaign.status === 'scheduled', `Database campaigns.status === 'scheduled': ${dbCampaign.status}`);

      // Verify posts in DB: All must be scheduled, NOT published
      const dbPosts = await db('posts').where({ campaign_id: createdCampaignId });
      assert(dbPosts.length === synthesizedStrategy.posts.length, `Inserted ${dbPosts.length} posts`);
      assert(dbPosts.every((p) => p.status === 'scheduled'), 'ALL posts are in scheduled status (NEVER published silently)');

      // Verify post variants in DB: All must be pending, NOT published
      const postIds = dbPosts.map((p) => p.id);
      const dbVariants = await db('post_variants').whereIn('post_id', postIds);
      assert(dbVariants.length > 0, `Generated ${dbVariants.length} cross-platform variants`);
      assert(dbVariants.every((v) => v.status === 'pending'), 'ALL post variants are in pending status (NEVER published silently)');

      // Verify approval requests created in pending status
      const approvalReqs = await db('approval_requests').where({ entity_type: 'campaign', entity_id: createdCampaignId });
      assert(approvalReqs.length > 0, `Approval request created for campaign: ${approvalReqs.length}`);
      assert(approvalReqs[0].status === 'pending', `Approval request status is 'pending': ${approvalReqs[0].status}`);

      // Verify publishing jobs created in scheduled status
      const pubJobs = await db('publishing_jobs').whereIn('post_id', postIds);
      assert(pubJobs.length === dbPosts.length, `Durable publishing jobs queued: ${pubJobs.length}`);
      assert(pubJobs.every((j) => j.status === 'scheduled'), 'ALL publishing jobs have status === scheduled');

      // Verify growth recommendations linked
      const recs = await db('growth_recommendations').where({ target_type: 'campaign', target_id: createdCampaignId });
      assert(recs.length > 0, `Growth recommendation linked to campaign: ${recs.length}`);
      assert(recs[0].status === 'active', `Recommendation status is active: ${recs[0].status}`);

      // Verify automation flight monitor rule created
      const autoRules = await db('automations').where({ brand_id: testBrandId });
      assert(autoRules.length > 0, `Automation flight monitor rule created: ${autoRules.length}`);
      assert(autoRules[0].status === 'active', `Automation status is active: ${autoRules[0].status}`);
    });

    // TEST 5: Verify getCampaignById returns complete Command Center details
    await test('Get Campaign by ID: Audience, Paid Separation & Connections Verification', async () => {
      const res = await fetch(`${API_BASE}/brands/${testBrandId}/campaigns/${createdCampaignId}`, { headers });
      assert(res.status === 200, 'GET /campaigns/:id returns 200');
      const body = await res.json();
      const campaign = body.data;

      assert(campaign.brandName === 'Nexus Velocity Systems', `Brand name populated: ${campaign.brandName}`);
      assert(campaign.campaignType === 'hybrid', `Campaign type populated: ${campaign.campaignType}`);
      assert(!!campaign.audience, 'Audience context populated');
      assert(campaign.audience.targetPersona.includes('Enterprise CFOs'), 'Audience target persona verified');
      assert(!!campaign.paidConfig, 'Paid config populated');
      assert(campaign.paidConfig.separatedFromOrganic === true, 'Paid separation flag is true');
      assert(campaign.paidConfig.adAccountId === 'act_meta_enterprise_9918', 'Ad account ID verified');
      assert(campaign.paidConfig.budgetCents === 50000, 'Budget cents verified');
      assert(campaign.paidConfig.permissionsVerified === true, 'Permissions verified');
      assert(!!campaign.connections, 'System connections populated');
      assert(campaign.connections.approvalRequired === true, 'Approval connection verified');
      assert(campaign.connections.publishingJobsCount === campaign.posts.length, 'Publishing jobs count verified');
      assert(campaign.forecast.disclaimer.includes('Organic reach targets are probabilistic estimates, not guarantees'), 'Forecast disclaimer intact');
    });

    // TEST 6: Production Meta Publication Lock
    await test('Production Meta Publication Lock Invariant (1405588742634526_122100337179498315)', async () => {
      const metaVariant = await db('post_variants')
        .where({ remote_post_id: '1405588742634526_122100337179498315' })
        .first();

      assert(!!metaVariant, 'Production Meta post variant exists in database');
      assert(metaVariant.status === 'published', `Production Meta variant status is strictly 'published': ${metaVariant.status}`);
      assert(metaVariant.platform === 'facebook', `Platform is facebook: ${metaVariant.platform}`);

      const metaJob = await db('publishing_jobs')
        .where({ external_post_id: '1405588742634526_122100337179498315' })
        .first();
      assert(!!metaJob && metaJob.status === 'published', 'Production Meta publishing job remains locked in published status');
    });

    console.log('\n========================================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\nTest Suite Failed:', err);
    process.exit(1);
  } finally {
    // CLEANUP test data
    try {
      if (testBrandId) {
        const testCampaigns = await db('campaigns').where({ brand_id: testBrandId }).select('id');
        const campIds = testCampaigns.map((c) => c.id);
        if (campIds.length > 0) {
          const testPosts = await db('posts').whereIn('campaign_id', campIds).select('id');
          const pIds = testPosts.map((p) => p.id);
          if (pIds.length > 0) {
            await db('publishing_jobs').whereIn('post_id', pIds).delete();
            await db('post_variants').whereIn('post_id', pIds).delete();
            await db('posts').whereIn('id', pIds).delete();
          }
          await db('approval_requests').whereIn('entity_id', campIds).delete();
          await db('growth_recommendations').whereIn('target_id', campIds).delete();
          await db('automations').where({ brand_id: testBrandId }).delete();
          await db('campaigns').whereIn('id', campIds).delete();
        }
        await db('brands').where({ id: testBrandId }).delete();
      }
      if (testTenantId) {
        await db('tenant_users').where({ tenant_id: testTenantId }).delete();
        await db('tenants').where({ id: testTenantId }).delete();
      }
      if (testUserId) {
        await db('users').where({ id: testUserId }).delete();
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await db.destroy();
  }
}

runCampaignCommandCenterSuite();
