import http from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
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
  console.log('=====================================================');
  console.log('SOCIALFORGE STAGE 4 — HTTP API & MIDDLEWARE TEST');
  console.log('=====================================================\n');

  const testTenantId = crypto.randomUUID();
  const testUserId = crypto.randomUUID();
  const subId = crypto.randomUUID();

  try {
    await db('tenants').insert({
      id: testTenantId,
      name: 'API Entitlement Corp',
      slug: `api-entitlement-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: testUserId,
      email: `api_ent_${Date.now()}@test.com`,
      password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      full_name: 'API Entitlement Tester',
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

    // Subscribed to starter (max 2 brands) with active status
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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

    const token = jwt.sign(
      { userId: testUserId, tenantId: testTenantId, role: 'owner', isSuperAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    console.log('--- 1. Testing GET /api/v1/workspaces/entitlements ---');
    const res = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/workspaces/entitlements',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert(res.status === 200, 'GET /api/v1/workspaces/entitlements returns 200 OK');
    assert(res.body.success === true, 'Response indicates success: true');
    assert(res.body.data.subscription.planId === 'starter', 'Subscription plan is starter');
    assert(res.body.data.subscription.status === 'active', 'Subscription status is active');
    assert(res.body.data.entitlements.canCreateBrand.allowed === true, 'canCreateBrand is allowed');
    assert(res.body.data.entitlements.canCreateBrand.limit === 1, 'canCreateBrand limit is 1');
    assert(res.body.data.entitlements.canCreateBrand.remaining === 1, 'canCreateBrand remaining is 1');
    assert(res.body.data.entitlements.canConnectSocialAccount.limit === 3, 'canConnectSocialAccount limit is 3');

    console.log('\n--- 2. Testing Authoritative Middleware Enforcement on POST /api/v1/brands ---');
    // Create Brand 1 (Allowed: 1 of 1)
    const brandRes1 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/brands',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, { name: 'Brand 1', slug: `brand-1-${Date.now()}` });

    console.log('Brand 1 response status:', brandRes1.status, brandRes1.body);
    assert(brandRes1.status === 201, 'Brand 1 creation succeeds (201 Created)');

    // Create Brand 2 (Should be blocked by EntitlementService via enforcePlanLimit: limit 1 reached)
    const brandRes2 = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/brands',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, { name: 'Brand 2', slug: `brand-2-${Date.now()}` });

    console.log('Brand 2 response status:', brandRes2.status, brandRes2.body);
    assert(brandRes2.status === 403, 'Brand 2 creation rejected with 403 Forbidden');
    assert(brandRes2.body.error?.code === 'PLAN_LIMIT_EXCEEDED' || brandRes2.body.error?.code === 'ENTITLEMENT_LIMIT_EXCEEDED', 'Error code indicates plan limit exceeded');
    assert(brandRes2.body.error?.upgradeRequired === true, 'upgradeRequired flag is true');
    assert(brandRes2.body.error?.current === 1, 'Current count is 1');
    assert(brandRes2.body.error?.limit === 1, 'Limit is 1');
    assert(brandRes2.body.error?.remaining === 0, 'Remaining is 0');

    console.log('\n--- 3. Testing Middleware Rejection on Past Due / Expired Status ---');
    await db('tenant_subscriptions')
      .where({ id: subId })
      .update({ status: 'past_due' });

    // Test on brands route
    const pastDueBrandRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/brands',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, { name: 'Past Due Brand', slug: `past-due-${Date.now()}` });

    console.log('Past due brand response status:', pastDueBrandRes.status, pastDueBrandRes.body);
    assert(pastDueBrandRes.status === 403, 'Brand creation blocked on past_due subscription with 403');
    assert(pastDueBrandRes.body.error?.code === 'PLAN_LIMIT_EXCEEDED' || pastDueBrandRes.body.error?.code === 'ENTITLEMENT_LIMIT_EXCEEDED', 'Error code indicates plan limit exceeded');
    assert(pastDueBrandRes.body.error?.status === 'past_due', 'Error indicates past_due status');
    assert(pastDueBrandRes.body.error?.message.includes('past due'), 'Message mentions past due');

    // Test on posts route
    const pastDuePostRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/brands/${brandRes1.body.data.id}/posts`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, { title: 'Test Post', baseContent: 'Past due test post' });

    console.log('Past due post response status:', pastDuePostRes.status, pastDuePostRes.body);
    assert(pastDuePostRes.status === 403, 'Post creation blocked on past_due subscription with 403');
    assert(pastDuePostRes.body.error?.code === 'PLAN_LIMIT_EXCEEDED' || pastDuePostRes.body.error?.code === 'ENTITLEMENT_LIMIT_EXCEEDED', 'Error code indicates plan limit exceeded');
    assert(pastDuePostRes.body.error?.status === 'past_due', 'Error indicates past_due status');

    console.log('\n--- 4. Clean Up Test Data ---');
    await db('brands').where({ tenant_id: testTenantId }).del();
    await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
    await db('tenant_users').where({ tenant_id: testTenantId }).del();
    await db('users').where({ id: testUserId }).del();
    await db('tenants').where({ id: testTenantId }).del();
    console.log('✓ Cleaned up all test entities');

  } catch (err) {
    console.error('API Test error:', err);
    failed++;
  } finally {
    console.log('\n=====================================================');
    console.log(`API TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
