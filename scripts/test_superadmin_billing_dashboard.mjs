import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';

const uuidv4 = () => crypto.randomUUID();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = config.jwtSecret;

async function main() {
  console.log('========================================================================');
  console.log('SOCIALFORGE — SUPERADMIN BILLING & REVENUE ANALYTICS VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Test Tenants & Users (Standard Admin vs Superadmin)
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning standard tenant user and platform superadmin fixtures...');
    const testTenantId = uuidv4();
    const standardUserId = uuidv4();
    const superadminUserId = uuidv4();

    // Insert tenant
    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [testTenantId, 'Test Tenant For Admin Metrics', `test-adm-${Date.now()}`]
    );

    // Fetch existing plan to attach to test tenant
    const [plans] = await connection.execute(`SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1`);
    const planId = plans[0]?.id || 'starter';

    const subId = uuidv4();
    await connection.execute(
      `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 'stripe', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW())`,
      [subId, testTenantId, planId]
    );

    // Insert Standard User (is_superadmin = 0)
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Standard Admin', 0, 1, NOW(), NOW())`,
      [standardUserId, `std.admin.${Date.now()}@example.com`]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), testTenantId, standardUserId]
    );

    // Insert Superadmin User (is_superadmin = 1)
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Global Superadmin', 1, 1, NOW(), NOW())`,
      [superadminUserId, `superadmin.${Date.now()}@socialforge.io`]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), testTenantId, superadminUserId]
    );

    // Issue tokens
    const signToken = (userId, tenantId, role, isSuperAdmin = false) => {
      return jwt.sign(
        {
          userId,
          tenantId,
          role,
          email: `${role}@test.com`,
          isSuperAdmin,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    };

    const tokenStandard = signToken(standardUserId, testTenantId, 'admin', false);
    const tokenSuperadmin = signToken(superadminUserId, testTenantId, 'owner', true);

    // -------------------------------------------------------------------------
    // 2. Test: Security & Authorization Protection
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Security: Unauthenticated request rejection...');
    const unauthRes = await fetch(`${API_BASE}/admin/billing/metrics`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives HTTP 401 Unauthorized');

    console.log('\n[Test 2] Security: Non-superadmin access rejection...');
    const nonAdminRes = await fetch(`${API_BASE}/admin/billing/metrics`, {
      headers: { Authorization: `Bearer ${tokenStandard}` },
    });
    assert(nonAdminRes.status === 403, 'Non-superadmin receives HTTP 403 Forbidden');
    const nonAdminJson = await nonAdminRes.json();
    assert(
      nonAdminJson.error?.code === 'FORBIDDEN',
      `Error code is FORBIDDEN (got "${nonAdminJson.error?.code}")`
    );

    // -------------------------------------------------------------------------
    // 3. Test: Superadmin Access to Financial Metrics & KPIs
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Superadmin Metrics Retrieval (MRR, ARR, Churn, Plan Distribution)...');
    const metricsRes = await fetch(`${API_BASE}/admin/billing/metrics`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(metricsRes.status === 200, 'Superadmin metrics request receives HTTP 200 OK');
    const metricsJson = await metricsRes.json();
    assert(metricsJson.success === true, 'Response payload success is true');

    const data = metricsJson.data;
    assert(typeof data.mrrCents === 'number' && data.mrrCents >= 0, `MRR in cents returned (${data.mrrCents})`);
    assert(typeof data.mrrFormatted === 'string' && data.mrrFormatted.startsWith('$'), `MRR formatted correctly ("${data.mrrFormatted}")`);
    assert(data.arrCents === data.mrrCents * 12, `ARR is strictly 12x MRR (${data.arrCents})`);
    assert(typeof data.arrFormatted === 'string', `ARR formatted correctly ("${data.arrFormatted}")`);
    assert(typeof data.activeSubscriptions === 'number', `Active subscriptions counted (${data.activeSubscriptions})`);
    assert(typeof data.totalTenants === 'number' && data.totalTenants > 0, `Total tenants counted (${data.totalTenants})`);
    assert(typeof data.paidConversionRate === 'number', `Paid conversion rate calculated (${data.paidConversionRate}%)`);
    assert(typeof data.churnRate === 'number', `Churn rate calculated (${data.churnRate}%)`);
    assert(typeof data.arpuCents === 'number', `ARPU in cents calculated (${data.arpuCents})`);
    assert(typeof data.ltvCents === 'number', `LTV in cents calculated (${data.ltvCents})`);
    assert(Array.isArray(data.planDistribution), 'Plan distribution returned as array');
    assert(data.planDistribution.length > 0, `Plan distribution has ${data.planDistribution.length} tier(s)`);
    assert(Array.isArray(data.statusDistribution), 'Status distribution returned as array');

    // -------------------------------------------------------------------------
    // 4. Test: Revenue History Trend Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Superadmin Revenue History Endpoint...');
    const historyRes = await fetch(`${API_BASE}/admin/billing/revenue-history?months=6`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(historyRes.status === 200, 'Revenue history request receives HTTP 200 OK');
    const historyJson = await historyRes.json();
    assert(historyJson.success === true, 'Revenue history payload success is true');
    assert(Array.isArray(historyJson.data), 'Revenue history data is an array');
    assert(historyJson.data.length === 6, `Revenue history contains 6 monthly data points (got ${historyJson.data.length})`);
    
    const samplePoint = historyJson.data[historyJson.data.length - 1];
    assert(typeof samplePoint.month === 'string', `Point contains month key ("${samplePoint.month}")`);
    assert(typeof samplePoint.monthLabel === 'string', `Point contains human label ("${samplePoint.monthLabel}")`);
    assert(typeof samplePoint.revenueCents === 'number', `Point contains revenue in cents (${samplePoint.revenueCents})`);
    assert(typeof samplePoint.revenueFormatted === 'string', `Point contains formatted revenue ("${samplePoint.revenueFormatted}")`);

    // -------------------------------------------------------------------------
    // 5. Test: Global Cross-Tenant Subscriptions Roster
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Superadmin Cross-Tenant Subscriptions Roster...');
    const subsRes = await fetch(`${API_BASE}/admin/billing/subscriptions?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(subsRes.status === 200, 'Global subscriptions roster request receives HTTP 200 OK');
    const subsJson = await subsRes.json();
    assert(subsJson.success === true, 'Subscriptions roster payload success is true');
    assert(Array.isArray(subsJson.data.items), 'Items is an array');
    assert(typeof subsJson.data.total === 'number' && subsJson.data.total > 0, `Total items reported (${subsJson.data.total})`);
    assert(subsJson.data.page === 1, 'Page number is 1');
    assert(subsJson.data.limit === 10, 'Page limit is 10');

    const sampleSub = subsJson.data.items[0];
    assert(typeof sampleSub.tenantId === 'string', 'Item contains tenantId');
    assert(typeof sampleSub.tenantName === 'string', `Item contains tenantName ("${sampleSub.tenantName}")`);
    assert(typeof sampleSub.planName === 'string', `Item contains planName ("${sampleSub.planName}")`);
    assert(typeof sampleSub.status === 'string', `Item contains status ("${sampleSub.status}")`);
    assert(typeof sampleSub.price === 'number', `Item contains price (${sampleSub.price})`);

    // -------------------------------------------------------------------------
    // 6. Test: Global Cross-Tenant Billing Audit Logs
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Superadmin Global Billing Audit Logs...');
    const auditRes = await fetch(`${API_BASE}/admin/billing/audit-logs?limit=25`, {
      headers: { Authorization: `Bearer ${tokenSuperadmin}` },
    });
    assert(auditRes.status === 200, 'Global audit logs request receives HTTP 200 OK');
    const auditJson = await auditRes.json();
    assert(auditJson.success === true, 'Audit logs payload success is true');
    assert(Array.isArray(auditJson.data), 'Audit logs data is an array');

    // -------------------------------------------------------------------------
    // 7. Test: Production Meta Publication Integrity Lock
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Verifying Production Meta Publication Lock...');
    const [metaVariants] = await connection.execute(
      `SELECT remote_post_id, status FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(metaVariants.length === 1, 'Real Meta production post variant strictly exists in database');
    assert(metaVariants[0].status === 'published', 'Real Meta production post variant status is "published"');

    // -------------------------------------------------------------------------
    // 8. Cleanup
    // -------------------------------------------------------------------------
    console.log('[Cleanup] Completed cleanly.');

  } finally {
    try {
      if (testTenantId) {
        await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id = ?`, [testTenantId]);
        await connection.execute(`DELETE FROM tenant_users WHERE tenant_id = ?`, [testTenantId]);
        await connection.execute(`DELETE FROM users WHERE id IN (?, ?)`, [standardUserId, superadminUserId]);
        await connection.execute(`DELETE FROM tenants WHERE id = ?`, [testTenantId]);
      }
    } catch (cleanErr) {
      // Ignored
    }
    await connection.end();
  }

  console.log('\n========================================================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
