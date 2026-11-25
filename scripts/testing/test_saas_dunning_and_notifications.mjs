import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { DunningService } from '../apps/api/dist/services/billing/dunning.service.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import { processDunningEvaluation } from '../apps/worker/dist/processors/dunningProcessor.js';

const API_BASE = 'http://localhost:4000/api/v1';

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
  console.log('================================================================');
  console.log('STAGE 10: AUTOMATED DUNNING & BILLING NOTIFICATIONS TEST SUITE');
  console.log('================================================================\n');

  const testTenantId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const testEmail = `dunning_owner_${Date.now()}@socialforge-test.io`;

  try {
    // 1. Fixture Setup: Tenant, Owner User, Active Subscription
    await db('tenants').insert({
      id: testTenantId,
      name: 'Stage 10 Dunning Workspace',
      slug: `stage-10-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: testUserId,
      email: testEmail,
      password_hash: 'hashed_dummy_pw',
      full_name: 'Dunning Test Owner',
      is_active: 1,
      email_verified: 1,
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

    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      plan_id: 'growth',
      status: 'active',
      provider: 'stripe',
      provider_customer_id: `cus_test_${Date.now()}`,
      provider_subscription_id: `sub_test_${Date.now()}`,
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancel_at_period_end: false,
      past_due_since: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const authToken = jwt.sign(
      {
        userId: testUserId,
        email: testEmail,
        tenantId: testTenantId,
        role: 'owner',
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('--- TEST 1: Initial Baseline Dunning Status ---');
    const res1 = await fetch(`${API_BASE}/billing/dunning`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data1 = await res1.json();

    assert(res1.status === 200, 'GET /billing/dunning returns 200');
    assert(data1.success === true, 'Response indicates success');
    assert(data1.data.isPastDue === false, 'Initially not past due');
    assert(data1.data.isInGracePeriod === false, 'Initially not in grace period');
    assert(data1.data.currentPlanName.toLowerCase().includes('growth'), 'Reflects Growth plan');
    assert(Array.isArray(data1.data.activeNotifications), 'Active notifications is an array');
    assert(data1.data.activeNotifications.length === 0, 'No active notifications initially');

    console.log('\n--- TEST 2: Payment Failure & Stage 1 Dunning Initiation ---');
    const mockFailedInvoice = {
      id: `in_fail_${Date.now()}`,
      number: 'INV-TEST-FAIL-01',
      amount_due: 7900,
      currency: 'usd',
      hosted_invoice_url: 'https://stripe.com/test-invoice-pay',
      last_payment_error: 'insufficient_funds',
    };

    await DunningService.handlePaymentFailed(testTenantId, mockFailedInvoice);

    // Verify database state
    const subAfterFail = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(subAfterFail.status === 'past_due', 'Subscription status updated to past_due');
    assert(subAfterFail.past_due_since !== null, 'past_due_since is recorded');

    // Verify dunning event logged
    const dunningEvent1 = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'payment_failed', stage: 1 })
      .first();
    assert(!!dunningEvent1, 'Stage 1 payment_failed event created');
    assert(dunningEvent1.recipient_email === testEmail, 'Sent to tenant owner email');
    assert(dunningEvent1.status === 'sent', 'Event status is sent');
    assert(dunningEvent1.subject.includes('5-day grace'), 'Subject mentions 5-day grace policy');

    // Verify in-app notification created
    const notif1 = await db('billing_notifications')
      .where({ tenant_id: testTenantId, type: 'billing_past_due' })
      .first();
    assert(!!notif1, 'In-app billing_past_due notification created');
    assert(notif1.severity === 'critical', 'Severity is critical');
    assert(notif1.action_label === 'Update Payment Method', 'Action label prompts payment update');

    // Verify API response reflects grace window
    const res2 = await fetch(`${API_BASE}/billing/dunning`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data2 = await res2.json();
    assert(data2.data.isPastDue === true, 'API reports isPastDue: true');
    assert(data2.data.isInGracePeriod === true, 'API reports isInGracePeriod: true');
    assert(data2.data.daysRemaining >= 4 && data2.data.daysRemaining <= 5, `API reports 5 days remaining initially (got ${data2.data.daysRemaining})`);
    assert(data2.data.activeNotifications.length >= 1, 'Active notifications includes alert');

    console.log('\n--- TEST 3: Webhook Idempotency (Duplicate Day 1 Event Prevention) ---');
    // Dispatch failure again to test deduplication
    await DunningService.handlePaymentFailed(testTenantId, mockFailedInvoice);
    const eventCount = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'payment_failed', stage: 1 })
      .count('* as count');
    assert(Number(eventCount[0].count) === 1, 'Duplicate dunning event within 24h was prevented');

    console.log('\n--- TEST 4: Entitlement Allowed Under Active Grace Period ---');
    const entitlementGraceCheck = await EntitlementService.canPublish(testTenantId);
    assert(entitlementGraceCheck.allowed === true, 'Publishing still permitted during 5-day grace');

    console.log('\n--- TEST 5: Stage 2 Progression (Day 3 Urgent Reminder at 50h) ---');
    const simRes1 = await fetch(`${API_BASE}/billing/dunning/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ simulateHours: 50 }),
    });
    const simData1 = await simRes1.json();
    assert(simRes1.status === 200, 'POST /billing/dunning/process (simulate 50h) returns 200');
    assert(simData1.success === true, 'Simulation returns success');

    const dunningEvent2 = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'grace_warning_day3', stage: 2 })
      .first();
    assert(!!dunningEvent2, 'Stage 2 grace_warning_day3 event created after 50h');
    assert(dunningEvent2.subject.includes('remaining'), 'Subject warns of remaining time');

    const res3 = await fetch(`${API_BASE}/billing/dunning`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data3 = await res3.json();
    assert(data3.data.daysRemaining <= 3, 'Days remaining updated to <= 3');
    assert(data3.data.isInGracePeriod === true, 'Still in grace period');

    console.log('\n--- TEST 6: Stage 3 Grace Expiration & Automatic Suspension (125h) ---');
    const simRes2 = await fetch(`${API_BASE}/billing/dunning/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ simulateHours: 125 }),
    });
    const simData2 = await simRes2.json();
    assert(simRes2.status === 200, 'Simulation of 125h returns 200');

    // Verify subscription status suspended
    const subAfterExpire = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(subAfterExpire.status === 'expired', 'Subscription automatically transitioned to expired');

    // Verify stage 3 suspension event
    const dunningEvent3 = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'grace_expired_suspension', stage: 3 })
      .first();
    assert(!!dunningEvent3, 'Stage 3 grace_expired_suspension event created');
    assert(dunningEvent3.subject.includes('Suspended'), 'Subject communicates Account Suspended');

    // Verify in-app suspension alert
    const suspendedAlert = await db('billing_notifications')
      .where({ tenant_id: testTenantId, type: 'account_suspended', is_dismissed: false })
      .first();
    assert(!!suspendedAlert, 'account_suspended in-app notification active');

    // Verify EntitlementService now restricts publishing
    const entitlementExpiredCheck = await EntitlementService.canPublish(testTenantId);
    assert(entitlementExpiredCheck.allowed === false, 'Publishing blocked once grace period expires');
    assert(entitlementExpiredCheck.reason.includes('expired') || entitlementExpiredCheck.reason.includes('past due') || entitlementExpiredCheck.reason.includes('SUBSCRIPTION_PAST_DUE'), 'Reason indicates expired grace policy');

    console.log('\n--- TEST 7: Payment Recovery & Dunning Resolution ---');
    const mockSuccessInvoice = {
      id: `in_paid_${Date.now()}`,
      number: 'INV-TEST-RECOVER-01',
      amount_paid: 7900,
      currency: 'usd',
      hosted_invoice_url: 'https://stripe.com/test-receipt',
    };

    await DunningService.handlePaymentSucceeded(testTenantId, mockSuccessInvoice);

    // Verify subscription restored
    const subAfterRecovery = await db('tenant_subscriptions').where({ tenant_id: testTenantId }).first();
    assert(subAfterRecovery.status === 'active', 'Subscription restored to active status');
    assert(subAfterRecovery.past_due_since === null, 'past_due_since cleared to null');

    // Verify previous dunning events marked resolved
    const unresolvedEvents = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, status: 'sent' })
      .whereIn('event_type', ['payment_failed', 'grace_warning_day1', 'grace_warning_day3']);
    assert(unresolvedEvents.length === 0, 'All open past-due dunning events updated to resolved');

    // Verify receipt event sent
    const recoveryEvent = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'payment_recovered' })
      .first();
    assert(!!recoveryEvent, 'payment_recovered confirmation event logged');

    // Verify entitlement immediately restored
    const entitlementRestoredCheck = await EntitlementService.canPublish(testTenantId);
    assert(entitlementRestoredCheck.allowed === true, 'Publishing immediately unblocked after recovery');

    console.log('\n--- TEST 8: In-App Notification Listing & Dismissal ---');
    const notifRes = await fetch(`${API_BASE}/billing/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const notifData = await notifRes.json();
    assert(notifRes.status === 200, 'GET /billing/notifications returns 200');
    assert(Array.isArray(notifData.data), 'Returns notification list');
    assert(notifData.data.length > 0, 'Contains notifications');

    const notifToDismiss = notifData.data[0];
    const dismissRes = await fetch(`${API_BASE}/billing/notifications/${notifToDismiss.id}/dismiss`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const dismissData = await dismissRes.json();
    assert(dismissRes.status === 200, 'PATCH /billing/notifications/:id/dismiss returns 200');
    assert(dismissData.data.dismissed === true, 'Dismissed confirmed');

    // Verify dismissed notification is not returned in subsequent calls
    const notifRes2 = await fetch(`${API_BASE}/billing/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const notifData2 = await notifRes2.json();
    const stillPresent = notifData2.data.some((n) => n.id === notifToDismiss.id);
    assert(!stillPresent, 'Dismissed notification excluded from active inbox');

    console.log('\n--- TEST 9: Subscription Cancellation Notice ---');
    await DunningService.handleSubscriptionCanceled(testTenantId, { cancel_at_period_end: true });
    const cancelEvent = await db('billing_dunning_events')
      .where({ tenant_id: testTenantId, event_type: 'cancellation_notice' })
      .first();
    assert(!!cancelEvent, 'cancellation_notice dunning event logged');
    assert(cancelEvent.recipient_email === testEmail, 'Cancellation notice delivered to owner');

    console.log('\n--- TEST 10: Worker Background Dunning Processor Execution ---');
    const workerResult = await processDunningEvaluation();
    assert(typeof workerResult.pastDueCount === 'number', 'Worker processor executes cleanly without throw');
    assert(typeof workerResult.suspendedCount === 'number', 'Worker tracks suspensions count');

    console.log('\n--- TEST 11: Production Meta Publication Lock Integrity ---');
    const metaCheck = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();
    assert(!!metaCheck, 'Real Meta production post 1405588742634526_122100337179498315 strictly intact');

  } finally {
    // Teardown test fixtures in strict FK order
    await db('billing_notifications').where({ tenant_id: testTenantId }).delete();
    await db('billing_dunning_events').where({ tenant_id: testTenantId }).delete();
    await db('billing_invoices').where({ tenant_id: testTenantId }).delete();
    await db('tenant_usage_counters').where({ tenant_id: testTenantId }).delete();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).delete();
    await db('tenant_users').where({ tenant_id: testTenantId }).delete();
    await db('brands').where({ tenant_id: testTenantId }).delete();
    await db('tenants').where({ id: testTenantId }).delete();
    await db('users').where({ id: testUserId }).delete();
  }

  console.log('\n================================================================');
  console.log(`STAGE 10 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
