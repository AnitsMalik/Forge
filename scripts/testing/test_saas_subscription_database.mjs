import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../apps/api/dist/db/connection.js';

console.log('========================================================================');
console.log('    STAGE 3: SAAS SUBSCRIPTION DATABASE TEST SUITE');
console.log('========================================================================\n');

let passedCount = 0;
let failedCount = 0;

async function test(id, name, fn) {
  try {
    process.stdout.write(`[Test ${String(id).padStart(2, ' ')}] ${name} ... `);
    await fn();
    console.log('✅ PASS');
    passedCount++;
  } catch (err) {
    console.log(`❌ FAIL\n  Error: ${err.message}`);
    failedCount++;
  }
}

async function runAll() {
  // Test 1: Subscription Plans Full Schema Verification
  await test(1, 'subscription_plans table schema & required fields', async () => {
    const [cols] = await db.raw('DESCRIBE subscription_plans');
    const colNames = cols.map(c => c.Field);

    const requiredFields = [
      'id',
      'name',
      'slug',
      'price',
      'currency',
      'billing_interval',
      'max_brands',
      'max_social_accounts',
      'max_posts_per_month',
      'max_users',
      'ai_tokens_monthly',
      'video_render_seconds_monthly',
      'storage_bytes_limit',
      'features',
      'is_active',
    ];

    for (const field of requiredFields) {
      assert.ok(colNames.includes(field), `subscription_plans must include column '${field}'`);
    }

    // Verify slug unique constraint
    let dupFailed = false;
    try {
      await db('subscription_plans').insert({
        id: 'dup_slug_test',
        name: 'Duplicate Slug Test',
        slug: 'free-trial', // Existing slug
        price: 10.00,
        currency: 'usd',
        billing_interval: 'month',
        created_at: new Date(),
        updated_at: new Date(),
      });
    } catch {
      dupFailed = true;
    }
    assert.strictEqual(dupFailed, true, 'Duplicate plan slug must be rejected by unique constraint');
  });

  // Test 2: Tenant Subscriptions Full Schema & Statuses
  await test(2, 'tenant_subscriptions table schema, provider fields & statuses', async () => {
    const [cols] = await db.raw('DESCRIBE tenant_subscriptions');
    const colNames = cols.map(c => c.Field);

    const requiredFields = [
      'id',
      'tenant_id',
      'plan_id',
      'status',
      'provider',
      'provider_customer_id',
      'provider_subscription_id',
      'current_period_start',
      'current_period_end',
      'trial_start_at',
      'trial_end_at',
      'cancel_at_period_end',
    ];

    for (const field of requiredFields) {
      assert.ok(colNames.includes(field), `tenant_subscriptions must include column '${field}'`);
    }

    // Test supported statuses
    const tenant = await db('tenants').first();
    assert.ok(tenant, 'Tenant must exist');

    const testSubId = crypto.randomUUID();
    const now = new Date();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const validStatuses = ['trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired'];
    for (const st of validStatuses) {
      // Temporary test row update or check
      await db('tenant_subscriptions')
        .where({ tenant_id: tenant.id })
        .update({ status: st, updated_at: now });

      const check = await db('tenant_subscriptions').where({ tenant_id: tenant.id }).first();
      assert.strictEqual(check.status, st, `Status '${st}' must be accepted`);
    }

    // Restore to active
    await db('tenant_subscriptions')
      .where({ tenant_id: tenant.id })
      .update({ status: 'active', updated_at: now });
  });

  // Test 3: Safe Grandfathered Legacy Subscriptions for Existing Tenants
  await test(3, 'Safe grandfathered legacy subscription verification for existing tenants', async () => {
    // Check legacy plan
    const legacyPlan = await db('subscription_plans').where({ id: 'legacy_agency_grandfathered' }).first();
    assert.ok(legacyPlan, 'legacy_agency_grandfathered plan must exist');
    assert.strictEqual(legacyPlan.is_active, 1);
    assert.ok(legacyPlan.max_brands >= 50);
    assert.ok(legacyPlan.max_social_accounts >= 250);

    // Verify all existing tenants have active subscriptions with future period_end
    const tenants = await db('tenants').select('id', 'name');
    const subscriptions = await db('tenant_subscriptions').select('*');

    assert.ok(subscriptions.length >= tenants.length, 'Every tenant must have an active subscription');

    const now = new Date();
    for (const sub of subscriptions) {
      assert.strictEqual(sub.status, 'active', `Subscription ${sub.id} must be active`);
      assert.ok(new Date(sub.current_period_end) > now, `Subscription ${sub.id} period_end must be in future`);
    }
  });

  // Test 4: Tenant Scoped Usage Counters Table
  await test(4, 'tenant_usage_counters schema and tenant scoping', async () => {
    const [cols] = await db.raw('DESCRIBE tenant_usage_counters');
    const colNames = cols.map(c => c.Field);

    const requiredFields = [
      'tenant_id',
      'period_month',
      'posts_created',
      'video_render_seconds',
      'ai_tokens_consumed',
      'storage_bytes_used',
    ];

    for (const field of requiredFields) {
      assert.ok(colNames.includes(field), `tenant_usage_counters must include column '${field}'`);
    }

    // Verify composite primary key
    const primaryCols = cols.filter(c => c.Key === 'PRI').map(c => c.Field);
    assert.ok(primaryCols.includes('tenant_id') && primaryCols.includes('period_month'), 'Primary key must be (tenant_id, period_month)');
  });

  // Test 5: Billing Events Table (billing_events)
  await test(5, 'billing_events table audit and tracking', async () => {
    const [cols] = await db.raw('DESCRIBE billing_events');
    const colNames = cols.map(c => c.Field);

    const requiredFields = ['id', 'tenant_id', 'event_type', 'provider', 'provider_event_id', 'payload', 'created_at'];
    for (const field of requiredFields) {
      assert.ok(colNames.includes(field), `billing_events must include column '${field}'`);
    }

    const tenant = await db('tenants').first();
    const eventId = crypto.randomUUID();
    const now = new Date();

    // Insert test billing event
    await db('billing_events').insert({
      id: eventId,
      tenant_id: tenant.id,
      event_type: 'subscription_created',
      provider: 'system',
      provider_event_id: `evt_${Date.now()}`,
      payload: JSON.stringify({ plan: 'agency_scale', source: 'migration' }),
      created_at: now,
    });

    const retrieved = await db('billing_events').where({ id: eventId }).first();
    assert.ok(retrieved, 'Billing event must be queryable');
    assert.strictEqual(retrieved.event_type, 'subscription_created');
    assert.strictEqual(retrieved.tenant_id, tenant.id);

    // Clean up test event
    await db('billing_events').where({ id: eventId }).del();
  });

  // Test 6: Billing Invoices Table (billing_invoices)
  await test(6, 'billing_invoices table schema, statuses & unique numbers', async () => {
    const [cols] = await db.raw('DESCRIBE billing_invoices');
    const colNames = cols.map(c => c.Field);

    const requiredFields = [
      'id',
      'tenant_id',
      'subscription_id',
      'invoice_number',
      'amount_due_cents',
      'amount_paid_cents',
      'currency',
      'status',
      'provider',
      'provider_invoice_id',
      'hosted_invoice_url',
      'invoice_pdf_url',
      'period_start',
      'period_end',
      'paid_at',
      'created_at',
      'updated_at',
    ];

    for (const field of requiredFields) {
      assert.ok(colNames.includes(field), `billing_invoices must include column '${field}'`);
    }

    const tenant = await db('tenants').first();
    const sub = await db('tenant_subscriptions').where({ tenant_id: tenant.id }).first();
    const invoiceId = crypto.randomUUID();
    const invoiceNum = `INV-${Date.now()}-TEST`;
    const now = new Date();

    // Insert test invoice
    await db('billing_invoices').insert({
      id: invoiceId,
      tenant_id: tenant.id,
      subscription_id: sub?.id || null,
      invoice_number: invoiceNum,
      amount_due_cents: 19900,
      amount_paid_cents: 19900,
      currency: 'usd',
      status: 'paid',
      provider: 'system',
      provider_invoice_id: `in_${Date.now()}`,
      hosted_invoice_url: 'https://billing.example.com/invoice/test',
      invoice_pdf_url: 'https://billing.example.com/invoice/test.pdf',
      period_start: now,
      period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      paid_at: now,
      created_at: now,
      updated_at: now,
    });

    const retrieved = await db('billing_invoices').where({ id: invoiceId }).first();
    assert.ok(retrieved, 'Invoice must be queryable');
    assert.strictEqual(retrieved.status, 'paid');
    assert.strictEqual(retrieved.amount_due_cents, 19900);

    // Verify duplicate invoice number rejection
    let dupInvoiceFailed = false;
    try {
      await db('billing_invoices').insert({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        invoice_number: invoiceNum, // Duplicate
        amount_due_cents: 1000,
        currency: 'usd',
        status: 'draft',
        provider: 'system',
        created_at: now,
        updated_at: now,
      });
    } catch {
      dupInvoiceFailed = true;
    }
    assert.strictEqual(dupInvoiceFailed, true, 'Duplicate invoice_number must be rejected');

    // Clean up test invoice
    await db('billing_invoices').where({ id: invoiceId }).del();
  });

  // Test 7: PCI-DSS Compliance & Card Data Audit
  await test(7, 'Security Audit: Zero credit card / PAN storage in database', async () => {
    const billingTables = ['subscription_plans', 'tenant_subscriptions', 'tenant_usage_counters', 'billing_events', 'billing_invoices'];
    const forbiddenColumns = ['card_number', 'pan', 'cvv', 'cvc', 'expiry', 'card_exp', 'cardholder_name', 'card_pin'];

    for (const tbl of billingTables) {
      const [cols] = await db.raw(`DESCRIBE ${tbl}`);
      const colNames = cols.map(c => c.Field.toLowerCase());
      for (const fc of forbiddenColumns) {
        assert.strictEqual(colNames.includes(fc), false, `Table ${tbl} must NEVER contain sensitive payment column '${fc}'`);
      }
    }
  });

  console.log('\n========================================================================');
  console.log(`STAGE 3 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log('========================================================================\n');

  await db.destroy();

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
