import http from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { billingProviderRegistry, defaultBillingProvider } from '../apps/api/dist/services/billing/index.js';
import { StripeBillingService } from '../apps/api/dist/services/stripeBilling.service.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';

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

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('STAGE 7: STRIPE BILLING & BILLINGPROVIDER ABSTRACTION TEST SUITE');
  console.log('========================================================================\n');

  const tenantId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const brandId = crypto.randomUUID();

  try {
    // -------------------------------------------------------------------------
    // Setup Isolated Tenant Workspace
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning test workspace and user...');

    await db('tenants').insert({
      id: tenantId,
      name: 'Stage 7 Stripe Agency',
      slug: `stage-7-stripe-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: userId,
      email: `billing-owner-${Date.now()}@test.com`,
      password_hash: 'hash',
      full_name: 'Stripe Billing Owner',
      is_superadmin: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: userId,
      role: 'owner',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const initialSubId = crypto.randomUUID();
    await db('tenant_subscriptions').insert({
      id: initialSubId,
      tenant_id: tenantId,
      plan_id: 'starter',
      status: 'active',
      provider: 'stripe',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('brands').insert({
      id: brandId,
      tenant_id: tenantId,
      name: 'Stage 7 Brand',
      slug: `brand-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const token = jwt.sign(
      { userId, email: 'billing-owner@test.com', role: 'owner', tenantId },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // 1. Verify BillingProvider Abstraction Interface & Methods
    // -------------------------------------------------------------------------
    console.log('\n--- 1. BillingProvider Abstraction Interface & Methods ---');
    assert(defaultBillingProvider !== undefined, 'BillingProvider instance resolved from registry');
    assert(defaultBillingProvider.providerName === 'stripe', 'Default provider name is "stripe"');

    assert(typeof defaultBillingProvider.createCustomer === 'function', 'Implements createCustomer()');
    assert(typeof defaultBillingProvider.createCheckout === 'function', 'Implements createCheckout()');
    assert(typeof defaultBillingProvider.getSubscription === 'function', 'Implements getSubscription()');
    assert(typeof defaultBillingProvider.changeSubscription === 'function', 'Implements changeSubscription()');
    assert(typeof defaultBillingProvider.cancelSubscription === 'function', 'Implements cancelSubscription()');
    assert(typeof defaultBillingProvider.resumeSubscription === 'function', 'Implements resumeSubscription()');
    assert(typeof defaultBillingProvider.createPortalSession === 'function', 'Implements createPortalSession()');
    assert(typeof defaultBillingProvider.verifyWebhook === 'function', 'Implements verifyWebhook()');

    // -------------------------------------------------------------------------
    // 2. createCustomer()
    // -------------------------------------------------------------------------
    console.log('\n--- 2. createCustomer() ---');
    const customer = await defaultBillingProvider.createCustomer({
      tenantId,
      email: 'customer@test.com',
      name: 'Stage 7 Stripe Agency',
    });
    assert(customer.customerId.startsWith('cus_'), 'createCustomer returns valid customerId');

    const subWithCust = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    assert(subWithCust.provider_customer_id === customer.customerId, 'CustomerId persisted in tenant_subscriptions');

    // -------------------------------------------------------------------------
    // 3. createCheckout()
    // -------------------------------------------------------------------------
    console.log('\n--- 3. createCheckout() ---');
    const checkout = await defaultBillingProvider.createCheckout({
      tenantId,
      userId,
      userEmail: 'customer@test.com',
      planId: 'growth',
    });
    assert(checkout.sessionId !== undefined, 'createCheckout returns sessionId');
    assert(checkout.url !== undefined, 'createCheckout returns hosted URL');
    assert(checkout.planId === 'growth', 'createCheckout targets Growth plan');

    // Rejection of zero-cost plans
    try {
      await defaultBillingProvider.createCheckout({
        tenantId,
        userId,
        planId: 'free_trial',
      });
      assert(false, 'Should reject checkout for free_trial');
    } catch (err) {
      assert(err.message.includes('zero-cost'), 'Correctly rejects checkout for zero-cost free_trial tier');
    }

    // -------------------------------------------------------------------------
    // 4. getSubscription()
    // -------------------------------------------------------------------------
    console.log('\n--- 4. getSubscription() ---');
    const fetchedSub = await defaultBillingProvider.getSubscription(tenantId);
    assert(fetchedSub !== null, 'getSubscription returns active subscription');
    assert(fetchedSub.tenantId === tenantId, 'Subscription belongs to correct tenant');
    assert(fetchedSub.planId === 'starter', 'Initial plan is starter');
    assert(fetchedSub.status === 'active', 'Initial status is active');

    // -------------------------------------------------------------------------
    // 5. changeSubscription()
    // -------------------------------------------------------------------------
    console.log('\n--- 5. changeSubscription() ---');
    const changedSub = await defaultBillingProvider.changeSubscription(fetchedSub.id, 'growth', {
      prorationBehavior: 'create_prorations',
    });
    assert(changedSub.planId === 'growth', 'changeSubscription successfully updated plan to growth');

    const entitlementGrowth = await EntitlementService.canCreateBrand(tenantId);
    assert(entitlementGrowth.limit === 5, 'Entitlements immediately reflect upgraded growth brand limit (5)');

    // -------------------------------------------------------------------------
    // 6. cancelSubscription() & resumeSubscription()
    // -------------------------------------------------------------------------
    console.log('\n--- 6. cancelSubscription() & resumeSubscription() ---');
    // Cancel at period end
    const cancelledPeriodEnd = await defaultBillingProvider.cancelSubscription(fetchedSub.id, false);
    assert(cancelledPeriodEnd.cancelAtPeriodEnd === true, 'cancelSubscription marks cancelAtPeriodEnd = true');

    // Resume subscription
    const resumed = await defaultBillingProvider.resumeSubscription(fetchedSub.id);
    assert(resumed.cancelAtPeriodEnd === false, 'resumeSubscription clears cancelAtPeriodEnd flag');

    // Immediate cancellation
    const cancelledImmediate = await defaultBillingProvider.cancelSubscription(fetchedSub.id, true);
    assert(cancelledImmediate.status === 'cancelled', 'Immediate cancellation updates status to cancelled');

    const entitlementCancelled = await EntitlementService.canCreateBrand(tenantId);
    assert(entitlementCancelled.allowed === false, 'Cancelled subscription immediately blocks operations');
    assert(entitlementCancelled.reason.includes('cancelled'), 'Reason cites cancelled subscription');

    // Reactivate for webhook tests
    await db('tenant_subscriptions').where({ id: fetchedSub.id }).update({
      status: 'active',
      plan_id: 'starter',
      updated_at: new Date(),
    });

    // -------------------------------------------------------------------------
    // 7. createPortalSession()
    // -------------------------------------------------------------------------
    console.log('\n--- 7. createPortalSession() ---');
    const portal = await defaultBillingProvider.createPortalSession({ tenantId });
    assert(portal.url !== undefined && portal.url.includes('billing'), 'createPortalSession returns management URL');

    // -------------------------------------------------------------------------
    // 8. verifyWebhook() & Webhook Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- 8. verifyWebhook() & Webhook Idempotency ---');

    const eventPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${Date.now()}`,
          customer: customer.customerId,
          subscription: `sub_stripe_${Date.now()}`,
          metadata: {
            tenantId,
            planId: 'agency_scale',
            userId,
          },
        },
      },
    };

    const verified = await defaultBillingProvider.verifyWebhook(JSON.stringify(eventPayload));
    assert(verified.eventId === eventPayload.id, 'verifyWebhook extracts eventId');
    assert(verified.eventType === eventPayload.type, 'verifyWebhook extracts eventType');

    // Process webhook 1st time
    const handleResult1 = await defaultBillingProvider.handleWebhook(JSON.stringify(eventPayload));
    assert(handleResult1.received === true, 'Webhook handled successfully on 1st delivery');
    assert(!handleResult1.duplicate, '1st delivery is not marked duplicate');

    // Verify subscription upgraded to agency_scale
    const subAfterWebhook = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    assert(subAfterWebhook.plan_id === 'agency_scale', 'Subscription updated to agency_scale via verified webhook');
    assert(subAfterWebhook.status === 'active', 'Subscription status is active');

    // Verify entitlement updated
    const entitlementAgency = await EntitlementService.canCreateBrand(tenantId);
    assert(entitlementAgency.limit === 25, 'Agency Scale brand limit (25) immediately active');

    // Process duplicate webhook
    const handleResult2 = await defaultBillingProvider.handleWebhook(JSON.stringify(eventPayload));
    assert(handleResult2.received === true, 'Duplicate webhook returns received: true');
    assert(handleResult2.duplicate === true, 'Duplicate delivery successfully detected and skipped');

    // Verify billing_events has exactly 1 entry for this eventId
    const eventAudit = await db('billing_events').where({ provider_event_id: eventPayload.id });
    assert(eventAudit.length === 1, 'billing_events contains exactly 1 audit record (no duplicates)');

    // -------------------------------------------------------------------------
    // 9. Lifecycle: payment failed -> 3-7 day Grace Policy
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Lifecycle: payment failed & 3-7 Day Grace Policy ---');

    const paymentFailEvent = {
      id: `evt_inv_fail_${Date.now()}`,
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: `in_fail_${Date.now()}`,
          number: `INV-FAIL-${Date.now()}`,
          customer: customer.customerId,
          subscription: subAfterWebhook.provider_subscription_id,
          amount_due: 24900,
          amount_paid: 0,
          currency: 'usd',
          metadata: { tenantId },
        },
      },
    };

    await defaultBillingProvider.handleWebhook(JSON.stringify(paymentFailEvent));

    const subPastDue = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    assert(subPastDue.status === 'past_due', 'Subscription status updated to past_due');
    assert(subPastDue.past_due_since !== null, 'past_due_since timestamp initialized');

    // Day 1 of grace period: Important workflows (publishing, creating brands) remain accessible!
    const graceEntitlement = await EntitlementService.canPublish(tenantId, 1);
    assert(graceEntitlement.allowed === true, 'Important customer workflow allowed during active grace period');
    assert(graceEntitlement.isGracePeriod === true, 'isGracePeriod flag is true');
    assert(graceEntitlement.gracePeriodEndsAt !== null, 'gracePeriodEndsAt timestamp is provided');
    assert(graceEntitlement.reason.includes('grace period'), 'Reason informs customer of active grace period');

    // Simulate expiration of grace period (> 5 days elapsed)
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions').where({ tenant_id: tenantId }).update({
      past_due_since: sixDaysAgo,
    });

    const expiredGraceEntitlement = await EntitlementService.canPublish(tenantId, 1);
    assert(expiredGraceEntitlement.allowed === false, 'Workflows restricted after 5-day grace period expires');
    assert(expiredGraceEntitlement.reason.includes('grace period has expired'), 'Reason indicates grace period expiration');

    // -------------------------------------------------------------------------
    // 10. Lifecycle: payment succeeded & renewal (Reactivation & Grace Clear)
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Lifecycle: payment succeeded & renewal ---');

    const paymentPaidEvent = {
      id: `evt_inv_paid_${Date.now()}`,
      type: 'invoice.paid',
      data: {
        object: {
          id: `in_paid_${Date.now()}`,
          number: `INV-PAID-${Date.now()}`,
          customer: customer.customerId,
          subscription: subAfterWebhook.provider_subscription_id,
          amount_due: 24900,
          amount_paid: 24900,
          currency: 'usd',
          metadata: { tenantId },
        },
      },
    };

    await defaultBillingProvider.handleWebhook(JSON.stringify(paymentPaidEvent));

    const subReactivated = await db('tenant_subscriptions').where({ tenant_id: tenantId }).first();
    assert(subReactivated.status === 'active', 'Subscription reactivated to active');
    assert(subReactivated.past_due_since === null, 'past_due_since cleared to null');

    const activeEntitlement = await EntitlementService.canPublish(tenantId, 1);
    assert(activeEntitlement.allowed === true, 'Full publishing workflows restored');
    assert(!activeEntitlement.isGracePeriod, 'isGracePeriod flag is false');

    // Verify invoice recorded in billing_invoices table
    const recordedInvoice = await db('billing_invoices')
      .where({ provider_invoice_id: paymentPaidEvent.data.object.id })
      .first();
    assert(recordedInvoice !== undefined, 'Invoice recorded in billing_invoices table');
    assert(recordedInvoice.status === 'paid', 'Invoice marked paid');
    assert(recordedInvoice.amount_paid_cents === 24900, 'amount_paid_cents is 24900 ($249.00)');

    // -------------------------------------------------------------------------
    // 11. Security Audit: Card / CVV / Secret Storage Prevention
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Security Audit: Card / CVV / Secret Storage Prevention ---');

    const allInvoices = await db('billing_invoices').where({ tenant_id: tenantId });
    for (const inv of allInvoices) {
      assert(inv.card_number === undefined, 'No card_number column on invoices table');
      assert(inv.cvv === undefined, 'No cvv column on invoices table');
    }

    const allSubs = await db('tenant_subscriptions').where({ tenant_id: tenantId });
    for (const s of allSubs) {
      assert(s.card_number === undefined, 'No card_number column on subscriptions table');
      assert(s.cvv === undefined, 'No cvv column on subscriptions table');
    }

    // -------------------------------------------------------------------------
    // 12. HTTP Controller Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 12. HTTP Controller Endpoints ---');

    // 12.1 POST /api/v1/billing/subscription/change
    const changeRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/subscription/change',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      { newPlanId: 'growth' }
    );
    assert(changeRes.status === 200, 'POST /subscription/change returns 200');
    assert(changeRes.body.data.planId === 'growth', 'HTTP response confirms plan changed to growth');

    // 12.2 POST /api/v1/billing/subscription/cancel
    const cancelRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/subscription/cancel',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      { immediately: false }
    );
    assert(cancelRes.status === 200, 'POST /subscription/cancel returns 200');
    assert(cancelRes.body.data.cancelAtPeriodEnd === true, 'HTTP response confirms cancelAtPeriodEnd: true');

    // 12.3 POST /api/v1/billing/subscription/resume
    const resumeRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/subscription/resume',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );
    assert(resumeRes.status === 200, 'POST /subscription/resume returns 200');
    assert(resumeRes.body.data.cancelAtPeriodEnd === false, 'HTTP response confirms cancelAtPeriodEnd: false');

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
    failed++;
  } finally {
    // Cleanup
    await db('billing_events').where({ tenant_id: tenantId }).delete();
    await db('billing_invoices').where({ tenant_id: tenantId }).delete();
    await db('brands').where({ tenant_id: tenantId }).delete();
    await db('tenant_subscriptions').where({ tenant_id: tenantId }).delete();
    await db('tenant_users').where({ tenant_id: tenantId }).delete();
    await db('users').where({ id: userId }).delete();
    await db('tenants').where({ id: tenantId }).delete();

    await db.destroy();
  }

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
