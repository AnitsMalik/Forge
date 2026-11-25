import http from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import crypto from 'crypto';

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
  console.log('STAGE 5: STRIPE BILLING INTEGRATION & WEBHOOK LIFECYCLE TEST SUITE');
  console.log('========================================================================\n');

  const testTenantId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const initialSubId = crypto.randomUUID();

  try {
    // 1. Create isolated test workspace, user, and subscription
    await db('tenants').insert({
      id: testTenantId,
      name: 'Stripe SaaS Testing Agency',
      slug: `stripe-test-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: testUserId,
      email: `stripe_user_${Date.now()}@test.com`,
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      full_name: 'Stripe Billing Tester',
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

    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions').insert({
      id: initialSubId,
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

    const token = jwt.sign(
      { userId: testUserId, tenantId: testTenantId, email: `stripe_user_${Date.now()}@test.com`, role: 'owner' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('--- 1. Testing GET /api/v1/billing/subscription ---');
    const subRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/subscription',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    assert(subRes.status === 200, 'GET /billing/subscription returns 200 OK');
    assert(subRes.body.success === true, 'Response success: true');
    assert(subRes.body.data.planId === 'starter', 'Subscription planId is starter');
    assert(subRes.body.data.status === 'active', 'Subscription status is active');
    assert(subRes.body.data.maxBrands === 1, 'Plan maxBrands matches starter (1)');

    console.log('\n--- 2. Testing POST /api/v1/billing/checkout ---');
    // Valid plan checkout
    const checkoutRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/checkout',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      },
      { planId: 'growth' }
    );

    assert(checkoutRes.status === 200, 'POST /billing/checkout succeeds (200 OK)');
    assert(checkoutRes.body.success === true, 'Checkout session success is true');
    assert(typeof checkoutRes.body.data.sessionId === 'string', 'Returns checkout sessionId');
    assert(typeof checkoutRes.body.data.url === 'string', 'Returns redirect url');
    assert(checkoutRes.body.data.planId === 'growth', 'Checkout targeted growth plan');

    // Free plan checkout rejection
    const freeCheckoutRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/checkout',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      },
      { planId: 'free_trial' }
    );
    assert(freeCheckoutRes.status === 400, 'Free plan checkout rejected with 400');
    assert(freeCheckoutRes.body.error?.code === 'CHECKOUT_FAILED', 'Returns CHECKOUT_FAILED');

    console.log('\n--- 3. Testing POST /api/v1/billing/portal ---');
    const portalRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/portal',
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      },
      { returnUrl: 'http://localhost:5173/settings/billing' }
    );

    assert(portalRes.status === 200, 'POST /billing/portal returns 200 OK');
    assert(portalRes.body.success === true, 'Portal success is true');
    assert(typeof portalRes.body.data.url === 'string', 'Returns portal url');

    console.log('\n--- 4. Testing Webhook: checkout.session.completed ---');
    const stripeSubId = `sub_${crypto.randomBytes(12).toString('hex')}`;
    const stripeCustId = `cus_${crypto.randomBytes(12).toString('hex')}`;
    const checkoutEventId = `evt_checkout_${Date.now()}`;

    const checkoutEvent = {
      id: checkoutEventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_${Date.now()}`,
          customer: stripeCustId,
          subscription: stripeSubId,
          metadata: {
            tenantId: testTenantId,
            planId: 'agency_scale',
            userId: testUserId,
          },
        },
      },
    };

    const webhookRes1 = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      checkoutEvent
    );

    assert(webhookRes1.status === 200, 'checkout.session.completed webhook accepted (200)');
    assert(webhookRes1.body.received === true, 'Webhook response received: true');

    // Verify database was updated
    const updatedSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(updatedSub.plan_id === 'agency_scale', 'Subscription plan upgraded to agency_scale');
    assert(updatedSub.status === 'active', 'Subscription status active');
    assert(updatedSub.provider === 'stripe', 'Provider set to stripe');
    assert(updatedSub.provider_subscription_id === stripeSubId, 'provider_subscription_id matches');
    assert(updatedSub.provider_customer_id === stripeCustId, 'provider_customer_id matches');

    // Verify billing_events audit record was created
    const billingEventRecord = await db('billing_events')
      .where({ provider_event_id: checkoutEventId })
      .first();
    assert(billingEventRecord !== undefined, 'Audit record created in billing_events table');
    assert(billingEventRecord.tenant_id === testTenantId, 'Audit record belongs to correct tenant');

    // Verify EntitlementService immediately honors upgraded quotas (agency_scale max_brands = 25)
    const entitlementAgency = await EntitlementService.canCreateBrand(testTenantId);
    assert(entitlementAgency.limit === 25, 'EntitlementService brand limit expanded to 25');

    console.log('\n--- 5. Testing Webhook Idempotency (Duplicate Delivery) ---');
    const duplicateRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      checkoutEvent
    );

    assert(duplicateRes.status === 200, 'Duplicate webhook returns 200');
    assert(duplicateRes.body.duplicate === true, 'Duplicate flag acknowledged');

    const eventCount = await db('billing_events')
      .where({ provider_event_id: checkoutEventId })
      .count('id as count')
      .first();
    assert(Number(eventCount.count) === 1, 'Event not duplicated in billing_events table');

    console.log('\n--- 6. Testing Webhook: customer.subscription.updated (Past Due Gating) ---');
    const pastDueEventId = `evt_sub_pastdue_${Date.now()}`;
    const subUpdatedEvent = {
      id: pastDueEventId,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustId,
          status: 'past_due',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          cancel_at_period_end: false,
          metadata: {
            tenantId: testTenantId,
            planId: 'agency_scale',
          },
        },
      },
    };

    const webhookRes2 = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      subUpdatedEvent
    );

    assert(webhookRes2.status === 200, 'subscription.updated webhook accepted (200)');

    const pastDueSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(pastDueSub.status === 'past_due', 'Subscription status updated to past_due in database');

    // Verify EntitlementService immediately halts operations for past_due
    const pastDueEntitlement = await EntitlementService.canPublish(testTenantId, 1);
    assert(pastDueEntitlement.allowed === false, 'EntitlementService blocks canPublish when past_due');
    assert(pastDueEntitlement.remaining === 0, 'Remaining is 0 when past_due');
    assert(pastDueEntitlement.reason.includes('past due'), 'Reason explains past due status');

    console.log('\n--- 7. Testing Webhook: invoice.paid (Invoice Recording & Reactivation) ---');
    const invoicePaidEventId = `evt_inv_paid_${Date.now()}`;
    const stripeInvoiceId = `in_${crypto.randomBytes(12).toString('hex')}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const invoicePaidEvent = {
      id: invoicePaidEventId,
      type: 'invoice.paid',
      data: {
        object: {
          id: stripeInvoiceId,
          number: invoiceNumber,
          customer: stripeCustId,
          subscription: stripeSubId,
          amount_due: 24900,
          amount_paid: 24900,
          currency: 'usd',
          hosted_invoice_url: `https://pay.stripe.com/invoice/${stripeInvoiceId}`,
          invoice_pdf: `https://pay.stripe.com/invoice/${stripeInvoiceId}/pdf`,
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          metadata: { tenantId: testTenantId },
        },
      },
    };

    const webhookRes3 = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      invoicePaidEvent
    );

    assert(webhookRes3.status === 200, 'invoice.paid webhook accepted (200)');

    // Verify invoice saved in billing_invoices
    const invoiceRow = await db('billing_invoices')
      .where({ provider_invoice_id: stripeInvoiceId })
      .first();
    assert(invoiceRow !== undefined, 'Invoice persisted to billing_invoices table');
    assert(invoiceRow.invoice_number === invoiceNumber, 'Invoice number matches');
    assert(invoiceRow.amount_paid_cents === 24900, 'amount_paid_cents is 24900 ($249.00)');
    assert(invoiceRow.status === 'paid', 'Invoice status is paid');
    assert(invoiceRow.tenant_id === testTenantId, 'Invoice belongs to test workspace');

    // Verify subscription reactivated to active after invoice payment
    const reactivatedSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(reactivatedSub.status === 'active', 'Subscription automatically reactivated to active');

    // Verify EntitlementService unblocked
    const unblockedEntitlement = await EntitlementService.canPublish(testTenantId, 1);
    assert(unblockedEntitlement.allowed === true, 'EntitlementService unblocks operations');

    // Verify GET /api/v1/billing/invoices returns new invoice
    const invoicesRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/invoices',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(invoicesRes.status === 200, 'GET /billing/invoices returns 200');
    assert(invoicesRes.body.data.length >= 1, 'Invoices list contains recorded invoice');
    assert(invoicesRes.body.data[0].invoice_number === invoiceNumber, 'List contains correct invoiceNumber');

    console.log('\n--- 8. Testing Webhook: customer.subscription.deleted (Cancellation) ---');
    const subDeletedEventId = `evt_sub_del_${Date.now()}`;
    const subDeletedEvent = {
      id: subDeletedEventId,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: stripeSubId,
          customer: stripeCustId,
          metadata: { tenantId: testTenantId },
        },
      },
    };

    const webhookRes4 = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/billing/webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      subDeletedEvent
    );

    assert(webhookRes4.status === 200, 'customer.subscription.deleted accepted (200)');

    const cancelledSub = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(cancelledSub.status === 'cancelled', 'Subscription status updated to cancelled in database');
    assert(cancelledSub.ended_at !== null, 'ended_at timestamp populated');

    // Verify EntitlementService blocks cancelled state
    const cancelledEntitlement = await EntitlementService.canCreateBrand(testTenantId);
    assert(cancelledEntitlement.allowed === false, 'EntitlementService blocks brand creation when cancelled');
    assert(cancelledEntitlement.reason.includes('cancelled'), 'Reason mentions cancellation');

    console.log('\n--- 9. Clean Up Test Data ---');
    await db('billing_invoices').where({ tenant_id: testTenantId }).del();
    await db('billing_events').where({ tenant_id: testTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
    await db('tenant_users').where({ tenant_id: testTenantId }).del();
    await db('users').where({ id: testUserId }).del();
    await db('tenants').where({ id: testTenantId }).del();
    console.log('✓ Cleaned up all test entities');

  } catch (err) {
    console.error('Test error:', err);
    failed++;
  } finally {
    console.log('\n========================================================================');
    console.log(`STAGE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
