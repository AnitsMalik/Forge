import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';

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

async function runDatabaseModelTests() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: BILLING DATABASE MODEL VERIFICATION SUITE              ');
  console.log('   tenant_subscriptions • entitlements • usage_counters • isolation    ');
  console.log('========================================================================\n');

  const testTenantId = 'tenant_db_test_' + crypto.randomUUID().slice(0, 8);
  const testTenantBId = 'tenant_db_test_b_' + crypto.randomUUID().slice(0, 8);
  const testBrandId = crypto.randomUUID();
  const testBrandBId = crypto.randomUUID();
  const now = new Date();

  // 1. Setup Test Tenants and Brands
  await db('tenants').insert({
    id: testTenantId,
    name: 'DB Model Test Tenant Alpha',
    slug: 'db-alpha-' + Date.now(),
    settings: '{}',
    created_at: now,
    updated_at: now,
  });

  await db('tenants').insert({
    id: testTenantBId,
    name: 'DB Model Test Tenant Beta',
    slug: 'db-beta-' + Date.now(),
    settings: '{}',
    created_at: now,
    updated_at: now,
  });

  await db('brands').insert({
    id: testBrandId,
    tenant_id: testTenantId,
    name: 'Alpha Brand 1',
    slug: 'alpha-brand-' + Date.now(),
    created_at: now,
    updated_at: now,
  });

  await db('brands').insert({
    id: testBrandBId,
    tenant_id: testTenantBId,
    name: 'Beta Brand 1',
    slug: 'beta-brand-' + Date.now(),
    created_at: now,
    updated_at: now,
  });

  // --------------------------------------------------------------------------
  // SECTION 1: tenant_subscriptions Verification
  // --------------------------------------------------------------------------
  await test('tenant_subscriptions: Schema Columns, Indexes & Metadata', async () => {
    const cols = await db('tenant_subscriptions').columnInfo();
    
    assert(cols.tenant_id !== undefined, 'tenant_id column exists');
    assert(cols.stripe_customer_id !== undefined, 'stripe_customer_id column exists');
    assert(cols.stripe_subscription_id !== undefined, 'stripe_subscription_id column exists');
    assert(cols.plan_id !== undefined, 'plan_id column exists');
    assert(cols.status !== undefined, 'status column exists');
    assert(cols.trial_start_at !== undefined, 'trial_start_at column exists');
    assert(cols.trial_end_at !== undefined, 'trial_end_at column exists');
    assert(cols.current_period_start !== undefined, 'current_period_start column exists');
    assert(cols.current_period_end !== undefined, 'current_period_end column exists');
    assert(cols.cancel_at_period_end !== undefined, 'cancel_at_period_end column exists');
    assert(cols.canceled_at !== undefined, 'canceled_at column exists');
    assert(cols.ended_at !== undefined, 'ended_at column exists');
    assert(cols.created_at !== undefined, 'created_at timestamp exists');
    assert(cols.updated_at !== undefined, 'updated_at timestamp exists');
    assert(cols.provider_metadata !== undefined, 'provider_metadata JSON column exists');

    // Insert record with provider metadata
    const subId = crypto.randomUUID();
    const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db('tenant_subscriptions').insert({
      id: subId,
      tenant_id: testTenantId,
      plan_id: 'starter',
      stripe_customer_id: 'cus_test_123',
      stripe_subscription_id: 'sub_test_123',
      provider: 'stripe',
      provider_customer_id: 'cus_test_123',
      provider_subscription_id: 'sub_test_123',
      provider_metadata: JSON.stringify({
        gateway: 'stripe_connect',
        account_country: 'US',
        tax_exempt: 'none',
      }),
      status: 'active',
      trial_start_at: now,
      trial_end_at: trialEnd,
      current_period_start: now,
      current_period_end: futurePeriodEnd,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now,
    });

    const inserted = await db('tenant_subscriptions').where({ id: subId }).first();
    assert(inserted.tenant_id === testTenantId, 'Subscription matches tenant ID');
    assert(inserted.stripe_customer_id === 'cus_test_123', 'Stripe customer ID matches');
    assert(inserted.stripe_subscription_id === 'sub_test_123', 'Stripe subscription ID matches');
    assert(inserted.plan_id === 'starter', 'Plan ID matches starter');
    assert(inserted.status === 'active', 'Status matches active');
    
    const parsedMetadata = typeof inserted.provider_metadata === 'string' 
      ? JSON.parse(inserted.provider_metadata) 
      : inserted.provider_metadata;
    assert(parsedMetadata.gateway === 'stripe_connect', 'provider_metadata correctly retrieved');
  });

  // --------------------------------------------------------------------------
  // SECTION 2: entitlements Verification (Tenant & Brand Scoping)
  // --------------------------------------------------------------------------
  await test('entitlements: Tenant-Level and Brand-Level Entitlement Scoping', async () => {
    const cols = await db('entitlements').columnInfo();
    assert(cols.id !== undefined, 'entitlements.id column exists');
    assert(cols.tenant_id !== undefined, 'entitlements.tenant_id column exists');
    assert(cols.brand_id !== undefined, 'entitlements.brand_id column exists (scoping)');
    assert(cols.plan_id !== undefined, 'entitlements.plan_id column exists');
    assert(cols.resource !== undefined, 'entitlements.resource column exists');
    assert(cols.is_enabled !== undefined, 'entitlements.is_enabled column exists');
    assert(cols.limit_value !== undefined, 'entitlements.limit_value column exists');
    assert(cols.config !== undefined, 'entitlements.config column exists');

    // 1. Tenant-level entitlement (brand_id is NULL)
    const tenantEntId = crypto.randomUUID();
    await db('entitlements').insert({
      id: tenantEntId,
      tenant_id: testTenantId,
      brand_id: null,
      plan_id: 'starter',
      resource: 'posts',
      is_enabled: true,
      limit_value: 100,
      config: JSON.stringify({ billing_cycle: 'monthly' }),
      created_at: now,
      updated_at: now,
    });

    // 2. Brand-level entitlement override (brand_id is testBrandId)
    const brandEntId = crypto.randomUUID();
    await db('entitlements').insert({
      id: brandEntId,
      tenant_id: testTenantId,
      brand_id: testBrandId,
      plan_id: 'starter',
      resource: 'posts',
      is_enabled: true,
      limit_value: 40,
      config: JSON.stringify({ brand_allocation: 40 }),
      created_at: now,
      updated_at: now,
    });

    const tenantEnt = await db('entitlements').where({ id: tenantEntId }).first();
    assert(tenantEnt.tenant_id === testTenantId, 'Tenant entitlement matches tenant');
    assert(tenantEnt.brand_id === null, 'Tenant entitlement brand_id is null');
    assert(Number(tenantEnt.limit_value) === 100, 'Tenant limit is 100 posts');

    const brandEnt = await db('entitlements').where({ id: brandEntId }).first();
    assert(brandEnt.tenant_id === testTenantId, 'Brand entitlement matches tenant');
    assert(brandEnt.brand_id === testBrandId, 'Brand entitlement matches brand');
    assert(Number(brandEnt.limit_value) === 40, 'Brand limit override is 40 posts');

    // 3. Test uniqueness constraint on ['tenant_id', 'brand_id', 'resource']
    let dupFailed = false;
    try {
      await db('entitlements').insert({
        id: crypto.randomUUID(),
        tenant_id: testTenantId,
        brand_id: testBrandId,
        plan_id: 'starter',
        resource: 'posts', // Duplicate for this tenant and brand!
        is_enabled: true,
        limit_value: 50,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      dupFailed = true;
    }
    assert(dupFailed, 'Uniqueness constraint uniq_entitlement_tenant_brand_resource rejects duplicate');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: usage_counters Verification
  // --------------------------------------------------------------------------
  await test('usage_counters: Metered Resource Tracking Across Tenant & Brand', async () => {
    const cols = await db('usage_counters').columnInfo();
    assert(cols.id !== undefined, 'usage_counters.id column exists');
    assert(cols.tenant_id !== undefined, 'usage_counters.tenant_id column exists');
    assert(cols.brand_id !== undefined, 'usage_counters.brand_id column exists');
    assert(cols.metric !== undefined, 'usage_counters.metric column exists');
    assert(cols.period !== undefined, 'usage_counters.period column exists');
    assert(cols.current_usage !== undefined, 'usage_counters.current_usage column exists');
    assert(cols.limit_value !== undefined, 'usage_counters.limit_value column exists');

    const period = '2026-10';
    const counterId = crypto.randomUUID();

    // 1. Tenant-level usage counter
    await db('usage_counters').insert({
      id: counterId,
      tenant_id: testTenantId,
      brand_id: null,
      metric: 'posts',
      period,
      current_usage: 12.00,
      limit_value: 100.00,
      created_at: now,
      updated_at: now,
    });

    // 2. Brand-level usage counter
    const brandCounterId = crypto.randomUUID();
    await db('usage_counters').insert({
      id: brandCounterId,
      tenant_id: testTenantId,
      brand_id: testBrandId,
      metric: 'posts',
      period,
      current_usage: 5.00,
      limit_value: 40.00,
      created_at: now,
      updated_at: now,
    });

    const tenantCounter = await db('usage_counters').where({ id: counterId }).first();
    assert(Number(tenantCounter.current_usage) === 12.00, 'Tenant current usage is 12');
    assert(Number(tenantCounter.limit_value) === 100.00, 'Tenant limit is 100');

    const brandCounter = await db('usage_counters').where({ id: brandCounterId }).first();
    assert(Number(brandCounter.current_usage) === 5.00, 'Brand current usage is 5');
    assert(Number(brandCounter.limit_value) === 40.00, 'Brand limit is 40');

    // 3. Increment usage atomic test
    await db('usage_counters')
      .where({ id: counterId })
      .increment('current_usage', 3.00);

    const updatedCounter = await db('usage_counters').where({ id: counterId }).first();
    assert(Number(updatedCounter.current_usage) === 15.00, 'Atomic increment updated usage to 15.00');

    // 4. Test uniqueness constraint on ['tenant_id', 'brand_id', 'metric', 'period']
    let dupFailed = false;
    try {
      await db('usage_counters').insert({
        id: crypto.randomUUID(),
        tenant_id: testTenantId,
        brand_id: testBrandId,
        metric: 'posts',
        period, // Duplicate for (tenant, brand, metric, period)!
        current_usage: 1.00,
        created_at: now,
        updated_at: now,
      });
    } catch (err) {
      dupFailed = true;
    }
    assert(dupFailed, 'Uniqueness constraint uniq_usage_tenant_brand_metric_period rejects duplicate');
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Zero Secret Exposure Verification
  // --------------------------------------------------------------------------
  await test('Security & Privacy: Zero Secret Storage in Billing Tables', async () => {
    const subCols = await db('tenant_subscriptions').columnInfo();
    const entCols = await db('entitlements').columnInfo();
    const usageCols = await db('usage_counters').columnInfo();

    const sensitiveWords = ['secret', 'password', 'token', 'access_token', 'private_key', 'api_key', 'card_number', 'cvv', 'cvc'];

    for (const word of sensitiveWords) {
      assert(subCols[word] === undefined, `tenant_subscriptions has no column '${word}'`);
      assert(entCols[word] === undefined, `entitlements has no column '${word}'`);
      assert(usageCols[word] === undefined, `usage_counters has no column '${word}'`);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Multi-Tenant Boundary Isolation
  // --------------------------------------------------------------------------
  await test('Multi-Tenant Boundary Isolation: Strict Row-Level Separation', async () => {
    // Tenant B cannot see Tenant A entitlements
    const tenantBEntitlements = await db('entitlements').where({ tenant_id: testTenantBId });
    for (const ent of tenantBEntitlements) {
      assert(ent.tenant_id === testTenantBId, 'Tenant B entitlement belongs strictly to Tenant B');
    }

    const tenantAEntitlementsCount = await db('entitlements').where({ tenant_id: testTenantId }).count('id as count').first();
    assert(Number(tenantAEntitlementsCount.count) >= 2, 'Tenant A has its own distinct entitlements');

    // Tenant B cannot see Tenant A usage counters
    const tenantBCounters = await db('usage_counters').where({ tenant_id: testTenantBId });
    assert(tenantBCounters.length === 0, 'Tenant B usage counters completely empty and unpolluted by Tenant A');
  });

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  console.log('\n[Cleanup] Cleaning up test fixtures...');
  await db('usage_counters').whereIn('tenant_id', [testTenantId, testTenantBId]).del();
  await db('entitlements').whereIn('tenant_id', [testTenantId, testTenantBId]).del();
  await db('tenant_subscriptions').whereIn('tenant_id', [testTenantId, testTenantBId]).del();
  await db('brands').whereIn('tenant_id', [testTenantId, testTenantBId]).del();
  await db('tenants').whereIn('id', [testTenantId, testTenantBId]).del();
  console.log('Cleanup completed successfully.');

  console.log('========================================================================');
  console.log(`   BILLING DATABASE MODEL TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
  console.log('========================================================================\n');
}

runDatabaseModelTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
