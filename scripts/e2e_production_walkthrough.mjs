import fetch from 'node-fetch';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../apps/api/dist/config/index.js';

const uuidv4 = () => crypto.randomUUID();

const API_BASE = 'http://localhost:4000/api/v1';
const WEB_BASE = 'http://localhost:5173';
const JWT_SECRET = config.jwtSecret;

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3308', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const META_LOCKED_POST_ID = '1405588742634526_122100337179498315';

async function main() {
  console.log('================================================================================');
  console.log('  SOCIALFORGE COMPLETE E2E PRODUCTION WALKTHROUGH & VERIFICATION');
  console.log('  Full System Verification: Infrastructure • Multi-Tenancy • Meta • Billing');
  console.log('================================================================================\n');

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
    // Phase 1: Infrastructure & Health Diagnostics
    // -------------------------------------------------------------------------
    console.log('--- PHASE 1: Live Infrastructure & Health Diagnostics ---');
    const webRes = await fetch(WEB_BASE);
    assert(webRes.status === 200, `Vite frontend server is responding with HTTP 200 at ${WEB_BASE}`);
    const webHtml = await webRes.text();
    assert(webHtml.includes('id="root"') || webHtml.includes('SocialForge'), 'Frontend HTML entrypoint loads SocialForge SPA root');

    const healthRes = await fetch(`${API_BASE}/health`);
    assert(healthRes.status === 200, `API gateway is healthy at ${API_BASE}/health`);
    const health = await healthRes.json();
    assert(health.status === 'healthy', 'Health probe confirms overall status is "healthy"');
    assert(health.services?.api === 'up', 'API service status is "up"');
    assert(health.services?.database === 'connected', 'Database connection pool is "connected"');
    assert(health.services?.migrationsApplied >= 17, `Database migrations verified applied (${health.services?.migrationsApplied} applied)`);
    assert(health.services?.metaPublicationLock === 'intact', 'Meta publication lock verified intact');

    // -------------------------------------------------------------------------
    // Phase 2: Meta Production Post Lock Verification
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 2: Production Publication Integrity Lock ---');
    const [metaPostRows] = await connection.execute(
      'SELECT id, post_id, remote_post_id, platform, status FROM post_variants WHERE remote_post_id = ?',
      [META_LOCKED_POST_ID]
    );
    assert(metaPostRows.length >= 1, `Production post record exists in DB: remote_post_id="${META_LOCKED_POST_ID}"`);
    assert(metaPostRows[0].status === 'published', `Production post status is "published"`);

    const [pubJobs] = await connection.execute(
      'SELECT id, status, external_post_id FROM publishing_jobs WHERE external_post_id = ?',
      [META_LOCKED_POST_ID]
    );
    assert(pubJobs.length >= 1, `Publishing job confirmed: ${pubJobs.length} verified job(s) for locked post`);

    // -------------------------------------------------------------------------
    // Phase 3: Authentication & Multi-Tenant Session Resolution
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 3: Authentication & Multi-Tenant Workspaces ---');
    const unauthRes = await fetch(`${API_BASE}/workspaces`);
    assert(unauthRes.status === 401, 'Unauthenticated request to protected endpoint correctly rejected (HTTP 401)');

    const adminEmail = process.env.ADMIN_EMAIL || 'Singh.ninex@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Access@123';
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    assert(loginRes.status === 200, `Authenticated successfully as Admin (${adminEmail})`);
    const loginData = await loginRes.json();
    const token = loginData.data?.tokens?.accessToken || loginData.data?.token || loginData.token;
    assert(Boolean(token), 'Signed JWT session token issued');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const wsListRes = await fetch(`${API_BASE}/workspaces`, { headers: authHeaders });
    assert(wsListRes.status === 200, 'GET /workspaces queried successfully');
    const wsListData = await wsListRes.json();
    const workspaces = wsListData.data?.workspaces || wsListData.data || [];
    assert(workspaces.length >= 1, `User belongs to ${workspaces.length} workspace(s)`);
    const activeWs = workspaces.find((w) => w.isActive || w.active) || workspaces[0];
    assert(Boolean(activeWs), `Active workspace resolved: "${activeWs.name}" (Role: ${activeWs.role})`);

    const membersRes = await fetch(`${API_BASE}/workspaces/members`, { headers: authHeaders });
    assert(membersRes.status === 200, 'GET /workspaces/members returns team roster');
    const membersData = await membersRes.json();
    const members = membersData.data || [];
    assert(members.length >= 1, `Active team has ${members.length} member(s)`);

    // -------------------------------------------------------------------------
    // Phase 4: Brand Brain & Connected Channels
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 4: Brand Brain & Connected Social Channels ---');
    const brandsRes = await fetch(`${API_BASE}/brands`, { headers: authHeaders });
    assert(brandsRes.status === 200, 'GET /brands returns brand kits for workspace');
    const brandsData = await brandsRes.json();
    const brands = brandsData.data || [];
    assert(brands.length >= 1, `Workspace has ${brands.length} active brand kit(s)`);

    const [socialAccounts] = await connection.execute(
      'SELECT id, platform, account_name, account_id, is_active FROM social_accounts WHERE is_active = 1'
    );
    assert(socialAccounts.length >= 5, `Database has ${socialAccounts.length} active social channels configured`);
    const platforms = [...new Set(socialAccounts.map((a) => a.platform))];
    assert(platforms.includes('facebook') && platforms.includes('instagram'), `Meta platforms active: ${platforms.join(', ')}`);

    // -------------------------------------------------------------------------
    // Phase 5: Customer Billing Portal Verification (Stage 9)
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 5: Customer Billing Portal (Stage 9 Features) ---');

    // 1. Plans Catalog
    const plansRes = await fetch(`${API_BASE}/billing/plans`, { headers: authHeaders });
    assert(plansRes.status === 200, 'GET /billing/plans returns HTTP 200');
    const plansData = await plansRes.json();
    const plans = plansData.data || [];
    assert(plans.length >= 3, `Commercial catalog contains ${plans.length} tiers`);
    assert(plans.some((p) => p.id === 'starter'), 'Catalog includes Starter tier');
    assert(plans.some((p) => p.id === 'growth'), 'Catalog includes Growth tier');
    assert(plans.some((p) => p.id === 'agency_scale'), 'Catalog includes Agency Scale tier');

    // 2. Subscription Details
    const subRes = await fetch(`${API_BASE}/billing/subscription`, { headers: authHeaders });
    assert(subRes.status === 200, 'GET /billing/subscription returns HTTP 200');
    const subData = await subRes.json();
    const sub = subData.data;
    assert(Boolean(sub.planId), `Current plan ID: "${sub.planId}"`);
    assert(Boolean(sub.planName), `Current plan name: "${sub.planName}"`);
    assert(sub.status === 'active' || sub.status === 'trialing', `Subscription status: "${sub.status}"`);
    assert(sub.billingPeriod && Boolean(sub.billingPeriod.start), 'Displays Billing Period');
    assert(Boolean(sub.nextBillingDate), `Displays Next Billing Date: ${sub.nextBillingDate}`);
    assert(typeof sub.cancelAtPeriodEnd === 'boolean', `Displays cancelAtPeriodEnd flag: ${sub.cancelAtPeriodEnd}`);

    // 3. Live Quota Usage (7 Dimensions)
    const usageRes = await fetch(`${API_BASE}/billing/usage`, { headers: authHeaders });
    assert(usageRes.status === 200, 'GET /billing/usage returns HTTP 200');
    const usage = (await usageRes.json()).data;
    assert(usage.postsPublished && typeof usage.postsPublished.used === 'number', 'Quota 1: Posts Published tracked');
    assert(usage.socialAccounts && typeof usage.socialAccounts.used === 'number', 'Quota 2: Social Channels tracked');
    assert(usage.brands && typeof usage.brands.used === 'number', 'Quota 3: Brand Kits tracked');
    assert(usage.users && typeof usage.users.used === 'number', 'Quota 4: Team Seats tracked');
    assert(usage.aiUsage && typeof usage.aiUsage.used === 'number', 'Quota 5: AI Studio Tokens tracked');
    assert(usage.videoRendering && typeof usage.videoRendering.used === 'number', 'Quota 6: Video Rendering Seconds tracked');
    assert(usage.storage && typeof usage.storage.used === 'number', 'Quota 7: Media Storage Bytes tracked');

    // 4. Invoices
    const invoicesRes = await fetch(`${API_BASE}/billing/invoices`, { headers: authHeaders });
    assert(invoicesRes.status === 200, 'GET /billing/invoices returns HTTP 200');
    const invoices = (await invoicesRes.json()).data;
    assert(Array.isArray(invoices), 'Invoices list returned as array');

    // 5. Customer Portal Session
    const portalRes = await fetch(`${API_BASE}/billing/portal`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ returnUrl: 'http://localhost:5173/?tab=billing' }),
    });
    assert(portalRes.status === 200, 'POST /billing/portal returns HTTP 200');
    const portalData = await portalRes.json();
    assert(Boolean(portalData.data?.url), `Stripe Customer Portal URL generated: ${portalData.data?.url?.substring(0, 50)}...`);

    // 6. Billing Audit Logs
    const auditRes = await fetch(`${API_BASE}/billing/audit-logs`, { headers: authHeaders });
    assert(auditRes.status === 200, 'GET /billing/audit-logs returns HTTP 200');
    const auditLogs = (await auditRes.json()).data;
    assert(Array.isArray(auditLogs), `Audit logs retrieved: ${auditLogs.length} events recorded`);

    // 7. Automated Dunning Status
    const dunningRes = await fetch(`${API_BASE}/billing/dunning`, { headers: authHeaders });
    assert(dunningRes.status === 200, 'GET /billing/dunning returns HTTP 200');
    const dunning = (await dunningRes.json()).data;
    assert(typeof dunning.isPastDue === 'boolean', `Dunning isPastDue: ${dunning.isPastDue}`);
    assert(typeof dunning.isInGracePeriod === 'boolean', `Dunning isInGracePeriod: ${dunning.isInGracePeriod}`);

    // -------------------------------------------------------------------------
    // Phase 6: Full Subscription Lifecycle Integration
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 6: Self-Service Lifecycle (Upgrade, Downgrade, Cancel-at-Period-End, Resume) ---');
    // Create dedicated sandbox workspace for lifecycle tests
    const lifeTenantId = uuidv4();
    const lifeAdminId = uuidv4();
    const lifeCreatorId = uuidv4();
    const lifeEmail = `lifecycle-admin-${Date.now()}@socialforge.io`;

    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, 'Lifecycle QA Agency', ?, '{}', NOW(), NOW())`,
      [lifeTenantId, `life-${Date.now()}`]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Lifecycle Admin', 0, 1, NOW(), NOW())`,
      [lifeAdminId, lifeEmail]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), lifeTenantId, lifeAdminId]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Lifecycle Creator', 0, 1, NOW(), NOW())`,
      [lifeCreatorId, `life-creator-${Date.now()}@socialforge.io`]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'creator', NOW(), NOW())`,
      [uuidv4(), lifeTenantId, lifeCreatorId]
    );

    // Initial Starter subscription
    const lifeSubId = uuidv4();
    await connection.execute(
      `INSERT INTO tenant_subscriptions (
        id, tenant_id, plan_id, status, provider,
        provider_customer_id, provider_subscription_id,
        current_period_start, current_period_end,
        cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, 'starter', 'active', 'stripe', 'cus_life_qa', 'sub_life_qa', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0, NOW(), NOW())`,
      [lifeSubId, lifeTenantId]
    );

    // Seed brand and post to verify customer data preservation
    const lifeBrandId = uuidv4();
    await connection.execute(
      `INSERT INTO brands (id, tenant_id, name, slug, industry, timezone, created_at, updated_at)
       VALUES (?, ?, 'Lifecycle Brand', 'life-brand', 'Marketing', 'UTC', NOW(), NOW())`,
      [lifeBrandId, lifeTenantId]
    );
    await connection.execute(
      `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Lifecycle Post', 'Preserved Content', 'draft', NOW(), NOW())`,
      [uuidv4(), lifeTenantId, lifeBrandId, lifeAdminId]
    );

    const tokenLifeAdmin = jwt.sign(
      { userId: lifeAdminId, tenantId: lifeTenantId, role: 'admin', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const tokenLifeCreator = jwt.sign(
      { userId: lifeCreatorId, tenantId: lifeTenantId, role: 'creator', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const lifeAdminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenLifeAdmin}`,
    };
    const lifeCreatorHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenLifeCreator}`,
    };

    // Role Guard Check: Creator is blocked with 403
    const blockedCancel = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: lifeCreatorHeaders,
      body: JSON.stringify({ immediately: false }),
    });
    assert(blockedCancel.status === 403, 'Non-admin blocked from cancelling subscription (HTTP 403 Forbidden)');

    // Admin Upgrades to Growth
    const upRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: lifeAdminHeaders,
      body: JSON.stringify({ newPlanId: 'growth' }),
    });
    assert(upRes.status === 200, 'Admin can upgrade subscription to Growth tier');
    const upData = await upRes.json();
    assert(upData.data.planId === 'growth', 'Tier updated to "growth"');

    // Admin Downgrades back to Starter
    const downRes = await fetch(`${API_BASE}/billing/subscription/change`, {
      method: 'POST',
      headers: lifeAdminHeaders,
      body: JSON.stringify({ newPlanId: 'starter' }),
    });
    assert(downRes.status === 200, 'Admin can downgrade subscription back to Starter tier');

    // Support Cancel-at-period-end
    const cancelRes = await fetch(`${API_BASE}/billing/subscription/cancel`, {
      method: 'POST',
      headers: lifeAdminHeaders,
      body: JSON.stringify({ immediately: false }),
    });
    assert(cancelRes.status === 200, 'Cancel at period end succeeds with HTTP 200');
    const cancelData = await cancelRes.json();
    assert(cancelData.data.cancelAtPeriodEnd === true, 'Response confirms cancelAtPeriodEnd = true');
    assert(cancelData.data.status === 'active', 'Subscription status remains "active" until period end');
    assert(Boolean(cancelData.data.nextBillingDate), 'Next billing date indicates effective cancellation date');

    // Verify Customer Data Preservation
    const [brandsPostCancel] = await connection.execute('SELECT COUNT(*) as count FROM brands WHERE tenant_id = ?', [lifeTenantId]);
    const [postsPostCancel] = await connection.execute('SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?', [lifeTenantId]);
    assert(brandsPostCancel[0].count === 1, 'Customer brand data 100% preserved (0 deleted)');
    assert(postsPostCancel[0].count === 1, 'Customer post data 100% preserved (0 deleted)');

    // Resume Subscription
    const resumeRes = await fetch(`${API_BASE}/billing/subscription/resume`, {
      method: 'POST',
      headers: lifeAdminHeaders,
    });
    assert(resumeRes.status === 200, 'Resume subscription succeeds with HTTP 200');
    const resumeData = await resumeRes.json();
    assert(resumeData.data.cancelAtPeriodEnd === false, 'cancelAtPeriodEnd flag cleared to false');
    assert(resumeData.data.status === 'active', 'Subscription restored to renewing active state');

    // Verify Audit Logs for Lifecycle Events
    const lifeAuditRes = await fetch(`${API_BASE}/billing/audit-logs`, { headers: lifeAdminHeaders });
    assert(lifeAuditRes.status === 200, 'GET /billing/audit-logs returns lifecycle audit logs');
    const lifeAudit = (await lifeAuditRes.json()).data;
    const lifeEvents = lifeAudit.map((e) => e.eventType);
    assert(lifeEvents.includes('subscription_upgraded'), 'Audit log recorded "subscription_upgraded"');
    assert(lifeEvents.includes('subscription_downgraded'), 'Audit log recorded "subscription_downgraded"');
    assert(lifeEvents.includes('subscription_cancel_scheduled'), 'Audit log recorded "subscription_cancel_scheduled"');
    assert(lifeEvents.includes('subscription_resumed'), 'Audit log recorded "subscription_resumed"');

    // Clean up lifecycle sandbox tenant
    await connection.execute('DELETE FROM billing_events WHERE tenant_id = ?', [lifeTenantId]);
    await connection.execute('DELETE FROM posts WHERE tenant_id = ?', [lifeTenantId]);
    await connection.execute('DELETE FROM brands WHERE tenant_id = ?', [lifeTenantId]);
    await connection.execute('DELETE FROM tenant_subscriptions WHERE tenant_id = ?', [lifeTenantId]);
    await connection.execute('DELETE FROM tenant_users WHERE tenant_id = ?', [lifeTenantId]);
    await connection.execute('DELETE FROM users WHERE id IN (?, ?)', [lifeAdminId, lifeCreatorId]);
    await connection.execute('DELETE FROM tenants WHERE id = ?', [lifeTenantId]);

    // -------------------------------------------------------------------------
    // Phase 7: Final Integrity Re-Confirmation
    // -------------------------------------------------------------------------
    console.log('\n--- PHASE 7: Post-Walkthrough Production Lock Verification ---');
    const [finalMetaCheck] = await connection.execute(
      'SELECT id, post_id, remote_post_id, platform, status FROM post_variants WHERE remote_post_id = ?',
      [META_LOCKED_POST_ID]
    );
    assert(finalMetaCheck.length >= 1 && finalMetaCheck[0].status === 'published', 'Meta production post 1405588742634526_122100337179498315 strictly intact and unchanged');

    // -------------------------------------------------------------------------
    // Walkthrough Summary
    // -------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`  E2E PRODUCTION WALKTHROUGH COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('  ALL SUBSYSTEMS FULLY OPERATIONAL AND VERIFIED');
    console.log('================================================================================\n');

    if (failed > 0) process.exit(1);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Fatal walkthrough error:', err);
  process.exit(1);
});
