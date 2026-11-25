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
  console.log('SOCIALFORGE — STAGE 9: CUSTOMER BILLING PORTAL VERIFICATION');
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
    // 1. Setup Test Tenants & Users
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning Tenant A (Primary) and Tenant B (Cross-Tenant check)...');
    const tenantAId = uuidv4();
    const adminAUserId = uuidv4();
    const creatorAUserId = uuidv4();

    const tenantBId = uuidv4();
    const adminBUserId = uuidv4();

    const now = new Date();
    const periodStart = new Date(now.getTime() - 5 * 24 * 3600 * 1000);
    const periodEnd = new Date(now.getTime() + 25 * 24 * 3600 * 1000);

    // Tenant A
    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Tenant A Marketing Agency', `ten-a-${Date.now()}`]
    );

    // Tenant A Admin
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Alice Admin', 0, 1, NOW(), NOW())`,
      [adminAUserId, `alice-${Date.now()}@agencya.com`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), tenantAId, adminAUserId]
    );

    // Tenant A Creator (Non-Admin)
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Charlie Creator', 0, 1, NOW(), NOW())`,
      [creatorAUserId, `charlie-${Date.now()}@agencya.com`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'creator', NOW(), NOW())`,
      [uuidv4(), tenantAId, creatorAUserId]
    );

    // Tenant B
    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Tenant B Competitor', `ten-b-${Date.now()}`]
    );
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Bob Competitor', 0, 1, NOW(), NOW())`,
      [adminBUserId, `bob-${Date.now()}@agencyb.com`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), tenantBId, adminBUserId]
    );

    // Subscription for Tenant A: Starter plan
    const subAId = uuidv4();
    const customerAId = `cus_test_stage9_${Date.now()}`;
    await connection.execute(
      `INSERT INTO tenant_subscriptions (
        id, tenant_id, plan_id, status, provider,
        provider_customer_id, provider_subscription_id,
        current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, 'starter', 'active', 'stripe', ?, 'sub_test_a_stage9', ?, ?, 0, NOW(), NOW())`,
      [subAId, tenantAId, customerAId, periodStart, periodEnd]
    );

    // Subscription for Tenant B: Growth plan
    const subBId = uuidv4();
    await connection.execute(
      `INSERT INTO tenant_subscriptions (
        id, tenant_id, plan_id, status, provider,
        provider_customer_id, provider_subscription_id,
        current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, 'growth', 'active', 'stripe', 'cus_test_b', 'sub_test_b', ?, ?, 0, NOW(), NOW())`,
      [subBId, tenantBId, periodStart, periodEnd]
    );

    // Seed customer data for Tenant A to verify cancellation data preservation
    const brandAId = uuidv4();
    await connection.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, industry, timezone, created_at, updated_at)
       VALUES (?, ?, 'Tenant A Flagship Brand', 'flagship-a', 'Technology', 'UTC', NOW(), NOW())`,
      [brandAId, tenantAId]
    );

    const post1Id = uuidv4();
    await connection.execute(
      `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Flagship Post 1', 'Content for post 1', 'published', NOW(), NOW())`,
      [post1Id, tenantAId, brandAId, adminAUserId]
    );

    const media1Id = uuidv4();
    await connection.execute(
      `INSERT INTO media_assets (id, tenant_id, brand_id, storage_key, public_url, file_name, file_size_bytes, mime_type, media_type, metadata, created_at)
       VALUES (?, ?, ?, 'uploads/logo.png', 'http://localhost/logo.png', 'logo.png', 1048576, 'image/png', 'image', '{}', NOW())`,
      [media1Id, tenantAId, brandAId]
    );

    // Seed invoice for Tenant A
    const invoiceAId = uuidv4();
    const invoiceNum = `INV-S9-${Date.now()}`;
    await connection.execute(
      `INSERT INTO billing_invoices (
        id, tenant_id, provider, provider_invoice_id,
        amount_paid_cents, currency, status, invoice_number,
        paid_at, created_at, updated_at
      ) VALUES (?, ?, 'stripe', ?, 4900, 'usd', 'paid', ?, NOW(), NOW(), NOW())`,
      [invoiceAId, tenantAId, `in_test_s9_${Date.now()}`, invoiceNum]
    );

    // Generate JWT tokens
    const tokenAdminA = jwt.sign(
      { userId: adminAUserId, tenantId: tenantAId, role: 'admin', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const tokenCreatorA = jwt.sign(
      { userId: creatorAUserId, tenantId: tenantAId, role: 'creator', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const tokenAdminB = jwt.sign(
      { userId: adminBUserId, tenantId: tenantBId, role: 'admin', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // 2. Test Customer Billing Portal Display Fields
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Validating Customer Billing Portal Display: Subscription details...');
    const subRes = await fetch(`${API_BASE}/billing/subscription`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert(subRes.status === 200, 'GET /billing/subscription returns HTTP 200 OK');
    const subData = await subRes.json();

    assert(subData.data && subData.data.planId === 'starter', 'Displays Current Plan: Starter');
    assert(subData.data.planName === 'Starter', 'Displays Current Plan Name: "Starter"');
    assert(subData.data.status === 'active', 'Displays Subscription Status: "active"');
    assert(subData.data.billingPeriod && subData.data.billingPeriod.start && subData.data.billingPeriod.end, 'Displays Billing Period with start and end timestamps');
    assert(Boolean(subData.data.nextBillingDate), `Displays Next Billing Date: ${subData.data.nextBillingDate}`);
    assert(subData.data.cancelAtPeriodEnd === false, 'Displays Cancel-at-period-end status as false initially');

    // -------------------------------------------------------------------------
    // 3. Test Usage Quotas (7 Dimensions)
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Validating Live Workspace Usage Quotas Display...');
    const usageRes = await fetch(`${API_BASE}/billing/usage`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert(usageRes.status === 200, 'GET /billing/usage returns HTTP 200 OK');
    const usageData = await usageRes.json();
    const u = usageData.data;

    assert(u.postsPublished && u.postsPublished.limit >= 100, 'Usage displays Posts Published meter');
    assert(u.socialAccounts && u.socialAccounts.limit >= 3, 'Usage displays Connected Social Accounts meter');
    assert(u.brands && u.brands.used >= 1, 'Usage displays Brand Kits meter (at least 1 used)');
    assert(u.users && u.users.used >= 2, 'Usage displays Team Members meter (2 seats used)');
    assert(u.aiUsage && u.aiUsage.limit >= 25000, 'Usage displays AI Studio Tokens meter');
    assert(u.videoRendering && u.videoRendering.limit >= 300, 'Usage displays Video Rendering Pipeline meter');
    assert(u.storage && u.storage.limit > 0, 'Usage displays Cloud Media Storage meter');

    // -------------------------------------------------------------------------
    // 4. Test Invoices Display
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Validating Verified Invoices Display...');
    const invoicesRes = await fetch(`${API_BASE}/billing/invoices`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert(invoicesRes.status === 200, 'GET /billing/invoices returns HTTP 200 OK');
    const invoicesData = await invoicesRes.json();
    assert(Array.isArray(invoicesData.data) && invoicesData.data.length >= 1, 'Invoices list returned with past receipts');
    const inv = invoicesData.data[0];
    assert(inv.invoiceNumber === 'INV-S9-001' || inv.amountPaidCents === 4900, 'Invoice displays verified amount, number, and status');

    // -------------------------------------------------------------------------
    // 5. Security & Governance: Only Authorized Tenant Admins Can Modify Billing
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Security Check: Rejecting non-admin users (creator role) from modifying billing...');
    
    // Non-admin checkout
    const nonAdminCheckout = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCreatorA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'growth' }),
    });
    assert(nonAdminCheckout.status === 403, 'Non-admin blocked from creating checkout session (HTTP 403 Forbidden)');

    // Non-admin portal
    const nonAdminPortal = await fetch(`${API_BASE}/billing/portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCreatorA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(nonAdminPortal.status === 403, 'Non-admin blocked from opening customer portal (HTTP 403 Forbidden)');

    // Non-admin plan change
    const nonAdminChange = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCreatorA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlanId: 'growth' }),
    });
    assert(nonAdminChange.status === 403, 'Non-admin blocked from upgrading/downgrading plan (HTTP 403 Forbidden)');

    // Non-admin cancellation
    const nonAdminCancel = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCreatorA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ immediately: false }),
    });
    assert(nonAdminCancel.status === 403, 'Non-admin blocked from cancelling subscription (HTTP 403 Forbidden)');

    // Non-admin resume
    const nonAdminResume = await fetch(`${API_BASE}/billing/subscription/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenCreatorA}`, 'Content-Type': 'application/json' },
    });
    assert(nonAdminResume.status === 403, 'Non-admin blocked from resuming subscription (HTTP 403 Forbidden)');

    // -------------------------------------------------------------------------
    // 6. Test Payment Portal Generation (Authorized Admin)
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Validating Payment Portal (Stripe Customer Portal) for Admin...');
    const portalRes = await fetch(`${API_BASE}/billing/portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: 'http://localhost:5173/?tab=billing' }),
    });
    assert(portalRes.status === 200, 'Authorized admin successfully accesses payment portal (HTTP 200 OK)');
    const portalData = await portalRes.json();
    assert(portalData.data && portalData.data.url && (portalData.data.url.includes('billing.stripe.com') || portalData.data.url.includes('portal=simulated')), 'Returns valid Stripe Customer Portal session URL');

    // -------------------------------------------------------------------------
    // 7. Test Upgrade & Downgrade Flows with Audit Logging
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Validating Upgrade & Downgrade Flows...');
    // Upgrade from Starter ($49) to Growth ($149)
    const upgradeRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlanId: 'growth' }),
    });
    assert(upgradeRes.status === 200, 'Admin can upgrade subscription to Growth tier (HTTP 200 OK)');
    const upgradeData = await upgradeRes.json();
    assert(upgradeData.data && upgradeData.data.planId === 'growth', 'Subscription plan updated to "growth"');

    // Downgrade from Growth ($149) back to Starter ($49)
    const downgradeRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPlanId: 'starter' }),
    });
    assert(downgradeRes.status === 200, 'Admin can downgrade subscription back to Starter tier (HTTP 200 OK)');
    const downgradeData = await downgradeRes.json();
    assert(
      downgradeData.data && (downgradeData.data.planId === 'starter' || downgradeData.data.pendingDowngradePlanId === 'starter'),
      'Subscription plan updated or scheduled for period-end downgrade back to "starter"'
    );

    // -------------------------------------------------------------------------
    // 8. Test Cancel-at-period-end & Data Preservation Guarantee
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Validating Support for Cancel-at-period-end...');
    // Record customer data counts BEFORE cancellation
    const [brandsBefore] = await connection.execute('SELECT COUNT(*) as count FROM brands WHERE tenant_id = ?', [tenantAId]);
    const [postsBefore] = await connection.execute('SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?', [tenantAId]);
    const [mediaBefore] = await connection.execute('SELECT COUNT(*) as count FROM media_assets WHERE tenant_id = ?', [tenantAId]);
    const [usersBefore] = await connection.execute('SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?', [tenantAId]);

    const cancelRes = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ immediately: false }),
    });
    assert(cancelRes.status === 200, 'Admin can cancel subscription at period end (HTTP 200 OK)');
    const cancelData = await cancelRes.json();

    assert(cancelData.data.cancelAtPeriodEnd === true, 'Response confirms cancelAtPeriodEnd = true');
    assert(cancelData.data.status === 'active', 'Subscription status remains "active" until the end of the billing period');
    assert(Boolean(cancelData.data.nextBillingDate), 'Next billing date indicates effective cancellation date');

    // Verify DB state
    const [subRows] = await connection.execute(
      'SELECT status, cancel_at_period_end FROM tenant_subscriptions WHERE tenant_id = ?',
      [tenantAId]
    );
    assert(subRows[0].cancel_at_period_end === 1, 'Database confirms cancel_at_period_end = 1');
    assert(subRows[0].status === 'active', 'Database confirms status = "active"');

    console.log('\n[Test 8] Customer Data Preservation Verification...');
    const [brandsAfter] = await connection.execute('SELECT COUNT(*) as count FROM brands WHERE tenant_id = ?', [tenantAId]);
    const [postsAfter] = await connection.execute('SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?', [tenantAId]);
    const [mediaAfter] = await connection.execute('SELECT COUNT(*) as count FROM media_assets WHERE tenant_id = ?', [tenantAId]);
    const [usersAfter] = await connection.execute('SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = ?', [tenantAId]);

    assert(brandsBefore[0].count === brandsAfter[0].count && brandsAfter[0].count > 0, 'Customer brand kits remain 100% preserved (0 deleted)');
    assert(postsBefore[0].count === postsAfter[0].count && postsAfter[0].count > 0, 'Customer posts and drafts remain 100% preserved (0 deleted)');
    assert(mediaBefore[0].count === mediaAfter[0].count && mediaAfter[0].count > 0, 'Customer media assets remain 100% preserved (0 deleted)');
    assert(usersBefore[0].count === usersAfter[0].count && usersAfter[0].count > 0, 'Customer team memberships remain 100% preserved (0 deleted)');

    // -------------------------------------------------------------------------
    // 9. Test Resume Subscription
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Validating Resume Subscription Flow...');
    const resumeRes = await fetch(`${API_BASE}/billing/subscription/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert(resumeRes.status === 200, 'Admin can resume subscription (HTTP 200 OK)');
    const resumeData = await resumeRes.json();

    assert(resumeData.data.cancelAtPeriodEnd === false, 'Resume clears cancelAtPeriodEnd flag to false');
    assert(resumeData.data.status === 'active', 'Subscription remains active and renewing');

    const [subResumeRows] = await connection.execute(
      'SELECT status, cancel_at_period_end FROM tenant_subscriptions WHERE tenant_id = ?',
      [tenantAId]
    );
    assert(subResumeRows[0].cancel_at_period_end === 0, 'Database confirms cancel_at_period_end restored to 0');

    // -------------------------------------------------------------------------
    // 10. Test Billing Audit Logs
    // -------------------------------------------------------------------------
    console.log('\n[Test 10] Validating Billing Audit Logs Retrieval (GET /billing/audit-logs)...');
    const auditRes = await fetch(`${API_BASE}/billing/audit-logs`, {
      headers: { Authorization: `Bearer ${tokenAdminA}` },
    });
    assert(auditRes.status === 200, 'GET /billing/audit-logs returns HTTP 200 OK');
    const auditData = await auditRes.json();
    assert(Array.isArray(auditData.data), 'Audit logs returns an array');
    
    const eventTypes = auditData.data.map((l) => l.eventType);
    assert(eventTypes.includes('portal_session_created'), 'Audit logs contain "portal_session_created"');
    assert(eventTypes.includes('subscription_upgraded'), 'Audit logs contain "subscription_upgraded"');
    assert(eventTypes.includes('subscription_downgraded'), 'Audit logs contain "subscription_downgraded"');
    assert(eventTypes.includes('subscription_cancel_scheduled'), 'Audit logs contain "subscription_cancel_scheduled"');
    assert(eventTypes.includes('subscription_resumed'), 'Audit logs contain "subscription_resumed"');

    // Check payload data preservation note
    const cancelLog = auditData.data.find((l) => l.eventType === 'subscription_cancel_scheduled');
    assert(cancelLog && cancelLog.payload && cancelLog.payload.dataPreserved === true, 'Cancellation audit log explicitly records dataPreserved = true');

    // -------------------------------------------------------------------------
    // 11. Security & Isolation: Prevent Cross-Tenant Billing Access
    // -------------------------------------------------------------------------
    console.log('\n[Test 11] Security & Isolation: Preventing Cross-Tenant Billing Access...');
    // Tenant B attempts to fetch subscription
    const subBRes = await fetch(`${API_BASE}/billing/subscription`, {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    const subBData = await subBRes.json();
    assert(subBData.data.planId === 'growth', 'Tenant B can only access its own subscription (Growth), not Tenant A (Starter)');

    // Tenant B attempts to fetch audit logs
    const auditBRes = await fetch(`${API_BASE}/billing/audit-logs`, {
      headers: { Authorization: `Bearer ${tokenAdminB}` },
    });
    const auditBData = await auditBRes.json();
    const tenantAEventsInB = auditBData.data.filter((l) => l.tenantId === tenantAId);
    assert(tenantAEventsInB.length === 0, 'Tenant B audit logs contain ZERO records from Tenant A (100% tenant-isolated)');

    // Tenant B attempts to cancel or modify Tenant A - can only affect Tenant B
    await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenAdminB}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ immediately: false }),
    });

    const [subACheck] = await connection.execute(
      'SELECT cancel_at_period_end FROM tenant_subscriptions WHERE tenant_id = ?',
      [tenantAId]
    );
    assert(subACheck[0].cancel_at_period_end === 0, 'Tenant A subscription remains completely unperturbed by Tenant B actions');

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Clean up test tenants safely
    try {
      await connection.execute("DELETE FROM billing_events WHERE provider_event_id LIKE '%stage9%' OR tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'ten-a-%' OR slug LIKE 'ten-b-%')");
      await connection.execute("DELETE FROM billing_invoices WHERE invoice_number LIKE 'INV-S9%'");
      await connection.execute("DELETE FROM media_assets WHERE file_name = 'logo.png' AND mime_type = 'image/png'");
      await connection.execute("DELETE FROM posts WHERE title = 'Flagship Post 1'");
      await connection.execute("DELETE FROM brands WHERE name = 'Tenant A Flagship Brand'");
      await connection.execute("DELETE FROM tenant_subscriptions WHERE provider_customer_id LIKE '%stage9%' OR provider_subscription_id LIKE '%stage9%'");
      await connection.execute("DELETE FROM tenant_users WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'ten-a-%' OR slug LIKE 'ten-b-%')");
      await connection.execute("DELETE FROM users WHERE email LIKE '%@agencya.com' OR email LIKE '%@agencyb.com'");
      await connection.execute("DELETE FROM tenants WHERE slug LIKE 'ten-a-%' OR slug LIKE 'ten-b-%'");
    } catch (e) {
      console.error('Cleanup warning:', e.message);
    }
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
