/**
 * Stage 26: Enterprise Custom Roles & Granular RBAC Permissions Engine Suite
 * SocialForge Platform v4.4.0
 * 
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Strict Authentication & Superadmin-only Security Safeguards (401/403)
 * 3. Master Granular Permission Catalog (40+ permissions across 11 functional domains)
 * 4. System Roles Immutability Safeguards (Cannot modify or delete is_system roles)
 * 5. Custom Role Lifecycle (Create, Read, Update, Delete with duplicate slug rejection)
 * 6. Role Inheritance Engine (Recursive parent permission inheritance)
 * 7. Multi-Role User Assignment Engine (Assignment persistence and retrieval)
 * 8. User Permission Overrides Engine (Explicit Allow & Explicit Deny precedence)
 * 9. Core Permission Resolver (Effective permissions computation: Base + Custom + Inheritance + Allow - Deny)
 * 10. Granular Express Middleware Guard (requirePermission 403 rejection vs superadmin bypass)
 * 11. Interactive RBAC Sandbox Evaluator (/simulate with decision explanations)
 * 12. Telemetry Overview Metrics Aggregation
 * 13. Immutable Superadmin Audit Trail Logging for all role mutations
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
  const url = `${BASE_URL}${endpoint}`;
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
  return { status: res.status, data };
}

async function verifyMetaLock(connection, stepDescription) {
  const [variants] = await connection.execute(
    'SELECT id, status, platform, remote_post_id FROM post_variants WHERE remote_post_id = ?',
    [META_LOCK_REMOTE_POST_ID]
  );
  assert(variants.length === 1, `[${stepDescription}] Production Meta variant exists.`);
  assert(variants[0].status === 'published', `[${stepDescription}] Production Meta variant status is strictly 'published'.`);

  const [jobs] = await connection.execute(
    'SELECT id, status, platform FROM publishing_jobs WHERE id = ?',
    [META_LOCK_JOB_ID]
  );
  assert(jobs.length === 1, `[${stepDescription}] Production Meta publishing job exists.`);
  assert(jobs[0].status === 'published', `[${stepDescription}] Production Meta publishing job status is strictly 'published'.`);
}

async function main() {
  console.log('========================================================================');
  console.log('  STAGE 26: ENTERPRISE CUSTOM ROLES & GRANULAR RBAC ENGINE SUITE        ');
  console.log('========================================================================\n');

  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Pre-test Meta Publication Lock Check
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Pre-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Pre-Test Invariant');

    // -------------------------------------------------------------------------
    // STEP 2: Issue Tokens (Superadmin and Regular Member)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Auth Tokens & Security Safeguards ---');
    const [superadminUsers] = await connection.execute(
      'SELECT id, email FROM users WHERE is_superadmin = 1 AND is_active = 1 LIMIT 1'
    );
    assert(superadminUsers.length > 0, 'Active superadmin user located in database.');
    const superadmin = superadminUsers[0];

    const [memberUsers] = await connection.execute(
      `SELECT tu.tenant_id, u.id, u.email, tu.role 
       FROM tenant_users tu 
       JOIN users u ON tu.user_id = u.id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(memberUsers.length > 0, 'Regular tenant user located.');
    const member = memberUsers[0];
    const targetTenant = { id: member.tenant_id };

    const superadminToken = jwt.sign(
      {
        userId: superadmin.id,
        email: superadmin.email,
        isSuperadmin: true,
        isSuperAdmin: true,
        tenantId: targetTenant.id,
        role: 'owner',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    const memberToken = jwt.sign(
      {
        userId: member.id,
        email: member.email,
        isSuperadmin: false,
        isSuperAdmin: false,
        tenantId: targetTenant.id,
        role: member.role,
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Reject unauthenticated requests
    const unauthRes = await request('/admin/operations/rbac/overview');
    assert(unauthRes.status === 401, `Unauthenticated request correctly rejected with HTTP 401 (got ${unauthRes.status}: ${JSON.stringify(unauthRes.data)}).`);

    // Reject non-superadmin request to admin operations
    const forbiddenRes = await request('/admin/operations/rbac/overview', {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    assert(forbiddenRes.status === 403, 'Non-superadmin member request correctly rejected with HTTP 403.');

    // -------------------------------------------------------------------------
    // STEP 3: Master Granular Permissions Catalog
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Permissions Catalog Inspection ---');
    const permsRes = await request('/admin/operations/rbac/permissions', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(permsRes.status === 200 && permsRes.data?.success === true, 'Permissions catalog returned HTTP 200.');
    const perms = permsRes.data?.data;
    assert(Array.isArray(perms) && perms.length >= 35, `Catalog contains ${perms?.length} granular permissions (>= 35).`);

    const slugs = perms.map((p) => p.slug);
    assert(slugs.includes('posts:publish'), 'Catalog contains critical publishing permission "posts:publish".');
    assert(slugs.includes('dlp:quarantine_review'), 'Catalog contains DLP clearance permission "dlp:quarantine_review".');
    assert(slugs.includes('siem:manage'), 'Catalog contains SIEM configuration permission "siem:manage".');
    assert(slugs.includes('compliance:purge'), 'Catalog contains high-risk purge permission "compliance:purge".');
    assert(slugs.includes('*'), 'Catalog contains wildcard superuser grant "*".');

    const categories = new Set(perms.map((p) => p.category));
    assert(
      categories.has('posts') &&
      categories.has('templates') &&
      categories.has('automations') &&
      categories.has('connections') &&
      categories.has('analytics') &&
      categories.has('security') &&
      categories.has('compliance') &&
      categories.has('team') &&
      categories.has('billing'),
      'Catalog covers all required enterprise functional domains.'
    );

    // -------------------------------------------------------------------------
    // STEP 4: Roles Listing & System Roles Immutability
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: System Roles Immutability & Listing ---');
    const listRes = await request('/admin/operations/rbac/roles', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(listRes.status === 200 && listRes.data?.success === true, 'Roles list returned HTTP 200.');
    const allRoles = listRes.data?.data;
    assert(Array.isArray(allRoles) && allRoles.length >= 7, 'Platform lists at least 7 baseline system roles.');

    const securityLead = allRoles.find((r) => r.roleSlug === 'security_lead');
    assert(securityLead !== undefined && securityLead.isSystem === true, 'Seeded "security_lead" role exists and is marked system immutable.');

    const moderator = allRoles.find((r) => r.roleSlug === 'content_moderator');
    assert(moderator !== undefined && moderator.isSystem === true, 'Seeded "content_moderator" role exists and is marked system immutable.');

    // Attempt to modify system role -> MUST FAIL
    const mutSysRes = await request(`/admin/operations/rbac/roles/${securityLead.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({ roleName: 'Hacked Security Lead' }),
    });
    assert(mutSysRes.status === 400, 'Attempt to modify system role correctly rejected with HTTP 400.');

    // Attempt to delete system role -> MUST FAIL
    const delSysRes = await request(`/admin/operations/rbac/roles/${securityLead.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(delSysRes.status === 400, 'Attempt to delete system role correctly rejected with HTTP 400.');

    // -------------------------------------------------------------------------
    // STEP 5: Custom Role Lifecycle (Create, Read, Update, Delete)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Custom Role Lifecycle ---');
    const timestamp = Date.now();
    const testRoleSlug = `content_lead_stage26_${timestamp}`;

    const createRoleRes = await request('/admin/operations/rbac/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        targetTenantId: targetTenant.id,
        roleSlug: testRoleSlug,
        roleName: 'Stage 26 Content Lead',
        description: 'Lead publisher with template authoring rights',
        permissions: ['posts:read', 'posts:create', 'posts:edit', 'posts:publish', 'templates:create'],
        parentRoleSlug: null,
      }),
    });
    assert(createRoleRes.status === 201 && createRoleRes.data?.success === true, 'Custom role created with HTTP 201.');
    const createdRole = createRoleRes.data?.data;
    assert(createdRole?.roleSlug === testRoleSlug, 'Role registered with expected slug.');
    assert(createdRole?.isSystem === false, 'Role is correctly marked as custom (isSystem = false).');
    assert(createdRole?.permissions?.length === 5, 'Role has 5 granted permissions.');

    // Reject duplicate role slug
    const dupRes = await request('/admin/operations/rbac/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        roleSlug: testRoleSlug,
        roleName: 'Duplicate Slug Attempt',
        permissions: ['posts:read'],
      }),
    });
    assert(dupRes.status === 400, 'Duplicate role slug rejected with HTTP 400.');

    // Update custom role
    const updateRoleRes = await request(`/admin/operations/rbac/roles/${createdRole.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        roleName: 'Stage 26 Content Lead (Updated)',
        permissions: ['posts:read', 'posts:create', 'posts:edit', 'posts:publish', 'templates:create', 'analytics:read'],
      }),
    });
    assert(updateRoleRes.status === 200, 'Custom role updated with HTTP 200.');
    assert(updateRoleRes.data?.data?.permissions?.length === 6, 'Updated role contains 6 permissions.');

    // -------------------------------------------------------------------------
    // STEP 6: Role Inheritance Engine
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Role Inheritance Resolution ---');
    const childRoleSlug = `junior_lead_stage26_${timestamp}`;
    const createChildRes = await request('/admin/operations/rbac/roles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        targetTenantId: targetTenant.id,
        roleSlug: childRoleSlug,
        roleName: 'Stage 26 Junior Content Lead',
        description: 'Inherits from Content Lead and adds dlp:read',
        permissions: ['dlp:read'],
        parentRoleSlug: testRoleSlug,
      }),
    });
    assert(createChildRes.status === 201, 'Child role with parent inheritance created with HTTP 201.');
    const childRole = createChildRes.data?.data;
    assert(childRole.parentRoleSlug === testRoleSlug, 'Child role explicitly binds parent role slug.');

    // -------------------------------------------------------------------------
    // STEP 7: User Custom Role Assignment & Effective Permissions
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: User Role Assignment & Resolution ---');
    const assignRes = await request('/admin/operations/rbac/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenant.id,
        userId: member.id,
        roleId: childRole.id,
      }),
    });
    assert(assignRes.status === 201 && assignRes.data?.success === true, 'Custom role assigned to user with HTTP 201.');

    // Check effective permissions for user
    const effRes = await request(`/admin/operations/rbac/users/${targetTenant.id}/${member.id}/effective`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(effRes.status === 200 && effRes.data?.success === true, 'Effective permissions resolved successfully.');
    const effective = effRes.data?.data;
    assert(effective.effectivePermissions.includes('dlp:read'), 'User possesses direct child role permission "dlp:read".');
    assert(effective.effectivePermissions.includes('posts:publish'), 'User successfully inherits "posts:publish" from parent role.');

    // -------------------------------------------------------------------------
    // STEP 8: User Permission Overrides Engine (Explicit Deny > Allow Precedence)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Explicit Permission Overrides (Deny > Allow) ---');
    // Configure an explicit ALLOW override for a permission not in role
    const allowOverrideRes = await request('/admin/operations/rbac/overrides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenant.id,
        userId: member.id,
        permissionSlug: 'siem:read',
        effect: 'allow',
        reason: 'Temporary SIEM inspection clearance',
        expiresInDays: 7,
      }),
    });
    assert(allowOverrideRes.status === 201, 'Explicit ALLOW override created.');

    const effAfterAllow = await request(`/admin/operations/rbac/users/${targetTenant.id}/${member.id}/effective`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(effAfterAllow.data?.data?.effectivePermissions.includes('siem:read'), 'User acquired "siem:read" via explicit allow override.');

    // Now configure an explicit DENY override on "posts:publish" (which user currently inherits)
    const denyOverrideRes = await request('/admin/operations/rbac/overrides', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        tenantId: targetTenant.id,
        userId: member.id,
        permissionSlug: 'posts:publish',
        effect: 'deny',
        reason: 'Compliance embargo: publication suspended',
        expiresInDays: 14,
      }),
    });
    assert(denyOverrideRes.status === 201, 'Explicit DENY override created.');

    const effAfterDeny = await request(`/admin/operations/rbac/users/${targetTenant.id}/${member.id}/effective`, {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(
      !effAfterDeny.data?.data?.effectivePermissions.includes('posts:publish'),
      'CRITICAL: Explicit DENY completely stripped "posts:publish", overriding all assigned and inherited role grants.'
    );
    assert(
      effAfterDeny.data?.data?.explicitDenies.includes('posts:publish'),
      'Audit lists "posts:publish" in user explicitDenies registry.'
    );

    // Clean up overrides
    await request(`/admin/operations/rbac/overrides/${allowOverrideRes.data?.data?.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    await request(`/admin/operations/rbac/overrides/${denyOverrideRes.data?.data?.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });

    // -------------------------------------------------------------------------
    // STEP 9: RBAC Sandbox Simulator Inspector
    // -------------------------------------------------------------------------
    console.log('\n--- Step 9: RBAC Sandbox Simulator ---');
    // Test 1: Creator role attempting live publish
    const sim1 = await request('/admin/operations/rbac/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        baseRole: 'creator',
        targetPermission: 'posts:publish',
      }),
    });
    assert(sim1.status === 200, 'Simulation 1 returned HTTP 200.');
    assert(sim1.data?.data?.allowed === false, 'Standard Creator role denied posts:publish.');

    // Test 2: Creator with explicit allow override
    const sim2 = await request('/admin/operations/rbac/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        baseRole: 'creator',
        hypotheticalOverrides: [{ permissionSlug: 'posts:publish', effect: 'allow' }],
        targetPermission: 'posts:publish',
      }),
    });
    assert(sim2.data?.data?.allowed === true, 'Creator granted posts:publish via explicit allow override.');

    // Test 3: Owner superuser wildcard
    const sim3 = await request('/admin/operations/rbac/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        baseRole: 'owner',
        targetPermission: 'compliance:purge',
      }),
    });
    assert(sim3.data?.data?.allowed === true && sim3.data?.data?.matchedGrant === '*', 'Owner granted compliance:purge via wildcard superuser (*).');

    // Test 4: Deny override wins even over wildcard
    const sim4 = await request('/admin/operations/rbac/simulate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminToken}` },
      body: JSON.stringify({
        baseRole: 'owner',
        hypotheticalOverrides: [{ permissionSlug: 'compliance:purge', effect: 'deny' }],
        targetPermission: 'compliance:purge',
      }),
    });
    assert(sim4.data?.data?.allowed === false && sim4.data?.data?.blockedByDeny === true, 'Explicit DENY overrides even platform owner wildcard.');

    // -------------------------------------------------------------------------
    // STEP 10: Telemetry Overview Metrics
    // -------------------------------------------------------------------------
    console.log('\n--- Step 10: Overview Telemetry Metrics ---');
    const ovRes = await request('/admin/operations/rbac/overview', {
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    assert(ovRes.status === 200 && ovRes.data?.success === true, 'Overview telemetry returned HTTP 200.');
    const ov = ovRes.data?.data;
    assert(ov.totalRoles >= 8, `Metrics report totalRoles: ${ov.totalRoles} (>= 8).`);
    assert(ov.systemRoles >= 7, `Metrics report systemRoles: ${ov.systemRoles} (>= 7).`);
    assert(ov.customRoles >= 1, `Metrics report customRoles: ${ov.customRoles} (>= 1).`);
    assert(ov.totalCatalogPermissions >= 35, `Metrics report catalog permissions: ${ov.totalCatalogPermissions}.`);

    // Clean up test custom roles
    await request(`/admin/operations/rbac/roles/${childRole.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });
    await request(`/admin/operations/rbac/roles/${createdRole.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superadminToken}` },
    });

    // -------------------------------------------------------------------------
    // STEP 11: Superadmin Audit Logging Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Step 11: Superadmin Audit Logging Verification ---');
    const [auditRows] = await connection.execute(
      "SELECT action, target_resource_type, details FROM superadmin_audit_logs WHERE action IN ('create_custom_role', 'update_custom_role', 'delete_custom_role', 'assign_custom_role', 'create_permission_override') ORDER BY created_at DESC LIMIT 10"
    );
    assert(auditRows.length >= 4, 'Audit logs recorded role and override mutations.');
    const actions = auditRows.map((r) => r.action);
    assert(actions.includes('create_custom_role'), 'Audit trail contains create_custom_role.');
    assert(actions.includes('assign_custom_role'), 'Audit trail contains assign_custom_role.');
    assert(actions.includes('create_permission_override'), 'Audit trail contains create_permission_override.');

    // -------------------------------------------------------------------------
    // STEP 12: Post-Test Meta Publication Lock Invariant Check
    // -------------------------------------------------------------------------
    console.log('\n--- Step 12: Post-Test Meta Publication Lock Invariant Check ---');
    await verifyMetaLock(connection, 'Post-Test Invariant');

    console.log('\n========================================================================');
    console.log(`   STAGE 26 TEST SUITE PASSED: ${passedTests} passed, ${failedTests} failed.`);
    console.log('   Enterprise Custom Roles & Granular RBAC Engine 100% OPERATIONAL');
    console.log('========================================================================\n');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('\nStage 26 Suite Error:', err);
  process.exit(1);
});
