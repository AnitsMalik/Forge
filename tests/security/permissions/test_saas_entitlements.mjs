import { EntitlementService } from '../../../apps/api/dist/services/entitlement.service.js';
import { db } from '../../../apps/api/dist/db/connection.js';
import crypto from 'crypto';

const TEST_PREFIX = 'test_entitlements_';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function run() {
  console.log('=====================================================');
  console.log('SOCIALFORGE STAGE 4 — ENTITLEMENT ENGINE TEST SUITE');
  console.log('Testing: 9 Methods, 6 Subscription States, Resolution');
  console.log('=====================================================\n');

  const testTenantId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();

  try {
    // 1. Setup isolated test tenant and user
    await db('tenants').insert({
      id: testTenantId,
      name: 'Entitlement Test Tenant Corp',
      slug: `entitlement-test-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: testUserId,
      email: `entitlement_${Date.now()}@test.com`,
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      full_name: 'Entitlement Tester',
      is_superadmin: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      user_id: testUserId,
      role: 'owner',
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('--- 1. Testing Default Resolution Fallback (No Subscription Row) ---');
    const fallbackSub = await EntitlementService.getResolvedSubscription(testTenantId);
    assert(fallbackSub.planId === 'free_trial', 'Default resolves to free_trial plan');
    assert(fallbackSub.status === 'trialing', 'Default status resolves to trialing');

    const defaultBrand = await EntitlementService.canCreateBrand(testTenantId);
    assert(defaultBrand.allowed === true, 'Brand creation allowed under default trial');
    assert(defaultBrand.current === 0, 'Current brands is 0');
    assert(defaultBrand.limit === 1, 'Free trial brand limit is 1');
    assert(defaultBrand.remaining === 1, 'Remaining brands is 1');

    console.log('\n--- 2. Testing All 6 Subscription States ---');
    const states = [
      { status: 'trialing', shouldAllow: true },
      { status: 'active', shouldAllow: true },
      { status: 'past_due', shouldAllow: false },
      { status: 'paused', shouldAllow: false },
      { status: 'cancelled', shouldAllow: false },
      { status: 'expired', shouldAllow: false },
    ];

    const subId = crypto.randomUUID();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Seed a starter subscription
    await db('tenant_subscriptions').insert({
      id: subId,
      tenant_id: testTenantId,
      plan_id: 'starter',
      status: 'active',
      provider: 'system',
      current_period_start: new Date(),
      current_period_end: futureDate,
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    for (const item of states) {
      await db('tenant_subscriptions')
        .where({ id: subId })
        .update({
          status: item.status,
          current_period_end: futureDate,
          trial_end_at: item.status === 'trialing' ? futureDate : null,
          updated_at: new Date(),
        });

      const brandCheck = await EntitlementService.canCreateBrand(testTenantId);
      const publishCheck = await EntitlementService.canPublish(testTenantId, 1);
      const aiCheck = await EntitlementService.canUseAI(testTenantId, 100);

      assert(
        brandCheck.status === item.status,
        `Status '${item.status}': resolved status matches`
      );
      assert(
        brandCheck.allowed === item.shouldAllow,
        `Status '${item.status}': canCreateBrand allowed is ${item.shouldAllow}`
      );
      assert(
        publishCheck.allowed === item.shouldAllow,
        `Status '${item.status}': canPublish allowed is ${item.shouldAllow}`
      );
      assert(
        aiCheck.allowed === item.shouldAllow,
        `Status '${item.status}': canUseAI allowed is ${item.shouldAllow}`
      );

      if (!item.shouldAllow) {
        assert(brandCheck.remaining === 0, `Status '${item.status}': remaining is 0 when blocked`);
        assert(typeof brandCheck.reason === 'string', `Status '${item.status}': provides reason for rejection`);
      }
    }

    console.log('\n--- 3. Testing Period Expiration Auto-Detection ---');
    // Active subscription with current_period_end in the past
    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({
        status: 'active',
        current_period_end: pastDate,
        updated_at: new Date(),
      });

    const expiredCheck = await EntitlementService.canCreateBrand(testTenantId);
    assert(expiredCheck.status === 'expired', 'Past period_end automatically resolves to expired');
    assert(expiredCheck.allowed === false, 'Expired active subscription blocks operations');
    assert(expiredCheck.remaining === 0, 'Remaining is 0 on expired period');

    // Trialing subscription with trial_end_at in the past
    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({
        status: 'trialing',
        current_period_end: futureDate,
        trial_end_at: pastDate,
        updated_at: new Date(),
      });

    const trialExpiredCheck = await EntitlementService.canCreateBrand(testTenantId);
    assert(trialExpiredCheck.status === 'expired', 'Past trial_end_at automatically resolves to expired');
    assert(trialExpiredCheck.allowed === false, 'Expired trial subscription blocks operations');

    // Reset subscription to active starter for method testing
    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({
        status: 'active',
        current_period_end: futureDate,
        trial_end_at: null,
        updated_at: new Date(),
      });

    console.log('\n--- 4. Testing All 9 Entitlement Methods & Limit Thresholds ---');

    // 1. canCreateBrand (Starter allows 1 brand)
    console.log('Testing Method 1: canCreateBrand()');
    const brand1 = await EntitlementService.canCreateBrand(testTenantId);
    assert(brand1.allowed === true, 'canCreateBrand allows 1st brand');
    assert(brand1.current === 0, 'Current brands = 0');
    assert(brand1.limit === 1, 'Starter brand limit = 1');
    assert(brand1.remaining === 1, 'Remaining brands = 1');

    // Insert 1 brand for tenant
    const brandId1 = crypto.randomUUID();
    await db('brands').insert([
      { id: brandId1, tenant_id: testTenantId, name: 'Brand Alpha', slug: `brand-alpha-${Date.now()}` },
    ]);

    const brand2 = await EntitlementService.canCreateBrand(testTenantId);
    assert(brand2.allowed === false, 'canCreateBrand blocks 2nd brand (limit 1 reached)');
    assert(brand2.current === 1, 'Current brands = 1');
    assert(brand2.limit === 1, 'Limit = 1');
    assert(brand2.remaining === 0, 'Remaining = 0');
    assert(brand2.reason.includes('limit has been reached'), 'Brand limit reason provided');

    // 2. canConnectSocialAccount (Starter allows 3 accounts)
    console.log('Testing Method 2: canConnectSocialAccount()');
    const acc1 = await EntitlementService.canConnectSocialAccount(testTenantId);
    assert(acc1.allowed === true, 'canConnectSocialAccount allowed initially');
    assert(acc1.limit === 3, 'Starter max_social_accounts = 3');

    // Insert 3 social accounts
    const accRows = [];
    for (let i = 0; i < 3; i++) {
      accRows.push({
        id: crypto.randomUUID(),
        tenant_id: testTenantId,
        brand_id: brandId1,
        platform: 'facebook',
        account_name: `Test Acc ${i}`,
        account_id: `acc_test_${i}_${Date.now()}`,
        access_token_encrypted: 'dummy_enc',
        token_expires_at: futureDate,
        is_active: true,
        metadata: JSON.stringify({}),
      });
    }
    await db('social_accounts').insert(accRows);

    const accBlocked = await EntitlementService.canConnectSocialAccount(testTenantId);
    assert(accBlocked.allowed === false, 'canConnectSocialAccount blocked when 3/3 accounts connected');
    assert(accBlocked.current === 3, 'Current social accounts = 3');
    assert(accBlocked.remaining === 0, 'Remaining social accounts = 0');

    // 3. canCreateUser (Starter allows 2 users)
    console.log('Testing Method 3: canCreateUser()');
    const userCheck1 = await EntitlementService.canCreateUser(testTenantId);
    assert(userCheck1.allowed === true, 'canCreateUser allowed for 2nd user (current 1)');
    assert(userCheck1.current === 1, 'Current user count = 1');
    assert(userCheck1.limit === 2, 'Starter maxUsers = 2');
    assert(userCheck1.remaining === 1, 'Remaining users = 1');

    // Add 2nd user to tenant_users
    const testUser2 = crypto.randomUUID();
    await db('users').insert({
      id: testUser2,
      email: `entitlement_2_${Date.now()}@test.com`,
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      full_name: 'Entitlement Tester 2',
      is_superadmin: false,
    });
    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      user_id: testUser2,
      role: 'creator',
    });

    const userCheck2 = await EntitlementService.canCreateUser(testTenantId);
    assert(userCheck2.allowed === false, 'canCreateUser blocks 3rd user on Starter plan');
    assert(userCheck2.current === 2, 'Current user count = 2');
    assert(userCheck2.remaining === 0, 'Remaining users = 0');

    // 4. canPublish (Starter allows 100 posts/month)
    console.log('Testing Method 4: canPublish()');
    const pubCheck1 = await EntitlementService.canPublish(testTenantId, 1);
    assert(pubCheck1.allowed === true, 'canPublish allowed initially');
    assert(pubCheck1.limit === 100, 'Starter post limit = 100');

    // Simulate usage counter at 100
    const currentMonth = new Date().toISOString().slice(0, 7);
    await db('tenant_usage_counters').insert({
      tenant_id: testTenantId,
      period_month: currentMonth,
      posts_created: 100,
      video_render_seconds: 0,
      ai_tokens_consumed: 0,
      storage_bytes_used: 0,
    });

    const pubCheckBlocked = await EntitlementService.canPublish(testTenantId, 1);
    assert(pubCheckBlocked.allowed === false, 'canPublish blocked when 100/100 posts used');
    assert(pubCheckBlocked.current === 100, 'Current posts = 100');
    assert(pubCheckBlocked.remaining === 0, 'Remaining posts = 0');

    // 5. canSchedule (uses publication quotas)
    console.log('Testing Method 5: canSchedule()');
    const schedCheckBlocked = await EntitlementService.canSchedule(testTenantId, 1);
    assert(schedCheckBlocked.allowed === false, 'canSchedule blocked when monthly quota exhausted');
    assert(schedCheckBlocked.remaining === 0, 'canSchedule remaining = 0');

    // 6. canRenderVideo (Starter has ffmpeg_video: true, limit: 300s)
    console.log('Testing Method 6: canRenderVideo()');
    const vidCheck1 = await EntitlementService.canRenderVideo(testTenantId, 60);
    assert(vidCheck1.allowed === true, 'canRenderVideo allowed 60s render');
    assert(vidCheck1.limit === 300, 'Starter videoRenderSecondsMonthly = 300');
    assert(vidCheck1.remaining === 300, 'Remaining render seconds = 300');

    // Consume 280 seconds
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: currentMonth })
      .update({ video_render_seconds: 280 });

    const vidCheck2 = await EntitlementService.canRenderVideo(testTenantId, 30);
    assert(vidCheck2.allowed === false, 'canRenderVideo blocks 30s when only 20s remaining');
    assert(vidCheck2.current === 280, 'Current video render seconds = 280');
    assert(vidCheck2.remaining === 20, 'Remaining video render seconds = 20');

    // 7. canUseAI (Starter has aiTokensMonthly: 100,000)
    console.log('Testing Method 7: canUseAI()');
    const aiCheck1 = await EntitlementService.canUseAI(testTenantId, 5000);
    assert(aiCheck1.allowed === true, 'canUseAI allows 5000 tokens');
    assert(aiCheck1.limit === 100000, 'Starter aiTokensMonthly = 100,000');

    // Consume 98,000 tokens
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: currentMonth })
      .update({ ai_tokens_consumed: 98000 });

    const aiCheck2 = await EntitlementService.canUseAI(testTenantId, 3000);
    assert(aiCheck2.allowed === false, 'canUseAI blocks when request (3000) exceeds remaining (2000)');
    assert(aiCheck2.current === 98000, 'Current ai tokens consumed = 98,000');
    assert(aiCheck2.remaining === 2000, 'Remaining ai tokens = 2000');

    // 8. canUseAdvancedAnalytics (Starter excludes advanced_analytics, Growth includes it)
    console.log('Testing Method 8: canUseAdvancedAnalytics()');
    const analyticsStarter = await EntitlementService.canUseAdvancedAnalytics(testTenantId);
    assert(analyticsStarter.allowed === false, 'Starter plan excludes advanced_analytics');
    assert(analyticsStarter.limit === 0, 'Starter limit = 0');
    assert(analyticsStarter.remaining === 0, 'Starter remaining = 0');

    // Switch subscription plan to growth (which includes advanced_analytics)
    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({ plan_id: 'growth' });

    const analyticsGrowth = await EntitlementService.canUseAdvancedAnalytics(testTenantId);
    assert(analyticsGrowth.allowed === true, 'growth plan includes advanced_analytics');
    assert(analyticsGrowth.limit === 1, 'growth limit is 1');
    assert(analyticsGrowth.remaining === 1, 'growth remaining is 1');

    // 9. canUseAds (Standard plans do not include ads_management)
    console.log('Testing Method 9: canUseAds()');
    const adsFree = await EntitlementService.canUseAds(testTenantId);
    assert(adsFree.allowed === false, 'free_trial plan blocks ads');
    assert(adsFree.limit === 0, 'limit is 0 for unentitled feature');
    assert(adsFree.remaining === 0, 'remaining is 0 for unentitled feature');
    assert(adsFree.reason.includes('not included'), 'Provides contact sales / upgrade reason');

    // Upgrade plan to a custom plan with ads_management: true
    await db('subscription_plans').insert({
      id: 'enterprise_ads_test',
      name: 'Enterprise Ads Suite',
      slug: `enterprise-ads-${Date.now()}`,
      price: 999.00,
      currency: 'usd',
      billing_interval: 'month',
      max_brands: 100,
      max_social_accounts: 500,
      max_posts_per_month: 50000,
      max_users: 100,
      ai_tokens_monthly: 10000000,
      video_render_seconds_monthly: 36000,
      storage_bytes_limit: 1073741824000,
      features: JSON.stringify({ ads_management: true, ffmpeg_video: true, ai_brain: true, advanced_analytics: true }),
      is_active: true,
    });

    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({ plan_id: 'enterprise_ads_test' });

    const adsEnterprise = await EntitlementService.canUseAds(testTenantId);
    assert(adsEnterprise.allowed === true, 'Enterprise plan with ads_management entitlement allows ads');
    assert(adsEnterprise.limit === 1, 'Limit is 1 when entitled');
    assert(adsEnterprise.remaining === 1, 'Remaining is 1 when entitled');

    console.log('\n--- 5. Testing Comprehensive Tenant Snapshot (getTenantEntitlements) ---');
    const snapshot = await EntitlementService.getTenantEntitlements(testTenantId);
    assert(snapshot.subscription.planId === 'enterprise_ads_test', 'Snapshot contains correct planId');
    assert(snapshot.subscription.status === 'active', 'Snapshot contains active status');
    assert(typeof snapshot.entitlements.canCreateBrand.allowed === 'boolean', 'canCreateBrand present in snapshot');
    assert(typeof snapshot.entitlements.canConnectSocialAccount.allowed === 'boolean', 'canConnectSocialAccount present');
    assert(typeof snapshot.entitlements.canCreateUser.allowed === 'boolean', 'canCreateUser present');
    assert(typeof snapshot.entitlements.canPublish.allowed === 'boolean', 'canPublish present');
    assert(typeof snapshot.entitlements.canSchedule.allowed === 'boolean', 'canSchedule present');
    assert(typeof snapshot.entitlements.canRenderVideo.allowed === 'boolean', 'canRenderVideo present');
    assert(typeof snapshot.entitlements.canUseAI.allowed === 'boolean', 'canUseAI present');
    assert(typeof snapshot.entitlements.canUseAdvancedAnalytics.allowed === 'boolean', 'canUseAdvancedAnalytics present');
    assert(typeof snapshot.entitlements.canUseAds.allowed === 'boolean', 'canUseAds present');

    console.log('\n--- 6. Clean Up Test Data ---');
    await db('social_accounts').where({ tenant_id: testTenantId }).del();
    await db('brands').where({ tenant_id: testTenantId }).del();
    await db('tenant_usage_counters').where({ tenant_id: testTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
    await db('tenant_users').where({ tenant_id: testTenantId }).del();
    await db('users').where({ id: testUserId }).del();
    await db('users').where({ id: testUser2 }).del();
    await db('subscription_plans').where({ id: 'enterprise_ads_test' }).del();
    await db('tenants').where({ id: testTenantId }).del();
    console.log('✓ Cleaned up all test entities');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log('\n=====================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
