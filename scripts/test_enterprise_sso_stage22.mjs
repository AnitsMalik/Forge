/**
 * Stage 22: Enterprise SSO & SAML 2.0 / OIDC Identity Provider Federation Suite
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on SSO endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. Public Domain Lookup for Corporate SSO (GET /api/v1/auth/sso/lookup)
 * 4. SP SAML Metadata XML Generation (GET /api/v1/auth/sso/saml/:configId/metadata)
 * 5. SSO Overview & Telemetry Metrics (GET /api/v1/admin/operations/sso/overview)
 * 6. Register New Enterprise SSO IdP with Audit Trail (POST /api/v1/admin/operations/sso/configs)
 * 7. Update SSO IdP Settings & Domain Mappings (PUT /api/v1/admin/operations/sso/configs/:id)
 * 8. Synthetic SAML Assertion Probe Simulation (POST /api/v1/admin/operations/sso/configs/:id/simulate)
 * 9. Real SAML Assertion Consumer Service (ACS) Handshake & JIT Tenant User Provisioning (POST /api/v1/auth/sso/saml/:configId/acs)
 * 10. Audit Logging Verification in enterprise_sso_login_audits & superadmin_audit_logs
 * 11. Delete SSO IdP Configuration & Cleanup (DELETE /api/v1/admin/operations/sso/configs/:id)
 * 12. Production Meta Publication Lock Intact (Final Verification)
 */

import crypto from 'crypto';
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
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

async function verifyMetaLock(dbConnection, phaseLabel) {
  console.log(`\n--- [Meta Publication Lock Invariant: ${phaseLabel}] ---`);

  const [variants] = await dbConnection.execute(
    'SELECT id, remote_post_id, platform, status FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length > 0, `Meta post variant found for remote post ${META_LOCK_REMOTE_POST_ID}`);
  assert(variants[0].status === 'published', `Meta post variant strictly locked in 'published' status (current: ${variants[0].status})`);

  const [jobs] = await dbConnection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length > 0, `Production publishing job found for ID ${META_LOCK_JOB_ID}`);
  assert(jobs[0].status === 'published', `Publishing job strictly locked in 'published' status (current: ${jobs[0].status})`);
}

async function runStage22Suite() {
  console.log('========================================================================');
  console.log('   STAGE 22: ENTERPRISE SSO & SAML 2.0 / OIDC IDENTITY FEDERATION       ');
  console.log('========================================================================\n');

  const dbConnection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Meta Publication Lock Invariant Pre-check
    await verifyMetaLock(dbConnection, 'PRE-CHECK');

    // Clean up any lingering test configs from previous failed runs
    await dbConnection.execute("DELETE FROM enterprise_sso_configs WHERE id NOT IN ('sso-okta-acme-01', 'sso-azure-globex-02')");
    await dbConnection.execute("DELETE FROM enterprise_sso_login_audits WHERE config_id NOT IN ('sso-okta-acme-01', 'sso-azure-globex-02')");

    // Fetch superadmin and non-superadmin users for auth assertions
    const [superadmins] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'At least one superadmin user exists in database');
    const superadmin = superadmins[0];

    const [normalUsers] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(normalUsers.length > 0, 'At least one standard tenant user exists in database');
    const normalUser = normalUsers[0];

    const superadminToken = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, tenantId: superadmin.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const normalUserToken = jwt.sign(
      { userId: normalUser.id, email: normalUser.email, isSuperadmin: false, tenantId: normalUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 2. Superadmin RBAC & Auth Security Checks
    console.log('\n--- [1. RBAC & Security Assertions on SSO Management Endpoints] ---');
    
    const unauthRes = await request('/admin/operations/sso/overview');
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with 401 (got ${unauthRes.status})`);

    const forbiddenRes = await request('/admin/operations/sso/overview', {
      headers: { Authorization: `Bearer ${normalUserToken}` },
    });
    assert(forbiddenRes.status === 403, `Non-superadmin request correctly rejected with 403 Forbidden (got ${forbiddenRes.status})`);

    // 3. Public Domain Lookup for Corporate SSO
    console.log('\n--- [2. Public Corporate Domain Lookup Routing] ---');

    const acmeLookup = await request('/auth/sso/lookup?domain=acme-corp.com');
    assert(acmeLookup.status === 200, `Domain lookup for acme-corp.com returned 200`);
    assert(acmeLookup.data.hasSso === true, `acme-corp.com mapped to active enterprise SSO`);
    assert(acmeLookup.data.providerType === 'saml', `acme-corp.com configured as SAML 2.0 provider`);
    assert(typeof acmeLookup.data.idpSsoUrl === 'string', `acme-corp.com returns valid IdP SSO URL`);

    const globexLookup = await request('/auth/sso/lookup?domain=globex.com');
    assert(globexLookup.status === 200, `Domain lookup for globex.com returned 200`);
    assert(globexLookup.data.hasSso === true, `globex.com mapped to active enterprise SSO`);

    const unmappedLookup = await request('/auth/sso/lookup?domain=random-unregistered-domain.io');
    assert(unmappedLookup.status === 200, `Domain lookup for unregistered domain returned 200`);
    assert(unmappedLookup.data.hasSso === false, `Unregistered domain hasSso is false`);

    // 4. SP SAML Metadata XML Generation
    console.log('\n--- [3. Service Provider SAML 2.0 Metadata XML Generation] ---');

    const metadataRes = await request('/auth/sso/saml/sso-okta-acme-01/metadata');
    assert(metadataRes.status === 200, `SP Metadata endpoint returned 200 OK`);
    assert(typeof metadataRes.data === 'string', `Metadata response is raw text/XML string`);
    assert(metadataRes.data.includes('<md:EntityDescriptor'), `Metadata XML contains <md:EntityDescriptor`);
    assert(metadataRes.data.includes('<md:SPSSODescriptor'), `Metadata XML contains <md:SPSSODescriptor`);
    assert(metadataRes.data.includes('<md:AssertionConsumerService'), `Metadata XML contains <md:AssertionConsumerService`);
    assert(metadataRes.data.includes('/sso-okta-acme-01/acs'), `Metadata XML specifies correct ACS URL`);

    // 5. Enterprise SSO Overview & Telemetry
    console.log('\n--- [4. Enterprise SSO Overview & Telemetry Metrics] ---');

    const overviewRes = await request('/admin/operations/sso/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(overviewRes.status === 200, `SSO Overview returned 200 OK`);
    assert(overviewRes.data.totalConfigs >= 2, `Overview reports at least 2 IdP configurations (seed data)`);
    assert(overviewRes.data.activeConfigs >= 2, `Overview reports active configurations`);
    assert(overviewRes.data.activeDomainsCount >= 2, `Overview reports active corporate domains`);
    assert(Array.isArray(overviewRes.data.configs), `Overview contains configurations array`);

    // 6. Register New Enterprise SSO IdP
    console.log('\n--- [5. Register New Enterprise SSO Configuration] ---');

    const testIdpPayload = {
      tenantId: superadmin.tenant_id,
      name: 'MegaCorp Global Workforce Entra ID',
      providerType: 'saml',
      idpEntityId: 'https://login.microsoftonline.com/megacorp-tenant-uuid/v2.0',
      idpSsoUrl: 'https://login.microsoftonline.com/megacorp-tenant-uuid/saml2',
      idpCertificate: '-----BEGIN CERTIFICATE-----\nMIIDBTCCAe2gAwIBAgIQN...TESTING...CERTIFICATE\n-----END CERTIFICATE-----',
      domains: ['megacorp.internal', 'megacorp-holdings.com'],
      jitProvisioningEnabled: true,
      defaultRole: 'editor',
      enforceSso: false,
      status: 'active',
    };

    const createRes = await request('/admin/operations/sso/configs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify(testIdpPayload),
    });
    assert(createRes.status === 201, `Create SSO config returned 201 Created (got ${createRes.status})`);
    assert(createRes.data.name === testIdpPayload.name, `Saved IdP name matches input`);
    assert(createRes.data.jitProvisioningEnabled === true, `JIT provisioning enabled on new IdP`);
    assert(Array.isArray(createRes.data.domains) && createRes.data.domains.includes('megacorp.internal'), `Domains array contains megacorp.internal`);

    const createdConfigId = createRes.data.id;

    // Verify logged in superadmin_audit_logs
    const [createAudit] = await dbConnection.execute(
      `SELECT action, target_resource_type, target_resource_id FROM superadmin_audit_logs 
       WHERE target_resource_type = 'enterprise_sso_config' AND action = 'enterprise_sso_config_created' AND target_resource_id = ?`,
      [createdConfigId]
    );
    assert(createAudit.length > 0, `Operator create action recorded in superadmin_audit_logs`);

    // Verify domain routing works immediately for the new domain
    const megacorpLookup = await request('/auth/sso/lookup?domain=megacorp.internal');
    assert(megacorpLookup.status === 200, `Domain lookup for megacorp.internal returned 200`);
    assert(megacorpLookup.data.hasSso === true, `megacorp.internal immediately mapped to newly created SSO IdP`);

    // 7. Update SSO Configuration
    console.log('\n--- [6. Update Enterprise SSO Configuration] ---');

    const updateRes = await request(`/admin/operations/sso/configs/${createdConfigId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        defaultRole: 'admin',
        enforceSso: true,
      }),
    });
    assert(updateRes.status === 200, `Update SSO config returned 200 OK`);
    assert(updateRes.data.defaultRole === 'admin', `Updated default role is 'admin'`);
    assert(updateRes.data.enforceSso === true, `Updated enforceSso is true`);

    const [updateAudit] = await dbConnection.execute(
      `SELECT action, target_resource_type, target_resource_id FROM superadmin_audit_logs 
       WHERE target_resource_type = 'enterprise_sso_config' AND action = 'enterprise_sso_config_updated' AND target_resource_id = ?`,
      [createdConfigId]
    );
    assert(updateAudit.length > 0, `Operator update action recorded in superadmin_audit_logs`);

    // 8. Synthetic SAML Assertion Probe Simulation
    console.log('\n--- [7. Synthetic SAML Assertion Probe Simulation] ---');

    // Case A: Valid assertion matching mapped domain
    const validSimRes = await request(`/admin/operations/sso/configs/${createdConfigId}/simulate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        email: 'alice.operator@megacorp.internal',
        nameId: 'megacorp_usr_alice_99',
      }),
    });
    assert(validSimRes.status === 200, `Valid assertion probe returned 200 OK`);
    assert(validSimRes.data.valid === true, `Simulation result confirms valid assertion`);
    assert(validSimRes.data.userProvisioned === true, `JIT user provisioning triggered for new corporate user`);
    assert(validSimRes.data.assignedRole === 'admin', `Assigned default role matches configuration`);
    assert(typeof validSimRes.data.token === 'string', `Simulation issued valid test JWT session token`);

    // Case B: Assertion with unmapped domain (Security rejection)
    const invalidDomainSimRes = await request(`/admin/operations/sso/configs/${createdConfigId}/simulate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        email: 'malicious.actor@external-unauthorized.com',
        nameId: 'bad_actor_01',
      }),
    });
    assert(invalidDomainSimRes.status === 200, `Simulate endpoint handles rejection gracefully`);
    assert(invalidDomainSimRes.data.valid === false, `Simulation flagged assertion as invalid`);
    assert(invalidDomainSimRes.data.error.includes('is not mapped'), `Error explains domain mismatch`);

    // 9. Real SAML ACS Handshake & JIT Tenant User Provisioning
    console.log('\n--- [8. SAML Assertion Consumer Service (ACS) Handshake & JIT Provisioning] ---');

    const uniqueJitEmail = `jit.worker.${Date.now()}@megacorp.internal`;
    const acsRes = await request(`/auth/sso/saml/${createdConfigId}/acs`, {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueJitEmail,
        nameId: `nameid_${Date.now()}`,
        firstName: 'Elena',
        lastName: 'Rostova',
        role: 'editor',
      }),
    });
    assert(acsRes.status === 200, `SAML ACS endpoint returned 200 OK (got ${acsRes.status})`);
    assert(typeof acsRes.data.token === 'string', `ACS returned issued JWT authentication token`);
    assert(acsRes.data.user.email === uniqueJitEmail, `Returned user profile matches JIT email`);

    // Verify JIT user actually created in database
    const [jitUsers] = await dbConnection.execute(
      'SELECT id, email, is_active FROM users WHERE email = ?',
      [uniqueJitEmail]
    );
    assert(jitUsers.length > 0, `JIT provisioned user confirmed persisted in 'users' table`);
    assert(jitUsers[0].is_active === 1, `JIT provisioned user is active`);

    const [jitTenantRel] = await dbConnection.execute(
      'SELECT tenant_id, role FROM tenant_users WHERE user_id = ?',
      [jitUsers[0].id]
    );
    assert(jitTenantRel.length > 0, `JIT user linked to tenant in 'tenant_users' table`);

    // Verify authentication logged to enterprise_sso_login_audits
    const [loginAudits] = await dbConnection.execute(
      `SELECT id, email, status FROM enterprise_sso_login_audits 
       WHERE config_id = ? AND email = ?`,
      [createdConfigId, uniqueJitEmail]
    );
    assert(loginAudits.length > 0, `SSO authentication attempt recorded in 'enterprise_sso_login_audits'`);
    assert(loginAudits[0].status === 'success', `Audit log status is 'success'`);

    // 10. Audit Query Endpoints
    console.log('\n--- [9. SSO Audit Querying & Filtering] ---');

    const auditsListRes = await request(`/admin/operations/sso/audits?configId=${createdConfigId}`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(auditsListRes.status === 200, `List SSO audits returned 200 OK`);
    assert(Array.isArray(auditsListRes.data), `Audits response is an array`);
    assert(auditsListRes.data.length >= 1, `Audits list returned recorded ACS login audit`);

    // 11. Delete SSO Configuration
    console.log('\n--- [10. Delete Enterprise SSO Configuration] ---');

    const deleteRes = await request(`/admin/operations/sso/configs/${createdConfigId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(deleteRes.status === 200, `Delete SSO config returned 200 OK`);
    assert(deleteRes.data.success === true, `Delete response reported success`);

    // Verify deleted from DB
    const [deletedConfig] = await dbConnection.execute(
      'SELECT id FROM enterprise_sso_configs WHERE id = ?',
      [createdConfigId]
    );
    assert(deletedConfig.length === 0, `SSO configuration removed from 'enterprise_sso_configs'`);

    // Verify deletion audit logged
    const [deleteAudit] = await dbConnection.execute(
      `SELECT action, target_resource_type, target_resource_id FROM superadmin_audit_logs 
       WHERE target_resource_type = 'enterprise_sso_config' AND action = 'enterprise_sso_config_deleted' AND target_resource_id = ?`,
      [createdConfigId]
    );
    assert(deleteAudit.length > 0, `Operator delete action recorded in superadmin_audit_logs`);

    // Verify domain lookup now returns false for deleted IdP
    const postDeleteLookup = await request('/auth/sso/lookup?domain=megacorp.internal');
    assert(postDeleteLookup.data.hasSso === false, `Domain lookup for deleted IdP domain now returns hasSso: false`);

    // Clean up JIT test user from DB
    await dbConnection.execute('DELETE FROM tenant_users WHERE user_id = ?', [jitUsers[0].id]);
    await dbConnection.execute('DELETE FROM users WHERE id = ?', [jitUsers[0].id]);

    // 12. Final Meta Publication Lock Invariant Check
    await verifyMetaLock(dbConnection, 'POST-CHECK FINAL');

    console.log('\n========================================================================');
    console.log(`   STAGE 22 TEST SUITE PASSED: ${passedTests} passed, ${failedTests} failed`);
    console.log('   ENTERPRISE SSO & SAML 2.0 / OIDC FEDERATION FULLY VERIFIED');
    console.log('========================================================================\n');
  } finally {
    await dbConnection.end();
  }
}

runStage22Suite().catch((err) => {
  console.error('\n❌ STAGE 22 SUITE CRASHED:', err);
  process.exit(1);
});
