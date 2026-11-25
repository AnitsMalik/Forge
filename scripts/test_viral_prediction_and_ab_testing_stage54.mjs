/**
 * SocialForge — Phase 54 Automated Viral Content Prediction & A/B Variant Testing Engine Test Suite
 * Validates hook strength, media synergy, hashtag velocity, Bayesian A/B significance,
 * and automated winning variant promotion.
 */

import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { viralPredictionService } from '../apps/api/dist/services/growth/viralPredictionService.js';
import { abTestingService } from '../apps/api/dist/services/growth/abTestingService.js';

console.log('========================================================================');
console.log('   SOCIALFORGE: STAGE 54 VIRAL PREDICTION & A/B TESTING SUITE           ');
console.log('   Hook Scoring • Media Multipliers • Z-Test Winner Auto-Promotion      ');
console.log('========================================================================\n');

let passCount = 0;
let failCount = 0;
let checkId = 0;
const results = [];

function pass(title, detail = '') {
  checkId++;
  passCount++;
  console.log(`[PASS ${String(checkId).padStart(2, '0')}] ✓ ${title} ${detail}`);
  results.push({ id: checkId, title, status: 'PASS' });
}

function fail(title, error = '') {
  checkId++;
  failCount++;
  console.error(`[FAIL ${String(checkId).padStart(2, '0')}] ❌ ${title}: ${error}`);
  results.push({ id: checkId, title, status: 'FAIL', error });
}

async function runStage54Tests() {
  console.log('--- [TRACK 1: Algorithmic Feature Analysis & Scoring Math] ---');

  // 1. Hook Strength: Curiosity Gap & Pattern Interrupt
  try {
    const highHook = viralPredictionService.evaluateHook('🚨 STOP SCROLLING: 3 secrets nobody talks about in SaaS growth 👇');
    const lowHook = viralPredictionService.evaluateHook('Hello this is a regular company update for today.');

    if (highHook < 80.0) throw new Error(`High hook score too low: ${highHook}`);
    if (lowHook > 65.0) throw new Error(`Low hook score too high: ${lowHook}`);
    pass('Evaluated opening hook strength with curiosity gap & pattern-interrupt multipliers', `(${highHook} vs ${lowHook})`);
  } catch (err) {
    fail('Hook strength evaluation failed', err.message);
  }

  // 2. Readability & Scannability
  try {
    const scannableContent = `3 Unfair Advantages of AI Marketing Agents:\n\n• 24/7 automated trend monitoring\n• Instant 9:16 vertical video composition\n• Real-time Bayesian A/B variant testing\n\nDrop a 🔥 below if you want the blueprint!`;
    const wallOfText = 'A'.repeat(400);

    const goodReadability = viralPredictionService.evaluateReadability(scannableContent);
    const badReadability = viralPredictionService.evaluateReadability(wallOfText);

    if (goodReadability < 75.0) throw new Error(`Scannable content score too low: ${goodReadability}`);
    if (badReadability > 45.0) throw new Error(`Wall of text score too high: ${badReadability}`);
    pass('Evaluated scannability, vertical whitespace spacing, and CTA detection', `(${goodReadability} vs ${badReadability})`);
  } catch (err) {
    fail('Readability evaluation failed', err.message);
  }

  // 3. Media Synergy Multipliers
  try {
    const videoScore = viralPredictionService.evaluateMediaSynergy(['https://cdn.socialforge.io/videos/viral_clip.mp4'], 'tiktok');
    const textScore = viralPredictionService.evaluateMediaSynergy([], 'tiktok');

    if (videoScore < 90.0) throw new Error(`Video synergy score too low: ${videoScore}`);
    if (textScore > 50.0) throw new Error(`Text-only score on short-form platform too high: ${textScore}`);
    pass('Evaluated media synergy scoring (9:16 vertical video delivers 96/100 synergy rating)');
  } catch (err) {
    fail('Media synergy evaluation failed', err.message);
  }

  // 4. Hashtag Velocity & Discovery Factor
  try {
    const shortsHashtags = viralPredictionService.evaluateHashtags('Growth strategies for 2026 #Shorts #Marketing', 'youtube_shorts');
    const spamHashtags = viralPredictionService.evaluateHashtags('Post with too many tags ' + '#tag '.repeat(20), 'instagram');

    if (shortsHashtags < 85.0) throw new Error(`Shorts hashtag score too low: ${shortsHashtags}`);
    if (spamHashtags > 55.0) throw new Error(`Spam hashtag score not penalized: ${spamHashtags}`);
    pass('Evaluated hashtag discovery scoring and platform-specific spam penalties');
  } catch (err) {
    fail('Hashtag evaluation failed', err.message);
  }

  console.log('\n--- [TRACK 2: Composite Viral Score & Tier Resolution] ---');

  // 5. High-probability viral breakout prediction
  try {
    const prediction = await viralPredictionService.predict({
      brandId: 'dummy-brand',
      platform: 'youtube_shorts',
      content: `🚨 STOP SCROLLING: 3 AI Growth Hacks that will double your revenue in 30 days 👇\n\n• Automated Trend Analysis\n• Zero-Race Post Scheduling\n• Multi-Variant A/B Split Testing\n\nTap Subscribe and drop a 🔥 in the comments! #Shorts #Growth`,
      mediaUrls: ['https://cdn.socialforge.io/video/growth_short.mp4'],
    });

    if (prediction.overallScore < 85.0) throw new Error(`Expected breakout score >= 85, got ${prediction.overallScore}`);
    if (prediction.tier !== 'breakout') throw new Error(`Expected breakout tier, got ${prediction.tier}`);
    if (prediction.velocityMultiplier !== 3.2) throw new Error(`Expected 3.2x multiplier, got ${prediction.velocityMultiplier}`);
    pass('Classified viral breakout variant with 3.2x velocity multiplier and high confidence', `(${prediction.overallScore}/100 - Tier: ${prediction.tier})`);
  } catch (err) {
    fail('Breakout prediction check failed', err.message);
  }

  // 6. Actionable recommendations generation
  try {
    const weakPrediction = await viralPredictionService.predict({
      brandId: 'dummy-brand',
      platform: 'tiktok',
      content: 'Here is our new corporate product announcement.',
      mediaUrls: [],
    });

    if (weakPrediction.tier !== 'low') throw new Error(`Expected low tier, got ${weakPrediction.tier}`);
    if (weakPrediction.recommendations.length < 2) {
      throw new Error(`Expected at least 2 recommendations, got ${weakPrediction.recommendations.length}`);
    }
    pass('Generated actionable optimization recommendations for underperforming drafts', `(${weakPrediction.recommendations.length} recommendations)`);
  } catch (err) {
    fail('Recommendations generation check failed', err.message);
  }

  console.log('\n--- [TRACK 3: Multi-Variant A/B Experiment Provisioning] ---');

  const testTenantId = `ab-tenant-${crypto.randomUUID().slice(0, 8)}`;
  const testBrandId = crypto.randomUUID();
  const testAuthor = await db('users').first();
  const testPostId = crypto.randomUUID();
  const variantAId = crypto.randomUUID();
  const variantBId = crypto.randomUUID();
  const variantCId = crypto.randomUUID();
  let experimentId = '';

  try {
    // 7. Provision synthetic tenant, brand, post, and variants
    await db('tenants').insert({
      id: testTenantId,
      name: 'Viral A/B Growth Agency',
      slug: `ab-tenant-${Date.now()}`,
      subscription_tier: 'agency_pro',
      settings: '{}',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('brands').insert({
      id: testBrandId,
      tenant_id: testTenantId,
      name: 'Apex Viral Labs',
      slug: `apex-viral-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('posts').insert({
      id: testPostId,
      tenant_id: testTenantId,
      brand_id: testBrandId,
      author_id: testAuthor.id,
      title: 'Q4 Flagship Campaign A/B Test Post',
      base_content: 'Master content deck for A/B testing flight',
      status: 'in_review',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const testVariants = [
      { id: variantAId, platform: 'youtube_shorts', content: 'Variant A: Direct product statement' },
      { id: variantBId, platform: 'tiktok', content: 'Variant B: High-curiosity storytelling hook with numbers' },
      { id: variantCId, platform: 'instagram', content: 'Variant C: Provocative question with controversial angle' },
    ];

    for (const tv of testVariants) {
      await db('post_variants').insert({
        id: tv.id,
        post_id: testPostId,
        platform: tv.platform,
        content: tv.content,
        media_asset_ids: '[]',
        platform_specific_config: '{}',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    pass('Provisioned isolated synthetic post with 3 challenger variants for A/B testing');

    // 8. Create A/B experiment
    const expResult = await abTestingService.createExperiment({
      tenantId: testTenantId,
      brandId: testBrandId,
      postId: testPostId,
      name: 'Omnichannel Viral Hook A/B/n Flight Test',
      flightWindowHours: 6,
      sampleSizeTarget: 1500,
      variants: [
        { postVariantId: variantAId, label: 'Variant A (Control)', trafficAllocationPct: 33.33 },
        { postVariantId: variantBId, label: 'Variant B (Story Hook)', trafficAllocationPct: 33.33 },
        { postVariantId: variantCId, label: 'Variant C (Question Hook)', trafficAllocationPct: 33.34 },
      ],
    });

    experimentId = expResult.experimentId;
    if (expResult.status !== 'running') throw new Error(`Expected running status, got ${expResult.status}`);
    pass('Created 3-way A/B/n experiment flight with balanced traffic allocation percentages');
  } catch (err) {
    fail('A/B experiment provisioning failed', err.message);
  }

  console.log('\n--- [TRACK 4: Early Velocity Ingestion & Statistical Significance] ---');

  // 9. Record sample flight engagement metrics
  try {
    // Variant A: 500 impressions, 21 engagements (4.2% conversion)
    await abTestingService.recordVariantMetrics(experimentId, variantAId, {
      impressions: 500,
      engagements: 21,
      clicks: 14,
      shares: 3,
    });

    // Variant B: 500 impressions, 68 engagements (13.6% conversion - clear outperformer)
    await abTestingService.recordVariantMetrics(experimentId, variantBId, {
      impressions: 500,
      engagements: 68,
      clicks: 45,
      shares: 18,
    });

    // Variant C: 500 impressions, 24 engagements (4.8% conversion)
    await abTestingService.recordVariantMetrics(experimentId, variantCId, {
      impressions: 500,
      engagements: 24,
      clicks: 15,
      shares: 4,
    });

    const details = await abTestingService.getExperimentDetails(experimentId);
    if (details.totalImpressions !== 1500) throw new Error(`Expected 1500 total impressions, got ${details.totalImpressions}`);
    if (details.totalEngagements !== 113) throw new Error(`Expected 113 total engagements, got ${details.totalEngagements}`);
    pass('Ingested test flight engagement telemetry across all variants', `(1,500 impressions, 113 engagements)`);
  } catch (err) {
    fail('Variant telemetry ingestion failed', err.message);
  }

  // 10. Z-Test Statistical Significance & Winner Declaration
  try {
    const evalResult = await abTestingService.evaluateSignificance(experimentId);
    if (!evalResult.concluded) throw new Error('Experiment should be concluded given 13.6% vs 4.8% at N=1000');
    if (evalResult.winningVariantId !== variantBId) {
      throw new Error(`Expected Variant B to win, got ${evalResult.winningVariantId}`);
    }
    if (evalResult.confidenceScore < 95.0) {
      throw new Error(`Expected confidence >= 95%, got ${evalResult.confidenceScore}%`);
    }
    pass('Z-score evaluation computes statistical significance and declares winning variant', `(${evalResult.confidenceScore}% confidence)`);
  } catch (err) {
    fail('Statistical significance evaluation failed', err.message);
  }

  // 11. Automated Winning Variant Promotion
  try {
    const updatedPost = await db('posts').where({ id: testPostId }).first();
    if (updatedPost.status !== 'approved') {
      throw new Error(`Post status expected 'approved', got '${updatedPost.status}'`);
    }

    const winningVarRow = await db('ab_test_variants')
      .where({ experiment_id: experimentId, post_variant_id: variantBId })
      .first();

    if (!winningVarRow.is_winner) throw new Error('is_winner boolean flag was not set on winning variant');
    pass('Automatically promoted winning variant and updated master post status to approved');
  } catch (err) {
    fail('Winning variant auto-promotion check failed', err.message);
  }

  console.log('\n--- [TRACK 5: Zero-Residual Test Teardown] ---');

  // 12. Deprovision synthetic test entities
  try {
    await db('ab_test_variants').where({ experiment_id: experimentId }).del();
    await db('ab_test_experiments').where({ id: experimentId }).del();
    await db('post_variants').where({ post_id: testPostId }).del();
    await db('posts').where({ id: testPostId }).del();
    await db('brands').where({ id: testBrandId }).del();
    await db('tenants').where({ id: testTenantId }).del();
    pass('Safely deprovisioned synthetic A/B test experiments and fixtures without leaks');
  } catch (err) {
    fail('Teardown failed', err.message);
  }

  console.log('\n--- [TRACK 6: Permanent Production Meta Lock Invariant] ---');

  // 13. Meta Post Variant Invariant
  try {
    const variant = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();

    if (!variant) throw new Error('Production Meta post variant missing!');
    if (variant.status !== 'published') throw new Error(`Status was '${variant.status}', expected 'published'`);
    pass('Production Meta post variant (1405588742634526_122100337179498315) strictly locked in published status');
  } catch (err) {
    fail('Production Meta variant lock breached!', err.message);
  }

  // 14. Meta Publishing Job Invariant
  try {
    const job = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();

    if (!job) throw new Error('Production publishing job missing!');
    if (job.status !== 'published') throw new Error(`Status was '${job.status}', expected 'published'`);
    pass('Production publishing job (256cf21a-26cd-4032-a7b8-17261d8a81b1) strictly locked in published status');
  } catch (err) {
    fail('Production publishing job lock breached!', err.message);
  }

  console.log('\n========================================================================');
  console.log(`   STAGE 54 RESULT: ${passCount} / ${checkId} CHECKS PASSED (${Math.round((passCount / checkId) * 100)}%)`);
  console.log('========================================================================\n');

  await db.destroy();

  if (failCount > 0) {
    process.exit(1);
  }
}

runStage54Tests().catch(async (err) => {
  console.error('Stage 54 test suite fatal error:', err);
  try { await db.destroy(); } catch (_) {}
  process.exit(1);
});
