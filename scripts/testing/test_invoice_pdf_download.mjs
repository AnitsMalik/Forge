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
  console.log('SOCIALFORGE — INVOICE PDF DOWNLOAD VERIFICATION');
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
    // 1. Setup Test Tenants, Users, Subscription & Invoice
    // -------------------------------------------------------------------------
    console.log('[Setup] Creating Tenant A and Tenant B test fixtures...');
    const tenantAId = uuidv4();
    const adminAUserId = uuidv4();

    const tenantBId = uuidv4();
    const adminBUserId = uuidv4();

    const invoiceId = uuidv4();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // Tenant A
    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantAId, 'Tenant A Acme Studios', `ten-a-${Date.now()}`]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Acme Admin', 0, 1, NOW(), NOW())`,
      [adminAUserId, `acme.admin.${Date.now()}@example.com`]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), tenantAId, adminAUserId]
    );

    // Tenant B
    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [tenantBId, 'Tenant B Competitor Inc', `ten-b-${Date.now()}`]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Competitor Admin', 0, 1, NOW(), NOW())`,
      [adminBUserId, `comp.admin.${Date.now()}@example.com`]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), tenantBId, adminBUserId]
    );

    // Fetch existing plan
    const [plans] = await connection.execute(`SELECT id FROM subscription_plans LIMIT 1`);
    const planId = plans[0]?.id;
    if (!planId) throw new Error('No subscription plan found in DB');

    const subAId = uuidv4();
    // Insert subscription for Tenant A
    await connection.execute(
      `INSERT INTO tenant_subscriptions (id, tenant_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 'stripe', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW())`,
      [subAId, tenantAId, planId]
    );

    // Insert invoice for Tenant A
    await connection.execute(
      `INSERT INTO billing_invoices (id, tenant_id, subscription_id, invoice_number, amount_due_cents, amount_paid_cents, currency, status, provider, provider_invoice_id, hosted_invoice_url, period_start, period_end, paid_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 7900, 7900, 'usd', 'paid', 'stripe', ?, 'https://stripe.com/mock-receipt', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW(), NOW())`,
      [invoiceId, tenantAId, subAId, invoiceNumber, `in_${Date.now()}`]
    );

    console.log(`[Setup] Invoice ${invoiceId} (${invoiceNumber}) created for Tenant A.\n`);

    // Helper for auth tokens
    const signToken = (userId, tenantId, role) => {
      return jwt.sign(
        {
          userId,
          tenantId,
          role,
          email: `${role}@test.com`,
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
    };

    const tokenAdminA = signToken(adminAUserId, tenantAId, 'admin');
    const tokenAdminB = signToken(adminBUserId, tenantBId, 'admin');

    // -------------------------------------------------------------------------
    // 2. Test: Download without Auth (401)
    // -------------------------------------------------------------------------
    console.log('[Test 1] Unauthenticated download request...');
    const unauthRes = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/download`);
    assert(unauthRes.status === 401, 'Unauthenticated request receives HTTP 401');

    // -------------------------------------------------------------------------
    // 3. Test: Authorized Download by Tenant A Admin (200 + PDF Stream)
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Authorized Tenant A download of own invoice...');
    const authRes = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/download`, {
      headers: {
        Authorization: `Bearer ${tokenAdminA}`,
      },
    });

    assert(authRes.status === 200, `Authorized request returns HTTP 200 (got ${authRes.status})`);
    
    const contentType = authRes.headers.get('content-type') || '';
    assert(contentType.includes('application/pdf'), `Content-Type is application/pdf (got "${contentType}")`);

    const disposition = authRes.headers.get('content-disposition') || '';
    assert(
      disposition.includes('attachment') && disposition.includes(invoiceNumber),
      `Content-Disposition header specifies attachment with invoice number (got "${disposition}")`
    );

    const pdfBuffer = Buffer.from(await authRes.arrayBuffer());
    assert(pdfBuffer.length > 500, `Received valid non-empty PDF binary (${pdfBuffer.length} bytes)`);

    const magicBytes = pdfBuffer.slice(0, 4).toString('ascii');
    assert(magicBytes === '%PDF', `Binary begins with valid PDF magic bytes ("${magicBytes}")`);

    // -------------------------------------------------------------------------
    // 4. Test: Cross-Tenant Isolation (Tenant B attempts to download Tenant A's invoice)
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Cross-Tenant Isolation: Tenant B admin attempting to download Tenant A invoice...');
    const crossTenantRes = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/download`, {
      headers: {
        Authorization: `Bearer ${tokenAdminB}`,
      },
    });

    assert(
      crossTenantRes.status === 404,
      `Tenant B request for Tenant A invoice is strictly rejected with HTTP 404 (got ${crossTenantRes.status})`
    );

    // -------------------------------------------------------------------------
    // 5. Test: Non-existent invoice (404)
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Request for non-existent invoice ID...');
    const nonExistentRes = await fetch(`${API_BASE}/billing/invoices/${uuidv4()}/download`, {
      headers: {
        Authorization: `Bearer ${tokenAdminA}`,
      },
    });

    assert(nonExistentRes.status === 404, `Non-existent invoice request returns HTTP 404 (got ${nonExistentRes.status})`);

    // -------------------------------------------------------------------------
    // 6. Cleanup
    // -------------------------------------------------------------------------
    console.log('\n[Cleanup] Removing test records...');
    await connection.execute(`DELETE FROM billing_invoices WHERE id = ?`, [invoiceId]);
    await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await connection.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [tenantAId, tenantBId]);
    await connection.execute(`DELETE FROM users WHERE id IN (?, ?)`, [adminAUserId, adminBUserId]);
    await connection.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [tenantAId, tenantBId]);
    console.log('[Cleanup] Completed cleanly.');

  } finally {
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
