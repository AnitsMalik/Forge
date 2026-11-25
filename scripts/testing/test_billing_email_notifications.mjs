import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';
import { BillingEmailService } from '../apps/api/dist/services/billing/billingEmail.service.js';
import { DunningService } from '../apps/api/dist/services/billing/dunning.service.js';
import { StripeBillingService } from '../apps/api/dist/services/stripeBilling.service.js';

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
  console.log('SOCIALFORGE — AUTOMATED BILLING EMAIL NOTIFICATIONS TEST SUITE');
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

  const tenantAId = uuidv4();
  const tenantBId = uuidv4();
  const userAId = uuidv4();
  const userBId = uuidv4();
  const superadminId = uuidv4();

  const userAEmail = `billing.owner.a.${Date.now()}@socialforge-test.io`;
  const userBEmail = `billing.owner.b.${Date.now()}@socialforge-test.io`;
  const superadminEmail = `superadmin.email.${Date.now()}@socialforge.io`;

  try {
    // -------------------------------------------------------------------------
    // 1. Setup Test Fixtures
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating Tenant A, Tenant B, and Superadmin test fixtures...');

    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW()), (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Tenant A Apex Media', `tenant-a-${Date.now()}`, tenantBId, 'Tenant B Beta Studio', `tenant-b-${Date.now()}`]
    );

    const [starterPlans] = await connection.execute(`SELECT id FROM subscription_plans WHERE name = 'starter' LIMIT 1`);
    const [growthPlans] = await connection.execute(`SELECT id FROM subscription_plans WHERE name = 'growth' LIMIT 1`);
    const starterPlanId = starterPlans[0]?.id || 'starter';
    const growthPlanId = growthPlans[0]?.id || 'growth';

    const subAId = `sub_mock_a_${Date.now()}`;
    const subBId = `sub_mock_b_${Date.now()}`;

    await connection.execute(
      `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider, provider_subscription_id, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 'stripe', ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW()),
              (?, ?, ?, 'active', 'stripe', ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW())`,
      [uuidv4(), tenantAId, starterPlanId, subAId, uuidv4(), tenantBId, growthPlanId, subBId]
    );

    // Users
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Owner Tenant A', 0, 1, NOW(), NOW()),
              (?, ?, 'hash', 'Owner Tenant B', 0, 1, NOW(), NOW()),
              (?, ?, 'hash', 'Platform Superadmin', 1, 1, NOW(), NOW())`,
      [userAId, userAEmail, userBId, userBEmail, superadminId, superadminEmail]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW()),
              (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), tenantAId, userAId, uuidv4(), tenantBId, userBId]
    );

    const signToken = (userId, tenantId, role, isSuperAdmin = false) => {
      return jwt.sign({ userId, tenantId, role, email: `${role}@test.com`, isSuperAdmin }, JWT_SECRET, {
        expiresIn: '1h',
      });
    };

    const tokenA = signToken(userAId, tenantAId, 'owner', false);
    const tokenB = signToken(userBId, tenantBId, 'owner', false);
    const tokenSuper = signToken(superadminId, tenantAId, 'owner', true);

    await BillingEmailService.ensureTable();

    // -------------------------------------------------------------------------
    // 2. Test: Security & Cross-Tenant Access Protection
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Security: Unauthenticated & Cross-Tenant Protection...');
    const unauthRes = await fetch(`${API_BASE}/billing/emails`);
    assert(unauthRes.status === 401, 'Unauthenticated request to /billing/emails rejected with HTTP 401');

    const nonAdminSuperRes = await fetch(`${API_BASE}/admin/billing/emails`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(nonAdminSuperRes.status === 403, 'Non-superadmin request to /admin/billing/emails rejected with HTTP 403');

    // -------------------------------------------------------------------------
    // 3. Test: Automated Payment Succeeded / Renewal Receipt Email
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Automated Payment Receipt Email Generation...');
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    await DunningService.handlePaymentSucceeded(tenantAId, {
      id: `in_test_${Date.now()}`,
      number: invoiceNumber,
      amount_paid: 2900,
      currency: 'usd',
    });

    const [receiptRows] = await connection.execute(
      `SELECT * FROM billing_email_logs WHERE tenant_id = ? AND template = 'payment_receipt' ORDER BY created_at DESC LIMIT 1`,
      [tenantAId]
    );
    assert(receiptRows.length === 1, 'Payment receipt email successfully recorded in billing_email_logs');
    const receiptEmail = receiptRows[0];
    assert(receiptEmail.recipient_email === userAEmail, `Recipient is workspace owner (${userAEmail})`);
    assert(receiptEmail.subject.includes(invoiceNumber), `Subject contains invoice number (${receiptEmail.subject})`);
    assert(receiptEmail.html_body.includes('Payment Receipt'), 'HTML body includes "Payment Receipt" heading');
    assert(receiptEmail.html_body.includes('$29.00'), 'HTML body displays formatted currency ($29.00)');
    assert(receiptEmail.html_body.includes('SocialForge'), 'HTML body contains SocialForge branding');
    assert(receiptEmail.status === 'sent', 'Email delivery status is "sent"');

    // -------------------------------------------------------------------------
    // 4. Test: Automated Payment Failed / Dunning Alert Email
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Automated Payment Failed & Dunning Alert Email...');
    const failInvoiceNum = `INV-FAIL-${Date.now().toString().slice(-4)}`;
    await DunningService.handlePaymentFailed(tenantAId, {
      id: `in_fail_${Date.now()}`,
      number: failInvoiceNum,
      amount_due: 2900,
      currency: 'usd',
    });

    const [failRows] = await connection.execute(
      `SELECT * FROM billing_email_logs WHERE tenant_id = ? AND template = 'payment_failed' ORDER BY created_at DESC LIMIT 1`,
      [tenantAId]
    );
    assert(failRows.length === 1, 'Payment failed alert email recorded in billing_email_logs');
    const failEmail = failRows[0];
    assert(failEmail.recipient_email === userAEmail, 'Recipient email matches workspace owner');
    assert(failEmail.subject.includes('grace active'), 'Subject mentions active grace period');
    assert(failEmail.html_body.includes('Payment Unsuccessful'), 'HTML body includes "Payment Unsuccessful"');
    assert(failEmail.html_body.includes('5 days remaining'), 'HTML body indicates 5 days remaining in grace period');
    assert(failEmail.html_body.includes('Update Payment Method Now'), 'HTML body contains actionable CTA');

    // -------------------------------------------------------------------------
    // 5. Test: Dunning Escalation & Account Suspended Notice
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Dunning Escalation & Account Suspended Notice...');
    // Simulate grace period expired by setting past_due_since 6 days ago (144h)
    await connection.execute(
      `UPDATE tenant_subscriptions SET status = 'past_due', past_due_since = DATE_SUB(NOW(), INTERVAL 6 DAY) WHERE tenant_id = ?`,
      [tenantAId]
    );

    await DunningService.processDunningCycle(tenantAId);

    const [suspendedRows] = await connection.execute(
      `SELECT * FROM billing_email_logs WHERE tenant_id = ? AND template = 'account_suspended' ORDER BY created_at DESC LIMIT 1`,
      [tenantAId]
    );
    assert(suspendedRows.length === 1, 'Account suspended email recorded in billing_email_logs');
    const suspendedEmail = suspendedRows[0];
    assert(suspendedEmail.subject.includes('publishing privileges are paused'), 'Subject notes publishing pause');
    assert(suspendedEmail.html_body.includes('Your Brand Brain and Content Assets Are Safe'), 'Assures customer that brand brain and content are safe');
    assert(suspendedEmail.html_body.includes('Restore Account Privileges'), 'Contains reactivate account CTA');

    // -------------------------------------------------------------------------
    // 6. Test: Subscription Canceled Notice Email
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Subscription Canceled Notice Email...');
    await StripeBillingService.cancelSubscription(subAId, false);

    const [cancelRows] = await connection.execute(
      `SELECT * FROM billing_email_logs WHERE tenant_id = ? AND template = 'subscription_canceled' ORDER BY created_at DESC LIMIT 1`,
      [tenantAId]
    );
    assert(cancelRows.length === 1, 'Subscription canceled email recorded in billing_email_logs');
    const cancelEmail = cancelRows[0];
    assert(cancelEmail.subject.includes('subscription has been canceled'), 'Subject confirms cancellation');
    assert(cancelEmail.html_body.includes('Cancellation Confirmed'), 'HTML body shows cancellation confirmed');
    assert(cancelEmail.html_body.includes('Reactivate Subscription'), 'HTML contains reactivation CTA');

    // -------------------------------------------------------------------------
    // 7. Test: Subscription Upgraded / Changed Notice Email
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Subscription Upgraded / Changed Notice Email...');
    await StripeBillingService.changeSubscription(subBId, 'agency_scale');

    const [changeRows] = await connection.execute(
      `SELECT * FROM billing_email_logs WHERE tenant_id = ? AND template = 'subscription_changed' ORDER BY created_at DESC LIMIT 1`,
      [tenantBId]
    );
    assert(changeRows.length === 1, 'Subscription changed email recorded for Tenant B');
    const changeEmail = changeRows[0];
    assert(changeEmail.recipient_email === userBEmail, `Recipient is Tenant B owner (${userBEmail})`);
    assert(changeEmail.subject.includes('Plan Updated'), 'Subject indicates Plan Updated');
    assert(changeEmail.html_body.includes('Subscription Tier Upgraded'), 'HTML body states tier upgraded');
    assert(changeEmail.html_body.includes('Agency Scale Pro') || changeEmail.html_body.includes('agency_scale'), 'HTML body contains new plan name');

    // -------------------------------------------------------------------------
    // 8. Test: Tenant Email History & HTML Preview API Endpoints
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Tenant Email History & HTML Preview Endpoints...');
    const listResA = await fetch(`${API_BASE}/billing/emails`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(listResA.status === 200, 'GET /billing/emails returns HTTP 200');
    const listJsonA = await listResA.json();
    assert(listJsonA.success === true, 'List response success is true');
    assert(listJsonA.data.items.length >= 3, `Tenant A has ${listJsonA.data.items.length} recorded billing emails`);

    // Verify cross-tenant isolation: Tenant B cannot see Tenant A's emails
    const tenantAEmailIds = listJsonA.data.items.map((i) => i.id);
    const crossTenantGet = await fetch(`${API_BASE}/billing/emails/${tenantAEmailIds[0]}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossTenantGet.status === 404, 'Tenant B receives HTTP 404 attempting to view Tenant A billing email');

    // Preview HTML endpoint
    const previewRes = await fetch(`${API_BASE}/billing/emails/${tenantAEmailIds[0]}/preview`, {
      headers: { Authorization: `Bearer ${tokenA}`, Accept: 'text/html' },
    });
    assert(previewRes.status === 200, 'GET /billing/emails/:id/preview returns HTTP 200 OK');
    const previewHtml = await previewRes.text();
    assert(previewHtml.includes('<!DOCTYPE html>'), 'Preview returns complete HTML document');
    assert(previewHtml.includes('SocialForge'), 'Preview HTML contains SocialForge logo and footer');

    // Resend email endpoint
    const resendRes = await fetch(`${API_BASE}/billing/emails/${tenantAEmailIds[0]}/resend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(resendRes.status === 200, 'POST /billing/emails/:id/resend returns HTTP 200 OK');
    const resendJson = await resendRes.json();
    assert(resendJson.data.subject.startsWith('[Resent]'), 'Resent email subject is prefixed with [Resent]');

    // -------------------------------------------------------------------------
    // 9. Test: Superadmin Platform-Wide Email Inspection Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Superadmin Platform-Wide Email Inspection Endpoint...');
    const superListRes = await fetch(`${API_BASE}/admin/billing/emails`, {
      headers: { Authorization: `Bearer ${tokenSuper}` },
    });
    assert(superListRes.status === 200, 'GET /admin/billing/emails returns HTTP 200');
    const superListJson = await superListRes.json();
    assert(superListJson.success === true, 'Superadmin response success is true');
    assert(superListJson.data.items.length >= 4, `Superadmin sees all platform emails (${superListJson.data.total} total)`);
    const foundTenantA = superListJson.data.items.some((i) => i.tenantId === tenantAId);
    const foundTenantB = superListJson.data.items.some((i) => i.tenantId === tenantBId);
    assert(foundTenantA && foundTenantB, 'Superadmin roster includes emails from both Tenant A and Tenant B');

    // -------------------------------------------------------------------------
    // 10. Test: Production Meta Publication Integrity Lock
    // -------------------------------------------------------------------------
    console.log('\n[Test 9] Verifying Production Meta Publication Lock...');
    const [metaVariants] = await connection.execute(
      `SELECT remote_post_id, status FROM post_variants WHERE remote_post_id = '1405588742634526_122100337179498315'`
    );
    assert(metaVariants.length === 1, 'Real Meta production post variant strictly exists in database');
    assert(metaVariants[0].status === 'published', 'Real Meta production post variant status is "published"');

    console.log('\n[Cleanup] Cleaning test fixtures...');
  } finally {
    try {
      if (tenantAId) {
        await connection.execute(`DELETE FROM billing_email_logs WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
        await connection.execute(`DELETE FROM billing_dunning_events WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
        await connection.execute(`DELETE FROM billing_notifications WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
        await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
        await connection.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
        await connection.execute(`DELETE FROM users WHERE id IN (?, ?, ?)`, [userAId, userBId, superadminId]);
        await connection.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);
      }
    } catch {
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
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during test:', err);
  process.exit(1);
});
