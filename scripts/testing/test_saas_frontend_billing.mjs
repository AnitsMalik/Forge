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
  console.log('STAGE 8: FRONTEND BILLING DASHBOARD & SUBSCRIPTION FLOW TEST SUITE');
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
    // 1. Provision Test Tenant & User for Billing Integration
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning test workspace and session token...');
    const tenantId = uuidv4();
    const userId = uuidv4();
    const email = `billing-test-${Date.now()}@socialforge.io`;

    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantId, 'Stage 8 Billing Agency', `s8-${Date.now()}`]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Billing Manager', 0, 1, NOW(), NOW())`,
      [userId, email]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantId, userId]
    );

    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await connection.execute(
      `INSERT INTO tenant_subscriptions (
         id, tenant_id, plan_id, status, provider, provider_customer_id, provider_subscription_id,
         current_period_start, current_period_end, cancel_at_period_end
       ) VALUES (?, ?, 'starter', 'active', 'stripe', 'cus_s8_stage8test', 'sub_s8_stage8test', ?, ?, 0)`,
      [uuidv4(), tenantId, now, nextMonth]
    );

    // Seed test usage counter
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await connection.execute(
      `INSERT INTO tenant_usage_counters (
         tenant_id, period_month, posts_created, posts_published, video_render_seconds, ai_tokens_consumed, storage_bytes_used
       ) VALUES (?, ?, 15, 12, 120, 8500, 52428800)`,
      [tenantId, currentMonthStr]
    );

    // Seed test invoice
    const invoiceNumber = `INV-S8-${Date.now()}`;
    await connection.execute(
      `INSERT INTO billing_invoices (
         id, tenant_id, subscription_id, invoice_number, amount_due_cents, amount_paid_cents,
         currency, status, provider, provider_invoice_id, hosted_invoice_url, paid_at
       ) VALUES (?, ?, NULL, ?, 2900, 2900, 'usd', 'paid', 'stripe', 'in_s8_test_001', 'https://invoice.stripe.com/test_s8', ?)`,
      [uuidv4(), tenantId, invoiceNumber, now]
    );

    const token = jwt.sign(
      { userId, email, tenantId, role: 'agency_owner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // -------------------------------------------------------------------------
    // 2. Plans Catalog API Endpoint (GET /api/v1/billing/plans)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Plans Catalog API (GET /api/v1/billing/plans) ---');
    const plansRes = await fetch(`${API_BASE}/billing/plans`);
    assert(plansRes.status === 200, `GET /billing/plans returned status 200`);
    const plansData = await plansRes.json();
    assert(plansData.success === true, `GET /billing/plans returns success: true`);
    assert(Array.isArray(plansData.data), `GET /billing/plans returns array of plans`);

    const starter = plansData.data.find(p => p.id === 'starter');
    const growth = plansData.data.find(p => p.id === 'growth');
    const agencyScale = plansData.data.find(p => p.id === 'agency_scale');

    assert(starter !== undefined, `Starter tier is present in catalog`);
    assert(starter?.price === 59 || starter?.price === 29, `Starter tier price is $59/mo (or $29/mo)`);
    assert(starter?.maxBrands === 1, `Starter allows 1 brand`);
    assert(starter?.maxSocialAccounts === 3, `Starter allows 3 social accounts`);
    assert(starter?.maxPostsPerMonth === 100, `Starter allows 100 posts/month`);

    assert(growth !== undefined, `Growth tier is present in catalog`);
    assert(growth?.price === 99 || growth?.price === 79, `Growth tier price is $99/mo (or $79/mo)`);
    assert(growth?.maxBrands === 5, `Growth allows 5 brands`);
    assert(growth?.maxSocialAccounts === 15, `Growth allows 15 social accounts`);
    assert(growth?.maxPostsPerMonth === 500, `Growth allows 500 posts/month`);

    assert(agencyScale !== undefined, `Agency Scale tier is present in catalog`);
    assert(agencyScale?.price === 249, `Agency Scale tier price is $249/mo`);
    assert(agencyScale?.maxBrands === 25, `Agency Scale allows 25 brands`);
    assert(agencyScale?.maxSocialAccounts === 100, `Agency Scale allows 100 social accounts`);
    assert(agencyScale?.maxPostsPerMonth === 2500, `Agency Scale allows 2,500 posts/month`);

    // -------------------------------------------------------------------------
    // 3. Workspace Subscription Details (GET /api/v1/billing/subscription)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Active Subscription API (GET /api/v1/billing/subscription) ---');
    const subRes = await fetch(`${API_BASE}/billing/subscription`, { headers: authHeaders });
    assert(subRes.status === 200, `GET /billing/subscription returned status 200`);
    const subData = await subRes.json();
    assert(subData.success === true, `Subscription query returned success: true`);
    assert(subData.data.planId === 'starter', `Workspace planId is starter`);
    assert(subData.data.planName === 'Starter', `Plan name resolved to Starter`);
    assert(subData.data.price === 59 || subData.data.price === 29, `Subscription price is 59 (or 29)`);
    assert(subData.data.status === 'active', `Subscription status is active`);
    assert(subData.data.cancelAtPeriodEnd === false || subData.data.cancelAtPeriodEnd === 0, `cancelAtPeriodEnd is false`);

    // -------------------------------------------------------------------------
    // 4. Live Workspace Usage Metering (GET /api/v1/billing/usage)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Usage Metering API (GET /api/v1/billing/usage) ---');
    const usageRes = await fetch(`${API_BASE}/billing/usage`, { headers: authHeaders });
    assert(usageRes.status === 200, `GET /billing/usage returned status 200`);
    const usageData = await usageRes.json();
    assert(usageData.success === true, `Usage query returned success: true`);

    const u = usageData.data;
    assert(u.period === currentMonthStr, `Usage period matches current month (${currentMonthStr})`);
    assert(u.postsPublished.used === 12, `postsPublished.used equals 12`);
    assert(u.postsPublished.limit === 100, `postsPublished.limit equals 100`);
    assert(u.postsPublished.remaining === 88, `postsPublished.remaining equals 88`);
    assert(u.postsPublished.percentage === 12, `postsPublished.percentage equals 12%`);

    assert(u.videoRendering.used === 120, `videoRendering.used equals 120s`);
    assert(u.aiUsage.used === 8500, `aiUsage.used equals 8500 tokens`);
    assert(u.storage.used === 52428800, `storage.used equals 52428800 bytes (50MB)`);
    assert(u.brands !== undefined, `brands metric is present`);
    assert(u.socialAccounts !== undefined, `socialAccounts metric is present`);
    assert(u.users !== undefined, `users metric is present`);

    // -------------------------------------------------------------------------
    // 5. Invoices & Billing History API (GET /api/v1/billing/invoices)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Invoices API (GET /api/v1/billing/invoices) ---');
    const invoicesRes = await fetch(`${API_BASE}/billing/invoices`, { headers: authHeaders });
    assert(invoicesRes.status === 200, `GET /billing/invoices returned status 200`);
    const invoicesData = await invoicesRes.json();
    assert(invoicesData.success === true, `Invoices query returned success: true`);
    assert(Array.isArray(invoicesData.data), `Invoices returned as array`);
    assert(invoicesData.data.length >= 1, `At least 1 invoice found`);

    const inv = invoicesData.data[0];
    assert(inv.invoiceNumber === invoiceNumber, `invoiceNumber matches seeded invoice (${invoiceNumber})`);
    assert(inv.amountPaidCents === 2900, `amountPaidCents equals 2900 ($29.00)`);
    assert(inv.status === 'paid', `Invoice status is paid`);
    assert(inv.hostedInvoiceUrl === 'https://invoice.stripe.com/test_s8', `hostedInvoiceUrl is populated`);

    // -------------------------------------------------------------------------
    // 6. Checkout Session Trigger (POST /api/v1/billing/checkout)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Stripe Checkout Session Trigger (POST /api/v1/billing/checkout) ---');
    const checkoutRes = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        planId: 'growth',
        billingInterval: 'month',
        successUrl: 'http://localhost:3000/?tab=billing&status=success',
        cancelUrl: 'http://localhost:3000/?tab=billing&status=cancelled',
      }),
    });
    assert(checkoutRes.status === 200, `POST /billing/checkout returned status 200`);
    const checkoutData = await checkoutRes.json();
    assert(checkoutData.success === true, `Checkout session created successfully`);
    assert(Boolean(checkoutData.data.sessionId), `sessionId is returned`);
    assert(Boolean(checkoutData.data.url), `Hosted checkout URL is returned`);
    assert(checkoutData.data.planId === 'growth', `Checkout targets Growth tier`);

    // -------------------------------------------------------------------------
    // 7. Stripe Customer Portal Session Trigger (POST /api/v1/billing/portal)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Stripe Customer Portal Trigger (POST /api/v1/billing/portal) ---');
    const portalRes = await fetch(`${API_BASE}/billing/portal`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        returnUrl: 'http://localhost:3000/?tab=billing',
      }),
    });
    assert(portalRes.status === 200, `POST /billing/portal returned status 200`);
    const portalData = await portalRes.json();
    assert(portalData.success === true, `Customer portal session created successfully`);
    assert(Boolean(portalData.data.url), `Portal URL is returned`);

    // -------------------------------------------------------------------------
    // 8. Subscription Management: Cancel & Resume Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Subscription Lifecycle: Cancel & Resume ---');
    const cancelRes = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ immediately: false }),
    });
    assert(cancelRes.status === 200, `POST /billing/subscription/cancel returned 200`);
    const cancelData = await cancelRes.json();
    assert(cancelData.data.cancelAtPeriodEnd === true, `Subscription marked cancelAtPeriodEnd: true`);

    const resumeRes = await fetch(`${API_BASE}/billing/subscription/resume`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    });
    assert(resumeRes.status === 200, `POST /billing/subscription/resume returned 200`);
    const resumeData = await resumeRes.json();
    assert(resumeData.data.cancelAtPeriodEnd === false, `Subscription resumed; cancelAtPeriodEnd: false`);

    // -------------------------------------------------------------------------
    // 9. Cleanup Test Workspace Data
    // -------------------------------------------------------------------------
    await connection.execute(`DELETE FROM billing_invoices WHERE tenant_id = ?`, [tenantId]);
    await connection.execute(`DELETE FROM tenant_usage_counters WHERE tenant_id = ?`, [tenantId]);
    await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id = ?`, [tenantId]);
    await connection.execute(`DELETE FROM tenant_users WHERE tenant_id = ?`, [tenantId]);
    await connection.execute(`DELETE FROM users WHERE id = ?`, [userId]);
    await connection.execute(`DELETE FROM tenants WHERE id = ?`, [tenantId]);

  } finally {
    await connection.end();
  }

  console.log('\n========================================================================');
  console.log(`STAGE 8 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
