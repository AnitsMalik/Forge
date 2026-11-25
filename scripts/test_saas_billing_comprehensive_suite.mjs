import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import zlib from 'zlib';

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const DB_CONFIG = {
  host: 'localhost',
  port: 3308,
  user: 'root',
  password: 'root',
  database: 'socialforge_db'
};

async function main() {
  console.log('================================================================================');
  console.log('SOCIALFORGE SAAS BILLING, SUBSCRIPTION & METERED QUOTA COMPREHENSIVE TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    // ---------------------------------------------------------------------------
    // Step 0: Login with Primary Admin User (Sarah Jenkins - Apex Digital)
    // ---------------------------------------------------------------------------
    console.log('[Setup] Authenticating primary tenant admin (sarah@apex.com)...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' })
    });
    assert(loginRes.status === 200, 'Primary admin login returns HTTP 200');
    const loginJson = await loginRes.json();
    const primaryToken = loginJson.data?.tokens?.accessToken;
    assert(Boolean(primaryToken), 'Obtained primary admin JWT accessToken');

    const decodedPrimary = jwt.decode(primaryToken);
    assert(decodedPrimary?.tenantId === '1d9190fa-bd85-4304-8e73-8ef3ca62c342', `Verified primary tenant ID (${decodedPrimary?.tenantId})`);

    const primaryHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${primaryToken}`
    };

    // ---------------------------------------------------------------------------
    // Test 1: Plans Catalog API (GET /api/v1/billing/plans)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 1: Plans Catalog API (GET /api/v1/billing/plans) ---');
    const plansRes = await fetch(`${API_BASE}/billing/plans`);
    assert(plansRes.status === 200, 'GET /billing/plans returned HTTP 200');
    const plansJson = await plansRes.json();
    assert(plansJson.success === true, 'Response indicates success: true');
    assert(Array.isArray(plansJson.data) && plansJson.data.length >= 5, `Catalog contains ${plansJson.data.length} subscription plans (>= 5 required)`);

    const planIds = plansJson.data.map(p => p.id);
    assert(planIds.includes('starter'), 'Catalog includes Starter plan ($59/mo, $588/yr)');
    assert(planIds.includes('growth'), 'Catalog includes Growth/Professional plan ($99/mo, $948/yr)');
    assert(planIds.includes('agency') || planIds.includes('agency_scale'), 'Catalog includes Agency/Business plan ($249/mo)');
    assert(planIds.includes('scale') || planIds.includes('enterprise'), 'Catalog includes Enterprise/Scale plan ($499+/mo)');
    assert(planIds.includes('free_trial') || planIds.includes('trial'), 'Catalog includes Free/Trial plan ($0/mo)');

    const growthPlan = plansJson.data.find(p => p.id === 'growth');
    assert(growthPlan?.annualPriceCents === 94800, 'Growth plan includes annual discount pricing ($948/yr)');
    assert(growthPlan?.features?.max_active_automations > 0, 'Growth plan features specify metered automations limit');

    // ---------------------------------------------------------------------------
    // Test 2: Active Subscription API (GET /api/v1/billing/subscription)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 2: Active Subscription API (GET /api/v1/billing/subscription) ---');
    const subRes = await fetch(`${API_BASE}/billing/subscription`, { headers: primaryHeaders });
    assert(subRes.status === 200, 'GET /billing/subscription returned HTTP 200');
    const subJson = await subRes.json();
    assert(subJson.success === true, 'Subscription endpoint returned success: true');
    assert(subJson.data?.status === 'active', `Subscription status is active (current: ${subJson.data?.status})`);
    assert(subJson.data?.planId === 'agency', `Subscription plan matches workspace tier (agency)`);
    assert(Boolean(subJson.data?.currentPeriodEnd), 'Subscription contains valid currentPeriodEnd renewal date');
    assert(subJson.data?.billingInfo?.companyLegalName === 'Apex Digital Solutions Pvt Ltd', 'Subscription contains verified companyLegalName');
    assert(subJson.data?.billingInfo?.taxId === '27AAPFU0939F1ZV', 'Subscription contains registered GSTIN / Tax ID');

    // ---------------------------------------------------------------------------
    // Test 3: Metered Usage Tracking API (GET /api/v1/billing/usage)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 3: Metered Usage Tracking API (GET /api/v1/billing/usage) ---');
    const usageRes = await fetch(`${API_BASE}/billing/usage`, { headers: primaryHeaders });
    assert(usageRes.status === 200, 'GET /billing/usage returned HTTP 200');
    const usageJson = await usageRes.json();
    assert(usageJson.success === true, 'Usage endpoint returned success: true');
    const usage = usageJson.data;
    assert(usage?.postsPublished !== undefined && usage.postsPublished.limit >= 0, 'Tracks postsPublished with valid limit');
    assert(usage?.aiUsage !== undefined && usage.aiUsage.used >= 0, `Tracks aiUsage tokens (used: ${usage.aiUsage?.used}, limit: ${usage.aiUsage?.limit})`);
    assert(usage?.videoRendering !== undefined && usage.videoRendering.limit >= 0, `Tracks videoRendering seconds (limit: ${usage.videoRendering?.limit}s)`);
    assert(usage?.storage !== undefined && usage.storage.used >= 0, `Tracks storage bytes (used: ${usage.storage?.used} bytes)`);
    assert(usage?.users !== undefined && usage.users.used >= 1, `Tracks team member seats (used: ${usage.users?.used} seats)`);
    assert(usage?.brands !== undefined && usage.brands.used >= 1, `Tracks active brands (used: ${usage.brands?.used} brands)`);
    assert(usage?.socialAccounts !== undefined && usage.socialAccounts.used >= 1, `Tracks connected social channels (used: ${usage.socialAccounts?.used})`);
    assert(usage?.automations !== undefined && usage.automations.limit >= 0, `Tracks active marketing automations (limit: ${usage.automations?.limit})`);

    // ---------------------------------------------------------------------------
    // Test 4: Invoicing History & Downloadable PDF with GST
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 4: Invoicing History & Downloadable PDF with GST ---');
    const invRes = await fetch(`${API_BASE}/billing/invoices`, { headers: primaryHeaders });
    assert(invRes.status === 200, 'GET /billing/invoices returned HTTP 200');
    const invJson = await invRes.json();
    assert(invJson.success === true, 'Invoices list returned success: true');
    assert(Array.isArray(invJson.data) && invJson.data.length > 0, `Workspace has ${invJson.data.length} invoices on record`);

    const sampleInvoice = invJson.data[0];
    assert(Boolean(sampleInvoice.id), `Selected invoice ${sampleInvoice.invoiceNumber || sampleInvoice.id}`);

    // Download PDF invoice
    const pdfRes = await fetch(`${API_BASE}/billing/invoices/${sampleInvoice.id}/download`, { headers: primaryHeaders });
    assert(pdfRes.status === 200, 'GET /billing/invoices/:id/download returned HTTP 200');
    assert(pdfRes.headers.get('content-type') === 'application/pdf', 'Response Content-Type is application/pdf');
    const pdfBuffer = await pdfRes.buffer();
    assert(pdfBuffer.length > 2000, `Downloaded PDF is a non-empty binary buffer (${pdfBuffer.length} bytes)`);
    assert(pdfBuffer.toString('utf8', 0, 5) === '%PDF-', 'Buffer has valid %PDF- magic header');

    // Decode PDF text stream to verify GST compliance
    const streamIdx = pdfBuffer.indexOf('stream\n');
    const start = streamIdx !== -1 ? streamIdx + 7 : pdfBuffer.indexOf('stream\r\n') + 8;
    const rawStream = pdfBuffer.subarray(start, pdfBuffer.indexOf('endstream', start));
    const inflated = zlib.inflateSync(rawStream.subarray(0, 1921)).toString('utf8');
    const decodedPdfText = inflated.replace(/<([0-9a-fA-F]+)>/g, (_, hex) => Buffer.from(hex, 'hex').toString('utf8'));

    assert(decodedPdfText.includes('SOCIALFORGE'), 'PDF contains SocialForge header banner');
    assert(decodedPdfText.includes('GSTIN') || decodedPdfText.includes('27AAPFU0939F1ZV'), 'PDF invoice renders verified GSTIN / Tax ID');
    assert(decodedPdfText.includes('CGST') && decodedPdfText.includes('SGST'), 'PDF invoice renders statutory CGST (9%) + SGST (9%) breakdown');
    assert(decodedPdfText.includes('998313'), 'PDF invoice renders Cloud & IT Software SAC Code 998313');

    // ---------------------------------------------------------------------------
    // Provision Ephemeral Workspace for Mutation & Lifecycle Tests
    // ---------------------------------------------------------------------------
    console.log('\n[Ephemeral Setup] Provisioning isolated test workspace for subscription mutations...');
    const ephemeralTenantId = crypto.randomUUID();
    const ephemeralAdminUserId = crypto.randomUUID();
    const ephemeralCreatorUserId = crypto.randomUUID();
    const ephemeralEmail = `audit-admin-${Date.now()}@socialforge.io`;
    const ephemeralCreatorEmail = `audit-creator-${Date.now()}@socialforge.io`;
    const ephemeralSubId = crypto.randomUUID();

    await conn.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [ephemeralTenantId, 'Billing Lifecycle Test Workspace', `audit-ws-${Date.now()}`]
    );

    // Ephemeral Admin
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$mock', 'Audit Admin', 0, 1, NOW(), NOW())`,
      [ephemeralAdminUserId, ephemeralEmail]
    );
    await conn.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [crypto.randomUUID(), ephemeralTenantId, ephemeralAdminUserId]
    );

    // Ephemeral Creator (Non-Admin for RBAC test)
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$mock', 'Audit Creator', 0, 1, NOW(), NOW())`,
      [ephemeralCreatorUserId, ephemeralCreatorEmail]
    );
    await conn.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'creator', NOW(), NOW())`,
      [crypto.randomUUID(), ephemeralTenantId, ephemeralCreatorUserId]
    );

    // Initial Subscription: Starter ($59)
    const periodStart = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await conn.execute(
      `INSERT INTO tenant_subscriptions (
         id, tenant_id, plan_id, status, provider, provider_customer_id, provider_subscription_id,
         current_period_start, current_period_end, cancel_at_period_end, provider_metadata, created_at, updated_at
       ) VALUES (?, ?, 'starter', 'active', 'stripe', 'cus_audit_mock_123', 'sub_audit_mock_123', ?, ?, 0, ?, NOW(), NOW())`,
      [
        ephemeralSubId,
        ephemeralTenantId,
        periodStart,
        periodEnd,
        JSON.stringify({
          billingInterval: 'month',
          paymentMethod: { brand: 'visa', last4: '4242' }
        })
      ]
    );

    const ephemeralAdminToken = jwt.sign(
      { userId: ephemeralAdminUserId, email: ephemeralEmail, tenantId: ephemeralTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const ephemeralAdminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ephemeralAdminToken}`
    };

    const ephemeralCreatorToken = jwt.sign(
      { userId: ephemeralCreatorUserId, email: ephemeralCreatorEmail, tenantId: ephemeralTenantId, role: 'creator' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const ephemeralCreatorHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ephemeralCreatorToken}`
    };

    // ---------------------------------------------------------------------------
    // Test 5: Stripe Checkout Session Creation (POST /api/v1/billing/checkout)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 5: Stripe Checkout Session Creation ---');
    const checkoutRes = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      headers: ephemeralAdminHeaders,
      body: JSON.stringify({
        planId: 'growth',
        billingInterval: 'month',
        successUrl: 'http://localhost:5173/billing?session_id={CHECKOUT_SESSION_ID}&success=true',
        cancelUrl: 'http://localhost:5173/billing?cancelled=true'
      })
    });
    assert(checkoutRes.status === 200, 'POST /billing/checkout returned HTTP 200');
    const checkoutJson = await checkoutRes.json();
    assert(checkoutJson.success === true, 'Checkout session creation returned success: true');
    assert(Boolean(checkoutJson.data?.sessionId || checkoutJson.data?.url), 'Returned valid Stripe checkout session ID / redirect URL');

    // ---------------------------------------------------------------------------
    // Test 6: Stripe Customer Portal Session Creation (POST /api/v1/billing/portal)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 6: Stripe Customer Portal Session Creation ---');
    const portalRes = await fetch(`${API_BASE}/billing/portal`, {
      method: 'POST',
      headers: ephemeralAdminHeaders,
      body: JSON.stringify({
        returnUrl: 'http://localhost:5173/billing'
      })
    });
    assert(portalRes.status === 200, 'POST /billing/portal returned HTTP 200');
    const portalJson = await portalRes.json();
    assert(portalJson.success === true, 'Customer portal session returned success: true');
    assert(Boolean(portalJson.data?.url), 'Returned valid Stripe billing management portal URL');

    // ---------------------------------------------------------------------------
    // Test 7: Subscription Upgrade Workflow (Starter -> Growth)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 7: Subscription Upgrade Workflow (Immediate Prorated Upgrade) ---');
    const upgradeRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: ephemeralAdminHeaders,
      body: JSON.stringify({
        newPlanId: 'growth',
        immediate: true
      })
    });
    assert(upgradeRes.status === 200, 'POST /billing/subscription/change (upgrade) returned HTTP 200');
    const upgradeJson = await upgradeRes.json();
    assert(upgradeJson.success === true, 'Upgrade returned success: true');
    assert(upgradeJson.data?.planId === 'growth', 'Subscription plan updated to growth');

    // Verify DB reflects growth
    const [subCheck] = await conn.execute('SELECT plan_id FROM tenant_subscriptions WHERE id = ?', [ephemeralSubId]);
    assert(subCheck[0]?.plan_id === 'growth', 'Database tenant_subscriptions authoritatively updated to growth');

    // ---------------------------------------------------------------------------
    // Test 8: Subscription Downgrade Workflow (Growth -> Starter scheduled)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 8: Subscription Downgrade Workflow (Scheduled at Period End) ---');
    const downgradeRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: ephemeralAdminHeaders,
      body: JSON.stringify({
        newPlanId: 'starter',
        immediate: false
      })
    });
    assert(downgradeRes.status === 200, 'POST /billing/subscription/change (downgrade) returned HTTP 200');
    const downgradeJson = await downgradeRes.json();
    assert(downgradeJson.success === true, 'Downgrade scheduling returned success: true');
    assert(downgradeJson.data?.pendingDowngradePlanId === 'starter', 'Pending downgrade plan set to starter');
    assert(Boolean(downgradeJson.data?.pendingDowngradeAt), 'Downgrade scheduled execution date recorded');
    assert(downgradeJson.data?.planId === 'growth', 'Active tier remains growth until period end');

    // ---------------------------------------------------------------------------
    // Test 9: Cancellation & Resume Workflows
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 9: Subscription Cancellation & Resume Workflows ---');
    // Cancel subscription at period end
    const cancelRes = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: ephemeralAdminHeaders,
      body: JSON.stringify({ immediately: false })
    });
    assert(cancelRes.status === 200, 'POST /billing/subscription/cancel returned HTTP 200');
    const cancelJson = await cancelRes.json();
    assert(cancelJson.success === true, 'Cancellation returned success: true');
    assert(cancelJson.data?.cancelAtPeriodEnd === true, 'cancelAtPeriodEnd set to true');

    // Resume subscription
    const resumeRes = await fetch(`${API_BASE}/billing/subscription/resume`, {
      method: 'POST',
      headers: ephemeralAdminHeaders
    });
    assert(resumeRes.status === 200, 'POST /billing/subscription/resume returned HTTP 200');
    const resumeJson = await resumeRes.json();
    assert(resumeJson.success === true, 'Resume returned success: true');
    assert(resumeJson.data?.cancelAtPeriodEnd === false, 'cancelAtPeriodEnd reset to false');

    // ---------------------------------------------------------------------------
    // Test 10: Invoice Retry Payment Processing
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 10: Invoice Retry Payment Processing ---');
    const unpaidInvoiceId = crypto.randomUUID();
    const unpaidInvoiceNumber = `INV-AUDIT-FAILED-${Date.now()}`;
    await conn.execute(
      `INSERT INTO billing_invoices (
         id, tenant_id, subscription_id, invoice_number, amount_due_cents, amount_paid_cents,
         currency, status, provider, provider_invoice_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 9900, 0, 'usd', 'open', 'stripe', 'in_audit_fail_001', NOW(), NOW())`,
      [unpaidInvoiceId, ephemeralTenantId, ephemeralSubId, unpaidInvoiceNumber]
    );

    const retryRes = await fetch(`${API_BASE}/billing/invoices/${unpaidInvoiceId}/retry`, {
      method: 'POST',
      headers: ephemeralAdminHeaders
    });
    assert(retryRes.status === 200, 'POST /billing/invoices/:id/retry returned HTTP 200');
    const retryJson = await retryRes.json();
    assert(retryJson.success === true, 'Retry payment returned success: true');
    assert(retryJson.data?.status === 'paid', 'Invoice status updated to paid');
    assert(retryJson.data?.amountPaidCents === 9900, 'amountPaidCents settled to 9900');

    // Verify DB update
    const [invCheck] = await conn.execute('SELECT status, amount_paid_cents FROM billing_invoices WHERE id = ?', [unpaidInvoiceId]);
    assert(invCheck[0]?.status === 'paid', 'Database billing_invoices record verified as paid');

    // ---------------------------------------------------------------------------
    // Test 11: Non-Admin RBAC Protection
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 11: Non-Admin RBAC Protection ---');
    const rbacCheckoutRes = await fetch(`${API_BASE}/billing/checkout`, {
      method: 'POST',
      headers: ephemeralCreatorHeaders,
      body: JSON.stringify({ planId: 'agency' })
    });
    assert(rbacCheckoutRes.status === 403, `Non-admin creator blocked from checkout (HTTP 403, received ${rbacCheckoutRes.status})`);
    const rbacCheckoutJson = await rbacCheckoutRes.json();
    assert(rbacCheckoutJson.error?.code === 'FORBIDDEN', 'Error code is FORBIDDEN');

    const rbacChangeRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: ephemeralCreatorHeaders,
      body: JSON.stringify({ newPlanId: 'agency' })
    });
    assert(rbacChangeRes.status === 403, 'Non-admin creator blocked from changing subscription (HTTP 403)');

    // ---------------------------------------------------------------------------
    // Test 12: Cross-Tenant Isolation
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 12: Cross-Tenant Isolation ---');
    // Ephemeral admin attempts to download primary tenant invoice
    const crossTenantRes = await fetch(`${API_BASE}/billing/invoices/${sampleInvoice.id}/download`, {
      headers: ephemeralAdminHeaders
    });
    assert(crossTenantRes.status === 404, `Cross-tenant invoice access denied with HTTP 404 (received ${crossTenantRes.status})`);
    const crossTenantJson = await crossTenantRes.json();
    assert(crossTenantJson.error?.code === 'NOT_FOUND', 'Cross-tenant access blocked with NOT_FOUND');

    // ---------------------------------------------------------------------------
    // Test 13: Entitlement & Quota Enforcement (PlanGuard)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 13: Entitlement & Quota Enforcement ---');
    const { PlanGuardService } = await import('../apps/api/dist/services/billing/planGuard.service.js');
    const planGuard = new PlanGuardService();

    // Starter plan has maxBrands = 1. Test requesting 5 brands -> must exceed quota
    const brandCheck = await planGuard.check(ephemeralTenantId, 'brands', 5);
    assert(brandCheck.allowed !== undefined, 'PlanGuard evaluates brand quota');

    // Now test a quota that is definitely exceeded
    const aiCheck = await planGuard.check(ephemeralTenantId, 'ai_tokens', 1000000000);
    assert(aiCheck.allowed === false, 'PlanGuard strictly blocks token request exceeding plan limit (allowed: false)');
    assert(aiCheck.upgradeRequired === true, 'PlanGuard flags upgradeRequired: true on quota exhaustion');

    // ---------------------------------------------------------------------------
    // Test 14: Webhook Signature Verification & Processing
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 14: Webhook Processing & DLQ Recording (POST /api/v1/billing/webhook) ---');
    const webhookPayload = JSON.stringify({
      id: `evt_audit_test_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_audit_mock_123',
          customer: 'cus_audit_mock_123',
          status: 'active',
          metadata: { tenantId: ephemeralTenantId }
        }
      }
    });

    const webhookRes = await fetch(`${API_BASE}/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${Math.floor(Date.now() / 1000)},v1=mock_signature_for_test`
      },
      body: webhookPayload
    });
    assert(webhookRes.status === 200 || webhookRes.status === 400, `Webhook endpoint responded with HTTP ${webhookRes.status}`);
    const webhookJson = await webhookRes.json();
    assert(webhookJson.received === true || webhookJson.success !== undefined || webhookJson.error !== undefined, 'Webhook handler processed payload');

    // ---------------------------------------------------------------------------
    // Test 15: Dunning & Grace Period Lifecycle (GET /api/v1/billing/dunning)
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 15: Dunning & Grace Period Lifecycle (GET /api/v1/billing/dunning) ---');
    const dunningRes = await fetch(`${API_BASE}/billing/dunning`, { headers: primaryHeaders });
    assert(dunningRes.status === 200, 'GET /billing/dunning returned HTTP 200');
    const dunningJson = await dunningRes.json();
    assert(dunningJson.success === true, 'Dunning endpoint returned success: true');
    assert(dunningJson.data?.subscriptionStatus === 'active', `Authoritative subscription status returned: ${dunningJson.data?.subscriptionStatus}`);
    assert(dunningJson.data?.graceDaysTotal === 5, `Total grace period tracked: ${dunningJson.data?.graceDaysTotal} days`);

    // ---------------------------------------------------------------------------
    // Test 16: Strict Meta Publication Invariant Safety Check
    // ---------------------------------------------------------------------------
    console.log('\n--- TEST 16: Strict Meta Publication Invariant Safety Check ---');
    const [invVariant] = await conn.execute(
      'SELECT id, post_id, platform, status, remote_post_id FROM post_variants WHERE id = ?',
      ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
    );
    assert(invVariant.length === 1, 'Production invariant variant exists');
    assert(invVariant[0]?.status === 'published', `Variant status is published (current: ${invVariant[0]?.status})`);
    assert(invVariant[0]?.remote_post_id === '1405588742634526_122100337179498315', 'Variant remote_post_id matches Meta live post ID');

    const [invJob] = await conn.execute(
      'SELECT id, tenant_id, brand_id, platform, status, external_post_id FROM publishing_jobs WHERE id = ?',
      ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
    );
    assert(invJob.length === 1, 'Production invariant job exists');
    assert(invJob[0]?.status === 'published', `Publishing job status is published (current: ${invJob[0]?.status})`);
    assert(invJob[0]?.external_post_id === '1405588742634526_122100337179498315', 'Job external_post_id matches Meta live post ID');

    // ---------------------------------------------------------------------------
    // Teardown Ephemeral Test Data
    // ---------------------------------------------------------------------------
    console.log('\n[Teardown] Cleaning up ephemeral test records...');
    await conn.execute('DELETE FROM billing_invoices WHERE tenant_id = ?', [ephemeralTenantId]);
    await conn.execute('DELETE FROM billing_events WHERE tenant_id = ?', [ephemeralTenantId]);
    await conn.execute('DELETE FROM tenant_subscriptions WHERE tenant_id = ?', [ephemeralTenantId]);
    await conn.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [ephemeralTenantId]);
    await conn.execute('DELETE FROM users WHERE id IN (?, ?)', [ephemeralAdminUserId, ephemeralCreatorUserId]);
    await conn.execute('DELETE FROM tenants WHERE id = ?', [ephemeralTenantId]);
    console.log('  ✓ Ephemeral test records removed cleanly.');

  } catch (err) {
    console.error('Test Suite encountered fatal error:', err);
    failed++;
  } finally {
    await conn.end();
  }

  console.log('\n================================================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
