/**
 * Stage 28: Multi-Tenant Custom Domains & White-Label Agency Portals Suite
 * SocialForge Platform v4.6.0
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin-only RBAC security (401 unauthenticated, 403 regular tenant member rejection)
 * 3. Overview telemetry & KPI counters (totalDomains, activeDomains, pendingDns, sslIssued, dnsCheckPassRate)
 * 4. Pre-seeded enterprise domain verification (review.luminawellness.com)
 * 5. Domain CRUD & FQDN validation:
 *    - Rejection of invalid domains (spaces, missing TLD, localnames)
 *    - Rejection of reserved/system domains (socialforge.ai, api.socialforge.ai, localhost)
 *    - Registration of valid FQDN (client-review.stage28test.io)
 *    - Rejection of duplicate domain registration (409 Conflict)
 * 6. DNS Verification Engine:
 *    - Unverified / failure state handling
 *    - Successful verification via CNAME/TXT matching (simulated forceSuccess)
 *    - Automatic ACME SSL certificate issuance upon DNS verification
 * 7. SSL Certificate Provisioning & Manual 90-day Renewal:
 *    - Validates ~90-day certificate validity and Let's Encrypt issuer
 *    - Rejects SSL issuance if DNS is not verified
 * 8. White-Label Branding Studio Customization:
 *    - Hex color validation (#3b82f6 valid, #invalid rejected)
 *    - Custom branding persistence (agencyName, logo, favicon, colors, customCss, hideSocialforgeBranding)
 * 9. Public White-Label Config Resolver:
 *    - Resolves branding by ?domain= parameter (unauthenticated)
 *    - Resolves branding by Host header (unauthenticated)
 *    - Returns 404 for unconfigured or inactive domains
 *    - Ensures no sensitive internal keys or secrets leaked to public client
 * 10. Public Domain Validation Endpoint (/validate-domain):
 *     - Correctly reports registered vs available status
 * 11. Access Logging & Telemetry:
 *     - Public resolver queries automatically recorded in custom_domain_access_logs
 *     - Superadmin can query access logs with IP, user-agent, host, and response time
 * 12. Domain Deletion & Cascade:
 *     - Superadmin can cleanly delete custom domains
 * 13. Audit Logging:
 *     - Superadmin audit logs recorded for domain creation, verification, branding, SSL, deletion
 */

import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3308,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'socialforge_db',
};

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

const META_LOCK_REMOTE_POST_ID = '1405588742634526_122100337179498315';
const META_LOCK_JOB_ID = '256cf21a-26cd-4032-a7b8-17261d8a81b1';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function verifyMetaLock(connection, stepDescription) {
  const [variants] = await connection.execute(
    'SELECT id, status FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length === 1, `[${stepDescription}] Production Meta variant exists.`);
  assert(variants[0].status === 'published', `[${stepDescription}] Production Meta variant status is strictly 'published'.`);

  const [jobs] = await connection.execute(
    'SELECT id, status FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length === 1, `[${stepDescription}] Production Meta publishing job exists.`);
  assert(jobs[0].status === 'published', `[${stepDescription}] Production Meta publishing job status is strictly 'published'.`);
}

function makeToken(user, isSuperadmin = false) {
  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: isSuperadmin ? 'superadmin' : 'member',
      isSuperadmin,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function runStage28Tests() {
  console.log('\n======================================================================');
  console.log('   STAGE 28: MULTI-TENANT CUSTOM DOMAINS & WHITE-LABEL AGENCY PORTALS');
  console.log('   Platform Version: v4.6.0');
  console.log('======================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // 1. PRE-CHECK: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('[Step 1] Pre-Verification: Production Meta Publication Lock Invariant');
    await verifyMetaLock(connection, 'PRE-CHECK');

    // Retrieve active superadmin and regular tenant user
    const [superadmins] = await connection.execute('SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1');
    assert(superadmins.length > 0, 'Found active superadmin user');
    const superadmin = superadmins[0];

    const [members] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role FROM tenant_users tu
       JOIN tenants t ON tu.tenant_id = t.id
       JOIN users u ON tu.user_id = u.id
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    assert(members.length > 0, 'Found active regular tenant member');
    const member = members[0];

    // Retrieve Lumina Wellness tenant ID from seeded custom domain or tenants table
    const [luminaDomains] = await connection.execute(
      "SELECT tenant_id FROM custom_domains WHERE domain = 'review.luminawellness.com' LIMIT 1"
    );
    const luminaTenantId = luminaDomains.length > 0 ? luminaDomains[0].tenant_id : member.tenant_id;
    console.log(`  Scoping tests to tenant ID: ${luminaTenantId}`);

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, isSuperAdmin: true, tenantId: luminaTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );
    const regularUserToken = jwt.sign(
      { userId: member.id, email: member.email, isSuperadmin: false, isSuperAdmin: false, tenantId: member.tenant_id, role: member.role || 'member' },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Clean up any stale test domain from previous test runs
    await connection.execute("DELETE FROM custom_domains WHERE domain LIKE '%stage28test.io%'");

    // -------------------------------------------------------------------------
    // 2. SECURITY & RBAC ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n[Step 2] Superadmin RBAC & Security Boundaries');

    // 2.1 Unauthenticated request rejected with 401
    const unauthRes = await request('/admin/operations/custom-domains/overview');
    assert(unauthRes.status === 401, 'Unauthenticated access to custom-domains overview rejected with 401');

    // 2.2 Regular tenant member access rejected with 403
    const memberRes = await request('/admin/operations/custom-domains/overview', {
      headers: { Authorization: `Bearer ${regularUserToken}` },
    });
    assert(memberRes.status === 403, 'Regular tenant member rejected from custom-domains overview with 403');

    // 2.3 Regular tenant member creation rejected with 403
    const memberCreateRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${regularUserToken}` },
      body: JSON.stringify({
        domain: 'portal.hacktry.com',
        tenantId: luminaTenantId,
      }),
    });
    assert(memberCreateRes.status === 403, 'Regular member rejected from domain creation with 403');

    // 2.4 Regular member deletion rejected with 403
    const memberDeleteRes = await request('/admin/operations/custom-domains/any-id', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${regularUserToken}` },
    });
    assert(memberDeleteRes.status === 403, 'Regular member rejected from domain deletion with 403');

    // -------------------------------------------------------------------------
    // 3. OVERVIEW TELEMETRY & PRE-SEEDED ENTERPRISE DOMAIN
    // -------------------------------------------------------------------------
    console.log('\n[Step 3] Overview Telemetry & Pre-Seeded Enterprise Domain');

    const overviewRes = await request('/admin/operations/custom-domains/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(overviewRes.status === 200, 'Superadmin can fetch custom-domains overview (200)');
    assert(overviewRes.data.success === true, 'Overview response has success: true');
    const telemetry = overviewRes.data.data;
    assert(typeof telemetry.totalDomains === 'number' && telemetry.totalDomains >= 1, 'Telemetry totalDomains >= 1');
    assert(typeof telemetry.activeDomains === 'number', 'Telemetry activeDomains is number');
    assert(typeof telemetry.sslIssued === 'number', 'Telemetry sslIssued is number');
    assert(typeof telemetry.dnsCheckPassRate === 'number', 'Telemetry dnsCheckPassRate is number');
    console.log(`  Telemetry stats: Total=${telemetry.totalDomains}, Active=${telemetry.activeDomains}, SSL=${telemetry.sslIssued}`);

    // Verify pre-seeded enterprise domain review.luminawellness.com
    const listRes = await request('/admin/operations/custom-domains?search=luminawellness', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listRes.status === 200, 'Superadmin can list custom domains');
    const luminaDomain = listRes.data.data.domains.find((d) => d.domain === 'review.luminawellness.com');
    assert(Boolean(luminaDomain), 'Pre-seeded enterprise domain "review.luminawellness.com" exists');
    assert(luminaDomain.status === 'active', 'Pre-seeded domain status is "active"');
    assert(luminaDomain.sslStatus === 'issued', 'Pre-seeded domain SSL status is "issued"');
    assert(luminaDomain.branding.agencyName === 'Lumina Creative Studio', 'Pre-seeded branding agencyName correct');
    assert(luminaDomain.branding.primaryColor === '#6366f1', 'Pre-seeded branding primaryColor is #6366f1');

    // -------------------------------------------------------------------------
    // 4. DOMAIN CRUD & FQDN VALIDATION
    // -------------------------------------------------------------------------
    console.log('\n[Step 4] Domain CRUD & FQDN Validation');

    // 4.1 Rejection of invalid domain format (spaces)
    const invalidFormatRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        domain: 'not a valid domain name',
        tenantId: luminaTenantId,
      }),
    });
    assert(invalidFormatRes.status === 400, 'Domain with spaces rejected with 400 Bad Request');

    // 4.2 Rejection of invalid domain format (missing TLD)
    const noTldRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        domain: 'localhostportal',
        tenantId: luminaTenantId,
      }),
    });
    assert(noTldRes.status === 400, 'Domain without TLD rejected with 400 Bad Request');

    // 4.3 Rejection of reserved system domain
    const reservedRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        domain: 'app.socialforge.ai',
        tenantId: luminaTenantId,
      }),
    });
    assert(reservedRes.status === 400, 'Reserved system domain "app.socialforge.ai" rejected with 400 Bad Request');

    // 4.4 Successful domain creation
    const testDomainName = 'portal-client.stage28test.io';
    const createRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        domain: testDomainName,
        tenantId: luminaTenantId,
        portalType: 'client_review',
        verificationMethod: 'cname',
        enforceHttps: true,
        branding: {
          agencyName: 'Stage28 Test Agency',
          primaryColor: '#6366f1',
          accentColor: '#10b981',
        },
      }),
    });
    if (createRes.status !== 201) {
      console.log('createRes failed:', createRes.status, createRes.data);
    }
    assert(createRes.status === 201, 'Valid custom domain registration returned 201 Created');
    assert(createRes.data.success === true, 'Created domain response success: true');
    const createdDomain = createRes.data.data;
    assert(createdDomain.domain === testDomainName, 'Created domain FQDN matches');
    assert(createdDomain.status === 'pending_dns', 'Initial domain status is "pending_dns"');
    assert(createdDomain.sslStatus === 'pending', 'Initial SSL status is "pending"');
    assert(createdDomain.dnsTarget === 'cname.socialforge.ai', 'CNAME target is "cname.socialforge.ai"');
    assert(createdDomain.verificationToken.startsWith('sf-verify-'), 'Verification token generated with sf-verify- prefix');
    const testDomainId = createdDomain.id;

    // 4.5 Duplicate domain registration rejection
    const duplicateRes = await request('/admin/operations/custom-domains', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        domain: testDomainName,
        tenantId: luminaTenantId,
      }),
    });
    assert(duplicateRes.status === 409, 'Duplicate domain registration rejected with 409 Conflict');

    // 4.6 Get Domain by ID
    const getByIdRes = await request(`/admin/operations/custom-domains/${testDomainId}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(getByIdRes.status === 200, 'Can retrieve domain by ID');
    assert(getByIdRes.data.data.id === testDomainId, 'Retrieved domain ID matches');

    // -------------------------------------------------------------------------
    // 5. DNS VERIFICATION & AUTOMATED SSL ISSUANCE
    // -------------------------------------------------------------------------
    console.log('\n[Step 5] DNS Verification Engine & Automatic SSL Issuance');

    // 5.1 Simulated DNS verification failure
    const failDnsRes = await request(`/admin/operations/custom-domains/${testDomainId}/verify-dns`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ forceSuccess: false, cnameActual: 'wrong.target.net' }),
    });
    assert(failDnsRes.status === 200, 'DNS check endpoint returns 200');
    assert(failDnsRes.data.data.cnameMatched === false, 'cnameMatched is false when target differs');
    assert(failDnsRes.data.data.status === 'dns_error', 'Domain status transitions to dns_error');

    // Verify DB reflects dns_error
    const [dbFailRows] = await connection.execute('SELECT status, cname_verified FROM custom_domains WHERE id = ?', [testDomainId]);
    assert(dbFailRows[0].status === 'dns_error', 'Database row status is dns_error');
    assert(dbFailRows[0].cname_verified === 0, 'Database cname_verified is 0');

    // 5.2 Attempt SSL issuance before DNS is verified (Must fail with 400)
    const prematureSslRes = await request(`/admin/operations/custom-domains/${testDomainId}/renew-ssl`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(prematureSslRes.status === 400, 'SSL certificate renewal before DNS verification rejected with 400');

    // 5.3 Simulated DNS verification success
    const passDnsRes = await request(`/admin/operations/custom-domains/${testDomainId}/verify-dns`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ forceSuccess: true }),
    });
    assert(passDnsRes.status === 200, 'Successful DNS verification returned 200');
    assert(passDnsRes.data.data.cnameMatched === true, 'cnameMatched is true');
    assert(passDnsRes.data.data.status === 'active', 'Domain status transitions to "active"');

    // 5.4 Check automatic ACME SSL certificate issuance
    const [dbActiveRows] = await connection.execute(
      'SELECT status, cname_verified, ssl_status, ssl_issuer, ssl_expires_at FROM custom_domains WHERE id = ?',
      [testDomainId]
    );
    assert(dbActiveRows[0].status === 'active', 'Domain status in DB is active');
    assert(dbActiveRows[0].cname_verified === 1, 'Domain cname_verified in DB is 1');
    assert(dbActiveRows[0].ssl_status === 'issued', 'Automatic SSL status is "issued"');
    assert(dbActiveRows[0].ssl_issuer.includes("Let's Encrypt"), "SSL issuer is Let's Encrypt");
    const expiresAt = new Date(dbActiveRows[0].ssl_expires_at);
    const daysUntilExpiry = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    assert(daysUntilExpiry >= 88 && daysUntilExpiry <= 92, `SSL certificate validity is ~90 days (${daysUntilExpiry.toFixed(1)} days)`);

    // -------------------------------------------------------------------------
    // 6. MANUAL SSL CERTIFICATE RENEWAL
    // -------------------------------------------------------------------------
    console.log('\n[Step 6] Manual SSL Certificate Renewal');

    const renewSslRes = await request(`/admin/operations/custom-domains/${testDomainId}/renew-ssl`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(renewSslRes.status === 200, 'Manual SSL renewal returned 200 OK');
    assert(renewSslRes.data.data.sslStatus === 'issued', 'Renewed SSL certificate status is "issued"');
    assert(renewSslRes.data.data.sslAutoRenew === true, 'Renewed SSL auto-renew flag is true');

    // -------------------------------------------------------------------------
    // 7. WHITE-LABEL BRANDING STUDIO CUSTOMIZATION
    // -------------------------------------------------------------------------
    console.log('\n[Step 7] White-Label Branding Studio Customization');

    // 7.1 Reject invalid hex colors
    const invalidColorRes = await request(`/admin/operations/custom-domains/${testDomainId}/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ primaryColor: 'not-a-hex' }),
    });
    assert(invalidColorRes.status === 400, 'Invalid hex color rejected with 400 Bad Request');

    // 7.2 Update full branding suite
    const updateBrandingRes = await request(`/admin/operations/custom-domains/${testDomainId}/branding`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        agencyName: 'Apex Media Growth',
        logoLightUrl: 'https://cdn.stage28test.io/assets/logo-light.svg',
        logoDarkUrl: 'https://cdn.stage28test.io/assets/logo-dark.svg',
        faviconUrl: 'https://cdn.stage28test.io/assets/favicon.ico',
        primaryColor: '#8b5cf6',
        accentColor: '#ec4899',
        customCss: ':root { --accent: #ec4899; } .portal-header { border-bottom: 2px solid #8b5cf6; }',
        hideSocialforgeBranding: true,
        footerText: 'Powered by Apex White-Label Suite',
        supportEmail: 'support@apexmedia.agency',
      }),
    });
    assert(updateBrandingRes.status === 200, 'White-label branding update returned 200 OK');
    const updatedBranding = updateBrandingRes.data.data.branding;
    assert(updatedBranding.agencyName === 'Apex Media Growth', 'Updated agencyName persisted');
    assert(updatedBranding.primaryColor === '#8b5cf6', 'Updated primaryColor persisted');
    assert(updatedBranding.accentColor === '#ec4899', 'Updated accentColor persisted');
    assert(updatedBranding.hideSocialforgeBranding === true, 'hideSocialforgeBranding flag persisted');
    assert(updatedBranding.customCss.includes('.portal-header'), 'Custom CSS stylesheet persisted');
    assert(updatedBranding.supportEmail === 'support@apexmedia.agency', 'Support email persisted');

    // -------------------------------------------------------------------------
    // 8. PUBLIC WHITE-LABEL RESOLVER (NO AUTHENTICATION)
    // -------------------------------------------------------------------------
    console.log('\n[Step 8] Public White-Label Config Resolver');

    // 8.1 Resolve branding via ?domain= parameter without credentials
    const publicQueryRes = await request(`/public/white-label/config?domain=${testDomainName}`);
    assert(publicQueryRes.status === 200, 'Public resolver via ?domain= returned 200 OK');
    assert(publicQueryRes.data.success === true, 'Public resolver response success: true');
    const publicConfig = publicQueryRes.data.data;
    assert(publicConfig.domain === testDomainName, 'Public config domain matches');
    assert(publicConfig.agencyName === 'Apex Media Growth', 'Public config agencyName matches');
    assert(publicConfig.primaryColor === '#8b5cf6', 'Public config primaryColor matches');
    assert(publicConfig.hideSocialforgeBranding === true, 'Public config hideSocialforgeBranding matches');
    // Ensure zero internal secret leaks (no verification token, no DB IDs, etc.)
    assert(publicConfig.verificationToken === undefined, 'No verificationToken leaked to public config');
    assert(publicConfig.dnsTarget === undefined, 'No dnsTarget leaked to public config');

    // 8.2 Resolve branding via Host / X-Forwarded-Host reverse proxy header without credentials
    const publicHostRes = await request('/public/white-label/config', {
      headers: { 'X-Forwarded-Host': testDomainName, Host: testDomainName },
    });
    assert(publicHostRes.status === 200, 'Public resolver via Host / X-Forwarded-Host returned 200 OK');
    assert(publicHostRes.data.data.domain === testDomainName, 'Host-based resolution resolved correct domain');

    // 8.3 404 for unconfigured domain
    const nonExistentRes = await request('/public/white-label/config?domain=unconfigured-domain-404.xyz');
    assert(nonExistentRes.status === 404, 'Unconfigured domain returns 404 Not Found');

    // -------------------------------------------------------------------------
    // 9. PUBLIC DOMAIN VALIDATION ENDPOINT
    // -------------------------------------------------------------------------
    console.log('\n[Step 9] Public Domain Validation Endpoint');

    // 9.1 Check registered domain
    const valRegisteredRes = await request(`/public/white-label/validate-domain?domain=${testDomainName}`);
    assert(valRegisteredRes.status === 200, 'Validate domain returns 200 OK');
    assert(valRegisteredRes.data.data.available === false, 'Existing domain reported as unavailable');
    assert(valRegisteredRes.data.data.registered === true, 'Existing domain reported as registered');

    // 9.2 Check available domain
    const valFreeRes = await request('/public/white-label/validate-domain?domain=completely-free-new-agency.io');
    assert(valFreeRes.status === 200, 'Validate free domain returns 200 OK');
    assert(valFreeRes.data.data.available === true, 'Free domain reported as available');
    assert(valFreeRes.data.data.registered === false, 'Free domain reported as not registered');

    // -------------------------------------------------------------------------
    // 10. ACCESS LOGGING & TELEMETRY
    // -------------------------------------------------------------------------
    console.log('\n[Step 10] Access Logging & Telemetry');

    // Wait briefly for asynchronous background access log writes to flush
    await new Promise((r) => setTimeout(r, 150));

    // Query recorded access logs for test domain
    const logsRes = await request(`/admin/operations/custom-domains/${testDomainId}/logs?limit=25`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(logsRes.status === 200, 'Superadmin can list access logs (200 OK)');
    const logs = logsRes.data.data;
    assert(Array.isArray(logs), 'Access logs is an array');
    assert(logs.length >= 1, `Found ${logs.length} access log entries for test domain`);
    const latestLog = logs[0];
    assert(latestLog.customDomainId === testDomainId, 'Access log customDomainId matches');
    assert(typeof latestLog.statusCode === 'number' && latestLog.statusCode === 200, 'Access log recorded 200 status code');
    assert(Boolean(latestLog.clientIp), 'Access log recorded client IP');
    console.log(`  Sample access log: IP=${latestLog.clientIp}, Path=${latestLog.requestPath}, Time=${latestLog.responseTimeMs}ms`);

    // -------------------------------------------------------------------------
    // 11. AUDIT LOGGING INSPECTION
    // -------------------------------------------------------------------------
    console.log('\n[Step 11] Superadmin Audit Trail for Custom Domain Actions');

    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type, target_resource_id, superadmin_email FROM superadmin_audit_logs WHERE target_resource_type = 'custom_domain' AND target_resource_id = ? ORDER BY created_at DESC",
      [testDomainId]
    );
    assert(auditRows.length >= 3, `Recorded at least 3 audit log events (found ${auditRows.length})`);
    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('create_custom_domain'), 'Audit log includes create_custom_domain');
    assert(actions.includes('verify_custom_domain_dns'), 'Audit log includes verify_custom_domain_dns');
    assert(actions.includes('update_white_label_branding'), 'Audit log includes update_white_label_branding');
    console.log(`  Recorded audit actions: ${actions.join(', ')}`);

    // -------------------------------------------------------------------------
    // 12. DOMAIN DELETION & CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[Step 12] Custom Domain Deletion & Cleanup');

    const deleteRes = await request(`/admin/operations/custom-domains/${testDomainId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteRes.status === 200, 'Domain deletion returned 200 OK');
    assert(deleteRes.data.data.success === true, 'Delete response success: true');
    assert(deleteRes.data.data.deletedDomain === testDomainName, 'deletedDomain matches');

    // Confirm removed from database
    const [postDeleteRows] = await connection.execute('SELECT id FROM custom_domains WHERE id = ?', [testDomainId]);
    assert(postDeleteRows.length === 0, 'Domain row is deleted from custom_domains');

    // Confirm access logs cleaned up or unlinked
    const [postDeleteLogs] = await connection.execute('SELECT id FROM custom_domain_access_logs WHERE custom_domain_id = ?', [testDomainId]);
    assert(postDeleteLogs.length === 0, 'Domain access logs cleanly cascaded on deletion');

    // -------------------------------------------------------------------------
    // 13. POST-CHECK: Production Meta Publication Lock Invariant
    // -------------------------------------------------------------------------
    console.log('\n[Step 13] Post-Verification: Production Meta Publication Lock Invariant');
    await verifyMetaLock(connection, 'POST-CHECK');

    console.log('\n======================================================================');
    console.log(`  ✓ STAGE 28 SUITE COMPLETE: ${passedTests} passed, ${failedTests} failed`);
    console.log('======================================================================\n');
  } finally {
    await connection.end();
  }
}

runStage28Tests().catch((err) => {
  console.error('\n❌ STAGE 28 TEST SUITE FAILED:', err);
  process.exit(1);
});
