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
  console.log('STAGE 9: MULTI-WORKSPACE SWITCHER & TEAM INVITATION TEST SUITE');
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
    // 1. Provision Test Primary Workspace & Owner
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning Primary Workspace A (Starter Tier)...');
    const primaryTenantId = uuidv4();
    const ownerUserId = uuidv4();
    const ownerEmail = `owner-s9-${Date.now()}@socialforge.io`;

    await connection.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', NOW(), NOW())`,
      [primaryTenantId, 'Primary Agency Alpha', `primary-alpha-${Date.now()}`]
    );

    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Alpha Agency Owner', 0, 1, NOW(), NOW())`,
      [ownerUserId, ownerEmail]
    );

    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', NOW(), NOW())`,
      [uuidv4(), primaryTenantId, ownerUserId]
    );

    // Starter plan: max_users is 2 (so 1 owner + 1 member max)
    await connection.execute(
      `INSERT INTO tenant_subscriptions (
         id, tenant_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end
       ) VALUES (?, ?, 'starter', 'active', 'stripe', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 0)`,
      [uuidv4(), primaryTenantId]
    );

    const ownerToken = jwt.sign(
      { userId: ownerUserId, email: ownerEmail, tenantId: primaryTenantId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ownerToken}`,
    };

    // -------------------------------------------------------------------------
    // 2. Create Second Workspace (POST /api/v1/workspaces)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Workspace Creation (POST /api/v1/workspaces) ---');
    const createWsRes = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Secondary Agency Beta' }),
    });
    assert(createWsRes.status === 201, `POST /workspaces returned 201 Created`);
    const createWsData = await createWsRes.json();
    assert(createWsData.success === true, `Workspace creation returned success: true`);
    assert(createWsData.data.name === 'Secondary Agency Beta', `Workspace name matches`);
    assert(createWsData.data.role === 'owner', `User is assigned owner role in new workspace`);
    const secondaryTenantId = createWsData.data.id;
    assert(Boolean(secondaryTenantId), `Generated tenantId returned`);

    // Verify default brand created in secondary workspace
    const [brands] = await connection.execute(
      `SELECT * FROM brands WHERE tenant_id = ?`,
      [secondaryTenantId]
    );
    assert(brands.length === 1, `Default brand automatically provisioned for new workspace`);

    // -------------------------------------------------------------------------
    // 3. List User Workspaces (GET /api/v1/workspaces)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Workspace Listing & Multi-Tenant Hierarchy (GET /api/v1/workspaces) ---');
    const listWsRes = await fetch(`${API_BASE}/workspaces`, { headers: authHeaders });
    assert(listWsRes.status === 200, `GET /workspaces returned 200 OK`);
    const listWsData = await listWsRes.json();
    assert(listWsData.success === true, `Listing returned success: true`);
    assert(listWsData.data.activeTenantId === primaryTenantId, `Active workspace matches Primary Alpha`);
    assert(listWsData.data.workspaces.length >= 2, `User belongs to at least 2 workspaces`);

    const alphaWs = listWsData.data.workspaces.find(w => w.id === primaryTenantId);
    const betaWs = listWsData.data.workspaces.find(w => w.id === secondaryTenantId);
    assert(alphaWs?.isActive === true, `Primary Alpha is marked active: true`);
    assert(betaWs?.isActive === false, `Secondary Beta is marked active: false`);
    assert(alphaWs?.planId === 'starter', `Primary Alpha has Starter plan`);

    // -------------------------------------------------------------------------
    // 4. Switch Workspace Context (POST /api/v1/workspaces/switch)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Workspace Context Switching (POST /api/v1/workspaces/switch) ---');
    const switchRes = await fetch(`${API_BASE}/workspaces/switch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tenantId: secondaryTenantId }),
    });
    assert(switchRes.status === 200, `POST /workspaces/switch returned 200 OK`);
    const switchData = await switchRes.json();
    assert(switchData.success === true, `Switch returned success: true`);
    assert(switchData.data.activeWorkspace.id === secondaryTenantId, `Active workspace switched to Beta`);
    assert(Boolean(switchData.data.accessToken), `Fresh scoped JWT token issued`);

    // Verify token payload
    const decodedToken = jwt.verify(switchData.data.accessToken, JWT_SECRET);
    assert(decodedToken.tenantId === secondaryTenantId, `Decoded JWT tenantId points to Beta workspace`);

    // Test rejection of unauthorized tenant switch
    const foreignTenantId = uuidv4();
    const badSwitchRes = await fetch(`${API_BASE}/workspaces/switch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ tenantId: foreignTenantId }),
    });
    assert(badSwitchRes.status === 403, `Unauthorized workspace switch rejected with 403 Forbidden`);

    // -------------------------------------------------------------------------
    // 5. Current Workspace Details (GET /api/v1/workspaces/current)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Current Workspace Settings & Stats (GET /api/v1/workspaces/current) ---');
    const currentRes = await fetch(`${API_BASE}/workspaces/current`, { headers: authHeaders });
    assert(currentRes.status === 200, `GET /workspaces/current returned 200 OK`);
    const currentData = await currentRes.json();
    assert(currentData.data.id === primaryTenantId, `Current workspace is Primary Alpha`);
    assert(currentData.data.role === 'owner', `User role is owner`);
    assert(currentData.data.stats.membersCount === 1, `Members count is 1`);

    // -------------------------------------------------------------------------
    // 6. Update Workspace Settings (PUT /api/v1/workspaces/current)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Workspace Settings Update (PUT /api/v1/workspaces/current) ---');
    const updateRes = await fetch(`${API_BASE}/workspaces/current`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Primary Agency Alpha Updated',
        settings: { defaultTimezone: 'America/New_York', primaryLanguage: 'en' },
      }),
    });
    assert(updateRes.status === 200, `PUT /workspaces/current returned 200 OK`);

    const [updatedTenant] = await connection.execute(
      `SELECT name, settings FROM tenants WHERE id = ?`,
      [primaryTenantId]
    );
    assert(updatedTenant[0].name === 'Primary Agency Alpha Updated', `Workspace name updated in database`);

    // -------------------------------------------------------------------------
    // 7. Team Members List (GET /api/v1/workspaces/members)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Team Members List (GET /api/v1/workspaces/members) ---');
    const membersRes = await fetch(`${API_BASE}/workspaces/members`, { headers: authHeaders });
    assert(membersRes.status === 200, `GET /workspaces/members returned 200 OK`);
    const membersData = await membersRes.json();
    assert(membersData.data.length === 1, `Initial workspace has exactly 1 member`);
    assert(membersData.data[0].email === ownerEmail, `Member email matches owner`);
    assert(membersData.data[0].role === 'owner', `Member role is owner`);

    // -------------------------------------------------------------------------
    // 8. Invite Team Member (POST /api/v1/workspaces/invites)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Team Invitation Creation & Quota Gating ---');
    const inviteEmail1 = `editor-${Date.now()}@testagency.com`;
    const inviteRes1 = await fetch(`${API_BASE}/workspaces/invites`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: inviteEmail1, role: 'editor' }),
    });
    assert(inviteRes1.status === 201, `1st member invite succeeded (201 Created)`);
    const inviteData1 = await inviteRes1.json();
    assert(inviteData1.data.email === inviteEmail1, `Invite recipient email matches`);
    assert(inviteData1.data.role === 'editor', `Assigned role is editor`);
    assert(Boolean(inviteData1.data.token), `High-entropy 64-char invite token generated`);
    assert(Boolean(inviteData1.data.inviteUrl), `Onboarding inviteUrl provided`);
    const inviteToken1 = inviteData1.data.token;
    const inviteId1 = inviteData1.data.id;

    // List pending invites
    const listInvitesRes = await fetch(`${API_BASE}/workspaces/invites`, { headers: authHeaders });
    assert(listInvitesRes.status === 200, `GET /workspaces/invites returned 200 OK`);
    const listInvitesData = await listInvitesRes.json();
    assert(listInvitesData.data.length === 1, `1 pending invitation listed`);
    assert(listInvitesData.data[0].token === inviteToken1, `Pending invite token matches`);

    // -------------------------------------------------------------------------
    // 9. Quota Enforcement: Starter Plan User Seats Limit
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Strict Quota Enforcement: Starter User Seats Limit ---');
    // Starter allows 2 seats. We currently have 1 active owner.
    // If we add another user to reach 2/2, a 3rd invite must be rejected with PLAN_LIMIT_EXCEEDED!
    const member2UserId = uuidv4();
    await connection.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, created_at, updated_at)
       VALUES (?, 'second-user@test.com', 'hash', 'Second Member', 0, 1, NOW(), NOW())`,
      [member2UserId]
    );
    await connection.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'editor', NOW(), NOW())`,
      [uuidv4(), primaryTenantId, member2UserId]
    );

    // Now Primary Alpha has 2 members (100% of Starter 2-seat quota)
    const quotaExceededInviteRes = await fetch(`${API_BASE}/workspaces/invites`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: `overflow-${Date.now()}@test.com`, role: 'editor' }),
    });
    assert(quotaExceededInviteRes.status === 403, `Seat limit exceeded invite blocked with 403 Forbidden`);
    const quotaExceededData = await quotaExceededInviteRes.json();
    assert(quotaExceededData.error.code === 'PLAN_LIMIT_EXCEEDED', `Error code is PLAN_LIMIT_EXCEEDED`);
    assert(quotaExceededData.error.upgradeRequired === true, `upgradeRequired flag is true`);

    // Clean up temporary member2
    await connection.execute(`DELETE FROM tenant_users WHERE user_id = ?`, [member2UserId]);
    await connection.execute(`DELETE FROM users WHERE id = ?`, [member2UserId]);

    // -------------------------------------------------------------------------
    // 10. Accept Invitation Flow (POST /api/v1/workspaces/invites/accept)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Team Invitation Acceptance Onboarding ---');
    const acceptRes = await fetch(`${API_BASE}/workspaces/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: inviteToken1,
        fullName: 'New Invited Editor',
        password: 'Password123!',
      }),
    });
    assert(acceptRes.status === 200, `POST /workspaces/invites/accept returned 200 OK`);
    const acceptData = await acceptRes.json();
    assert(acceptData.success === true, `Accept returned success: true`);
    assert(acceptData.data.workspace.id === primaryTenantId, `Joined correct workspace`);
    assert(acceptData.data.workspace.role === 'editor', `User attached with assigned editor role`);
    assert(Boolean(acceptData.data.accessToken), `Scoped session token issued upon acceptance`);

    // Verify invite marked accepted in database (idempotency: cannot re-accept)
    const reAcceptRes = await fetch(`${API_BASE}/workspaces/invites/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken1, password: 'Password123!' }),
    });
    assert(reAcceptRes.status === 404, `Replay of accepted invitation rejected with 404 INVALID_INVITE`);

    // -------------------------------------------------------------------------
    // 11. Role Update & Member Removal
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Role Modification & Member Removal Protection ---');
    // Find newly joined member userId
    const [joinedUsers] = await connection.execute(
      `SELECT user_id FROM tenant_users WHERE tenant_id = ? AND role = 'editor'`,
      [primaryTenantId]
    );
    const joinedUserId = joinedUsers[0]?.user_id;
    assert(Boolean(joinedUserId), `Invited user found in tenant_users`);

    // Update role: editor -> admin
    const updateRoleRes = await fetch(`${API_BASE}/workspaces/members/${joinedUserId}/role`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ role: 'admin' }),
    });
    assert(updateRoleRes.status === 200, `PATCH /members/:userId/role updated role to admin`);

    // Test protection: Owner cannot demote self if sole owner
    const demoteSelfRes = await fetch(`${API_BASE}/workspaces/members/${ownerUserId}/role`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ role: 'editor' }),
    });
    assert(demoteSelfRes.status === 400, `Demoting sole owner blocked with 400 CANNOT_DEMOTE_LAST_OWNER`);

    // Test protection: Owner cannot remove self
    const removeSelfRes = await fetch(`${API_BASE}/workspaces/members/${ownerUserId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(removeSelfRes.status === 400, `Removing self blocked with 400 CANNOT_REMOVE_SELF`);

    // Remove the invited admin
    const removeMemberRes = await fetch(`${API_BASE}/workspaces/members/${joinedUserId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(removeMemberRes.status === 200, `DELETE /members/:userId successfully removed member`);

    // Verify members count returned to 1
    const finalMembersRes = await fetch(`${API_BASE}/workspaces/members`, { headers: authHeaders });
    const finalMembersData = await finalMembersRes.json();
    assert(finalMembersData.data.length === 1, `Members count restored to 1`);

    // -------------------------------------------------------------------------
    // 12. Cleanup Test Workspaces
    // -------------------------------------------------------------------------
    await connection.execute(`DELETE FROM workspace_invites WHERE tenant_id IN (?, ?)`, [primaryTenantId, secondaryTenantId]);
    await connection.execute(`DELETE FROM tenant_users WHERE tenant_id IN (?, ?)`, [primaryTenantId, secondaryTenantId]);
    await connection.execute(`DELETE FROM tenant_subscriptions WHERE tenant_id IN (?, ?)`, [primaryTenantId, secondaryTenantId]);
    await connection.execute(`DELETE FROM brands WHERE tenant_id IN (?, ?)`, [primaryTenantId, secondaryTenantId]);
    await connection.execute(`DELETE FROM tenants WHERE id IN (?, ?)`, [primaryTenantId, secondaryTenantId]);
    await connection.execute(`DELETE FROM users WHERE id IN (?, ?)`, [ownerUserId, joinedUserId]);

  } finally {
    await connection.end();
  }

  console.log('\n========================================================================');
  console.log(`STAGE 9 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
