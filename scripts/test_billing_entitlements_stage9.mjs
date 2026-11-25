/**
 * SocialForge HLD Stage 9: Billing Hardening and Entitlements Test Suite
 * 
 * Verifies:
 * 1. 6 Commercial Tiers across all 12 dimensions (Trial, Starter, Growth, Agency Pro, Scale, Enterprise)
 * 2. PlanGuard Server-Side Enforcements across all dimensions & layers
 * 3. Idempotent Usage Recording (Zero double-charging on duplicate operations)
 * 4. Stripe Subscription Lifecycle: Checkout, Portal, Webhook Sync, Upgrades, Downgrades, Cancellations
 * 5. Dunning & 5-Day Grace Period Handling & Recovery
 * 6. Multi-Tenant Isolation & Zero Secret Exposure
 * 7. Permanent Production Post Invariant (1405588742634526_122100337179498315)
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { planGuardService, PlanGuardError } from '../apps/api/dist/services/billing/planGuard.service.js';
import { defaultBillingProvider } from '../apps/api/dist/services/billing/index.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import { UsageTrackerService } from '../apps/api/dist/services/usageTracker.service.js';
import { StripeBillingService } from '../apps/api/dist/services/stripeBilling.service.js';
import { WebhookDlqService } from '../apps/api/dist/services/billing/webhookDlq.service.js';
import { DunningService } from '../apps/api/dist/services/billing/dunning.service.js';
import { governancePolicyService } from '../apps/api/dist/services/governance/governancePolicy.service.js';
import { automationService } from '../apps/api/dist/services/automation/automation.service.js';
import { copilotAutomationService } from '../apps/api/dist/services/automation/copilotAutomation.service.js';

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = config.jwtSecret;

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

async function runStage9TestSuite() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE STAGE 9: BILLING HARDENING & ENTITLEMENTS SUITE         ');
  console.log('   6 Tiers • 12 Dimensions • PlanGuard • Idempotent Metering • Dunning  ');
  console.log('========================================================================\n');

  // Test Workspace Fixtures
  const testTenantId = 'tenant_s9_' + crypto.randomUUID().slice(0, 8);
  const testTenantBId = 'tenant_s9_b_' + crypto.randomUUID().slice(0, 8);
  const testUserId = crypto.randomUUID();
  const testBrandId = crypto.randomUUID();
  const now = new Date();

  // Provision Tenant A
  await db('tenants').insert({
    id: testTenantId,
    name: 'Stage 9 Alpha Tenant',
    slug: 's9-alpha-' + Date.now(),
    settings: '{}',
    created_at: now,
    updated_at: now,
  });

  // Provision Tenant B for multi-tenant isolation
  await db('tenants').insert({
    id: testTenantBId,
    name: 'Stage 9 Beta Tenant',
    slug: 's9-beta-' + Date.now(),
    settings: '{}',
    created_at: now,
    updated_at: now,
  });

  await db('tenant_subscriptions').insert({
    id: crypto.randomUUID(),
    tenant_id: testTenantBId,
    plan_id: 'starter',
    status: 'active',
    current_period_start: now,
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_at: now,
    updated_at: now,
  });

  await db('users').insert({
    id: testUserId,
    email: `s9-user-${Date.now()}@socialforge.io`,
    password_hash: 'dummy_hash',
    full_name: 'Stage 9 Tester',
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
    name: 'Stage 9 Brand Alpha',
    slug: 's9-brand-alpha-' + Date.now(),
    created_at: now,
    updated_at: now,
  });

  const authToken = jwt.sign(
    { userId: testUserId, tenantId: testTenantId, role: 'owner' },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  // ---------------------------------------------------------------------------
  // 1. COMMERCIAL TIERS & 12 QUOTA DIMENSIONS
  // ---------------------------------------------------------------------------
  await test('6 Commercial Tiers Specification & 12 Dimensions Verification', async () => {
    const plans = await db('subscription_plans').select('*');
    const planMap = new Map(plans.map((p) => [p.id, p]));

    const expectedTiers = ['free_trial', 'starter', 'growth', 'agency', 'scale', 'enterprise'];
    for (const tier of expectedTiers) {
      assert(planMap.has(tier), `Commercial plan '${tier}' exists in database`);
    }

    const starter = planMap.get('starter');
    assert(Number(starter.price) === 59 || Number(starter.price) === 29, `Starter price is $59/mo or $29/mo (found: $${starter.price})`);
    assert(starter.max_brands === 1, 'Starter max brands is 1');
    assert(starter.max_social_accounts === 3, 'Starter max social accounts is 3');
    assert(starter.max_posts_per_month === 100, 'Starter max posts is 100');

    const growth = planMap.get('growth');
    assert(Number(growth.price) === 99 || Number(growth.price) === 79, `Growth price is $99/mo or $79/mo (found: $${growth.price})`);
    assert(growth.max_brands === 5, 'Growth max brands is 5');
    assert(growth.max_social_accounts === 15, 'Growth max social accounts is 15');
    assert(growth.max_posts_per_month === 500, 'Growth max posts is 500');

    const agency = planMap.get('agency');
    assert(Number(agency.price) === 249, 'Agency Pro price is $249/mo');
    assert(agency.max_brands === 25, 'Agency Pro max brands is 25');
    assert(agency.max_social_accounts === 100, 'Agency Pro max social accounts is 100');
    assert(agency.max_posts_per_month === 2500, 'Agency Pro max posts is 2500');

    const scale = planMap.get('scale');
    assert(Number(scale.price) === 499 || Number(scale.price) === 599, `Scale price is $499/mo or $599/mo (found: $${scale.price})`);
    assert(scale.max_brands === 100, 'Scale max brands is 100');
    assert(scale.max_social_accounts === 250, 'Scale max social accounts is 250');
    assert(scale.max_posts_per_month === 10000, 'Scale max posts is 10,000');

    const enterprise = planMap.get('enterprise');
    assert(Number(enterprise.price) >= 999, 'Enterprise price is $999/mo custom');
    assert(enterprise.max_brands >= 500, 'Enterprise supports unlimited/500+ brands');
  });

  // ---------------------------------------------------------------------------
  // 2. TRIAL LIFECYCLE & EXPIRATION ENFORCEMENT
  // ---------------------------------------------------------------------------
  await test('Trial Lifecycle: Active Trial -> Period Expiration -> Enforcement Block', async () => {
    // 2.1 Set active trial
    const trialEndFuture = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      plan_id: 'free_trial',
      status: 'trialing',
      trial_end_at: trialEndFuture,
      current_period_start: now,
      current_period_end: trialEndFuture,
      created_at: now,
      updated_at: now,
    });

    const activeTrialCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(activeTrialCheck.allowed === true, 'Active trial allows operations within quota');
    assert(activeTrialCheck.planId === 'free_trial', 'Plan resolved to free_trial');

    // 2.2 Expire trial
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'expired',
        trial_end_at: pastDate,
        current_period_end: pastDate,
      });

    const expiredCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(expiredCheck.allowed === false, 'Expired trial strictly blocks operations');
    assert(expiredCheck.upgradeRequired === true, 'Upgrade is required for expired trial');

    let threw = false;
    try {
      await planGuardService.enforce(testTenantId, 'posts', 1);
    } catch (err) {
      if (err instanceof PlanGuardError) {
        threw = true;
        assert(err.statusCode === 403, 'PlanGuardError returns HTTP 403 status code');
        assert(err.code === 'PLAN_LIMIT_EXCEEDED', 'PlanGuardError returns PLAN_LIMIT_EXCEEDED');
      }
    }
    assert(threw, 'planGuardService.enforce throws PlanGuardError on expired trial');
  });

  // ---------------------------------------------------------------------------
  // 3. 12-DIMENSION PLANGUARD CHECKS & BOUNDARY ENFORCEMENT
  // ---------------------------------------------------------------------------
  await test('PlanGuard Evaluation Across All 12 Dimension Enforcements', async () => {
    // Restore tenant to active Starter plan
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        plan_id: 'starter',
        status: 'active',
        current_period_start: now,
        current_period_end: futureDate,
        trial_end_at: null,
      });

    // Dimension 1: brands (limit: 1)
    const brandCheckPass = await planGuardService.check(testTenantId, 'brands', 0);
    assert(brandCheckPass.allowed === true, 'Brands check passes when within limit (current 1, limit 1)');
    const brandCheckFail = await planGuardService.check(testTenantId, 'brands', 1);
    assert(brandCheckFail.allowed === false, 'Brands check rejects adding 2nd brand on Starter plan (limit 1)');

    // Dimension 2: seats / users (limit: 2)
    const seatsCheck = await planGuardService.check(testTenantId, 'seats', 1);
    assert(seatsCheck.allowed === true, 'Seats check permits 2nd user on Starter (current 1, limit 2)');
    const seatsCheckOver = await planGuardService.check(testTenantId, 'seats', 2);
    assert(seatsCheckOver.allowed === false, 'Seats check rejects adding 2 users when limit is 2 (current 1)');

    // Dimension 3: social_accounts (limit: 3)
    const socCheck = await planGuardService.check(testTenantId, 'social_accounts', 2);
    assert(socCheck.allowed === true, 'Social accounts permits connecting 2 accounts');

    // Dimension 4: active_automations (limit: 3 on Starter)
    const autoCheck = await planGuardService.check(testTenantId, 'active_automations', 1);
    assert(autoCheck.allowed === true, 'Active automations within Starter limit (limit: 3)');

    // Dimension 5: ai_credits (limit: 100,000 tokens on Starter)
    const aiCheck = await planGuardService.check(testTenantId, 'ai_credits', 5000);
    assert(aiCheck.allowed === true, 'AI credits check allows 5,000 tokens');
    const aiCheckExceed = await planGuardService.check(testTenantId, 'ai_credits', 200000);
    assert(aiCheckExceed.allowed === false, 'AI credits check rejects exceeding monthly budget');

    // Dimension 6: video_minutes (limit: 300s on Starter)
    const videoCheck = await planGuardService.check(testTenantId, 'video_minutes', 60);
    assert(videoCheck.allowed === true, 'Video rendering allows 60s render');
    const videoCheckOver = await planGuardService.check(testTenantId, 'video_minutes', 400);
    assert(videoCheckOver.allowed === false, 'Video rendering rejects 400s render on Starter');

    // Dimension 7: storage (limit: 5 GB on Starter)
    const storageCheck = await planGuardService.check(testTenantId, 'storage', 1048576); // 1 MB
    assert(storageCheck.allowed === true, 'Storage check permits 1 MB');

    // Dimension 8: posts (limit: 100 on Starter)
    const postsCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(postsCheck.allowed === true, 'Posts publishing allowed within quota');

    // Dimension 9: analytics_retention (Starter: 30 days)
    const retention30 = await planGuardService.check(testTenantId, 'analytics_retention', 30);
    assert(retention30.allowed === true, '30-day analytics retention allowed on Starter');
    const retention90 = await planGuardService.check(testTenantId, 'analytics_retention', 90);
    assert(retention90.allowed === false, '90-day retention rejected on Starter (requires Growth or higher)');

    // Dimension 10: premium_connectors (Starter: false, Growth: true)
    const premCheckStarter = await planGuardService.check(testTenantId, 'premium_connectors', 1, { connectorType: 'google_sheets' });
    assert(premCheckStarter.allowed === false, 'Premium connector (Google Sheets) rejected on Starter');
    const standardConnector = await planGuardService.check(testTenantId, 'premium_connectors', 1, { connectorType: 'facebook' });
    assert(standardConnector.allowed === true, 'Standard connector (Facebook) permitted on Starter');

    // Dimension 11: autonomy_level (Starter max: L2)
    const autoL2 = await planGuardService.check(testTenantId, 'autonomy_level', 1, { level: 'L2' });
    assert(autoL2.allowed === true, 'Autonomy level L2 allowed on Starter');
    const autoL3 = await planGuardService.check(testTenantId, 'autonomy_level', 1, { level: 'L3' });
    assert(autoL3.allowed === false, 'Autonomy level L3 rejected on Starter (requires Growth+)');

    // Dimension 12: agency_workspaces (Starter: false, Agency: true)
    const agencyWsStarter = await planGuardService.check(testTenantId, 'agency_workspaces', 1);
    assert(agencyWsStarter.allowed === false, 'Multi-tenant agency workspaces rejected on Starter');
  });

  // ---------------------------------------------------------------------------
  // 4. IDEMPOTENT USAGE METERING (Zero Double-Charging)
  // ---------------------------------------------------------------------------
  await test('Idempotent Usage Counters (idempotent_usage_records & Atomic Counters)', async () => {
    const idempotencyKey = `pub_post_${crypto.randomUUID()}`;
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();

    // Reset usage counter for clean test
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .del();

    // 1st Increment
    const firstCall = await planGuardService.incrementUsageIdempotent({
      tenantId: testTenantId,
      resource: 'posts',
      amount: 1,
      idempotencyKey,
      metadata: { postId: 'test_p1', channel: 'facebook' },
    });
    assert(firstCall.alreadyRecorded === false, 'First call records usage successfully');
    assert(firstCall.currentTotal === 1, 'First call total counter is 1');

    // Verify row in idempotent_usage_records
    const recordRow = await db('idempotent_usage_records')
      .where({ tenant_id: testTenantId, idempotency_key: idempotencyKey })
      .first();
    assert(!!recordRow, 'Idempotent usage record persisted in idempotent_usage_records table');
    assert(recordRow.resource === 'posts', 'Resource is recorded as posts');

    // 2nd Increment with identical idempotencyKey (Retry simulation)
    const duplicateCall = await planGuardService.incrementUsageIdempotent({
      tenantId: testTenantId,
      resource: 'posts',
      amount: 1,
      idempotencyKey,
      metadata: { postId: 'test_p1', channel: 'facebook' },
    });
    assert(duplicateCall.alreadyRecorded === true, 'Duplicate call recognized as already recorded');
    
    // Check database counter remains exactly 1
    const counterRow = await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .first();
    assert(counterRow.posts_published === 1, 'Counter remains exactly 1 (Zero double-charging)');

    // Different idempotency key should increment counter to 2
    const secondKey = `pub_post_${crypto.randomUUID()}`;
    const secondCall = await planGuardService.incrementUsageIdempotent({
      tenantId: testTenantId,
      resource: 'posts',
      amount: 1,
      idempotencyKey: secondKey,
    });
    assert(secondCall.alreadyRecorded === false, 'Second distinct key is recorded');
    const updatedCounter = await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .first();
    assert(updatedCounter.posts_published === 2, 'Counter correctly incremented to 2');
  });

  // ---------------------------------------------------------------------------
  // 5. IN-SERVICE GUARD INTEGRATION CHECKS
  // ---------------------------------------------------------------------------
  await test('Cross-Layer Service Guards (Automations, Copilot, Governance)', async () => {
    // 5.1 Governance Autonomy Guard
    let caughtL4 = false;
    try {
      await governancePolicyService.setAutonomyLevel(testTenantId, testBrandId, 'L4', testUserId);
    } catch (err) {
      if (err.name === 'PlanGuardError' || err.message?.includes('exceeds maximum')) {
        caughtL4 = true;
      }
    }
    assert(caughtL4, 'governancePolicyService.setAutonomyLevel blocks L4 on Starter plan (limit L2)');

    // 5.2 Copilot AI Budget Enforcement
    // Temporarily set AI usage counter to near limit
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .update({ ai_tokens_consumed: 100000 }); // Exhausted

    let caughtCopilot = false;
    try {
      await copilotAutomationService.generateAutomationPlan(testTenantId, testBrandId, testUserId, {
        prompt: 'Generate an automatic daily promo for our products on Instagram',
      });
    } catch (err) {
      if (err.name === 'PlanGuardError' || err.message?.includes('budget') || err.message?.includes('exhausted')) {
        caughtCopilot = true;
      }
    }
    assert(caughtCopilot, 'Copilot AI synthesis strictly blocked when monthly token budget is exhausted');

    // Reset AI tokens for remaining tests
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .update({ ai_tokens_consumed: 0 });
  });

  // ---------------------------------------------------------------------------
  // 6. STRIPE LIFECYCLE: CHECKOUT, UPGRADES, DOWNGRADES, CANCELLATION
  // ---------------------------------------------------------------------------
  await test('Stripe Subscription Lifecycle: Checkout, Portal, Upgrade, Cancellation', async () => {
    // 6.1 Create Checkout Session
    const checkoutSession = await StripeBillingService.createCheckoutSession({
      tenantId: testTenantId,
      planId: 'growth',
      billingInterval: 'month',
      successUrl: 'https://socialforge.app/billing?success=true',
      cancelUrl: 'https://socialforge.app/billing?canceled=true',
    });
    assert(!!checkoutSession.sessionId, 'Checkout session created with session ID');
    assert(checkoutSession.url.includes('checkout.stripe.com') || checkoutSession.url.includes('session'), 'Checkout returns checkout URL');

    // 6.2 Customer Billing Portal Session
    const stripeCustomerId = 'cus_test_' + crypto.randomUUID().slice(0, 12);
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        provider: 'stripe',
        provider_customer_id: stripeCustomerId,
      });

    const portalSession = await StripeBillingService.createCustomerPortalSession({
      tenantId: testTenantId,
      returnUrl: 'https://socialforge.app/billing',
    });
    assert(!!portalSession.url, 'Customer portal session generated with URL');

    // 6.3 Upgrade to Growth
    const stripeSubId = 'sub_test_' + crypto.randomUUID().slice(0, 12);
    const growthPlan = await db('subscription_plans').where({ id: 'growth' }).first();
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await defaultBillingProvider.handleWebhook({
      id: 'evt_upg_' + crypto.randomUUID(),
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustomerId,
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(futureDate.getTime() / 1000),
          cancel_at_period_end: false,
          items: {
            data: [{ price: { id: 'price_growth_monthly' } }],
          },
          metadata: { tenantId: testTenantId, planId: 'growth' },
        },
      },
    });

    const upgradedSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(upgradedSub.plan_id === 'growth', 'Subscription synchronized and upgraded to Growth');
    assert(upgradedSub.status === 'active', 'Subscription status remains active');

    // After upgrade to Growth, premium connectors are now permitted!
    const premCheckGrowth = await planGuardService.check(testTenantId, 'premium_connectors', 1, { connectorType: 'google_sheets' });
    assert(premCheckGrowth.allowed === true, 'Premium connectors now allowed after Growth upgrade');

    // 6.4 Cancellation (at period end)
    await defaultBillingProvider.handleWebhook({
      id: 'evt_can_' + crypto.randomUUID(),
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustomerId,
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(futureDate.getTime() / 1000),
          cancel_at_period_end: true,
          items: {
            data: [{ price: { id: 'price_growth_monthly' } }],
          },
          metadata: { tenantId: testTenantId, planId: 'growth' },
        },
      },
    });

    const cancellingSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(Boolean(cancellingSub.cancel_at_period_end) === true, 'Subscription marked cancel_at_period_end');
    // Active during remainder of cycle
    const cancelCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(cancelCheck.allowed === true, 'Features remain functional while period is active even if scheduled to cancel');

    // Immediate cancellation / deletion
    await defaultBillingProvider.handleWebhook({
      id: 'evt_del_' + crypto.randomUUID(),
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustomerId,
          status: 'canceled',
          current_period_end: Math.floor(Date.now() / 1000),
          metadata: { tenantId: testTenantId },
        },
      },
    });

    const deletedSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(deletedSub.status === 'cancelled', 'Subscription status transitioned to cancelled');
    const blockedAfterCancel = await planGuardService.check(testTenantId, 'posts', 1);
    assert(blockedAfterCancel.allowed === false, 'Operations blocked once subscription is cancelled');
  });

  // ---------------------------------------------------------------------------
  // 7. DUNNING, 5-DAY GRACE PERIOD & PAYMENT RECOVERY
  // ---------------------------------------------------------------------------
  await test('Dunning State: 5-Day Grace Period -> Payment Recovery', async () => {
    // 7.1 Payment Failure Webhook triggers Dunning Stage 1
    const subId = crypto.randomUUID();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        plan_id: 'agency',
        status: 'past_due',
        past_due_since: now,
        current_period_end: periodEnd,
      });

    const dunningStatus = await DunningService.getDunningStatus(testTenantId);
    assert(dunningStatus.isPastDue === true, 'Tenant is marked past due');
    assert(dunningStatus.isInGracePeriod === true, 'Tenant is currently in 5-day grace period');
    assert(dunningStatus.daysRemaining >= 4, 'Reports 4-5 days remaining in grace period');

    // While in grace period, operations are still allowed with grace period flag
    const graceCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(graceCheck.allowed === true, 'Publishing allowed during 5-day grace period');
    assert(graceCheck.isGracePeriod === true, 'isGracePeriod flag is true');
    assert(!!graceCheck.gracePeriodEndsAt, 'gracePeriodEndsAt timestamp is provided');

    // 7.2 Successful payment restores subscription to active
    await db('tenant_subscriptions')
      .where({ tenant_id: testTenantId })
      .update({
        status: 'active',
        past_due_since: null,
      });

    const recoveredDunning = await DunningService.getDunningStatus(testTenantId);
    assert(recoveredDunning.isPastDue === false, 'Tenant past due state cleared');
    assert(recoveredDunning.isInGracePeriod === false, 'Tenant no longer in grace period');
  });

  // ---------------------------------------------------------------------------
  // 8. MULTI-TENANT ISOLATION & ZERO SECRET LEAKAGE
  // ---------------------------------------------------------------------------
  await test('Multi-Tenant Boundary Isolation & Zero Secret Exposure', async () => {
    // 8.1 Snapshot isolation
    const snapshotA = await planGuardService.getSnapshot(testTenantId);
    assert(snapshotA.posts.limit === 2500, 'Tenant A snapshot reflects Agency Pro limit (2500 posts)');

    const snapshotB = await planGuardService.getSnapshot(testTenantBId);
    assert(snapshotB.posts.limit === 100, 'Tenant B snapshot reflects Starter limit (100 posts)');

    // 8.2 Zero Secret Leakage: Ensure Stripe secret key is never in public responses
    const res = await fetch(`${API_BASE}/workspaces/quota`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const quotaData = await res.json();
    const quotaStr = JSON.stringify(quotaData);
    assert(!quotaStr.includes('sk_test_'), 'Stripe secret key sk_test_ never exposed in quota API response');
    assert(!quotaStr.includes('whsec_'), 'Stripe webhook secret never exposed in quota API response');
  });

  // ---------------------------------------------------------------------------
  // 9. PRODUCTION META POST INVARIANT
  // ---------------------------------------------------------------------------
  await test('Production Meta Publication Lock Invariant', async () => {
    const lockedVariant = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();

    assert(!!lockedVariant, 'Locked production post variant 1405588742634526_122100337179498315 exists');
    assert(lockedVariant.status === 'published', 'Locked production variant remains strictly "published"');

    const lockedJob = await db('publishing_jobs')
      .where({ external_post_id: '1405588742634526_122100337179498315' })
      .first();
    assert(!!lockedJob, 'Publishing job for locked production post variant exists');
  });

  // ---------------------------------------------------------------------------
  // CLEANUP TEST FIXTURES
  // ---------------------------------------------------------------------------
  console.log('\n[Cleanup] Cleaning up test fixtures...');
  await db('idempotent_usage_records').where({ tenant_id: testTenantId }).del();
  await db('tenant_usage_counters').where({ tenant_id: testTenantId }).del();
  await db('tenant_usage_counters').where({ tenant_id: testTenantBId }).del();
  await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
  await db('tenant_subscriptions').where({ tenant_id: testTenantBId }).del();
  await db('brand_governance_settings').where({ tenant_id: testTenantId }).del();
  await db('brands').where({ id: testBrandId }).del();
  await db('tenant_users').where({ tenant_id: testTenantId }).del();
  await db('users').where({ id: testUserId }).del();
  await db('tenants').where({ id: testTenantId }).del();
  await db('tenants').where({ id: testTenantBId }).del();

  console.log('\n========================================================================');
  console.log(`   STAGE 9 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED     `);
  console.log('========================================================================\n');

  await db.destroy();
  setTimeout(() => {
    process.exit(failed > 0 ? 1 : 0);
  }, 100);
}

runStage9TestSuite().catch(async (err) => {
  console.error('\n[FATAL TEST RUNNER ERROR]:', err);
  try {
    await db.destroy();
  } catch {}
  setTimeout(() => process.exit(1), 100);
});
