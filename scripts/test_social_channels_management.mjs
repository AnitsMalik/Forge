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

const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const TENANT_ID = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
const USER_ID = 'a58ee49d-5d31-4135-817a-132e7cea5fe9';

async function main() {
  console.log('========================================================================');
  console.log('SOCIALFORGE — SOCIAL CHANNELS CONNECTION & MANAGEMENT TEST SUITE');
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

  const pool = mysql.createPool(DB_CONFIG);
  const conn = await pool.getConnection();

  try {
    // 1. Setup Auth Tokens
    const tenantAToken = jwt.sign(
      { userId: USER_ID, tenantId: TENANT_ID, role: 'admin', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Foreign Tenant B for Isolation Checks
    const tenantBId = uuidv4();
    const userBId = uuidv4();
    await conn.execute(
      `INSERT INTO tenants (id, name, slug, settings, created_at, updated_at)
       VALUES (?, 'Tenant B Security Test', ?, '{}', NOW(), NOW())`,
      [tenantBId, `ten-b-${Date.now()}`]
    );
    await conn.execute(
      `INSERT INTO users (id, email, password_hash, full_name, is_superadmin, is_active, token_version, created_at, updated_at)
       VALUES (?, ?, '$argon2id$test', 'Attacker User', 0, 1, 0, NOW(), NOW())`,
      [userBId, `attacker-${Date.now()}@tenantb.com`]
    );
    await conn.execute(
      `INSERT INTO tenant_users (id, tenant_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', NOW(), NOW())`,
      [uuidv4(), tenantBId, userBId]
    );

    const tenantBToken = jwt.sign(
      { userId: userBId, tenantId: tenantBId, role: 'admin', isSuperAdmin: false },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // TEST 1: List Social Channels with Accurate Status & Enriched Metadata
    // -------------------------------------------------------------------------
    console.log('\n--- 1. List Social Channels with Accurate Status & Metadata ---');
    const listRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts`, {
      headers: { Authorization: `Bearer ${tenantAToken}` }
    });
    assert(listRes.status === 200, 'GET /brands/:brandId/social-accounts returned 200 OK');
    const listData = await listRes.json();
    assert(Array.isArray(listData.data), 'Returns data array of accounts');
    assert(listData.data.length >= 1, `Found ${listData.data.length} social channels for brand`);

    const firstAccount = listData.data[0];
    assert(Boolean(firstAccount.id), 'Account has an id');
    assert(Boolean(firstAccount.platform), `Account platform is "${firstAccount.platform}"`);
    assert(Boolean(firstAccount.accountName), `Account name is "${firstAccount.accountName}"`);
    assert(Boolean(firstAccount.status), `Account status is "${firstAccount.status}"`);
    assert(Boolean(firstAccount.statusLabel), `Account has human statusLabel: "${firstAccount.statusLabel}"`);
    assert(typeof firstAccount.statusMessage === 'string', 'Account has statusMessage explanation');
    assert(Boolean(firstAccount.lastVerifiedAt), 'Account has lastVerifiedAt timestamp');
    assert(Array.isArray(firstAccount.scopes), 'Account has scopes array');
    assert(!firstAccount.access_token_encrypted, 'Encrypted access token is NEVER exposed in API response');
    assert(!firstAccount.access_token, 'Plaintext access token is NEVER exposed in API response');

    // -------------------------------------------------------------------------
    // TEST 2: Multi-Account Support Per Provider
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Multi-Account Support Per Provider ---');
    const secondaryAccountId = `test_page_sec_${Date.now()}`;
    const secondaryDbId = uuidv4();
    await conn.execute(
      `INSERT INTO social_accounts (
        id, brand_id, tenant_id, platform, account_id, account_name,
        is_active, access_token_encrypted, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, 'facebook', ?, 'Secondary Test Facebook Page', 1, 'enc_dummy', '{"handle":"@sec_fb"}', NOW(), NOW())`,
      [secondaryDbId, BRAND_ID, TENANT_ID, secondaryAccountId]
    );

    const multiListRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts`, {
      headers: { Authorization: `Bearer ${tenantAToken}` }
    });
    const multiListData = await multiListRes.json();
    const fbAccounts = multiListData.data.filter((a) => a.platform === 'facebook');
    assert(fbAccounts.length >= 2, `Brand successfully supports multiple accounts for facebook provider (found ${fbAccounts.length})`);

    // Cleanup secondary account
    await conn.execute(`DELETE FROM social_accounts WHERE id = ?`, [secondaryDbId]);

    // -------------------------------------------------------------------------
    // TEST 3: Account Details & Management Retrieval
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Account Details & Health Retrieval ---');
    const detailRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${firstAccount.id}`, {
      headers: { Authorization: `Bearer ${tenantAToken}` }
    });
    assert(detailRes.status === 200, 'GET /brands/:brandId/social-accounts/:accountId returned 200 OK');
    const detailData = await detailRes.json();
    assert(detailData.success === true, 'Response marked success');
    assert(detailData.data.id === firstAccount.id, 'Returns matching account details');
    assert(typeof detailData.data.pendingJobsCount === 'number', `Reports pending jobs count (${detailData.data.pendingJobsCount})`);
    assert(typeof detailData.data.historyCount === 'number', `Reports history post count (${detailData.data.historyCount})`);
    assert(detailData.data.encryptionAlgorithm === 'AES-256-GCM', 'Confirmed AES-256-GCM encryption vault');

    // -------------------------------------------------------------------------
    // TEST 4: Reconnect Flow URL Generation
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Official Reconnect Authorization URL Generation ---');
    const reauthRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${firstAccount.id}/reconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantAToken}`, 'Content-Type': 'application/json' }
    });
    assert(reauthRes.status === 200, 'POST /brands/:brandId/social-accounts/:accountId/reconnect returned 200 OK');
    const reauthData = await reauthRes.json();
    assert(Boolean(reauthData.data.authorizationUrl), 'Generated authorization URL');
    assert(reauthData.data.authorizationUrl.startsWith('https://www.facebook.com/v20.0/dialog/oauth'), 'Targets official Meta OAuth dialog');
    assert(reauthData.data.authorizationUrl.includes('client_id=1785874552561096'), 'Includes official client_id');
    assert(reauthData.data.authorizationUrl.includes('pages_manage_posts'), 'Includes required publish scope');
    assert(reauthData.data.authorizationUrl.includes('state='), 'Includes CSRF state token');

    // -------------------------------------------------------------------------
    // TEST 5: Disconnect Flow with Pending Job Cancellation & Post History Preservation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Disconnect Flow, Pending Job Cancellation & Post History Preservation ---');
    const testChannelDbId = uuidv4();
    const testChannelRemoteId = `disco_channel_${Date.now()}`;
    await conn.execute(
      `INSERT INTO social_accounts (
        id, brand_id, tenant_id, platform, account_id, account_name,
        is_active, access_token_encrypted, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, 'facebook', ?, 'Temporary Test Channel For Disconnect', 1, 'enc_secret_vault_token', '{"handle":"@temp_disco","scopes":["pages_show_list"]}', NOW(), NOW())`,
      [testChannelDbId, BRAND_ID, TENANT_ID, testChannelRemoteId]
    );

    // Create a pending post & publishing job for this channel
    const testPostId = uuidv4();
    const testJobId = uuidv4();
    await conn.execute(
      `INSERT INTO posts (id, tenant_id, brand_id, author_id, title, base_content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Preserved History Post', 'Will remain preserved', 'published', NOW(), NOW())`,
      [testPostId, TENANT_ID, BRAND_ID, USER_ID]
    );
    const [metaConnRows] = await conn.execute(`SELECT id FROM meta_connections WHERE brand_id = ?`, [BRAND_ID]);
    const metaConnId = metaConnRows.length > 0 ? metaConnRows[0].id : null;

    await conn.execute(
      `INSERT INTO publishing_jobs (
        id, tenant_id, brand_id, user_id, connection_id, platform, account_id,
        scheduled_at, status, attempt_count, max_attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'facebook', ?, NOW(), 'pending', 0, 3, NOW(), NOW())`,
      [testJobId, TENANT_ID, BRAND_ID, USER_ID, metaConnId, testChannelRemoteId]
    );

    // Perform disconnect via API
    const discoRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${testChannelDbId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tenantAToken}` }
    });
    assert(discoRes.status === 200, 'DELETE /brands/:brandId/social-accounts/:accountId returned 200 OK');
    const discoData = await discoRes.json();
    assert(discoData.success === true, 'Disconnect succeeded');
    assert(discoData.cancelledJobsCount >= 1, `Confirmed ${discoData.cancelledJobsCount} pending job(s) safely cancelled`);

    // Verify DB state: account record deleted, encrypted credentials purged
    const [accountRows] = await conn.execute(
      `SELECT id FROM social_accounts WHERE id = ?`,
      [testChannelDbId]
    );
    assert(accountRows.length === 0, 'Account credentials purged from social_accounts');

    // Verify publishing job was cancelled with reason
    const [jobRows] = await conn.execute(
      `SELECT status, last_error FROM publishing_jobs WHERE id = ?`,
      [testJobId]
    );
    assert(jobRows[0].status === 'cancelled', `Publishing job transitioned to 'cancelled' (was ${jobRows[0].status})`);
    assert(jobRows[0].last_error && jobRows[0].last_error.includes('disconnected by user'), 'Publishing job contains cancellation reason');

    // Verify post history is preserved
    const [postRows] = await conn.execute(`SELECT status FROM posts WHERE id = ?`, [testPostId]);
    assert(postRows.length === 1 && postRows[0].status === 'published', 'Post history is preserved intact in database');

    // Cleanup test records
    await conn.execute(`DELETE FROM publishing_jobs WHERE id = ?`, [testJobId]);
    await conn.execute(`DELETE FROM posts WHERE id = ?`, [testPostId]);

    // -------------------------------------------------------------------------
    // TEST 6: Tenant Isolation & Security Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Tenant Isolation & Security Enforcement ---');
    const unauthListRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts`, {
      headers: { Authorization: `Bearer ${tenantBToken}` }
    });
    assert(unauthListRes.status === 403 || unauthListRes.status === 404, `Cross-tenant GET list rejected with HTTP ${unauthListRes.status}`);

    const unauthDetailRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${firstAccount.id}`, {
      headers: { Authorization: `Bearer ${tenantBToken}` }
    });
    assert(unauthDetailRes.status === 403 || unauthDetailRes.status === 404, `Cross-tenant GET detail rejected with HTTP ${unauthDetailRes.status}`);

    const unauthReauthRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${firstAccount.id}/reconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tenantBToken}`, 'Content-Type': 'application/json' }
    });
    assert(unauthReauthRes.status === 403 || unauthReauthRes.status === 404, `Cross-tenant POST reconnect rejected with HTTP ${unauthReauthRes.status}`);

    const unauthDiscoRes = await fetch(`${API_BASE}/brands/${BRAND_ID}/social-accounts/${firstAccount.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tenantBToken}` }
    });
    assert(unauthDiscoRes.status === 403 || unauthDiscoRes.status === 404, `Cross-tenant DELETE disconnect rejected with HTTP ${unauthDiscoRes.status}`);

    // -------------------------------------------------------------------------
    // TEST 7: Sandbox / Mock Integrity (Never label mock as live)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Sandbox / Mock Integrity ---');
    const igAccounts = listData.data.filter((a) => a.platform === 'instagram');
    for (const ig of igAccounts) {
      if (ig.accountId && ig.accountId.startsWith('sb_')) {
        assert(ig.status === 'sandbox', `Sandbox Instagram account (${ig.accountId}) is correctly labeled 'sandbox'`);
        assert(ig.statusLabel.includes('Sandbox'), `Status label reflects Sandbox mode: "${ig.statusLabel}"`);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 8: Permanent Meta Invariant Lock Check
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Permanent Meta Publication Lock Invariant ---');
    const [lockRows] = await conn.execute(
      `SELECT id, status, remote_post_id FROM post_variants WHERE id = 'bc2051b1-a44a-4a97-8acd-1f3125c70164'`
    );
    assert(lockRows.length === 1, 'Permanent post variant exists');
    assert(lockRows[0].status === 'published', 'Permanent post variant status is published');
    assert(lockRows[0].remote_post_id === '1405588742634526_122100337179498315', 'Remote post ID is intact');

    // Cleanup Tenant B test fixture
    await conn.execute(`DELETE FROM tenant_users WHERE tenant_id = ?`, [tenantBId]);
    await conn.execute(`DELETE FROM users WHERE id = ?`, [userBId]);
    await conn.execute(`DELETE FROM tenants WHERE id = ?`, [tenantBId]);

  } finally {
    conn.release();
    await pool.end();
  }

  console.log('\n========================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
