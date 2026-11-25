/**
 * SocialForge Closed-Loop AI Marketing Advisor Test Suite
 * Validates:
 * 1. GET /api/v1/brands/:brandId/analytics/advisor (Diagnosis, Key Drivers, Proposals)
 * 2. Empirical Rationale & Metric Derivation (Winning hooks, Top CTAs, Lift multipliers)
 * 3. 4-Stage Coordinated Narrative Blueprints on each proposal
 * 4. Forecast range and mandatory reach disclaimer: "Organic reach targets are probabilistic estimates, not guarantees."
 * 5. POST /api/v1/brands/:brandId/analytics/advisor/apply (Database persistence in growth_recommendations)
 * 6. Prefill campaign state generation for Campaign Command Center 6-step Wizard
 * 7. Non-silent publishing invariant & Production Meta Publication Lock
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import http from 'http';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE CLOSED-LOOP AI MARKETING ADVISOR TEST SUITE             ');
  console.log('   Telemetry Feedback • Winning Hooks • Data-Backed Campaign Arcs       ');
  console.log('========================================================================\n');

  const now = new Date();
  const testTenantId = `tenant_adv_${crypto.randomUUID().slice(0, 8)}`;
  const testUserId = crypto.randomUUID();
  const testBrandId = crypto.randomUUID();

  let authToken = '';

  try {
    // 1. SETUP: Tenant, User, Brand
    await db('tenants').insert({
      id: testTenantId,
      name: 'Advisor Test Tenant',
      slug: `adv-tenant-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: now,
      updated_at: now,
    });

    await db('users').insert({
      id: testUserId,
      email: `adv-user-${Date.now()}@socialforge.io`,
      password_hash: 'dummy_hash',
      full_name: 'Advisor Tester',
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
      name: 'Quantum Velocity Lab',
      slug: `quantum-velocity-${Date.now()}`,
      industry: 'Enterprise Software & AI',
      timezone: 'UTC',
      created_at: now,
      updated_at: now,
    });

    // Seed agent memory with winning hook & CTA
    await db('agent_memories').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      brand_id: testBrandId,
      memory_type: 'engagement_pattern',
      key: 'winning_hook_curiosity',
      value: JSON.stringify({
        hookHeadline: 'Why do 80% of SaaS teams fail at automated scaling?',
        hookStyle: 'curiosity_question',
        ctaText: 'Link in bio for full benchmark whitepaper',
        preferredTone: 'authoritative_data_backed',
        hashtags: ['#SaaSMetrics', '#Automation'],
      }),
      confidence: 0.95,
      created_at: now,
      updated_at: now,
    });

    // Create auth JWT
    authToken = jwt.sign(
      {
        userId: testUserId,
        id: testUserId,
        email: `adv-user-${Date.now()}@socialforge.io`,
        tenantId: testTenantId,
        role: 'owner',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    assert(Boolean(authToken), 'Admin authentication JWT successfully signed');
    assert(Boolean(testBrandId), `Active test brand initialized: ${testBrandId}`);

    const authHeaders = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    // --- TEST 1: GET /analytics/advisor Diagnosis & Key Drivers ---
    console.log('\n--- [Test 1] GET /analytics/advisor: Diagnosis & Key Performance Drivers ---');
    const diagRes = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/brands/${testBrandId}/analytics/advisor`,
      method: 'GET',
      headers: authHeaders,
    });

    assert(diagRes.status === 200, `GET /analytics/advisor returns 200 (Received: ${diagRes.status})`);
    assert(diagRes.data.success === true, 'Response indicates success');

    const diagnosis = diagRes.data.data;
    assert(typeof diagnosis.overallHealthScore === 'number', `Overall health score is numeric: ${diagnosis.overallHealthScore}/100`);
    assert(Boolean(diagnosis.topHookStyle), `Top hook style identified: "${diagnosis.topHookStyle}"`);
    assert(Boolean(diagnosis.topPerformingCTA), `Top performing CTA identified: "${diagnosis.topPerformingCTA}"`);
    assert(Boolean(diagnosis.optimalPlatform), `Optimal platform identified: "${diagnosis.optimalPlatform}"`);
    assert(typeof diagnosis.averageEngagementRate === 'number', `Average engagement rate numeric: ${diagnosis.averageEngagementRate}%`);
    assert(typeof diagnosis.totalPublishedAnalyzed === 'number' && diagnosis.totalPublishedAnalyzed >= 1, `Total published variants analyzed: ${diagnosis.totalPublishedAnalyzed}`);
    assert(Array.isArray(diagnosis.keyDrivers) && diagnosis.keyDrivers.length >= 4, `Key performance drivers list length: ${diagnosis.keyDrivers.length}`);

    // Verify key drivers structure
    const firstDriver = diagnosis.keyDrivers[0];
    assert(Boolean(firstDriver.metric) && Boolean(firstDriver.value), `Driver metric valid: ${firstDriver.metric} = ${firstDriver.value}`);

    // --- TEST 2: Synthesized Closed-Loop Proposals Structure & Invariants ---
    console.log('\n--- [Test 2] Closed-Loop Campaign Proposals: Rationale, Lift & Narrative Blueprints ---');
    const proposals = diagnosis.proposals;
    assert(Array.isArray(proposals) && proposals.length >= 3, `Returned ${proposals.length} synthesized campaign proposals`);

    const p1 = proposals[0];
    assert(Boolean(p1.id), `Proposal 1 ID present: ${p1.id}`);
    assert(Boolean(p1.title), `Proposal 1 Title: "${p1.title}"`);
    assert(Boolean(p1.category), `Proposal 1 Category: "${p1.category}"`);
    assert(Boolean(p1.hypothesis), 'Strategic hypothesis present');
    assert(Boolean(p1.derivedFrom), `Empirical evidence quote present: "${p1.derivedFrom}"`);
    assert(['awareness', 'engagement', 'traffic', 'sales', 'lead_generation'].includes(p1.suggestedGoal), `Valid suggested goal: ${p1.suggestedGoal}`);
    assert(['organic', 'paid', 'hybrid'].includes(p1.suggestedMode), `Valid suggested execution mode: ${p1.suggestedMode}`);
    assert(Boolean(p1.targetPersona), `Target audience persona defined: "${p1.targetPersona}"`);
    assert(typeof p1.confidenceScore === 'number' && p1.confidenceScore > 0, `Confidence score valid: ${p1.confidenceScore}`);
    assert(typeof p1.estimatedLiftPct === 'number' && p1.estimatedLiftPct > 0, `Estimated lift percentage valid: +${p1.estimatedLiftPct}%`);
    assert(p1.projectedReachRange && p1.projectedReachRange.max >= p1.projectedReachRange.min, `Reach range valid: ${p1.projectedReachRange.min} - ${p1.projectedReachRange.max}`);

    // Mandatory reach disclaimer invariant
    assert(
      p1.forecastDisclaimer.includes('Organic reach targets are probabilistic estimates, not guarantees.'),
      'Mandatory reach disclaimer present on proposal: "Organic reach targets are probabilistic estimates, not guarantees."'
    );

    // Coordinated 4-post narrative arc verification
    assert(Array.isArray(p1.narrativeArc) && p1.narrativeArc.length === 4, `Narrative arc contains exactly 4 coordinated posts`);
    const arcStep1 = p1.narrativeArc[0];
    assert(arcStep1.step === 1 && Boolean(arcStep1.stage), `Step 1 stage defined: "${arcStep1.stage}"`);
    assert(Boolean(arcStep1.hookIdea), `Step 1 hook idea synthesized: "${arcStep1.hookIdea}"`);
    assert(Boolean(arcStep1.suggestedFormat), `Step 1 format recommended: "${arcStep1.suggestedFormat}"`);
    assert(Boolean(arcStep1.cta), `Step 1 call-to-action present: "${arcStep1.cta}"`);

    // Recommended design templates
    assert(Array.isArray(p1.recommendedTemplates) && p1.recommendedTemplates.length >= 1, `Recommended templates provided: ${p1.recommendedTemplates.join(', ')}`);

    // --- TEST 3: POST /analytics/advisor/apply & Database Persistence ---
    console.log('\n--- [Test 3] POST /analytics/advisor/apply: Strategy Acceptance & Command Center Transfer ---');
    const applyRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/brands/${testBrandId}/analytics/advisor/apply`,
        method: 'POST',
        headers: authHeaders,
      },
      { proposalId: p1.id }
    );

    assert(applyRes.status === 200, `POST /analytics/advisor/apply returns 200 (Received: ${applyRes.status})`);
    assert(applyRes.data.success === true, 'Proposal successfully applied');

    const { recommendationId, prefillCampaign } = applyRes.data.data;
    assert(Boolean(recommendationId), `Generated recommendation record ID: ${recommendationId}`);

    // Verify database record in growth_recommendations table
    const recDb = await db('growth_recommendations').where({ id: recommendationId }).first();
    assert(Boolean(recDb), 'Recommendation record persisted in MySQL growth_recommendations table');
    assert(recDb.brand_id === testBrandId, `Record correctly scoped to brand_id: ${testBrandId}`);
    assert(recDb.status === 'applied', `Record status updated to 'applied': ${recDb.status}`);
    assert(recDb.target_type === 'campaign', `Record target_type is 'campaign': ${recDb.target_type}`);
    assert(recDb.title === p1.title, `Record title matches proposal: "${recDb.title}"`);

    // Verify pre-filled campaign payload for the 6-step Wizard
    assert(Boolean(prefillCampaign), 'Prefill campaign configuration generated');
    assert(prefillCampaign.campaignName === p1.title, `Prefill campaign name matches: "${prefillCampaign.campaignName}"`);
    assert(prefillCampaign.goal === p1.suggestedGoal, `Prefill goal matches: "${prefillCampaign.goal}"`);
    assert(prefillCampaign.executionMode === p1.suggestedMode, `Prefill mode matches: "${prefillCampaign.executionMode}"`);
    assert(prefillCampaign.targetPersona === p1.targetPersona, `Prefill audience persona matches: "${prefillCampaign.targetPersona}"`);
    assert(prefillCampaign.businessIdea.includes(p1.hypothesis), 'Prefill idea includes strategic hypothesis');
    assert(Array.isArray(prefillCampaign.narrativeArc) && prefillCampaign.narrativeArc.length === 4, 'Prefill includes 4-stage narrative arc');
    assert(prefillCampaign.wizardStep === 1, 'Prefill initializes wizard at Step 1 for user review');

    // --- TEST 4: Non-Silent Publishing Invariant Verification ---
    console.log('\n--- [Test 4] Non-Silent Publishing Invariant on Advisor Strategies ---');
    // Verify that applying an advisor proposal does NOT create live published posts
    const livePostCheck = await db('post_variants')
      .join('posts', 'post_variants.post_id', 'posts.id')
      .where('posts.title', 'like', `%${p1.title}%`)
      .select('post_variants.status');

    assert(
      livePostCheck.every((pv) => pv.status !== 'published'),
      'Zero unreviewed live published post variants created by advisor strategy application'
    );

    // --- TEST 5: Production Meta Publication Lock (1405588742634526_122100337179498315) ---
    console.log('\n--- [Test 5] Production Meta Publication Lock Invariant ---');
    const [metaVariant] = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' });

    assert(Boolean(metaVariant), 'Production Meta post variant exists in database');
    assert(metaVariant.status === 'published', `Production Meta variant status is strictly 'published': ${metaVariant.status}`);

    const [metaJob] = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' });

    assert(Boolean(metaJob), 'Production Meta publishing job exists in database');
    assert(metaJob.status === 'published', `Production Meta job status is strictly 'published': ${metaJob.status}`);

  } catch (error) {
    console.error('Fatal test error:', error);
    failedTests++;
  } finally {
    // CLEANUP test records
    try {
      if (testBrandId) {
        await db('agent_memories').where({ brand_id: testBrandId }).delete();
        await db('growth_recommendations').where({ brand_id: testBrandId }).delete();
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

  console.log('\n========================================================================');
  console.log(`   TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
  console.log('========================================================================\n');

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
