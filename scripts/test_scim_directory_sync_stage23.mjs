/**
 * Stage 23: SCIM 2.0 Directory Sync & Automated Workforce Lifecycle Suite
 *
 * Verifies:
 * 1. Meta Publication Lock Invariant (Pre & Post)
 * 2. Superadmin RBAC & Auth Security on SCIM Admin Endpoints (401 unauthenticated, 403 non-superadmin)
 * 3. Superadmin Token Lifecycle Operations (Create, Rotate, Revoke with SHA-256 Hashing)
 * 4. SCIM 2.0 Discovery Protocol (RFC 7643: ServiceProviderConfig, Schemas, Schema by ID)
 * 5. SCIM 2.0 Bearer Authentication & Error Standards (RFC 6750 & RFC 7644)
 * 6. SCIM 2.0 User Lifecycle Management (Create, Get, Filter Query, Put Update, Patch Deactivate, Delete)
 * 7. SCIM 2.0 Group Operations (List Groups, Get Group by ID)
 * 8. Superadmin Telemetry Metrics & Directory Sync Audit Logging
 * 9. Production Meta Publication Lock Intact (Final Verification)
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

async function runStage23Suite() {
  console.log('========================================================================');
  console.log('   STAGE 23: SCIM 2.0 DIRECTORY SYNC & WORKFORCE LIFECYCLE PROTOCOL     ');
  console.log('========================================================================\n');

  const dbConnection = await mysql.createConnection(DB_CONFIG);

  try {
    // 1. Meta Publication Lock Invariant Pre-check
    await verifyMetaLock(dbConnection, 'PRE-CHECK');

    // Clean up any test users/tokens from previous test runs
    await dbConnection.execute("DELETE FROM users WHERE email LIKE '%@enterprise-stage23.com%'");
    await dbConnection.execute("DELETE FROM scim_api_tokens WHERE name LIKE '%Stage 23%'");
    await dbConnection.execute("DELETE FROM scim_sync_logs WHERE endpoint LIKE '%enterprise-stage23%'");

    // Fetch superadmin and normal user
    const [superadmins] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 1 
       LIMIT 1`
    );
    assert(superadmins.length > 0, 'Superadmin user exists in database');
    const superadmin = superadmins[0];

    const [normalUsers] = await dbConnection.execute(
      `SELECT u.id, u.email, tu.tenant_id 
       FROM users u 
       JOIN tenant_users tu ON u.id = tu.user_id 
       WHERE u.is_superadmin = 0 AND u.is_active = 1
       LIMIT 1`
    );
    assert(normalUsers.length > 0, 'Standard tenant user exists in database');
    const normalUser = normalUsers[0];

    const superadminJwt = jwt.sign(
      { userId: superadmin.id, email: superadmin.email, isSuperadmin: true, tenantId: superadmin.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const normalUserJwt = jwt.sign(
      { userId: normalUser.id, email: normalUser.email, isSuperadmin: false, tenantId: normalUser.tenant_id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ========================================================================
    // 2. Superadmin RBAC & Auth Security on SCIM Admin Endpoints
    // ========================================================================
    console.log('\n--- [2. Superadmin RBAC & Auth Security on SCIM Endpoints] ---');

    const unauthOverview = await request('/admin/operations/scim/overview');
    assert(unauthOverview.status === 401, 'Unauthenticated request to SCIM overview rejected with 401');

    const nonAdminOverview = await request('/admin/operations/scim/overview', {
      headers: { Authorization: `Bearer ${normalUserJwt}` },
    });
    assert(nonAdminOverview.status === 403, 'Non-superadmin request to SCIM overview rejected with 403');

    const superadminOverview = await request('/admin/operations/scim/overview', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(superadminOverview.status === 200, 'Superadmin successfully retrieves SCIM overview');
    assert(typeof superadminOverview.data.activeTokens === 'number', 'SCIM overview contains activeTokens count');
    assert(typeof superadminOverview.data.provisionedUsers === 'number', 'SCIM overview contains provisionedUsers count');

    const listTokensUnauth = await request('/admin/operations/scim/tokens');
    assert(listTokensUnauth.status === 401, 'Unauthenticated listTokens rejected with 401');

    const listTokensSuperadmin = await request('/admin/operations/scim/tokens', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(listTokensSuperadmin.status === 200, 'Superadmin successfully lists SCIM tokens');
    assert(Array.isArray(listTokensSuperadmin.data), 'SCIM tokens returned as an array');

    // ========================================================================
    // 3. Superadmin SCIM Token Lifecycle: Create, Rotate, Revoke
    // ========================================================================
    console.log('\n--- [3. Superadmin Token Lifecycle: Create, Rotate, Revoke] ---');

    // Validation: token name required
    const invalidCreate = await request('/admin/operations/scim/tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({ name: '' }),
    });
    assert(invalidCreate.status === 400, 'Creating token without name rejected with 400');

    // Create Stage 23 SCIM Token
    const createRes = await request('/admin/operations/scim/tokens', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
      body: JSON.stringify({
        name: 'Stage 23 Okta Workforce Sync Token',
        expiresInDays: 365,
      }),
    });
    assert(createRes.status === 201, 'SCIM API Bearer token created with 201 Created');
    assert(createRes.data.rawToken && createRes.data.rawToken.startsWith('scim_live_'), 'Response returns plaintext rawToken starting with scim_live_');
    const tokenObj = createRes.data.token || createRes.data;
    assert(tokenObj.tokenPrefix && tokenObj.tokenPrefix.includes('...'), 'Response includes masked tokenPrefix');
    const stage23TokenId = tokenObj.id;
    let liveBearerToken = createRes.data.rawToken;

    // Verify token at rest in MySQL: raw secret NOT stored, only SHA-256 hash
    const [tokenDbRows] = await dbConnection.execute(
      'SELECT id, name, token_hash, token_prefix, status FROM scim_api_tokens WHERE id = ?',
      [stage23TokenId]
    );
    assert(tokenDbRows.length === 1, 'Token persisted in scim_api_tokens table');
    const expectedHash = crypto.createHash('sha256').update(liveBearerToken).digest('hex');
    assert(tokenDbRows[0].token_hash === expectedHash, 'Token hash at rest matches SHA-256 of raw secret');
    assert(tokenDbRows[0].status === 'active', 'Newly created token has status: active');

    // Rotate SCIM token
    const rotateRes = await request(`/admin/operations/scim/tokens/${stage23TokenId}/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(rotateRes.status === 200, 'Rotating token returns 200 OK');
    assert(rotateRes.data.rawToken && rotateRes.data.rawToken !== liveBearerToken, 'Rotation provides a new unique rawToken');
    const oldBearerToken = liveBearerToken;
    liveBearerToken = rotateRes.data.rawToken;

    // Verify old token is no longer valid in database
    const [rotatedDbRows] = await dbConnection.execute(
      'SELECT token_hash FROM scim_api_tokens WHERE id = ?',
      [stage23TokenId]
    );
    const newExpectedHash = crypto.createHash('sha256').update(liveBearerToken).digest('hex');
    assert(rotatedDbRows[0].token_hash === newExpectedHash, 'Database record updated with new token hash');

    // ========================================================================
    // 4. SCIM 2.0 Discovery Endpoints (RFC 7643)
    // ========================================================================
    console.log('\n--- [4. SCIM 2.0 Discovery Endpoints (RFC 7643)] ---');

    const spConfigRes = await request('/scim/v2/ServiceProviderConfig');
    assert(spConfigRes.status === 200, 'GET /scim/v2/ServiceProviderConfig returns 200 OK');
    assert(
      spConfigRes.data.schemas?.includes('urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'),
      'ServiceProviderConfig includes RFC 7643 schema'
    );
    assert(spConfigRes.data.patch?.supported === true, 'SCIM patch operation declared supported');
    assert(spConfigRes.data.filter?.supported === true, 'SCIM filter operation declared supported');
    assert(spConfigRes.data.bulk?.supported === false, 'SCIM bulk operation declared unsupported');

    const schemasRes = await request('/scim/v2/Schemas');
    assert(schemasRes.status === 200, 'GET /scim/v2/Schemas returns 200 OK');
    assert(Array.isArray(schemasRes.data.Resources), 'Schemas returns Resources array');
    const schemaIds = schemasRes.data.Resources.map((s) => s.id);
    assert(schemaIds.includes('urn:ietf:params:scim:schemas:core:2.0:User'), 'Schemas includes User schema definition');
    assert(schemaIds.includes('urn:ietf:params:scim:schemas:core:2.0:Group'), 'Schemas includes Group schema definition');

    const userSchemaRes = await request('/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:User');
    assert(userSchemaRes.status === 200, 'GET /scim/v2/Schemas/User returns 200 OK');
    assert(userSchemaRes.data.id === 'urn:ietf:params:scim:schemas:core:2.0:User', 'User schema id matches');

    const groupSchemaRes = await request('/scim/v2/Schemas/urn:ietf:params:scim:schemas:core:2.0:Group');
    assert(groupSchemaRes.status === 200, 'GET /scim/v2/Schemas/Group returns 200 OK');
    assert(groupSchemaRes.data.id === 'urn:ietf:params:scim:schemas:core:2.0:Group', 'Group schema id matches');

    const unknownSchemaRes = await request('/scim/v2/Schemas/urn:custom:unknown');
    assert(unknownSchemaRes.status === 404, 'Unknown schema request returns 404');
    assert(unknownSchemaRes.data.schemas?.includes('urn:ietf:params:scim:api:messages:2.0:Error'), '404 error formatted per SCIM Error schema');

    // ========================================================================
    // 5. SCIM 2.0 Bearer Authentication & Error Standards (RFC 6750 & RFC 7644)
    // ========================================================================
    console.log('\n--- [5. SCIM 2.0 Bearer Authentication & Error Standards] ---');

    const noAuthUsers = await request('/scim/v2/Users');
    assert(noAuthUsers.status === 401, 'GET /scim/v2/Users without token returns 401 Unauthorized');
    assert(noAuthUsers.data.schemas?.includes('urn:ietf:params:scim:api:messages:2.0:Error'), '401 formatted per SCIM Error schema');

    const invalidAuthUsers = await request('/scim/v2/Users', {
      headers: { Authorization: 'Bearer scim_invalid_fake_token_12345' },
    });
    assert(invalidAuthUsers.status === 401, 'GET /scim/v2/Users with invalid Bearer token returns 401');

    const oldTokenUsers = await request('/scim/v2/Users', {
      headers: { Authorization: `Bearer ${oldBearerToken}` },
    });
    assert(oldTokenUsers.status === 401, 'GET /scim/v2/Users with rotated (old) token returns 401');

    // ========================================================================
    // 6. SCIM 2.0 User Lifecycle Management (RFC 7644)
    // ========================================================================
    console.log('\n--- [6. SCIM 2.0 User Lifecycle Management] ---');

    // 6a. Provision User (POST /scim/v2/Users)
    const newUserData = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'jordan.taylor@enterprise-stage23.com',
      name: {
        givenName: 'Jordan',
        familyName: 'Taylor',
        formatted: 'Jordan Taylor',
      },
      displayName: 'Jordan Taylor',
      emails: [
        { value: 'jordan.taylor@enterprise-stage23.com', primary: true, type: 'work' },
      ],
      active: true,
    };

    const createUserRes = await request('/scim/v2/Users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${liveBearerToken}` },
      body: JSON.stringify(newUserData),
    });
    assert(createUserRes.status === 201, 'Provisioning new user via SCIM returns 201 Created');
    assert(createUserRes.data.id, 'Created SCIM User resource contains unique id');
    assert(createUserRes.data.userName === 'jordan.taylor@enterprise-stage23.com', 'userName matches requested email');
    assert(createUserRes.data.active === true, 'User active flag is true');
    assert(createUserRes.data.meta?.resourceType === 'User', 'meta.resourceType is User');
    const createdUserId = createUserRes.data.id;

    // Verify in MySQL
    const [userRows] = await dbConnection.execute(
      'SELECT id, email, full_name, is_active FROM users WHERE email = ?',
      ['jordan.taylor@enterprise-stage23.com']
    );
    assert(userRows.length === 1, 'Workforce user successfully created in users table');
    assert(userRows[0].is_active === 1, 'User is_active is 1');

    // 6b. Duplicate Prevention (HTTP 409 Conflict with scimType: uniqueness)
    const duplicateUserRes = await request('/scim/v2/Users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${liveBearerToken}` },
      body: JSON.stringify(newUserData),
    });
    assert(duplicateUserRes.status === 409, 'Duplicate user creation returns 409 Conflict');
    assert(duplicateUserRes.data.scimType === 'uniqueness', 'SCIM error response contains scimType: uniqueness');

    // 6c. Get User by ID (GET /scim/v2/Users/:id)
    const getUserRes = await request(`/scim/v2/Users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(getUserRes.status === 200, 'GET /scim/v2/Users/:id returns 200 OK');
    assert(getUserRes.data.id === createdUserId, 'Fetched user ID matches created user ID');
    assert(getUserRes.data.name?.formatted === 'Jordan Taylor', 'User formatted name matches');

    // 6d. Query Users with SCIM Filter (GET /scim/v2/Users?filter=...)
    const filterQueryRes = await request(
      `/scim/v2/Users?filter=userName eq "jordan.taylor@enterprise-stage23.com"`,
      {
        headers: { Authorization: `Bearer ${liveBearerToken}` },
      }
    );
    assert(filterQueryRes.status === 200, 'Filtering users returns 200 OK');
    assert(filterQueryRes.data.totalResults >= 1, 'Filter query returns at least 1 matching user');
    assert(
      filterQueryRes.data.Resources?.some((r) => r.id === createdUserId),
      'Filter results include the target user'
    );

    // 6e. Full Update User (PUT /scim/v2/Users/:id)
    const updatedUserData = {
      ...newUserData,
      name: {
        givenName: 'Jordan',
        familyName: 'Taylor-Smith',
        formatted: 'Jordan Taylor-Smith',
      },
      displayName: 'Jordan Taylor-Smith',
    };
    const putUserRes = await request(`/scim/v2/Users/${createdUserId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${liveBearerToken}` },
      body: JSON.stringify(updatedUserData),
    });
    assert(putUserRes.status === 200, 'PUT /scim/v2/Users/:id returns 200 OK');
    assert(putUserRes.data.name?.formatted === 'Jordan Taylor-Smith', 'PUT update modified formatted name');

    // 6f. Patch User: Deactivate / Offboard (PATCH /scim/v2/Users/:id)
    const patchDeactivate = {
      schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'],
      Operations: [
        {
          op: 'replace',
          path: 'active',
          value: false,
        },
      ],
    };
    const patchRes = await request(`/scim/v2/Users/${createdUserId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${liveBearerToken}` },
      body: JSON.stringify(patchDeactivate),
    });
    assert(patchRes.status === 200, 'PATCH deactivating user returns 200 OK');
    assert(patchRes.data.active === false, 'Patched user returns active: false');

    // Verify in database that is_active was updated to 0
    const [deactivatedRows] = await dbConnection.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [createdUserId]
    );
    assert(deactivatedRows[0].is_active === 0, 'Database confirms user is_active = 0');

    // 6g. Deprovision / Delete User (DELETE /scim/v2/Users/:id)
    const deleteUserRes = await request(`/scim/v2/Users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(deleteUserRes.status === 204, 'DELETE /scim/v2/Users/:id returns 204 No Content');

    // Verify user is safely deprovisioned (is_active = 0 or removed)
    const [afterDeleteRows] = await dbConnection.execute(
      'SELECT id, is_active FROM users WHERE id = ?',
      [createdUserId]
    );
    assert(afterDeleteRows.length === 0 || afterDeleteRows[0].is_active === 0, 'User safely deprovisioned from active state');

    // ========================================================================
    // 7. SCIM 2.0 Group Operations (RFC 7644)
    // ========================================================================
    console.log('\n--- [7. SCIM 2.0 Group Operations (RFC 7644)] ---');

    const getGroupsRes = await request('/scim/v2/Groups', {
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(getGroupsRes.status === 200, 'GET /scim/v2/Groups returns 200 OK');
    assert(getGroupsRes.data.totalResults >= 3, 'Default SCIM groups returned (Superadmins, Enterprise Editors, Content Creators)');

    const getSuperadminGroup = await request('/scim/v2/Groups/grp-superadmins', {
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(getSuperadminGroup.status === 200, 'GET /scim/v2/Groups/grp-superadmins returns 200 OK');
    assert(getSuperadminGroup.data.displayName === 'Superadmins', 'Group displayName is Superadmins');
    assert(Array.isArray(getSuperadminGroup.data.members), 'Group members is an array');

    const getUnknownGroup = await request('/scim/v2/Groups/grp-nonexistent-group', {
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(getUnknownGroup.status === 404, 'Unknown group returns 404 Not Found');

    // ========================================================================
    // 8. Superadmin Telemetry Metrics & Directory Sync Audit Logging
    // ========================================================================
    console.log('\n--- [8. Telemetry Metrics & Directory Sync Audit Logging] ---');

    // Verify audit logs were captured
    const [syncLogs] = await dbConnection.execute(
      'SELECT id, action, status_code, scim_resource_type FROM scim_sync_logs WHERE token_id = ? ORDER BY created_at DESC',
      [stage23TokenId]
    );
    assert(syncLogs.length >= 3, 'Multiple SCIM operations logged in scim_sync_logs');
    const actions = syncLogs.map((l) => l.action);
    assert(actions.includes('create'), 'Log captures user create action');
    assert(actions.includes('deactivate') || actions.includes('patch'), 'Log captures deactivation/patch action');
    assert(actions.includes('delete'), 'Log captures user deletion action');

    // Check listLogs endpoint via Superadmin API
    const adminLogsRes = await request('/admin/operations/scim/logs', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(adminLogsRes.status === 200, 'Superadmin retrieves SCIM logs with 200 OK');
    assert(adminLogsRes.data.logs?.length > 0, 'Admin logs endpoint returns array of logged events');

    // Revoke token and verify it cannot authenticate
    const revokeRes = await request(`/admin/operations/scim/tokens/${stage23TokenId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(revokeRes.status === 200, 'Revoking SCIM token returns 200 OK');
    assert(revokeRes.data.status === 'revoked', 'Revoked token returned with status: revoked');

    const revokedAttemptRes = await request('/scim/v2/Users', {
      headers: { Authorization: `Bearer ${liveBearerToken}` },
    });
    assert(revokedAttemptRes.status === 401, 'Using revoked SCIM token returns 401 Unauthorized');

    // Verify updated overview reflects revoked state
    const finalOverview = await request('/admin/operations/scim/overview', {
      headers: { Authorization: `Bearer ${superadminJwt}` },
    });
    assert(finalOverview.status === 200, 'Final overview returns 200 OK');
    assert(typeof finalOverview.data.successRatePercent === 'number', 'Success rate percentage calculated');

    // ========================================================================
    // 9. Production Meta Publication Lock Final Verification
    // ========================================================================
    await verifyMetaLock(dbConnection, 'POST-CHECK FINAL');

    console.log('\n========================================================================');
    console.log(`   STAGE 23 SUITE PASSED! (${passedTests} passed, ${failedTests} failed)`);
    console.log('========================================================================\n');
  } finally {
    await dbConnection.end();
  }
}

runStage23Suite().catch((err) => {
  console.error('\nFatal test failure:', err);
  process.exit(1);
});
