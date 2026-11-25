import assert from 'node:assert';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { UsageTrackerService } from '../apps/api/dist/services/usageTracker.service.js';
import { config } from '../apps/api/dist/config/index.js';

const API_BASE = 'http://localhost:4000/api/v1';

console.log('========================================================================');
console.log('    STAGE 2: MULTI-TENANT WORKSPACES & QUOTA ENGINE TEST SUITE');
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
  // Test 1: Direct social_accounts.tenant_id verification
  await test(1, 'Direct social_accounts.tenant_id integrity & indexing', async () => {
    const accounts = await db('social_accounts')
      .join('brands', 'social_accounts.brand_id', 'brands.id')
      .select('social_accounts.id', 'social_accounts.tenant_id as sa_tenant', 'brands.tenant_id as brand_tenant');

    assert.ok(accounts.length > 0, 'Social accounts must exist');
    for (const a of accounts) {
      assert.ok(a.sa_tenant, `Account ${a.id} must have non-null tenant_id`);
      assert.strictEqual(a.sa_tenant, a.brand_tenant, `Account ${a.id} tenant_id must match brand tenant_id`);
    }

    // Direct tenant_id query without join
    const directQuery = await db('social_accounts')
      .where({ tenant_id: accounts[0].sa_tenant })
      .select('id', 'platform');
    assert.ok(directQuery.length > 0, 'Direct query by tenant_id should succeed');
  });

  // Test 2: Subscription Plans Schema & Tiers
  await test(2, 'Subscription plans schema and seeded tiers', async () => {
    const plans = await db('subscription_plans').select('*');
    assert.ok(plans.length >= 4, `Must have at least 4 seeded plans, found ${plans.length}`);

    const planIds = plans.map(p => p.id);
    assert.ok(planIds.includes('free_trial'));
    assert.ok(planIds.includes('starter'));
    assert.ok(planIds.includes('growth'));
    assert.ok(planIds.includes('agency_scale'));

    const freeTrial = plans.find(p => p.id === 'free_trial');
    assert.strictEqual(freeTrial.max_brands, 1);
    assert.strictEqual(freeTrial.max_posts_per_month, 20);

    const agency = plans.find(p => p.id === 'agency_scale');
    assert.strictEqual(agency.max_brands, 25);
    assert.strictEqual(agency.max_posts_per_month, 2500);
  });

  // Test 3: Tenant Subscriptions Backfill
  await test(3, 'Existing tenants backfilled to active subscriptions', async () => {
    const tenants = await db('tenants').select('id');
    const subs = await db('tenant_subscriptions').select('*');

    assert.ok(subs.length >= tenants.length, 'Every tenant must have a subscription record');
    for (const s of subs) {
      assert.strictEqual(s.status, 'active');
      assert.ok(s.current_period_end > new Date(), 'Period end must be in future');
    }
  });

  // Test 4: Atomic Usage Counter Increments
  await test(4, 'UsageTrackerService atomic counter increment', async () => {
    const tenant = await db('tenants').first();
    assert.ok(tenant, 'Tenant must exist');
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();

    // Reset counter for clean test
    await db('tenant_usage_counters')
      .where({ tenant_id: tenant.id, period_month: periodMonth })
      .del();

    await UsageTrackerService.recordUsage(tenant.id, 'posts_created', 3);
    await UsageTrackerService.recordUsage(tenant.id, 'posts_created', 4);

    const row = await db('tenant_usage_counters')
      .where({ tenant_id: tenant.id, period_month: periodMonth })
      .first();

    assert.ok(row, 'Counter row must be created');
    assert.strictEqual(row.posts_created, 7, `Expected 7 posts_created, found ${row.posts_created}`);
  });

  // Test 5: Plan Limit Enforcement Middleware (enforcePlanLimit)
  await test(5, 'Plan limit enforcement blocks resource creation when limit exceeded', async () => {
    const testTenantId = crypto.randomUUID();
    const testUserId = crypto.randomUUID();
    const now = new Date();

    // Setup isolated test tenant with free_trial plan (limit: 1 brand)
    await db('tenants').insert({
      id: testTenantId,
      name: 'Quota Test Tenant',
      slug: `quota-test-${Date.now()}`,
      settings: '{}',
      created_at: now,
      updated_at: now,
    });

    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      plan_id: 'free_trial',
      status: 'active',
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now,
    });

    await db('users').insert({
      id: testUserId,
      email: `quota-user-${Date.now()}@example.com`,
      password_hash: 'dummy_hash',
      full_name: 'Quota User',
      is_active: true,
      token_version: 1,
      created_at: now,
      updated_at: now,
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      user_id: testUserId,
      role: 'agency_admin',
      created_at: now,
      updated_at: now,
    });

    // Create a valid auth token for test user
    const token = jwt.sign(
      {
        userId: testUserId,
        email: `quota-user-${Date.now()}@example.com`,
        tenantId: testTenantId,
        role: 'agency_admin',
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    // 1st Brand creation -> Should succeed (limit is 1, current is 0)
    const brand1Res = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Brand One',
        slug: `brand-one-${Date.now()}`,
      }),
    });

    const brand1Json = await brand1Res.json();
    assert.strictEqual(brand1Res.status, 201, `First brand must succeed: ${JSON.stringify(brand1Json)}`);

    // 2nd Brand creation -> Must be blocked by enforcePlanLimit with HTTP 403
    const brand2Res = await fetch(`${API_BASE}/brands`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Brand Two',
        slug: `brand-two-${Date.now()}`,
      }),
    });

    const brand2Json = await brand2Res.json();
    assert.strictEqual(brand2Res.status, 403, `Second brand must be blocked with HTTP 403: ${JSON.stringify(brand2Json)}`);
    assert.strictEqual(brand2Json.error.code, 'PLAN_LIMIT_EXCEEDED');
    assert.strictEqual(brand2Json.error.upgradeRequired, true);
    assert.strictEqual(brand2Json.error.currentUsage, 1);
    assert.strictEqual(brand2Json.error.limit, 1);

    // Clean up test records
    await db('brands').where({ tenant_id: testTenantId }).del();
    await db('tenant_users').where({ tenant_id: testTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
    await db('tenants').where({ id: testTenantId }).del();
    await db('users').where({ id: testUserId }).del();
  });

  // Test 6: Workspaces List Endpoint
  await test(6, 'GET /api/v1/workspaces returns authorized tenants with plan details', async () => {
    // Authenticate existing active user with tenant membership
    const membership = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('users.is_active', true)
      .select('tenant_users.*', 'users.email', 'users.token_version')
      .first();

    const token = jwt.sign(
      {
        userId: membership.user_id,
        email: membership.email,
        tenantId: membership.tenant_id,
        role: membership.role,
        tokenVersion: membership.token_version,
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const res = await fetch(`${API_BASE}/workspaces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.workspaces), 'workspaces must be array');
    assert.ok(json.data.workspaces.length >= 1, 'User must belong to at least 1 workspace');
    assert.strictEqual(json.data.activeTenantId, membership.tenant_id);

    const activeWs = json.data.workspaces.find(w => w.isActive);
    assert.ok(activeWs, 'Active workspace must be marked');
    assert.ok(activeWs.planName, 'Workspace must display plan name');
  });

  // Test 7: Workspace Switching (switchWorkspace)
  await test(7, 'POST /api/v1/workspaces/switch validates membership and issues new scoped token', async () => {
    const membership = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('users.is_active', true)
      .select('tenant_users.*', 'users.email', 'users.token_version')
      .first();

    // Create a secondary workspace and add user to it
    const secondTenantId = crypto.randomUUID();
    const now = new Date();
    await db('tenants').insert({
      id: secondTenantId,
      name: 'Secondary Agency Workspace',
      slug: `secondary-ws-${Date.now()}`,
      settings: '{}',
      created_at: now,
      updated_at: now,
    });
    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: secondTenantId,
      plan_id: 'growth',
      status: 'active',
      current_period_start: now,
      current_period_end: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now,
    });
    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: secondTenantId,
      user_id: membership.user_id,
      role: 'brand_manager',
      created_at: now,
      updated_at: now,
    });

    const token = jwt.sign(
      {
        userId: membership.user_id,
        email: membership.email,
        tenantId: membership.tenant_id,
        role: membership.role,
        tokenVersion: membership.token_version,
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    // Switch to second workspace
    const switchRes = await fetch(`${API_BASE}/workspaces/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId: secondTenantId }),
    });

    const switchJson = await switchRes.json();
    assert.strictEqual(switchRes.status, 200);
    assert.strictEqual(switchJson.success, true);
    assert.strictEqual(switchJson.data.activeWorkspace.id, secondTenantId);
    assert.strictEqual(switchJson.data.activeWorkspace.role, 'brand_manager');

    // Verify newly issued token
    const newDecoded = jwt.verify(switchJson.data.accessToken, config.jwtSecret);
    assert.strictEqual(newDecoded.tenantId, secondTenantId);
    assert.strictEqual(newDecoded.role, 'brand_manager');

    // Attempt to switch to an unauthorized tenant
    const unauthorizedTenantId = crypto.randomUUID();
    const unauthRes = await fetch(`${API_BASE}/workspaces/switch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenantId: unauthorizedTenantId }),
    });
    assert.strictEqual(unauthRes.status, 403, 'Must reject unauthorized tenant switch with 403');

    // Clean up secondary workspace
    await db('tenant_users').where({ tenant_id: secondTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: secondTenantId }).del();
    await db('tenants').where({ id: secondTenantId }).del();
  });

  // Test 8: Workspace Quota Breakdown Endpoint
  await test(8, 'GET /api/v1/workspaces/quota returns comprehensive usage limits', async () => {
    const membership = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where('users.is_active', true)
      .select('tenant_users.*', 'users.email', 'users.token_version')
      .first();

    const token = jwt.sign(
      {
        userId: membership.user_id,
        email: membership.email,
        tenantId: membership.tenant_id,
        role: membership.role,
        tokenVersion: membership.token_version,
      },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const res = await fetch(`${API_BASE}/workspaces/quota`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    const data = json.data;

    assert.ok(data.plan.name, 'Plan name must be present');
    assert.ok(data.usage.brands, 'Brands quota must be present');
    assert.ok(data.usage.socialAccounts, 'Social accounts quota must be present');
    assert.ok(data.usage.monthlyPosts, 'Monthly posts quota must be present');
    assert.ok(data.usage.monthlyVideoSeconds, 'Monthly video quota must be present');
    assert.ok(data.usage.monthlyAiTokens, 'Monthly AI tokens quota must be present');

    assert.strictEqual(typeof data.usage.brands.current, 'number');
    assert.strictEqual(typeof data.usage.brands.limit, 'number');
    assert.strictEqual(typeof data.usage.brands.remaining, 'number');
  });

  console.log('\n========================================================================');
  console.log(`STAGE 2 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
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
