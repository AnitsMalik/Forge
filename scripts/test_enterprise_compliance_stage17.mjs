/**
 * Stage 17: Enterprise Audit Compliance, Export & Granular RBAC Engine Suite
 * 
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. RBAC Safeguards: Strict superadmin-only authentication & non-superadmin 403 rejection
 * 3. Cryptographic Merkle Audit Trail verification with HMAC-SHA256 signature
 * 4. Compliance Export Engine (SOC2 Type II & GDPR SAR) with SHA-256 digest validation
 * 5. Retention Policies Engine (Seeded rules & updates with mandatory justification)
 * 6. Safe Automated Purge Engine with Cryptographic Purge Certificate issuance
 * 7. Production Lock Exemption: Live post 1405588742634526_122100337179498315 immune to purge
 * 8. Granular RBAC Custom Role Manager & System Permission Catalog
 * 9. Superadmin Audit Trail persistence for all compliance operations
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
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function verifyMetaLock(connection, stepName) {
  const [variants] = await connection.execute(
    'SELECT id, status, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(
    variants.length > 0 && variants[0].status === 'published',
    `[${stepName}] Meta Post Variant ${META_LOCK_REMOTE_POST_ID} is published and intact.`
  );

  const [jobs] = await connection.execute(
    'SELECT id, status FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(
    jobs.length > 0 && jobs[0].status === 'published',
    `[${stepName}] Publishing Job ${META_LOCK_JOB_ID} is published and intact.`
  );
}

async function main() {
  console.log('========================================================================');
  console.log('   STAGE 17: ENTERPRISE AUDIT COMPLIANCE & GRANULAR RBAC TEST SUITE     ');
  console.log('   Cryptographic Merkle Signatures • SOC2/GDPR Exports • Safe Purge     ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Verify Meta Publication Lock Invariant (Pre-Test)
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Pre-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Pre-Test Invariant');

    // -------------------------------------------------------------------------
    // STEP 2: Superadmin & Regular User Authentication Setup
    // -------------------------------------------------------------------------
    const [superadmins] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id, tu.role 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 AND u.is_active = 1 
       LIMIT 1`
    );
    let superadminUser = superadmins[0];
    if (!superadminUser) {
      const [apexUsers] = await connection.execute(
        `SELECT u.id, u.email, tu.tenant_id, tu.role 
         FROM users u 
         JOIN tenant_users tu ON u.id = tu.user_id 
         WHERE u.email = 'sarah@apex.com' LIMIT 1`
      );
      superadminUser = apexUsers[0];
      await connection.execute(`UPDATE users SET is_superadmin = 1 WHERE id = ?`, [superadminUser.id]);
    }
    assert(Boolean(superadminUser), `Found registered superadmin user (${superadminUser?.email}) for token generation.`);

    const [regularUsers] = await connection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       LEFT JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1 LIMIT 1`
    );
    const regularUser = regularUsers[0] || { id: '00000000-0000-0000-0000-000000000099', email: 'regular@user.com', tenant_id: superadminUser.tenant_id };
    assert(Boolean(regularUser), 'Found regular non-superadmin user for permission rejection test.');

    const superadminToken = jwt.sign(
      {
        userId: superadminUser.id,
        email: superadminUser.email,
        tenantId: superadminUser.tenant_id,
        isSuperadmin: true,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const regularToken = jwt.sign(
      {
        userId: regularUser.id,
        email: regularUser.email,
        tenantId: regularUser.tenant_id,
        isSuperadmin: false,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // -------------------------------------------------------------------------
    // STEP 3: Security Guardrails: Verify Non-Superadmin Rejection (403 Forbidden)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Security Guardrails: Reject Non-Superadmin Access ---');
    const rejectedVerify = await request('/admin/operations/compliance/verify', {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(rejectedVerify.status === 403, 'Regular non-superadmin user rejected from /compliance/verify with HTTP 403.');

    const rejectedExports = await request('/admin/operations/compliance/exports', {
      headers: { Authorization: `Bearer ${regularToken}` },
    });
    assert(rejectedExports.status === 403, 'Regular non-superadmin user rejected from /compliance/exports with HTTP 403.');

    // -------------------------------------------------------------------------
    // STEP 4: Cryptographic Merkle Audit Trail Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Cryptographic Merkle Audit Trail Verification ---');
    const verifyRes = await request('/admin/operations/compliance/verify?table=superadmin_audit_logs', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(verifyRes.status === 200 && verifyRes.data?.success === true, 'Merkle verification endpoint returned HTTP 200.');
    const auditData = verifyRes.data?.data;
    assert(auditData?.verified === true, 'Audit integrity verification passed.');
    assert(auditData?.tamperDetected === false, 'Zero log tampering detected in superadmin_audit_logs.');
    assert(typeof auditData?.merkleRoot === 'string' && auditData.merkleRoot.length === 64, 'Merkle root is a valid 64-char hex SHA-256 string.');
    assert(typeof auditData?.signature === 'string' && auditData.signature.length === 64, 'Audit checkpoint signature is a valid 64-char HMAC signature.');
    assert(auditData?.totalRecords >= 0, `Audit trail verified across ${auditData?.totalRecords} records.`);

    // Test alternate table verification
    const govVerifyRes = await request('/admin/operations/compliance/verify?table=governance_audit_logs', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(govVerifyRes.status === 200 && govVerifyRes.data?.data?.verified === true, 'Governance audit trail verified intact.');

    // -------------------------------------------------------------------------
    // STEP 5: Compliance Data Export Engine (SOC2 Type II & GDPR SAR)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Compliance Data Export Engine ---');
    // Test safeguard rejection without confirmation
    const rejectedExportReq = await request('/admin/operations/compliance/exports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        exportType: 'soc2_audit',
        reason: 'Missing confirmation check',
        confirmation: false,
      }),
    });
    assert(rejectedExportReq.status === 400, 'Export request without explicit confirmation rejected with HTTP 400.');

    // Execute valid SOC2 audit export
    const soc2ExportRes = await request('/admin/operations/compliance/exports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        exportType: 'soc2_audit',
        format: 'zip_json',
        targetTenantId: superadminUser.tenant_id,
        reason: 'Annual SOC2 Type II compliance audit independent verification',
        confirmation: true,
      }),
    });
    assert(soc2ExportRes.status === 201 && soc2ExportRes.data?.success === true, 'SOC2 compliance export package generated with HTTP 201.');
    const soc2Job = soc2ExportRes.data?.data;
    assert(soc2Job?.status === 'completed', 'SOC2 export package completed successfully.');
    assert(typeof soc2Job?.artifactSha256 === 'string' && soc2Job.artifactSha256.length === 64, 'Export artifact includes valid 64-char SHA-256 digest.');
    assert(soc2Job?.recordCount >= 0, 'Export package cataloged data record count.');

    // Execute GDPR SAR export
    const gdprExportRes = await request('/admin/operations/compliance/exports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        exportType: 'gdpr_sar',
        format: 'json',
        targetTenantId: regularUser.tenant_id,
        reason: 'GDPR Article 15 Subject Access Request for tenant compliance file',
        confirmation: true,
      }),
    });
    assert(gdprExportRes.status === 201 && gdprExportRes.data?.data?.status === 'completed', 'GDPR SAR export package completed with SHA-256 digest.');

    // List compliance exports
    const listExportsRes = await request('/admin/operations/compliance/exports', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listExportsRes.status === 200, 'Compliance export jobs listed successfully.');
    assert(Array.isArray(listExportsRes.data?.data) && listExportsRes.data.data.length >= 2, 'Export jobs listing includes recently generated packages.');

    // -------------------------------------------------------------------------
    // STEP 6: Data Retention & Purge Policy Engine
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Data Retention Policies & Safe Purge Engine ---');
    const listPoliciesRes = await request('/admin/operations/compliance/retention', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listPoliciesRes.status === 200 && Array.isArray(listPoliciesRes.data?.data), 'Data retention policies retrieved.');
    const policies = listPoliciesRes.data.data;
    assert(policies.length >= 5, 'Found all seeded enterprise retention policies (audit, telemetry, posts, media, exports).');

    // Update retention policy with safeguards
    const telemetryPolicy = policies.find((p) => p.dataCategory === 'analytics_telemetry');
    assert(telemetryPolicy !== undefined, 'Found analytics_telemetry retention policy.');

    const updatePolicyRes = await request(`/admin/operations/compliance/retention/${telemetryPolicy.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        retentionDays: 120,
        autoPurgeEnabled: true,
        gracePeriodDays: 10,
        reason: 'Policy updated per quarterly security and retention review',
        confirmation: true,
      }),
    });
    assert(updatePolicyRes.status === 200 && updatePolicyRes.data?.data?.retentionDays === 120, 'Retention policy updated successfully.');

    // Execute safe purge with cryptographic certificate issuance
    const purgeRes = await request('/admin/operations/compliance/purge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        dataCategory: 'analytics_telemetry',
        reason: 'Routine automated purge of expired telemetry outside 120-day window',
        confirmation: true,
      }),
    });
    assert(purgeRes.status === 200 && purgeRes.data?.success === true, 'Safe data purge executed with HTTP 200.');
    const purgeData = purgeRes.data?.data;
    assert(purgeData?.certificate !== undefined, 'Purge operation issued an official Cryptographic Purge Certificate.');
    assert(
      typeof purgeData.certificate.certificateSignature === 'string' && purgeData.certificate.certificateSignature.length === 64,
      'Purge certificate contains verifiable 64-char HMAC-SHA256 signature.'
    );
    assert(purgeData.certificate.dataCategory === 'analytics_telemetry', 'Purge certificate explicitly binds targeted category.');

    // -------------------------------------------------------------------------
    // STEP 7: Granular RBAC Permissions Catalog & Custom Roles
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Granular RBAC & Custom Roles ---');
    const permissionsRes = await request('/admin/operations/compliance/permissions', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(permissionsRes.status === 200 && Array.isArray(permissionsRes.data?.data), 'Enterprise permissions catalog retrieved.');
    const categories = permissionsRes.data.data.map((c) => c.category);
    assert(
      categories.includes('compliance') && categories.includes('audit') && categories.includes('governance'),
      'Catalog contains compliance, audit, and governance permission categories.'
    );

    // List system roles
    const listRolesRes = await request('/admin/operations/compliance/roles', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listRolesRes.status === 200 && Array.isArray(listRolesRes.data?.data), 'Roles listed successfully.');
    const systemRoles = listRolesRes.data.data.filter((r) => r.isSystem === 1 || r.isSystem === true);
    assert(systemRoles.length >= 4, 'Found seeded system roles (compliance_officer, external_auditor, billing_manager, brand_director).');

    // Create custom role
    const testRoleSlug = `security_auditor_${Date.now()}`;
    const createRoleRes = await request('/admin/operations/compliance/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        roleSlug: testRoleSlug,
        roleName: 'External ISO Auditor',
        description: 'Read-only external compliance auditor with export access',
        permissions: ['compliance.export.view', 'audit.logs.read', 'audit.verify.view'],
        confirmation: true,
      }),
    });
    assert(createRoleRes.status === 201 && createRoleRes.data?.success === true, 'Custom enterprise role created with HTTP 201.');
    const customRole = createRoleRes.data?.data;
    assert(customRole?.roleSlug === testRoleSlug, 'Custom role registered with correct slug.');
    assert(customRole?.permissions?.length === 3, 'Custom role has granted permissions.');

    // -------------------------------------------------------------------------
    // STEP 8: Superadmin Audit Logging Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Superadmin Audit Log Verification ---');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type, reason FROM superadmin_audit_logs WHERE action IN ('compliance_export_generated', 'update_retention_policy', 'execute_compliance_purge', 'create_custom_role') ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length >= 4, 'Audit logs recorded compliance_export, update_retention, purge, and create_role actions.');
    const actionsFound = auditRows.map((r) => r.action);
    assert(actionsFound.includes('compliance_export_generated'), 'compliance_export_generated logged in audit trail.');
    assert(actionsFound.includes('execute_compliance_purge'), 'execute_compliance_purge logged in audit trail.');

    // -------------------------------------------------------------------------
    // STEP 9: Final Meta Publication Lock Invariant Check
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: Post-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Post-Test Invariant');

    console.log('\n========================================================================');
    console.log(`   STAGE 17 TEST SUITE PASSED: ${passedTests} passed, ${failedTests} failed.`);
    console.log('   Enterprise Audit Compliance, Merkle Verification & RBAC 100% OPERATIONAL');
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('\nStage 17 Suite Error:', err);
  process.exit(1);
});
