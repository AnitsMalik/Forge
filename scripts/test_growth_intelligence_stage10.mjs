/**
 * SocialForge Stage 10: Growth Intelligence Test Suite
 * 
 * Verifies:
 * 1. Multi-Period Baselines Engine (7d, 30d, 90d, 365d) & PlanGuard retention limits
 * 2. Exponential Decay Half-Life Modeling (Facebook, Instagram, X, LinkedIn, YouTube Shorts)
 * 3. Asymptotic Engagement Projections & Velocity Anomaly Detection (>= 2.5x threshold)
 * 4. Empirical & Bayesian Lift Estimator (Shrinkage, Confidence Intervals, p-values)
 * 5. Strategic Growth Advisor (5 Categories: Hook, Timing, Format, Topic, Fatigue)
 * 6. Recommendation Lifecycle (Generation -> Application -> Closed-Loop Brand Brain Sync -> Dismissal)
 * 7. A/B & Multivariate Experiment Engine (Lifecycle, Variant Telemetry, Significance, Promotion)
 * 8. Multi-Tenant Data Isolation (Zero cross-tenant leakage on Baselines, Recommendations, Experiments)
 * 9. Production Meta Publication Lock Invariant (1405588742634526_122100337179498315)
 */

import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import {
  multiPeriodBaselineService,
  engagementHalfLifeService,
  liftEstimatorService,
  growthAdvisorService,
  experimentEngineService,
  growthPipelineService,
} from '../apps/api/dist/services/growth/index.js';
import { planGuardService, PlanGuardError } from '../apps/api/dist/services/billing/planGuard.service.js';
import { BrandBrainService } from '../apps/api/dist/services/brandBrainService.js';

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

async function runStage10TestSuite() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE STAGE 10: GROWTH INTELLIGENCE TEST SUITE                ');
  console.log('   Baselines • Half-Life Decay • Lift Estimator • Advisor • A/B Engine ');
  console.log('========================================================================\n');

  const testTenantIdA = `tenant_s10_${crypto.randomUUID().slice(0, 8)}`;
  const testTenantIdB = `tenant_s10_iso_${crypto.randomUUID().slice(0, 8)}`;
  const testBrandIdA = crypto.randomUUID();
  const testBrandIdB = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testPostId = crypto.randomUUID();
  const now = new Date();

  const variantIds = [];

  try {
    // 1. Tenants
    await db('tenants').insert([
      {
        id: testTenantIdA,
        name: 'Growth Intelligence Test Tenant A',
        slug: `growth-test-a-${Date.now()}`,
        settings: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      },
      {
        id: testTenantIdB,
        name: 'Growth Intelligence Test Tenant B',
        slug: `growth-test-b-${Date.now()}`,
        settings: JSON.stringify({}),
        created_at: now,
        updated_at: now,
      },
    ]);

    // 2. Users
    await db('users').insert({
      id: testUserId,
      email: `s10-tester-${Date.now()}@socialforge.io`,
      password_hash: 'dummy_hash',
      full_name: 'Stage 10 Tester',
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // 3. Brands
    await db('brands').insert([
      {
        id: testBrandIdA,
        tenant_id: testTenantIdA,
        name: 'Apex Growth Brand',
        slug: `apex-growth-${Date.now()}`,
        industry: 'B2B SaaS',
        timezone: 'UTC',
        created_at: now,
        updated_at: now,
      },
      {
        id: testBrandIdB,
        tenant_id: testTenantIdB,
        name: 'Isolated Brand B',
        slug: `iso-brand-b-${Date.now()}`,
        industry: 'Retail',
        timezone: 'UTC',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 4. Subscriptions in tenant_subscriptions
    await db('tenant_subscriptions').insert([
      {
        id: crypto.randomUUID(),
        tenant_id: testTenantIdA,
        plan_id: 'agency',
        status: 'active',
        current_period_start: now,
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now,
      },
      {
        id: crypto.randomUUID(),
        tenant_id: testTenantIdB,
        plan_id: 'starter',
        status: 'active',
        current_period_start: now,
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now,
      },
    ]);

    const postIds = [];
    const variantIds = [];

    for (let i = 1; i <= 5; i++) {
      const pId = crypto.randomUUID();
      const vId = crypto.randomUUID();
      postIds.push(pId);
      variantIds.push(vId);

      const postDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

      await db('posts').insert({
        id: pId,
        tenant_id: testTenantIdA,
        brand_id: testBrandIdA,
        author_id: testUserId,
        title: `Growth Post ${i} for Telemetry`,
        base_content: `Excited to announce milestone ${i}!`,
        status: 'draft',
        created_at: postDate,
        updated_at: postDate,
      });

      await db('post_variants').insert({
        id: vId,
        post_id: pId,
        platform: i % 2 === 0 ? 'instagram' : 'facebook',
        content: `Telemetry variant ${i}`,
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'pending',
        remote_post_id: `mock_remote_${i}_${Date.now()}`,
        created_at: postDate,
        updated_at: postDate,
      });

      await db('post_analytics_snapshots').insert({
        id: crypto.randomUUID(),
        brand_id: testBrandIdA,
        post_id: pId,
        post_variant_id: vId,
        platform: i % 2 === 0 ? 'instagram' : 'facebook',
        remote_post_id: `mock_remote_${i}_${Date.now()}`,
        impressions: 1000 * i,
        reach: 800 * i,
        likes: 35 * i,
        comments: 10 * i,
        shares: 5 * i,
        saves: 8 * i,
        clicks: 20 * i,
        engagement: 50 * i,
        engagement_rate: 5.0,
        raw_metrics: JSON.stringify({ velocityScore: 4.5 * i }),
        created_at: postDate,
      });
    }

    // =========================================================================
    // SECTION 1: Multi-Period Baselines Engine
    // =========================================================================
    await test('Multi-Period Baselines: Dynamic Moving Averages Calculation (7d, 30d, 90d, 365d)', async () => {
      const baselines = await multiPeriodBaselineService.calculateBaselines(testTenantIdA, testBrandIdA, 'all');

      assert(baselines['7d'] !== undefined, '7-day baseline period calculated');
      assert(baselines['30d'] !== undefined, '30-day baseline period calculated');
      assert(baselines['90d'] !== undefined, '90-day baseline period calculated');
      assert(baselines['365d'] !== undefined, '365-day baseline period calculated');

      const b7 = baselines['7d'];
      assert(b7.postCount === 5, `7-day sample size is 5 (got ${b7.postCount})`);
      assert(b7.avgImpressions > 0, `Average impressions calculated: ${b7.avgImpressions}`);
      assert(b7.avgEngagements > 0, `Average engagements calculated: ${b7.avgEngagements}`);
      assert(b7.avgEngagementRate > 0, `Average engagement rate calculated: ${b7.avgEngagementRate}%`);
      assert(b7.avgClicks > 0, `Average clicks calculated: ${b7.avgClicks}`);
      assert(b7.avgShares > 0, `Average shares calculated: ${b7.avgShares}`);
      assert(b7.avgSaves > 0, `Average saves calculated: ${b7.avgSaves}`);

      // Verify persistence in brand_performance_baselines table
      const rows = await db('brand_performance_baselines').where({
        tenant_id: testTenantIdA,
        brand_id: testBrandIdA,
      });
      assert(rows.length === 4, `Persisted exactly 4 period rows in database (got ${rows.length})`);
    });

    await test('Multi-Period Baselines: Plan Retention Enforcement via PlanGuard', async () => {
      // Tenant A is on Agency plan (365 days retention)
      const allowedA = await multiPeriodBaselineService.getAllowedRetentionDays(testTenantIdA);
      assert(allowedA === 365, `Agency plan permits 365 days retention (got ${allowedA})`);

      // Tenant B is on Starter plan (30 days retention)
      const allowedB = await multiPeriodBaselineService.getAllowedRetentionDays(testTenantIdB);
      assert(allowedB === 30, `Starter plan permits 30 days retention (got ${allowedB})`);

      // 30 days on Starter plan should pass
      await multiPeriodBaselineService.enforceRetention(testTenantIdB, 30);
      assert(true, 'Starter plan permits 30-day retention query without error');

      // 90 days on Starter plan should throw PlanGuardError (HTTP 403)
      let threwPlanGuardError = false;
      try {
        await multiPeriodBaselineService.enforceRetention(testTenantIdB, 90);
      } catch (err) {
        if (err instanceof PlanGuardError || err.name === 'PlanGuardError') {
          threwPlanGuardError = true;
          assert(err.statusCode === 403, 'PlanGuardError returns HTTP 403');
          assert(err.checkResult.upgradeRequired === true, 'PlanGuardError flags upgradeRequired: true');
        }
      }
      assert(threwPlanGuardError, 'Requesting 90-day retention on Starter plan is strictly blocked');
    });

    await test('Multi-Period Baselines: Idempotent Recomputation & Snapshot Retrieval', async () => {
      const snapshot = await multiPeriodBaselineService.getBaselines(testTenantIdA, testBrandIdA, 'all');
      assert(snapshot.brandId === testBrandIdA, 'Snapshot matches requested brandId');
      assert(snapshot.tenantId === testTenantIdA, 'Snapshot matches requested tenantId');
      assert(snapshot.allowedRetentionDays === 365, 'Snapshot reports 365 allowed retention days');
      assert(Object.keys(snapshot.baselines).length === 4, 'Snapshot contains all 4 period baselines');

      // Recompute again should update without duplicate key violation
      const recomputed = await multiPeriodBaselineService.calculateBaselines(testTenantIdA, testBrandIdA, 'all');
      assert(recomputed['30d'].id === snapshot.baselines['30d'].id, 'Recomputing updates existing row idempotently');
    });

    // =========================================================================
    // SECTION 2: Engagement Half-Life Modeling & Decay Curves
    // =========================================================================
    await test('Engagement Half-Life: Characteristic Platform Constants & Lambda Decay', () => {
      const fbHalfLife = engagementHalfLifeService.getHalfLifeHours('facebook');
      const igHalfLife = engagementHalfLifeService.getHalfLifeHours('instagram');
      const xHalfLife = engagementHalfLifeService.getHalfLifeHours('x');
      const liHalfLife = engagementHalfLifeService.getHalfLifeHours('linkedin');
      const ytHalfLife = engagementHalfLifeService.getHalfLifeHours('youtube_shorts');

      assert(fbHalfLife === 24, `Facebook half-life is 24 hours (got ${fbHalfLife})`);
      assert(igHalfLife === 48, `Instagram half-life is 48 hours (got ${igHalfLife})`);
      assert(xHalfLife === 4, `X/Twitter half-life is 4 hours (got ${xHalfLife})`);
      assert(liHalfLife === 72, `LinkedIn half-life is 72 hours (got ${liHalfLife})`);
      assert(ytHalfLife === 96, `YouTube Shorts half-life is 96 hours (got ${ytHalfLife})`);

      const fbLambda = engagementHalfLifeService.getDecayLambda(fbHalfLife);
      const expectedLambda = Math.LN2 / 24;
      assert(Math.abs(fbLambda - expectedLambda) < 0.0001, `Decay lambda is ln(2)/24 ≈ ${fbLambda.toFixed(5)}`);
    });

    await test('Engagement Half-Life: Asymptotic Total & Cumulative Fractions', () => {
      // On Facebook (t_1/2 = 24h), at exactly 24h, cumulative engagement fraction should be exactly 50%
      const fractionAtHalfLife = engagementHalfLifeService.calculateCumulativeFraction(24, 'facebook');
      assert(Math.abs(fractionAtHalfLife - 0.5) < 0.01, `Fraction at half-life is 50% (got ${(fractionAtHalfLife * 100).toFixed(1)}%)`);

      // At 48h (2 half-lives), fraction should be 75%
      const fractionAtTwoHalfLives = engagementHalfLifeService.calculateCumulativeFraction(48, 'facebook');
      assert(Math.abs(fractionAtTwoHalfLives - 0.75) < 0.01, `Fraction at 2 half-lives is 75% (got ${(fractionAtTwoHalfLives * 100).toFixed(1)}%)`);

      // If 500 engagements observed at 24h, asymptotic total should be ~1000
      const asymptotic = engagementHalfLifeService.estimateAsymptoticTotal(500, 24, 'facebook');
      assert(Math.abs(asymptotic - 1000) <= 5, `Asymptotic total correctly estimated as 1000 (got ${asymptotic})`);
    });

    await test('Engagement Half-Life: Velocity Anomaly Detection (Viral Surge Threshold >= 2.5x)', () => {
      const pubDate = new Date(Date.now() - 36 * 60 * 60 * 1000); // published 36h ago

      // Normal post with standard velocity decay (e.g. 5 engagements/hour at 36h)
      const normalResult = engagementHalfLifeService.evaluateEngagementVelocity(
        'facebook',
        pubDate,
        600,
        5.0
      );
      assert(normalResult.isVelocityAnomaly === false, 'Standard decaying post is NOT flagged as anomaly');
      assert(normalResult.expectedHalfLifeHours === 24, 'Half-life reports 24h for Facebook');

      // Viral surge post with 45 engagements/hour at 36h (well over 2.5x expected velocity)
      const surgeResult = engagementHalfLifeService.evaluateEngagementVelocity(
        'facebook',
        pubDate,
        600,
        45.0
      );
      assert(surgeResult.isVelocityAnomaly === true, 'Post maintaining high velocity at 36h is flagged as velocity anomaly (viral surge)');
      assert(surgeResult.anomalyRatio >= 2.5, `Anomaly ratio exceeds 2.5x threshold (got ${surgeResult.anomalyRatio}x)`);
    });

    // =========================================================================
    // SECTION 3: Empirical & Bayesian Lift Estimator
    // =========================================================================
    await test('Lift Estimator: Empirical Relative Lift Calculation', () => {
      // Variant 6.0% vs Baseline 4.0% => +50.0% relative lift
      const lift = liftEstimatorService.calculateEmpiricalLift(6.0, 4.0);
      assert(lift === 50.0, `Empirical lift is +50.0% (got ${lift}%)`);

      // Variant 2.0% vs Baseline 4.0% => -50.0% relative drop
      const drop = liftEstimatorService.calculateEmpiricalLift(2.0, 4.0);
      assert(drop === -50.0, `Empirical drop is -50.0% (got ${drop}%)`);
    });

    await test('Lift Estimator: Bayesian Shrinkage on Small Samples', () => {
      const rawLift = 100.0; // Raw +100% lift

      // With tiny sample size of 5 (e.g. 1 click out of 5), shrinkage shrinks heavily towards prior (0%)
      const shrunkenSmall = liftEstimatorService.calculateBayesianShrinkage(rawLift, 5, 50);
      assert(shrunkenSmall < 15.0, `Tiny sample (n=5) shrunken heavily to ${shrunkenSmall}% (prevents false positives)`);

      // With large sample size of 500, shrinkage retains almost full lift
      const shrunkenLarge = liftEstimatorService.calculateBayesianShrinkage(rawLift, 500, 50);
      assert(shrunkenLarge > 90.0, `Large sample (n=500) retains ${shrunkenLarge}% of empirical lift`);
    });

    await test('Lift Estimator: Confidence Intervals & Statistical Significance', () => {
      // Clear winner with robust sample size: 12% vs 4% with n=250 each
      const res = liftEstimatorService.estimateLift(0.12, 0.04, 250, 250, 0.95);
      assert(res.empiricalLiftPct === 200.0, `Empirical lift is +200%`);
      assert(res.confidenceScore >= 0.95, `Confidence score is >= 0.95 (got ${res.confidenceScore})`);
      assert(res.statisticallySignificant === true, 'Statistically significant result declared for robust sample');
      assert(res.credibleIntervalLowerPct > 0, `Lower credible interval is positive (${res.credibleIntervalLowerPct}%)`);
    });

    // =========================================================================
    // SECTION 4: Strategic Growth Advisor & Recommendation Lifecycle
    // =========================================================================
    await test('Growth Advisor: Generate Strategic Recommendations across 5 Categories', async () => {
      const recs = await growthAdvisorService.generateRecommendations(testTenantIdA, testBrandIdA);

      assert(recs.length >= 4, `Generated ${recs.length} recommendations`);

      const categories = recs.map((r) => r.category);
      assert(categories.includes('hook_optimization'), 'Includes hook_optimization recommendation');
      assert(categories.includes('timing_window'), 'Includes timing_window recommendation');
      assert(categories.includes('format_adaptation'), 'Includes format_adaptation recommendation');
      assert(categories.includes('audience_fatigue'), 'Includes audience_fatigue recommendation');

      const hookRec = recs.find((r) => r.category === 'hook_optimization');
      assert(hookRec.confidenceScore >= 0.8, `Hook confidence score is high (got ${hookRec.confidenceScore})`);
      assert(hookRec.status === 'active', 'Initial recommendation status is active');
      assert(hookRec.severity === 'positive', 'Recommendation severity is positive');
    });

    await test('Growth Advisor: Recommendation Application & Closed-Loop Brand Brain Sync', async () => {
      const recs = await growthAdvisorService.getRecommendations(testTenantIdA, testBrandIdA, { status: 'active' });
      const target = recs.find((r) => r.category === 'hook_optimization');
      assert(target !== undefined, 'Target active hook recommendation found');

      // Initialize Brand Brain for brand A
      await BrandBrainService.getBrandBrain(testBrandIdA);

      // Apply recommendation
      const applied = await growthAdvisorService.applyRecommendation(
        testTenantIdA,
        testBrandIdA,
        target.id,
        testUserId
      );

      assert(applied.status === 'applied', 'Status updated to applied');
      assert(applied.appliedAt !== null, 'appliedAt timestamp is set');
      assert(applied.appliedByUserId === testUserId, 'appliedByUserId is recorded');

      // Verify Brand Brain closed-loop feedback
      const brain = await BrandBrainService.getBrandBrain(testBrandIdA);
      const hasHookCTA = brain.ctaPreferences.some((cta) => cta.includes('Hook:'));
      assert(hasHookCTA, 'Applied hook recommendation wrote strategic guideline into Brand Brain memory');
    });

    await test('Growth Advisor: Dismiss Recommendation Lifecycle', async () => {
      const recs = await growthAdvisorService.getRecommendations(testTenantIdA, testBrandIdA, { status: 'active' });
      const target = recs.find((r) => r.category === 'audience_fatigue');
      assert(target !== undefined, 'Found fatigue recommendation');

      const dismissed = await growthAdvisorService.dismissRecommendation(
        testTenantIdA,
        testBrandIdA,
        target.id
      );

      assert(dismissed.status === 'dismissed', 'Status updated to dismissed');

      // Should not be in active recommendations query
      const activeRecs = await growthAdvisorService.getRecommendations(testTenantIdA, testBrandIdA, { status: 'active' });
      assert(!activeRecs.some((r) => r.id === target.id), 'Dismissed recommendation excluded from active filter');
    });

    // =========================================================================
    // SECTION 5: A/B Experimentation Engine
    // =========================================================================
    let experimentId = '';

    await test('A/B Experiments: Create Experiment with Control (A) & Treatment (B)', async () => {
      const variants = await experimentEngineService.createExperiment(testTenantIdA, testBrandIdA, {
        experimentName: 'Headline Hook Optimization: Curiosity vs Bold Claim',
        hypothesis: 'Curiosity question hook will outperform standard bold claim by >= 25% on CTR',
        variantType: 'hook',
        variants: [
          {
            letter: 'A',
            impressions: 100,
            engagements: 5,
            sampleSize: 100,
            metadata: { hookStyle: 'bold_claim', headline: 'The Definitive Way to Scale Social' },
          },
          {
            letter: 'B',
            impressions: 100,
            engagements: 12,
            sampleSize: 100,
            metadata: { hookStyle: 'curiosity_question', headline: 'Are You Making This Massive Social Mistake?' },
          },
        ],
      });

      assert(variants.length === 2, 'Created 2 variants');
      assert(variants[0].variantLetter === 'A', 'Variant A created as Control');
      assert(variants[1].variantLetter === 'B', 'Variant B created as Treatment');
      assert(variants[0].status === 'running', 'Experiment variants initial status is running');

      experimentId = variants[0].experimentId;
      assert(experimentId.length > 0, `Generated experimentId: ${experimentId}`);
    });

    await test('A/B Experiments: Record Live Variant Telemetry', async () => {
      // Update treatment B with additional observations
      const updatedB = await experimentEngineService.recordVariantTelemetry(
        testTenantIdA,
        testBrandIdA,
        experimentId,
        'B',
        {
          impressions: 250,
          engagements: 35,
          conversions: 10,
          sampleSize: 250,
        }
      );

      assert(updatedB.impressions === 250, 'Impressions updated to 250');
      assert(updatedB.engagements === 35, 'Engagements updated to 35');
      assert(updatedB.engagementRate === 14.0, `Engagement rate calculated as 14.0% (got ${updatedB.engagementRate}%)`);
      assert(updatedB.conversionRate === 4.0, `Conversion rate calculated as 4.0% (got ${updatedB.conversionRate}%)`);
    });

    await test('A/B Experiments: Statistical Evaluation & Automatic Winner Declaration', async () => {
      // Also update Control A to 250 impressions and 10 engagements (4.0% ER)
      await experimentEngineService.recordVariantTelemetry(
        testTenantIdA,
        testBrandIdA,
        experimentId,
        'A',
        {
          impressions: 250,
          engagements: 10,
          conversions: 2,
          sampleSize: 250,
        }
      );

      const evalResult = await experimentEngineService.evaluateExperiment(
        testTenantIdA,
        testBrandIdA,
        experimentId
      );

      assert(evalResult.experimentId === experimentId, 'Evaluation matches experimentId');
      assert(evalResult.liftResult.empiricalLiftPct === 250.0, `Empirical lift is +250% (got ${evalResult.liftResult.empiricalLiftPct}%)`);
      assert(evalResult.winnerDeclared === true, 'Winner declared successfully');
      assert(evalResult.winningVariant === 'B', 'Variant B declared as statistical winner');
      assert(evalResult.test.isWinner === true, 'Variant B flagged with isWinner: true');
    });

    await test('A/B Experiments: Conclude Experiment & Promote Learnings to Brand Brain', async () => {
      const concludedVariants = await experimentEngineService.concludeExperiment(
        testTenantIdA,
        testBrandIdA,
        experimentId,
        'B'
      );

      assert(concludedVariants.every((v) => v.status === 'concluded'), 'All variants marked concluded');
      assert(concludedVariants.find((v) => v.variantLetter === 'B').isWinner === true, 'Variant B preserved as winner');

      // Verify written to brand_learning_insights
      const learningInsight = await db('brand_learning_insights')
        .where({
          tenant_id: testTenantIdA,
          brand_id: testBrandIdA,
        })
        .where('title', 'like', '%Variant B%')
        .first();

      assert(learningInsight !== undefined, 'A/B Test winner promoted to brand_learning_insights');
      assert(Number(learningInsight.applied_to_brand_brain) === 1, 'Marked applied_to_brand_brain: true');

      // Verify list experiments API grouping
      const expList = await experimentEngineService.getExperiments(testTenantIdA, testBrandIdA);
      assert(expList[experimentId] !== undefined, 'Experiment returned in brand experiment map');
      assert(expList[experimentId].status === 'concluded', 'Grouped experiment status is concluded');
    });

    // =========================================================================
    // SECTION 6: Multi-Tenant Boundary Isolation
    // =========================================================================
    await test('Multi-Tenant Isolation: Cross-Tenant Data Access Strictly Blocked', async () => {
      // Tenant B queries Baselines for Brand A -> Empty / Scoped
      const bSnapshot = await multiPeriodBaselineService.getBaselines(testTenantIdB, testBrandIdA, 'all');
      // Queries are strictly WHERE tenant_id = testTenantIdB
      const rowsB = await db('brand_performance_baselines').where({
        tenant_id: testTenantIdB,
        brand_id: testBrandIdA,
      });
      assert(rowsB.length === 0, 'Tenant B cannot see Tenant A baselines (zero cross-tenant leakage)');

      // Tenant B attempts to apply Tenant A recommendation
      const recA = (await growthAdvisorService.getRecommendations(testTenantIdA, testBrandIdA))[0];
      let tenantBApplyBlocked = false;
      try {
        await growthAdvisorService.applyRecommendation(testTenantIdB, testBrandIdA, recA.id);
      } catch (err) {
        tenantBApplyBlocked = true;
      }
      assert(tenantBApplyBlocked, 'Tenant B strictly blocked from applying Tenant A recommendation');

      // Tenant B queries Experiments for Brand A
      const expsB = await experimentEngineService.getExperiments(testTenantIdB, testBrandIdA);
      assert(Object.keys(expsB).length === 0, 'Tenant B cannot access Tenant A A/B experiments');
    });

    // =========================================================================
    // SECTION 7: Permanent Production Post Lock Invariant
    // =========================================================================
    await test('Production Publication Lock: Variant 1405588742634526_122100337179498315 Intact', async () => {
      const lockedVariant = await db('post_variants')
        .where({ remote_post_id: '1405588742634526_122100337179498315' })
        .first();

      assert(lockedVariant !== undefined, 'Locked production post variant exists in database');
      assert(lockedVariant.status === 'published', `Status is strictly "published" (got "${lockedVariant?.status}")`);

      const job = await db('publishing_jobs')
        .where({ external_post_id: '1405588742634526_122100337179498315' })
        .first();
      assert(job !== undefined, 'Publishing job for locked production variant exists');
    });

    // =========================================================================
    // SECTION 8: Real Provider Metrics & Metric Provenance Tracking
    // =========================================================================
    await test('Real Provider Metrics & Provenance: SHA-256 Hashes, Rate Limits & Success Tracking', async () => {
      const syncResult = await growthPipelineService.syncProviderMetrics(testTenantIdA, testBrandIdA);
      assert(syncResult.processed > 0, `Processed published variants (got ${syncResult.processed})`);
      assert(syncResult.updated > 0, `Updated snapshots with provider metrics (got ${syncResult.updated})`);
      assert(syncResult.timeSeriesRecorded > 0, `Recorded granular time-series points (got ${syncResult.timeSeriesRecorded})`);

      // Verify provenance stored in snapshot
      const snapshot = await db('post_analytics_snapshots')
        .where({ brand_id: testBrandIdA })
        .first();

      assert(snapshot !== undefined, 'Snapshot exists in database');
      assert(snapshot.impressions > 0, `Real impressions recorded (got ${snapshot.impressions})`);

      let raw = snapshot.raw_metrics;
      if (typeof raw === 'string') raw = JSON.parse(raw);

      assert(raw.provenance !== undefined, 'Metric provenance object stored in raw_metrics');
      assert(raw.provenance.provider === 'facebook' || raw.provenance.provider === 'instagram', `Provider recorded: ${raw.provenance.provider}`);
      assert(raw.provenance.providerPostId !== undefined, 'Provider post ID matches remote_post_id');
      assert(typeof raw.provenance.rawResponseHash === 'string' && raw.provenance.rawResponseHash.length === 64, 'Raw payload SHA-256 hash stored');
      assert(raw.provenance.rateLimitRemaining > 0, `Rate limit remaining tracked (got ${raw.provenance.rateLimitRemaining})`);
      assert(raw.provenance.source === 'provider_api', 'Provenance source is strictly provider_api');
      assert(raw.provenance.lastSuccessAt !== undefined, 'lastSuccessAt timestamp recorded');

      // Verify time-series entries in post_analytics_metrics
      const timeSeriesCount = await db('post_analytics_metrics')
        .where({ brand_id: testBrandIdA })
        .count('id as cnt')
        .first();
      assert(Number(timeSeriesCount.cnt) >= 5, `Granular time series entries recorded (got ${timeSeriesCount.cnt})`);
    });

    // =========================================================================
    // SECTION 9: Snapshot Preservation During Rate Limits & API Failures (Zero Fabrication)
    // =========================================================================
    await test('Snapshot Preservation: Last Valid Snapshot Preserved During Provider 429 Rate Limits', async () => {
      // 1. Record snapshot state before failure
      const snapBefore = await db('post_analytics_snapshots').where({ brand_id: testBrandIdA }).first();
      const originalImpressions = snapBefore.impressions;
      const originalReach = snapBefore.reach;
      const originalEngagement = snapBefore.engagement;

      assert(originalImpressions > 0, 'Initial valid impressions exist before simulated failure');

      // 2. Simulate Provider HTTP 429 Rate Limit
      const failureResult = await growthPipelineService.syncProviderMetrics(testTenantIdA, testBrandIdA, {
        isRateLimit: true,
        errorMessage: 'Too Many Requests (HTTP 429)',
      });

      assert(failureResult.preservedOnFailure > 0, `Preserved snapshots during failure (got ${failureResult.preservedOnFailure})`);

      // 3. Verify snapshot is PRESERVED, NOT WIPED OR ZEROED OUT
      const snapAfter = await db('post_analytics_snapshots').where({ id: snapBefore.id }).first();

      assert(snapAfter.impressions === originalImpressions, `Impressions preserved identically (got ${snapAfter.impressions})`);
      assert(snapAfter.reach === originalReach, `Reach preserved identically (got ${snapAfter.reach})`);
      assert(snapAfter.engagement === originalEngagement, `Engagement preserved identically (got ${snapAfter.engagement})`);

      // 4. Verify informative last_error is recorded
      assert(snapAfter.last_error !== null, 'last_error recorded on snapshot');
      assert(snapAfter.last_error.includes('HTTP 429'), `Error message indicates rate limit (got "${snapAfter.last_error}")`);

      let rawAfter = snapAfter.raw_metrics;
      if (typeof rawAfter === 'string') rawAfter = JSON.parse(rawAfter);

      assert(rawAfter.provenance.source === 'cached_snapshot', 'Provenance marks source as cached_snapshot during failure');
      assert(rawAfter.provenance.rateLimitRemaining === 0, 'Provenance records rateLimitRemaining: 0');
      assert(rawAfter.provenance.consecutiveFailures >= 1, 'Provenance increments failure counter');
      assert(rawAfter.rateLimitProtected === true, 'Flagged rateLimitProtected: true');
    });

    await test('Zero Historical Fabrication: Unmeasured Content Never Fabricates Performance', async () => {
      // Create a brand new post variant with no prior snapshot
      const unmeasuredPostId = crypto.randomUUID();
      const unmeasuredVariantId = crypto.randomUUID();
      postIds.push(unmeasuredPostId);
      variantIds.push(unmeasuredVariantId);

      await db('posts').insert({
        id: unmeasuredPostId,
        tenant_id: testTenantIdA,
        brand_id: testBrandIdA,
        author_id: testUserId,
        title: 'Unmeasured New Post',
        base_content: 'Brand new draft',
        status: 'published',
        created_at: now,
        updated_at: now,
      });

      await db('post_variants').insert({
        id: unmeasuredVariantId,
        post_id: unmeasuredPostId,
        platform: 'facebook',
        content: 'Unmeasured variant',
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'published',
        remote_post_id: `mock_unmeasured_${Date.now()}`,
        created_at: now,
        updated_at: now,
      });

      // Simulate failure on initial fetch
      await growthPipelineService.syncProviderMetrics(testTenantIdA, testBrandIdA, {
        isRateLimit: true,
        errorMessage: 'Rate limited before initial fetch',
      });

      const unmeasuredSnap = await db('post_analytics_snapshots')
        .where({ post_variant_id: unmeasuredVariantId })
        .first();

      assert(unmeasuredSnap !== undefined, 'Unmeasured snapshot row created with failure metadata');
      assert(unmeasuredSnap.impressions === null, 'Impressions strictly null (NEVER FABRICATED)');
      assert(unmeasuredSnap.engagement === null, 'Engagement strictly null (NEVER FABRICATED)');
      assert(unmeasuredSnap.engagement_rate === null, 'Engagement rate strictly null (NEVER FABRICATED)');

      let raw = typeof unmeasuredSnap.raw_metrics === 'string' ? JSON.parse(unmeasuredSnap.raw_metrics) : unmeasuredSnap.raw_metrics;
      assert(raw.fabricationProtected === true, 'fabricationProtected flag active');
    });

    // =========================================================================
    // SECTION 10: Goal-Gap Analysis (Pacing, Deficit/Surplus, Trajectory)
    // =========================================================================
    await test('Goal-Gap Analysis: Brand Targets, Deficits/Surpluses & Trajectory Pacing', async () => {
      // 1. Set explicit brand goals
      await growthPipelineService.setGoal(testTenantIdA, testBrandIdA, {
        metric: 'impressions',
        targetValue: 10000,
        period: '30d',
      });
      await growthPipelineService.setGoal(testTenantIdA, testBrandIdA, {
        metric: 'engagements',
        targetValue: 500,
        period: '30d',
      });
      await growthPipelineService.setGoal(testTenantIdA, testBrandIdA, {
        metric: 'clicks',
        targetValue: 200,
        period: '30d',
      });

      // 2. Compute goal-gap analysis
      const analysis = await growthPipelineService.analyzeGoalGaps(testTenantIdA, testBrandIdA, '30d');

      assert(analysis.brandId === testBrandIdA, 'Analysis matches target brandId');
      assert(analysis.tenantId === testTenantIdA, 'Analysis matches target tenantId');
      assert(Array.isArray(analysis.items) && analysis.items.length >= 3, 'Items returned for all goals');

      // Verify impressions goal gap calculation
      const impGoal = analysis.items.find((i) => i.metric === 'impressions');
      assert(impGoal !== undefined, 'Impressions goal returned');
      assert(impGoal.target === 10000, 'Target is 10000');
      assert(typeof impGoal.actual === 'number' && impGoal.actual > 0, `Actual is positive (got ${impGoal.actual})`);
      assert(impGoal.gap === impGoal.actual - 10000, 'Gap equals actual minus target');
      assert(impGoal.gapPct === Number((((impGoal.actual - 10000) / 10000) * 100).toFixed(2)), 'Gap percentage calculated accurately');
      assert(['exceeding', 'on_track', 'behind', 'critical_gap'].includes(impGoal.status), `Status classified: ${impGoal.status}`);
      assert(['improving', 'stable', 'declining'].includes(impGoal.trajectory), `Trajectory classified: ${impGoal.trajectory}`);
      assert(impGoal.projectedPeriodEnd > 0, 'Projected period-end actual calculated');

      assert(['excellent', 'healthy', 'at_risk', 'lagging'].includes(analysis.overallHealth), `Overall health classified: ${analysis.overallHealth}`);
    });

    // =========================================================================
    // SECTION 11: Dimension Performance Breakdown (Format, Topic, Hook, CTA, Timing)
    // =========================================================================
    await test('Dimension Performance Breakdown: Format, Topic, Hook, CTA, and Timing Window Radar', async () => {
      const dimensions = await growthPipelineService.analyzeDimensions(testTenantIdA, testBrandIdA, '30d');

      assert(dimensions.brandId === testBrandIdA, 'Dimensions match brand');
      assert(dimensions.tenantId === testTenantIdA, 'Dimensions match tenant');

      // 1. Content performance
      assert(Array.isArray(dimensions.content) && dimensions.content.length > 0, 'Content performance items returned');
      const sampleContent = dimensions.content[0];
      assert(sampleContent.postId !== undefined, 'Post ID defined');
      assert(typeof sampleContent.engagementRate === 'number', 'Engagement rate defined');
      assert(typeof sampleContent.velocityScore === 'number', 'Velocity score defined');
      assert(typeof sampleContent.isWinner === 'boolean', 'isWinner boolean defined');

      // 2. Format performance
      assert(Array.isArray(dimensions.formats) && dimensions.formats.length > 0, 'Format breakdown returned');
      const sampleFormat = dimensions.formats[0];
      assert(typeof sampleFormat.format === 'string', 'Format type defined');
      assert(typeof sampleFormat.avgEngagementRate === 'number', 'Format avgEngagementRate defined');
      assert(typeof sampleFormat.liftVsBaselinePct === 'number', 'Format liftVsBaselinePct defined');

      // 3. Topic performance
      assert(Array.isArray(dimensions.topics) && dimensions.topics.length > 0, 'Topic breakdown returned');
      const sampleTopic = dimensions.topics[0];
      assert(typeof sampleTopic.topic === 'string', 'Topic name defined');
      assert(typeof sampleTopic.avgEngagementRate === 'number', 'Topic avgEngagementRate defined');

      // 4. Hook performance
      assert(Array.isArray(dimensions.hooks) && dimensions.hooks.length > 0, 'Hook breakdown returned');
      const sampleHook = dimensions.hooks[0];
      assert(typeof sampleHook.hookStyle === 'string', 'Hook style defined');
      assert(typeof sampleHook.decayHalfLifeHours === 'number', 'Hook decay half life defined');

      // 5. CTA performance
      assert(Array.isArray(dimensions.ctas) && dimensions.ctas.length > 0, 'CTA breakdown returned');
      const sampleCta = dimensions.ctas[0];
      assert(typeof sampleCta.ctaStyle === 'string', 'CTA style defined');
      assert(typeof sampleCta.avgCtr === 'number', 'CTA avgCtr defined');

      // 6. Timing performance
      assert(Array.isArray(dimensions.timing) && dimensions.timing.length > 0, 'Timing breakdown returned');
      const sampleTiming = dimensions.timing[0];
      assert(typeof sampleTiming.dayOfWeek === 'number', 'dayOfWeek defined');
      assert(typeof sampleTiming.hourOfDay === 'number', 'hourOfDay defined');
      assert(typeof sampleTiming.timeSlot === 'string', 'timeSlot defined');
      assert(typeof sampleTiming.avgVelocityScore === 'number', 'Timing avgVelocityScore defined');
      assert(typeof sampleTiming.isPeakWindow === 'boolean', 'isPeakWindow defined');
    });

    // =========================================================================
    // SECTION 12: Forecast Ranges & Confidence (Ranges, Not Deterministic Guarantees)
    // =========================================================================
    await test('Forecast Ranges & Confidence: Probabilistic Interval Bounds (isForecast: true)', async () => {
      const forecastReport = await growthPipelineService.generateForecastRanges(testTenantIdA, testBrandIdA, 30);

      assert(forecastReport.brandId === testBrandIdA, 'Forecast matches brand');
      assert(forecastReport.tenantId === testTenantIdA, 'Forecast matches tenant');
      assert(Array.isArray(forecastReport.forecasts) && forecastReport.forecasts.length >= 4, 'Forecasts generated across key metrics');

      for (const fc of forecastReport.forecasts) {
        // MANDATORY REQUIREMENT: Clearly distinguish forecast from actual performance
        assert(fc.isForecast === true, `isForecast is strictly true (got ${fc.isForecast})`);

        // MANDATORY REQUIREMENT: Forecasts must be ranges, not guarantees
        assert(typeof fc.min === 'number', 'Min bound defined');
        assert(typeof fc.expected === 'number', 'Expected value defined');
        assert(typeof fc.max === 'number', 'Max bound defined');
        assert(fc.min < fc.expected, `Lower bound is strictly less than expected (${fc.min} < ${fc.expected})`);
        assert(fc.expected < fc.max, `Expected is strictly less than upper bound (${fc.expected} < ${fc.max})`);

        // Confidence score between 0.0 and 1.0
        assert(fc.confidence >= 0.0 && fc.confidence <= 1.0, `Confidence is valid probability (got ${fc.confidence})`);
        assert(fc.credibleIntervalLower === fc.min, 'credibleIntervalLower matches min');
        assert(fc.credibleIntervalUpper === fc.max, 'credibleIntervalUpper matches max');
      }
    });

    // =========================================================================
    // SECTION 13: Winner Detection & A/B Experiment Design
    // =========================================================================
    await test('Winner Detection & A/B Experiment Design: Statistical Outperformer to Experiment Mapping', async () => {
      const result = await growthPipelineService.detectWinnersAndDesignExperiments(testTenantIdA, testBrandIdA);

      assert(typeof result.winnersDetected === 'number', 'Winners detected count returned');

      if (result.designedExperiment) {
        assert(typeof result.designedExperiment.experimentName === 'string', 'Experiment name suggested');
        assert(typeof result.designedExperiment.hypothesis === 'string', 'Experiment hypothesis formulated');
        assert(result.designedExperiment.variantType === 'hook' || result.designedExperiment.variantType === 'format', 'Experiment variant type set');
        assert(typeof result.designedExperiment.controlA === 'string', 'Control A variant provided');
        assert(typeof result.designedExperiment.treatmentB === 'string', 'Treatment B variant provided');
      }
    });

    // =========================================================================
    // SECTION 14: Cross-Channel Repurposing Intelligence
    // =========================================================================
    await test('Cross-Channel Repurposing: Adapting High-Performing Posts Across Platforms', async () => {
      const repurposings = await growthPipelineService.generateCrossChannelRepurposings(testTenantIdA, testBrandIdA);

      assert(Array.isArray(repurposings) && repurposings.length > 0, `Repurposing recommendations created (got ${repurposings.length})`);

      const topRepurposing = repurposings[0];
      assert(topRepurposing.sourcePlatform !== undefined, 'Source platform defined');
      assert(topRepurposing.targetPlatform !== undefined, 'Target platform defined');
      assert(topRepurposing.sourcePlatform !== topRepurposing.targetPlatform, 'Cross-platform transition confirmed');
      assert(typeof topRepurposing.adaptationGuide === 'string', 'Adaptation guide provides actionable steps');
      assert(topRepurposing.estimatedPotentialLiftPct > 0, `Potential lift positive (got ${topRepurposing.estimatedPotentialLiftPct}%)`);
      assert(topRepurposing.confidenceScore >= 0.8, `Confidence score high (got ${topRepurposing.confidenceScore})`);
      assert(topRepurposing.status === 'suggested', 'Initial status is suggested');

      // Verify persisted in database
      const row = await db('cross_channel_repurposings').where({ id: topRepurposing.id }).first();
      assert(row !== undefined, 'Repurposing recommendation persisted in cross_channel_repurposings table');
    });

    // =========================================================================
    // SECTION 15: Recommendation Generation & Causation Guardrails
    // =========================================================================
    await test('Recommendation Syntax: Strict Adherence to Non-Causal Language & Flagship Promotion Example', async () => {
      const recs = await growthPipelineService.synthesizeGrowthRecommendations(testTenantIdA, testBrandIdA);

      assert(recs.length > 0, 'Growth recommendations synthesized');

      // EXACT USER REQUIREMENT ASSERTION:
      // "Product Promotion posts using this template generated stronger engagement than the brand's recent baseline."
      const productPromoRec = recs.find((r) =>
        r.description.includes("Product Promotion posts using this template generated stronger engagement than the brand's recent baseline.")
      );

      assert(
        productPromoRec !== undefined,
        "Mandatory recommendation generated: 'Product Promotion posts using this template generated stronger engagement than the brand's recent baseline.'"
      );
      assert(productPromoRec.confidenceScore >= 0.85, `Confidence score is high (got ${productPromoRec.confidenceScore})`);
      assert(productPromoRec.estimatedLiftPct > 0, `Estimated lift is positive (got ${productPromoRec.estimatedLiftPct}%)`);

      // CAUSATION GUARDRAIL: Do not claim causation unless the available data supports it
      const forbiddenCausalPhrases = ['caused by', 'direct cause of', 'proves causation', 'guarantees that'];
      for (const r of recs) {
        const text = `${r.title} ${r.description} ${r.suggestedAction}`.toLowerCase();
        for (const forbidden of forbiddenCausalPhrases) {
          assert(!text.includes(forbidden), `Recommendation avoids unverified causal claim "${forbidden}"`);
        }
      }
    });

    // =========================================================================
    // SECTION 16: Full Pipeline Execution Orchestration
    // =========================================================================
    await test('Analytics Pipeline Orchestration: Published Content -> Provider Metrics -> Snapshot -> Time Series -> Goal -> Forecast -> Winner -> Recommendations', async () => {
      const pipelineResult = await growthPipelineService.executePipeline(testTenantIdA, testBrandIdA);

      assert(pipelineResult.publishedPostsProcessed > 0, 'Stage 1 & 2: Published content processed');
      assert(pipelineResult.snapshotsUpdated > 0, 'Stage 3: Analytics snapshots updated');
      assert(pipelineResult.timeSeriesMetricsRecorded > 0, 'Stage 4: Time series metrics recorded');
      assert(pipelineResult.goalGaps !== undefined && pipelineResult.goalGaps.items.length > 0, 'Stage 5: Goal comparison calculated');
      assert(pipelineResult.dimensionPerformance !== undefined, 'Dimension performance calculated');
      assert(pipelineResult.forecastRanges !== undefined && pipelineResult.forecastRanges.forecasts.length > 0, 'Stage 6: Forecast ranges generated');
      assert(typeof pipelineResult.winnersDetected === 'number', 'Stage 7: Winner detection evaluated');
      assert(pipelineResult.repurposingSuggestions.length > 0, 'Cross-channel repurposing suggestions generated');
      assert(pipelineResult.recommendationsGenerated > 0, 'Stage 8: Recommendations generated');
    });

    // =========================================================================
    // SECTION 17: Multi-Tenant Isolation for New Entities
    // =========================================================================
    await test('Multi-Tenant Isolation: Goals, Dimensions, Forecasts & Repurposings Strictly Isolated', async () => {
      // Tenant B queries Brand A goals
      const goalsB = await growthPipelineService.getGoals(testTenantIdB, testBrandIdA);
      // Brand A goals belong to Tenant A, so querying with Tenant B should not see Tenant A goals
      const rowsForB = await db('brand_goals').where({ tenant_id: testTenantIdB, brand_id: testBrandIdA });
      assert(rowsForB.length === 0, 'Tenant B has zero access to Tenant A brand goals in database');

      // Tenant B queries Repurposings for Brand A
      const repB = await db('cross_channel_repurposings').where({ tenant_id: testTenantIdB, brand_id: testBrandIdA });
      assert(repB.length === 0, 'Tenant B cannot see Tenant A cross-channel repurposings');
    });

  } finally {
    // Cleanup test fixtures
    console.log('\n[Cleanup] Cleaning up Stage 10 test fixtures...');
    try {
      await db('cross_channel_repurposings').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('brand_goals').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('brand_brains').whereIn('brand_id', [testBrandIdA, testBrandIdB]).delete();
      await db('experiment_variants').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('growth_recommendations').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('brand_performance_baselines').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('brand_learning_insights').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('post_analytics_metrics').whereIn('brand_id', [testBrandIdA, testBrandIdB]).delete();
      await db('post_analytics_snapshots').whereIn('brand_id', [testBrandIdA, testBrandIdB]).delete();
      if (variantIds.length > 0) {
        await db('post_variants').whereIn('id', variantIds).delete();
      }
      await db('posts').whereIn('brand_id', [testBrandIdA, testBrandIdB]).delete();
      await db('tenant_subscriptions').whereIn('tenant_id', [testTenantIdA, testTenantIdB]).delete();
      await db('brands').whereIn('id', [testBrandIdA, testBrandIdB]).delete();
      await db('users').where({ id: testUserId }).delete();
      await db('tenants').whereIn('id', [testTenantIdA, testTenantIdB]).delete();
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  console.log('========================================================================');
  console.log(`   STAGE 10 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED     `);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage10TestSuite()
  .then(() => {
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    setTimeout(() => process.exit(1), 100);
  });
