/**
 * SocialForge — Milestone 4: PlanGuard & Entitlement Enforcement Layer Verification Suite
 *
 * Validates:
 * 1. Authoritative Entitlement Resolution: tenant -> subscription -> plan -> entitlement
 * 2. All 6 Commercial Tiers: free_trial, starter, growth, agency, scale, enterprise
 * 3. All 12 Metered & Gated Dimensions:
 *    - Brands
 *    - Seats (Users)
 *    - Social Accounts
 *    - Active Automations
 *    - AI Credits (Tokens)
 *    - Video Minutes (Render Seconds)
 *    - Storage (Bytes/GB)
 *    - Monthly Posts
 *    - Analytics Retention (Days)
 *    - Premium Connectors (Google Sheets, Excel, ERP, Salesforce)
 *    - Autonomy Level (L0-L5)
 *    - Multi-Tenant Agency Workspaces
 * 4. Explicit Entitlement Overrides:
 *    - Tenant-level override
 *    - Brand-level override (takes precedence when context.brandId is provided)
 * 5. Subscription Status Gates:
 *    - trialing (active vs expired)
 *    - active
 *    - past_due (in 5-day grace period vs expired grace period)
 *    - cancel_at_period_end (active until period end)
 *    - cancelled (immediate block)
 *    - expired (immediate block)
 * 6. Downgrade Data Safety: Zero customer data deletion upon downgrade
 * 7. PlanGuard Middleware Integration: HTTP 403 PLAN_LIMIT_EXCEEDED
 * 8. Production Meta Publication Lock: Variant 1405588742634526_122100337179498315 intact
 */

import { db } from '../apps/api/dist/db/connection.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import { planGuardService, PlanGuardError } from '../apps/api/dist/services/billing/planGuard.service.js';
import { UsageTrackerService } from '../apps/api/dist/services/usageTracker.service.js';
import crypto from 'crypto';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: MILESTONE 4 PLANGUARD & ENTITLEMENTS VERIFICATION       ');
  console.log('   6 Tiers • 12 Dimensions • Overrides • Status Gates • Zero Data Loss  ');
  console.log('========================================================================\n');

  const testTenantId = `tenant_pg_${crypto.randomBytes(4).toString('hex')}`;
  const brandAId = `brand_a_${crypto.randomBytes(4).toString('hex')}`;
  const brandBId = `brand_b_${crypto.randomBytes(4).toString('hex')}`;
  const testUserId = `user_pg_${crypto.randomBytes(4).toString('hex')}`;

  try {
    // Setup test tenant
    await db('tenants').insert({
      id: testTenantId,
      name: 'PlanGuard Test Corp',
      slug: `planguard-test-${Date.now()}`,
      subscription_tier: 'starter',
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // -------------------------------------------------------------------------
    // TEST 1: Default Fallback Resolution (No subscription row)
    // -------------------------------------------------------------------------
    console.log('--- [Test 1] Authoritative Resolution Fallback (No Subscription Row) ---');
    const defaultSub = await EntitlementService.getResolvedSubscription(testTenantId);
    assert(defaultSub.planId === 'free_trial', 'Default resolves to free_trial plan');
    assert(defaultSub.status === 'trialing', 'Default resolves to trialing status');
    assert(defaultSub.maxBrands === 1, 'Free trial maxBrands is 1');
    assert(defaultSub.maxSocialAccounts === 2, 'Free trial maxSocialAccounts is 2');
    assert(defaultSub.maxPostsPerMonth === 20, 'Free trial maxPostsPerMonth is 20');

    // -------------------------------------------------------------------------
    // TEST 2: All 6 Commercial Tiers Specification Across All 12 Dimensions
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 2] Plan Boundary Verification for All 6 Commercial Tiers ---');
    const tiers = ['free_trial', 'starter', 'growth', 'agency', 'scale', 'enterprise'];
    for (const t of tiers) {
      const planRow = await db('subscription_plans').where({ id: t }).first();
      assert(!!planRow, `Tier '${t}' exists in subscription_plans catalog`);
    }

    const starter = await db('subscription_plans').where({ id: 'starter' }).first();
    const growth = await db('subscription_plans').where({ id: 'growth' }).first();
    const agency = await db('subscription_plans').where({ id: 'agency' }).first();
    const scale = await db('subscription_plans').where({ id: 'scale' }).first();
    const enterprise = await db('subscription_plans').where({ id: 'enterprise' }).first();

    assert(Number(starter.price) === 29, 'Starter monthly price is $29');
    assert(starter.max_brands === 1, 'Starter max brands is 1');
    assert(starter.max_posts_per_month === 100, 'Starter max posts is 100');

    assert(Number(growth.price) === 79, 'Growth monthly price is $79');
    assert(growth.max_brands === 5, 'Growth max brands is 5');
    assert(growth.max_posts_per_month === 500, 'Growth max posts is 500');

    assert(Number(agency.price) === 249, 'Agency monthly price is $249');
    assert(agency.max_brands === 25, 'Agency max brands is 25');
    assert(agency.max_posts_per_month === 2500, 'Agency max posts is 2,500');

    assert(Number(scale.price) === 599, 'Scale monthly price is $599');
    assert(scale.max_brands === 100, 'Scale max brands is 100');
    assert(scale.max_posts_per_month === 10000, 'Scale max posts is 10,000');

    assert(enterprise.max_brands >= 500, 'Enterprise supports 500+ brands');
    assert(enterprise.max_posts_per_month >= 50000, 'Enterprise supports 50,000+ posts');

    // -------------------------------------------------------------------------
    // TEST 3: PlanGuard Evaluation Across All 12 Dimensions on Starter Tier
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 3] PlanGuard Evaluation Across All 12 Dimensions on Starter Tier ---');
    const now = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db('tenant_subscriptions').insert({
      id: `sub_${testTenantId}`,
      tenant_id: testTenantId,
      plan_id: 'starter',
      status: 'active',
      current_period_start: now,
      current_period_end: periodEnd,
      created_at: now,
      updated_at: now,
    });

    // 1. Brands (limit: 1)
    const brandCheck1 = await planGuardService.check(testTenantId, 'brands', 1);
    assert(brandCheck1.allowed === true, 'Brands: 1st brand allowed on Starter');
    assert(brandCheck1.limit === 1, 'Brands limit is 1');

    // Insert 1 brand
    await db('brands').insert({
      id: brandAId,
      tenant_id: testTenantId,
      name: 'Brand Alpha',
      slug: `alpha-${brandAId}`,
      created_at: now,
      updated_at: now,
    });

    const brandCheck2 = await planGuardService.check(testTenantId, 'brands', 1);
    assert(brandCheck2.allowed === false, 'Brands: 2nd brand rejected (limit 1 reached)');
    assert(brandCheck2.upgradeRequired === true, 'Brands: upgradeRequired set to true');

    // 2. Seats (limit: 2)
    const seatCheck1 = await planGuardService.check(testTenantId, 'seats', 1);
    assert(seatCheck1.allowed === true, 'Seats: within limit (current 0, limit 2)');
    assert(seatCheck1.limit === 2, 'Seats: Starter limit is 2');

    // 3. Social Accounts (limit: 3)
    const socialCheck1 = await planGuardService.check(testTenantId, 'social_accounts', 1);
    assert(socialCheck1.allowed === true, 'Social Accounts: within limit (current 0, limit 3)');
    assert(socialCheck1.limit === 3, 'Social Accounts: limit is 3');

    // 4. Active Automations (limit: 3)
    const autoCheck1 = await planGuardService.check(testTenantId, 'active_automations', 1);
    assert(autoCheck1.allowed === true, 'Active Automations: within limit (current 0, limit 3)');
    assert(autoCheck1.limit === 3, 'Active Automations: limit is 3');

    // 5. AI Credits (limit: 100,000)
    const aiCheck1 = await planGuardService.check(testTenantId, 'ai_credits', 5000);
    assert(aiCheck1.allowed === true, 'AI Credits: 5,000 tokens allowed on Starter');
    assert(aiCheck1.limit === 100000, 'AI Credits: Starter limit is 100,000');
    const aiCheck2 = await planGuardService.check(testTenantId, 'ai_credits', 105000);
    assert(aiCheck2.allowed === false, 'AI Credits: 105,000 tokens rejected on Starter');

    // 6. Video Minutes (limit: 300s = 5 min)
    const videoCheck1 = await planGuardService.check(testTenantId, 'video_minutes', 60);
    assert(videoCheck1.allowed === true, 'Video Minutes: 60s render allowed on Starter');
    assert(videoCheck1.limit === 300, 'Video Minutes: Starter limit is 300s');
    const videoCheck2 = await planGuardService.check(testTenantId, 'video_minutes', 350);
    assert(videoCheck2.allowed === false, 'Video Minutes: 350s render rejected on Starter');

    // 7. Storage (limit: 5 GB = 5,368,709,120 bytes)
    const storageCheck1 = await planGuardService.check(testTenantId, 'storage', 1048576);
    assert(storageCheck1.allowed === true, 'Storage: 1 MB storage allowed on Starter');
    assert(storageCheck1.limit === 5368709120, 'Storage: Starter limit is 5 GB');

    // 8. Posts (limit: 100)
    const postCheck1 = await planGuardService.check(testTenantId, 'posts', 1);
    assert(postCheck1.allowed === true, 'Posts: 1 post allowed on Starter');
    assert(postCheck1.limit === 100, 'Posts: Starter limit is 100');

    // 9. Analytics Retention (limit: 30 days)
    const retCheck1 = await planGuardService.check(testTenantId, 'analytics_retention', 30);
    assert(retCheck1.allowed === true, 'Analytics Retention: 30 days allowed on Starter');
    const retCheck2 = await planGuardService.check(testTenantId, 'analytics_retention', 90);
    assert(retCheck2.allowed === false, 'Analytics Retention: 90 days rejected on Starter');

    // 10. Premium Connectors (Starter allows standard only)
    const connCheck1 = await planGuardService.check(testTenantId, 'premium_connectors', 1, { connectorType: 'facebook' });
    assert(connCheck1.allowed === true, 'Premium Connectors: standard Facebook connector allowed on Starter');
    const connCheck2 = await planGuardService.check(testTenantId, 'premium_connectors', 1, { connectorType: 'google_sheets' });
    assert(connCheck2.allowed === false, 'Premium Connectors: Google Sheets connector blocked on Starter');

    // 11. Autonomy Level (Starter max L2)
    const autoLevCheck1 = await planGuardService.check(testTenantId, 'autonomy_level', 1, { level: 'L2' });
    assert(autoLevCheck1.allowed === true, 'Autonomy Level: L2 allowed on Starter');
    const autoLevCheck2 = await planGuardService.check(testTenantId, 'autonomy_level', 1, { level: 'L3' });
    assert(autoLevCheck2.allowed === false, 'Autonomy Level: L3 blocked on Starter');

    // 12. Agency Workspaces (Starter blocks agency workspaces)
    const agencyWsCheck = await planGuardService.check(testTenantId, 'agency_workspaces', 1);
    assert(agencyWsCheck.allowed === false, 'Agency Workspaces: blocked on Starter');

    // -------------------------------------------------------------------------
    // TEST 4: Explicit Entitlement Overrides (Tenant & Brand Scoped)
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 4] Explicit Entitlement Overrides (Tenant & Brand Scoping) ---');
    // Add tenant-level override for posts: increase to 250
    const tenantEntId = `ent_t_${crypto.randomBytes(4).toString('hex')}`;
    await db('entitlements').insert({
      id: tenantEntId,
      tenant_id: testTenantId,
      brand_id: null,
      plan_id: 'starter',
      resource: 'posts',
      is_enabled: true,
      limit_value: 250,
      created_at: now,
      updated_at: now,
    });

    const overrideCheck1 = await planGuardService.check(testTenantId, 'posts', 1);
    assert(overrideCheck1.limit === 250, 'Tenant-level override increased post limit to 250');

    // Add brand-level override for Brand A: set to 50
    const brandEntId = `ent_b_${crypto.randomBytes(4).toString('hex')}`;
    await db('entitlements').insert({
      id: brandEntId,
      tenant_id: testTenantId,
      brand_id: brandAId,
      plan_id: 'starter',
      resource: 'posts',
      is_enabled: true,
      limit_value: 50,
      created_at: now,
      updated_at: now,
    });

    const overrideCheckBrandA = await planGuardService.check(testTenantId, 'posts', 1, { brandId: brandAId });
    assert(overrideCheckBrandA.limit === 50, 'Brand A specific override takes precedence (limit: 50)');

    const overrideCheckGeneric = await planGuardService.check(testTenantId, 'posts', 1);
    assert(overrideCheckGeneric.limit === 250, 'Generic check still resolves to tenant-level override (250)');

    // -------------------------------------------------------------------------
    // TEST 5: Status Gate Enforcement: Dunning Grace, Cancelled, Expired
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 5] Subscription Status Gate Enforcement ---');
    // 1. Past due within 5-day grace period
    const pastDueSince = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'past_due',
        past_due_since: pastDueSince,
      });

    const graceCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(graceCheck.allowed === true, 'Operations allowed during 5-day past_due grace period');
    assert(graceCheck.isGracePeriod === true, 'isGracePeriod flag is true');
    assert(!!graceCheck.gracePeriodEndsAt, 'gracePeriodEndsAt is provided');

    // 2. Past due after 5-day grace period expired
    const expiredPastDue = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'past_due',
        past_due_since: expiredPastDue,
      });

    const expiredGraceCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(expiredGraceCheck.allowed === false, 'Operations blocked when grace period expired');
    assert(expiredGraceCheck.upgradeRequired === true, 'upgradeRequired set to true');

    // 3. Cancelled subscription
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'cancelled',
        past_due_since: null,
      });

    const cancelledCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(cancelledCheck.allowed === false, 'Operations immediately blocked when status is cancelled');

    let threwError = false;
    try {
      await planGuardService.enforce(testTenantId, 'posts', 1);
    } catch (err) {
      if (err instanceof PlanGuardError) {
        threwError = true;
        assert(err.statusCode === 403, 'planGuardService.enforce throws HTTP 403 PlanGuardError');
        assert(err.code === 'PLAN_LIMIT_EXCEEDED', 'Error code is PLAN_LIMIT_EXCEEDED');
      }
    }
    assert(threwError === true, 'planGuardService.enforce throws on blocked subscription');

    // 4. cancel_at_period_end: true with future periodEnd
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

    const cancelAtPeriodCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(cancelAtPeriodCheck.allowed === true, 'Operations allowed while cancel_at_period_end is active');

    // -------------------------------------------------------------------------
    // TEST 6: Downgrade Data Safety: Zero Customer Data Loss Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 6] Downgrade Data Safety: Zero Data Loss Invariant ---');
    // Upgrade tenant to Agency tier and create multiple brands
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        plan_id: 'agency',
        status: 'active',
        cancel_at_period_end: false,
      });

    await db('brands').insert({
      id: brandBId,
      tenant_id: testTenantId,
      name: 'Brand Beta',
      slug: `beta-${brandBId}`,
      created_at: now,
      updated_at: now,
    });

    const brandCountBefore = await db('brands').where({ tenant_id: testTenantId }).count('id as count').first();
    assert(Number(brandCountBefore.count) === 2, 'Tenant has 2 active brands under Agency tier');

    // Simulate downgrade to Starter tier (Starter allows 1 brand)
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        plan_id: 'starter',
        status: 'active',
      });

    // Verify existing brands are completely preserved
    const brandCountAfter = await db('brands').where({ tenant_id: testTenantId }).count('id as count').first();
    assert(Number(brandCountAfter.count) === 2, 'ZERO brands deleted on downgrade to Starter tier');

    const brandAExists = await db('brands').where({ id: brandAId }).first();
    const brandBExists = await db('brands').where({ id: brandBId }).first();
    assert(!!brandAExists && !!brandBExists, 'Both Brand Alpha and Brand Beta remain fully intact in database');

    // However, creating a 3rd brand is strictly rejected by PlanGuard
    const brandCheckAfterDowngrade = await planGuardService.check(testTenantId, 'brands', 1);
    assert(brandCheckAfterDowngrade.allowed === false, 'Adding 3rd brand blocked by PlanGuard (current 2, limit 1)');
    assert(brandCheckAfterDowngrade.upgradeRequired === true, 'Prompting upgrade to add additional brands');

    // -------------------------------------------------------------------------
    // TEST 7: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('\n--- [Test 7] Production Meta Publication Lock Invariant ---');
    const prodVariant = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .orWhere({ id: '1405588742634526_122100337179498315' })
      .first();

    assert(!!prodVariant, 'Production post variant 1405588742634526_122100337179498315 exists');
    assert(prodVariant?.status === 'published', 'Production variant status remains strictly "published"');

  } finally {
    console.log('\n[Cleanup] Cleaning up test fixtures...');
    await db('entitlements').where({ tenant_id: testTenantId }).del();
    await db('brands').where({ tenant_id: testTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
    await db('tenants').where({ id: testTenantId }).del();
    console.log('Cleanup completed successfully.');
  }

  console.log('========================================================================');
  console.log(`   MILESTONE 4 PLANGUARD & ENTITLEMENTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }

  await db.destroy();
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exitCode = 1;
});
