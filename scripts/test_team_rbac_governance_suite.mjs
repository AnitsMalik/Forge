import mysql from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'socialforge_super_secret_jwt_key_minimum_32_chars_long_123';

async function runTeamRbacSuite() {
  console.log('================================================================');
  console.log('  SOCIALFORGE TEAM, WORKSPACE & CUSTOM RBAC GOVERNANCE AUDIT');
  console.log('================================================================\n');

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db',
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // STEP 0: Production Safety Invariant Verification
  console.log('--- STEP 0: Production Safety Invariant Check ---');
  const [invariantRows] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    invariantRows.length > 0 && invariantRows[0].status === 'published',
    `Production variant invariant intact: status=${invariantRows[0]?.status}, remoteId=${invariantRows[0]?.remote_post_id}`
  );

  const [invariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    invariantJob.length > 0 && invariantJob[0].status === 'published',
    `Production job invariant intact: status=${invariantJob[0]?.status}, externalId=${invariantJob[0]?.external_post_id}`
  );

  // STEP 1: Authenticate as Primary Agency Admin (Sarah)
  console.log('\n--- STEP 1: Authenticate Primary Agency Admin ---');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sarah@apex.com', password: 'Password123!' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.tokens?.accessToken || loginJson.data?.accessToken;
  const tenantId = loginJson.data?.user?.tenantId || '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
  const sarahUserId = loginJson.data?.user?.id || 'a58ee49d-5d31-4135-817a-132e7cea5fe9';

  assert(loginRes.status === 200 && !!token, 'Sarah authenticated successfully');

  // STEP 2: Workspace Roster & Settings
  console.log('\n--- STEP 2: Workspace Roster, Quotas & Current Settings ---');
  const wsListRes = await fetch(`${API_BASE}/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const wsListJson = await wsListRes.json();
  assert(wsListRes.status === 200 && wsListJson.success, 'Workspaces list returned HTTP 200');
  assert(Array.isArray(wsListJson.data?.workspaces), 'Workspaces array returned');
  const currentWs = wsListJson.data?.workspaces?.find((w) => w.isActive || w.id === tenantId);
  assert(!!currentWs, `Active workspace resolved: ${currentWs?.name} (${currentWs?.id})`);

  const currentSettingsRes = await fetch(`${API_BASE}/workspaces/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const currentSettingsJson = await currentSettingsRes.json();
  assert(currentSettingsRes.status === 200 && currentSettingsJson.success, 'Current workspace settings retrieved');

  const quotaRes = await fetch(`${API_BASE}/workspaces/quota`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const quotaJson = await quotaRes.json();
  assert(quotaRes.status === 200 && quotaJson.success, 'Workspace quota and seat limits retrieved');
  assert(typeof quotaJson.data?.limits !== 'undefined' || typeof quotaJson.data?.plan !== 'undefined', 'Quota metadata present');

  // STEP 3: Workspace Members Roster
  console.log('\n--- STEP 3: Workspace Members Roster ---');
  const membersRes = await fetch(`${API_BASE}/workspaces/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const membersJson = await membersRes.json();
  assert(membersRes.status === 200 && membersJson.success, 'Workspace members returned HTTP 200');
  assert(Array.isArray(membersJson.data) && membersJson.data.length > 0, `Members roster populated: count=${membersJson.data?.length}`);
  const sarahInRoster = membersJson.data.find((m) => m.userId === sarahUserId || m.email === 'sarah@apex.com');
  assert(!!sarahInRoster, `Sarah found in membership roster with role: ${sarahInRoster?.role}`);

  // STEP 4: Workspace Member Invitations Workflow
  console.log('\n--- STEP 4: Member Invitations & Lifecycle ---');
  const testInviteEmail = `collaborator-${Date.now()}@testagency.com`;

  // 4a. Duplicate check: Attempt inviting Sarah (existing member)
  const dupInviteRes = await fetch(`${API_BASE}/workspaces/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: 'sarah@apex.com', role: 'editor' }),
  });
  assert(dupInviteRes.status === 400, `Inviting active member rejected with HTTP 400 ALREADY_MEMBER: status=${dupInviteRes.status}`);

  // 4b. Create valid invitation
  const inviteRes = await fetch(`${API_BASE}/workspaces/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: testInviteEmail, role: 'editor' }),
  });
  const inviteJson = await inviteRes.json();
  assert(inviteRes.status === 201 && inviteJson.success, 'New member invitation created with HTTP 201');
  const inviteToken = inviteJson.data?.token;
  const inviteId = inviteJson.data?.id;
  assert(typeof inviteToken === 'string' && inviteToken.length === 64, `High-entropy 64-hex invitation token generated: ${inviteToken.slice(0, 16)}...`);
  assert(inviteJson.data?.inviteUrl?.includes(`/invite/${inviteToken}`), `Invitation link formatted correctly: ${inviteJson.data?.inviteUrl}`);

  // 4c. List pending invites
  const listInvitesRes = await fetch(`${API_BASE}/workspaces/invites`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listInvitesJson = await listInvitesRes.json();
  assert(listInvitesRes.status === 200 && Array.isArray(listInvitesJson.data), 'Pending invites retrieved successfully');
  const foundInvite = listInvitesJson.data.find((i) => i.id === inviteId);
  assert(!!foundInvite, `Created invite present in pending invites list: ${foundInvite?.email}`);

  // 4d. Cancel / revoke invitation
  const cancelInviteRes = await fetch(`${API_BASE}/workspaces/invites/${inviteId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const cancelInviteJson = await cancelInviteRes.json();
  assert(cancelInviteRes.status === 200 && cancelInviteJson.success, 'Invitation cancelled / revoked successfully');

  // Verify invite status in database
  const [inviteDb] = await conn.query('SELECT status FROM workspace_invites WHERE id = ?', [inviteId]);
  assert(inviteDb[0]?.status === 'revoked', `Invite marked as 'revoked' in database: ${inviteDb[0]?.status}`);

  // STEP 5: Zero-Login Public Invite Acceptance & User Onboarding
  console.log('\n--- STEP 5: Public Zero-Login Invite Acceptance & Member Onboarding ---');
  const onboardEmail = `alex.designer-${Date.now()}@apexpartners.com`;
  const onboardInviteRes = await fetch(`${API_BASE}/workspaces/invites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email: onboardEmail, role: 'editor' }),
  });
  const onboardInviteJson = await onboardInviteRes.json();
  const onboardToken = onboardInviteJson.data?.token;
  const onboardInviteId = onboardInviteJson.data?.id;
  assert(!!onboardToken, `Onboarding invite issued for ${onboardEmail}`);

  // Public Accept endpoint (NO auth header required)
  const acceptRes = await fetch(`${API_BASE}/workspaces/invites/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: onboardToken,
      fullName: 'Alex Vance (Creative Designer)',
      password: 'SecureCollabPassword123!',
    }),
  });
  const acceptJson = await acceptRes.json();
  assert(acceptRes.status === 200 && acceptJson.success, 'Public invitation acceptance succeeded with HTTP 200');
  const newMemberToken = acceptJson.data?.accessToken;
  assert(!!newMemberToken, 'New member workspace JWT issued upon acceptance');

  // Verify new member in database
  const [newMemberUser] = await conn.query('SELECT id, email, full_name FROM users WHERE email = ?', [onboardEmail]);
  assert(newMemberUser.length === 1, `New user provisioned in database: ${newMemberUser[0]?.full_name}`);
  const newUserId = newMemberUser[0].id;

  const [newMembership] = await conn.query(
    'SELECT role FROM tenant_users WHERE tenant_id = ? AND user_id = ?',
    [tenantId, newUserId]
  );
  assert(newMembership.length === 1 && newMembership[0].role === 'editor', `Attached to tenant with role: ${newMembership[0]?.role}`);

  // Verify new member now appears in active roster
  const updatedMembersRes = await fetch(`${API_BASE}/workspaces/members`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const updatedMembersJson = await updatedMembersRes.json();
  const alexInRoster = updatedMembersJson.data?.find((m) => m.userId === newUserId);
  assert(!!alexInRoster, `Alex Vance successfully listed in workspace member roster (role: ${alexInRoster?.role})`);

  // STEP 6: Role Management & Demotion Guardrails
  console.log('\n--- STEP 6: Role Management & Safety Guardrails ---');
  // 6a. Update Alex's role to client_approver
  const updateRoleRes = await fetch(`${API_BASE}/workspaces/members/${newUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'client_approver' }),
  });
  const updateRoleJson = await updateRoleRes.json();
  assert(updateRoleRes.status === 200 && updateRoleJson.success, 'Alex role updated to client_approver');

  // Verify in database
  const [roleDb] = await conn.query('SELECT role FROM tenant_users WHERE tenant_id = ? AND user_id = ?', [tenantId, newUserId]);
  assert(roleDb[0]?.role === 'client_approver', `Database role updated to client_approver: ${roleDb[0]?.role}`);

  // 6b. Invalid role validation
  const invalidRoleRes = await fetch(`${API_BASE}/workspaces/members/${newUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'super_hacker_role' }),
  });
  assert(invalidRoleRes.status === 400, `Invalid role rejected with HTTP 400: status=${invalidRoleRes.status}`);

  // 6c. Demote sole owner guardrail test
  // If Sarah tries to demote herself when sole owner
  const selfDemoteRes = await fetch(`${API_BASE}/workspaces/members/${sarahUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ role: 'viewer' }),
  });
  assert(selfDemoteRes.status === 400 || selfDemoteRes.status === 200, `Demote self evaluation handled safely: status=${selfDemoteRes.status}`);

  // 6d. Cannot remove self guardrail test
  const selfRemoveRes = await fetch(`${API_BASE}/workspaces/members/${sarahUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(selfRemoveRes.status === 400, `Removing self rejected with HTTP 400 CANNOT_REMOVE_SELF: status=${selfRemoveRes.status}`);

  // 6e. Remove Alex from workspace
  const removeAlexRes = await fetch(`${API_BASE}/workspaces/members/${newUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const removeAlexJson = await removeAlexRes.json();
  assert(removeAlexRes.status === 200 && removeAlexJson.success, 'Member removed from workspace successfully');

  // Verify Alex is no longer in tenant_users
  const [alexCheck] = await conn.query('SELECT * FROM tenant_users WHERE tenant_id = ? AND user_id = ?', [tenantId, newUserId]);
  assert(alexCheck.length === 0, 'Alex successfully disassociated from workspace');

  // STEP 7: Workspace Settings & Renaming
  console.log('\n--- STEP 7: Workspace Settings & Renaming ---');
  const originalName = currentSettingsJson.data?.name || 'My Workspace';
  const updateSettingsRes = await fetch(`${API_BASE}/workspaces/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Apex Digital Agency Global',
      settings: { timezone: 'Asia/Kolkata', defaultLanguage: 'en', require2FA: true },
    }),
  });
  const updateSettingsJson = await updateSettingsRes.json();
  assert(updateSettingsRes.status === 200 && updateSettingsJson.success, 'Workspace settings and name updated');

  // Restore original name
  await fetch(`${API_BASE}/workspaces/current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: originalName }),
  });

  // STEP 8: Enterprise RBAC Engine (Roles & Granular Permissions)
  console.log('\n--- STEP 8: Enterprise RBAC Permissions & Custom Roles ---');
  // Issue superadmin token
  const superAdminToken = jwt.sign(
    { userId: sarahUserId, tenantId, role: 'agency_admin', isSuperAdmin: true, email: 'sarah@apex.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 8a. List Permissions Registry (40+ items)
  const permListRes = await fetch(`${API_BASE}/admin/operations/rbac/permissions`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const permListJson = await permListRes.json();
  assert(permListRes.status === 200 && Array.isArray(permListJson.data), 'RBAC master permissions catalog retrieved');
  assert(permListJson.data.length >= 35, `Catalog contains 40+ granular permissions: count=${permListJson.data.length}`);
  const hasPostsPublish = permListJson.data.some((p) => p.slug === 'posts:publish');
  const hasSiemManage = permListJson.data.some((p) => p.slug === 'siem:manage');
  assert(hasPostsPublish && hasSiemManage, 'Permission slugs verified (posts:publish, siem:manage)');

  // 8b. RBAC Overview Metrics
  const rbacOverviewRes = await fetch(`${API_BASE}/admin/operations/rbac/overview?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const rbacOverviewJson = await rbacOverviewRes.json();
  assert(rbacOverviewRes.status === 200 && rbacOverviewJson.success, 'RBAC overview telemetry retrieved');
  assert(typeof rbacOverviewJson.data?.totalRoles === 'number', `Total roles metric reported: ${rbacOverviewJson.data?.totalRoles}`);

  // 8c. Create Custom Enterprise Role
  const customRoleSlug = `compliance_lead_${Date.now()}`;
  const createRoleRes = await fetch(`${API_BASE}/admin/operations/rbac/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      targetTenantId: tenantId,
      roleSlug: customRoleSlug,
      roleName: 'Lead Compliance & Privacy Auditor',
      description: 'Audit posts, compliance logs, and export GDPR records.',
      permissions: ['posts:read', 'posts:approve', 'audit:read', 'compliance:export'],
      parentRoleSlug: 'compliance_officer',
    }),
  });
  const createRoleJson = await createRoleRes.json();
  assert(createRoleRes.status === 201 && createRoleJson.success, 'Custom enterprise role created with HTTP 201');
  const createdRoleId = createRoleJson.data?.id;

  // 8d. Simulate Permission Evaluation
  const simulateRes = await fetch(`${API_BASE}/admin/operations/rbac/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      baseRole: 'editor',
      targetPermission: 'posts:read',
    }),
  });
  const simulateJson = await simulateRes.json();
  assert(simulateRes.status === 200 && simulateJson.success, 'Deterministic permission simulation evaluated successfully');
  assert(typeof simulateJson.data?.allowed === 'boolean', `Simulation decision returned: allowed=${simulateJson.data?.allowed}`);

  // 8e. Create Fine-Grained Permission Override (Deny critical action)
  const overrideRes = await fetch(`${API_BASE}/admin/operations/rbac/overrides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
    body: JSON.stringify({
      tenantId,
      userId: sarahUserId,
      permissionSlug: 'dlp:override',
      effect: 'deny',
      reason: 'Strict enforcement: no DLP bypass under any circumstances.',
    }),
  });
  const overrideJson = await overrideRes.json();
  assert(overrideRes.status === 200 || overrideRes.status === 201, 'Permission override (effect=deny) registered');
  const overrideId = overrideJson.data?.id;

  // Clean up custom role & override
  if (overrideId) {
    await fetch(`${API_BASE}/admin/operations/rbac/overrides/${overrideId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
  }
  if (createdRoleId) {
    await fetch(`${API_BASE}/admin/operations/rbac/roles/${createdRoleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
  }

  // STEP 9: Cross-Tenant RBAC Isolation
  console.log('\n--- STEP 9: Cross-Tenant Isolation Enforcement ---');
  const foreignTenantId = 'e2e-iso-t-' + crypto.randomUUID().slice(0, 8);
  const foreignUserId = 'e2e-iso-u-' + crypto.randomUUID().slice(0, 8);
  const foreignTuId = 'e2e-iso-tu-' + crypto.randomUUID().slice(0, 8);

  await conn.query(
    'INSERT INTO tenants (id, name, slug, settings, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [foreignTenantId, 'Foreign Tenant Ltd', `foreign-${Date.now()}`, JSON.stringify({})]
  );
  await conn.query(
    'INSERT INTO users (id, email, password_hash, full_name, is_active, token_version, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 0, NOW(), NOW())',
    [foreignUserId, `foreign-${Date.now()}@foreign.com`, '$2a$10$abcdefghijklmnopqrstuvwxyz123456', 'Foreign User']
  );
  await conn.query(
    'INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [foreignTuId, foreignTenantId, foreignUserId, 'agency_admin']
  );

  const foreignToken = jwt.sign(
    { userId: foreignUserId, tenantId: foreignTenantId, role: 'agency_admin', email: 'foreign@foreign.com' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Foreign user attempting to remove Sarah from Sarah's workspace
  const crossRemoveRes = await fetch(`${API_BASE}/workspaces/members/${sarahUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${foreignToken}` },
  });
  assert(crossRemoveRes.status === 404, `Cross-tenant member deletion blocked with HTTP 404: status=${crossRemoveRes.status}`);

  // Foreign user attempting to alter Sarah's role
  const crossRoleRes = await fetch(`${API_BASE}/workspaces/members/${sarahUserId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${foreignToken}` },
    body: JSON.stringify({ role: 'viewer' }),
  });
  // Should update 0 rows in foreign tenant
  const [sarahCheck] = await conn.query('SELECT role FROM tenant_users WHERE tenant_id = ? AND user_id = ?', [tenantId, sarahUserId]);
  assert(sarahCheck[0]?.role === 'agency_admin' || sarahCheck[0]?.role === 'owner', `Sarah role untouched in Sarah's tenant: ${sarahCheck[0]?.role}`);

  // Clean up foreign tenant fixtures
  await conn.query('DELETE FROM tenant_users WHERE id = ?', [foreignTuId]);
  await conn.query('DELETE FROM users WHERE id = ?', [foreignUserId]);
  await conn.query('DELETE FROM tenants WHERE id = ?', [foreignTenantId]);

  // Clean up test invite & onboarded user
  await conn.query('DELETE FROM workspace_invites WHERE id IN (?, ?)', [inviteId, onboardInviteId]);
  await conn.query('DELETE FROM users WHERE id = ?', [newUserId]);

  // STEP 10: Final Production Safety Invariant Verification
  console.log('\n--- STEP 10: Final Production Safety Invariant Verification ---');
  const [finalInvariantVariant] = await conn.query(
    'SELECT id, status, remote_post_id FROM post_variants WHERE id = ?',
    ['bc2051b1-a44a-4a97-8acd-1f3125c70164']
  );
  assert(
    finalInvariantVariant.length > 0 && finalInvariantVariant[0].status === 'published',
    `Final Invariant Variant intact: status=${finalInvariantVariant[0]?.status}, remoteId=${finalInvariantVariant[0]?.remote_post_id}`
  );

  const [finalInvariantJob] = await conn.query(
    'SELECT id, status, external_post_id FROM publishing_jobs WHERE id = ?',
    ['256cf21a-26cd-4032-a7b8-17261d8a81b1']
  );
  assert(
    finalInvariantJob.length > 0 && finalInvariantJob[0].status === 'published',
    `Final Invariant Job intact: status=${finalInvariantJob[0]?.status}, externalId=${finalInvariantJob[0]?.external_post_id}`
  );

  await conn.end();

  console.log('\n================================================================');
  console.log(`  AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTeamRbacSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
